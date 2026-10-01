'use client';
import { useEffect, useMemo, useState } from 'react';
import { assess, draftReview, transition } from '../lib/model.mjs';

const LABELS = { entryFee: 'Upfront cost', cash: 'Cash award', deadline: 'Entry window', aiPolicy: 'AI use', eligibility: 'Eligibility', payout: 'Payment rail' };
function date(value) { return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'; }
export default function Desk() {
  const [docs, setDocs] = useState([]), [config, setConfig] = useState(null), [selected, setSelected] = useState(null);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('All'), [expired, setExpired] = useState(false);
  const [profile, setProfile] = useState({ country: '', adult: false, aiMode: 'assisted', paypalOnly: true });
  const [note, setNote] = useState(''), [status, setStatus] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [practice, setPractice] = useState(false), [copies, setCopies] = useState([]), [secret, setSecret] = useState('');
  const [now, setNow] = useState(null);
  async function load() {
    let data;
    if (process.env.NEXT_PUBLIC_CONTENT_MODE === 'embedded-snapshot') {
      data = JSON.parse(document.getElementById('proof-desk-snapshot').textContent);
    } else if (process.env.NEXT_PUBLIC_CONTENT_MODE === 'snapshot') {
      const response = await fetch('./snapshot.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('The exported Sanity snapshot could not be read.');
      data = await response.json();
    } else if (process.env.NEXT_PUBLIC_CONTENT_MODE === 'public-api') {
      const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
      const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
      const url = `https://${projectId}.api.sanity.io/v2026-09-01/data/query/${dataset}?query=${encodeURIComponent('*[_type == "opportunity" && !(_id in path("drafts.**"))] | order(deadline asc)')}&perspective=published`;
      const response = await fetch(url, { cache: 'no-store', credentials: 'omit' });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.result)) throw new Error('The public Sanity dataset could not be read.');
      data = { docs: payload.result, config: { mode: 'sanity', writable: false, label: 'Sanity Content Lake · live public read', projectId, dataset } };
    } else {
      const response = await fetch('/api/opportunities', { cache: 'no-store' });
      data = await response.json();
      if (!response.ok) throw new Error(data.error);
    }
    const currentTime = Date.now();
    setDocs(data.docs); setConfig(data.config); setSelected(current => current || data.docs.find(d => Date.parse(d.deadline) > currentTime)?._id || data.docs[0]?._id); setNow(currentTime);
  }
  useEffect(() => { load().catch(e => setError(e.message)); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const records = practice ? copies : docs;
  const visible = useMemo(() => records.filter(doc => (category === 'All' || doc.category === category) && (expired || !now || Date.parse(doc.deadline) > now) && `${doc.title} ${doc.summary}`.toLowerCase().includes(search.toLowerCase())), [records, category, expired, search, now]);
  const doc = records.find(d => d._id === selected);
  const assessment = doc && now ? assess(doc, profile, now) : null;
  const draft = doc && now ? draftReview(doc, profile, now) : null;
  function beginPractice() { setCopies(structuredClone(docs)); setPractice(true); setStatus('Practice copy opened. Changes stay in this tab and do not write to Sanity.'); setError(''); }
  async function review(action, actor) {
    setBusy(true); setError(''); setStatus('');
    try {
      const args = { actor, note, profile, expectedVersion: doc.version };
      if (practice) {
        const next = transition(doc, action, args); setCopies(all => all.map(d => d._id === doc._id ? next : d));
      } else {
        const response = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(secret ? { 'x-review-secret': secret } : {}) }, body: JSON.stringify({ id: doc._id, action, ...args }) });
        const data = await response.json();
        if (!response.ok) { if (response.status === 409) await load(); throw new Error(data.error); }
        setDocs(all => all.map(d => d._id === doc._id ? data.doc : d));
      }
      setStatus(practice ? 'Practice transition saved in this tab.' : 'Review saved to the content store.'); setNote('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function exportReceipt() {
    const receipt = { exportedAt: new Date().toISOString(), mode: practice ? 'practice-copy' : config.mode, opportunity: doc, profile, assessment, statement: 'Research decision only. No submission, spending, award or settled revenue is implied.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${doc._id}-receipt.json`; a.click(); URL.revokeObjectURL(url);
  }
  const active = records.filter(d => now && Date.parse(d.startsAt) <= now && Date.parse(d.deadline) > now).length;
  return <main>
    <header className="top"><a className="brand" href={process.env.NEXT_PUBLIC_APP_BASE || '/'} aria-label="Proof Desk home"><span className="logo">P<span>·</span></span> PROOF DESK</a><span className="edition">RECEIPTS BEFORE REWARDS</span><span className="storage"><i />{config?.label || 'Reading content…'}</span></header>
    <section className="hero"><div><div className="eyebrow">PUBLIC OPPORTUNITIES / HUMAN DECISIONS</div><h1>A prize is a possibility.<br /><em>A receipt is evidence.</em></h1><p>Research AI-friendly cash opportunities. Check the source, the cost, the deadline and the payment path before committing your time.</p></div><div className="ledger"><span>THE ENTRY RULE</span><strong>$0</strong><p>upfront entry cost</p><div className="ledger-line"><span>{active} open now</span><span>{records.length} researched</span></div><small>Prize amounts are conditional awards,<br />not income forecasts.</small></div></section>
    <section className="profile" aria-label="Your eligibility filters"><div><label htmlFor="country">Residence country code</label><input id="country" placeholder="e.g. CN" value={profile.country} maxLength={2} onChange={e => setProfile({ ...profile, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /><small>Self-declared; verify the full rules.</small></div><div><label htmlFor="ai-mode">How you build</label><select id="ai-mode" value={profile.aiMode} onChange={e => setProfile({ ...profile, aiMode: e.target.value })}><option value="assisted">Human + AI assistance</option><option value="autonomous">End-to-end autonomous AI</option></select></div><label className="check"><input type="checkbox" checked={profile.adult} onChange={e => setProfile({ ...profile, adult: e.target.checked })} />I meet the age requirement</label><label className="check"><input type="checkbox" checked={profile.paypalOnly} onChange={e => setProfile({ ...profile, paypalOnly: e.target.checked })} />Require confirmed PayPal</label></section>
    <div className="work-area"><section className="catalog"><div className="section-top"><div><div className="eyebrow">01 / DISCOVER</div><h2>Follow the receipts.</h2></div><span className="count">{visible.length}</span></div><label className="sr-only" htmlFor="search">Search opportunities</label><input id="search" className="search" placeholder="Search public opportunities…" value={search} onChange={e => setSearch(e.target.value)} /><div className="filter-row"><div className="tabs">{['All', 'Build', 'Research', 'Game'].map(c => <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div><label className="check"><input type="checkbox" checked={expired} onChange={e => setExpired(e.target.checked)} />Show expired</label></div><div className="cards">{visible.map(item => { const check = now ? assess(item, profile, now) : null; return <button className={`card ${selected === item._id ? 'selected' : ''}`} key={item._id} onClick={() => { setSelected(item._id); setNote(''); setError(''); setStatus(''); }}><div className="card-head"><span className="tag">{item.category}</span><span className={`state ${item.state}`}>{item.state}</span></div><h3>{item.title}</h3><p>{item.summary}</p><div className="card-price"><strong>{item.currency} {item.cashPrize.toLocaleString()}</strong><span>selected winner</span></div><div className="card-foot"><span>{check?.supported || 0}/6 evidence fields</span><span>{now && now < Date.parse(item.startsAt) ? 'UPCOMING' : now && now >= Date.parse(item.deadline) ? 'EXPIRED' : 'OPEN'} ↗</span></div></button>; })}</div>{!visible.length && <div className="empty">No matching opportunity. Try another filter; missing evidence is never filled with a guess.</div>}</section>
    <aside className="receipt" aria-label="Selected opportunity evidence">{doc && assessment ? <><div className="section-top"><div><div className="eyebrow">02 / VERIFY</div><h2>The evidence desk.</h2></div><span className="receipt-number">#{doc.version.toString().padStart(2, '0')}</span></div><h3 className="receipt-title">{doc.title}</h3><p className="deliverable">{doc.deliverable}</p><div className="deadline">Submit by <strong>{date(doc.deadline)}</strong></div><div className="evidence-list">{doc.claims.map(c => { const source = doc.sources.find(s => s._key === c.sourceKey); return <article className="evidence" key={c._key}><div><strong>{LABELS[c.field]}</strong><span className={`verdict ${c.verdict}`}>{c.verdict}</span></div><p>{c.text}</p>{source && <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗ <span>checked {new Date(source.checkedAt).toLocaleDateString('en-GB', { timeZone: 'UTC' })}</span></a>}</article>; })}</div><div className={`decision ${assessment.ready ? 'ready' : ''}`}><div className="eyebrow">ACTION CHECK</div><h3>{assessment.ready ? 'Ready for a human decision' : 'Hold for verification'}</h3><p>{draft.summary}</p>{assessment.blockers.length > 0 && <ul>{assessment.blockers.map(b => <li key={b}>{b}</li>)}</ul>}</div>
    <section className="review"><div className="eyebrow">03 / REVIEW</div><div className="workflow"><span className={doc.state === 'draft' ? 'current' : ''}>Draft</span><b>→</b><span className={doc.state === 'review' ? 'current' : ''}>Review</span><b>→</b><span className={['approved', 'blocked'].includes(doc.state) ? 'current' : ''}>Human decision</span></div><p className="muted">Checks are deterministic. AI helped build this app; no paid model calls run here. Approval records an owner-authorized research decision and never submits an entry. A role label does not prove whether a human or software holds the credential.</p><label htmlFor="note">Decision note</label><textarea id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="What did you verify, and what should happen next?" maxLength={1000} />{config.mode === 'sanity' && config.writable && !practice && <><label htmlFor="review-secret">Owner review secret</label><input id="review-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" /><small>Stored only in this tab. Never enter a Sanity API token here.</small></>}<div className="actions">{config.mode === 'sanity' && !config.writable && !practice ? <button className="primary" onClick={beginPractice}>Practice review on a copy</button> : <>{doc.state === 'draft' && <button className="primary" disabled={busy} onClick={() => { if (!note) { setNote(draft.summary); setStatus('Draft prepared. Review the note, then request review.'); } else review('request-review', 'assistant'); }}>Request human review</button>}{doc.state === 'review' && <><button className="primary" disabled={busy || !assessment.ready} onClick={() => review('approve', 'human')}>Approve research</button><button disabled={busy} onClick={() => review('block', 'human')}>Mark blocked</button></>}{['approved', 'blocked'].includes(doc.state) && <button disabled={busy} onClick={() => review('reopen', 'human')}>Reopen with a note</button>}</>}<button onClick={exportReceipt}>Export receipt ↓</button></div>{doc.history?.length > 0 && <details><summary>{doc.history.length} recorded transitions</summary><ol className="history">{doc.history.map(event => <li key={event._key}><strong>{event.from} → {event.to}</strong><span>{event.actor} · {date(event.at)}</span><p>{event.note}</p></li>)}</ol></details>}</section></> : <div className="empty">{!config ? 'Reading the content store…' : records.length === 0 ? 'No published receipts are available in this dataset yet. Import public records, then refresh the store.' : 'Choose an opportunity to inspect its source receipts.'}</div>}</aside></div>
    <div className="messages" aria-live="polite">{error && <p role="alert" className="error">{error}</p>}{status && <p>{status}</p>}</div><footer><span>Source → eligibility → offer → decision. Revenue remains a separate fact.</span><div>{practice ? <button onClick={() => { setPractice(false); setStatus('Practice closed; content-store records were not changed.'); }}>Close practice copy</button> : <button disabled={!config} onClick={beginPractice}>Practice on a copy</button>}<button onClick={() => load().then(() => setStatus('Content store refreshed.')).catch(e => setError(e.message))}>Refresh store</button></div></footer>{practice && <div className="practice-banner">PRACTICE COPY · changes stay in this tab</div>}
  </main>;
}
