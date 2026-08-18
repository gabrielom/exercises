# Reference archive

[`MAC-APP.md`](MAC-APP.md) covers the desktop build — the Tauri shell in
`src-tauri/` that wraps this same web app as a macOS application, how to build
it, and the three things that necessarily work differently in a native window.

[`DESIGN-BRIEF-04.md`](DESIGN-BRIEF-04.md) is the **current** document: every change made to
the app since design handoff 03 landed, written so the design side can bring its boards back in
line with the shipped code, plus the one problem still open (the routine player's up-next rail
sitting behind the tab bar). Start there. The rest of this folder is history.

[`HANDOFF.md`](HANDOFF.md) is the **initial reference handoff for this project, written in a
different (earlier) chat thread** — the session that first designed and built the app in
July 2026. It was carried over into this repo so the original material survives: the brief
and how it evolved, the decisions and the reasoning behind them, the complete gym catalog
taken from the real training program, the Corpo routine with the scraped source playlist,
and the original generated-SVG figure system.

The scraped **"Corpo" playlist listing (§5) is the part that exists nowhere else** — 87
videos with titles, channels and durations. YouTube is usually unreachable from an agent
session, so that listing cannot easily be regenerated. Keep it.

The original code itself is **already in this repo's git history** — commits `17c2194`
(v1) and `983c9d2` (v2) — so no separate bundle or zip archive is kept here; they were
byte-for-byte duplicates of what git already stores.

## What has changed since it was written

`HANDOFF.md` is accurate for July 2026 and is left unedited, but the app has moved on.
Read it as history, not as a description of the current code.

- **It is deployed.** §8 ("Outstanding item: getting it onto GitHub") is resolved; the app
  is live at https://gabrielom.github.io/exercises/.
- **Sections** are now **Gym · Stretching · Calisthenics** — Push-ups and Pull-ups merged
  into Calisthenics.
- **Figures** are no longer generated SVG pictograms. They are AI-illustrated (Gemini
  "Nano Banana"), stored as transparent WebP in `img/gen/<id>.webp`, in a flat androgynous
  sage style that reads on light and dark. `tools/genfigs.mjs` and `tools/poses.mjs` are
  gone, replaced by `tools/genimages.mjs` + `tools/optimize.mjs`. The original 121 SVGs are
  preserved on the **`claude/svg-originals`** branch.
- **Theme** is "Minimal sage" (`#5c7a52`), not the original orange (`#e8642c`).
- **Gym groups** are eight ~1 h séries **A–H**, not the original four.
- **The Corpo routine** is split into **four ~30 min series** rather than one 2 h block.
- **Added since:** editable weights, quick-log toggle on cards, cross-device history sync
  through a private GitHub gist, a lightbox player on iPad/Mac, per-screen scroll memory,
  and the floating labelled tab bar.
- `sw.js` `VERSION` is well past the `exercises-v2` quoted in the handoff — bump it on
  every deploy.

Still true and worth keeping in mind: the localStorage schema and its `exercises.*`
namespacing, the JSON export shape as the sync contract, relative asset paths because the
site is served from a subpath, and the Playwright-with-virtual-clock trick for testing
timers instantly.
