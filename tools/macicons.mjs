// Builds the macOS icon set for the Tauri app from icons/icon-512.png, so the
// desktop app carries exactly the same artwork as the installed iOS one.
//
// Rasterising is done in headless Chromium rather than with an image library:
// the repo has no dependencies, and Playwright is already here for the tests.
// Run with: node tools/macicons.mjs
//
// `npx tauri icon <source>` does the same job and also emits Windows/Linux
// sizes — use that instead if the artwork is ever replaced with a 1024 master.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'icons/icon-512.png');
const OUT = resolve(ROOT, 'src-tauri/icons');

function loadChromium() {
  for (const from of [import.meta.url, '/opt/node22/lib/']) {
    try { return createRequire(from)('playwright').chromium; } catch { /* try the next */ }
  }
  throw new Error('playwright not found — npm i -D playwright, or run `npx tauri icon`');
}

// The .icns entries macOS actually reads today: each is a PNG, tagged with the
// slot it fills. ic10 is the 1024 "512@2x" slot, ic11/ic12 the small retina ones.
const ICNS = [
  ['ic11', 32], ['ic12', 64], ['ic07', 128], ['ic13', 256],
  ['ic08', 256], ['ic14', 512], ['ic09', 512], ['ic10', 1024],
];
// Loose PNGs Tauri copies into the bundle's Resources.
const PNGS = [['32x32.png', 32], ['128x128.png', 128], ['128x128@2x.png', 256], ['icon.png', 512]];

function icns(entries) {
  const chunks = [];
  for (const [type, png] of entries) {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(png.length + 8, 4);
    chunks.push(head, png);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

const chromium = loadChromium();
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(existsSync);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();
await page.goto('about:blank');

const source = 'data:image/png;base64,' + readFileSync(SRC).toString('base64');
const cache = new Map();
async function render(size) {
  if (cache.has(size)) return cache.get(size);
  const dataUrl = await page.evaluate(async ([src, size]) => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = src; });
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/png');
  }, [source, size]);
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  cache.set(size, buf);
  return buf;
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of PNGS) {
  writeFileSync(resolve(OUT, name), await render(size));
  console.log(`  ${name.padEnd(16)} ${size}×${size}`);
}
const entries = [];
for (const [type, size] of ICNS) entries.push([type, await render(size)]);
const bundle = icns(entries);
writeFileSync(resolve(OUT, 'icon.icns'), bundle);
console.log(`  icon.icns        ${entries.length} slots, ${(bundle.length / 1024).toFixed(0)} KB`);

await browser.close();
