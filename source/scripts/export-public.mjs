import { mkdir, cp, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
const targetIndex = process.argv.indexOf('--target');
const target = targetIndex < 0 ? 'worker' : process.argv[targetIndex + 1];
if (!['worker', 'itch', 'pages'].includes(target)) throw new Error('Choose --target worker, itch or pages.');
const destination = path.join(root, '.public-build', target);
await mkdir(destination, { recursive: true });
for (const file of ['app/layout.jsx', 'app/page.jsx', 'app/globals.css', 'components/Desk.jsx', 'lib/model.mjs']) {
  await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
  await cp(path.join(root, file), path.join(destination, file));
}
try { await symlink(path.join(root, 'node_modules'), path.join(destination, 'node_modules'), 'dir'); } catch (e) { if (e.code !== 'EEXIST') throw e; }
await writeFile(path.join(destination, 'package.json'), JSON.stringify({ name: 'proof-desk-public', private: true, type: 'module', dependencies: { next: '16.3.7', react: '19.3.0', 'react-dom': '19.3.0' } }, null, 2));
const configuration = { output: 'export', trailingSlash: true, poweredByHeader: false };
if (target === 'itch') configuration.assetPrefix = './';
if (target === 'pages') configuration.basePath = process.env.PROOF_DESK_PAGES_PATH || '/proof-desk-sanity-challenge';
await writeFile(path.join(destination, 'next.config.mjs'), `export default ${JSON.stringify(configuration)};\n`);
if (target === 'itch') {
  const url = 'https://ofdsgt18.api.sanity.io/v2026-09-01/data/query/production?query=' + encodeURIComponent('*[_type == "opportunity"] | order(deadline asc)') + '&perspective=published';
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload.result?.length !== 5) throw new Error('Export requires all five real public records; no seed fallback.');
  const exportedAt = new Date().toISOString();
  await mkdir(path.join(destination, 'public'), { recursive: true });
  await writeFile(path.join(destination, 'public/snapshot.json'), JSON.stringify({ docs: payload.result, config: { mode: 'sanity', writable: false, label: `Sanity exported snapshot · ${exportedAt.slice(0,16)} UTC`, projectId: 'ofdsgt18', dataset: 'production', snapshotAt: exportedAt } }));
}
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: destination, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_CONTENT_MODE: target === 'itch' ? 'snapshot' : target === 'pages' ? 'public-api' : 'server', NEXT_PUBLIC_SANITY_PROJECT_ID: 'ofdsgt18', NEXT_PUBLIC_SANITY_DATASET: 'production', NEXT_PUBLIC_APP_BASE: target === 'pages' ? `${configuration.basePath}/` : './' } });
if (result.status !== 0) process.exit(result.status || 1);
await writeFile(path.join(destination, 'out/.nojekyll'), '');
console.log(`Static assets are ready in .public-build/${target}/out. No env file, credential or private data was copied.`);
