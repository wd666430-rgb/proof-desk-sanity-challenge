import { timingSafeEqual } from 'node:crypto';
import { applyReview, storageConfig } from '../../../lib/store.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const origin = request.headers.get('origin');
    const requestUrl = new URL(request.url);
    let sameOrigin = origin === requestUrl.origin;
    if (origin && !sameOrigin) {
      const originUrl = new URL(origin);
      // Next's loopback server may normalize request.url to localhost while the
      // browser uses 127.0.0.1. Host remains the actual browser destination.
      sameOrigin = originUrl.protocol === requestUrl.protocol && originUrl.host === request.headers.get('host');
    }
    if (!origin || !sameOrigin) return Response.json({ error: 'Review requests must come from this app.' }, { status: 403 });
    if (Number(request.headers.get('content-length') || 0) > 10000) return Response.json({ error: 'Review request is too large.' }, { status: 413 });
    const config = storageConfig();
    if (config.mode === 'sanity') {
      const expected = Buffer.from(process.env.REVIEW_SECRET || '');
      const supplied = Buffer.from(request.headers.get('x-review-secret') || '');
      if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'Editing is restricted to the owner. Public judges can browse receipts.' }, { status: 401 });
    } else if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) {
      return Response.json({ error: 'Local editing is available only on a loopback server.' }, { status: 403 });
    }
    const raw = await request.text();
    if (raw.length > 10000) return Response.json({ error: 'Review request is too large.' }, { status: 413 });
    const body = JSON.parse(raw);
    const { id, action, note, profile, expectedVersion } = body;
    // This route grants the authenticated owner permission to record a decision.
    // It does not identify humans or accept a client-supplied approval clock.
    const actor = action === 'request-review' ? 'assistant' : 'human';
    const doc = await applyReview(id, action, { actor, note, profile, expectedVersion, now: Date.now() });
    return Response.json({ doc });
  } catch (e) { return Response.json({ error: e.status === 409 ? e.message : (e.message || 'Review failed.') }, { status: e.status || 400 }); }
}
