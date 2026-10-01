import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.mjs';
test('public proxy returns real upstream content without a token or fallback', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => { assert.match(url, /^https:\/\/ofdsgt18\.api\.sanity\.io\//); assert.equal(options.headers.Authorization, undefined); return Response.json({ result: [{ _id: 'opportunity-test' }] }); };
    const response = await worker.fetch(new Request('https://demo.example/api/opportunities'), {});
    assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.config.mode, 'sanity'); assert.equal(data.config.writable, false); assert.equal(data.docs[0]._id, 'opportunity-test');
    globalThis.fetch = async () => { throw new Error('Offline'); };
    assert.equal((await worker.fetch(new Request('https://demo.example/api/opportunities'), {})).status, 503);
  } finally { globalThis.fetch = previous; }
});
test('public writes are denied and ordinary assets are served', async () => {
  assert.equal((await worker.fetch(new Request('https://demo.example/api/review', { method: 'POST' }), {})).status, 403);
  assert.equal((await worker.fetch(new Request('https://demo.example/api/opportunities', { method: 'POST' }), {})).status, 405);
  const response = await worker.fetch(new Request('https://demo.example/'), { ASSETS: { fetch: async () => new Response('app assets') } });
  assert.equal(await response.text(), 'app assets');
});
