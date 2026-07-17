// Fixed exercise catalog. Every exercise ships with its own generated figure
// (img/<id>.svg) — there is deliberately no way to create exercises in the app.

import { GENERATED } from './gen-manifest.js';
// mode: 'reps' or 'time' (seconds). weight: kg (gym program). side: done per side.
// Gym exercises come from Gabriel's real program (Portuguese names kept in `pt`).

export const CATS = {
  gym: 'Gym',
  stretch: 'Stretching',
  cal: 'Calisthenics',
};

// Eight ~1 h sessions: each original 2 h series was split at its natural
// upper-body / lower-body boundary (A+B were "Série A", C+D "Série B",
// E+F "Nova Treino 1", G+H "Nova Treino 2").
export const GYM_GROUPS = {
  a: 'Série A',
  b: 'Série B',
  c: 'Série C',
  d: 'Série D',
  e: 'Série E',
  f: 'Série F',
  g: 'Série G',
  h: 'Série H',
};

// Stretch groups mirror the Corpo routine blocks.
export const STRETCH_GROUPS = {
  warm: 'Warm-up',
  feet: 'Feet & Ankles',
  psoas: 'Psoas & Hip Flexors',
  hams: 'Hamstrings',
  split: 'Front Split',
  pancake: 'Pancake & Middle Split',
  back: 'Back & Spine',
  glutes: 'Glutes',
};

