# Exercises — full project handoff

> **Archived reference — do not read as current documentation.**
> This is the **initial handoff, written in a different (earlier) chat thread** — the
> session that first designed and built this app — and carried over here so the original
> brief, decisions and source material are not lost. Everything below describes the app as
> it stood in **July 2026**. The app has changed substantially since (figures, theme,
> sections, routine structure) and it has long since been pushed and deployed, so the
> "pending push" in §8 is resolved. See [`README.md`](README.md) in this folder for the
> list of what has changed. The text below is left exactly as it was written.

---

> Complete reference export of the session that designed and built this app
> (July 2026). Written so a fresh thread can pick up with zero context loss.
> The app itself is finished and verified; only the push to GitHub is pending.

---

## 1. What the user asked for (chronological)

The requirements arrived across several messages and evolved. Final state of each:

**Original brief**
- An exercise app, hosted on **GitHub Pages**, ideally a **PWA** ("add to home screen, works as an app").
- Concern raised: "can it work if I can only use localStorage?" → **Yes.** localStorage is client-side; static hosting is fine. No server needed.
- Four kinds of exercise, **each with its own section**: **Gym, Stretching, Push-ups, Pull-ups**.
- Interface "akin to Pinterest" — each exercise set has its own card.
- Ability to **choose which exercises** to do, and to **count** them.
- Some exercises by **count (reps)**, some by **time** → a **toggle inside each exercise**.
- Each exercise gets its own little animation — user suggested **Zdog** for lightweight animation.
- The **plan document must be HTML, not MD** → shipped as `PLAN.html`.
- Future ambition (not built): a **companion watch app** that counts reps automatically so he doesn't have to count manually.

**Revision 1 — no edit mode**
- "I don't want the edit mode because all the exercises will need to have their own animation, therefore they need to be built beforehand."
- → Catalog is **fixed and pre-built**. No create/edit UI.
- Follow-up answer: **no selection/picker at all** — every predefined exercise is always visible; section chips are the only filtering.

**Revision 2 — the stretching routine**
- Wanted a **2-hour routine focused only on stretching and mobility**, derived from his own YouTube playlist.
- **1 minute per stretch**, **30-second pause between exercises**.
- Focus: **"lower parts", opening a full split, and pancake opening**.
- Also wanted **feet exercises and ballet exercises**.
- Wanted it minimalistic.

**Revision 3 — the big UI change (most important)**
- **Remove the rep-counting tap button.** Instead: **select how many reps** you want.
- **No manual navigation between exercises** — tap that it's done → **automatically moves to the next exercise**.
- On mobile: **two exercises per row** (2-column grid).
- Tapping one **expands it to full screen**.
- After done → auto-advance to next. If it's a **timer, it starts automatically**.
- Going back shows the **2-column list to scroll through**.
- **"The Zdog animations look really bad."** Suggested searching for images/videos of each exercise and making vectors/sketches from them, or going static.

**Revision 4 — final art direction**
- **"I don't want real images, I want things akin to a drawing, would be better if it was SVG."**
- → This is exactly what shipped. **Zero photographs.** All 121 figures are generated **SVG line drawings**.

---

## 2. Decisions locked in (via explicit Q&A)

| Question | Decision |
|---|---|
| Repo name | Started as `workout`, then user redirected to the **existing `gabrielom/exercises` repo** |
| Animation approach | Zdog → **abandoned** → **generated static SVG pictograms** |
| Save history? | **Yes** — every logged set persisted, with JSON export/import |
| UI language | **English** (Portuguese original names kept alongside gym exercises) |
| Exercise selection | **None** — fixed catalog, always visible, chips filter only |
| Gym catalog source | **User's real training program** (pasted in Portuguese), all groups included |
| Feet / ballet work | **Included** as a standard pre-built block |
| Routine source | User's **"Corpo"** playlist (@gabriel_om) — successfully scraped, see §5 |

---

## 3. What was built (final state)

A static, dependency-free PWA. **No build step, no framework, no npm dependencies.**

