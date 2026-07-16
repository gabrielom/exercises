/* global Zdog */
// One parameterized pseudo-3D stick figure + a keyframe pose library.
// Every exercise id in data.js maps to an animation here — either a bespoke
// pose pair or a tuned variant of a shared archetype.

const d2r = d => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

const DIM = {
  torso: 13, torso2: 13, headR: 7, neck: 4,
  upper: 15, fore: 13, thigh: 19, shin: 17, foot: 7,
  stroke: 7, torsoStroke: 9, hipW: 5, shW: 7,
  ground: 40,
};

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// ————————————————————— rig —————————————————————

function limb(addTo, len, stroke, color, translate) {
  const joint = new Zdog.Anchor({ addTo, translate });
  new Zdog.Shape({ addTo: joint, path: [{ y: 0 }, { y: len }], stroke, color });
  return joint;
}

function buildFigure(illo, color, lineColor, view, noGround) {
  const root = new Zdog.Anchor({ addTo: illo, rotate: { y: d2r(view) } });
  if (!noGround) new Zdog.Shape({ // ground
    addTo: root, path: [{ x: -46 }, { x: 46 }],
    translate: { y: DIM.ground }, stroke: 2, color: lineColor,
  });
  const spin = new Zdog.Anchor({ addTo: root });          // whole-body z rotation (lying poses)
  const t = new Zdog.Anchor({ addTo: spin });              // whole-body translate
  const hips = new Zdog.Anchor({ addTo: t });              // pelvis
  new Zdog.Shape({ addTo: hips, path: [{ y: 0 }, { y: -DIM.torso }], stroke: DIM.torsoStroke, color });
  const waist = new Zdog.Anchor({ addTo: hips, translate: { y: -DIM.torso } });
  new Zdog.Shape({ addTo: waist, path: [{ y: 0 }, { y: -DIM.torso2 }], stroke: DIM.torsoStroke, color });
  const chest = new Zdog.Anchor({ addTo: waist, translate: { y: -DIM.torso2 } });
  const head = new Zdog.Anchor({ addTo: chest, translate: { y: -DIM.neck } });
  new Zdog.Shape({ addTo: head, translate: { y: -DIM.headR - 2 }, stroke: DIM.headR * 2, color });

  const shL = limb(chest, DIM.upper, DIM.stroke, color, { x: -1, z: -DIM.shW });
  const elL = limb(shL, DIM.fore, DIM.stroke, color, { y: DIM.upper });
  const shR = limb(chest, DIM.upper, DIM.stroke, color, { x: -1, z: DIM.shW });
  const elR = limb(shR, DIM.fore, DIM.stroke, color, { y: DIM.upper });

  const hipL = limb(hips, DIM.thigh, DIM.stroke, color, { z: -DIM.hipW });
  const kneeL = limb(hipL, DIM.shin, DIM.stroke, color, { y: DIM.thigh });
  const ankL = new Zdog.Anchor({ addTo: kneeL, translate: { y: DIM.shin } });
  new Zdog.Shape({ addTo: ankL, path: [{ x: 0 }, { x: DIM.foot }], stroke: DIM.stroke - 1, color });
  const hipR = limb(hips, DIM.thigh, DIM.stroke, color, { z: DIM.hipW });
  const kneeR = limb(hipR, DIM.shin, DIM.stroke, color, { y: DIM.thigh });
  const ankR = new Zdog.Anchor({ addTo: kneeR, translate: { y: DIM.shin } });
  new Zdog.Shape({ addTo: ankR, path: [{ x: 0 }, { x: DIM.foot }], stroke: DIM.stroke - 1, color });

  return { root, spin, t, hips, waist, chest, head, shL, elL, shR, elR, hipL, kneeL, ankL, hipR, kneeR, ankR };
}

// ————————————————————— pose system —————————————————————
// A pose: { ty, tx, rot, joints... } — joint values are z-degrees, or {x,y,z}.
const JOINTS = ['hips', 'waist', 'chest', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'kneeL', 'ankL', 'hipR', 'kneeR', 'ankR'];

function jv(v) { return typeof v === 'number' ? { x: 0, y: 0, z: v } : { x: v.x || 0, y: v.y || 0, z: v.z || 0 }; }

function lerp(a, b, k) { return a + (b - a) * k; }

function samplePose(A, B, k) {
  const out = { ty: lerp(A.ty || 0, B.ty || 0, k), tx: lerp(A.tx || 0, B.tx || 0, k), rot: lerp(A.rot || 0, B.rot || 0, k), prop: lerp(A.prop || 0, B.prop || 0, k) };
  for (const j of JOINTS) {
    const a = jv(A[j] ?? 0), b = jv(B[j] ?? 0);
    out[j] = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) };
  }
  return out;
}

