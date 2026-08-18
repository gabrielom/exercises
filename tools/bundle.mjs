// Assembles dist/ — the exact set of files the desktop app ships.
//
// The list is read out of sw.js's SHELL array rather than kept here, because
// that array is already the app's own statement of everything it needs to run
// offline. One list, so the two cannot drift apart.
//
// sw.js itself is deliberately NOT copied: a service worker cannot register on
// the custom scheme the desktop shell serves from, and it has no job there —
// the assets are already local and there is no deploy to pick up.

import { cpSync, mkdirSync, readFileSync, rmSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');

const sw = readFileSync(resolve(ROOT, 'sw.js'), 'utf8');
const shell = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shell) throw new Error('could not find the SHELL list in sw.js');

const files = [...shell[1].matchAll(/"([^"]+)"/g)]
  .map(m => m[1])
  .map(f => (f === './' ? 'index.html' : f));

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

let bytes = 0;
for (const f of files) {
  const from = resolve(ROOT, f);
  const to = resolve(DIST, f);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  bytes += statSync(from).size;
}

console.log(`  dist/  ${files.length} files, ${(bytes / 1048576).toFixed(2)} MB`);