```
index.html              app shell (header, tab bar, view container, player overlay)
css/style.css           theme tokens (light/dark/auto), 2-col grid, fullscreen player
js/data.js              THE catalog: 121 exercises + the Corpo routine definition
js/app.js               grid rendering, fullscreen player, history, export/import, theme
js/routine.js           guided 60s-hold / 30s-rest routine engine
js/store.js             localStorage wrapper (namespaced `exercises.*`), log, prefs, backup
img/*.svg               121 generated figures (~4 KB each, 488 KB total)
tools/genfigs.mjs       the figure generator (2D FK skeleton + equipment line-work)
tools/poses.mjs         one hand-tuned pose spec per exercise (plain numbers, editable)
sw.js                   cache-first service worker, VERSION='exercises-v2', precaches all figures
manifest.webmanifest    PWA manifest (standalone, start_url './', scope './')
icons/                  favicon.svg + 192/512/maskable PNGs (split-figure dumbbell mark)
PLAN.html               the styled plan document (user explicitly wanted HTML)
README.md               live URL, Pages setup steps, structure
.nojekyll               stops GitHub Pages running Jekyll
```
138 files, 672 KB total. Two commits: `17c2194` (v1) and `983c9d2` (v2).

### How the app behaves

**Grid view** — 2 columns on mobile, 3/4/5 on wider screens. Chips: All · Gym · Stretching · Push-ups · Pull-ups. Selecting **Gym** reveals sub-chips for the four program groups, and section headers when viewing all groups. Each card: SVG figure, name, weight badge (kg), target reps or time, and a **✓ when done today**.

**Fullscreen player** — tapping any card opens it full-screen over the app.
- Shows figure, English name, Portuguese name, weight badge, "per side" badge, cue text, and a **Reps ⇄ Timer toggle**.
- **Reps mode:** a big **− / value / +** stepper (no tap-counting). Defaults to the exercise's target, then **remembers your last chosen number** for that exercise. Big **Done** button logs `{reps, weight}` and **auto-advances**, sliding the next exercise in.
- **Timer mode:** countdown **starts automatically** on entry. Tap the clock to pause/resume. At zero: chime + vibration, auto-log, auto-advance. "Done early" logs the elapsed time.
- Progress `n / total` in the header, `Next · <name>` at the bottom, a back-arrow for the previous exercise, and ✕ to return to the grid.
- Finishing the last exercise shows a **Done.** summary screen.

**Routine tab** — the Corpo overview (block list, totals) with **Start** / **Resume · n/80**. The player auto-advances hold → rest → next hold, shows "next up" during rests, has a progress bar and remaining-time countdown, pause/skip/back/exit, chimes and vibration on transitions, Wake Lock while running, and **resumes where you left off after a reload**. Every completed hold is auto-logged.

**History tab** — sets grouped by day (Today / Yesterday / date), per-exercise totals with reps, time and weight; 7-day summary line. **Export** downloads a JSON backup, **Import** restores it, **Reset data** clears everything.

**Theme** — auto / light / dark, toggled from the header, persisted.

### Data model (localStorage)

All keys are prefixed `exercises.` because every `*.github.io` project site shares one localStorage origin.

| Key | Contents |
|---|---|
| `exercises.v` | schema version (1) |
| `exercises.log` | append-only array of sets: `{t, d, ex, mode, v, w?, side?, routine?}` |
| `exercises.prefs` | per-exercise `{mode, reps}` overrides |
| `exercises.routine` | Corpo resume state `{i, phase, remaining, started}` |
| `exercises.settings` | `{theme}` |

`t` = epoch ms, `d` = local `YYYY-MM-DD`, `v` = reps or seconds, `w` = kg.
**This JSON shape is the intended sync contract for the future watch app** — a watch that counts reps can emit the same entries and merge via import.

---

## 4. The gym catalog (user's real program)

57 exercises in 4 groups, English name + original Portuguese + working weight. Taken verbatim from the user's pasted routine.

### Série A (16)
| kg | English | Português |
|---|---|---|
| 40 | Pec Deck Fly | Peitoral Dorsal |
| 50 | Chest Press Machine | Chest Press |
| 28 | Flat Bench Press | Supino Reto |
| 28 | Decline Bench Press | Supino Declinado |
| 28 | Incline Bench Press | Supino Inclinado |
| 35 | Triceps Pushdown | Tríceps Juntado Cross |
| 15 | Single-arm Pushdown | Tríceps Unilateral Cross |
| 25 | Cable Leg Extension | Extensor Cross |
| 7 | Ankle-weight Extension | Extensor Caneleira |
| 40 | Lying Leg Curl | Flexor Deitado |
| 20 | Standing Leg Curl | Flexor em Pé |
| 75 | Hip Abductor Machine | Abdutor |
| 75 | Hip Adductor Machine | Adutor |
| 7 | Ankle-weight Side Raise | Abdutor Caneleira |
| 7 | Ankle-weight Inner Raise | Adutor Caneleira |
| 70 | Ab Crunch Machine | Abdominal Máquina Bola |