function applyPose(fig, p) {
  fig.t.translate.y = p.ty;
  fig.t.translate.x = p.tx;
  fig.spin.rotate.z = d2r(p.rot);
  for (const j of JOINTS) {
    const r = p[j];
    fig[j].rotate.x = d2r(r.x);
    fig[j].rotate.y = d2r(r.y);
    fig[j].rotate.z = d2r(r.z);
  }
  return p;
}

// standing baseline: feet reach ground → hips sit at ground - (thigh+shin) = 40-36 = 4
const STAND_Y = DIM.ground - (DIM.thigh + DIM.shin);

// ————————————————————— pose library —————————————————————
// Conventions (figure faces +x, "right" on screen):
//  hips.z +  → torso leans forward (hinge)
//  sh.z −    → arm swings forward/up ; sh.z + → arm goes back
//  hip.z −   → thigh swings forward/up ; knee.z + → shin folds back
const STAND = { ty: STAND_Y };

function pose(extra) { return { ty: STAND_Y, shL: 16, shR: -16, elL: -6, elR: -6, ...extra }; }

const ANIMS = {};
function def(id, A, B, opts = {}) { ANIMS[id] = { A, B, dur: opts.dur || 2600, props: opts.props || [], view: opts.view, ease: opts.ease, tick: opts.tick, zoom: opts.zoom, noGround: opts.noGround }; }
function vary(id, baseId, patchA = {}, patchB = {}, opts = {}) {
  const b = ANIMS[baseId];
  ANIMS[id] = { ...b, ...opts, props: opts.props || b.props, A: { ...b.A, ...patchA }, B: { ...b.B, ...patchB } };
}

// ——— Gym ———
def('squat',
  pose({ shL: -78, shR: -78, elL: -8, elR: -8 }),
  pose({ ty: STAND_Y + 15, hips: 32, waist: -6, shL: -95, shR: -95, hipL: -88, hipR: -88, kneeL: 96, kneeR: 96, ankL: -12, ankR: -12 }),
  { dur: 2200 });
def('bench',
  { rot: -90, ty: 6, tx: 2, hipL: -35, hipR: -35, kneeL: 45, kneeR: 45, shL: { z: -95, y: -12 }, shR: { z: -95, y: 12 }, elL: -45, elR: -45, head: 8 },
  { rot: -90, ty: 6, tx: 2, hipL: -35, hipR: -35, kneeL: 45, kneeR: 45, shL: { z: -92, y: -12 }, shR: { z: -92, y: 12 }, elL: -2, elR: -2, head: 8 },
  { dur: 2000, props: ['bench', 'barbell'] });
def('deadlift',
  pose({ ty: STAND_Y + 10, hips: 62, waist: 6, shL: -62 + 90, shR: -62 + 90, hipL: -42, hipR: -42, kneeL: 48, kneeR: 48 }),
  pose({ hips: 2, shL: 4, shR: 4 }),
  { dur: 2400, props: ['barbell'] });
def('row',
  pose({ ty: STAND_Y + 6, hips: 52, hipL: -22, hipR: -22, kneeL: 26, kneeR: 26, shL: 34, shR: 34, elL: -6, elR: -6 }),
  pose({ ty: STAND_Y + 6, hips: 52, hipL: -22, hipR: -22, kneeL: 26, kneeR: 26, shL: 58, shR: 58, elL: -92, elR: -92 }),
  { dur: 1900, props: ['barbell'] });
def('ohp',
  pose({ shL: -132, shR: -132, elL: -78, elR: -78 }),
  pose({ shL: -178, shR: -178, elL: -2, elR: -2 }),
  { dur: 2100, props: ['barbell'] });
def('curl',
  pose({ elL: -10, elR: -10 }),
  pose({ elL: -128, elR: -128 }),
  { dur: 1800, props: ['barbell'] });

// ——— Push-ups ———
def('pushup',
  { rot: -86, ty: 14, tx: -4, head: -14, shL: 88, shR: 88, elL: 2, elR: 2, ankL: 60, ankR: 60 },
  { rot: -86, ty: 22, tx: -4, head: -16, shL: 62, shR: 62, elL: -88, elR: -88, ankL: 60, ankR: 60 },
  { dur: 2100 });
vary('pushup-wide', 'pushup',
  { shL: { z: 88, y: -28 }, shR: { z: 88, y: 28 } },
  { shL: { z: 58, y: -34 }, shR: { z: 58, y: 34 }, elL: -96, elR: -96 });
vary('pushup-diamond', 'pushup',
  { shL: { z: 88, y: 16 }, shR: { z: 88, y: -16 } },
  { shL: { z: 60, y: 16 }, shR: { z: 60, y: -16 }, elL: -80, elR: -80 });
