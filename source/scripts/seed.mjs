import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { validateDocument } from '../lib/model.mjs';
const docs = JSON.parse(await readFile(new URL('../data/seed.json', import.meta.url), 'utf8'));
docs.forEach(validateDocument);
if (new Set(docs.map(d => d._id)).size !== docs.length) throw new Error('Duplicate IDs.');
await writeFile(new URL('../data/seed.ndjson', import.meta.url), docs.map(d => JSON.stringify(d)).join('\n') + '\n');
console.log(`Validated ${docs.length} public-source records; NDJSON export refreshed.`);
if (process.argv.includes('--check') || !process.argv.includes('--write')) {
  console.log('No remote writes. Use the owner-authorized Sanity CLI import, or --write with project confirmation.');
  process.exit(0);
}
const projectId = process.env.SANITY_PROJECT_ID;
if (!projectId || !process.env.SANITY_API_TOKEN || process.argv[process.argv.indexOf('--confirm-project') + 1] !== projectId) throw new Error('Writes require SANITY_API_TOKEN and --confirm-project <exact project ID>.');
const client = createClient({ projectId, dataset: process.env.SANITY_DATASET || 'production', apiVersion: '2026-09-01', useCdn: false, token: process.env.SANITY_API_TOKEN });
let tx = client.transaction();
for (const doc of docs) tx = tx.createIfNotExists(doc);
await tx.commit();
console.log(`Imported missing records only into ${projectId}. Existing records were not replaced.`);
