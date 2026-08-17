# Design brief 04 — code → design

Everything the Exercises app has grown since **design handoff 03 (turn 8)** landed, written
so the design side can bring its boards up to date without re-deriving anything from the
repo — followed by the one problem that is still open.

**Two jobs, in this order.**

1. **Catch the design up to the code.** Sections 1–7 are already built, shipped and live.
   They were made in code, in conversation, without going through the design process, so the
   design file is now behind the product. Redraw the boards to match what is described here.
   None of it is a proposal; all of it is the current app.
2. **Then design the one open thing** — section 8: inside a running routine, the Up-next
   thumbnails are cut off behind the tab bar, and the transport controls need rearranging to
   make room. **At least four options, please.**

---

## 0. Where things stand

| | |
|---|---|
| Live | https://gabrielom.github.io/exercises/ (GitHub Pages, deployed from `main`) |
| Build | `v75` |
| Stack | Vanilla JS ES modules. No framework, no build step, no dependencies. |
| Files | `js/app.js`, `js/store.js`, `js/sync.js`, `js/routine.js`, `js/data.js`, `css/style.css` |
| Design baseline | commit `a77e0b5` — *"Implement design handoff 03 (turn 8): grid, routine and history"* |
| Landed since | 36 commits |

### One part of handoff 03 was reverted — please drop it from the design

Handoff 03 §8a replaced the Exercises home screen's sub-group filter with stacked série
sections. That removed real navigation: you could no longer filter Gym down to a single série
(A–H) or Stretching to a single block, and the **All** tab disappeared. It was a functional
change wearing a visual costume, so it was reverted in `9e2302d`.

**The Exercises home screen is byte-for-byte its pre-handoff-03 self.** All · Gym · Stretching
· Calisthenics tabs, the sub-group chip bar with "All groups" plus every série, group headings
when viewing all groups, per-category sub-group memory, per-view scroll memory.

The Routine and History rebuilds from handoff 03 stayed and are the basis of everything below.

### The palette did not change

"Minimal sage" as specified in handoff 03, still exact. Reproduced here only so the boards can
be checked against it.

```
--bg #f6f6f1   --card #fdfdf9   --ink #26271f   --muted #a3a596   --muted2 #83857a
--line #e3e4d8   --accent #5c7a52   --accent-dark #4c6a44   --accent-soft #e8eee0
--danger #a8574a   --panel #eaeee2   --panel-track #d6dcc9
--day-head #f2f5ec   --day-body #f8f9f3   --day-line #e7ebdd
--track #eceddf   --heat1 #d5e0c9   --heat2 #9dba8e
dark: --bg #1b1c16  --card #24251d  --ink #f3f3ec  --line #303128  --accent-dark #aec49f
```

Layout constants: `--edge: 18px` page inset, `--content-pad: 100px` bottom clearance for the
floating tab bar. The player's wide layout kicks in at **768px**, and again at **1200px**.

---

## 1. The programme is now three sets

The single biggest content change, and it ripples through every screen.

- **Every gym exercise is 3 × 30 reps.** All 59 of them carry `sets: 3`.
- **Every calisthenics exercise is 3 × 10.** All 10 of them.
- **Isometric holds get 3 too**, so the rule has no exceptions to explain.
- Card and player meta lines therefore read **"3 × 30 reps"**, not "30 reps".
- **One tap logs the whole prescription.** Pressing *Done* records all three sets in one
  action rather than one set per tap — the toast reads `Logged · Bench press · 3 sets`. There
  is no per-set counter and no "undo last set"; deleting a day's entry for an exercise removes
  all of its sets together.
- Rep versions of the 45° hip abductor and adductor were added to the catalog.

---

## 2. Exercises — the card player

The home grid is unchanged (see §0). What changed is what happens after you tap a card.

**Edit mode** (the pencil, top right) now exposes four steppers, not three:

| control | range | note |
|---|---|---|
| Weight − / + | any | **1 kg per press**, down from 2.5 kg |
| Reps − / + | | |
| Timer − / + | | timer mode only |
| **Sets − / +** | **1 – 10** | new |

Long-pressing the weight value opens a keypad to type it directly.

**The figure is tappable.** It opens a full-screen viewer where pinch-zoom and double-tap-zoom
work normally. This is the *only* zoomable surface in the app — see §6.