vary('pushup-incline', 'pushup',
  { rot: -62, ty: 4, tx: -10 }, { rot: -62, ty: 10, tx: -10 }, { props: ['box'] });
vary('pushup-knee', 'pushup',
  { kneeL: 88, kneeR: 88, ty: 10 }, { kneeL: 88, kneeR: 88, ty: 18 });

// ——— Pull-ups ———
def('pullup',
  { ty: -10, shL: { z: -168, y: -14 }, shR: { z: -168, y: 14 }, elL: -6, elR: -6, hipL: -8, hipR: -8, kneeL: 24, kneeR: 24 },
  { ty: -25, shL: { z: -152, y: -14 }, shR: { z: -152, y: 14 }, elL: -106, elR: -106, hipL: -14, hipR: -14, kneeL: 38, kneeR: 38, head: -6 },
  { dur: 2300, props: ['bar'], zoom: 0.84, noGround: true });
vary('chinup', 'pullup',
  { shL: -176, shR: -176 }, { shL: -150, shR: -150, elL: -120, elR: -120, chest: -8 });
vary('negative', 'pullup', {}, {}, { ease: 'saw', dur: 3600 });
def('scappull',
  { ty: -10, shL: { z: -170, y: -14 }, shR: { z: -170, y: 14 }, chest: 6 },
  { ty: -16, shL: { z: -174, y: -14 }, shR: { z: -174, y: 14 }, chest: -6 },
  { dur: 2000, props: ['bar'], zoom: 0.84, noGround: true });
def('deadhang',
  { ty: -10, rot: -3, shL: { z: -170, y: -14 }, shR: { z: -170, y: 14 }, hipL: -4, hipR: -4, kneeL: 14, kneeR: 14 },
  { ty: -10, rot: 3, shL: { z: -170, y: -14 }, shR: { z: -170, y: 14 }, hipL: 4, hipR: 4, kneeL: 10, kneeR: 10 },
  { dur: 3200, props: ['bar'], zoom: 0.84, noGround: true });

// ——— Stretch · warm-up ———
def('neckroll', pose({}), pose({}), {
  dur: 3400,
  tick(fig, k) {
    fig.head.rotate.z = d2r(Math.sin(k * TAU) * 24);
    fig.head.rotate.x = d2r((Math.cos(k * TAU) - 1) * 10);
  },
});
def('catcow',
  { ty: 16, hips: -90, waist: 22, chest: 20, head: -20, shL: 88, shR: 88, hipL: 92, hipR: 92, kneeL: 88, kneeR: 88 },
  { ty: 16, hips: -90, waist: -18, chest: -16, head: 20, shL: 88, shR: 88, hipL: 92, hipR: 92, kneeL: 88, kneeR: 88 },
  { dur: 3000 });
def('trot',
  { ty: 16, hips: -90, waist: 6, shR: 88, shL: 60, elL: -70, hipL: 92, hipR: 92, kneeL: 88, kneeR: 88, chest: { x: 12 } },
  { ty: 16, hips: -90, waist: 6, shR: 88, shL: { z: -60, x: -40 }, elL: -6, hipL: 92, hipR: 92, kneeL: 88, kneeR: 88, chest: { x: -34 }, head: { x: -18 } },
  { dur: 2800, view: -40 });
def('hipcar', pose({ shL: -10, shR: -30 }), pose({}), {
  dur: 3600,
  tick(fig, k) {
    const a = k * TAU;
    fig.hipR.rotate.z = d2r(-55 + Math.cos(a) * 40);
    fig.hipR.rotate.y = d2r(Math.sin(a) * 45);
    fig.kneeR.rotate.z = d2r(70 + Math.sin(a) * 20);
  },
});
def('deepsquat',
  pose({ ty: STAND_Y + 24, hips: 30, shL: -84, shR: -84, elL: -74, elR: -74, hipL: -112, hipR: -112, kneeL: 128, kneeR: 128 }),
  pose({ ty: STAND_Y + 26, hips: 26, shL: -84, shR: -84, elL: -74, elR: -74, hipL: -114, hipR: -114, kneeL: 130, kneeR: 130 }),
  { dur: 3400 });
def('downdog',
  { ty: 8, tx: -2, hips: -118, waist: 8, head: 26, shL: 154, shR: 154, hipL: 108, hipR: 108, kneeL: 2, kneeR: 2, ankL: 8, ankR: 8 },
  { ty: 8, tx: -2, hips: -118, waist: 8, head: 26, shL: 154, shR: 154, hipL: 108, hipR: 108, kneeL: 2, kneeR: 26, ankL: 2, ankR: 30 },
  { dur: 2600 });