### Série B (13)
| kg | English | Português |
|---|---|---|
| 40 | Horizontal Pull Machine | Puxador Horizontal |
| 40 | Underhand Lat Pulldown | Puxador Vertical Supinada |
| 40 | Seated Row · High | Remada Sentado Cima |
| 40 | Seated Row · Mid | Remada Sentado Médio |
| 40 | Seated Row · Low | Remada Sentado Baixo |
| 20 | Preacher Curl | Rosca Scott |
| 10 | Single-arm Cable Curl | Rosca Unilateral Cross |
| 90 | Leg Press 90° | Legpress 90 |
| 160 | Leg Press 45° | Legpress 45 |
| 140 | Horizontal Leg Press | Legpress Horizontal |
| 130 | Calf Press on Leg Press | Panturrilha Legpress |
| 10 | Hip Raise on Step | Elevação Quadril Step |
| 0 | Single-leg Hip Raise (Ball) | Elevação Quadril Bola P.E/P.D |

### Nova série · Treino 1 (14)
| kg | English | Português |
|---|---|---|
| 30 | Smith Machine Bench Press | Supino Barra Guiada |
| 28 | Dumbbell Bench Press | Supino Dumbbell |
| 20 | Incline Dumbbell Fly | Crucifixo Inclinado Halteres |
| 5 | Single-arm Cable Crossover | Crossover Unilateral |
| 40 | Cable French Press | Tríceps Francês Cross Supinado |
| 20 | Single-arm French Press | Tríceps Francês Unilateral |
| 100 | Hip Thrust | Elevação Pélvica |
| 36 | Smith Machine Lunge | Avanço Barra Guiada |
| 24 | Sumo Squat | Sumô |
| 0 | Bulgarian Split Squat | Agachamento Búlgaro |
| 0 | Calf Raise | Panturrilha |
| 0 | Single-leg Calf Raise | Panturrilha Unilateral |
| 0 | Plank Hold *(45 s timer)* | Abdominal Isometria |
| 0 | Crunches | Abdominal |

### Nova série · Treino 2 (14)
| kg | English | Português |
|---|---|---|
| 35 | Lat Pulldown Machine | Dorsal |
| 35 | Single-arm Lat Pulldown | Dorsal Unilateral |
| 45 | V-bar Lat Pulldown | Puxada Vertical Triângulo |
| 14 | Single-arm Dumbbell Row | Remada Unilateral Dumbbell |
| 55 | Rope Pulldown | Puxada Corda Cross |
| 16 | Biceps Curl · 21s | Rosca 21 |
| 9 | Concentration Curl | Rosca Concentrada |
| 70 | Leg Extension · Iso Hold *(30 s timer)* | Extensor Isometria |
| 70 | Leg Extension · Both | Extensor Junto |
| 35 | Leg Extension · Single | Extensor Unilateral |
| 20 | Single-leg Lying Curl | Flexor Unilateral Deitado |
| 75 | Hip Abductor 45° · Iso *(30 s timer)* | Abdutor 45 / Isometria |
| 70 | Hip Adductor 45° · Iso *(30 s timer)* | Adutor 45 / Isometria |
| 0 | Back Extension | Flexão Lombar |

**Push-ups (5):** Push-up · Wide · Diamond · Incline · Knee.
**Pull-ups (5):** Pull-up · Chin-up · Negative · Scapular Pull · Dead Hang (30 s).
**Stretching (54):** listed in the routine below; all usable standalone too.

---

## 5. The "Corpo" routine

Built from the user's YouTube playlist **"Corpo"** (channel **@gabriel_om**, playlist id
`PLrO-qJFePZuxuVqK3V3O8IFQKQl_fYzsu`, **90 videos**, last updated Jun 17 2025).
The playlist was successfully scraped once network access was enabled — the mobility/stretching
content was filtered out of it and mapped to three goals: **front split (espacate)**,
**pancake opening**, and **feet / ballet work**.

