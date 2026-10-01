import React, { useState } from 'react';
import { useClient } from 'sanity';
import { assess, transition } from '../../lib/model.mjs';

export function ReviewAction(props) {
  const client = useClient({ apiVersion: '2026-09-01' });
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState(null), [note, setNote] = useState('');
  const [profile, setProfile] = useState({ country: '', adult: false, aiMode: 'assisted', paypalOnly: true });
  if (props.type !== 'opportunity') return null;
  const doc = snapshot || props.published;
  let check;
  try { check = doc ? assess(doc, profile) : null; } catch (e) { check = { ready: false, blockers: [e.message] }; }
  async function save(action) {
    setBusy(true); setError('');
    try {
      if (!snapshot) throw new Error('Open the current published receipt before reviewing.');
      if (props.draft || await client.getDocument(`drafts.${snapshot._id}`)) throw new Error('A content draft exists. Publish or discard it, then reopen this review.');
      const next = transition(snapshot, action, { actor: 'human', note, profile, expectedVersion: snapshot.version });
      await client.patch(snapshot._id).ifRevisionId(snapshot._rev).set({ state: next.state, version: next.version, history: next.history, updatedAt: next.updatedAt }).commit();
      setSnapshot(null); setOpen(false); props.onComplete();
    } catch (e) { setError(e.statusCode === 409 ? 'This receipt changed. Close and reopen the review; nothing was overwritten.' : e.message); }
    finally { setBusy(false); }
  }
  return {
    label: busy ? 'Reviewing…' : 'Review receipt',
    disabled: busy || !props.published || !!props.draft,
    title: props.draft ? 'Publish or discard content edits before reviewing the published receipt.' : 'Review the current published source receipts using your Studio login.',
    onHandle: async () => {
      setError(''); setNote(''); setBusy(true);
      try { const current = await client.getDocument(props.id.replace(/^drafts\./, '')); if (!current) throw new Error('Published receipt not found.'); setSnapshot(current); setOpen(true); }
      catch (e) { setError(e.message); setOpen(true); }
      finally { setBusy(false); }
    },
    dialog: open && {
      type: 'dialog', header: 'Source-backed human review', onClose: () => { setOpen(false); setSnapshot(null); },
      content: <div style={{ padding: 24, display: 'grid', gap: 14 }}>
        <p style={{ margin: 0 }}>Reviewing: <strong>{doc?.title}</strong>. A decision never sends a submission or spends money. The current Studio login authorizes the write; no permanent API token is embedded.</p>
        <div style={{ border: '1px solid #ccc', padding: 12 }}><strong>Evidence snapshot · revision {snapshot?._rev}</strong>{snapshot?.claims.map(claim => { const source = snapshot.sources.find(s => s._key === claim.sourceKey); return <p key={claim._key} style={{ margin: '12px 0' }}><strong>{claim.field} · {claim.verdict}</strong><br />{claim.text}{source && <><br /><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · checked {source.checkedAt}</>}</p>; })}</div>
        <label>Residence country code <input value={profile.country} maxLength={2} onChange={e => setProfile({ ...profile, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></label>
        <label><input type="checkbox" checked={profile.adult} onChange={e => setProfile({ ...profile, adult: e.target.checked })} /> Age requirement met</label>
        <label><input type="checkbox" checked={profile.paypalOnly} onChange={e => setProfile({ ...profile, paypalOnly: e.target.checked })} /> Require confirmed PayPal</label>
        <label>AI method <select value={profile.aiMode} onChange={e => setProfile({ ...profile, aiMode: e.target.value })}><option value="assisted">Human + AI assistance</option><option value="autonomous">End-to-end autonomous</option></select></label>
        {check?.blockers.length > 0 && <ul>{check.blockers.map(b => <li key={b}>{b}</li>)}</ul>}
        <label>Decision note<textarea style={{ display: 'block', width: '100%', minHeight: 80 }} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {doc?.state === 'draft' && <button disabled={busy} onClick={() => save('request-review')}>Request review</button>}
          {doc?.state === 'review' && <><button disabled={busy || !check?.ready} onClick={() => save('approve')}>Approve research</button><button disabled={busy} onClick={() => save('block')}>Mark blocked</button></>}
          {['approved', 'blocked'].includes(doc?.state) && <button disabled={busy} onClick={() => save('reopen')}>Reopen</button>}
        </div>
        {error && <p role="alert" style={{ color: '#b33' }}>{error}</p>}
        <small>Transition history is ordinary editable content, not an immutable financial audit trail.</small>
      </div>
    }
  };
}