// ——— Stretch · feet & ankles ———
def('anklecar',
  { ty: 20, hips: 55, hipL: -70, kneeL: 20, hipR: -95, kneeR: 8, shL: 30, shR: 30 },
  { ty: 20, hips: 55, hipL: -70, kneeL: 20, hipR: -95, kneeR: 8, shL: 30, shR: 30 },
  {
    dur: 3000,
    tick(fig, k) {
      fig.ankR.rotate.z = d2r(Math.sin(k * TAU) * 38);
      fig.ankR.rotate.y = d2r(Math.cos(k * TAU) * 24);
    },
  });
def('anklerock',
  { ty: 14, hipL: -95, kneeL: 78, ankL: 12, hipR: 12, kneeR: 78, hips: 18, shL: -60, elL: -20 },
  { ty: 15, tx: 6, hipL: -108, kneeL: 58, ankL: -16, hipR: 12, kneeR: 78, hips: 24, shL: -70, elL: -14 },
  { dur: 2600 });
def('calf',
  pose({ tx: -4, hips: 22, shL: -108, shR: -108, elL: -18, elR: -18, hipL: -34, kneeL: 26, hipR: 26, kneeR: 2, ankR: 14 }),
  pose({ tx: -4, ty: STAND_Y + 2, hips: 26, shL: -112, shR: -112, elL: -14, elR: -14, hipL: -38, kneeL: 32, hipR: 28, kneeR: 2, ankR: 18 }),
  { dur: 3200, props: ['wall'] });
vary('soleus', 'calf',
  { hipR: 20, kneeR: 34, ankR: 4 }, { hipR: 22, kneeR: 42, ankR: 6 });
def('doming',
  { ty: 20, hips: 55, hipL: -70, kneeL: 20, hipR: -70, kneeR: 20, shL: 30, shR: 30, ankL: 4, ankR: 4 },
  { ty: 20, hips: 55, hipL: -70, kneeL: 20, hipR: -70, kneeR: 20, shL: 30, shR: 30, ankL: 4, ankR: -14 },
  { dur: 2400 });
def('pointflex',
  { ty: 22, hips: 58, hipL: -62, kneeL: 4, hipR: -62, kneeR: 4, ankL: -50, ankR: -50, shL: 26, shR: 26 },
  { ty: 22, hips: 58, hipL: -62, kneeL: 4, hipR: -62, kneeR: 4, ankL: 42, ankR: 42, shL: 26, shR: 26 },
  { dur: 2600 });
def('releve',
  pose({ ankL: 4, ankR: 4, shL: -12, shR: -12 }),
  pose({ ty: STAND_Y - 7, ankL: -58, ankR: -58, shL: -16, shR: -16 }),
  { dur: 2400 });
def('toekneel',
  { ty: 24, hips: 8, hipL: -128, kneeL: 128, ankL: -66, hipR: -128, kneeR: 128, ankR: -66, shL: 14, shR: 14 },
  { ty: 26, hips: 12, hipL: -132, kneeL: 132, ankL: -70, hipR: -132, kneeR: 132, ankR: -70, shL: 16, shR: 16 },
  { dur: 3200 });
vary('archpointe', 'toekneel',
  { ankL: 30, ankR: 30, hips: 4 }, { ankL: 42, ankR: 42, hips: 10, tx: 4 });

// ——— Stretch · psoas & hip flexors ———
def('march',
  pose({}), pose({}),
  {
    dur: 2800,
    tick(fig, k) {
      const a = Math.sin(k * TAU);
      const up = x => d2r(Math.max(0, x) * -95);
      fig.hipL.rotate.z = up(a);
      fig.kneeL.rotate.z = d2r(Math.max(0, a) * 95);
      fig.hipR.rotate.z = up(-a);
      fig.kneeR.rotate.z = d2r(Math.max(0, -a) * 95);
      fig.shL.rotate.z = d2r(-a * 18);
      fig.shR.rotate.z = d2r(a * 18);
    },
  });
def('lunge',
  { ty: 16, hips: 6, hipL: -78, kneeL: 82, hipR: 42, kneeR: 62, ankR: 40, shL: -22, shR: -22 },
  { ty: 19, hips: 10, hipL: -84, kneeL: 90, hipR: 48, kneeR: 62, ankR: 44, shL: -26, shR: -26 },
  { dur: 3200 });
vary('lowlunge', 'lunge', {}, {});
vary('couch', 'lunge',
  { hipR: 30, kneeR: 118, hips: -4, shL: -60, shR: -60, tx: -4 },
  { hipR: 34, kneeR: 126, hips: -8, shL: -66, shR: -66, tx: -4 },
  { props: ['wall-behind'] });
