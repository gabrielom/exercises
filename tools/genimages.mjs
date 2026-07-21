// Generates illustrated exercise images with Google's Gemini Flash Image
// ("Nano Banana") into img/gen/<id>.png. Run tools/optimize.mjs afterwards to
// shrink each png to the img/gen/<id>.webp the app actually loads (imgFor).
//
// Setup: get an API key at https://aistudio.google.com ("Get API key").
//
// Usage:
//   GEMINI_API_KEY=AIza... node tools/genimages.mjs             # all missing
//   GEMINI_API_KEY=AIza... node tools/genimages.mjs push-up pigeon
//   GEMINI_API_KEY=AIza... node tools/genimages.mjs --force push-up
//
// Consistency: the first image you're happy with can anchor the style of the
// rest — copy it to img/gen/_anchor.png and every later request sends it as a
// style reference. Recommended flow: generate 3-4, pick the best, make it the
// anchor, then run the full batch.

import { EXERCISES, CATS } from '../js/data.js';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'img', 'gen');
const ANCHOR = join(OUT, '_anchor.png');
const MODEL = 'gemini-3.1-flash-image';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('Set GEMINI_API_KEY (create one at https://aistudio.google.com → "Get API key").');
  process.exit(1);
}

// One shared style spec keeps the whole set coherent. Tweak freely — palette
// values mirror css/style.css so the art sits naturally in the app.
const STYLE = [
  'Minimalist FLAT vector illustration of a single androgynous person performing an exercise,',
  'side view, full body visible, anatomically clear pose.',
  'Flat solid color shapes only — no outlines, minimal shading, no facial features,',
  'a completely blank face, simple rounded limbs, clean silhouettes.',
  'The figure is gender-neutral with a natural athletic build and a soft short crop of dark hair.',
  'BODY SHAPE (critical): the chest line is PERFECTLY STRAIGHT AND FLAT from collarbone to waist',
  'in profile — zero chest protrusion, no breasts, no bust, no pectoral bulge; straight waist.',
  'Clothing: fitted sage-green short-sleeved athletic t-shirt (#5c7a52) lying flat against the',
  'straight torso, and fitted shorts with darker sage trim (#4c6a44).',
  'Skin: warm neutral beige (#e0bd96); far-side limbs slightly lighter.',
  'Gym equipment in muted warm grey (#a3a596) with darker grey details (#83857a).',
  'Background: pure solid white (#ffffff) with ABSOLUTELY NO shadow, no ground shadow, no gradient.',
  'Square composition, generous margins, no text, no logos, no watermark.',
].join(' ');

function promptFor(ex) {
  const what = ex.pt ? `${ex.name} (${ex.pt})` : ex.name;
  const bits = [`Exercise: ${what}.`, `Category: ${CATS[ex.cat]}.`];
  if (ex.cue) bits.push(`Form cue: ${ex.cue}.`);
  if (ex.mode === 'time' && ex.cat === 'stretch') bits.push('Show the held stretch position at its deepest point.');
  else bits.push('Show the most recognizable moment of the movement.');
  return `${STYLE}\n\n${bits.join(' ')}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generate(ex) {
  const parts = [{ text: promptFor(ex) }];
  if (existsSync(ANCHOR)) {
    parts.push({ text: 'Match the exact illustration style, palette and character design of this reference image:' });
    parts.push({ inline_data: { mime_type: 'image/png', data: readFileSync(ANCHOR).toString('base64') } });
  }
  const body = JSON.stringify({ contents: [{ parts }] });

  for (let attempt = 1, delay = 2000; ; attempt++, delay *= 2) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body },
    );
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`${res.status} after ${attempt} attempts`);
      console.log(`  ${res.status}, retrying in ${delay / 1000}s…`);
      await sleep(delay);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const img = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
    if (!img) throw new Error(`no image in response: ${JSON.stringify(data).slice(0, 300)}`);
    const b64 = (img.inlineData || img.inline_data).data;
    return Buffer.from(b64, 'base64');
  }
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const wanted = args.filter(a => a !== '--force');
const list = wanted.length
  ? wanted.map(id => EXERCISES.find(e => e.id === id) || (() => { throw new Error(`unknown exercise: ${id}`); })())
  : EXERCISES;

mkdirSync(OUT, { recursive: true });
let ok = 0, skipped = 0, failed = 0;
for (const ex of list) {
  const file = join(OUT, `${ex.id}.png`);
  if (!force && (existsSync(file) || existsSync(file.replace(/\.png$/, '.webp')))) { skipped++; continue; }
  process.stdout.write(`${ex.id} … `);
  try {
    writeFileSync(file, await generate(ex));
    console.log('ok');
    ok++;
    await sleep(1200); // stay friendly to rate limits
  } catch (e) {
    console.log(`FAILED (${e.message})`);
    failed++;
  }
}
console.log(`\ndone: ${ok} generated, ${skipped} already existed, ${failed} failed`);
console.log('next: run tools/optimize.mjs to produce the img/gen/<id>.webp the app loads.');
if (existsSync(ANCHOR)) console.log('style anchor: img/gen/_anchor.png (in use)');
else console.log('tip: copy your favourite result to img/gen/_anchor.png and rerun — later images will match its style.');
