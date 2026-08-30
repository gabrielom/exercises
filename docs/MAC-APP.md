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
npm run dev      # opens the app in a live window
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
| Assets | fetched from the deployed site | the same, and cached the same way |
| Updates | a deploy reloads the app automatically | the same — no rebuild for web changes |
| Export | the browser downloads the blob | Rust writes it to `~/Downloads` and the toast names the file |
| Title bar | — | none: the filter tabs sit beside the traffic lights |

### The title bar

The window uses `titleBarStyle: "Overlay"` with `hiddenTitle`, so the page runs
the full height of the window and the traffic lights float over it — the same
arrangement as the installed iPad app. **All · Gym · Stretching · Calisthenics**
take the strip the title bar would have occupied, inset 72px so they start clear
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

### Where the controls sit

The window controls are moved onto the content column's left edge, so the page
reads down one line: controls, group chips, section headings and cards all start
there, and only the category tabs begin after them.

| Window | Column edge | Controls | Tabs |
| --- | --- | --- | --- |
| 1100px | 19px | 19px | 91px |
| 1280px | 69px | 69px | 141px |
| 1440px | 149px | 149px | 221px |
| 1600px | 229px | 229px | 301px |

The page owns the layout, so it measures that edge and hands it to the
`place_window_controls` command; `src/mac.rs` shifts the three buttons
horizontally to match. It runs on load and on every resize, because macOS
re-lays the buttons out in the corner on its own. Only the horizontal position
is touched — the vertical one already lines up with the tabs row — and the shift
is relative to where the buttons currently are, so repeated calls converge
instead of drifting. `--win-controls` reserves the width they occupy at the
start of the tabs row; every other row begins at the edge itself.

Tauri 2.11 exposes `traffic_light_position` on the window *builder* only, with no
public runtime setter, which is why this talks to AppKit through `objc2` rather
than through Tauri.

**Verifying the native code from a non-Mac.** `cargo check` on Linux compiles
the crate with `mac.rs` cfg'd out, so it proves nothing about that file. Adding
the macOS target does:

```sh
rustup target add aarch64-apple-darwin
cargo check --target aarch64-apple-darwin      # in a crate with just objc2
```

The full app cannot be checked that way — Tauri's macOS dependencies build
Objective-C, which needs Apple's toolchain — but a scratch crate containing only
`mac.rs` and `objc2` type-checks against the real target, which covers the
message sends and their argument and return types.

Everything else — the routine player, the timers, history, the gist sync — runs
unchanged. Because the sync gist is shared, the Mac shows up in the device list
in Settings as soon as it connects.

Connecting it is a paste: on a device that already syncs, **Settings → Copy
setup code**, then paste that into the token box here. The code carries the
token and the gist id together, so nothing has to be looked up on GitHub — which
matters, because a classic token is only ever displayed once. Treat the code as
you would the token itself.

## Updates

`frontendDist` is the deployed URL, not a directory, so **nothing is compiled
into the app** — the window loads <https://gabrielom.github.io/exercises/> and
the service worker takes over from there. Web changes therefore arrive on their
own, exactly as they do on the iPhone and iPad: the worker picks up the new
build and the app reloads itself. **Settings → About** shows what is running and
offers a manual check.

Rebuild only when the *native* side changes — `src-tauri/`, the window config,
or the icons.

Two consequences worth knowing:

- **The first launch after installing needs a network.** There is nothing to
  fall back to until the service worker has cached the app; after that it opens
  offline like any installed PWA.
- The window is a Tauri app *and* an ordinary web page. `app.js` keeps those
  apart: `NATIVE` means the Tauri bridge is there, so the window chrome and the
  native commands apply; `EMBEDDED` means the assets are local, which is now
  false, so the service worker and the update machinery run.

`tools/bundle.mjs` still assembles `dist/` from the file list in `sw.js`, but
nothing in the build calls it any more. It is what you would reach for to go
back to a self-contained app — set `frontendDist` to `../dist`, restore the
`beforeBuildCommand`, and put the `dist/` watch back in `build.rs`, without
which cargo finds the crate fresh and ships the *previous* binary's assets.

## Files

| Path | What it is |
| --- | --- |
| `src-tauri/tauri.conf.json` | window size, bundle identifier, content-security policy |
| `src-tauri/src/lib.rs` | the native side: `save_backup` and `place_window_controls` |
| `src-tauri/icons/` | generated by `npm run icons` from `icons/icon-512.png` |
| `tools/bundle.mjs` | assembles `dist/` — kept for a self-contained build, unused by this one |

The web app has no build step, and nothing in `src-tauri/` affects what GitHub
Pages serves.

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