vary('lizard', 'lunge',
  { hips: 46, shL: 60, shR: 60, elL: -30, elR: -30, hipL: { z: -86, y: -20 } },
  { hips: 52, shL: 66, shR: 66, elL: -36, elR: -36, hipL: { z: -92, y: -24 } });
def('crest',
  { rot: 90, ty: 4, hipL: -55, kneeL: 62, hipR: -55, kneeR: 62, shL: 30, shR: 30, head: -6 },
  { rot: 90, ty: 4, hipL: -52, kneeL: 58, hipR: -52, kneeR: 58, shL: 32, shR: 32, head: -8 },
  { dur: 3800 });
def('hipext',
  pose({ shL: -96, shR: -96, elL: -10, elR: -10, hipR: 34, kneeR: 8, hips: 6 }),
  pose({ shL: -102, shR: -102, hipR: 44, kneeR: 4, hips: 10, chest: -6 }),
  { dur: 3000 });

// ——— Stretch · hamstrings ———
def('fold',
  pose({ ty: STAND_Y + 2, hips: 128, waist: 18, head: 10, shL: 40, shR: 40, elL: -10, elR: -10, kneeL: 8, kneeR: 8 }),
  pose({ ty: STAND_Y + 3, hips: 136, waist: 22, head: 12, shL: 46, shR: 46, elL: -8, elR: -8, kneeL: 4, kneeR: 4 }),
  { dur: 3400 });
def('elephant',
  pose({ ty: STAND_Y + 2, hips: 122, waist: 20, shL: 44, shR: 44, kneeL: 4, kneeR: 4 }),
  pose({ ty: STAND_Y + 2, hips: 122, waist: 20, shL: 44, shR: 44, kneeL: 4, kneeR: 4 }),
  {
    dur: 2800,
    tick(fig, k) {
      const a = Math.sin(k * TAU);
      fig.kneeL.rotate.z = d2r(Math.max(0, a) * 42 + 4);
      fig.kneeR.rotate.z = d2r(Math.max(0, -a) * 42 + 4);
    },
  });
def('slham',
  { rot: 90, ty: 4, hipL: -78, kneeL: 4, hipR: -6, kneeR: 10, shL: -46, elL: -14, head: -6 },
  { rot: 90, ty: 4, hipL: -92, kneeL: 2, hipR: -6, kneeR: 10, shL: -58, elL: -10, head: -8 },
  { dur: 3200 });
def('hinge',
  pose({ hips: 12, shL: 12, shR: 12 }),
  pose({ ty: STAND_Y + 4, hips: 86, shL: 60, shR: 60, kneeL: 10, kneeR: 10 }),
  { dur: 3000 });
def('halfsplit',
  { ty: 18, hips: 42, hipL: -66, kneeL: 4, ankL: 40, hipR: -122, kneeR: 122, shL: 30, shR: 30, elL: -14, elR: -14 },
  { ty: 18, hips: 56, waist: 10, hipL: -70, kneeL: 2, ankL: 44, hipR: -122, kneeR: 122, shL: 44, shR: 44, elL: -10, elR: -10 },
  { dur: 3200 });
def('hurdler',
  { ty: 22, hips: 40, hipL: -62, kneeL: 4, ankL: -30, hipR: { z: -70, y: 55 }, kneeR: 95, shL: 20, shR: 20 },
  { ty: 22, hips: 58, waist: 14, hipL: -64, kneeL: 2, ankL: -34, hipR: { z: -70, y: 55 }, kneeR: 95, shL: 38, shR: 38 },
  { dur: 3200 });
def('rolldown',
  pose({}),
  pose({ ty: STAND_Y + 2, head: 34, chest: 30, waist: 34, hips: 46, shL: 20, shR: 20, kneeL: 8, kneeR: 8 }),
  { dur: 3600 });

// ——— Stretch · front split ———
vary('lungepulse', 'lunge',
  { ty: 15 }, { ty: 21 }, { dur: 1700 });
def('lungeflow',
  { ty: 17, hips: 8, hipL: -80, kneeL: 84, hipR: 44, kneeR: 62, ankR: 40, shL: -20, shR: -20 },
  { ty: 18, hips: 52, waist: 10, hipL: -68, kneeL: 4, ankL: 42, hipR: -122, kneeR: 122, shL: 40, shR: 40 },
  { dur: 3400 });
def('pigeon',
  { ty: 21, hips: 26, hipL: { z: -78, y: -34 }, kneeL: 108, hipR: 66, kneeR: 6, shL: 4, shR: 4 },
  { ty: 22, hips: 48, waist: 14, hipL: { z: -80, y: -36 }, kneeL: 110, hipR: 68, kneeR: 4, shL: 30, shR: 30 },
  { dur: 3400 });
