// Pose spec per exercise id. Angles in degrees.
// torso: lean from vertical (+ = forward/right) · waist: extra bend
// sh/el: shoulder (0 = arm along torso, + = forward), elbow bend (+ = forward)
// hip/knee: thigh from straight-down (+ = forward), knee (− = anatomical flexion backward)
// suffix F/B = front/back limb; x/y shift hips (standing baseline y=5, floor at 46)
// rot rotates the whole figure (lying poses).

const STAND = { y: 5 };

// seated on a machine/bench: thighs forward, shins down
const SEAT = { y: 14, hip: 88, knee: -88 };
// seated on the floor, legs long
const FLOORSIT = { y: 25, hip: 88, knee: -4, ank: -60 };
// kneeling upright
const KNEEL = { y: 24, hip: 12, knee: -108, ank: -70 };
// on all fours (quadruped): torso horizontal, arms & thighs vertical
const QUAD = { y: 8, torso: 88, waist: 0, sh: 92, el: 0, hip: -88, knee: -92, headTilt: -20 };
// lying on back = draw standing-ish then rotate
const SUPINE = { rot: 90, y: -6, ry: 20 };

export const POSES = {
  // ═══════════ GYM · Série A ═══════════
  'pec-deck': { pose: { ...SEAT, sh: 88, el: 12, shB: 60, elB: 12 }, props: ['machine', 'cableHigh'] },
  'chest-press': { pose: { ...SEAT, sh: 95, el: 6, shB: 95, elB: 6 }, props: ['machine'] },
  'bench-press-flat': { pose: { torso: 90, y: 6, x: -6, sh: 90, el: 0, hip: -58, knee: -32, headTilt: 4 }, props: [['bench', 0], 'barbell'] },
  'bench-press-decline': { pose: { torso: 78, y: 8, x: -6, waist: 6, sh: 96, el: 0, hip: -95, knee: -20, headTilt: 6 }, props: [['bench', -12], 'barbell'] },
  'bench-press-incline': { pose: { torso: 102, y: 4, x: -8, waist: -6, sh: 84, el: 0, hip: -40, knee: -45, headTilt: -4 }, props: [['bench', 14], 'barbell'] },
  'triceps-pushdown': { pose: { ...STAND, torso: 8, sh: 10, el: 55, shB: 10, elB: 55 }, props: ['cableHigh'] },
  'triceps-pushdown-single': { pose: { ...STAND, torso: 8, sh: 12, el: 58, shB: -6, elB: -8 }, props: ['cableHigh'] },
  'leg-extension-cable': { pose: { ...STAND, x: -8, torso: -4, hipF: 55, kneeF: -10, hipB: 2, kneeB: -4, sh: -10 }, props: ['cableLow'] },
  'leg-extension-ankle': { pose: { ...SEAT, hipF: 85, kneeF: -12, sh: -20 }, props: ['machine'], extra: (k, u) => u.circle(k.legF.an, 4.5, u.EQ) },
  'leg-curl-lying': { pose: { rot: -88, y: -2, ry: 10, torso: 4, sh: 55, el: 30, hipF: -6, kneeF: -95, hipB: -6, kneeB: -30 }, props: [], extra: (k, u) => u.eqLine([{ x: k.hips.x - 20, y: k.hips.y + 9 }, { x: k.chest.x + 16, y: k.chest.y + 9 }], 4) },
  'leg-curl-standing': { pose: { ...STAND, torso: 10, sh: 35, el: 20, hipF: -4, kneeF: -100, hipB: 2 }, props: ['machine'] },
  'hip-abductor': { pose: { ...SEAT, hipF: 74, kneeF: -80, hipB: 100, kneeB: -92, sh: -14 }, props: ['machine'] },
  'hip-adductor': { pose: { ...SEAT, hipF: 96, kneeF: -90, hipB: 78, kneeB: -84, sh: -14 }, props: ['machine'] },
  'side-leg-raise': { pose: { ...STAND, torso: -4, hipF: 48, kneeF: -6, hipB: 0, sh: -16 }, props: [], extra: (k, u) => u.circle(k.legF.an, 4.5, u.EQ) },
  'inner-thigh-raise': { pose: { y: 28, torso: -80, headTilt: -8, sh: 40, el: 40, hipF: 140, kneeF: -90, hipB: 172, kneeB: -4 }, props: [], extra: (k, u) => u.circle(k.legB.an, 4.5, u.EQ) },
  'ab-machine': { pose: { ...SEAT, waist: 34, headTilt: 14, sh: 55, el: 65 }, props: ['machine'] },

  // ═══════════ GYM · Série B ═══════════
  'row-horizontal-machine': { pose: { ...SEAT, torso: -4, sh: 70, el: -55, shB: 70, elB: -55 }, props: ['machine', 'cableLow'] },
  'lat-pulldown-underhand': { pose: { ...SEAT, torso: -8, sh: 150, el: -35, shB: 155, elB: -30 }, props: ['pulldownBar'] },
  'seated-row-high': { pose: { ...SEAT, torso: -6, sh: 95, el: -70, shB: 95, elB: -70 }, props: ['machine', 'cableHigh'] },
  'seated-row-mid': { pose: { ...SEAT, torso: -4, sh: 75, el: -75, shB: 75, elB: -75 }, props: ['machine', 'cableLow'] },
  'seated-row-low': { pose: { ...SEAT, torso: 4, sh: 55, el: -70, shB: 55, elB: -70 }, props: ['machine', 'cableLow'] },
  'preacher-curl': { pose: { ...SEAT, sh: 55, el: 95, shB: 55, elB: 95 }, props: ['machine', 'dumbbellF'] },
  'cable-curl-single': { pose: { ...STAND, sh: 14, el: 105, shB: -8 }, props: ['cableLow'] },
  'leg-press-90': { pose: { rot: 14, ry: 10, torso: 96, waist: -18, y: 2, x: -14, sh: 20, hip: -145, knee: 108, ank: -12 }, props: ['sled'], extra: (k, u) => u.eqLine([{ x: k.hips.x - 16, y: k.hips.y + 10 }, { x: k.chest.x + 12, y: k.chest.y + 12 }], 4) },
  'leg-press-45': { pose: { rot: 0, torso: 118, waist: -14, y: 0, x: -14, sh: 16, hip: -150, knee: 95, ank: -10 }, props: ['sled'], extra: (k, u) => u.eqLine([{ x: k.hips.x - 14, y: k.hips.y + 12 }, { x: k.chest.x + 14, y: k.chest.y + 10 }], 4) },
  'leg-press-horizontal': { pose: { torso: -6, y: 14, x: -16, sh: 12, hip: 68, knee: -18, ank: -10 }, props: ['machine', 'sled'] },
  'calf-press': { pose: { torso: -6, y: 14, x: -16, sh: 12, hip: 62, knee: -6, ank: 26 }, props: ['machine', 'sled'] },
  'hip-raise-step': { pose: { ...STAND, x: -14, torso: 4, hipF: 62, kneeF: -68, hipB: 0, sh: -12 }, props: ['step'] },
  'hip-raise-ball': { pose: { y: 28, torso: -85, headTilt: -6, sh: 25, hipF: 130, kneeF: -85, hipB: 155, kneeB: -8 }, props: [], extra: (k, u) => `<circle cx="${u.fmt(k.legB.an.x)}" cy="${u.fmt(k.legB.an.y - 4)}" r="12" fill="none" stroke="${u.EQ}" stroke-width="3"/>` },

  // ═══════════ GYM · Nova Treino 1 ═══════════
  'smith-bench-press': { pose: { torso: 90, y: 6, x: -6, sh: 90, el: 0, hip: -58, knee: -32 }, props: [['bench', 0], 'barbell'], extra: (k, u) => u.eqLine([{ x: k.armF.hand.x + 20, y: -56 }, { x: k.armF.hand.x + 20, y: 44 }], 2.5) + u.eqLine([{ x: k.armF.hand.x - 20, y: -56 }, { x: k.armF.hand.x - 20, y: 44 }], 2.5) },
  'dumbbell-bench-press': { pose: { torso: 90, y: 6, x: -6, sh: 90, el: 0, shB: 84, elB: 0, hip: -58, knee: -32 }, props: [['bench', 0], 'dumbbells'] },
  'incline-dumbbell-fly': { pose: { torso: 104, y: 4, x: -8, waist: -6, sh: 60, el: 14, shB: 118, elB: -14, hip: -42, knee: -44 }, props: [['bench', 14], 'dumbbells'] },
  'crossover-single': { pose: { ...STAND, torso: 12, sh: 55, el: 18, shB: -10 }, props: ['cableHigh'] },
  'french-press-cable': { pose: { ...STAND, torso: 16, sh: 148, el: 65, shB: 148, elB: 65 }, props: ['cableLow'] },
  'french-press-single': { pose: { ...STAND, torso: 6, sh: 165, el: 70, shB: -8 }, props: [], extra: (k, u) => u.circle(k.armF.hand, 4, u.EQ) },
  'hip-thrust': { pose: { y: 16, torso: -100, waist: -6, headTilt: -10, sh: -25, hip: 148, knee: -60 }, props: [], extra: (k, u) => u.eqLine([{ x: k.chest.x - 16, y: k.chest.y + 10 }, { x: k.chest.x + 12, y: k.chest.y + 10 }], 4) + u.eqLine([{ x: k.chest.x - 4, y: k.chest.y + 10 }, { x: k.chest.x - 4, y: 46 }], 3) + u.eqLine([{ x: k.hips.x - 15, y: k.hips.y - 7 }, { x: k.hips.x + 15, y: k.hips.y - 7 }], 4) + u.circle({ x: k.hips.x - 15, y: k.hips.y - 7 }, 5, u.EQ) + u.circle({ x: k.hips.x + 15, y: k.hips.y - 7 }, 5, u.EQ) },
  'smith-lunge': { pose: { y: 12, torso: 4, hipF: 55, kneeF: -95, hipB: -42, kneeB: -55, ankB: 55, sh: 30, el: 60, shB: 30, elB: 60 }, props: ['barbell'], extra: (k, u) => u.eqLine([{ x: k.armF.hand.x + 20, y: -56 }, { x: k.armF.hand.x + 20, y: 44 }], 2.5) },
  'sumo-squat': { pose: { y: 16, torso: 10, hipF: 55, kneeF: -85, ankF: -18, hipB: 55, kneeB: -85, ankB: -18, sh: 65, el: 25, shB: 65, elB: 25 }, props: ['dumbbellF'] },
  'bulgarian-split-squat': { pose: { y: 14, torso: 12, hipF: 52, kneeF: -92, hipB: -35, kneeB: -85, ankB: -30, sh: 20, el: 30, shB: 20, elB: 30 }, props: ['box', 'dumbbells'] },
  'calf-raise': { pose: { ...STAND, y: 1, ankF: 34, ankB: 34, sh: -12 }, props: ['step'] },
  'calf-raise-single': { pose: { ...STAND, y: 1, ankF: 34, hipB: 4, kneeB: -55, sh: -12 }, props: ['step'] },
  'ab-iso-hold': { pose: { rot: -86, ry: 4, y: -4, torso: 2, waist: 4, sh: 78, el: -78, hip: -4, knee: -4, ank: 55, headTilt: -12 }, props: [] },
  'crunches': { pose: { y: 30, torso: -68, waist: -26, headTilt: -18, sh: 95, el: 20, hip: 118, knee: -100 }, props: [] },

  // ═══════════ GYM · Nova Treino 2 ═══════════
  'lat-machine': { pose: { ...SEAT, torso: -10, sh: 155, el: -40, shB: 158, elB: -35 }, props: ['pulldownBar'] },
  'lat-machine-single': { pose: { ...SEAT, torso: -6, sh: 152, el: -45, shB: -18 }, props: ['cableHigh'] },
  'v-bar-pulldown': { pose: { ...SEAT, torso: -14, sh: 140, el: -50, shB: 143, elB: -46 }, props: ['pulldownBar'] },
  'dumbbell-row-single': { pose: { torso: 68, y: 10, waist: 4, sh: 30, el: -75, shB: 95, elB: 0, hipF: -55, kneeF: -35, hipB: -88, kneeB: -88 }, props: [['bench', 0], 'dumbbellF'] },
  'rope-pulldown': { pose: { ...STAND, torso: 14, sh: 120, el: -45, shB: 120, elB: -45 }, props: ['cableHigh'] },
  'curl-21s': { pose: { ...STAND, sh: 6, el: 88, shB: 6, elB: 88 }, props: ['barbell'] },
  'concentration-curl': { pose: { ...SEAT, torso: 18, sh: 45, el: 95, shB: 20, elB: 10 }, props: [['bench', 0], 'dumbbellF'] },
  'leg-extension-iso': { pose: { ...SEAT, hipF: 86, kneeF: -8, hipB: 86, kneeB: -8, sh: -20 }, props: ['machine'] },
  'leg-extension-both': { pose: { ...SEAT, hipF: 86, kneeF: -14, hipB: 86, kneeB: -14, sh: -20 }, props: ['machine'] },
  'leg-extension-single': { pose: { ...SEAT, hipF: 86, kneeF: -10, hipB: 88, kneeB: -88, sh: -20 }, props: ['machine'] },
  'leg-curl-lying-single': { pose: { rot: -88, y: -2, ry: 10, torso: 4, sh: 55, el: 30, hipF: -6, kneeF: -100, hipB: -6, kneeB: -12 }, props: [], extra: (k, u) => u.eqLine([{ x: k.hips.x - 20, y: k.hips.y + 9 }, { x: k.chest.x + 16, y: k.chest.y + 9 }], 4) },
  'hip-abductor-iso': { pose: { ...SEAT, hipF: 72, kneeF: -78, hipB: 102, kneeB: -94, sh: -14 }, props: ['machine'] },
  'hip-adductor-iso': { pose: { ...SEAT, hipF: 98, kneeF: -92, hipB: 76, kneeB: -82, sh: -14 }, props: ['machine'] },
  'back-extension': { pose: { torso: 55, y: 4, x: -4, waist: 10, sh: 55, el: 70, shB: 55, elB: 70, hip: -60, knee: -6 }, props: [], extra: (k, u) => u.eqLine([{ x: k.hips.x - 6, y: k.hips.y + 8 }, { x: k.hips.x + 22, y: k.hips.y + 2 }], 4) + u.eqLine([{ x: k.hips.x + 6, y: k.hips.y + 8 }, { x: k.hips.x + 6, y: 46 }], 3) },

  // ═══════════ PUSH-UPS ═══════════
  'push-up': { pose: { rot: -86, ry: 4, y: -2, torso: 2, sh: 85, el: -25, hip: -3, knee: -3, ank: 55, headTilt: -10 }, props: [] },
  'wide-push-up': { pose: { rot: -86, ry: 4, y: -2, torso: 2, sh: 72, el: -55, shB: 100, elB: -30, hip: -3, knee: -3, ank: 55, headTilt: -10 }, props: [] },
  'diamond-push-up': { pose: { rot: -86, ry: 4, y: -2, torso: 2, sh: 92, el: -12, shB: 92, elB: -12, hip: -3, knee: -3, ank: 55, headTilt: -10 }, props: [] },
  'incline-push-up': { pose: { rot: -55, ry: 6, y: -6, x: -8, torso: 2, sh: 85, el: -18, hip: -3, knee: -3, ank: 55, headTilt: -8 }, props: ['box'], groundAfterRot: true },
  'knee-push-up': { pose: { rot: -80, ry: 4, y: 0, torso: 2, sh: 85, el: -30, hip: -4, knee: -78, headTilt: -10 }, props: [] },

  // ═══════════ PULL-UPS ═══════════
  'pull-up': { pose: { y: -6, torso: -4, sh: 168, el: -35, shB: 172, elB: -30, hip: 8, knee: -55, headTilt: -6 }, props: ['pullupBar'], ground: false },
  'chin-up': { pose: { y: -14, torso: -8, waist: -4, sh: 160, el: -70, shB: 164, elB: -65, hip: 10, knee: -40 }, props: ['pullupBar'], ground: false },
  'negative-pull-up': { pose: { y: -2, torso: -2, sh: 172, el: -30, shB: 175, elB: -26, hip: 6, knee: -28 }, props: ['pullupBar'], ground: false },
  'scapular-pull': { pose: { y: 4, torso: 0, sh: 176, el: -4, shB: 178, elB: -2, hip: 4, knee: -18 }, props: ['pullupBar'], ground: false },
  'dead-hang': { pose: { y: -2, torso: 2, sh: 177, el: -2, shB: 179, elB: 0, hip: 2, knee: -10 }, props: ['pullupBar'], ground: false },

  // ═══════════ STRETCHING · warm-up ═══════════
  'neck-rolls': { pose: { ...STAND, headTilt: 38, sh: 6, shB: -6 }, props: [] },
  'cat-cow': { pose: { ...QUAD, waist: 30, headTilt: -12 }, props: [] },
  'thoracic-rotation': { pose: { ...QUAD, shF: -55, elF: -20, headTilt: -35 }, props: [] },
  'hip-cars': { pose: { ...STAND, hipF: 62, kneeF: -85, sh: -14, shB: 14 }, props: [] },
  'deep-squat-hold': { pose: { y: 26, torso: 18, hip: 128, knee: -132, ank: 25, sh: 68, el: 28, shB: 68, elB: 28 }, props: [] },
  'down-dog-flow': { pose: { y: -10, x: 6, torso: 128, waist: 4, sh: 42, el: 0, hip: -152, knee: 6, ank: 20, headTilt: 14 }, props: [] },

  // ═══════════ STRETCHING · feet & ankles ═══════════
  'ankle-cars': { pose: { ...FLOORSIT, torso: 4, hipF: 80, kneeF: -10, ankF: 35, sh: -30, el: -5 }, props: [] },
  'ankle-rocks': { pose: { y: 18, torso: 14, hipF: 62, kneeF: -108, ankF: -14, hipB: -18, kneeB: -95, ankB: -60, sh: 45, el: 20 }, props: [] },
  'calf-stretch': { pose: { ...STAND, torso: 24, sh: 78, el: 6, shB: 78, elB: 6, hipF: 32, kneeF: -28, hipB: -28, kneeB: -2, ankB: 12 }, props: ['wallR'] },
  'soleus-stretch': { pose: { ...STAND, torso: 20, sh: 74, el: 10, shB: 74, elB: 10, hipF: 34, kneeF: -35, hipB: -20, kneeB: -35, ankB: 8 }, props: ['wallR'] },
  'foot-doming': { pose: { ...SEAT, y: 15, torso: 12, sh: 35, el: 25, headTilt: 14 }, props: ['stool'], extra: (k, u) => u.eqLine([{ x: k.legF.an.x - 2, y: 42 }, { x: k.legF.an.x + 10, y: 42 }], 2.5) },
  'point-flex': { pose: { ...FLOORSIT, ankF: 55, ankB: -45, sh: -25 }, props: [] },
  'releve-holds': { pose: { ...STAND, y: 0, ankF: 42, ankB: 42, sh: -10, shB: 10 }, props: [] },
  'toe-stretch-kneel': { pose: { ...KNEEL, y: 27, hip: 20, knee: -125, ank: -95, torso: 6, sh: 10 }, props: [] },
  'arch-pointe-stretch': { pose: { ...KNEEL, y: 26, hip: 16, knee: -120, ank: -25, torso: 10, sh: 12 }, props: [] },

  // ═══════════ STRETCHING · psoas & hip flexors ═══════════
  'psoas-march': { pose: { ...STAND, hipF: 85, kneeF: -85, sh: -20, shB: 20 }, props: [] },
  'low-lunge': { pose: { y: 16, torso: -6, hipF: 62, kneeF: -95, hipB: -35, kneeB: -88, ankB: -30, sh: -14, shB: 14 }, props: [] },
  'couch-stretch': { pose: { y: 16, torso: -10, hipF: 60, kneeF: -92, hipB: -30, kneeB: -125, sh: -18, shB: 18 }, props: ['wallR'] },
  'lizard': { pose: { y: 20, torso: 42, waist: 8, hipF: 74, kneeF: -105, hipB: -38, kneeB: -18, ankB: 45, sh: 95, el: 0 }, props: [] },
  'constructive-rest': { pose: { y: 30, torso: -85, headTilt: -6, sh: 30, hip: 130, knee: -105 }, props: [] },
  'standing-hip-ext': { pose: { ...STAND, torso: 8, hipB: -38, kneeB: -6, sh: 55, el: 10, shB: 55, elB: 10 }, props: [] },

  // ═══════════ STRETCHING · hamstrings ═══════════
  'elephant-walks': { pose: { y: 9, torso: 118, waist: 14, sh: 45, el: 0, hipF: -118, kneeF: 24, hipB: -122, kneeB: 2, headTilt: 10 }, props: [] },
  'forward-fold': { pose: { y: 7, torso: 132, waist: 18, sh: 42, el: 4, hip: -136, knee: 4, headTilt: 8 }, props: [] },
  'single-leg-hamstring': { pose: { y: 30, torso: -85, headTilt: -6, shF: 120, elF: 0, shB: 30, hipF: 262, kneeF: -6, hipB: 100, kneeB: -15 }, props: [] },
  'hinge-fold': { pose: { y: 8, torso: 82, waist: 2, sh: 70, el: 0, hip: -86, knee: -10 }, props: [] },
  'half-split': { pose: { y: 20, torso: 46, waist: 10, hipF: 34, kneeF: -4, ankF: -40, hipB: -20, kneeB: -115, sh: 88, el: 0 }, props: [] },
  'hurdler': { pose: { ...FLOORSIT, torso: 40, waist: 12, hipF: -120, kneeF: -4, ankF: 40, hipB: -50, kneeB: -128, sh: -140, el: 0, shB: -140, elB: 0 }, props: [] },
  'rolldown': { pose: { y: 6, torso: 55, waist: 35, headTilt: 25, sh: 35, el: 4, knee: -8 }, props: [] },

  // ═══════════ STRETCHING · front split ═══════════
  'lunge-pulses': { pose: { y: 18, torso: 2, hipF: 66, kneeF: -98, hipB: -40, kneeB: -60, ankB: -35, sh: -16, shB: 16 }, props: [] },
  'lunge-halfsplit-flow': { pose: { y: 19, torso: 24, hipF: 45, kneeF: -60, hipB: -32, kneeB: -95, ankB: -40, sh: 55, el: 8 }, props: [] },
  'pigeon': { pose: { y: 23, torso: 26, waist: 10, hipF: 82, kneeF: -125, hipB: -42, kneeB: -12, ankB: 55, sh: 62, el: 0 }, props: [] },
  'standing-quad': { pose: { ...STAND, torso: 4, hipB: -12, kneeB: -128, shB: 42, elB: 65, sh: -55, el: -10 }, props: [] },
  'front-split': { pose: { y: 27, torso: 2, hipF: 82, kneeF: -4, ankF: -45, hipB: -80, kneeB: -4, ankB: 40, sh: -35, shB: 35, el: -10, elB: 10 }, props: [] },
  'split-pnf': { pose: { y: 25, torso: 8, hipF: 78, kneeF: -8, ankF: -45, hipB: -74, kneeB: -8, ankB: 40, sh: 62, el: 6, shB: 62, elB: 6 }, props: [] },

  // ═══════════ STRETCHING · pancake & middle split ═══════════
  'butterfly': { pose: { ...FLOORSIT, torso: 16, hipF: 62, kneeF: -128, ankF: -30, hipB: 62, kneeB: -128, ankB: -30, sh: 42, el: 30 }, props: [] },
  'ninety-ninety': { pose: { ...FLOORSIT, torso: 24, hipF: 85, kneeF: -92, hipB: 12, kneeB: -95, sh: 60, el: 0 }, props: [] },
  'frog-rocks': { pose: { ...QUAD, y: 14, hip: -55, knee: -95, waist: 6 }, props: [] },
  'frog-hold': { pose: { ...QUAD, y: 16, torso: 80, hip: -48, knee: -100, sh: 105, el: -40, waist: 8 }, props: [] },
  'horse-stance': { pose: { y: 18, torso: 4, hipF: 48, kneeF: -85, ankF: -12, hipB: 48, kneeB: -85, ankB: -12, sh: 55, el: 55, shB: 55, elB: 55 }, props: [] },
  'straddle-side-reach': { pose: { ...FLOORSIT, torso: 42, waist: 14, hipF: -122, kneeF: -4, ankF: 40, hipB: -77, kneeB: -6, ankB: 35, sh: -162, el: 0, shB: -102, elB: 0 }, props: [] },
  'straddle-center': { pose: { ...FLOORSIT, torso: 52, waist: 12, hipF: -132, kneeF: -4, ankF: 40, hipB: -87, kneeB: -6, ankB: 35, sh: -152, el: 0, shB: -152, elB: 0 }, props: [] },
  'pancake-fold': { pose: { ...FLOORSIT, torso: 74, waist: 14, hipF: -154, kneeF: -4, ankF: 40, hipB: -109, kneeB: -6, ankB: 35, sh: -174, el: 0, shB: -174, elB: 0 }, props: [] },
  'cossack': { pose: { y: 22, torso: 14, hipF: 95, kneeF: -128, ankF: 20, hipB: 62, kneeB: -4, ankB: -55, sh: 72, el: 8, shB: 72, elB: 8 }, props: [] },
  'wall-straddle': { pose: { y: 30, x: 4, torso: -85, headTilt: -6, sh: 55, shB: -55, hipF: 253, kneeF: -4, hipB: 277, kneeB: -4 }, props: [], extra: (k, u) => u.eqLine([{ x: k.legF.toe.x + 8, y: -52 }, { x: k.legF.toe.x + 8, y: 46 }], 3) },
  'wide-leg-fold': { pose: { y: 9, torso: 100, waist: 14, sh: 35, el: 2, hipF: -80, kneeF: -2, hipB: -128, kneeB: -2, headTilt: 8 }, props: [] },

  // ═══════════ STRETCHING · back & spine ═══════════
  'sphinx-cobra': { pose: { rot: -90, ry: 2, y: -6, torso: 0, waist: -34, headTilt: -18, sh: 55, el: -35, hip: -4, knee: -4, ank: 55 }, props: [] },
  'puppy-pose': { pose: { y: 22, torso: 115, waist: -14, headTilt: -6, sh: -30, el: 0, hip: -115, knee: -90, ank: -90 }, props: [] },
  'chest-opener': { pose: { ...KNEEL, torso: 42, waist: -14, sh: 135, el: -35, headTilt: -8 }, props: ['box'] },
  'childs-side-reach': { pose: { y: 25, torso: 82, waist: 10, sh: 155, el: 0, shB: 140, elB: 0, hip: -25, knee: -125, ank: -60, headTilt: 6 }, props: [] },
  'supine-twist': { pose: { y: 30, torso: -88, headTilt: -6, shF: 85, elF: 0, shB: -80, elB: 0, hipF: 160, kneeF: -100, hipB: 152, kneeB: -95 }, props: [] },
  'bridge-hold': { pose: { y: 10, torso: -118, waist: -6, headTilt: -12, sh: -25, hip: 153, knee: -35 }, props: [] },

  // ═══════════ STRETCHING · glutes ═══════════
  'figure-four': { pose: { y: 30, torso: -85, headTilt: -6, sh: 45, hipF: 125, kneeF: -95, hipB: 150, kneeB: -50 }, props: [] },
  'glute-bridge': { pose: { y: 13, torso: -112, waist: -4, headTilt: -12, sh: -22, hip: 148, knee: -40 }, props: [] },
  'hip-airplane': { pose: { y: 8, torso: 72, waist: 4, sh: 120, el: 0, shB: 25, elB: 0, hipF: -74, kneeF: -8, hipB: -165, kneeB: -5 }, props: [] },
};
