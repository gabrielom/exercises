// Fixed exercise catalog. Every exercise ships with its own animation (anim id) —
// there is deliberately no way to create exercises in the app.
// mode: 'reps' (tap counter) or 'time' (stopwatch). Both are toggleable per card.
// side: true → done once per side; the Corpo routine expands it into L/R slots.

export const CATS = {
  gym: 'Gym',
  stretch: 'Stretching',
  push: 'Push-ups',
  pull: 'Pull-ups',
};

export const EXERCISES = [
  // ————— Gym —————
  { id: 'squat',          cat: 'gym', name: 'Back Squat',     mode: 'reps', target: 10, anim: 'squat',    cue: 'Brace, sit between the hips, drive up' },
  { id: 'bench-press',    cat: 'gym', name: 'Bench Press',    mode: 'reps', target: 8,  anim: 'bench',    cue: 'Shoulder blades pinned, bar to mid-chest' },
  { id: 'deadlift',       cat: 'gym', name: 'Deadlift',       mode: 'reps', target: 8,  anim: 'deadlift', cue: 'Long spine, push the floor away' },
  { id: 'barbell-row',    cat: 'gym', name: 'Barbell Row',    mode: 'reps', target: 10, anim: 'row',      cue: 'Hinge, pull to the lower ribs' },
  { id: 'overhead-press', cat: 'gym', name: 'Overhead Press', mode: 'reps', target: 8,  anim: 'ohp',      cue: 'Ribs down, press to lockout' },
  { id: 'biceps-curl',    cat: 'gym', name: 'Biceps Curl',    mode: 'reps', target: 12, anim: 'curl',     cue: 'Elbows glued to the sides' },

  // ————— Push-ups —————
  { id: 'push-up',         cat: 'push', name: 'Push-up',         mode: 'reps', target: 12, anim: 'pushup',        cue: 'One straight line, chest to the floor' },
  { id: 'wide-push-up',    cat: 'push', name: 'Wide Push-up',    mode: 'reps', target: 10, anim: 'pushup-wide',   cue: 'Hands wide, elbows at 45°' },
  { id: 'diamond-push-up', cat: 'push', name: 'Diamond Push-up', mode: 'reps', target: 8,  anim: 'pushup-diamond',cue: 'Hands together under the chest' },
  { id: 'incline-push-up', cat: 'push', name: 'Incline Push-up', mode: 'reps', target: 12, anim: 'pushup-incline',cue: 'Hands elevated, body still a plank' },
  { id: 'knee-push-up',    cat: 'push', name: 'Knee Push-up',    mode: 'reps', target: 15, anim: 'pushup-knee',   cue: 'Hips forward, line from knees to head' },

  // ————— Pull-ups —————
  { id: 'pull-up',          cat: 'pull', name: 'Pull-up',          mode: 'reps', target: 6,  anim: 'pullup',    cue: 'Chest to bar, full hang between reps' },
  { id: 'chin-up',          cat: 'pull', name: 'Chin-up',          mode: 'reps', target: 6,  anim: 'chinup',    cue: 'Palms toward you, lead with the chest' },
  { id: 'negative-pull-up', cat: 'pull', name: 'Negative Pull-up', mode: 'reps', target: 5,  anim: 'negative',  cue: 'Jump up, lower for 5 slow counts' },
  { id: 'scapular-pull',    cat: 'pull', name: 'Scapular Pull',    mode: 'reps', target: 8,  anim: 'scappull',  cue: 'Arms straight, shrug the shoulders down' },
  { id: 'dead-hang',        cat: 'pull', name: 'Dead Hang',        mode: 'time', target: 30, anim: 'deadhang',  cue: 'Relax into the hang, breathe' },

  // ————— Stretching · Warm-up —————
  { id: 'neck-rolls',         cat: 'stretch', name: 'Neck Rolls',          mode: 'time', target: 60, anim: 'neckroll',  cue: 'Slow half-circles, ear toward shoulder' },
  { id: 'cat-cow',            cat: 'stretch', name: 'Cat–Cow',             mode: 'time', target: 60, anim: 'catcow',    cue: 'Arch and round with the breath' },
  { id: 'thoracic-rotation',  cat: 'stretch', name: 'Thoracic Rotation',   mode: 'time', target: 60, anim: 'trot',      side: true, cue: 'All fours, hand behind head, open to the ceiling' },
  { id: 'hip-cars',           cat: 'stretch', name: 'Hip CARs',            mode: 'time', target: 60, anim: 'hipcar',    side: true, cue: 'Big slow knee circles, torso still' },
  { id: 'deep-squat-hold',    cat: 'stretch', name: 'Deep Squat Hold',     mode: 'time', target: 60, anim: 'deepsquat', cue: 'Heels down, chest tall, knees pushed out' },
  { id: 'down-dog-flow',      cat: 'stretch', name: 'Down Dog → Walk',     mode: 'time', target: 60, anim: 'downdog',   cue: 'Pedal the heels, then walk hands back' },

  // ————— Stretching · Feet & ankles (ballet) —————
  { id: 'ankle-cars',         cat: 'stretch', name: 'Ankle Circles',       mode: 'time', target: 60, anim: 'anklecar',  side: true, cue: 'Biggest pain-free circle, both directions' },
  { id: 'ankle-rocks',        cat: 'stretch', name: 'Knee-over-toe Rocks', mode: 'time', target: 60, anim: 'anklerock', side: true, cue: 'Knee tracks past the toes, heel stays down' },
  { id: 'calf-stretch',       cat: 'stretch', name: 'Wall Calf Stretch',   mode: 'time', target: 60, anim: 'calf',      side: true, cue: 'Back leg straight, heel rooted' },
  { id: 'soleus-stretch',     cat: 'stretch', name: 'Soleus Stretch',      mode: 'time', target: 60, anim: 'soleus',    side: true, cue: 'Same shape, back knee bent' },
  { id: 'foot-doming',        cat: 'stretch', name: 'Foot Doming',         mode: 'time', target: 60, anim: 'doming',    cue: 'Short foot: lift the arch, toes stay long' },
  { id: 'point-flex',         cat: 'stretch', name: 'Point & Flex',        mode: 'time', target: 60, anim: 'pointflex', cue: 'Articulate through demi-pointe every rep' },
  { id: 'releve-holds',       cat: 'stretch', name: 'Relevé Holds',        mode: 'time', target: 60, anim: 'releve',    cue: 'Rise to the ball of the foot, ankles stacked' },
  { id: 'toe-stretch-kneel',  cat: 'stretch', name: 'Kneeling Toe Stretch',mode: 'time', target: 60, anim: 'toekneel',  cue: 'Sit back over the toes, plantar fascia opens' },
  { id: 'arch-pointe-stretch',cat: 'stretch', name: 'Arch & Pointe Stretch',mode: 'time', target: 60, anim: 'archpointe', cue: 'Top of the foot on the floor, press the arch forward' },

  // ————— Stretching · Psoas & hip flexors —————
  { id: 'psoas-march',        cat: 'stretch', name: 'Psoas March',            mode: 'time', target: 60, anim: 'march',    cue: 'Slow knee lifts above 90°, no lean back' },
  { id: 'low-lunge',          cat: 'stretch', name: 'Low Lunge',              mode: 'time', target: 60, anim: 'lowlunge', side: true, cue: 'Tuck the pelvis, squeeze the back glute' },
  { id: 'couch-stretch',      cat: 'stretch', name: 'Couch Stretch',          mode: 'time', target: 60, anim: 'couch',    side: true, cue: 'Back foot up the wall, torso rises slowly' },
  { id: 'lizard',             cat: 'stretch', name: 'Lizard Pose',            mode: 'time', target: 60, anim: 'lizard',   side: true, cue: 'Both hands inside the front foot' },
  { id: 'constructive-rest',  cat: 'stretch', name: 'Constructive Rest',      mode: 'time', target: 60, anim: 'crest',    cue: 'On the back, knees bent — let the psoas let go' },
  { id: 'standing-hip-ext',   cat: 'stretch', name: 'Standing Hip Extension', mode: 'time', target: 60, anim: 'hipext',   side: true, cue: 'Leg reaches back, pelvis stays level' },

  // ————— Stretching · Hamstrings —————
  { id: 'elephant-walks',     cat: 'stretch', name: 'Elephant Walks',      mode: 'time', target: 60, anim: 'elephant', cue: 'Fold, alternate bending one knee at a time' },
  { id: 'forward-fold',       cat: 'stretch', name: 'Forward Fold',        mode: 'time', target: 60, anim: 'fold',     cue: 'Hang heavy, shake the head no' },
  { id: 'single-leg-hamstring', cat: 'stretch', name: 'Single-leg Hamstring', mode: 'time', target: 60, anim: 'slham', side: true, cue: 'On the back, leg to the ceiling with a strap' },
  { id: 'hinge-fold',         cat: 'stretch', name: 'Hinge Fold',          mode: 'time', target: 60, anim: 'hinge',    cue: 'Fold from the pelvis, spine stays long' },
  { id: 'half-split',         cat: 'stretch', name: 'Half Split',          mode: 'time', target: 60, anim: 'halfsplit', side: true, cue: 'Runner’s stretch — hips square over the knee' },
  { id: 'hurdler',            cat: 'stretch', name: 'Hurdler Stretch',     mode: 'time', target: 60, anim: 'hurdler',  side: true, cue: 'One leg long, fold over it' },
  { id: 'rolldown',           cat: 'stretch', name: 'Slow Rolldown',       mode: 'time', target: 60, anim: 'rolldown', cue: 'Vertebra by vertebra, knees soft' },

  // ————— Stretching · Front split (espacate) —————
  { id: 'lunge-pulses',       cat: 'stretch', name: 'Lunge Pulses',            mode: 'time', target: 60, anim: 'lungepulse', side: true, cue: 'Small sinks, back knee hovers' },
  { id: 'lunge-halfsplit-flow', cat: 'stretch', name: 'Lunge ⇄ Half-split Flow', mode: 'time', target: 60, anim: 'lungeflow', side: true, cue: 'Glide between the two shapes' },
  { id: 'pigeon',             cat: 'stretch', name: 'Pigeon Pose',             mode: 'time', target: 60, anim: 'pigeon',     side: true, cue: 'Front shin across, hips level, fold' },
  { id: 'standing-quad',      cat: 'stretch', name: 'Standing Quad Pull',      mode: 'time', target: 60, anim: 'quadpull',   side: true, cue: 'Heel to glute, knees together, tuck' },
  { id: 'front-split',        cat: 'stretch', name: 'Front Split · Espacate',  mode: 'time', target: 60, anim: 'frontsplit', side: true, cue: 'Blocks under the hands, hips square, exhale down' },
  { id: 'split-pnf',          cat: 'stretch', name: 'Split PNF Press',         mode: 'time', target: 60, anim: 'splitpnf',   side: true, cue: 'Press both legs into the floor 10 s, release deeper' },

  // ————— Stretching · Pancake & middle split —————
  { id: 'butterfly',          cat: 'stretch', name: 'Butterfly',            mode: 'time', target: 60, anim: 'butterfly', cue: 'Soles together, lean from the hips' },
  { id: 'ninety-ninety',      cat: 'stretch', name: '90/90 Hold',           mode: 'time', target: 60, anim: 'nineninety', side: true, cue: 'Both knees at 90°, chest over the front shin' },
  { id: 'frog-rocks',         cat: 'stretch', name: 'Frog Rocks',           mode: 'time', target: 60, anim: 'frogrock',  cue: 'Knees wide, rock gently back' },
  { id: 'frog-hold',          cat: 'stretch', name: 'Frog Hold',            mode: 'time', target: 60, anim: 'frog',      cue: 'Sink and breathe, ankles in line with knees' },
  { id: 'horse-stance',       cat: 'stretch', name: 'Horse Stance',         mode: 'time', target: 60, anim: 'horse',     cue: 'Wide squat, knees track over toes' },
  { id: 'straddle-side-reach',cat: 'stretch', name: 'Straddle Side Reach',  mode: 'time', target: 60, anim: 'straddleside', side: true, cue: 'Reach over the leg, chest open' },
  { id: 'straddle-center',    cat: 'stretch', name: 'Straddle Center Reach',mode: 'time', target: 60, anim: 'straddlecenter', cue: 'Walk the hands forward, back flat' },
  { id: 'pancake-fold',       cat: 'stretch', name: 'Pancake Fold',         mode: 'time', target: 60, anim: 'pancake',   cue: 'Tip the pelvis, chest leads the fold' },
  { id: 'cossack',            cat: 'stretch', name: 'Cossack Squat Hold',   mode: 'time', target: 60, anim: 'cossack',   side: true, cue: 'Slide to one side, other leg long' },
  { id: 'wall-straddle',      cat: 'stretch', name: 'Wall Straddle',        mode: 'time', target: 60, anim: 'wallstraddle', cue: 'Legs open against the wall — gravity works' },
  { id: 'wide-leg-fold',      cat: 'stretch', name: 'Wide-leg Fold',        mode: 'time', target: 60, anim: 'widefold',  cue: 'Feet wide, fold and hold the ankles' },

  // ————— Stretching · Back & spine —————
  { id: 'sphinx-cobra',       cat: 'stretch', name: 'Sphinx → Cobra',   mode: 'time', target: 60, anim: 'cobra',     cue: 'Press up gently, hips heavy' },
  { id: 'puppy-pose',         cat: 'stretch', name: 'Puppy Pose',       mode: 'time', target: 60, anim: 'puppy',     cue: 'Hips high, chest melts to the floor' },
  { id: 'chest-opener',       cat: 'stretch', name: 'Chest Opener',     mode: 'time', target: 60, anim: 'chestopen', cue: 'Forearms on a support, chest sinks through' },
  { id: 'childs-side-reach',  cat: 'stretch', name: 'Child’s Side Reach', mode: 'time', target: 60, anim: 'childside', side: true, cue: 'Walk both hands to one corner' },
  { id: 'supine-twist',       cat: 'stretch', name: 'Supine Twist',     mode: 'time', target: 60, anim: 'twist',     side: true, cue: 'Knee across, both shoulders down' },
  { id: 'bridge-hold',        cat: 'stretch', name: 'Bridge Hold',      mode: 'time', target: 60, anim: 'bridge',    cue: 'Press through the heels, open the front line' },

  // ————— Stretching · Glutes & finish —————
  { id: 'figure-four',        cat: 'stretch', name: 'Figure-4',       mode: 'time', target: 60, anim: 'fig4',       side: true, cue: 'Ankle over knee, pull the shin in' },
  { id: 'glute-bridge',       cat: 'stretch', name: 'Glute Bridge',   mode: 'time', target: 60, anim: 'glutebridge', cue: 'Slow reps or hold at the top — glutes only' },
  { id: 'hip-airplane',       cat: 'stretch', name: 'Hip Airplane',   mode: 'time', target: 60, anim: 'airplane',   side: true, cue: 'Hinge on one leg, rotate the pelvis open and closed' },
];

export const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// ————————————————————————————————————————————————————————————————
// The Corpo routine — built from the "Corpo" playlist (@gabriel_om).
// 80 slots × (60 s hold + 30 s rest) = exactly 2 h.
// Focus: front split (espacate) · pancake opening · feet & ballet.
// Items: [exerciseId] = one slot · [exerciseId, 'LR'] = one slot per side.
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
      ], // 8 slots
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
      ], // 13 slots
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
      ], // 10 slots
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
      ], // 10 slots
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
      ], // 12 slots
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
      ], // 14 slots
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
      ], // 8 slots
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
      ], // 5 slots
    },
  ],
};

// Expand routine blocks into a flat list of slots: {ex, side, block, iInBlock}
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

export const SLOT_SECONDS = ROUTINE.hold + ROUTINE.rest; // 90
export function routineTotalSeconds() { return routineSlots().length * SLOT_SECONDS; }
