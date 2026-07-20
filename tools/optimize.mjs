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
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, size, size);
    // strip the generated white background → transparency (works on both themes):
    // remove pixels that are both light and desaturated; figure colors (sage,
    // skin) are saturated and equipment grey is much darker, so they survive
    const d = g.getImageData(0, 0, size, size);
    const px = d.data;
    const lightDesat = i => {
      const mx = Math.max(px[i], px[i + 1], px[i + 2]);
      const mn = Math.min(px[i], px[i + 1], px[i + 2]);
      return { mx, mn, bg: mn > 193 && (mx - mn) < 30 };
    };
    for (let p = 0; p < size * size; p++) {
      const i = p * 4;
      if (lightDesat(i).bg) px[i + 3] = 0;
    }
    // de-fringe: light desaturated pixels touching transparency are the white
    // halo left by anti-aliasing — fade them out proportionally to lightness.
    // Equipment grey (~163) and figure colors are darker/saturated: untouched.
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const p = y * size + x, i = p * 4;
      if (px[i + 3] === 0) continue;
      const nearHole =
        (x > 0 && px[i - 4 + 3] === 0) || (x < size - 1 && px[i + 4 + 3] === 0) ||
        (y > 0 && px[i - size * 4 + 3] === 0) || (y < size - 1 && px[i + size * 4 + 3] === 0);
      if (!nearHole) continue;
      const { mx, mn } = lightDesat(i);
      if (mn > 175 && (mx - mn) < 34) {
        px[i + 3] = Math.max(0, Math.min(255, Math.round(255 * (194 - mn) / 19)));
      }
    }
    g.putImageData(d, 0, 0);
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
