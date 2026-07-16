// Generates one consistent SVG pictogram per exercise into img/<id>.svg.
// 2D side-view skeleton with forward kinematics + equipment line-work.
// Run: node tools/genfigs.mjs   (regenerates everything deterministically)

import { POSES } from './poses.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(dirname(fileURLToPath(import.meta.url))), 'img');
mkdirSync(OUT, { recursive: true });

// ————— palette (fixed: readable on light and dark) —————
const FIG = '#e8642c';
const FIG_BACK = '#f0956e';
const EQ = '#a8a49c';

// ————— skeleton dimensions —————
const D = {
  torso: 15, torso2: 15, neck: 5, headR: 8.5,
  upper: 16, fore: 14, thigh: 21, shin: 19, foot: 8.5,
  wFig: 8, wLimb: 7, wEq: 3.5,
};

const rad = d => (d * Math.PI) / 180;

// FK: every angle is absolute-ish chained: segment direction = parent dir + local angle.
// Convention: 0° = pointing straight DOWN (+y); positive = rotate toward +x (forward/right).
function fk(p) {
  const P = (x, y) => ({ x, y });
  const step = (from, angDeg, len) => P(from.x + Math.sin(rad(angDeg)) * len, from.y + Math.cos(rad(angDeg)) * len);

  const hips = P(p.x || 0, p.y || 0);
  // torso goes UP: direction 180° + lean
  const leanT = 180 + (p.torso || 0);
  const waist = step(hips, leanT, D.torso);
  const chest = step(waist, leanT + (p.waist || 0), D.torso2);
  const neckA = leanT + (p.waist || 0) + (p.headTilt || 0);
  const headC = step(chest, neckA, D.neck + D.headR);

  const arm = (shoulder, elbow) => {
    const a1 = leanT + (p.waist || 0) + 180 + shoulder; // 0 = hang down along body
    const el = step(chest, a1, D.upper);
    const a2 = a1 + elbow;
    const hand = step(el, a2, D.fore);
    return { el, hand };
  };
  const leg = (hip, knee, ankle) => {
    const a1 = (p.torso || 0) + hip; // 0 = straight down (torso lean carries pelvis)
    const kn = step(hips, a1, D.thigh);
    const a2 = a1 + knee;
    const an = step(kn, a2, D.shin);
    const a3 = a2 + 90 + (ankle || 0); // foot ⊥ shin by default
    const toe = step(an, a3, D.foot);
    return { kn, an, toe };
  };

  const armF = arm(p.shF ?? p.sh ?? 0, p.elF ?? p.el ?? 0);
  const armB = arm(p.shB ?? p.sh ?? 0, p.elB ?? p.el ?? 0);
  const legF = leg(p.hipF ?? p.hip ?? 0, p.kneeF ?? p.knee ?? 0, p.ankF ?? p.ank ?? 0);
  const legB = leg(p.hipB ?? p.hip ?? 0, p.kneeB ?? p.knee ?? 0, p.ankB ?? p.ank ?? 0);

  return { hips, waist, chest, headC, armF, armB, legF, legB };
}