**Format: 80 slots × (60 s hold + 30 s rest) = exactly 2 hours.** Bilateral stretches take one slot per side.

| Block | Slots | Stretches (×2 = per side) |
|---|---|---|
| **Warm-up** | 8 | Neck Rolls · Cat–Cow · Thoracic Rotation ×2 · Hip CARs ×2 · Deep Squat Hold · Down Dog → Walk |
| **Feet & Ankles** | 13 | Ankle Circles ×2 · Knee-over-toe Rocks ×2 · Wall Calf ×2 · Soleus ×2 · Foot Doming · Point & Flex · Relevé Holds · Kneeling Toe Stretch · Arch & Pointe Stretch |
| **Psoas & Hip Flexors** | 10 | Psoas March · Low Lunge ×2 · Couch Stretch ×2 · Lizard ×2 · Constructive Rest · Standing Hip Extension ×2 |
| **Hamstrings** | 10 | Elephant Walks · Forward Fold · Single-leg Hamstring ×2 · Hinge Fold · Half Split ×2 · Hurdler ×2 · Slow Rolldown |
| **Front Split · Espacate** | 12 | Lunge Pulses ×2 · Lunge ⇄ Half-split Flow ×2 · Pigeon ×2 · Standing Quad ×2 · Front Split ×2 · Split PNF Press ×2 |
| **Pancake & Middle Split** | 14 | Butterfly · 90/90 ×2 · Frog Rocks · Frog Hold · Horse Stance · Straddle Side Reach ×2 · Straddle Center · Pancake Fold · Cossack ×2 · Wall Straddle · Wide-leg Fold |
| **Back & Spine** | 8 | Sphinx → Cobra · Puppy Pose · Chest Opener · Child's Side Reach ×2 · Supine Twist ×2 · Bridge Hold |
| **Glutes & Finish** | 5 | Figure-4 ×2 · Glute Bridge · Hip Airplane ×2 |

Each block records its source videos in `js/data.js` (`sources: [...]`). Key sources:
Calisthenicmovement (mobility), PsycheTruth (ballet feet, splits), Alivia D'Andrea (arch, middle split, back),
YOGABODY & Barefoot Strength (ankles, hamstrings, glutes), Precision Movement / Neal Hallinan / Conor Harris /
Your Wellness Nerd (psoas), Strength Side (hamstrings, pancake, squats), Geek Climber & MOVEBLOCKS (pancake),
jumorosi (espacate tutorials, PT), blogilates & Boho Beautiful (splits), Julyanna Werneck (PT hamstrings),
Lazy Dancer Tips & Ballet OnLine (ballet), Kathryn Morgan (barre).

### Playlist contents as scraped (87 of 90 readable; 3 were unavailable/hidden)

Kept here because network access to YouTube may be blocked in a future session.

