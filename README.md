# Exercises.

A minimalist exercise tracker PWA — Pinterest-style cards for **Gym / Stretching / Push-ups / Pull-ups**, each with its own animated Zdog figure, a rep counter or stopwatch (toggleable), one-tap set logging, and a guided **2-hour "Corpo" stretching routine** (front split · pancake · feet) built from the [Corpo playlist](https://youtube.com/playlist?list=PLrO-qJFePZuxuVqK3V3O8IFQKQl_fYzsu).

**Live:** https://gabrielom.github.io/exercises/ · **Plan:** [PLAN.html](https://gabrielom.github.io/exercises/PLAN.html)

- All data stays on your device (`localStorage`), with JSON export/import backup.
- Installable: open the live URL on your phone → share menu → **Add to Home Screen** → launches standalone and works offline.
- No build step, no framework, no dependencies beyond a vendored copy of [Zdog](https://zzz.dog) (~29 KB).

## Enable GitHub Pages (one-time)

Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
The site appears at `https://gabrielom.github.io/exercises/` a minute later.

## Develop

Serve the folder with any static server and open it:

```
python3 -m http.server 8000
```

## Structure

```
index.html            app shell
css/style.css         theme + masonry layout
js/data.js            exercise catalog + Corpo routine (single source of truth)
js/app.js             views, counters, history, export/import
js/routine.js         guided 60s-hold / 30s-rest player
js/anim.js            Zdog figure rig + pose library
sw.js                 offline cache (bump VERSION to deploy updates)
manifest.webmanifest  PWA manifest
PLAN.html             project plan & full routine table
```
