export const CRITICAL_FIELDS = ['entryFee', 'cash', 'deadline', 'aiPolicy', 'eligibility', 'payout'];
export const STATES = ['draft', 'review', 'approved', 'blocked'];
export function safeHttpUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function validateDocument(doc) {
  if (!doc || !/^opportunity-[a-z0-9-]+$/.test(doc._id) || doc._type !== 'opportunity') throw new Error('Invalid opportunity identity.');
  if (!STATES.includes(doc.state) || !Number.isSafeInteger(doc.version) || doc.version < 0) throw new Error('Invalid workflow state or version.');
  if (!doc.title || !Array.isArray(doc.claims) || !Array.isArray(doc.sources)) throw new Error('Incomplete opportunity.');
  const sourceIds = new Set(doc.sources.map(s => s._key));
  if (sourceIds.size !== doc.sources.length) throw new Error('Duplicate sources.');
  for (const s of doc.sources) {
    if (!safeHttpUrl(s.url) || !s.title || !Number.isFinite(Date.parse(s.checkedAt))) throw new Error('Invalid source receipt.');
  }
  const fields = new Set();
  for (const c of doc.claims) {
    if (fields.has(c.field) || !CRITICAL_FIELDS.includes(c.field) || !['supported', 'unknown', 'contradicted'].includes(c.verdict)) throw new Error('Invalid or duplicate claim.');
    fields.add(c.field);
    if (c.verdict === 'supported' && (!c.sourceKey || !sourceIds.has(c.sourceKey))) throw new Error('Supported claims need a source receipt.');
    if (!c.text) throw new Error('Claims need a clear statement.');
  }
  if (!Number.isFinite(Date.parse(doc.deadline)) || !Number.isFinite(Date.parse(doc.startsAt))) throw new Error('Invalid entry dates.');
  if (Date.parse(doc.deadline) <= Date.parse(doc.startsAt)) throw new Error('Invalid entry period.');
  if (!Number.isFinite(doc.entryFee) || doc.entryFee < 0 || !Number.isFinite(doc.cashPrize) || doc.cashPrize <= 0) throw new Error('Invalid money fields.');
  return doc;
}
export function assess(doc, profile = {}, now = Date.now()) {
  validateDocument(doc);
  const missing = CRITICAL_FIELDS.filter(field => !doc.claims.some(c => c.field === field && c.verdict === 'supported'));
  const blockers = missing.map(field => `Evidence needed: ${field}`);
  if (doc.entryFee !== 0) blockers.push('Upfront entry cost is above $0.');
  if (now >= Date.parse(doc.deadline)) blockers.push('The submission deadline has passed.');
  if (now < Date.parse(doc.startsAt)) blockers.push('The entry/build period has not started.');
  if (!profile.country) blockers.push('Country of residence has not been checked.');
  else if (doc.excludedCountries?.includes(profile.country)) blockers.push('The stated residence is excluded by the rules.');
  if (!profile.adult) blockers.push('Age eligibility has not been confirmed.');
  if (profile.aiMode === 'autonomous' && doc.aiMode !== 'autonomous') blockers.push('This event does not explicitly permit an end-to-end autonomous AI build.');
  if (profile.paypalOnly && doc.payout !== 'paypal') blockers.push('Current PayPal payout is not established.');
  const citedSources = doc.claims.filter(c => c.verdict === 'supported').map(c => doc.sources.find(s => s._key === c.sourceKey));
  if (citedSources.some(s => now - Date.parse(s.checkedAt) > 7 * 86400000)) blockers.push('A cited source receipt is older than seven days. Recheck it.');
  return { blockers: [...new Set(blockers)], ready: blockers.length === 0, supported: 6 - missing.length, total: 6, missing };
}
export function draftReview(doc, profile, now = Date.now()) {
  const check = assess(doc, profile, now);
  return {
    summary: check.ready ? 'Sources support a $0 entry. A person must still decide whether to act.' : 'Keep this as research. The evidence does not support action yet.',
    blockers: check.blockers,
    nextSteps: check.missing.map(field => `Read the official rules and attach evidence for ${field}.`),
    generatedBy: 'deterministic-checks',
    generatedAt: new Date(now).toISOString()
  };
}
export function transition(doc, action, { actor, note, profile, expectedVersion, now = Date.now() }) {
  validateDocument(doc);
  if (expectedVersion !== doc.version) throw Object.assign(new Error('This record changed. Refresh before reviewing it.'), { status: 409 });
  if (!['assistant', 'human'].includes(actor)) throw new Error('Unknown reviewer role.');
  if (!note || typeof note !== 'string' || note.trim().length < 8 || note.length > 1000) throw new Error('Write a review note of 8–1000 characters.');
  const allowed = { draft: ['request-review'], review: ['approve', 'block'], approved: ['reopen'], blocked: ['reopen'] };
  if (!allowed[doc.state].includes(action)) throw new Error('This transition is not available from the current state.');
  if (actor === 'assistant' && action !== 'request-review') throw new Error('Assistants may request review; only a person may decide.');
  if (action === 'approve') {
    const check = assess(doc, profile, now);
    if (!check.ready) throw new Error(`Cannot approve: ${check.blockers.join(' ')}`);
  }
  const next = action === 'request-review' ? 'review' : action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : 'draft';
  const event = { _key: crypto.randomUUID(), _type: 'reviewEvent', from: doc.state, to: next, actor, note: note.trim(), at: new Date(now).toISOString(), evidenceVersion: doc.version, profile: { country: profile?.country || '', adult: !!profile?.adult, aiMode: profile?.aiMode || 'assisted', paypalOnly: !!profile?.paypalOnly } };
  return { ...doc, state: next, version: doc.version + 1, history: [...(doc.history || []), event], updatedAt: event.at };
}