1. How to Stretch Properly | Ballet Dance — HowcastArtsRec (2:40)
2. Svetlana Zakharova - Stretching & Warm-up in Italy — Class ACT presents (3:15)
3. The 10 Most Important Mobility & Flexibility Exercises — Calisthenicmovement (7:03)
4. The Rules of Ballet - Auditions Day 1 | JOFFREY ELITE EP 1 — Awesomeness (8:24)
5. How to improve your arch | feet flexibility — Alivia D'Andrea (9:19)
6. High Half Pointe Shoe and its Secrets — Ballet OnLine - Mari (9:51)
7. BASIC STRETCHING OF THE BASICS - Starting from scratch — Jubaloo (10:37)
8. Splits Flexibility Ballet Stretches | Kat Rogers — PsycheTruth (11:05)
9. HOW TO DO THE SPLITS — Train Like a Ballerina (1:02)
10. HOW TO GET FLEXIBLE! — Claudia Dean World (12:38)
11. A Ballerina's Entire Routine, From Waking Up to Showtime — Allure (13:10)
12. First Chiropractic Adjustment | LOUD full-body CRACKS on Ballet Dancer — Lais DeLeon (15:31)
13. Stretches for the Inflexible! Beginner Flexibility Routine — Anna McNulty (15:51)
14. Ballet Beautiful | Lean Legs & Buns Workout — Ballet Beautiful (15:55)
15. Full Body Stretching Routine | Intermediate to Advanced — Alivia D'Andrea (16:56)
16. Intense middle split stretching routine — Alivia D'Andrea (17:18)
17. SDC Technical Warm Up — Sharmila Kamte (18:37)
18. Stretches for the Inflexible! Complete Beginners Flexibility with Nico — PsycheTruth (19:23)
19. Aula de Ballet para fazer em casa com as crianças — Professora Anaysis Santin (19:58)
20. Full Body Flexibility Routine (20 Minute Follow Along) — Kathryn Morgan (22:30)
21. Dance Foot Exercises & Stretches ... Flat Feet and Ballet Pointe — PsycheTruth (23:13)
22. Ballet Total Body DEEP Stretching — Lazy Dancer Tips (24:50)
23. Beginner Ballet Barre (No Talking) | 25 Min MUSIC ONLY — Kathryn Morgan (27:19)
24. Flexibility Stretches For Dancers, Cheerleaders, Ballet, Gymnasts & The Splits — PsycheTruth (29:26)
25. Contemporary Dance Class I Warmup & Choreography — BodyKinect by Kendall (41:05)
26. Alongamento Para Ballet e Alívio de Dores 🩰 — Pariz Arte em Dança (42:30)
27. Ballet Class at Home #1 — Grand Art Ballet Dance Studio (56:04)
28. Full Body Strength & Stretch Workout | 55 Min Class for Dancers — Kathryn Morgan (57:01)
29. 60 Min Intermediate/Advanced Ballet Barre — Kathryn Morgan (59:43)
30. Aula Prática de Alongamento Para Arabesque — Ballet OnLine - Mari (1:02:01)
31. Contemporary Dance Class | London Contemporary Dance School — The Place (1:13:58)
32. The Royal Ballet Full Class - World Ballet Day 2014 — Royal Ballet and Opera (1:16:07)
33. Ashtanga Primary Series | Ty Landrum — Ty Landrum (2:25:01)
34. Ashtanga Yoga Full Primary Series with Ty Landrum — Sigismondi (1:27:46)
35. 30 Minute Stretches for Splits! — blogilates (32:29)
36. Beginner's Back flexibility stretches — Alivia D'Andrea (8:36)
37. Full Splits In 14 Days ♥ — Boho Beautiful Yoga (18:16)
38. Front & Middle Splits In 14 Days | Yoga Splits Challenge — Boho Beautiful Yoga (27:36)
39. Learn To Headstand & Elbow Stand Easily — Boho Beautiful Yoga (10:59)
40. The Royal Ballet morning class in full - World Ballet Day 2018 — Royal Ballet and Opera (1:12:53)
41. Calisthenics Skills Anyone Can Learn — Lucy Lismore (14:15)
42. at home ballet and workout routine — Tristan Simpson (16:26)
43. Como Dançar Os Passinhos De Funk Com NGKS? — Portal KondZilla (3:12)
44. I Trained with an Elite Ballet Dancer — Natacha Océane (19:31)
45. 100 Bodyweight Exercises Ranked — Calisthenicmovement (13:33)
46. Trampsta - Work (Video) — Trampsta (4:25)
47. How to master AMAZING SPLIT LEAPS! — Claudia Dean World (6:07)
48. O DON QUIXOTE — MIKHAIL BARYSHNIKOV E CINTHIA HARVEY (1:25:49)
49–54. Espetáculo "O GRANDE SHOW" (6 clips) — Zirkus Espaço Cultural
55. DOM QUIXOTE 2022 - DIA 03 — Imprensa FUNCART (2:01:07)
56. DOM QUIXOTE 2022 - INFANTIL — Imprensa FUNCART (1:53:02)
57. SPOTLIGHT ON BAZZAR | Cirque du Soleil (36:18)
58. COMO TOCAR OS PÉS SEM DOBRAR OS JOELHOS — Julyanna Werneck (16:01)
59. Unlock Your Hamstrings Fast — Cathy Madeo Yoga (5:35)
60. How to Increase Ankle Mobility in 3 Steps — Barefoot Strength (10:52)
61. Your Psoas Isn't Just Tight, It's WEAK — Precision Movement (18:53)
62. Releasing the Psoas: It's About the Brain — Neal Hallinan (31:08)
63. Unlock Ankle Mobility (3 guided exercises) — YOGABODY (16:23)
64. The Secret To Psoas Tightness On One Side — Conor Harris (15:20)
65. How to Permanently Loosen a Tight Psoas — Your Wellness Nerd (15:39)
66. Don't Transition to Minimalist/Barefoot Shoes Until You Watch This — Neal Hallinan (24:20)
67. Releasing the Psoas: The THREE things your brain MUST sense — Neal Hallinan (17:56)
68. Fix Your Squat (In Just 3-Minutes) — Calisthenicmovement (3:42)
69. Natural Mobility and Pain relief with the Resting Squat — Mover's Odyssey (4:40)
70. How Squats Heal the Body — Strength Side (9:52)
71. How to Reset Your Pelvis For Flexible Hamstrings — Barefoot Strength (12:33)
72. The REAL WAY to UNLOCK YOUR HAMSTRINGS — Strength Side (13:26)
73. How to Get Hamstrings So Flexible You Never Need to Stretch Again — Barefoot Strength (8:33)
74. How To Grow The Biggest Muscle In Your Body (Glute Science) — Barefoot Strength (10:54)
75. My 5-Day Glute Transformation Experiment — Barefoot Strength (7:58)
76. The Best Way to Build Strength AND Flexibility (ft. Kneesovertoesguy) — Institute of Human Anatomy (14:03)
77. 10 Minutes to Perfect Mobility – Full Routine — Calisthenicmovement (13:07)
78. Why Most Stretches Don't Work – Science-Backed Tips for Dancers — Dance Masterclass (3:04)
79. The Key to Flexibility Everyone Misses — Strength Side (10:12)
80. This Stiff Guy Learns the Pancake Fold in 107 Days — Geek Climber (8:56)
81. How to Pancake Stretch (Beginner to Advanced) — Strength Side (10:39)
82. How To Fix A Rounded Back In Your Pancake? — MOVEBLOCKS (8:09)
83. COMO ZERAR A ABERTURA DE FRENTE? — jumorosi (ginasta) (6:42)
84. TUTORIAL: ESPACATE passo a passo — jumorosi (ginasta) (9:04)
85. 10 ERROS QUE TE DEIXAM MENOS FLEXÍVEL — Lu Corti (13:53)
86. Trabalho de Fortalecimento para as Pernas / ballet 🩰 — Claryssa Barbosa (19:19)
87. Recording drums using Drum pad mode in Ableton Live (2:34) *(unrelated)*