def('quadpull',
  pose({ shL: -18, hipR: 6, kneeR: 118, shR: 42, elR: -46 }),
  pose({ shL: -22, hipR: 12, kneeR: 138, shR: 52, elR: -56, hips: 4 }),
  { dur: 3000 });
def('frontsplit',
  { ty: 22, hips: 14, hipL: -74, kneeL: 4, ankL: 30, hipR: 68, kneeR: 4, shL: -6, shR: -6, elL: -10, elR: -10 },
  { ty: 27, hips: 10, hipL: -84, kneeL: 2, ankL: 34, hipR: 82, kneeR: 2, shL: -10, shR: -10 },
  { dur: 3600 });
vary('splitpnf', 'frontsplit',
  { ty: 25 }, { ty: 27, hips: 16, shL: -60, shR: -60 }, { dur: 2200 });

// ——— Stretch · pancake & middle split ———
def('butterfly',
  { ty: 22, hips: 26, hipL: { z: -55, y: -55 }, kneeL: 120, hipR: { z: -55, y: 55 }, kneeR: 120, shL: 24, shR: 24 },
  { ty: 22, hips: 40, waist: 10, hipL: { z: -58, y: -60 }, kneeL: 124, hipR: { z: -58, y: 60 }, kneeR: 124, shL: 36, shR: 36 },
  { dur: 3200, view: -42 });
def('nineninety',
  { ty: 22, hips: 22, hipL: { z: -70, y: -12 }, kneeL: 92, hipR: { z: 24, y: 48 }, kneeR: 92, shL: 12, shR: 12 },
  { ty: 22, hips: 44, waist: 12, hipL: { z: -72, y: -12 }, kneeL: 92, hipR: { z: 24, y: 48 }, kneeR: 92, shL: 34, shR: 34 },
  { dur: 3200, view: -36 });
def('frogrock',
  { ty: 18, hips: -86, waist: 4, shL: 80, shR: 80, elL: -30, elR: -30, hipL: { z: -95, y: -50 }, kneeL: 95, hipR: { z: -95, y: 50 }, kneeR: 95 },
  { ty: 19, tx: -7, hips: -80, waist: 2, shL: 96, shR: 96, elL: -20, elR: -20, hipL: { z: -100, y: -52 }, kneeL: 98, hipR: { z: -100, y: 52 }, kneeR: 98 },
  { dur: 2800, view: -40 });
vary('frog', 'frogrock',
  { ty: 20 }, { ty: 21, tx: 0, hips: -84 }, { dur: 3600 });
def('horse',
  { ty: STAND_Y + 12, hipL: { z: -68, y: -60 }, kneeL: 85, hipR: { z: -68, y: 60 }, kneeR: 85, shL: -80, shR: -80, elL: -60, elR: -60, hips: 8 },
  { ty: STAND_Y + 15, hipL: { z: -72, y: -62 }, kneeL: 89, hipR: { z: -72, y: 62 }, kneeR: 89, shL: -80, shR: -80, elL: -60, elR: -60, hips: 8 },
  { dur: 3000, view: -55 });
def('straddleside',
  { ty: 22, hips: 8, hipL: { z: -62, y: -48 }, kneeL: 2, hipR: { z: -62, y: 48 }, kneeR: 2, waist: { z: 10, x: 8 }, shL: -30, shR: 60 },
  { ty: 22, hips: 10, hipL: { z: -62, y: -48 }, kneeL: 2, hipR: { z: -62, y: 48 }, kneeR: 2, waist: { z: 34, x: 18 }, chest: { z: 12 }, shL: -70, shR: 80 },
  { dur: 3200, view: -46 });
def('straddlecenter',
  { ty: 22, hips: 16, hipL: { z: -62, y: -48 }, kneeL: 2, hipR: { z: -62, y: 48 }, kneeR: 2, shL: 24, shR: 24 },
  { ty: 22, hips: 44, waist: 14, hipL: { z: -64, y: -50 }, kneeL: 2, hipR: { z: -64, y: 50 }, kneeR: 2, shL: 48, shR: 48 },
  { dur: 3400, view: -46 });
vary('pancake', 'straddlecenter',
  { hips: 30 }, { hips: 62, waist: 16, chest: 6, shL: 60, shR: 60 }, { dur: 3600 });
def('cossack',
  { ty: STAND_Y + 14, hipL: { z: -95, y: -35 }, kneeL: 115, hipR: { z: -60, y: 55 }, kneeR: 2, ankR: -35, shL: -70, shR: -70, hips: 12 },
  { ty: STAND_Y + 17, hipL: { z: -100, y: -36 }, kneeL: 120, hipR: { z: -62, y: 57 }, kneeR: 2, ankR: -38, shL: -76, shR: -76, hips: 14 },
  { dur: 3200, view: -50 });