**Editing the weight records a weight change on the spot**, whether or not you log anything
that day. Previously a change was only recorded if you also completed the exercise, which meant
adjusting your working weight on a rest day left no trace.

---

## 3. Routine — the cards

Each série card is now titled by **the série alone** — "Série 1" — with its constituent blocks
listed underneath as subtext, separated by a middot:

```
Série 1
Psoas · Ankles and feet · Hamstrings · Front split
```

The separator is ` · `, not commas. This was an explicit call.

---

## 4. Routine — the player (this is where §8 lives)

Top to bottom, as built:

1. **Panel** (`--panel` tint) containing the slot line — `SÉRIE 1 · 1/21` on the left, a
   countdown `−31:29` on the right — then the exercise figure, then a 3px session progress bar
   across the panel's bottom edge.
2. **Name** and one-line **cue**.
3. **Ring timer**, 152px, with the remaining time and a `HOLD` / `REST` phase label inside it.
4. **Transport row**: ‹ back · **⏸ play/pause** (62px, accent-filled) · › skip · ✕ exit — four
   circles in a centred row.
5. **Up-next rail**: an `UP NEXT` / `N holds left` label line, then a 6-column grid of
   thumbnails, the current one tinted and captioned "Now".

At ≥768px this becomes two columns — panel left, everything else right — with the rail pinned
to the bottom by `margin-top: auto`.

---

## 5. History

The most heavily reworked screen. Every point below is a deliberate, requested change.

### The three tiles, reordered

Left to right: **weight changes → day streak → sessions this week**. Weight changes leads.

### Weight changes is a mode, not a screen

The first tile is a **toggle**, not a link. Pressing it does not navigate anywhere:

- the Recent list swaps from logged sessions to the list of weight changes;
- the heat map recolours to count **days a weight changed** instead of days trained;
- the calendar keeps the *same date span* in both modes, so the grid never resizes underneath
  you when you toggle;
- the tile shows a chevron that rotates open, and carries `aria-pressed`.

There is no separate Weight changes screen any more.

### The heat map scrolls

It reaches back through the **whole** history (minimum five weeks), rather than showing a fixed
recent window. Monday-first, 7-day rows, four intensity levels, future cells faded. Month names
sit in a left gutter and are printed **only when the month changes**, so a long scroll stays
readable without repeating itself. The list of days stays put below it.

### Day rows

**Collapsed — strictly one line, never wraps.**

```
Sat 16 Aug   9 sets · 270 reps · 4 320 kg        [Série A] [Chest] [Back] […]
```

The left column carries the day label and the totals; the right carries the tags. Tags are
measured against the available width at render time and the ones that don't fit collapse into a
single `…` chip. The left column never gets crushed to make room.

**Expanded.**

- All tags are shown on the head row, without squeezing the left column.
- The day is **divided into sections by muscle group** — Warm up, Feet and ankles, Hamstrings,
  Front split, and so on.
- Section headers are **sentence case**. Not all caps. ("Feet and ankles", never "FEET AND ANKLES".)
- Each tag gets **its own chip**, except séries, which may group: `Séries E · F`.
- **No focus line** inside an open day.
- **No change line** under each weight. The weight stands alone; the comparison against the
  previous session is gone.

### Swipe to delete

Any row — a logged session or a weight change — swipes left to reveal a delete action, with an
undo toast. The delete button is only rendered while the row is open or being dragged, so it
can't bleed through during a scroll.

### Behind the gear: Data & sync

Export / import JSON, the private-gist sync setup, a reset for all recorded weight changes, a
layout report, and the running build number.

---

## 6. App chrome

These are invisible until they break, but they constrain the design.

**The tab bar is placed against the *visual* viewport, not the layout viewport.** It stays on
the visible bottom edge when the page is zoomed or scrolled under a keyboard. One exception,
learned the hard way: it does **not** follow a keyboard that isn't ours — iPad shares a single
keyboard across windows, so a shrunken viewport with nothing focused in our app means somebody
else is typing, and the bar stays put.

**Page zoom is refused everywhere.** Pinch and double-tap are both suppressed app-wide, and the
page snaps back if a zoom slips through. The single exception is the full-screen image viewer
in §2, which is fully zoomable — that was the point of building it.

