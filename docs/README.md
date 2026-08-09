# Reference archive

Original design/build material for this app, kept for future reference.

| File | What it is |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | Full write-up of the session that first designed and built the app (July 2026): the brief and how it evolved, decisions and why, the complete gym catalog, the Corpo routine and its source playlist, and the original figure system. |
| `reference/exercises-original.bundle` | Git bundle of the original history — commits `17c2194` (v1), `983c9d2` (v2) and `fb7d699` (adds HANDOFF.md). |
| `reference/exercises-v2-snapshot.zip` | Plain-file snapshot of that same v2 state, no history. |

The first two commits in the bundle are already part of this repo's history, so the
archives are a convenience copy rather than the only source. The scraped **"Corpo"
playlist listing in `HANDOFF.md` §5 is the one piece that exists nowhere else** — YouTube
is often unreachable from an agent session, so keep it.

## What has changed since the handoff was written

`HANDOFF.md` describes the app as it was in July 2026. It is accurate for that snapshot but
the app has moved on — read it as history, not as a description of the current code.

- **It is deployed.** §8 ("Outstanding item: getting it onto GitHub") is resolved; the app
  is live at https://gabrielom.github.io/exercises/ and pushed from this repo.
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