// ————— svg helpers —————
const fmt = n => Math.round(n * 10) / 10;
function line(pts, color, w, opacity = 1) {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${fmt(p.x)} ${fmt(p.y)}`).join('');
  return `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
}
const circle = (c, r, color, opacity = 1) =>
  `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(r)}" fill="${color}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;
const eqLine = (pts, w = D.wEq) => line(pts, EQ, w);

// rotate whole drawing (for lying poses draw in local space then rotate via group)
function figureSVG(k, p) {
  const parts = [];
  // back limbs first (depth)
  parts.push(line([k.hips, k.legB.kn, k.legB.an, k.legB.toe], FIG_BACK, D.wLimb));
  parts.push(line([k.chest, k.armB.el, k.armB.hand], FIG_BACK, D.wLimb));
  // torso + head
  parts.push(line([k.hips, k.waist, k.chest], FIG, D.wFig));
  parts.push(circle(k.headC, D.headR, FIG));
  // front limbs
  parts.push(line([k.hips, k.legF.kn, k.legF.an, k.legF.toe], FIG, D.wLimb));
  parts.push(line([k.chest, k.armF.el, k.armF.hand], FIG, D.wLimb));
  return parts.join('');
}

// ————— equipment builders (receive computed skeleton) —————
const PROPS = {
  floor: () => eqLine([{ x: -55, y: 46 }, { x: 55, y: 46 }], 3),
  wallL: () => eqLine([{ x: -52, y: -52 }, { x: -52, y: 46 }], 3),
  wallR: () => eqLine([{ x: 52, y: -52 }, { x: 52, y: 46 }], 3),
  // barbell in hands (front hand)
  barbell: k => {
    const h = k.armF.hand;
    return eqLine([{ x: h.x - 20, y: h.y }, { x: h.x + 20, y: h.y }], 4) +
      circle({ x: h.x - 20, y: h.y }, 6, EQ) + circle({ x: h.x + 20, y: h.y }, 6, EQ);
  },
  dumbbells: k => [k.armF.hand, k.armB.hand].map(h =>
    eqLine([{ x: h.x - 6, y: h.y }, { x: h.x + 6, y: h.y }], 4) +
    circle({ x: h.x - 6, y: h.y }, 3.4, EQ) + circle({ x: h.x + 6, y: h.y }, 3.4, EQ)).join(''),
  dumbbellF: k => {
    const h = k.armF.hand;
    return eqLine([{ x: h.x - 6, y: h.y }, { x: h.x + 6, y: h.y }], 4) +
      circle({ x: h.x - 6, y: h.y }, 3.4, EQ) + circle({ x: h.x + 6, y: h.y }, 3.4, EQ);
  },
  // cable from top pulley to front hand
  cableHigh: k => circle({ x: 46, y: -50 }, 3, EQ) + eqLine([{ x: 46, y: -50 }, k.armF.hand], 2.5),
  cableLow: k => circle({ x: 48, y: 40 }, 3, EQ) + eqLine([{ x: 48, y: 40 }, k.armF.hand], 2.5),
  pulldownBar: k => {
    const h = k.armF.hand, h2 = k.armB.hand;
    return circle({ x: (h.x + h2.x) / 2, y: -54 }, 3, EQ) +
      eqLine([{ x: (h.x + h2.x) / 2, y: -54 }, { x: (h.x + h2.x) / 2, y: Math.min(h.y, h2.y) - 4 }], 2.5) +
      eqLine([{ x: h.x - 12, y: h.y }, { x: h2.x + 12, y: h2.y }], 4);
  },
  pullupBar: k => {
    const h = k.armF.hand;
    return eqLine([{ x: h.x - 26, y: h.y - 1 }, { x: h.x + 26, y: h.y - 1 }], 4) +
      eqLine([{ x: h.x - 26, y: h.y - 1 }, { x: h.x - 26, y: h.y - 16 }], 3) +
      eqLine([{ x: h.x + 26, y: h.y - 1 }, { x: h.x + 26, y: h.y - 16 }], 3);
  },
  // bench under the body (flat / incline / decline via angle°)
  bench: (k, angle = 0) => {
    const cx = (k.hips.x + k.chest.x) / 2, cy = Math.max(k.hips.y, k.chest.y) + 8;
    const a = rad(angle), dx = Math.cos(a) * 30, dy = -Math.sin(a) * 30;
    return eqLine([{ x: cx - dx, y: cy + 0 - dy * 0 + Math.sin(a) * 30 }, { x: cx + dx, y: cy + dy }], 4) +
      eqLine([{ x: cx - 12, y: cy + (Math.sin(a) * 12) }, { x: cx - 12, y: 46 }], 3) +
      eqLine([{ x: cx + 12, y: cy - (Math.sin(a) * 12) }, { x: cx + 12, y: 46 }], 3);
  },
  // machine: seat + backrest behind figure
  machine: k => eqLine([{ x: k.hips.x - 14, y: k.hips.y + 10 }, { x: k.hips.x + 10, y: k.hips.y + 10 }], 4) +
    eqLine([{ x: k.hips.x - 14, y: k.hips.y + 10 }, { x: k.hips.x - 16, y: k.hips.y - 26 }], 4) +
    eqLine([{ x: k.hips.x - 6, y: k.hips.y + 10 }, { x: k.hips.x - 6, y: 46 }], 3),
  // leg-press sled plate at feet (⊥ to legF direction)
  sled: k => {
    const f = k.legF.an;
    const c = { x: f.x + 8, y: f.y - 2 };
    return eqLine([{ x: c.x - 6, y: c.y - 20 }, { x: c.x + 6, y: c.y + 16 }], 5);
  },
  ball: (k, r = 13) => circle({ x: k.hips.x - 2, y: k.hips.y + 10 + r * 0.4 }, r, 'none') +
    `<circle cx="${fmt(k.hips.x - 2)}" cy="${fmt(k.hips.y + 10 + r * 0.4)}" r="${r}" fill="none" stroke="${EQ}" stroke-width="3"/>`,
  ballAt: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${EQ}" stroke-width="3"/>`,
  step: () => eqLine([{ x: 8, y: 34 }, { x: 44, y: 34 }], 3) + eqLine([{ x: 8, y: 34 }, { x: 8, y: 46 }], 3) + eqLine([{ x: 44, y: 34 }, { x: 44, y: 46 }], 3),
  stool: k => eqLine([{ x: k.hips.x - 12, y: k.hips.y + 9 }, { x: k.hips.x + 10, y: k.hips.y + 9 }], 4) + eqLine([{ x: k.hips.x - 8, y: k.hips.y + 9 }, { x: k.hips.x - 8, y: 46 }], 3) + eqLine([{ x: k.hips.x + 6, y: k.hips.y + 9 }, { x: k.hips.x + 6, y: 46 }], 3),
  box: () => eqLine([{ x: 22, y: 22 }, { x: 52, y: 22 }], 3) + eqLine([{ x: 22, y: 22 }, { x: 22, y: 46 }], 3) + eqLine([{ x: 52, y: 22 }, { x: 52, y: 46 }], 3),
};

function render(id, spec) {
  const p = spec.pose;
  const k = fk(p);
  let body = figureSVG(k, p);
  let eq = '';
  for (const pr of spec.props || []) {
    if (typeof pr === 'string') eq += PROPS[pr](k);
    else eq += PROPS[pr[0]](k, ...pr.slice(1));
  }
  if (spec.extra) eq += spec.extra(k, { eqLine, circle, EQ, fmt });
  let content = eq + body; // equipment behind figure
  if (p.rot) content = `<g transform="rotate(${p.rot} ${p.rx || 0} ${p.ry || 0})">${content}</g>`;
  if (spec.groundAfterRot !== false && spec.ground !== false) content = PROPS.floor() + content;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -62 120 114">${content}</svg>`;
  writeFileSync(join(OUT, `${id}.svg`), svg);
}

let n = 0;
for (const [id, spec] of Object.entries(POSES)) { render(id, spec); n++; }
console.log(`generated ${n} figures → img/`);