**Updates install themselves.** A new build reloads the app rather than waiting to be asked.
The version that is actually *running* is compiled into `app.js` as `const BUILD` and shown on
Data & sync — asking the service worker or reading the cache both report a version ahead of the
code on screen.

---

## 7. Sync

Weights, weight changes, logged sets and per-exercise preferences all sync across devices
through a private GitHub gist. The log is append-only and union-merged; preferences are
last-write-wins per exercise.

One design-visible consequence: **a deleted weight change is a dated record, not a tombstone on
a key.** Keying deletions by exercise-and-day meant deleting one change silently erased every
later change for that exercise on that day — which is what "weight changes only sometimes
record" turned out to be.

---

## 8. The open problem — please design this

### What's wrong

Inside a running routine, on an iPhone, **the Up-next thumbnails are cut off behind the floating
tab bar.** The captions and the bottom of the tiles disappear underneath it. On a full-height
viewport it just fits; as soon as the browser chrome takes its share, it doesn't.

### The measurement

At **390 × 760** — a 390pt phone with the status bar and home indicator accounted for — the
bottom of the rail's captions sits **53px below the top of the tab bar.**

The vertical budget of the player, measured:

| element | height |
|---|---|
| panel (slot line + figure + progress bar) | 297 |
| ↳ of which the figure box | 266 |
| exercise name | 29 |
| cue | 35 |
| ring timer (+16 margin) | 152 |
| **transport row (+20 margin)** | **62** |
| rail label | 15 |
| rail tiles + captions | 60 |

**The transport row plus its margin is 82px** — more than the 53px shortfall. Removing it as a
separate row is enough on its own, which is why the ask is about rearranging those controls.

### Hard constraint: the drawings must not be cropped

The obvious idea — trim the empty margin around the figure — was measured across all 122 WebP
exercise images and **rejected**.

Empty margin, as a percentage of image height:

| | top | bottom |
|---|---|---|
| tightest image | **3.3%** (`scapular-pull`) | **4.3%** (`lunge-halfsplit-flow`) |
| median | 9.5% | 8.3% |
| roomiest | 48.7% | 33.6% |

A uniform crop is limited by the tightest image, not the typical one. What each crop costs:

| crop per side | figures clipped (of 122) | still cut by |
|---|---|---|
| 3.3% — safe for every image | **0** | 36px |
| 5% | 2 | — |
| 8% | 44 | 13px |
| 12% — the first crop that fits | **94** | fits, 7px spare |
| 15% | 99 | — |

The crop that would actually solve it destroys anatomical information in three quarters of the
catalog — feet, hands, the end of a pull-up bar. **Decision taken: no trimming. The images stay
exactly as they are.** Solve it with layout.

### What has already been tried, and turned down

Four working prototypes were built and measured. All four fit; none were satisfying. They are
recorded here so the same ground isn't covered twice, not as a starting point.

| prototype | arrangement | result |
|---|---|---|
| Orbit the ring | ‹ and › flank the ring; play/pause moves inside it; ✕ to the header | fits, 19px spare |
| Thumb bar | ring left clean; ‹ ⏸ › drop to the bottom, sharing the line above the thumbnails | fits, 10px spare — but loses the `UP NEXT` label |
| Floating capsule | the three controls merge into one pill straddling the photo panel's bottom edge | fits, 17px spare — but the pill covers the foot and hand on the tightest poses |
| Rearrange + safe trim | as above plus a 3.3% crop | fits, 52px spare — trimming is now off the table |

### The one thing that was liked

**Moving ✕ out of the transport row and up to the top corner of the screen, beside the
countdown.** Optional, not mandated — but it read well and it is worth carrying into the
options that want the room.

### What to deliver

**At least four distinct arrangements** of the routine player's transport controls — back,
play/pause, skip and exit — that clear the Up-next rail from behind the tab bar, with:

- **no cropping of the exercise figures;**
- the full rail visible, captions included, at 390 × 760;
- each option drawn for **both** the phone portrait layout **and** the ≥768px two-column
  layout, since the player reflows to panel-left / controls-right there;
- play/pause remaining the obvious primary action, and back / skip remaining reachable
  one-handed while actually exercising;
- tap targets that survive being used mid-stretch, sweaty, at arm's length.

Range matters more than polish here — four variations on one idea is not four options. Show the
conservative one and the one that rethinks the screen.