---

## 6. The figure system (replaces Zdog)

**No photographs, no external images, no licensing.** Every figure is a small SVG drawing
generated by code in this repo.

- `tools/genfigs.mjs` — a 2D **forward-kinematics skeleton renderer**. Joints chain from the hips:
  torso → waist → chest → head, plus two arms (shoulder/elbow) and two legs (hip/knee/ankle/foot).
  Back-side limbs draw in a lighter tint for depth. Equipment is drawn as grey line-work anchored to
  the figure's computed hand/foot positions, so a barbell really sits in the hands and a leg-press
  sled really sits at the feet. Props available: `floor, wallL, wallR, barbell, dumbbells, dumbbellF,
  cableHigh, cableLow, pulldownBar, pullupBar, bench(angle), machine, sled, step, stool, box, ball`.
  Per-figure options: `zoom`, `noGround`, and an `extra(k, u)` hook for one-off line-work.
- `tools/poses.mjs` — one entry per exercise id: joint angles in degrees plus the prop list.
  Shared bases: `STAND, SEAT, FLOORSIT, KNEEL, QUAD`.
- Regenerate everything with **`node tools/genfigs.mjs`** → writes `img/<id>.svg` (121 files).
- Angle conventions are documented at the top of `poses.mjs`. Positive `torso` leans forward/right;
  `hip` is thigh angle from straight-down; negative `knee` is anatomical flexion.
- Colors are hardcoded (`#e8642c` figure, `#f0956e` far limbs, `#a8a49c` equipment) so they read on
  both light and dark backgrounds.

