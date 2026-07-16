// Shrinks generated exercise art: img/gen/<id>.png (1024², ~400 KB) becomes
// img/gen/<id>.webp (768², ~40 KB) and the png is deleted. Uses headless
// Chromium as the encoder via Playwright, so there are no native image deps.
// Rerun tools/genimages.mjs afterwards (or let it run next time) to refresh
// js/gen-manifest.js — it prefers .webp over .png automatically.
//
// Usage: node tools/optimize.mjs   (needs playwright installed or global)

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, 'img', 'gen');
const SIZE = 768;
const QUALITY = 0.82;

function loadChromium() {
  for (const from of [import.meta.url, '/opt/node22/lib/']) {
    try { return createRequire(from)('playwright').chromium; } catch { /* next */ }
  }
  console.error('playwright not found — npm i -D playwright (or install globally).');
  process.exit(1);
}

const files = existsSync(DIR)
  ? readdirSync(DIR).filter(f => f.endsWith('.png') && !f.startsWith('_')).sort()
  : [];
if (!files.length) { console.log('nothing to optimize'); process.exit(0); }

const chromium = loadChromium();
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium']
  .find(p => existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();

let before = 0, after = 0;
for (const f of files) {
  const src = join(DIR, f);
  const png = readFileSync(src);
  before += png.length;
  const dataUrl = await page.evaluate(async ([b64, size, q]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(img, 0, 0, size, size);
    return c.toDataURL('image/webp', q);
  }, [png.toString('base64'), SIZE, QUALITY]);
  const webp = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(src.replace(/\.png$/, '.webp'), webp);
  unlinkSync(src);
  after += webp.length;
  console.log(`${f} → webp (${Math.round(png.length / 1024)} → ${Math.round(webp.length / 1024)} KB)`);
}
await browser.close();
console.log(`\n${files.length} images: ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB`);