def('wallstraddle',
  { rot: 90, ty: 2, hipL: { z: -88, y: -30 }, kneeL: 2, hipR: { z: -88, y: 30 }, kneeR: 2, shL: 40, shR: 40 },
  { rot: 90, ty: 2, hipL: { z: -88, y: -42 }, kneeL: 2, hipR: { z: -88, y: 42 }, kneeR: 2, shL: 44, shR: 44 },
  { dur: 3800, view: -40 });
def('widefold',
  { ty: STAND_Y + 2, hipL: { y: -28 }, hipR: { y: 28 }, hips: 96, waist: 18, shL: 38, shR: 38 },
  { ty: STAND_Y + 3, hipL: { y: -30 }, hipR: { y: 30 }, hips: 118, waist: 22, shL: 46, shR: 46 },
  { dur: 3400, view: -44 });

// ——— Stretch · back & spine ———
def('cobra',
  { rot: -90, ty: 12, head: -10, waist: -8, chest: -8, shL: 70, shR: 70, elL: -80, elR: -80 },
  { rot: -90, ty: 12, head: -22, waist: -26, chest: -22, shL: 55, shR: 55, elL: -20, elR: -20 },
  { dur: 3200 });
def('puppy',
  { ty: 20, hips: -108, waist: -6, head: 16, shL: 148, shR: 148, hipL: 102, hipR: 102, kneeL: 95, kneeR: 95 },
  { ty: 21, hips: -112, waist: -12, head: 20, shL: 154, shR: 154, hipL: 102, hipR: 102, kneeL: 95, kneeR: 95 },
  { dur: 3400 });
def('chestopen',
  { ty: 18, hips: -78, waist: -8, shL: 120, shR: 120, elL: -70, elR: -70, hipL: 78, hipR: 78, kneeL: 95, kneeR: 95, head: 10 },
  { ty: 19, hips: -84, waist: -14, shL: 126, shR: 126, elL: -70, elR: -70, hipL: 78, hipR: 78, kneeL: 95, kneeR: 95, head: 14 },
  { dur: 3400, props: ['box'] });
def('childside',
  { ty: 22, hips: -70, waist: 14, shL: 140, shR: 150, hipL: -130, hipR: -130, kneeL: 130, kneeR: 130, head: 8, chest: { y: 10 } },
  { ty: 22, hips: -72, waist: 16, shL: 146, shR: 156, hipL: -130, hipR: -130, kneeL: 130, kneeR: 130, head: 8, chest: { y: 26 } },
  { dur: 3400 });
def('twist',
  { rot: 90, ty: 4, hipL: { z: -70, y: 20 }, kneeL: 80, hipR: { z: -70, y: 20 }, kneeR: 80, shL: -70, shR: 70, waist: { y: 20 }, head: -10 },
  { rot: 90, ty: 4, hipL: { z: -70, y: 42 }, kneeL: 80, hipR: { z: -70, y: 42 }, kneeR: 80, shL: -74, shR: 74, waist: { y: 34 }, head: -14 },
  { dur: 3600, view: -38 });
def('bridge',
  { rot: 90, ty: 4, hipL: -60, kneeL: 70, hipR: -60, kneeR: 70, shL: 20, shR: 20 },
  { rot: 90, ty: 4, tx: 0, hips: -26, waist: -6, hipL: -34, kneeL: 72, hipR: -34, kneeR: 72, shL: 26, shR: 26 },
  { dur: 2800 });

// ——— Stretch · glutes ———
def('fig4',
  { rot: 90, ty: 4, hipL: -60, kneeL: 75, hipR: { z: -85, y: 60 }, kneeR: 85, shL: -30, shR: 20, head: -6 },
  { rot: 90, ty: 4, hipL: -75, kneeL: 75, hipR: { z: -98, y: 62 }, kneeR: 85, shL: -42, shR: 26, head: -8 },
  { dur: 3200, view: -34 });
vary('glutebridge', 'bridge', {}, {}, { dur: 2200 });
def('airplane',
  pose({ hips: 55, hipL: -30, kneeL: 12, hipR: 55, kneeR: 4, shL: { z: 30, y: -40 }, shR: { z: 30, y: 40 } }),
  pose({ hips: 55, hipL: -30, kneeL: 12, hipR: { z: 55, y: 30 }, kneeR: 4, shL: { z: 20, y: -55 }, shR: { z: 40, y: 55 }, waist: { y: 18 } }),
  { dur: 3200, view: -40 });

// ————————————————————— props —————————————————————

