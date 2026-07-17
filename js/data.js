// Fixed exercise catalog. Every exercise ships with its own generated figure
// (img/<id>.svg) — there is deliberately no way to create exercises in the app.

import { GENERATED } from './gen-manifest.js';
// mode: 'reps' or 'time' (seconds). weight: kg (gym program). side: done per side.
// Gym exercises come from Gabriel's real program (Portuguese names kept in `pt`).

export const CATS = {
  gym: 'Gym',
  stretch: 'Stretching',
  push: 'Push-ups',
  pull: 'Pull-ups',
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

export const EXERCISES = [
  // ═══════════════ GYM · Série A — chest & triceps ═══════════════
  { id: 'pec-deck',                cat: 'gym', group: 'a', name: 'Pec Deck Fly',                 pt: 'Peitoral Dorsal',           weight: 40,  mode: 'reps', target: 12 },
  { id: 'chest-press',             cat: 'gym', group: 'a', name: 'Chest Press Machine',          pt: 'Chest Press',               weight: 50,  mode: 'reps', target: 12 },
  { id: 'bench-press-flat',        cat: 'gym', group: 'a', name: 'Flat Bench Press',             pt: 'Supino Reto',               weight: 28,  mode: 'reps', target: 12 },
  { id: 'bench-press-decline',     cat: 'gym', group: 'a', name: 'Decline Bench Press',          pt: 'Supino Declinado',          weight: 28,  mode: 'reps', target: 12 },
  { id: 'bench-press-incline',     cat: 'gym', group: 'a', name: 'Incline Bench Press',          pt: 'Supino Inclinado',          weight: 28,  mode: 'reps', target: 12 },
  { id: 'triceps-pushdown',        cat: 'gym', group: 'a', name: 'Triceps Pushdown',             pt: 'Tríceps Juntado Cross',     weight: 35,  mode: 'reps', target: 12 },
  { id: 'triceps-pushdown-single', cat: 'gym', group: 'a', name: 'Single-arm Pushdown',          pt: 'Tríceps Unilateral Cross',  weight: 15,  mode: 'reps', target: 12, side: true },

  // ═══════════════ GYM · Série B — legs & core ═══════════════
  { id: 'leg-extension-cable',     cat: 'gym', group: 'b', name: 'Cable Leg Extension',          pt: 'Extensor Cross',            weight: 25,  mode: 'reps', target: 12, side: true },
  { id: 'leg-extension-ankle',     cat: 'gym', group: 'b', name: 'Ankle-weight Extension',       pt: 'Extensor Caneleira',        weight: 7,   mode: 'reps', target: 15, side: true },
  { id: 'leg-curl-lying',          cat: 'gym', group: 'b', name: 'Lying Leg Curl',               pt: 'Flexor Deitado',            weight: 40,  mode: 'reps', target: 12 },
  { id: 'leg-curl-standing',       cat: 'gym', group: 'b', name: 'Standing Leg Curl',            pt: 'Flexor em Pé',              weight: 20,  mode: 'reps', target: 12, side: true },
  { id: 'hip-abductor',            cat: 'gym', group: 'b', name: 'Hip Abductor Machine',         pt: 'Abdutor',                   weight: 75,  mode: 'reps', target: 15 },
  { id: 'hip-adductor',            cat: 'gym', group: 'b', name: 'Hip Adductor Machine',         pt: 'Adutor',                    weight: 75,  mode: 'reps', target: 15 },
  { id: 'side-leg-raise',          cat: 'gym', group: 'b', name: 'Ankle-weight Side Raise',      pt: 'Abdutor Caneleira',         weight: 7,   mode: 'reps', target: 15, side: true },
  { id: 'inner-thigh-raise',       cat: 'gym', group: 'b', name: 'Ankle-weight Inner Raise',     pt: 'Adutor Caneleira',          weight: 7,   mode: 'reps', target: 15, side: true },
  { id: 'ab-machine',              cat: 'gym', group: 'b', name: 'Ab Crunch Machine',            pt: 'Abdominal Máquina Bola',    weight: 70,  mode: 'reps', target: 15 },

  // ═══════════════ GYM · Série C — back & biceps ═══════════════
  { id: 'row-horizontal-machine',  cat: 'gym', group: 'c', name: 'Horizontal Pull Machine',      pt: 'Puxador Horizontal',        weight: 40,  mode: 'reps', target: 12 },
  { id: 'lat-pulldown-underhand',  cat: 'gym', group: 'c', name: 'Underhand Lat Pulldown',       pt: 'Puxador Vertical Supinada', weight: 40,  mode: 'reps', target: 12 },
  { id: 'seated-row-high',         cat: 'gym', group: 'c', name: 'Seated Row · High',            pt: 'Remada Sentado Cima',       weight: 40,  mode: 'reps', target: 12 },
  { id: 'seated-row-mid',          cat: 'gym', group: 'c', name: 'Seated Row · Mid',             pt: 'Remada Sentado Médio',      weight: 40,  mode: 'reps', target: 12 },
  { id: 'seated-row-low',          cat: 'gym', group: 'c', name: 'Seated Row · Low',             pt: 'Remada Sentado Baixo',      weight: 40,  mode: 'reps', target: 12 },
  { id: 'preacher-curl',           cat: 'gym', group: 'c', name: 'Preacher Curl',                pt: 'Rosca Scott',               weight: 20,  mode: 'reps', target: 12 },
  { id: 'cable-curl-single',       cat: 'gym', group: 'c', name: 'Single-arm Cable Curl',        pt: 'Rosca Unilateral Cross',    weight: 10,  mode: 'reps', target: 12, side: true },

  // ═══════════════ GYM · Série D — legs & glutes ═══════════════
  { id: 'leg-press-90',            cat: 'gym', group: 'd', name: 'Leg Press 90°',                pt: 'Legpress 90',               weight: 90,  mode: 'reps', target: 12 },
  { id: 'leg-press-45',            cat: 'gym', group: 'd', name: 'Leg Press 45°',                pt: 'Legpress 45',               weight: 160, mode: 'reps', target: 12 },
  { id: 'leg-press-horizontal',    cat: 'gym', group: 'd', name: 'Horizontal Leg Press',         pt: 'Legpress Horizontal',       weight: 140, mode: 'reps', target: 12 },
  { id: 'calf-press',              cat: 'gym', group: 'd', name: 'Calf Press on Leg Press',      pt: 'Panturrilha Legpress',      weight: 130, mode: 'reps', target: 15 },
  { id: 'hip-raise-step',          cat: 'gym', group: 'd', name: 'Hip Raise on Step',            pt: 'Elevação Quadril Step',     weight: 10,  mode: 'reps', target: 12, side: true },
  { id: 'hip-raise-ball',          cat: 'gym', group: 'd', name: 'Single-leg Hip Raise (Ball)',  pt: 'Elevação Quadril Bola P.E/P.D', weight: 0, mode: 'reps', target: 12, side: true },

  // ═══════════════ GYM · Série E — chest & triceps (nova) ═══════════════
  { id: 'smith-bench-press',       cat: 'gym', group: 'e', name: 'Smith Machine Bench Press',   pt: 'Supino Barra Guiada',       weight: 30,  mode: 'reps', target: 12 },
  { id: 'dumbbell-bench-press',    cat: 'gym', group: 'e', name: 'Dumbbell Bench Press',        pt: 'Supino Dumbbell',           weight: 28,  mode: 'reps', target: 12 },
  { id: 'incline-dumbbell-fly',    cat: 'gym', group: 'e', name: 'Incline Dumbbell Fly',        pt: 'Crucifixo Inclinado Halteres', weight: 20, mode: 'reps', target: 12 },
  { id: 'crossover-single',        cat: 'gym', group: 'e', name: 'Single-arm Cable Crossover',  pt: 'Crossover Unilateral',      weight: 5,   mode: 'reps', target: 12, side: true },
  { id: 'french-press-cable',      cat: 'gym', group: 'e', name: 'Cable French Press',          pt: 'Tríceps Francês Cross Supinado', weight: 40, mode: 'reps', target: 12 },
  { id: 'french-press-single',     cat: 'gym', group: 'e', name: 'Single-arm French Press',     pt: 'Tríceps Francês Unilateral', weight: 20, mode: 'reps', target: 12, side: true },

  // ═══════════════ GYM · Série F — legs & abs (nova) ═══════════════
  { id: 'hip-thrust',              cat: 'gym', group: 'f', name: 'Hip Thrust',                  pt: 'Elevação Pélvica',          weight: 100, mode: 'reps', target: 12 },
  { id: 'smith-lunge',             cat: 'gym', group: 'f', name: 'Smith Machine Lunge',         pt: 'Avanço Barra Guiada',       weight: 36,  mode: 'reps', target: 10, side: true },
  { id: 'sumo-squat',              cat: 'gym', group: 'f', name: 'Sumo Squat',                  pt: 'Sumô',                      weight: 24,  mode: 'reps', target: 12 },
  { id: 'bulgarian-split-squat',   cat: 'gym', group: 'f', name: 'Bulgarian Split Squat',       pt: 'Agachamento Búlgaro',       weight: 0,   mode: 'reps', target: 10, side: true },
  { id: 'calf-raise',              cat: 'gym', group: 'f', name: 'Calf Raise',                  pt: 'Panturrilha',               weight: 0,   mode: 'reps', target: 20 },
  { id: 'calf-raise-single',       cat: 'gym', group: 'f', name: 'Single-leg Calf Raise',       pt: 'Panturrilha Unilateral',    weight: 0,   mode: 'reps', target: 15, side: true },
  { id: 'ab-iso-hold',             cat: 'gym', group: 'f', name: 'Plank Hold',                  pt: 'Abdominal Isometria',       weight: 0,   mode: 'time', target: 45 },
  { id: 'crunches',                cat: 'gym', group: 'f', name: 'Crunches',                    pt: 'Abdominal',                 weight: 0,   mode: 'reps', target: 20 },

  // ═══════════════ GYM · Série G — back & biceps (nova) ═══════════════
  { id: 'lat-machine',             cat: 'gym', group: 'g', name: 'Lat Pulldown Machine',        pt: 'Dorsal',                    weight: 35,  mode: 'reps', target: 12 },
  { id: 'lat-machine-single',      cat: 'gym', group: 'g', name: 'Single-arm Lat Pulldown',     pt: 'Dorsal Unilateral',         weight: 35,  mode: 'reps', target: 12, side: true },
  { id: 'v-bar-pulldown',          cat: 'gym', group: 'g', name: 'V-bar Lat Pulldown',          pt: 'Puxada Vertical Triângulo', weight: 45,  mode: 'reps', target: 12 },
  { id: 'dumbbell-row-single',     cat: 'gym', group: 'g', name: 'Single-arm Dumbbell Row',     pt: 'Remada Unilateral Dumbbell', weight: 14, mode: 'reps', target: 12, side: true },
  { id: 'rope-pulldown',           cat: 'gym', group: 'g', name: 'Rope Pulldown',               pt: 'Puxada Corda Cross',        weight: 55,  mode: 'reps', target: 12 },
  { id: 'curl-21s',                cat: 'gym', group: 'g', name: 'Biceps Curl · 21s',           pt: 'Rosca 21',                  weight: 16,  mode: 'reps', target: 21 },
  { id: 'concentration-curl',      cat: 'gym', group: 'g', name: 'Concentration Curl',          pt: 'Rosca Concentrada',         weight: 9,   mode: 'reps', target: 12, side: true },

  // ═══════════════ GYM · Série H — legs & lower back (nova) ═══════════════
  { id: 'leg-extension-iso',       cat: 'gym', group: 'h', name: 'Leg Extension · Iso Hold',    pt: 'Extensor Isometria',        weight: 70,  mode: 'time', target: 30 },
  { id: 'leg-extension-both',      cat: 'gym', group: 'h', name: 'Leg Extension · Both',        pt: 'Extensor Junto',            weight: 70,  mode: 'reps', target: 12 },
  { id: 'leg-extension-single',    cat: 'gym', group: 'h', name: 'Leg Extension · Single',      pt: 'Extensor Unilateral',       weight: 35,  mode: 'reps', target: 12, side: true },
  { id: 'leg-curl-lying-single',   cat: 'gym', group: 'h', name: 'Single-leg Lying Curl',       pt: 'Flexor Unilateral Deitado', weight: 20,  mode: 'reps', target: 12, side: true },
  { id: 'hip-abductor-iso',        cat: 'gym', group: 'h', name: 'Hip Abductor 45° · Iso',      pt: 'Abdutor 45 / Isometria',    weight: 75,  mode: 'time', target: 30 },
  { id: 'hip-adductor-iso',        cat: 'gym', group: 'h', name: 'Hip Adductor 45° · Iso',      pt: 'Adutor 45 / Isometria',     weight: 70,  mode: 'time', target: 30 },
  { id: 'back-extension',          cat: 'gym', group: 'h', name: 'Back Extension',              pt: 'Flexão Lombar',             weight: 0,   mode: 'reps', target: 15 },

  // ═══════════════ PUSH-UPS ═══════════════
  { id: 'push-up',         cat: 'push', name: 'Push-up',         mode: 'reps', target: 12, cue: 'One straight line, chest to the floor' },
  { id: 'wide-push-up',    cat: 'push', name: 'Wide Push-up',    mode: 'reps', target: 10, cue: 'Hands wide, elbows at 45°' },
  { id: 'diamond-push-up', cat: 'push', name: 'Diamond Push-up', mode: 'reps', target: 8,  cue: 'Hands together under the chest' },
  { id: 'incline-push-up', cat: 'push', name: 'Incline Push-up', mode: 'reps', target: 12, cue: 'Hands elevated, body still a plank' },
  { id: 'knee-push-up',    cat: 'push', name: 'Knee Push-up',    mode: 'reps', target: 15, cue: 'Hips forward, line from knees to head' },

  // ═══════════════ PULL-UPS ═══════════════
  { id: 'pull-up',          cat: 'pull', name: 'Pull-up',          mode: 'reps', target: 6,  cue: 'Chest to bar, full hang between reps' },
  { id: 'chin-up',          cat: 'pull', name: 'Chin-up',          mode: 'reps', target: 6,  cue: 'Palms toward you, lead with the chest' },
  { id: 'negative-pull-up', cat: 'pull', name: 'Negative Pull-up', mode: 'reps', target: 5,  cue: 'Jump up, lower for 5 slow counts' },
  { id: 'scapular-pull',    cat: 'pull', name: 'Scapular Pull',    mode: 'reps', target: 8,  cue: 'Arms straight, shrug the shoulders down' },
  { id: 'dead-hang',        cat: 'pull', name: 'Dead Hang',        mode: 'time', target: 30, cue: 'Relax into the hang, breathe' },

  // ═══════════════ STRETCHING · Warm-up ═══════════════
  { id: 'neck-rolls',        cat: 'stretch', name: 'Neck Rolls',        mode: 'time', target: 60, cue: 'Slow half-circles, ear toward shoulder' },
  { id: 'cat-cow',           cat: 'stretch', name: 'Cat–Cow',           mode: 'time', target: 60, cue: 'Arch and round with the breath' },
  { id: 'thoracic-rotation', cat: 'stretch', name: 'Thoracic Rotation', mode: 'time', target: 60, side: true, cue: 'All fours, hand behind head, open to the ceiling' },
  { id: 'hip-cars',          cat: 'stretch', name: 'Hip CARs',          mode: 'time', target: 60, side: true, cue: 'Big slow knee circles, torso still' },
  { id: 'deep-squat-hold',   cat: 'stretch', name: 'Deep Squat Hold',   mode: 'time', target: 60, cue: 'Heels down, chest tall, knees pushed out' },
  { id: 'down-dog-flow',     cat: 'stretch', name: 'Down Dog → Walk',   mode: 'time', target: 60, cue: 'Pedal the heels, then walk hands back' },

  // ═══════════════ STRETCHING · Feet & ankles (ballet) ═══════════════
  { id: 'ankle-cars',          cat: 'stretch', name: 'Ankle Circles',        mode: 'time', target: 60, side: true, cue: 'Biggest pain-free circle, both directions' },
  { id: 'ankle-rocks',         cat: 'stretch', name: 'Knee-over-toe Rocks',  mode: 'time', target: 60, side: true, cue: 'Knee tracks past the toes, heel stays down' },
  { id: 'calf-stretch',        cat: 'stretch', name: 'Wall Calf Stretch',    mode: 'time', target: 60, side: true, cue: 'Back leg straight, heel rooted' },
  { id: 'soleus-stretch',      cat: 'stretch', name: 'Soleus Stretch',       mode: 'time', target: 60, side: true, cue: 'Same shape, back knee bent' },
  { id: 'foot-doming',         cat: 'stretch', name: 'Foot Doming',          mode: 'time', target: 60, cue: 'Short foot: lift the arch, toes stay long' },
  { id: 'point-flex',          cat: 'stretch', name: 'Point & Flex',         mode: 'time', target: 60, cue: 'Articulate through demi-pointe every rep' },
  { id: 'releve-holds',        cat: 'stretch', name: 'Relevé Holds',         mode: 'time', target: 60, cue: 'Rise to the ball of the foot, ankles stacked' },
  { id: 'toe-stretch-kneel',   cat: 'stretch', name: 'Kneeling Toe Stretch', mode: 'time', target: 60, cue: 'Sit back over the toes, plantar fascia opens' },
  { id: 'arch-pointe-stretch', cat: 'stretch', name: 'Arch & Pointe Stretch', mode: 'time', target: 60, cue: 'Top of the foot on the floor, press the arch forward' },

  // ═══════════════ STRETCHING · Psoas & hip flexors ═══════════════
  { id: 'psoas-march',      cat: 'stretch', name: 'Psoas March',            mode: 'time', target: 60, cue: 'Slow knee lifts above 90°, no lean back' },
  { id: 'low-lunge',        cat: 'stretch', name: 'Low Lunge',              mode: 'time', target: 60, side: true, cue: 'Tuck the pelvis, squeeze the back glute' },
  { id: 'couch-stretch',    cat: 'stretch', name: 'Couch Stretch',          mode: 'time', target: 60, side: true, cue: 'Back foot up the wall, torso rises slowly' },
  { id: 'lizard',           cat: 'stretch', name: 'Lizard Pose',            mode: 'time', target: 60, side: true, cue: 'Both hands inside the front foot' },
  { id: 'constructive-rest', cat: 'stretch', name: 'Constructive Rest',     mode: 'time', target: 60, cue: 'On the back, knees bent — let the psoas let go' },
  { id: 'standing-hip-ext', cat: 'stretch', name: 'Standing Hip Extension', mode: 'time', target: 60, side: true, cue: 'Leg reaches back, pelvis stays level' },

  // ═══════════════ STRETCHING · Hamstrings ═══════════════
  { id: 'elephant-walks',       cat: 'stretch', name: 'Elephant Walks',       mode: 'time', target: 60, cue: 'Fold, alternate bending one knee at a time' },
  { id: 'forward-fold',         cat: 'stretch', name: 'Forward Fold',         mode: 'time', target: 60, cue: 'Hang heavy, shake the head no' },
  { id: 'single-leg-hamstring', cat: 'stretch', name: 'Single-leg Hamstring', mode: 'time', target: 60, side: true, cue: 'On the back, leg to the ceiling with a strap' },
  { id: 'hinge-fold',           cat: 'stretch', name: 'Hinge Fold',           mode: 'time', target: 60, cue: 'Fold from the pelvis, spine stays long' },
  { id: 'half-split',           cat: 'stretch', name: 'Half Split',           mode: 'time', target: 60, side: true, cue: 'Runner’s stretch — hips square over the knee' },
  { id: 'hurdler',              cat: 'stretch', name: 'Hurdler Stretch',      mode: 'time', target: 60, side: true, cue: 'One leg long, fold over it' },
  { id: 'rolldown',             cat: 'stretch', name: 'Slow Rolldown',        mode: 'time', target: 60, cue: 'Vertebra by vertebra, knees soft' },

  // ═══════════════ STRETCHING · Front split (espacate) ═══════════════
  { id: 'lunge-pulses',         cat: 'stretch', name: 'Lunge Pulses',            mode: 'time', target: 60, side: true, cue: 'Small sinks, back knee hovers' },
  { id: 'lunge-halfsplit-flow', cat: 'stretch', name: 'Lunge ⇄ Half-split Flow', mode: 'time', target: 60, side: true, cue: 'Glide between the two shapes' },
  { id: 'pigeon',               cat: 'stretch', name: 'Pigeon Pose',             mode: 'time', target: 60, side: true, cue: 'Front shin across, hips level, fold' },
  { id: 'standing-quad',        cat: 'stretch', name: 'Standing Quad Pull',      mode: 'time', target: 60, side: true, cue: 'Heel to glute, knees together, tuck' },
  { id: 'front-split',          cat: 'stretch', name: 'Front Split · Espacate',  mode: 'time', target: 60, side: true, cue: 'Blocks under the hands, hips square, exhale down' },
  { id: 'split-pnf',            cat: 'stretch', name: 'Split PNF Press',         mode: 'time', target: 60, side: true, cue: 'Press both legs into the floor 10 s, release deeper' },

  // ═══════════════ STRETCHING · Pancake & middle split ═══════════════
  { id: 'butterfly',           cat: 'stretch', name: 'Butterfly',             mode: 'time', target: 60, cue: 'Soles together, lean from the hips' },
  { id: 'ninety-ninety',       cat: 'stretch', name: '90/90 Hold',            mode: 'time', target: 60, side: true, cue: 'Both knees at 90°, chest over the front shin' },
  { id: 'frog-rocks',          cat: 'stretch', name: 'Frog Rocks',            mode: 'time', target: 60, cue: 'Knees wide, rock gently back' },
  { id: 'frog-hold',           cat: 'stretch', name: 'Frog Hold',             mode: 'time', target: 60, cue: 'Sink and breathe, ankles in line with knees' },
  { id: 'horse-stance',        cat: 'stretch', name: 'Horse Stance',          mode: 'time', target: 60, cue: 'Wide squat, knees track over toes' },
  { id: 'straddle-side-reach', cat: 'stretch', name: 'Straddle Side Reach',   mode: 'time', target: 60, side: true, cue: 'Reach over the leg, chest open' },
  { id: 'straddle-center',     cat: 'stretch', name: 'Straddle Center Reach', mode: 'time', target: 60, cue: 'Walk the hands forward, back flat' },
  { id: 'pancake-fold',        cat: 'stretch', name: 'Pancake Fold',          mode: 'time', target: 60, cue: 'Tip the pelvis, chest leads the fold' },
  { id: 'cossack',             cat: 'stretch', name: 'Cossack Squat Hold',    mode: 'time', target: 60, side: true, cue: 'Slide to one side, other leg long' },
  { id: 'wall-straddle',       cat: 'stretch', name: 'Wall Straddle',         mode: 'time', target: 60, cue: 'Legs open against the wall — gravity works' },
  { id: 'wide-leg-fold',       cat: 'stretch', name: 'Wide-leg Fold',         mode: 'time', target: 60, cue: 'Feet wide, fold and hold the ankles' },

  // ═══════════════ STRETCHING · Back & spine ═══════════════
  { id: 'sphinx-cobra',      cat: 'stretch', name: 'Sphinx → Cobra',     mode: 'time', target: 60, cue: 'Press up gently, hips heavy' },
  { id: 'puppy-pose',        cat: 'stretch', name: 'Puppy Pose',         mode: 'time', target: 60, cue: 'Hips high, chest melts to the floor' },
  { id: 'chest-opener',      cat: 'stretch', name: 'Chest Opener',       mode: 'time', target: 60, cue: 'Forearms on a support, chest sinks through' },
  { id: 'childs-side-reach', cat: 'stretch', name: 'Child’s Side Reach', mode: 'time', target: 60, side: true, cue: 'Walk both hands to one corner' },
  { id: 'supine-twist',      cat: 'stretch', name: 'Supine Twist',       mode: 'time', target: 60, side: true, cue: 'Knee across, both shoulders down' },
  { id: 'bridge-hold',       cat: 'stretch', name: 'Bridge Hold',        mode: 'time', target: 60, cue: 'Press through the heels, open the front line' },

  // ═══════════════ STRETCHING · Glutes ═══════════════
  { id: 'figure-four',  cat: 'stretch', name: 'Figure-4',     mode: 'time', target: 60, side: true, cue: 'Ankle over knee, pull the shin in' },
  { id: 'glute-bridge', cat: 'stretch', name: 'Glute Bridge', mode: 'time', target: 60, cue: 'Slow reps or hold at the top — glutes only' },
  { id: 'hip-airplane', cat: 'stretch', name: 'Hip Airplane', mode: 'time', target: 60, side: true, cue: 'Hinge on one leg, rotate the pelvis open and closed' },
];

export const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// Generated illustration when one exists (see tools/genimages.mjs), otherwise
// the procedural SVG pictogram.
export const imgFor = id => GENERATED[id] ? `img/gen/${id}.${GENERATED[id]}` : `img/${id}.svg`;

// ————————————————————————————————————————————————————————————————
// The Corpo routine — built from the "Corpo" playlist (@gabriel_om).
// 80 slots × (60 s hold + 30 s rest) = exactly 2 h.
// Focus: front split (espacate) · pancake opening · feet & ballet.
// ————————————————————————————————————————————————————————————————

export const ROUTINE = {
  id: 'corpo',
  name: 'Corpo',
  tagline: 'Front split · Pancake · Feet — 2 hours',
  hold: 60,
  rest: 30,
  blocks: [
    {
      name: 'Warm-up',
      sources: [
        'The 10 Most Important Mobility & Flexibility Exercises — Calisthenicmovement',
        '10 Minutes to Perfect Mobility — Calisthenicmovement',
        'SDC Technical Warm Up — Sharmila Kamte',
      ],
      items: [
        ['neck-rolls'], ['cat-cow'], ['thoracic-rotation', 'LR'],
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
      ],
      items: [
        ['psoas-march'], ['low-lunge', 'LR'], ['couch-stretch', 'LR'],
        ['lizard', 'LR'], ['constructive-rest'], ['standing-hip-ext', 'LR'],
      ],
    },
    {
      name: 'Hamstrings',
      sources: [
        'Unlock Your Hamstrings Fast — Cathy Madeo Yoga',
        'The REAL WAY to UNLOCK YOUR HAMSTRINGS — Strength Side',
        'How to Reset Your Pelvis For Flexible Hamstrings — Barefoot Strength',
        'COMO TOCAR OS PÉS SEM DOBRAR OS JOELHOS — Julyanna Werneck',
      ],
      items: [
        ['elephant-walks'], ['forward-fold'], ['single-leg-hamstring', 'LR'],
        ['hinge-fold'], ['half-split', 'LR'], ['hurdler', 'LR'], ['rolldown'],
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
        ['sphinx-cobra'], ['puppy-pose'], ['chest-opener'],
        ['childs-side-reach', 'LR'], ['supine-twist', 'LR'], ['bridge-hold'],
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

export function routineSlots() {
  const slots = [];
  for (const block of ROUTINE.blocks) {
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
export function routineTotalSeconds() { return routineSlots().length * SLOT_SECONDS; }