export const EXERCISES = [
  // ═══════════════ GYM · Série A — chest & triceps ═══════════════
  { id: 'pec-deck',                cat: 'gym', group: 'a', name: 'Pec Deck Fly',                 pt: 'Peitoral Dorsal',           weight: 40,  mode: 'reps', target: 30 },
  { id: 'chest-press',             cat: 'gym', group: 'a', name: 'Chest Press Machine',          pt: 'Chest Press',               weight: 50,  mode: 'reps', target: 30 },
  { id: 'bench-press-flat',        cat: 'gym', group: 'a', name: 'Flat Bench Press',             pt: 'Supino Reto',               weight: 28,  mode: 'reps', target: 30 },
  { id: 'bench-press-decline',     cat: 'gym', group: 'a', name: 'Decline Bench Press',          pt: 'Supino Declinado',          weight: 28,  mode: 'reps', target: 30 },
  { id: 'bench-press-incline',     cat: 'gym', group: 'a', name: 'Incline Bench Press',          pt: 'Supino Inclinado',          weight: 28,  mode: 'reps', target: 30 },
  { id: 'triceps-pushdown',        cat: 'gym', group: 'a', name: 'Triceps Pushdown',             pt: 'Tríceps Juntado Cross',     weight: 35,  mode: 'reps', target: 30 },
  { id: 'triceps-pushdown-single', cat: 'gym', group: 'a', name: 'Single-arm Pushdown',          pt: 'Tríceps Unilateral Cross',  weight: 15,  mode: 'reps', target: 30, side: true },

  // ═══════════════ GYM · Série B — legs & core ═══════════════
  { id: 'leg-extension-cable',     cat: 'gym', group: 'b', name: 'Cable Leg Extension',          pt: 'Extensor Cross',            weight: 25,  mode: 'reps', target: 30, side: true },
  { id: 'leg-extension-ankle',     cat: 'gym', group: 'b', name: 'Ankle-weight Extension',       pt: 'Extensor Caneleira',        weight: 7,   mode: 'reps', target: 30, side: true },
  { id: 'leg-curl-lying',          cat: 'gym', group: 'b', name: 'Lying Leg Curl',               pt: 'Flexor Deitado',            weight: 40,  mode: 'reps', target: 30 },
  { id: 'leg-curl-standing',       cat: 'gym', group: 'b', name: 'Standing Leg Curl',            pt: 'Flexor em Pé',              weight: 20,  mode: 'reps', target: 30, side: true },
  { id: 'hip-abductor',            cat: 'gym', group: 'b', name: 'Hip Abductor Machine',         pt: 'Abdutor',                   weight: 75,  mode: 'reps', target: 30 },
  { id: 'hip-adductor',            cat: 'gym', group: 'b', name: 'Hip Adductor Machine',         pt: 'Adutor',                    weight: 75,  mode: 'reps', target: 30 },
  { id: 'side-leg-raise',          cat: 'gym', group: 'b', name: 'Ankle-weight Side Raise',      pt: 'Abdutor Caneleira',         weight: 7,   mode: 'reps', target: 30, side: true },
  { id: 'inner-thigh-raise',       cat: 'gym', group: 'b', name: 'Ankle-weight Inner Raise',     pt: 'Adutor Caneleira',          weight: 7,   mode: 'reps', target: 30, side: true },
  { id: 'ab-machine',              cat: 'gym', group: 'b', name: 'Ab Crunch Machine',            pt: 'Abdominal Máquina Bola',    weight: 70,  mode: 'reps', target: 30 },

  // ═══════════════ GYM · Série C — back & biceps ═══════════════
  { id: 'row-horizontal-machine',  cat: 'gym', group: 'c', name: 'Horizontal Pull Machine',      pt: 'Puxador Horizontal',        weight: 40,  mode: 'reps', target: 30 },
  { id: 'lat-pulldown-underhand',  cat: 'gym', group: 'c', name: 'Underhand Lat Pulldown',       pt: 'Puxador Vertical Supinada', weight: 40,  mode: 'reps', target: 30 },
  { id: 'seated-row-high',         cat: 'gym', group: 'c', name: 'Seated Row · High',            pt: 'Remada Sentado Cima',       weight: 40,  mode: 'reps', target: 30 },
  { id: 'seated-row-mid',          cat: 'gym', group: 'c', name: 'Seated Row · Mid',             pt: 'Remada Sentado Médio',      weight: 40,  mode: 'reps', target: 30 },
  { id: 'seated-row-low',          cat: 'gym', group: 'c', name: 'Seated Row · Low',             pt: 'Remada Sentado Baixo',      weight: 40,  mode: 'reps', target: 30 },
  { id: 'preacher-curl',           cat: 'gym', group: 'c', name: 'Preacher Curl',                pt: 'Rosca Scott',               weight: 20,  mode: 'reps', target: 30 },
  { id: 'cable-curl-single',       cat: 'gym', group: 'c', name: 'Single-arm Cable Curl',        pt: 'Rosca Unilateral Cross',    weight: 10,  mode: 'reps', target: 30, side: true },

  // ═══════════════ GYM · Série D — legs & glutes ═══════════════
  { id: 'leg-press-90',            cat: 'gym', group: 'd', name: 'Leg Press 90°',                pt: 'Legpress 90',               weight: 90,  mode: 'reps', target: 30 },
  { id: 'leg-press-45',            cat: 'gym', group: 'd', name: 'Leg Press 45°',                pt: 'Legpress 45',               weight: 160, mode: 'reps', target: 30 },
  { id: 'leg-press-horizontal',    cat: 'gym', group: 'd', name: 'Horizontal Leg Press',         pt: 'Legpress Horizontal',       weight: 140, mode: 'reps', target: 30 },
  { id: 'calf-press',              cat: 'gym', group: 'd', name: 'Calf Press on Leg Press',      pt: 'Panturrilha Legpress',      weight: 130, mode: 'reps', target: 30 },
  { id: 'hip-raise-step',          cat: 'gym', group: 'd', name: 'Hip Raise on Step',            pt: 'Elevação Quadril Step',     weight: 10,  mode: 'reps', target: 30, side: true },
  { id: 'hip-raise-ball',          cat: 'gym', group: 'd', name: 'Single-leg Hip Raise (Ball)',  pt: 'Elevação Quadril Bola P.E/P.D', weight: 0, mode: 'reps', target: 30, side: true },

  // ═══════════════ GYM · Série E — chest & triceps (nova) ═══════════════
  { id: 'smith-bench-press',       cat: 'gym', group: 'e', name: 'Smith Machine Bench Press',   pt: 'Supino Barra Guiada',       weight: 30,  mode: 'reps', target: 30 },
  { id: 'dumbbell-bench-press',    cat: 'gym', group: 'e', name: 'Dumbbell Bench Press',        pt: 'Supino Dumbbell',           weight: 28,  mode: 'reps', target: 30 },
  { id: 'incline-dumbbell-fly',    cat: 'gym', group: 'e', name: 'Incline Dumbbell Fly',        pt: 'Crucifixo Inclinado Halteres', weight: 20, mode: 'reps', target: 30 },
  { id: 'crossover-single',        cat: 'gym', group: 'e', name: 'Single-arm Cable Crossover',  pt: 'Crossover Unilateral',      weight: 5,   mode: 'reps', target: 30, side: true },
  { id: 'french-press-cable',      cat: 'gym', group: 'e', name: 'Cable French Press',          pt: 'Tríceps Francês Cross Supinado', weight: 40, mode: 'reps', target: 30 },
  { id: 'french-press-single',     cat: 'gym', group: 'e', name: 'Single-arm French Press',     pt: 'Tríceps Francês Unilateral', weight: 20, mode: 'reps', target: 30, side: true },

  // ═══════════════ GYM · Série F — legs & abs (nova) ═══════════════
  { id: 'hip-thrust',              cat: 'gym', group: 'f', name: 'Hip Thrust',                  pt: 'Elevação Pélvica',          weight: 100, mode: 'reps', target: 30 },
  { id: 'smith-lunge',             cat: 'gym', group: 'f', name: 'Smith Machine Lunge',         pt: 'Avanço Barra Guiada',       weight: 36,  mode: 'reps', target: 30, side: true },
  { id: 'sumo-squat',              cat: 'gym', group: 'f', name: 'Sumo Squat',                  pt: 'Sumô',                      weight: 24,  mode: 'reps', target: 30 },
  { id: 'bulgarian-split-squat',   cat: 'gym', group: 'f', name: 'Bulgarian Split Squat',       pt: 'Agachamento Búlgaro',       weight: 0,   mode: 'reps', target: 30, side: true },
  { id: 'calf-raise',              cat: 'gym', group: 'f', name: 'Calf Raise',                  pt: 'Panturrilha',               weight: 0,   mode: 'reps', target: 30 },
  { id: 'calf-raise-single',       cat: 'gym', group: 'f', name: 'Single-leg Calf Raise',       pt: 'Panturrilha Unilateral',    weight: 0,   mode: 'reps', target: 30, side: true },
  { id: 'ab-iso-hold',             cat: 'gym', group: 'f', name: 'Plank Hold',                  pt: 'Abdominal Isometria',       weight: 0,   mode: 'time', target: 60 },
  { id: 'crunches',                cat: 'gym', group: 'f', name: 'Crunches',                    pt: 'Abdominal',                 weight: 0,   mode: 'reps', target: 30 },

  // ═══════════════ GYM · Série G — back & biceps (nova) ═══════════════
  { id: 'lat-machine',             cat: 'gym', group: 'g', name: 'Lat Pulldown Machine',        pt: 'Dorsal',                    weight: 35,  mode: 'reps', target: 30 },
  { id: 'lat-machine-single',      cat: 'gym', group: 'g', name: 'Single-arm Lat Pulldown',     pt: 'Dorsal Unilateral',         weight: 35,  mode: 'reps', target: 30, side: true },
  { id: 'v-bar-pulldown',          cat: 'gym', group: 'g', name: 'V-bar Lat Pulldown',          pt: 'Puxada Vertical Triângulo', weight: 45,  mode: 'reps', target: 30 },
  { id: 'dumbbell-row-single',     cat: 'gym', group: 'g', name: 'Single-arm Dumbbell Row',     pt: 'Remada Unilateral Dumbbell', weight: 14, mode: 'reps', target: 30, side: true },
  { id: 'rope-pulldown',           cat: 'gym', group: 'g', name: 'Rope Pulldown',               pt: 'Puxada Corda Cross',        weight: 55,  mode: 'reps', target: 30 },
  { id: 'curl-21s',                cat: 'gym', group: 'g', name: 'Biceps Curl · 21s',           pt: 'Rosca 21',                  weight: 16,  mode: 'reps', target: 30 },
  { id: 'concentration-curl',      cat: 'gym', group: 'g', name: 'Concentration Curl',          pt: 'Rosca Concentrada',         weight: 9,   mode: 'reps', target: 30, side: true },

  // ═══════════════ GYM · Série H — legs & lower back (nova) ═══════════════
  { id: 'leg-extension-iso',       cat: 'gym', group: 'h', name: 'Leg Extension · Iso Hold',    pt: 'Extensor Isometria',        weight: 70,  mode: 'time', target: 60 },
  { id: 'leg-extension-both',      cat: 'gym', group: 'h', name: 'Leg Extension · Both',        pt: 'Extensor Junto',            weight: 70,  mode: 'reps', target: 30 },
  { id: 'leg-extension-single',    cat: 'gym', group: 'h', name: 'Leg Extension · Single',      pt: 'Extensor Unilateral',       weight: 35,  mode: 'reps', target: 30, side: true },
  { id: 'leg-curl-lying-single',   cat: 'gym', group: 'h', name: 'Single-leg Lying Curl',       pt: 'Flexor Unilateral Deitado', weight: 20,  mode: 'reps', target: 30, side: true },
  { id: 'hip-abductor-iso',        cat: 'gym', group: 'h', name: 'Hip Abductor 45° · Iso',      pt: 'Abdutor 45 / Isometria',    weight: 75,  mode: 'time', target: 60 },
  { id: 'hip-adductor-iso',        cat: 'gym', group: 'h', name: 'Hip Adductor 45° · Iso',      pt: 'Adutor 45 / Isometria',     weight: 70,  mode: 'time', target: 60 },
  { id: 'back-extension',          cat: 'gym', group: 'h', name: 'Back Extension',              pt: 'Flexão Lombar',             weight: 0,   mode: 'reps', target: 30 },

  // ═══════════════ PUSH & PULL-UPS ═══════════════
  { id: 'push-up',         cat: 'cal',  name: 'Push-up',         mode: 'reps', target: 10, cue: 'One straight line, chest to the floor' },
  { id: 'wide-push-up',    cat: 'cal',  name: 'Wide Push-up',    mode: 'reps', target: 10, cue: 'Hands wide, elbows at 45°' },
  { id: 'diamond-push-up', cat: 'cal',  name: 'Diamond Push-up', mode: 'reps', target: 10,  cue: 'Hands together under the chest' },
  { id: 'incline-push-up', cat: 'cal',  name: 'Incline Push-up', mode: 'reps', target: 10, cue: 'Hands elevated, body still a plank' },
  { id: 'knee-push-up',    cat: 'cal',  name: 'Knee Push-up',    mode: 'reps', target: 10, cue: 'Hips forward, line from knees to head' },

  { id: 'pull-up',          cat: 'cal',  name: 'Pull-up',          mode: 'reps', target: 10,  cue: 'Chest to bar, full hang between reps' },
  { id: 'chin-up',          cat: 'cal',  name: 'Chin-up',          mode: 'reps', target: 10,  cue: 'Palms toward you, lead with the chest' },
  { id: 'negative-pull-up', cat: 'cal',  name: 'Negative Pull-up', mode: 'reps', target: 10,  cue: 'Jump up, lower for 5 slow counts' },
  { id: 'scapular-pull',    cat: 'cal',  name: 'Scapular Pull',    mode: 'reps', target: 10,  cue: 'Arms straight, shrug the shoulders down' },
  { id: 'dead-hang',        cat: 'cal',  name: 'Dead Hang',        mode: 'time', target: 30, cue: 'Relax into the hang, breathe' },

  // ═══════════════ STRETCHING · Warm-up ═══════════════
  { id: 'leg-swings',        cat: 'stretch', group: 'warm', name: 'Leg Swings',        mode: 'time', target: 60, cue: 'Front-to-back swings, tall posture, hips square — bigger each rep; switch legs halfway' },
  { id: 'cat-cow',           cat: 'stretch', group: 'warm', name: 'Cat–Cow',           mode: 'time', target: 60, cue: 'Move with the breath — inhale arch and look up, exhale round and press the floor away' },
  { id: 'thoracic-rotation', cat: 'stretch', group: 'warm', name: 'Thoracic Rotation', mode: 'time', target: 60, side: true, cue: 'All fours, hand behind head — open to the ceiling and follow the elbow with your eyes' },
  { id: 'hip-cars',          cat: 'stretch', group: 'warm', name: 'Hip CARs',          mode: 'time', target: 60, side: true, cue: 'Biggest pain-free knee circle at the hip, torso braced still — slow beats big' },
  { id: 'deep-squat-hold',   cat: 'stretch', group: 'warm', name: 'Deep Squat Hold',   mode: 'time', target: 60, cue: 'Heels down, knees out over the toes, chest tall — hold onto a support rather than round or tip back' },
  { id: 'down-dog-flow',     cat: 'stretch', group: 'warm', name: 'Down Dog → Walk',   mode: 'time', target: 60, cue: 'Pedal the heels, press the chest toward the thighs, then walk the hands back to a fold' },

  // ═══════════════ STRETCHING · Feet & ankles (ballet) ═══════════════
  { id: 'ankle-cars',          cat: 'stretch', group: 'feet', name: 'Ankle Circles',        mode: 'time', target: 60, side: true, cue: 'Slow maximum circles both directions — only the ankle moves, toes stay relaxed' },
  { id: 'ankle-rocks',         cat: 'stretch', group: 'feet', name: 'Knee-over-toe Rocks',  mode: 'time', target: 60, side: true, cue: 'Half-kneel, drive the knee past the toes with the heel glued down — pause 5 s at end range' },
  { id: 'calf-stretch',        cat: 'stretch', group: 'feet', name: 'Wall Calf Stretch',    mode: 'time', target: 60, side: true, cue: 'Back leg straight, heel rooted, hips square — lean in until the calf pulls, then breathe' },
  { id: 'soleus-stretch',      cat: 'stretch', group: 'feet', name: 'Soleus Stretch',       mode: 'time', target: 60, side: true, cue: 'Same wall shape with the back knee bent — the pull drops low, near the achilles' },
  { id: 'foot-doming',         cat: 'stretch', group: 'feet', name: 'Foot Doming',          mode: 'time', target: 60, cue: 'Short foot: pull the big-toe knuckle toward the heel so the arch lifts — toes long, not curled' },
  { id: 'point-flex',          cat: 'stretch', group: 'feet', name: 'Point & Flex',         mode: 'time', target: 60, cue: 'Articulate slowly — flex, roll through demi-pointe, then full point, and reverse the same way' },
  { id: 'releve-holds',        cat: 'stretch', group: 'feet', name: 'Relevé Holds',         mode: 'time', target: 60, cue: 'Rise to high demi-pointe over the first two toes, ankles stacked — hold without wobbling' },
  { id: 'toe-stretch-kneel',   cat: 'stretch', group: 'feet', name: 'Kneeling Toe Stretch', mode: 'time', target: 60, cue: 'Kneel with the toes tucked and sit back — build toward two comfortable minutes; ease off if it burns' },
  { id: 'arch-pointe-stretch', cat: 'stretch', group: 'feet', name: 'Arch & Pointe Stretch', mode: 'time', target: 60, cue: 'Top of the foot on the floor, press the arch forward over the toes — no pinching in the ankle' },

  // ═══════════════ STRETCHING · Psoas & hip flexors ═══════════════
  { id: 'psoas-march',      cat: 'stretch', group: 'psoas', name: 'Psoas March',            mode: 'time', target: 60, cue: 'Stand tall and drive the knee up — suck the thigh into the pelvis, pelvis level, lower slowly with control' },
  { id: 'low-lunge',        cat: 'stretch', group: 'psoas', name: 'Low Lunge',              mode: 'time', target: 60, side: true, cue: 'Tuck the pelvis and squeeze the back glute first, then sink — the stretch is in the front of the back hip' },
  { id: 'couch-stretch',    cat: 'stretch', group: 'psoas', name: 'Couch Stretch',          mode: 'time', target: 60, side: true, cue: 'Back foot up the wall, knee in the corner — rise only as far as the pelvis stays tucked' },
  { id: 'lizard',           cat: 'stretch', group: 'psoas', name: 'Lizard Pose',            mode: 'time', target: 60, side: true, cue: 'Both hands inside the front foot, back leg long — forearms down only if the hips stay level' },
  { id: 'standing-hip-ext', cat: 'stretch', group: 'psoas', name: 'Standing Hip Extension', mode: 'time', target: 60, side: true, cue: 'Reach the leg long behind you, pelvis level and tucked — squeeze the glute, never arch the low back' },

  // ═══════════════ STRETCHING · Hamstrings ═══════════════
  { id: 'elephant-walks',       cat: 'stretch', group: 'hams', name: 'Elephant Walks',       mode: 'time', target: 60, cue: 'Fold and grab the legs — bend one knee as the other straightens, and pull yourself gently deeper' },
  { id: 'forward-fold',         cat: 'stretch', group: 'hams', name: 'Forward Fold',         mode: 'time', target: 60, cue: 'Bend the knees as much as needed — tip the pelvis forward and fold at the hips, chest toward the thighs' },
  { id: 'single-leg-hamstring', cat: 'stretch', group: 'hams', name: 'Single-leg Hamstring', mode: 'time', target: 60, side: true, cue: 'On the back, leg to the ceiling with a strap — knee dead straight before you pull it closer' },
  { id: 'hinge-fold',           cat: 'stretch', group: 'hams', name: 'Hinge Fold',           mode: 'time', target: 60, cue: 'Stick the butt back, arch the lower back, chest travels forward-and-down — stop the moment the arch is lost' },
  { id: 'half-split',           cat: 'stretch', group: 'hams', name: 'Half Split',           mode: 'time', target: 60, side: true, cue: 'Runner’s stretch — hips square and stacked over the back knee, chest long over the front leg' },
  { id: 'hurdler',              cat: 'stretch', group: 'hams', name: 'Hurdler Stretch',      mode: 'time', target: 60, side: true, cue: 'Sit on a cushion so the pelvis can tip forward — fold at the hips over the leg; a bent knee beats a rounded back' },
  { id: 'jefferson-curl',       cat: 'stretch', group: 'hams', name: 'Jefferson Curl',       mode: 'time', target: 60, cue: 'Light weight in the hands — roll down vertebra by vertebra, knees locked, hang, rebuild slowly' },

  // ═══════════════ STRETCHING · Front split (espacate) ═══════════════
  { id: 'lunge-pulses',         cat: 'stretch', group: 'split', name: 'Lunge Pulses',            mode: 'time', target: 60, side: true, cue: 'Deep lunge, back knee hovering — small controlled sinks with the hips square to the front' },
  { id: 'lunge-halfsplit-flow', cat: 'stretch', group: 'split', name: 'Lunge ⇄ Half-split Flow', mode: 'time', target: 60, side: true, cue: 'Glide between lunge and half-split without the hands leaving the floor — exhale into each end' },
  { id: 'pigeon',               cat: 'stretch', group: 'split', name: 'Pigeon Pose',             mode: 'time', target: 60, side: true, cue: 'Front shin across, back leg dead straight behind — level the hips before you fold' },
  { id: 'standing-quad',        cat: 'stretch', group: 'split', name: 'Standing Quad Pull',      mode: 'time', target: 60, side: true, cue: 'Heel to glute, knees together, pelvis tucked — the pull climbs the front of the thigh' },
  { id: 'front-split',          cat: 'stretch', group: 'split', name: 'Front Split · Espacate',  mode: 'time', target: 60, side: true, cue: 'Blocks under the hands, hips square — belly-breathe, soften the face, and sink a little on each exhale' },
  { id: 'split-pnf',            cat: 'stretch', group: 'split', name: 'Split PNF Press',         mode: 'time', target: 60, side: true, cue: 'In your deepest split: press both legs into the floor 10 s, release with a belly breath — repeat 3 rounds' },
  { id: 'standing-split',       cat: 'stretch', group: 'split', name: 'Standing Split',       mode: 'time', target: 60, side: true, cue: 'Fold over the standing leg, back leg climbs high — square the hips first, then chase height' },
  { id: 'twisted-lizard',       cat: 'stretch', group: 'split', name: 'Twisted Lizard',       mode: 'time', target: 60, side: true, cue: 'In lizard, bend the back knee and grab the foot — pull the heel in to open quad and hip flexor together' },

  // ═══════════════ STRETCHING · Pancake & middle split ═══════════════
  { id: 'butterfly',           cat: 'stretch', group: 'pancake', name: 'Butterfly',             mode: 'time', target: 60, cue: 'Soles together, sit tall — gently press the knees down and release, then tip the pelvis to fold' },
  { id: 'ninety-ninety',       cat: 'stretch', group: 'pancake', name: '90/90 Hold',            mode: 'time', target: 60, side: true, cue: 'Both knees at right angles — grow tall first, then hinge the chest over the front shin' },
  { id: 'frog-rocks',          cat: 'stretch', group: 'pancake', name: 'Frog Rocks',            mode: 'time', target: 60, cue: 'Knees wide, ankles in line with the knees — rock back gently until the inner thighs catch' },
  { id: 'frog-hold',           cat: 'stretch', group: 'pancake', name: 'Frog Hold',             mode: 'time', target: 60, cue: 'Hold where the rocks ended — belly-breathe and soften the face; the knees drop when you stop guarding' },
  { id: 'horse-stance',        cat: 'stretch', group: 'pancake', name: 'Horse Stance',          mode: 'time', target: 60, cue: 'Wide stance, toes out, sit straight down — knees track over the toes, torso vertical' },
  { id: 'straddle-side-reach', cat: 'stretch', group: 'pancake', name: 'Straddle Side Reach',   mode: 'time', target: 60, side: true, cue: 'Rotate the chest over one leg and reach long — both sit bones stay glued down' },
  { id: 'straddle-center',     cat: 'stretch', group: 'pancake', name: 'Straddle Center Reach', mode: 'time', target: 60, cue: 'Walk the hands forward with a long spine — reach the head toward the far wall, no rounding' },
  { id: 'pancake-fold',        cat: 'stretch', group: 'pancake', name: 'Pancake Fold',          mode: 'time', target: 60, cue: 'Sit elevated, kneecaps pointing up, spine long — reach the forehead far forward instead of arching' },
  { id: 'cossack',             cat: 'stretch', group: 'pancake', name: 'Cossack Squat Hold',    mode: 'time', target: 60, side: true, cue: 'Slide to one side, straight leg’s toes pointing forward, heel down — chest tall, sink with control' },
  { id: 'wall-straddle',       cat: 'stretch', group: 'pancake', name: 'Wall Straddle',         mode: 'time', target: 60, cue: 'Legs up the wall, open into a straddle — set the timer and let gravity do the work' },
  { id: 'wide-leg-fold',       cat: 'stretch', group: 'pancake', name: 'Wide-leg Fold',         mode: 'time', target: 60, cue: 'Feet wide, flat back — press the sit bones away, root the heels, and slide the hands down' },

  // ═══════════════ STRETCHING · Back & spine ═══════════════
  { id: 'sphinx-cobra',      cat: 'stretch', group: 'back', name: 'Sphinx → Cobra',     mode: 'time', target: 60, cue: 'Sphinx first, then press toward cobra — hips heavy, shoulders down, nothing pinching in the low back' },
  { id: 'puppy-pose',        cat: 'stretch', group: 'back', name: 'Puppy Pose',         mode: 'time', target: 60, cue: 'Hips high over the knees, chest melts to the floor — armpits reach long' },
  { id: 'chest-opener',      cat: 'stretch', group: 'back', name: 'Chest Opener',       mode: 'time', target: 60, cue: 'Forearms on a support, knees under the hips — let the chest sink through the shoulders' },
  { id: 'bridge-hold',       cat: 'stretch', group: 'back', name: 'Bridge Hold',        mode: 'time', target: 60, cue: 'Press through the heels, squeeze the glutes, open the front line — chin soft, ribs down' },

  // ═══════════════ STRETCHING · Glutes ═══════════════
  { id: 'figure-four',  cat: 'stretch', group: 'glutes', name: 'Figure-4',     mode: 'time', target: 60, side: true, cue: 'Ankle over knee, pull the shin in — flex the top foot and keep the tailbone down' },
  { id: 'glute-bridge', cat: 'stretch', group: 'glutes', name: 'Glute Bridge', mode: 'time', target: 60, cue: 'Slow reps or a top hold — push the floor away through the heels, glutes only' },
  { id: 'hip-airplane', cat: 'stretch', group: 'glutes', name: 'Hip Airplane', mode: 'time', target: 60, side: true, cue: 'Single-leg hinge — rotate the pelvis open, then closed; the hips do all the work' },
];