function addProps(fig, names, color, lineColor) {
  for (const name of names) {
    if (name === 'bar') {
      const BARY = -64;
      new Zdog.Shape({ addTo: fig.root, path: [{ x: -32 }, { x: 32 }], translate: { y: BARY }, stroke: 3.5, color: lineColor });
      new Zdog.Shape({ addTo: fig.root, path: [{ y: 0 }, { y: 22 }], translate: { x: -32, y: BARY }, stroke: 3, color: lineColor });
      new Zdog.Shape({ addTo: fig.root, path: [{ y: 0 }, { y: 22 }], translate: { x: 32, y: BARY }, stroke: 3, color: lineColor });
      // hanging figure: ground line sits far from hands; move ground reference up is overkill — bar drawn above figure
    } else if (name === 'barbell') {
      const grip = new Zdog.Anchor({ addTo: fig.elR, translate: { y: DIM.fore } });
      new Zdog.Shape({ addTo: grip, path: [{ z: -16 }, { z: 16 }], stroke: 3.5, color: lineColor });
      new Zdog.Shape({ addTo: grip, translate: { z: -16 }, stroke: 9, color: lineColor });
      new Zdog.Shape({ addTo: grip, translate: { z: 16 }, stroke: 9, color: lineColor });
    } else if (name === 'bench') {
      new Zdog.Rect({ addTo: fig.root, width: 58, height: 10, translate: { y: 15 }, stroke: 3, color: lineColor, fill: false });
    } else if (name === 'box') {
      new Zdog.Rect({ addTo: fig.root, width: 22, height: 18, translate: { x: 30, y: DIM.ground - 9 }, stroke: 3, color: lineColor, fill: false });
    } else if (name === 'wall') {
      new Zdog.Shape({ addTo: fig.root, path: [{ y: -DIM.ground - 8 }, { y: DIM.ground }], translate: { x: -40 }, stroke: 2.5, color: lineColor });
    } else if (name === 'wall-behind') {
      new Zdog.Shape({ addTo: fig.root, path: [{ y: -DIM.ground - 8 }, { y: DIM.ground }], translate: { x: 40 }, stroke: 2.5, color: lineColor });
    }
  }
}

// ————————————————————— manager —————————————————————

const registry = new Map(); // canvas → scene
let rafId = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function makeScene(canvas) {
  const animId = canvas.dataset.anim;
  const a = ANIMS[animId] || ANIMS.fold;
  const accent = cssVar('--fig', '#e8642c');
  const line = cssVar('--fig-line', '#c9c5bd');
  const illo = new Zdog.Illustration({ element: canvas, zoom: (canvas.width / 190) * (a.zoom || 1) });
  const fig = buildFigure(illo, accent, line, a.view ?? -28, a.noGround);
  addProps(fig, a.props, accent, line);
  return { illo, fig, a, t0: performance.now() + Math.random() * 1200, visible: false };
}

function ease(k, kind) {
  if (kind === 'saw') { const p = k % 1; return p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75; }
  return (1 - Math.cos((k % 1) * TAU)) / 2;
}

function renderScene(s, now) {
  const k = ((now - s.t0) / s.a.dur) % 1;
  if (s.a.tick) {
    applyPose(s.fig, samplePose(s.a.A, s.a.B, ease(k, s.a.ease)));
    s.a.tick(s.fig, k);
  } else {
    applyPose(s.fig, samplePose(s.a.A, s.a.B, ease(k, s.a.ease)));
  }
  s.illo.updateRenderGraph();
}

function loop(now) {
  rafId = null;
  let any = false;
  for (const s of registry.values()) {
    if (s.visible) { renderScene(s, now); any = true; }
  }
  if (any && !reduceMotion.matches) rafId = requestAnimationFrame(loop);
}

function kick() { if (rafId === null && !reduceMotion.matches) rafId = requestAnimationFrame(loop); }

const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    const s = registry.get(e.target);
    if (!s) continue;
    s.visible = e.isIntersecting;
  }
  kick();
}, { rootMargin: '60px' });

export function initFigures(container = document) {
  for (const canvas of container.querySelectorAll('canvas[data-anim]')) {
    if (registry.has(canvas)) continue;
    try {
      const s = makeScene(canvas);
      registry.set(canvas, s);
      io.observe(canvas);
      renderScene(s, s.t0 + s.a.dur * 0.55); // static frame immediately (covers reduced-motion)
    } catch (err) {
      console.warn('figure failed', canvas.dataset.anim, err);
    }
  }
  // drop scenes whose canvas left the DOM
  for (const [canvas, ] of registry) {
    if (!canvas.isConnected) { io.unobserve(canvas); registry.delete(canvas); }
  }
  kick();
}

reduceMotion.addEventListener?.('change', () => kick());

export const ANIM_IDS = Object.keys(ANIMS);
