import { getOpportunities } from '../../../lib/store.mjs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await getOpportunities(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'The content store could not be read. Check the server configuration; no local fallback was used.' }, { status: 503 }); }
}