**Tuning history:** the first pass had several inverted-sign poses (lying/quadruped/fold shapes
drawn upside-down or with legs on the wrong side). These were found by rendering contact sheets of
all 121 figures and reviewing them visually, then fixed. If a pose ever looks wrong, render a
contact sheet again rather than guessing — it takes seconds and shows everything at once.

---

## 7. Verification

A Playwright suite drove the real app in headless Chromium (`/opt/pw-browsers/chromium`) against
`python3 -m http.server`. **34/34 checks passed**, including:

- 121 cards render; figures actually paint; chips and gym sub-groups filter correctly (57 gym, 14 in Treino 1)
- Player: opens fullscreen, shows PT name + weight, stepper +/− works, **Done auto-advances**, progress `n/total` updates, previous-arrow works, **reps are remembered per exercise**
- **Timers auto-start** (0:45 → 0:42 after fast-forwarding 3 s), complete → auto-log → auto-advance
- Mode toggle switches stepper ⇄ countdown inside the player
- Finishing the last exercise shows the Done screen
- ✓ badge appears on the grid after logging
- Routine: starts, figure loads, auto-advances hold → rest, resume-after-reload works
- History shows sets with weights; export downloads valid JSON
- Service worker registers; **offline reload still renders the whole app**
- `PLAN.html` renders; **zero page errors**

Playwright's virtual clock (`page.clock.install()` / `fastForward`) was used to test the 60 s and
2 h timers instantly — worth reusing for any future timer work.

---

## 8. Outstanding item: getting it onto GitHub

**The app is complete and committed. It has never been pushed.** Everything below was tested in the
session and failed for permission reasons — none of it is a code problem.

| Attempt | Result |
|---|---|
| `git push` to `gabrielom/exercises` | **403** — the session's git proxy only holds a credential for `gabrielom/espanol` |
| GitHub MCP write tools on `exercises` | **"Access denied: repository not configured for this session. Allowed repositories: gabrielom/espanol"** |
| Create a new repo named `routine` via API | **403 "Resource not accessible by integration"** — this token cannot create repos at all, so a different repo name does not help |
| `add_repo` (the intended fix) | **Auto-denied instantly** — the client appears to have stored a "deny" decision from the first prompt; no dialog ever appears |

**The clean path (no secrets, ~2 minutes):**

1. New session at claude.ai/code with **`gabrielom/exercises` selected as the session's repository**
   (repos chosen at session creation are pre-authorized — that is how `espanol` got into this one).
2. Attach **`exercises.bundle`** (a git bundle containing both commits) and say:
   > *The attached exercises.bundle is a git bundle with the finished app (2 commits). Fetch main from it, make it this repo's main branch content, and push.*
   `exercises-v2.zip` (plain files, no history) works as a fallback.
3. Then, one manual step no API can do: repo **Settings → Pages → Build and deployment →
   Source: Deploy from a branch → `main` / `(root)` → Save.**
4. Live at **https://gabrielom.github.io/exercises/** → open on the phone → **Add to Home Screen**.

Alternatives if preferred: paste a fine-grained PAT scoped to just that repo (Contents: Read & write)
and an agent can push directly; or upload the unzipped files on github.com by hand.

---

## 9. Ideas discussed but not built

- **Watch companion app** that counts reps automatically and syncs via the existing JSON schema — the original motivation for logging shape.
- Re-syncing the Stretching catalog when the "Corpo" playlist changes.
- Streaks and simple charts in History.
- Per-block configurable hold/rest durations.
- Rest timers between gym sets.

---

## 10. Useful facts for the next session

- **Node is available** (v22) and **Chromium is preinstalled** at `/opt/pw-browsers/chromium`
  (use `playwright-core` with `executablePath`; never run `playwright install`).
- YouTube was reachable only after the user changed the environment's network policy; a **fresh
  container is needed** for a policy change to take effect reliably. The playlist parse needed the
  `lockupViewModel` shape (YouTube's newer renderer), not `playlistVideoRenderer`.
- To bump the deployed app: edit files, then **increment `VERSION` in `sw.js`** or clients keep the
  old cached copy.
- `sw.js` precaches an explicit file list including all 121 SVGs — **regenerate that list if figures
  are added or removed**.
- The app is served from a subpath (`/exercises/`), so all asset paths are **relative** and the
  service worker registers as `./sw.js`. Keep it that way.
