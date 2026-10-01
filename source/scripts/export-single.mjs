import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const query = '*[_type == "opportunity"] | order(deadline asc)';
const response = await fetch('https://ofdsgt18.api.sanity.io/v2026-09-01/data/query/production?query=' + encodeURIComponent(query) + '&perspective=published');
const payload = await response.json();
if (!response.ok || payload.result?.length !== 5) throw new Error('Real public Sanity records are required; no example fallback.');
const exportedAt = new Date().toISOString();
const snapshot = { docs: payload.result, config: { mode: 'sanity', writable: false, label: `Sanity exported snapshot · ${exportedAt.slice(0,16)} UTC`, projectId: 'ofdsgt18', dataset: 'production', snapshotAt: exportedAt } };
const css = await readFile('app/globals.css', 'utf8');
await mkdir('delivery/single-file', { recursive: true });
for (const mode of ['public-api', 'embedded-snapshot']) {
  const result = await build({ stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import Desk from './components/Desk.jsx'; createRoot(document.getElementById('app')).render(React.createElement(Desk));", resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, format: 'iife', platform: 'browser', minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_CONTENT_MODE': JSON.stringify(mode), 'process.env.NEXT_PUBLIC_SANITY_PROJECT_ID': '"ofdsgt18"', 'process.env.NEXT_PUBLIC_SANITY_DATASET': '"production"', 'process.env.NEXT_PUBLIC_APP_BASE': '"./"' } });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const embedded = mode === 'embedded-snapshot' ? `<script type="application/json" id="proof-desk-snapshot">${JSON.stringify(snapshot).replace(/</g,'\\u003c')}</script>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proof Desk — portable preview</title><style>${css}</style></head><body><div id="app"></div>${embedded}<script>${js}</script></body></html>`;
  await writeFile(`delivery/single-file/index-${mode === 'public-api' ? 'live' : 'snapshot'}.html`, html);
}
console.log('Two single-file previews exported from the Next app React component. Live mode requires the approved Pages origin; snapshot mode states its real export time. These portable previews do not include the Next routing runtime.');