export const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// Generated illustration when one exists (see tools/genimages.mjs), otherwise
// the procedural SVG pictogram.
export const imgFor = id => GENERATED[id] ? `img/gen/${id}.${GENERATED[id]}` : `img/${id}.svg`;

// ————————————————————————————————————————————————————————————————
// The Corpo routine — built from the "Corpo" playlist (@gabriel_om).
// 80 slots × (60 s hold + 30 s rest) = exactly 2 h, playable as four
// standalone ~30 min series (block pairs chosen to balance slot counts).
// Focus: front split (espacate) · pancake opening · feet & ballet.
// ————————————————————————————————————————————————————————————————

export const ROUTINE = {
  id: 'corpo',
  name: 'Corpo',
  tagline: 'Front split · Pancake · Feet — four 30 min series',
  hold: 60,
  rest: 30,
  // Deep static stretching on cold muscles is the #1 mistake called out across
  // the playlist (Dance Masterclass, blogilates, Lu Corti) — Série 1 opens with
  // the warm-up block; the other three carry a warm-up reminder instead.
  series: [
    { id: 'feet',    name: 'Série 1 · Feet & Ankles',      blocks: ['Warm-up', 'Feet & Ankles'] },
    { id: 'psoas',   name: 'Série 2 · Psoas & Hamstrings', blocks: ['Psoas & Hip Flexors', 'Hamstrings'], tip: 'Warm up 5 min first — light cardio and leg swings, never stretch cold' },
    { id: 'split',   name: 'Série 3 · Front Split',        blocks: ['Front Split · Espacate', 'Back & Spine'], tip: 'Warm up 5 min first — light cardio and leg swings, never stretch cold' },
    { id: 'pancake', name: 'Série 4 · Pancake & Glutes',   blocks: ['Pancake & Middle Split', 'Glutes & Finish'], tip: 'Warm up 5 min first — light cardio and leg swings, never stretch cold' },
  ],
  blocks: [
    {
      name: 'Warm-up',
      sources: [
        'The 10 Most Important Mobility & Flexibility Exercises — Calisthenicmovement',
        '10 Minutes to Perfect Mobility — Calisthenicmovement',
        'SDC Technical Warm Up — Sharmila Kamte',
        'Why Most Stretches Don’t Work — Dance Masterclass',
        '10 ERROS QUE TE DEIXAM MENOS FLEXÍVEL — Lu Corti',
      ],
      items: [
        ['leg-swings'], ['cat-cow'], ['thoracic-rotation', 'LR'],
        ['hip-cars', 'LR'], ['deep-squat-hold'], ['down-dog-flow'],
      ],
    },
    {
      name: 'Feet & Ankles',
      sources: [
        'Dance Foot Exercises & Stretches for Ballet Pointe — PsycheTruth',
        'How to improve your arch | feet flexibility — Alivia D’Andrea',
        'Unlock Ankle Mobility (3 guided exercises) — YOGABODY',
        'How to Increase Ankle Mobility in 3 Steps — Barefoot Strength',
        'High Half Pointe Shoe and its Secrets — Ballet OnLine',
      ],
      items: [
        ['ankle-cars', 'LR'], ['ankle-rocks', 'LR'], ['calf-stretch', 'LR'],
        ['soleus-stretch', 'LR'], ['foot-doming'], ['point-flex'],
        ['releve-holds'], ['toe-stretch-kneel'], ['arch-pointe-stretch'],
      ],
    },
    {
      name: 'Psoas & Hip Flexors',
      sources: [
        'Your Psoas Isn’t Just Tight, It’s WEAK — Precision Movement',
        'Releasing the Psoas — Neal Hallinan',
        'The Secret To Psoas Tightness On One Side — Conor Harris',
        'How to Permanently Loosen a Tight Psoas — Your Wellness Nerd',
        'Releasing the Psoas: The THREE things your brain MUST sense — Neal Hallinan',
      ],
      items: [
        ['psoas-march'], ['low-lunge', 'LR'], ['couch-stretch', 'LR'],
        ['lizard', 'LR'], ['standing-hip-ext', 'LR'],
      ],
    },
    {
      name: 'Hamstrings',
      sources: [
        'Unlock Your Hamstrings Fast — Cathy Madeo Yoga',
        'The REAL WAY to UNLOCK YOUR HAMSTRINGS — Strength Side',
        'How to Reset Your Pelvis For Flexible Hamstrings — Barefoot Strength',
        'COMO TOCAR OS PÉS SEM DOBRAR OS JOELHOS — Julyanna Werneck',
        'How to Get Hamstrings So Flexible You Never Need to Stretch Again — Barefoot Strength',
      ],
      items: [
        ['elephant-walks'], ['forward-fold'], ['single-leg-hamstring', 'LR'],
        ['hinge-fold'], ['half-split', 'LR'], ['hurdler', 'LR'], ['jefferson-curl'],
      ],
    },
    {
      name: 'Front Split · Espacate',
      sources: [
        'COMO ZERAR A ABERTURA DE FRENTE? — jumorosi (ginasta)',
        'TUTORIAL: ESPACATE passo a passo — jumorosi (ginasta)',
        '30 Minute Stretches for Splits! — blogilates',
        'Front & Middle Splits In 14 Days — Boho Beautiful Yoga',
        'Splits Flexibility Ballet Stretches — PsycheTruth',
      ],
      items: [
        ['lunge-pulses', 'LR'], ['lunge-halfsplit-flow', 'LR'], ['pigeon', 'LR'],
        ['standing-quad', 'LR'], ['front-split', 'LR'], ['split-pnf', 'LR'],
        ['standing-split', 'LR'], ['twisted-lizard', 'LR'],
      ],
    },
    {
      name: 'Pancake & Middle Split',
      sources: [
        'How to Pancake Stretch (Beginner to Advanced) — Strength Side',
        'This Stiff Guy Learns the Pancake Fold in 107 Days — Geek Climber',
        'How To Fix A Rounded Back In Your Pancake? — MOVEBLOCKS',
        'Intense middle split stretching routine — Alivia D’Andrea',
      ],
      items: [
        ['butterfly'], ['ninety-ninety', 'LR'], ['frog-rocks'], ['frog-hold'],
        ['horse-stance'], ['straddle-side-reach', 'LR'], ['straddle-center'],
        ['pancake-fold'], ['cossack', 'LR'], ['wall-straddle'], ['wide-leg-fold'],
      ],
    },
    {
      name: 'Back & Spine',
      sources: [
        'Beginner’s Back flexibility stretches — Alivia D’Andrea',
        'Ballet Total Body DEEP Stretching — Lazy Dancer Tips',
      ],
      items: [
        ['sphinx-cobra'], ['puppy-pose'], ['chest-opener'], ['bridge-hold'],
      ],
    },
    {
      name: 'Glutes & Finish',
      sources: [
        'How Squats Heal the Body — Strength Side',
        'How To Grow The Biggest Muscle In Your Body (Glute Science) — Barefoot Strength',
        'The Key to Flexibility Everyone Misses — Strength Side',
      ],
      items: [
        ['figure-four', 'LR'], ['glute-bridge'], ['hip-airplane', 'LR'],
      ],
    },
  ],
};

export function seriesSlots(series) {
  const slots = [];
  for (const blockName of series.blocks) {
    const block = ROUTINE.blocks.find(b => b.name === blockName);
    for (const [id, sides] of block.items) {
      if (sides === 'LR') {
        slots.push({ ex: id, side: 'L', block: block.name });
        slots.push({ ex: id, side: 'R', block: block.name });
      } else {
        slots.push({ ex: id, side: null, block: block.name });
      }
    }
  }
  return slots;
}

export const SLOT_SECONDS = ROUTINE.hold + ROUTINE.rest;
