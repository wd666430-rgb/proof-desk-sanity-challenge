export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/opportunities') {
      if (request.method !== 'GET') return Response.json({ error: 'Read-only endpoint.' }, { status: 405 });
      try {
        const query = '*[_type == "opportunity" && !(_id in path("drafts.**"))] | order(deadline asc)';
        const upstream = `https://ofdsgt18.api.sanity.io/v2026-09-01/data/query/production?query=${encodeURIComponent(query)}&perspective=published`;
        const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.result)) throw new Error('Content Lake unavailable.');
        return Response.json({ docs: result.result, config: { mode: 'sanity', writable: false, label: 'Sanity Content Lake · live public read', projectId: 'ofdsgt18', dataset: 'production' } }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
      } catch { return Response.json({ error: 'The live public dataset could not be read. No local example was substituted.' }, { status: 503 }); }
    }
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'This public demo does not expose cloud writes. Use a practice copy or the owner Studio.' }, { status: 403 });
    return env.ASSETS.fetch(request);
  }
};
