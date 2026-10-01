import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@sanity/client';
import { transition, validateDocument } from './model.mjs';

export const OPPORTUNITIES_QUERY = '*[_type == "opportunity" && !(_id in path("drafts.**"))] | order(deadline asc)';
export function storageConfig(env = process.env) {
  if (!env.SANITY_PROJECT_ID) return { mode: 'local', writable: true, label: 'Local working copy · Sanity not connected' };
  if (!/^[a-z0-9-]+$/.test(env.SANITY_PROJECT_ID) || !/^[a-zA-Z0-9_-]+$/.test(env.SANITY_DATASET || 'production')) throw new Error('Invalid Sanity project configuration.');
  return { mode: 'sanity', writable: !!env.SANITY_API_TOKEN && !!env.REVIEW_SECRET, label: 'Sanity Content Lake', projectId: env.SANITY_PROJECT_ID, dataset: env.SANITY_DATASET || 'production' };
}
export function sanityClient(write = false) {
  const config = storageConfig();
  if (config.mode !== 'sanity') throw new Error('Sanity is not configured.');
  if (write && !config.writable) throw new Error('Sanity editing needs a server-only editor token and review secret.');
  return createClient({ projectId: config.projectId, dataset: config.dataset, apiVersion: '2026-09-01', useCdn: false, perspective: 'published', token: write ? process.env.SANITY_API_TOKEN : undefined });
}
function localPath() { return path.join(process.env.PROOF_DESK_DATA_DIR || path.join(process.cwd(), '.local'), 'opportunities.json'); }
export async function readLocal() {
  let docs;
  try { docs = JSON.parse(await readFile(localPath(), 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; docs = JSON.parse(await readFile(path.join(process.cwd(), 'data/seed.json'), 'utf8')); }
  docs.forEach(validateDocument);
  return docs;
}
export async function getOpportunities() {
  const config = storageConfig();
  const docs = config.mode === 'sanity' ? await sanityClient().fetch(OPPORTUNITIES_QUERY) : await readLocal();
  docs.forEach(validateDocument);
  return { docs, config };
}
let writeQueue = Promise.resolve();
export async function applyReview(id, action, args) {
  const config = storageConfig();
  if (config.mode === 'sanity') {
    const client = sanityClient(true);
    const doc = await client.getDocument(id);
    if (!doc) throw new Error('Opportunity not found.');
    const next = transition(doc, action, args);
    await client.patch(id).ifRevisionId(doc._rev).set({ state: next.state, version: next.version, history: next.history, updatedAt: next.updatedAt }).commit();
    return next;
  }
  const job = writeQueue.then(async () => {
    const docs = await readLocal();
    const index = docs.findIndex(doc => doc._id === id);
    if (index < 0) throw new Error('Opportunity not found.');
    const next = transition(docs[index], action, args);
    docs[index] = next;
    const file = localPath();
    await mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${crypto.randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(docs, null, 2), { flag: 'wx' });
    await rename(temp, file);
    return next;
  });
  writeQueue = job.catch(() => {});
  return job;
}
