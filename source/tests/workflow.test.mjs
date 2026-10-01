import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assess, transition, validateDocument, safeHttpUrl } from '../lib/model.mjs';
import { storageConfig, applyReview, readLocal } from '../lib/store.mjs';
import { POST } from '../app/api/review/route.js';
const docs = JSON.parse(await readFile(new URL('../data/seed.json', import.meta.url), 'utf8'));
const now = Date.parse('2026-09-30T15:10:00Z');
const profile = { country: 'CN', adult: true, aiMode: 'assisted', paypalOnly: true };
const fixture = () => { const d = structuredClone(docs[0]); d.payout = 'paypal'; d.claims.find(c => c.field === 'payout').verdict = 'supported'; d.claims.find(c => c.field === 'payout').text = 'Synthetic test payment evidence; never a public opportunity.'; return d; };
test('all curated records validate, but none invent full action eligibility', () => { docs.forEach(validateDocument); for (const d of docs) assert.equal(assess(d, profile, now).ready, false); });
test('unknown payment blocks approval even when the prize is real', () => { const check = assess(docs[0], profile, now); assert.ok(check.blockers.includes('Evidence needed: payout')); assert.equal(check.supported, 5); });
test('expired and future build windows are evaluated against the actual clock', () => { assert.ok(assess(docs[4], profile, now).blockers.some(s => s.includes('passed'))); assert.ok(assess(docs[2], profile, now).blockers.some(s => s.includes('not started'))); });
test('residence, age, autonomous-policy and payment preferences are distinct', () => { assert.ok(assess(docs[0], { ...profile, country: 'RU', adult: false, aiMode: 'autonomous' }, now).blockers.length >= 5); assert.ok(assess(docs[0], { ...profile, country: '' }, now).blockers.some(s => s.includes('residence'))); });
test('source age expires after seven days and supported claims need receipts', () => { assert.ok(assess(fixture(), profile, now + 8 * 86400000).blockers.some(s => s.includes('seven days'))); const d = fixture(); d.claims[0].sourceKey = 'missing'; assert.throws(() => validateDocument(d), /source receipt/); });
test('assistant can request review but cannot approve or block', () => { const d = transition(fixture(), 'request-review', { actor: 'assistant', note: 'Please review the receipt.', profile, expectedVersion: 0, now }); assert.equal(d.state, 'review'); assert.throws(() => transition(d, 'approve', { actor: 'assistant', note: 'I approve this opportunity.', profile, expectedVersion: 1, now }), /only a person/); });
test('human approval requires verified gates and records before/after evidence', () => { const d = transition(fixture(), 'request-review', { actor: 'assistant', note: 'Ready for a person to review.', profile, expectedVersion: 0, now }); const next = transition(d, 'approve', { actor: 'human', note: 'Verified all current source receipts.', profile, expectedVersion: 1, now }); assert.equal(next.state, 'approved'); assert.equal(next.version, 2); assert.equal(next.history.length, 2); assert.equal(next.history[1].evidenceVersion, 1); });
test('unknown facts cannot be approved and stale versions cannot overwrite', () => { const d = transition(docs[0], 'request-review', { actor: 'assistant', note: 'Payment still needs confirmation.', profile, expectedVersion: 0, now }); assert.throws(() => transition(d, 'approve', { actor: 'human', note: 'Try to approve an unknown.', profile, expectedVersion: 1, now }), /Cannot approve/); assert.throws(() => transition(d, 'block', { actor: 'human', note: 'Block missing payment evidence.', profile, expectedVersion: 0, now }), e => e.status === 409); });
test('unsafe protocols, credential URLs and duplicate claim fields are rejected', () => { assert.equal(safeHttpUrl('javascript:alert(1)'), false); assert.equal(safeHttpUrl('https://secret@example.com'), false); const d = fixture(); d.claims.push(d.claims[0]); assert.throws(() => validateDocument(d), /duplicate claim/); });
test('configured cloud mode never pretends it is local or exposes tokens', () => { const c = storageConfig({ SANITY_PROJECT_ID: 'ofdsgt18', SANITY_API_TOKEN: 'secret', REVIEW_SECRET: 'owner' }); assert.equal(c.mode, 'sanity'); assert.equal(c.writable, true); assert.equal(JSON.stringify(c).includes('secret'), false); assert.throws(() => storageConfig({ SANITY_PROJECT_ID: 'bad/id' }), /Invalid Sanity/); });
test('concurrent local writes are serialized and a stale review returns conflict', async () => { const directory = await mkdtemp(path.join(tmpdir(), 'proof-desk-test-')); const prevId = process.env.SANITY_PROJECT_ID, prevDir = process.env.PROOF_DESK_DATA_DIR; delete process.env.SANITY_PROJECT_ID; process.env.PROOF_DESK_DATA_DIR = directory; try { const args = { actor: 'assistant', note: 'Please check the current sources.', profile, expectedVersion: 0, now }; const results = await Promise.allSettled([applyReview(docs[0]._id, 'request-review', args), applyReview(docs[0]._id, 'request-review', args)]); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(results.find(r => r.status === 'rejected').reason.status, 409); const stored = await readLocal(); assert.equal(stored[0].history.length, 1); } finally { if (prevId === undefined) delete process.env.SANITY_PROJECT_ID; else process.env.SANITY_PROJECT_ID = prevId; if (prevDir === undefined) delete process.env.PROOF_DESK_DATA_DIR; else process.env.PROOF_DESK_DATA_DIR = prevDir; await rm(directory, { recursive: true, force: true }); } });
test('review API ignores a supplied clock and cannot approve an expired record', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'proof-desk-api-'));
  const prevId = process.env.SANITY_PROJECT_ID, prevDir = process.env.PROOF_DESK_DATA_DIR;
  delete process.env.SANITY_PROJECT_ID; process.env.PROOF_DESK_DATA_DIR = directory;
  try {
    const realNow = Date.now(), d = fixture();
    d.state = 'review'; d.startsAt = new Date(realNow - 7200000).toISOString(); d.deadline = new Date(realNow - 3600000).toISOString();
    d.sources.forEach(s => { s.checkedAt = new Date(realNow).toISOString(); });
    await writeFile(path.join(directory, 'opportunities.json'), JSON.stringify([d]));
    const request = new Request('http://localhost/api/review', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ id: d._id, action: 'approve', note: 'Try an old client-side clock.', profile, expectedVersion: 0, now: realNow - 5400000, actor: 'human' }) });
    const response = await POST(request); const result = await response.json();
    assert.equal(response.status, 400); assert.match(result.error, /deadline has passed/); assert.equal((await readLocal())[0].state, 'review');
  } finally { if (prevId === undefined) delete process.env.SANITY_PROJECT_ID; else process.env.SANITY_PROJECT_ID = prevId; if (prevDir === undefined) delete process.env.PROOF_DESK_DATA_DIR; else process.env.PROOF_DESK_DATA_DIR = prevDir; await rm(directory, { recursive: true, force: true }); }
});
