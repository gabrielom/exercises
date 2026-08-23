# The Mac app

A [Tauri](https://tauri.app) shell around the same web app, so Exercises runs as
a real macOS application alongside the installed iPhone and iPad versions. It is
the *same code* — `src-tauri/` only wraps it; there is no separate desktop
codebase to keep in step.

## Before the first build

Three things, once:

```sh
xcode-select --install                                          # Apple's build tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust
npm install                                                     # the Tauri CLI
```

Node is already needed for `npm install`; any recent version works.

## Run it

```sh
npm run dev      # opens the app with a live window, rebuilds dist/ first
npm run build    # produces a .app and a .dmg
```

The finished app lands in:

```
src-tauri/target/release/bundle/macos/Exercises.app
src-tauri/target/release/bundle/dmg/Exercises_0.1.0_aarch64.dmg
```

Drag the `.app` into `/Applications`. The first `npm run build` compiles the
whole Rust dependency tree and takes a few minutes; later ones are quick.

## Gatekeeper

The build is **unsigned**, because signing needs a paid Apple Developer account.
macOS will refuse to open it on a double-click with "Exercises is damaged" or
"cannot be opened because the developer cannot be verified".

Either right-click the app → **Open** → **Open**, or clear the quarantine flag:

```sh
xattr -dr com.apple.quarantine /Applications/Exercises.app
```

You only need to do that once per build. If you ever want it signed properly,
set `APPLE_CERTIFICATE` and friends in the environment and Tauri will handle it
— see [Tauri's macOS signing docs](https://tauri.app/distribute/sign/macos/).

## How the desktop build differs

The app is the same, but three things cannot work the same way in a native
window, and it adapts rather than failing quietly:

| | Web | Mac app |
| --- | --- | --- |
| Assets | fetched, cached by the service worker | already on disk; no service worker at all |
| Updates | a deploy reloads the app automatically | rebuild and reinstall — Settings says so |
| Export | the browser downloads the blob | Rust writes it to `~/Downloads` and the toast names the file |
| Title bar | — | none: the filter tabs sit beside the traffic lights |

### The title bar

The window uses `titleBarStyle: "Overlay"` with `hiddenTitle`, so the page runs
the full height of the window and the traffic lights float over it — the same
arrangement as the installed iPad app. **All · Gym · Stretching · Calisthenics**
take the strip the title bar would have occupied, inset 78px so they start clear
of the controls and centred on them. Screens with their own header (History,
Routine, Settings) have no tabs row to inset, so they take 30px of vertical
clearance instead and start below the controls.

Losing the title bar also loses the thing you drag the window by, so the app
puts it back: a transparent 30px strip across the top, plus the tabs row itself,
carry `data-tauri-drag-region`. Tauri drags from whichever element the press
lands on, so the background of those rows moves the window while the tabs and
the theme button still take clicks normally.

**That attribute is not enough on its own.** The injected drag script invokes
`plugin:window|start_dragging`, and `core:window:default` does *not* grant it —
it grants `allow-internal-toggle-maximize` but not `allow-start-dragging`, so
double-click-to-zoom works while dragging silently does nothing. The capability
file names the permission explicitly.

### Where the content sits

Nothing is indented *within* the page. The whole content column moves right by
`--column-shift`, so the tabs, the group chips and the grid keep the single left
edge the eye reads down, and that edge clears the traffic lights:

| Window | Shift | Shared left edge | Controls |
| --- | --- | --- | --- |
| 1100px | 106px | 138px | in the space to its left |
| 1280px | 56px | 138px | in the space to its left |
| 1440px | 0 | 162px | in the margin beside the column |
| 1600px | 0 | 242px | in the margin beside the column |

Content is capped at 1180px and centred, so past roughly 1400px the margin is
already wide enough to hold the controls, the shift falls to zero and the column
is centred exactly as it is in a browser. app.js recomputes it on load and on
resize.

Handoff v5 puts the controls *on* the column's left edge rather than just clear
of it, by repositioning the window buttons themselves. Tauri 2.11 exposes
`traffic_light_position` on the window *builder* only — there is no public
runtime setter to follow a resize — so that would mean Objective-C against
`NSWindow`, which cannot be compiled or checked anywhere but a Mac. Moving the
column instead gets the part that matters, one shared edge at every width, with
no unverifiable native code.

Everything else — the routine player, the timers, history, the gist sync — runs
unchanged. Because the sync gist is shared, the Mac shows up in the device list
in Settings as soon as it connects, using the same token as your other devices.

## "I rebuilt and nothing changed"

Check **Settings → About**. It shows the build the running app is made of, and
that is the fastest way to tell a stale app from a stale layout.

The web assets are embedded into the binary when the Rust crate compiles, and
Tauri does not tell cargo to watch them: `tauri-build` emits `rerun-if-changed`
for `tauri.conf.json`, `capabilities/` and resources, while `tauri-codegen` —
which is what actually reads `dist/` — emits none at all. So a build after
editing only HTML, CSS or JS used to find the crate "fresh", skip compiling and
ship the assets baked into the *previous* binary. `build.rs` now walks `dist/`
and watches every file, so any web change forces the rebuild.

If a build still looks stale, in order:

```sh
open src-tauri/target/release/bundle/macos/Exercises.app   # not an older copy elsewhere
touch src-tauri/src/lib.rs && npm run build                # force the crate to recompile
```

## Files

| Path | What it is |
| --- | --- |
| `src-tauri/tauri.conf.json` | window size, bundle identifier, content-security policy |
| `src-tauri/src/lib.rs` | the whole native side: one `save_backup` command |
| `src-tauri/icons/` | generated by `npm run icons` from `icons/icon-512.png` |
| `tools/bundle.mjs` | assembles `dist/` from the file list in `sw.js` |

`dist/` is generated on every build and is not in git. The web app itself still
has no build step — nothing in `src-tauri/` affects what GitHub Pages serves.

### Changing the icon

`npm run icons` rebuilds the `.icns` and PNGs from `icons/icon-512.png`. The
1024px slot is upscaled from that 512px master, which is fine for flat artwork
like this one but would show on anything detailed; if you ever draw a 1024px
version, point `npx tauri icon` at it instead and it will regenerate everything,
including the Windows and Linux sizes.

## The simpler alternative

macOS Sonoma and later can install a PWA directly: open
<https://gabrielom.github.io/exercises/> in **Safari** → **File** → **Add to
Dock**. That gets you a Dock icon, its own window and offline support with no
build at all, and it keeps automatic updates. The Tauri build is worth it when
you want a genuine `.app` you control — offline from first launch, no Safari
involved, and native file access.
