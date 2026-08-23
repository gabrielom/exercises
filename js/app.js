import { CATS, GYM_GROUPS, STRETCH_GROUPS, GROUP_FOCUS, EXERCISES, byId, imgFor } from './data.js';

const SUBGROUPS = { gym: GYM_GROUPS, stretch: STRETCH_GROUPS };
import * as store from './store.js';
import * as sync from './sync.js';
import { mountRoutine, leaveRoutine, routineControl } from './routine.js';

store.init();

// ————— the desktop shell —————
// Running inside the Tauri window rather than a browser. Three things differ:
// there is no server to check for updates, no download behaviour to hand a
// blob to, and the traffic lights live in a real title bar rather than over the
// page. Everything else is the same app.
export const NATIVE = !!globalThis.__TAURI_INTERNALS__ || location.protocol === 'tauri:';

function invoke(cmd, args) {
  const fn = globalThis.__TAURI__?.core?.invoke || globalThis.__TAURI_INTERNALS__?.invoke;
  return fn ? fn(cmd, args) : Promise.reject(new Error('desktop bridge unavailable'));
}

// When installed as a window that carries OS traffic-light controls (iPad,
// macOS), flag the document so the filter tabs inset to the right of them.
// iPhone installs are full-screen with no such controls, so exclude them.
(function markWindowed() {
  const installed = matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: window-controls-overlay)').matches
    || navigator.standalone === true;
  const isPhone = /iPhone|iPod/.test(navigator.userAgent);
  document.documentElement.classList.toggle('app-windowed', NATIVE || (installed && !isPhone));
})();

// The desktop window has no title bar of its own — the page runs under the
// traffic lights. That buys the tabs row the title bar's space, but it also
// takes away the thing you drag the window by, so put a strip back across the
// top. It sits *below* the Exercises tabs (z-index 20), which carry the drag
// attribute themselves so their empty space drags and the tabs still click.
if (NATIVE) {
  document.documentElement.classList.add('app-native');
  const strip = document.createElement('div');
  strip.className = 'dragstrip';
  strip.setAttribute('data-tauri-drag-region', '');
  document.body.append(strip);   // module scripts run after the body is parsed

  // Not placeControls() yet — its state is declared below, and render() calls
  // it once the page it has to measure exists.
  addEventListener('resize', placeControls);
}

// Tauri drags from whichever element the press actually lands on, so marking a
// container makes its own background draggable while its buttons stay clickable.
const DRAG = NATIVE ? ' data-tauri-drag-region' : '';

// Put the window controls on the content column's left edge, centred on the
// tabs' text, rather than leaving them in the window corner. The page owns the
// layout, so it measures both and tells the native side; macOS puts them back
// by itself on a resize, so this runs again then and after every render.
//
// The vertical centre is measured off a real tab rather than derived from the
// padding: the row centres its items, and the theme button is the tallest of
// them, so the text does not sit where the row's own padding would put it. Only
// the Exercises screen has tabs, so the last good measurement carries over to
// the screens that do not — the controls keep one position throughout.
let controlsY = 20;
function placeControls() {
  if (!NATIVE) return;
  const main = document.querySelector('main');
  if (!main) return;
  const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) || 18;
  const x = Math.round(main.getBoundingClientRect().left + edge);
  const tab = document.querySelector('.topbar .chips:not(.sub) .chip');
  if (tab) {
    const r = tab.getBoundingClientRect();
    controlsY = Math.round(r.top + r.height / 2);
  }
  invoke('place_window_controls', { x, y: controlsY }).catch(() => { /* older build, or not macOS */ });
}

const view = document.getElementById('view');
const toastEl = document.getElementById('toast');

const state = { tab: 'exercises', cat: 'all', group: 'all', hView: 'list', openDay: null };

// ————— helpers —————

export function fmtTime(totalS) {
  const s = Math.max(0, Math.round(totalS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer = null;
// `onUndo` adds an Undo button and holds the toast open longer — used by the
// History delete so a mis-swipe is always recoverable.
export function toast(msg, onUndo) {
  toastEl.textContent = msg;
  if (onUndo) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = 'Undo';
    btn.onclick = () => { toastEl.classList.remove('show'); onUndo(); };
    toastEl.appendChild(btn);
  }
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), onUndo ? 5000 : 1800);
}

function chime(pattern) {
  try {
    chime.ctx = chime.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = chime.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime + 0.02;
    for (const [freq, dur] of pattern) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
      t += dur + 0.12;
    }
  } catch { /* audio unavailable */ }
}

function modeFor(ex) { return store.getPref(ex.id).mode || ex.mode; }
function doneToday(exId) { return store.todayFor(exId).length > 0; }
// Prescribed sets — the programme's number unless it has been edited for this
// exercise, the same way weight and reps carry an override.
function setsFor(ex) {
  const n = store.getPref(ex.id).sets;
  return n === undefined || n === null ? (ex.sets || 1) : n;
}
const SETS_MAX = 10;

// Effective weight = per-exercise override (if the user has edited it) else the
// program default from data.js. `ex.weight === undefined` means non-gym (no weight).
function hasWeight(ex) { return ex.weight !== undefined; }
function weightFor(ex) {
  const w = store.getPref(ex.id).weight;
  return (w === undefined || w === null) ? ex.weight : w;
}
function setWeight(ex, w) {
  const from = weightFor(ex);
  const to = Math.max(0, Math.min(999, Math.round(w * 2) / 2));
  store.setPref(ex.id, { weight: to });
  // Changing the weight is the change — it counts whether or not a set gets
  // logged that day.
  store.logWeightChange(ex.id, from, to);
}
const WEIGHT_STEP = 1;

// Timer duration: user override, else the programmed time for natively timed
// exercises, else one minute (a reps target is not a duration).
function timeFor(ex) {
  const t = store.getPref(ex.id).time;
  if (t) return t;
  return ex.mode === 'time' ? ex.target : 60;
}
function setTime(ex, t) {
  store.setPref(ex.id, { time: Math.max(15, Math.min(600, Math.round(t / 15) * 15)) });
}
const TIME_STEP = 15; // seconds

// ————— exercises grid —————

function filteredList() {
  let list = EXERCISES.filter(e => state.cat === 'all' || e.cat === state.cat);
  if (SUBGROUPS[state.cat] && state.group !== 'all') {
    list = list.filter(e => e.group === state.group);
  }
  return list;
}

function gcardHTML(ex) {
  const mode = modeFor(ex);
  const logged = doneToday(ex.id);
  const meta = `${weightFor(ex) ? `<span class="kg">${weightFor(ex)} kg ·</span>` : ''}
    <span>${setsFor(ex) > 1 ? `${setsFor(ex)} × ` : ''}${mode === 'time' ? `⏱ ${fmtTime(timeFor(ex))}` : `${store.getPref(ex.id).reps || ex.target} reps`}${ex.side ? ' · per side' : ''}</span>`;
  return `<div class="gcard" data-ex="${ex.id}" role="button" tabindex="0">
    <div class="g-img">
      <img src="${imgFor(ex.id)}" alt="" loading="lazy">
      <button class="qlog ${logged ? 'logged' : ''}" data-q="${ex.id}" aria-label="${logged ? 'Undo today’s set' : 'Quick-log this exercise'}">
        <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${logged ? 3 : 2.4}" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l5 5L19 7"/></svg></i>
      </button>
    </div>
    <span class="g-name">${ex.name}</span>
    <span class="g-meta">${meta}</span>
  </div>`;
}

// Quick-log toggle: unchecked → log the whole prescription (the same record as
// finishing it in the player); checked → take today's sets for it back off.
function quickLog(ex) {
  if (doneToday(ex.id)) {
    const today = store.localDate();
    store.deleteEntries(e => e.d === today && e.ex === ex.id);
    navigator.vibrate?.(12);
    toast(`Removed · ${ex.name}`);
  } else {
    const mode = modeFor(ex);
    const v = mode === 'reps' ? (store.getPref(ex.id).reps || ex.target) : timeFor(ex);
    const entry = { ex: ex.id, mode, v };
    if (weightFor(ex)) entry.w = weightFor(ex);
    store.logSets(entry, setsFor(ex));
    navigator.vibrate?.(20);
    toast(`Logged · ${ex.name} ✓`);
  }
  renderExercises();
}

function themeBtnHTML() {
  return `<button class="themebtn" data-act="theme" aria-label="Toggle theme" title="Theme">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
    </svg>
  </button>`;
}

// Horizontal scroll of the filter bars is remembered across re-renders so that
// toggling e.g. Série G ⇄ H doesn't snap the sub-group bar back to the start.
// The sub-group bar is keyed by category since each category has its own set.
const barScroll = { main: 0, sub: {} };
// Last sub-group chosen per category, so returning to Gym restores the series
// you were on instead of resetting to "All groups".
const groupMem = {};

function subchipsInner() {
  const defs = SUBGROUPS[state.cat];
  return defs
    ? [['all', 'All groups'], ...Object.entries(defs)]
        .map(([id, label]) => `<button class="chip ${state.group === id ? 'on' : ''}" data-group="${id}">${label}</button>`).join('')
    : '';
}

function gridCells() {
  const defs = SUBGROUPS[state.cat];
  let cells = '', lastGroup = null;
  for (const ex of filteredList()) {
    if (defs && state.group === 'all' && ex.group !== lastGroup) {
      lastGroup = ex.group;
      cells += `<div class="group-head">${defs[ex.group]}</div>`;
    }
    cells += gcardHTML(ex);
  }
  return cells;
}

function renderExercises() {
  const prevSub = view.querySelector('.chips.sub');
  if (prevSub && renderExercises.lastCat != null) barScroll.sub[renderExercises.lastCat] = prevSub.scrollLeft;
  const prevMain = view.querySelector('.topbar > .chips:not(.sub)');
  if (prevMain) barScroll.main = prevMain.scrollLeft;

  const topbar = view.querySelector('.topbar');
  const grid = view.querySelector('.grid');
  if (topbar && grid) {
    // Update in place — the filter bar stays put (no full-page rebuild), only
    // the active tab and the grid change, so switching screens is seamless.
    topbar.querySelectorAll('.chips:not(.sub) .chip[data-cat]').forEach(c =>
      c.classList.toggle('on', c.dataset.cat === state.cat));
    let sub = topbar.querySelector('.chips.sub');
    if (SUBGROUPS[state.cat]) {
      if (sub) sub.innerHTML = subchipsInner();
      else topbar.insertAdjacentHTML('beforeend', `<div class="chips sub">${subchipsInner()}</div>`);
    } else if (sub) {
      sub.remove();
    }
    grid.innerHTML = gridCells();
  } else {
    const chips = [['all', 'All'], ...Object.entries(CATS)]
      .map(([id, label]) => `<button class="chip ${state.cat === id ? 'on' : ''}" data-cat="${id}">${label}</button>`).join('');
    const subchips = SUBGROUPS[state.cat] ? `<div class="chips sub">${subchipsInner()}</div>` : '';
    view.innerHTML = `<div class="topbar"${DRAG}><div class="chips"${DRAG}>${chips}${themeBtnHTML()}</div>${subchips}</div><div class="grid">${gridCells()}</div>`;
  }

  // restore the remembered scroll positions for the new bars
  const newMain = view.querySelector('.topbar > .chips:not(.sub)');
  if (newMain) newMain.scrollLeft = barScroll.main;
  const newSub = view.querySelector('.chips.sub');
  if (newSub) newSub.scrollLeft = barScroll.sub[state.cat] || 0;
  renderExercises.lastCat = state.cat;
}

// ————— fullscreen player —————

const player = { open: false, list: [], idx: 0, reps: 0, timer: null, interval: null, editing: false };

function playerEl() { return document.getElementById('player'); }

function currentEx() { return byId[player.list[player.idx]]; }

function stopTimer() {
  clearInterval(player.interval);
  player.interval = null;
  player.timer = null;
}

function startTimer(seconds) {
  stopTimer();
  player.timer = { endAt: Date.now() + seconds * 1000, remaining: seconds, running: true };
  player.interval = setInterval(playerTick, 250);
  navigator.wakeLock?.request('screen').then(wl => { player.wl = wl; }).catch(() => {});
}

function playerTick() {
  const t = player.timer;
  if (!t || !t.running) return;
  t.remaining = (t.endAt - Date.now()) / 1000;
  const el = playerEl().querySelector('#pTime');
  if (el) el.textContent = fmtTime(Math.ceil(Math.max(0, t.remaining)));
  if (t.remaining <= 0) {
    stopTimer();
    chime([[660, 0.14], [880, 0.2]]);
    navigator.vibrate?.([70, 60, 70]);
    logCurrent(timeFor(currentEx()));
    advance();
  }
}

function toggleTimerPause() {
  const t = player.timer;
  if (!t) { startTimer(timeFor(currentEx())); return; }
  if (t.running) {
    t.running = false;
    t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
  } else {
    t.endAt = Date.now() + t.remaining * 1000;
    t.running = true;
  }
  playerEl().querySelector('#pTime')?.classList.toggle('paused', !t.running);
}

function logCurrent(value) {
  const ex = currentEx();
  const mode = modeFor(ex);
  const entry = { ex: ex.id, mode, v: value };
  if (weightFor(ex)) entry.w = weightFor(ex);
  store.logSets(entry, setsFor(ex));          // one tap records the prescription
  if (mode === 'reps') store.setPref(ex.id, { reps: value });
}

function advance() {
  if (player.idx >= player.list.length - 1) return renderPlayerDone();
  player.idx += 1;
  player.editing = false;
  renderPlayer(true);
}

function openPlayer(list, idx) {
  player.open = true;
  player.list = list;
  player.idx = idx;
  player.editing = false;
  playerEl().hidden = false;
  document.body.style.overflow = 'hidden';
  renderPlayer(false);
}

function closePlayer() {
  player.open = false;
  stopTimer();
  player.wl?.release?.().catch(() => {});
  playerEl().hidden = true;
  document.body.style.overflow = '';
  if (state.tab === 'exercises') { renderExercises(); restoreScroll(); } // refresh ✓ badges, keep place
}

function renderPlayerDone() {
  stopTimer();
  const done = player.list.filter(id => doneToday(id)).length;
  playerEl().innerHTML = `
    <div class="p-card">
    <div class="p-top">
      <button class="iconbtn" data-p="close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <span class="p-count"></span><span style="width:34px"></span>
    </div>
    <div class="p-body p-done-screen">
      <h2>Done.</h2>
      <p>${done}/${player.list.length} exercises logged today. 💪</p>
      <button class="donebtn" data-p="close">Back to the list</button>
    </div>
    </div>`;
  chime([[660, 0.15], [880, 0.15], [1100, 0.3]]);
  navigator.vibrate?.([80, 80, 160]);
}

function renderPlayer(slide) {
  const ex = currentEx();
  const mode = modeFor(ex);
  const next = byId[player.list[player.idx + 1]];
  const savedReps = store.getPref(ex.id).reps;
  player.reps = savedReps || ex.target;
  stopTimer();

  let counter;
  if (mode === 'reps') {
    counter = player.editing
      ? `<div class="stepper">
           <button data-p="minus" aria-label="Fewer reps">−</button>
           <div class="val"><b id="pReps">${player.reps}</b><span>reps${ex.side ? ' · per side' : ''}</span></div>
           <button data-p="plus" aria-label="More reps">+</button>
         </div>`
      : `<div class="stepper">
           <div class="val"><b id="pReps">${player.reps}</b><span>reps${ex.side ? ' · per side' : ''}</span></div>
         </div>`;
  } else {
    counter = player.editing
      ? `<div class="stepper">
           <button data-p="tminus" aria-label="Shorter timer">−</button>
           <div class="val"><b id="pDur">${fmtTime(timeFor(ex))}</b><span>timer</span></div>
           <button data-p="tplus" aria-label="Longer timer">+</button>
         </div>`
      : `<button class="p-clock" data-p="pausetime" aria-label="Pause or resume">
           <b id="pTime">${fmtTime(timeFor(ex))}</b><span>tap to pause${ex.side ? ' · per side' : ''}</span>
         </button>`;
  }

  playerEl().innerHTML = `
    <div class="p-card">
    <div class="p-top">
      <button class="iconbtn" data-p="close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <span class="p-count">${player.idx + 1} / ${player.list.length}</span>
      <button class="iconbtn" data-p="prev" aria-label="Previous" ${player.idx === 0 ? 'style="visibility:hidden"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
    </div>
    <div class="p-segments ${player.list.length > 24 ? 'many' : ''}">${player.list.map((_, k) => `<i class="${k <= player.idx ? 'done' : ''}"></i>`).join('')}</div>
    <div class="p-body ${slide ? 'slide' : ''}">
      <button class="p-img" data-p="zoom" aria-label="View image full screen"><img src="${imgFor(ex.id)}" alt=""></button>
      <div class="p-name">${ex.name}</div>
      ${ex.pt ? `<div class="p-pt">${ex.pt}</div>` : ''}
      ${ex.cue ? `<p class="p-cue">${ex.cue}</p>` : ''}
      <div class="p-badges">
        ${hasWeight(ex) ? (player.editing
          ? `<div class="wedit">
              <button class="wbtn" data-p="wminus" aria-label="Less weight">−</button>
              <button class="wval" data-p="wtype" aria-label="Weight — long-press to type"><b id="pWeight">${weightFor(ex)}</b> kg</button>
              <button class="wbtn" data-p="wplus" aria-label="More weight">+</button>
            </div>`
          : (weightFor(ex) ? `<span class="kg"><b id="pWeight">${weightFor(ex)}</b> kg</span>` : ''))
        : ''}
        ${player.editing
          ? `<div class="wedit">
              <button class="wbtn" data-p="sminus" aria-label="Fewer sets">−</button>
              <span class="wval flat"><b id="pSets">${setsFor(ex)}</b> ${setsFor(ex) === 1 ? 'set' : 'sets'}</span>
              <button class="wbtn" data-p="splus" aria-label="More sets">+</button>
            </div>`
          : (setsFor(ex) > 1 ? `<span class="bside">${setsFor(ex)} sets</span>` : '')}
        ${ex.side ? `<span class="bside">per side</span>` : ''}
        <button class="editbtn ${player.editing ? 'on' : ''}" data-p="edit" aria-label="${player.editing ? 'Finish editing' : 'Edit weight, reps and timer'}">
          ${player.editing ? 'OK' : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg> Edit`}
        </button>
      </div>
      <div class="seg" role="group" aria-label="Counting mode">
        <button data-p="mode" data-mode="reps" class="${mode === 'reps' ? 'on' : ''}">Reps</button>
        <button data-p="mode" data-mode="time" class="${mode === 'time' ? 'on' : ''}">Timer</button>
      </div>
      ${counter}
    </div>
    <button class="donebtn" data-p="done">Done${mode === 'reps' ? '' : ' early'}</button>
    <p class="p-nextline">${next ? `Next · <b>${next.name}</b>` : 'Last one'}</p>
    </div>`;

  if (mode === 'time' && !player.editing) startTimer(timeFor(ex)); // timers start automatically
}

// player events (delegated on the overlay)
document.getElementById('player').addEventListener('click', e => {
  if (e.target === e.currentTarget) { closePlayer(); return; } // tap the dimmed backdrop (lightbox)
  const btn = e.target.closest('[data-p]');
  if (!btn) return;
  const act = btn.dataset.p;
  const ex = currentEx();
  if (act === 'close') closePlayer();
  else if (act === 'prev') { if (player.idx > 0) { player.idx -= 1; player.editing = false; renderPlayer(true); } }
  else if (act === 'plus' || act === 'minus') {
    player.reps = Math.max(1, Math.min(99, player.reps + (act === 'plus' ? 1 : -1)));
    store.setPref(ex.id, { reps: player.reps });
    playerEl().querySelector('#pReps').textContent = player.reps;
    navigator.vibrate?.(8);
  }
  else if (act === 'pausetime') toggleTimerPause();
  else if (act === 'edit') { player.editing = !player.editing; renderPlayer(false); }
  else if (act === 'wminus' || act === 'wplus') {
    setWeight(ex, weightFor(ex) + (act === 'wplus' ? WEIGHT_STEP : -WEIGHT_STEP));
    refreshWeight(ex);
    navigator.vibrate?.(8);
  }
  else if (act === 'sminus' || act === 'splus') {
    const n = Math.max(1, Math.min(SETS_MAX, setsFor(ex) + (act === 'splus' ? 1 : -1)));
    store.setPref(ex.id, { sets: n });
    const el = playerEl().querySelector('#pSets');
    if (el) el.parentElement.innerHTML = `<b id="pSets">${n}</b> ${n === 1 ? 'set' : 'sets'}`;
    navigator.vibrate?.(8);
  }
  else if (act === 'tminus' || act === 'tplus') {
    setTime(ex, timeFor(ex) + (act === 'tplus' ? TIME_STEP : -TIME_STEP));
    const el = playerEl().querySelector('#pDur');
    if (el) el.textContent = fmtTime(timeFor(ex));
    navigator.vibrate?.(8);
  }
  else if (act === 'zoom') openViewer(imgFor(ex.id), ex.name);
  else if (act === 'wtype') toast('Long-press to type a weight');
  else if (act === 'mode') { store.setPref(ex.id, { mode: btn.dataset.mode }); renderPlayer(false); }
  else if (act === 'done') {
    const mode = modeFor(ex);
    if (mode === 'reps') {
      logCurrent(player.reps);
    } else {
      const elapsed = Math.round(timeFor(ex) - (player.timer ? Math.max(0, player.timer.remaining) : 0));
      stopTimer();
      logCurrent(Math.max(1, elapsed));
    }
    navigator.vibrate?.(30);
    toast(`Logged · ${ex.name}${setsFor(ex) > 1 ? ` · ${setsFor(ex)} sets` : ''}`);
    advance();
  }
});

// ————— image viewer —————
// The only place in the app where zooming is wanted. Pinch and double-tap are
// implemented here rather than left to the browser, because page zoom is off
// everywhere (it only mangles a fixed layout).

const MAX_ZOOM = 5, TAP_ZOOM = 2.5;
const viewerEl = () => document.getElementById('viewer');
const vw = { s: 1, x: 0, y: 0, pts: new Map(), pinch: null, drag: null, lastTap: 0, moved: false };

function vImg() { return viewerEl().querySelector('img'); }

function vApply() {
  const img = vImg();
  if (!img) return;
  // Keep the picture from being dragged off-screen: at 1× it stays centred, and
  // beyond that it may only move by however much it overflows.
  const r = { w: img.offsetWidth, h: img.offsetHeight };
  const maxX = Math.max(0, (r.w * vw.s - innerWidth) / 2);
  const maxY = Math.max(0, (r.h * vw.s - innerHeight) / 2);
  vw.x = Math.max(-maxX, Math.min(maxX, vw.x));
  vw.y = Math.max(-maxY, Math.min(maxY, vw.y));
  img.style.transform = `translate(${vw.x}px, ${vw.y}px) scale(${vw.s})`;
  viewerEl().classList.toggle('zoomed', vw.s > 1.01);
}

// Screen point -> the image-local point under it, so a gesture can hold that
// same point in place while the scale changes.
function vLocal(px, py) {
  const img = vImg();
  const c = img.getBoundingClientRect();
  const cx = c.left + c.width / 2 - vw.x, cy = c.top + c.height / 2 - vw.y;
  return { u: (px - cx - vw.x) / vw.s, v: (py - cy - vw.y) / vw.s, cx, cy };
}

function vZoomTo(s, px, py) {
  const { u, v, cx, cy } = vLocal(px, py);
  vw.s = Math.max(1, Math.min(MAX_ZOOM, s));
  vw.x = px - cx - u * vw.s;
  vw.y = py - cy - v * vw.s;
  if (vw.s <= 1.01) { vw.s = 1; vw.x = 0; vw.y = 0; }
  vApply();
}

function openViewer(src, alt) {
  const el = viewerEl();
  vw.s = 1; vw.x = 0; vw.y = 0; vw.pts.clear(); vw.pinch = null; vw.drag = null;
  el.innerHTML = `<button class="v-close" data-v="close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button><img src="${src}" alt="${alt || ''}" draggable="false">`;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  vApply();
}

function closeViewer() {
  const el = viewerEl();
  if (el.hidden) return;
  el.hidden = true;
  el.innerHTML = '';
  if (!player.open) document.body.style.overflow = '';
}

{
  const el = document.getElementById('viewer');
  const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = ([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  el.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-v="close"]')) return;
    el.setPointerCapture?.(e.pointerId);
    vw.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    vw.moved = false;
    const pts = [...vw.pts.values()];
    if (pts.length === 2) {
      vw.drag = null;
      vw.pinch = { d: dist(pts), s: vw.s, m: mid(pts) };
    } else if (pts.length === 1) {
      vw.drag = { x: e.clientX, y: e.clientY, ox: vw.x, oy: vw.y };
    }
  });

  el.addEventListener('pointermove', e => {
    if (!vw.pts.has(e.pointerId)) return;
    vw.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...vw.pts.values()];
    if (vw.pinch && pts.length === 2) {
      const d = dist(pts), m = mid(pts);
      vw.moved = true;
      // Anchor on the midpoint of the two fingers as it moves and spreads.
      const { u, v, cx, cy } = vLocal(vw.pinch.m.x, vw.pinch.m.y);
      vw.s = Math.max(1, Math.min(MAX_ZOOM, vw.pinch.s * (d / vw.pinch.d)));
      vw.x = m.x - cx - u * vw.s;
      vw.y = m.y - cy - v * vw.s;
      vw.pinch.m = m;
      vw.pinch.d = d;
      vw.pinch.s = vw.s;
      vApply();
    } else if (vw.drag && pts.length === 1 && vw.s > 1.01) {
      const dx = e.clientX - vw.drag.x, dy = e.clientY - vw.drag.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) vw.moved = true;
      vw.x = vw.drag.ox + dx;
      vw.y = vw.drag.oy + dy;
      vApply();
    }
  });

  const end = e => {
    if (!vw.pts.delete(e.pointerId)) return;
    if (vw.pts.size < 2) vw.pinch = null;
    if (vw.pts.size === 0) {
      vw.drag = null;
      if (vw.moved) return;
      const now = Date.now();
      if (now - vw.lastTap < 300) {           // double tap toggles zoom
        vw.lastTap = 0;
        vZoomTo(vw.s > 1.01 ? 1 : TAP_ZOOM, e.clientX, e.clientY);
      } else {
        vw.lastTap = now;
        // A single tap while zoomed out dismisses; wait to be sure it is single.
        setTimeout(() => { if (vw.lastTap === now && vw.s <= 1.01) closeViewer(); }, 300);
      }
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { if (e.target.closest('[data-v="close"]')) closeViewer(); });
  // Trackpad pinch inside the viewer zooms the image instead of the page.
  el.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    vZoomTo(vw.s * (1 - e.deltaY / 180), e.clientX, e.clientY);
  }, { passive: false });
}

addEventListener('keydown', e => {
  if (e.key === 'Escape' && !viewerEl().hidden) closeViewer();
});

// ————— no zooming the app itself —————
// A fixed layout has nothing to zoom into, and a stray pinch leaves the chrome
// stranded — the tab bar is position: fixed, so a zoomed page anchors it to the
// layout viewport and it ends up floating mid-screen. Safari ignores
// user-scalable=no, so the gestures have to be refused directly.

// The viewer is not an exception here: it zooms the picture with a transform of
// its own, so a native page zoom underneath it is just as wrong. Safari's
// gesture events are the ones that actually drive iOS page zoom, and refusing
// them leaves touch and pointer events — which the viewer runs on — untouched.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, e => e.preventDefault(), { passive: false });
}
// Trackpad pinch on iPad and Mac arrives as a ctrl-modified wheel. The viewer
// has already turned its own copy of this into an image zoom.
document.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

// Outside the viewer, refuse a pinch from its first moment rather than waiting
// for it to move — iPadOS starts scaling early. Inside, the pointer stream is
// left completely alone so the viewer's own pinch is never disturbed.
const inViewer = e => !!e.target?.closest?.('#viewer');
document.addEventListener('touchstart', e => {
  if (e.touches.length > 1 && !inViewer(e)) e.preventDefault();
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1 && !inViewer(e)) e.preventDefault();
}, { passive: false });
document.addEventListener('dblclick', e => { if (!inViewer(e)) e.preventDefault(); }, { passive: false });

// Whatever slips through, snap the page back to 1×. Rewriting the viewport tag
// is the only thing that makes iOS drop an existing zoom; it needs a value it
// has not already got, hence the two-step.
const VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
let unzooming = false;
function resetPageZoom() {
  const vp = window.visualViewport;
  if (unzooming || !vp || vp.scale <= 1.01) return;
  const meta = document.querySelector('meta[name=viewport]');
  if (!meta) return;
  unzooming = true;
  meta.content = VIEWPORT.replace('maximum-scale=1', 'maximum-scale=0.99');
  // Held for a moment rather than a single frame — iOS does not always act on a
  // viewport change it sees for one tick.
  setTimeout(() => {
    meta.content = VIEWPORT;
    setTimeout(() => { unzooming = false; }, 250);
  }, 120);
}
window.visualViewport?.addEventListener('resize', resetPageZoom);
window.visualViewport?.addEventListener('scroll', resetPageZoom);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resetPageZoom();
});

// position: fixed pins to the *layout* viewport, which on iPad is regularly not
// what you can see — the bar ends up floating over the middle of the window and
// drifting as you scroll. Place it against the visual viewport instead, which
// is by definition the visible rectangle, and undo any page scale so it keeps
// its size. Everything else on screen can live with fixed; the bar cannot.
const tabBar = document.querySelector('.tabbar');

// env(safe-area-inset-bottom) is not readable from script, so measure it.
function safeBottom() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;visibility:hidden;height:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return h;
}
let inset = 0;
const barGap = () => (innerWidth >= 768 ? Math.max(20, inset - 6) : Math.max(14, inset - 18));

let pinQueued = false, lastPin = '';
const typing = () => /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');

function pinTabBar() {
  const vv = window.visualViewport;
  if (!vv || !tabBar) return;
  pinQueued = false;
  tabBar.classList.add('pinned');

  // Follow the visible rectangle when the page is zoomed, or while typing in
  // this app so the bar clears our own keyboard. Otherwise sit on the window's
  // bottom edge. A visual viewport that shrinks with nothing focused here is
  // somebody else's keyboard — iPad shares one across windows — and lifting the
  // bar to clear it is what strands it in the middle of the screen.
  const zoomed = vv.scale > 1.01;
  const follow = zoomed || typing();
  const s = zoomed ? 1 / vv.scale : 1;           // keep its size if the page is scaled
  const box = follow
    ? { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height }
    : { x: 0, y: 0, w: innerWidth, h: innerHeight };

  const w = tabBar.offsetWidth, h = tabBar.offsetHeight;
  const x = box.x + (box.w - w * s) / 2;
  const y = box.y + box.h - (h + barGap()) * s;
  const t = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${s})`;
  if (t !== lastPin) { tabBar.style.transform = t; lastPin = t; }
}
const queuePin = () => {
  if (pinQueued) return;
  pinQueued = true;
  requestAnimationFrame(pinTabBar);
};

if (window.visualViewport && tabBar) {
  inset = safeBottom();
  visualViewport.addEventListener('resize', queuePin);
  visualViewport.addEventListener('scroll', queuePin);
  addEventListener('resize', queuePin);
  addEventListener('resize', () => { if (state.tab === 'history') fitChips(); });
  addEventListener('scroll', queuePin, { passive: true });
  addEventListener('orientationchange', () => setTimeout(pinTabBar, 250));
  addEventListener('pageshow', queuePin);
  document.addEventListener('visibilitychange', queuePin);
  // Focus decides whether a shrunken viewport is our keyboard or someone
  // else's, so re-place the bar as soon as that changes.
  addEventListener('focusin', queuePin);
  addEventListener('focusout', () => setTimeout(pinTabBar, 60));
  // The viewport can settle after load — a window animating into place, the
  // app restoring — without firing anything we listen for, which is why this
  // came and went. Re-measure on a slow tick; the write is skipped unless the
  // answer actually moved.
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    pinTabBar();
    const diag = document.getElementById('layoutDiag');
    if (diag) diag.textContent = layoutReport();
  }, 1000);
  pinTabBar();
}

// What the bar was positioned from, for when it still lands in the wrong place.
export function layoutReport() {
  const vv = window.visualViewport;
  const r = tabBar?.getBoundingClientRect();
  const n = v => Math.round(v ?? -1);
  return [
    `win ${n(innerWidth)}×${n(innerHeight)}`,
    vv ? `vv ${n(vv.width)}×${n(vv.height)} @${n(vv.offsetLeft)},${n(vv.offsetTop)} ×${(vv.scale || 1).toFixed(2)}` : 'vv none',
    r ? `bar ${n(r.top)}–${n(r.bottom)}` : 'bar none',
    `gap ${barGap()} inset ${inset}${typing() ? ' typing' : ''}`,
  ].join(' · ');
}

function refreshWeight(ex) {
  const el = playerEl().querySelector('#pWeight');
  if (el) el.textContent = weightFor(ex);
}

// Long-press the weight value to type an exact number (short tap just hints).
(() => {
  const pl = document.getElementById('player');
  let timer = null, fired = false;
  const clear = () => { clearTimeout(timer); timer = null; };
  pl.addEventListener('pointerdown', e => {
    if (!e.target.closest('[data-p="wtype"]')) return;
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      navigator.vibrate?.(20);
      const ex = currentEx();
      const input = prompt(`Weight for ${ex.name} (kg)`, String(weightFor(ex)));
      if (input !== null) {
        const n = parseFloat(String(input).replace(',', '.'));
        if (!Number.isNaN(n)) { setWeight(ex, n); refreshWeight(ex); toast(`Weight · ${weightFor(ex)} kg`); }
      }
    }, 500);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => pl.addEventListener(ev, clear));
  // swallow the click that follows a long-press so the hint toast doesn't also fire
  pl.addEventListener('click', e => {
    if (fired && e.target.closest('[data-p="wtype"]')) { e.stopPropagation(); fired = false; }
  }, true);
})();

// ————— history —————

// ————— history derivations —————
// Everything on the History screen is computed from the same append-only log
// that the player and quick-log write; nothing extra is persisted.

const dayMs = 86400000;
const dateOf = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };

function groupOf(exId) {
  const ex = byId[exId];
  if (!ex) return null;
  const defs = SUBGROUPS[ex.cat];
  return defs && ex.group ? defs[ex.group] : CATS[ex.cat];
}
// Every group a day's sets belong to, busiest first.
function tallied(entries, of) {
  const tally = {};
  for (const e of entries) { const k = of(e); if (k) tally[k] = (tally[k] || 0) + 1; }
  return Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

// One chip per thing a day touched, so a collapsed row says what it was
// without being opened. Séries are the exception: they collapse into a single
// "Séries E · F", since the letters read as a set.
function dayChips(entries) {
  const series = [], rest = [];
  for (const label of tallied(entries, e => groupOf(e.ex))) {
    const m = label.match(/^Série\s+(.+)$/);
    if (m) series.push(m[1]); else rest.push(label);
  }
  series.sort();
  const chips = [];
  if (series.length === 1) chips.push(`Série ${series[0]}`);
  else if (series.length) chips.push(`Séries ${series.join(' · ')}`);
  return chips.concat(rest);
}

// Ordinary sentence case — a capital to open and lower case after it. A lone
// letter is left alone, otherwise "Série G" would come out as "Série g".
function sentenceCase(phrase) {
  const words = phrase.split(' ').map(w => (w.length === 1 && /\p{Lu}/u.test(w) ? w : w.toLowerCase()));
  const out = words.join(' ');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// The série (or stretching block) a row belongs to, named with its focus so a
// section header says what it worked: "Série G · Back & biceps".
function sectionLabel(exId) {
  const ex = byId[exId];
  if (!ex) return '';
  const name = groupOf(exId) || '';
  const focus = ex.cat === 'gym' ? GROUP_FOCUS[ex.group] : null;
  return [name, focus].filter(Boolean).map(sentenceCase).join(' · ');
}

function byDayMap(log) {
  const m = new Map();
  for (const e of log) { if (!m.has(e.d)) m.set(e.d, []); m.get(e.d).push(e); }
  return m;
}

// Consecutive logged days, counting back from today (a gap of one day is only
// allowed at the very start, so "yesterday but not today" still shows a streak).
function streakDays(days) {
  const set = new Set(days);
  let n = 0;
  let cursor = new Date();
  if (!set.has(store.localDate(cursor.getTime()))) {
    cursor = new Date(cursor.getTime() - dayMs);
    if (!set.has(store.localDate(cursor.getTime()))) return 0;
  }
  while (set.has(store.localDate(cursor.getTime()))) { n++; cursor = new Date(cursor.getTime() - dayMs); }
  return n;
}

// Two things tell us what an exercise weighed at a point in time: a weight the
// user edited, and the weight carried by a logged set. Both are treated as
// observations on one timeline, and a change is emitted wherever consecutive
// observations differ — so editing a weight counts on its own, and logging a
// set at that same weight afterwards doesn't repeat it. Newest first.
function weightChanges(log, wlog = store.liveWeightLog()) {
  const obs = [];
  for (const e of log) if (e.w) obs.push({ t: e.t, d: e.d, ex: e.ex, w: e.w });
  for (const e of wlog) obs.push({ t: e.t, d: e.d, ex: e.ex, w: e.to, from: e.from, edit: true });
  obs.sort((a, b) => a.t - b.t);

  const last = {};
  const out = [];
  for (const o of obs) {
    // An edit knows what it moved from, so it can be the first thing we ever
    // saw for an exercise; a logged set only establishes a baseline.
    const prev = last[o.ex] ?? o.from;
    if (prev !== undefined && prev !== o.w) {
      out.push({ ex: o.ex, from: prev, to: o.w, delta: o.w - prev, t: o.t, d: o.d, edit: o.edit });
    }
    last[o.ex] = o.w;
  }
  return out.reverse();
}

// Every week from the first day logged to this one, Monday-first, in rows of
// seven bucketed into 4 heat levels. Five weeks minimum so a new log still
// looks like a calendar; the grid scrolls when there is more.
function heatWeeks(byDay, span = byDay) {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;                      // 0 = Monday
  const end = new Date(today.getTime() + (6 - dow) * dayMs); // Sunday of this week
  // `span` fixes how far back the grid reaches, so switching what the cells
  // count does not resize the calendar under you.
  const keys = [...span.keys()].sort();
  const first = keys.length ? dateOf(keys[0]) : new Date(today.getTime() - 34 * dayMs);
  const spanDays = Math.round((end - first) / dayMs) + 1;
  const weeks = Math.max(5, Math.ceil(spanDays / 7));

  const rows = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(end.getTime() - (w * 7 + i) * dayMs);
      const key = store.localDate(dt.getTime());
      const n = (byDay.get(key) || []).length;
      cells.push({ key, n, future: dt > today, lvl: n === 0 ? 0 : n <= 3 ? 1 : n <= 8 ? 2 : 3 });
    }
    // Label a row with the month it opens, but only when that month changes,
    // so a long scroll stays readable without repeating itself.
    const m = cells[0].key.slice(0, 7);
    const prev = rows.length ? rows[rows.length - 1].month : null;
    rows.push({ cells, month: m, label: m === prev ? '' : monthName(monthIdx(cells[0].key)) });
  }
  return rows;
}

const monthIdx = ymd => { const [y, m] = ymd.split('-').map(Number); return y * 12 + (m - 1); };
const monthName = mi => new Date(Math.floor(mi / 12), mi % 12, 1).toLocaleDateString(undefined, { month: 'short' });

// Six bars = the year ending on `d`, one bar per two-month period. Each bar is
// the latest weight logged in its period, so a row reads as a year of progress
// rather than whatever happened in the last six sessions.
function yearBuckets(sessions, d) {
  const m0 = monthIdx(d);
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const endM = m0 - (5 - i) * 2;                 // newest bucket ends at d's month
    return { from: endM - 1, to: endM, s: null };
  });
  for (const s of sessions) {                      // oldest → newest, so the last wins
    if (s.day > d) continue;
    const back = Math.floor((m0 - monthIdx(s.day)) / 2);
    if (back >= 0 && back <= 5) buckets[5 - back].s = s;
  }
  return buckets;
}

// Per-exercise detail for one day: totals, a year of two-month weight bars and
// how the current weight compares with the one before.
function dayDetail(log, d) {
  const entries = (byDayMap(log).get(d) || []);
  const perEx = new Map();
  for (const e of entries) {
    if (!perEx.has(e.ex)) perEx.set(e.ex, { sets: 0, reps: 0, secs: 0, w: 0 });
    const a = perEx.get(e.ex);
    a.sets++;
    if (e.mode === 'reps') a.reps += e.v; else a.secs += e.v;
    if (e.w) a.w = Math.max(a.w, e.w);
  }
  const rows = [];
  for (const [exId, a] of perEx) {
    // weight per session (day) for this exercise, oldest → newest
    const sessions = [...byDayMap(log.filter(e => e.ex === exId)).entries()]
      .sort((x, y) => (x[0] < y[0] ? -1 : 1))
      .map(([day, es]) => ({ day, w: Math.max(0, ...es.map(e => e.w || 0)) }));
    const upTo = sessions.filter(s => s.day <= d);
    const bars = yearBuckets(upTo, d);
    const cur = upTo.length ? upTo[upTo.length - 1].w : a.w;
    rows.push({ exId, ...a, bars, cur });
  }
  return { entries, rows };
}

// Weight actually moved: reps × the weight on the bar. Timed holds carry no
// rep count, so they contribute nothing here.
function dayVolume(entries) {
  return entries.reduce((t, e) => t + (e.mode === 'reps' ? e.v * (e.w || 0) : 0), 0);
}

function agoDay(d) {
  // Midnight to midnight — measuring from *now* made anything after midday
  // today round up to "yesterday".
  const diff = Math.round((dateOf(store.localDate()).getTime() - dateOf(d).getTime()) / dayMs);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.round(diff / 7)}w ago`;
  return `${Math.round(diff / 30)}mo ago`;
}

function deltaChip(delta) {
  if (delta > 0) return `<span class="wchip up">+${+delta.toFixed(1)}</span>`;
  if (delta < 0) return `<span class="wchip down">${+delta.toFixed(1)}</span>`;
  return `<span class="wchip flat">±0</span>`;
}

function dayLabel(d) {
  const today = store.localDate();
  const yest = store.localDate(Date.now() - 86400000);
  if (d === today) return 'Today';
  if (d === yest) return 'Yesterday';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const ICON_GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>`;
const ICON_CHEV = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`;

const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>`;

// Wrap a History row so it can be swiped aside to reveal a delete button.
// `target` is "day:<date>" or "ex:<date>:<exerciseId>".
function swipeRow(target, inner) {
  return `<div class="swipe" data-target="${target}">
    <button class="swipe-del" data-del="${target}" aria-label="Delete">${ICON_TRASH}</button>
    <div class="swipe-body">${inner}</div>
  </div>`;
}

function historyEmpty() {
  return `<div class="h-head"><h2 class="h-title">History</h2>
      <div class="h-actions">${themeBtnHTML()}<button class="iconbtn" data-act="gear" aria-label="Settings">${ICON_GEAR}</button></div></div>
    <div class="empty">No sets logged yet.<br>Open any exercise and tap <b>Done</b>, or run the Corpo routine.</div>`;
}

function renderHistory() {
  resetSwipe();
  const log = store.getLog();
  if (state.hView === 'gear') return renderGear();
  // Weight changes are a mode of this screen, not a screen of their own: the
  // tile toggles what the calendar counts and what the list below shows.
  const showWeights = state.hView === 'weights';

  // Weight changes are history too — the screen is only empty when there is
  // neither a logged set nor a recorded weight change to show.
  const changes = weightChanges(log);
  if (!log.length && !changes.length) {
    view.innerHTML = `<div class="history-wrap">${historyEmpty()}</div>`;
    return;
  }
  const byDay = byDayMap(log);
  const days = [...byDay.keys()].sort().reverse();
  const streak = streakDays(days);
  const weekAgo = store.localDate(Date.now() - 6 * dayMs);
  const sessions = days.filter(d => d >= weekAgo).length;
  const added = changes.reduce((a, c) => a + c.delta, 0);

  const changeDays = new Map();
  for (const c of changes) {
    if (!changeDays.has(c.d)) changeDays.set(c.d, []);
    changeDays.get(c.d).push(c);
  }
  // Same span either way, so the grid does not jump when the mode changes.
  const weeks = heatWeeks(showWeights ? changeDays : byDay, byDay.size ? byDay : changeDays);

  const tiles = `
    <div class="h-tiles">
      <button class="h-tile link ${showWeights ? 'on' : ''}" data-act="weights" aria-pressed="${showWeights}">
        <b class="sage">${added >= 0 ? '+' : ''}${+added.toFixed(1)}</b><span>kg · weight changes</span>
        <i class="t-chev ${showWeights ? 'open' : ''}">${ICON_CHEV}</i>
      </button>
      <div class="h-tile"><b class="sage">${streak}</b><span>day streak</span></div>
      <div class="h-tile"><b>${sessions}</b><span>sessions this week</span></div>
    </div>`;

  const since = days.length
    ? dateOf(days[days.length - 1]).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '';
  const heat = `
    <div class="h-card heat">
      <div class="heat-top"><span>${since ? `Since ${since}` : 'Last 5 weeks'}</span>
        <span class="heat-legend">less<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i>more</span>
      </div>
      <div class="heat-heads"><span></span>${['M','T','W','T','F','S','S'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="heat-scroll"><div class="heat-grid">${weeks.map(w => `
        <span class="heat-mon">${w.label}</span>
        ${w.cells.map(c => `<i class="l${c.lvl}${c.future ? ' fut' : ''}" title="${c.key} · ${c.n} sets"></i>`).join('')}
      `).join('')}</div></div>
    </div>`;

  const rows = days.slice(0, 30).map(d => {
    const es = byDay.get(d);
    const reps = es.filter(e => e.mode === 'reps').reduce((a, e) => a + e.v, 0);
    const vol = dayVolume(es);
    // Sets, reps and the weight moved — all of it readable without opening the
    // day. The séries used to sit here as chips; the sections inside the day
    // name them now.
    const meta = `${es.length} set${es.length === 1 ? '' : 's'}`
      + (reps ? ` · ${reps} reps` : '')
      + (vol ? ` · ${vol.toLocaleString()} kg` : '');
    const open = state.openDay === d;
    if (!open) {
      return swipeRow(`day:${d}`, `<button class="d-row" data-day="${d}">
        <span class="d-main"><b>${dayLabel(d)}</b><small>${meta}</small></span>
        <span class="d-chips">${dayChips(es).map(c => `<span class="d-chip">${c}</span>`).join('')}<span class="d-chip d-more" hidden>…</span></span>
        <i class="d-chev">${ICON_CHEV}</i>
      </button>`);
    }
    const det = dayDetail(log, d);
    const exRow = r => {
      const max = Math.max(1, ...r.bars.map(b => b.s?.w || 0));
      const bars = r.bars.map(b => {
        const period = `${monthName(b.from)}–${monthName(b.to)}`;
        return b.s
          ? `<i style="height:${Math.max(12, Math.round((b.s.w / max) * 100))}%" title="${period} · ${b.s.w} kg"></i>`
          : `<i class="none" title="${period} · no sets"></i>`;
      }).join('');
      return swipeRow(`ex:${d}:${r.exId}`, `<div class="x-row">
        <span class="x-main"><b>${byId[r.exId]?.name || r.exId}</b><small>${r.sets}×${r.reps ? ` · ${r.reps} reps` : ''}${r.secs ? ` · ${fmtTime(r.secs)}` : ''}</small></span>
        <span class="x-bars">${bars}</span>
        <span class="x-w">${r.cur ? `<b>${r.cur} kg</b>` : ''}</span>
      </div>`);
    };

    // Split the day by what each exercise belongs to, in the order it was
    // trained, so a session across two séries reads as two blocks rather than
    // one undifferentiated list. A day inside a single group needs no headers.
    const sections = [];
    for (const r of det.rows) {
      const label = sectionLabel(r.exId);
      let s = sections.find(x => x.label === label);
      if (!s) sections.push(s = { label, rows: [] });
      s.rows.push(r);
    }
    const exRows = sections.length > 1
      ? sections.map(s => `<div class="x-head">${s.label}</div>${s.rows.map(exRow).join('')}`).join('')
      : det.rows.map(exRow).join('');
    return `<div class="d-open">
      <button class="d-row head" data-day="${d}">
        <span class="d-main"><b>${dayLabel(d)}</b><small>${meta}</small></span>
        <span class="d-chips">${dayChips(es).map(c => `<span class="d-chip">${c}</span>`).join('')}</span>
        <i class="d-chev open">${ICON_CHEV}</i>
      </button>
      ${exRows}
    </div>`;
  }).join('');

  view.innerHTML = `<div class="history-wrap">
    <div class="h-head"><h2 class="h-title">History</h2>
      <div class="h-actions">${themeBtnHTML()}<button class="iconbtn" data-act="gear" aria-label="Settings">${ICON_GEAR}</button></div>
    </div>
    ${tiles}
    ${heat}
    ${showWeights
      ? `<div class="h-lab">Weight changes</div>${weightRowsHTML(changes)}`
      : `<div class="h-lab">Recent</div>${rows
          ? `<div class="h-card list">${rows}</div>`
          : `<div class="empty sm">No sets logged yet — tap <b>Done</b> on an exercise to start a session.</div>`}`}
  </div>`;

  fitChips();

  // Show five weeks and open on this one; scrolling up walks back through the
  // history. The cells are square and sized by the column width, so the height
  // of five rows has to be measured rather than assumed.
  const hs = view.querySelector('.heat-scroll');
  const cell = hs?.querySelector('i');
  if (hs && cell) {
    const row = cell.getBoundingClientRect().height + 5;   // + grid gap
    hs.style.maxHeight = `${Math.round(row * 5 - 5)}px`;
    hs.scrollTop = hs.scrollHeight;
  }
}

// A closed day row stays one line: drop tags off the end until what is left
// fits beside the day's numbers, and mark the remainder with an ellipsis. How
// many fit depends on the text and the window, so it has to be measured. An
// open day is exempt — there is room to show them all there.
function fitChips() {
  const GAP = 4;
  for (const box of view.querySelectorAll('.d-row:not(.head) .d-chips')) {
    const chips = [...box.querySelectorAll('.d-chip:not(.d-more)')];
    const more = box.querySelector('.d-more');
    if (!more) continue;

    chips.forEach(c => { c.hidden = false; });
    more.hidden = false;
    const moreW = more.offsetWidth;      // measured while it is laid out
    more.hidden = true;
    // Measured with everything showing, so it is the full allowance the row
    // gives the tags. scrollWidth is no use here: a clipped flex row reports it
    // as the visible width, so overflow is invisible to it.
    const budget = box.clientWidth;
    if (!budget) continue;

    let used = 0, cut = -1;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].offsetWidth + (i ? GAP : 0);
      const rest = i < chips.length - 1;               // room for "…" as well
      if (used + w + (rest ? GAP + moreW : 0) > budget) { cut = i; break; }
      used += w;
    }
    if (cut < 0) continue;
    for (let i = cut; i < chips.length; i++) chips[i].hidden = true;
    more.hidden = false;
  }
}

function weightRowsHTML(changes) {
  if (!changes.length) return `<div class="empty sm">No weight changes recorded yet.</div>`;
  const byMonth = new Map();
  for (const c of changes) {
    const k = c.d.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(c);
  }
  return [...byMonth.entries()].map(([k, list]) => {
    const [y, m] = k.split('-').map(Number);
    const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return `<div class="h-lab sub">${title}</div>
      <div class="h-card list">${list.map(c => swipeRow(`${c.edit ? 'wc' : 'ex'}:${c.d}:${c.ex}`, `
        <div class="w-row">
          <span class="x-main"><b>${byId[c.ex]?.name || c.ex}</b><small>${agoDay(c.d).replace(/^t/, 'T')} · ${groupOf(c.ex) || ''}</small></span>
          <span class="x-w"><b>${c.from} → ${c.to} kg</b><small>${deltaChip(c.delta)}</small></span>
        </div>`)).join('')}</div>`;
  }).join('');
}

const ICON_SET = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
  export: '<path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  import: '<path d="M12 20V9m0 0l-4.5 4.5M12 9l4.5 4.5M5 4h14"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
};
const setIcon = (name, size) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_SET[name]}</svg>`;

// One row of the "Your data" card: icon tile, title, what it does, and an
// optional figure on the right so Export can say how much it will export.
function dataRow(act, icon, title, help, value = '', danger = false) {
  return `<button class="set-row" data-act="${act}">
    <span class="set-ico ${danger ? 'danger' : ''}">${setIcon(icon, 15)}</span>
    <span class="set-text"><b class="${danger ? 'danger' : ''}">${title}</b><small>${help}</small></span>
    ${value ? `<span class="set-val">${value}</span>` : ''}
  </button>`;
}

function renderGear() {
  const theme = (store.get('settings', {})).theme || 'auto';
  const seg = ['auto', 'light', 'dark'].map(t =>
    `<button class="${t === theme ? 'on' : ''}" data-act="theme-set" data-theme="${t}"
       aria-pressed="${t === theme}">${t[0].toUpperCase()}${t.slice(1)}</button>`).join('');
  const sets = store.getLog().length;

  view.innerHTML = `<div class="settings-wrap">
    <div class="h-head back">
      <button class="iconbtn" data-act="h-back" aria-label="Back">${setIcon('back', 18)}</button>
      <h2 class="set-title">Settings</h2>
    </div>

    <h3 class="set-lab">Sync</h3>
    ${syncCardHTML()}

    <h3 class="set-lab">Your data</h3>
    <div class="set-card">
      ${dataRow('export', 'export', 'Export', 'JSON of every set, hold and weight change',
                `${sets.toLocaleString()} set${sets === 1 ? '' : 's'}`)}
      ${dataRow('import', 'import', 'Import', 'Merge a file from another device')}
      ${dataRow('reset-weights', 'trash', 'Reset weight changes', 'Keeps sessions, clears the weight log', '', true)}
      ${dataRow('reset', 'trash', 'Reset all data', 'Sessions, holds and weights — cannot be undone', '', true)}
    </div>

    <h3 class="set-lab">Appearance</h3>
    <div class="setseg" role="group" aria-label="Theme">${seg}</div>

    <h3 class="set-lab">About</h3>
    <div class="set-card">
      <div class="set-row static" id="verRow">
        <span class="set-text"><b>Version <span class="tnum" id="appVer">…</span></b><small id="verSub">${NATIVE ? 'Desktop app · install a new build to update' : 'Checking…'}</small></span>
        ${NATIVE ? '' : '<button class="ghostpill" data-act="update">Check</button>'}
      </div>
    </div>
    <div class="verline diag" id="layoutDiag" hidden>${layoutReport()}</div>
    <input type="file" id="importFile" accept="application/json" hidden>
  </div>`;

  appVersion().then(v => {
    const el = document.getElementById('appVer');
    if (!el) return;
    el.textContent = v.label;
    if (NATIVE) return;                 // nothing to check against, and the row already says so
    const sub = document.getElementById('verSub');
    const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (v.stale) {
      el.classList.add('stale');
      if (sub) sub.textContent = `${v.ready || 'An update'} is ready · checked ${at}`;
      const btn = view.querySelector('button[data-act="update"]');
      if (btn) { btn.textContent = 'Update'; btn.classList.add('accent'); }
    } else if (sub) {
      sub.textContent = `Up to date · checked ${at}`;
    }
  });

  // The layout report is debug output, not a setting — keep it reachable for
  // chasing tab-bar placement on a real device, but out of the way.
  longPress(view.querySelector('#verRow'), () => {
    const d = view.querySelector('#layoutDiag');
    if (d) d.hidden = !d.hidden;
  });
}

// Fires after a held press without stealing the click that follows a tap.
function longPress(el, fn, ms = 600) {
  if (!el) return;
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', () => { timer = setTimeout(fn, ms); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, stop);
}

// Reloads when a newer build is sitting downloaded but not yet running, which
// is the state the auto-update leaves the app in if it could not reload at the
// time (mid-workout, say).
async function checkForUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) { toast('No service worker'); return; }
  toast('Checking…');
  try {
    await reg.update();
    const v = await appVersion();
    if (v.stale || reg.waiting) { toast('Updating…'); setTimeout(() => location.reload(), 400); return; }
    toast(`Up to date · ${v.label}`);
  } catch {
    toast('Could not check — no connection?');
  }
}

function agoLabel(ts) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(ts).toLocaleDateString();
}

// Every device sharing the gist, most recently seen first — so this one leads,
// having just synced. The names alone are the visible part; when each was last
// seen is there on hover rather than crowding the row.
function deviceListHTML() {
  const list = sync.devices();
  if (!list.length) return '';
  const title = list.map(d => `${d.label} · ${agoLabel(d.seen)}${d.self ? ' · this device' : ''}`).join('\n');
  return `<span class="sync-devices" title="${title.replace(/"/g, '&quot;')}">
    ${list.map(d => d.label).join(' · ')}</span>`;
}

function syncCardHTML() {
  const c = sync.cfg();
  if (c) {
    return `<div class="set-card sync">
      <div class="sync-stat">
        <i class="dot" aria-hidden="true"></i>
        <b>Synced ${agoLabel(c.lastSync)}</b>
        ${deviceListHTML()}
      </div>
      <p class="sync-note">Secret gist <code>${c.gistId.slice(0, 7)}</code> — your history only,
        no servers, no account.</p>
      <div class="sync-btns">
        <button class="pill accent" data-act="sync-now">${setIcon('refresh', 13)} Sync now</button>
        <button class="pill ghost" data-act="sync-off">Disconnect</button>
      </div>
    </div>`;
  }
  const step = (n, text) => `<li><i>${n}</i><span>${text}</span></li>`;
  return `<div class="set-card sync">
    <ol class="sync-steps">
      ${step(1, 'Create a <b>classic</b> token on github.com with only the <b>gist</b> scope.')}
      ${step(2, 'Paste it here — a <b>secret</b> gist is created to hold your history.')}
      ${step(3, 'Repeat on your other devices with the <b>same token</b>.')}
    </ol>
    <div class="sync-form">
      <input id="syncToken" type="password" placeholder="ghp_… token" autocomplete="off" spellcheck="false">
      <button class="pill accent" data-act="sync-connect">Connect</button>
    </div>
    <p class="sync-fine">The token stays on this device and is only ever sent to api.github.com.</p>
  </div>`;
}

// ————— history swipe-to-delete —————
// Drag a row to the right to reveal its delete button; deletes are tombstoned
// (so a gist sync will not resurrect them) and offered back via an Undo toast.

const SWIPE_OPEN = 76;   // how far the row rests when open
const SWIPE_TRIGGER = 34; // drag past this and it snaps open

let sw = null;           // { body, startX, startY, dx, dragging, decided }

function closeSwipes(except) {
  view.querySelectorAll('.swipe.open, .swipe.dragging').forEach(el => {
    if (el !== except) el.classList.remove('open', 'dragging');
  });
}

// A re-render throws away the row nodes, so any in-flight gesture must be
// dropped with them — otherwise `sw.body` points at a detached element.
function resetSwipe() {
  if (sw) { sw.body.parentElement?.classList.remove('dragging'); sw = null; }
  swipeJustDragged = false;
}

view.addEventListener('pointerdown', e => {
  const body = e.target.closest('.swipe-body');
  if (!body || e.target.closest('.swipe-del')) return;
  sw = { body, startX: e.clientX, startY: e.clientY, dx: 0, dragging: false, decided: false };
});

view.addEventListener('pointermove', e => {
  if (!sw) return;
  const dx = e.clientX - sw.startX;
  const dy = e.clientY - sw.startY;
  if (!sw.decided) {
    // let vertical scrolling win; only claim clearly-horizontal drags
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
    if (Math.abs(dx) < 8) return;
    sw.decided = true;
    sw.dragging = true;
    closeSwipes(sw.body.parentElement);
    sw.body.parentElement.classList.add('dragging');
  }
  sw.dx = Math.max(0, Math.min(dx, SWIPE_OPEN + 14)); // right-swipe only
  sw.body.style.transition = 'none';
  sw.body.style.transform = `translateX(${sw.dx}px)`;
});

let swipeJustDragged = false;

function endSwipe() {
  if (!sw) return;
  const { body, dx, dragging } = sw;
  sw = null;
  if (!dragging) return;
  body.style.transition = '';
  body.style.transform = '';
  body.parentElement.classList.remove('dragging');
  body.parentElement.classList.toggle('open', dx > SWIPE_TRIGGER);
  swipeJustDragged = true;  // the trailing click must not act on the row
}
view.addEventListener('pointerup', endSwipe);
view.addEventListener('pointercancel', endSwipe);

// A drag is always followed by a click; swallow that one, otherwise it would
// immediately re-close the row it just opened (or expand the day underneath).
view.addEventListener('click', e => {
  if (swipeJustDragged) {
    swipeJustDragged = false;
    e.stopPropagation();
    e.preventDefault();
    return;
  }
  if (e.target.closest('.swipe-del')) return;          // let the delete through
  const open = view.querySelector('.swipe.open');
  if (open) {                                          // any tap elsewhere closes it
    closeSwipes();
    if (open.contains(e.target)) { e.stopPropagation(); e.preventDefault(); }
  }
}, true);

// "day:<date>" removes that day's sets, "ex:<date>:<id>" one exercise's, and
// "wc:<date>:<id>" a recorded weight change (which has no sets behind it).
function deleteTarget(target) {
  const [kind, d, exId] = target.split(':');
  const name = byId[exId]?.name || exId;

  if (kind === 'wc') {
    const removed = store.deleteWeightChanges(e => e.d === d && e.ex === exId);
    if (!removed.length) return;
    navigator.vibrate?.(14);
    renderHistory();
    toast(`Deleted · ${name}`, () => { store.restoreWeightChanges(removed); renderHistory(); });
    return;
  }

  const pred = kind === 'day'
    ? e => e.d === d
    : e => e.d === d && e.ex === exId;
  const removed = store.deleteEntries(pred);
  if (!removed.length) return;
  navigator.vibrate?.(14);
  if (kind === 'day' && state.openDay === d) state.openDay = null;
  renderHistory();
  toast(`Deleted · ${kind === 'day' ? dayLabel(d) : name}`, () => {
    store.restoreEntries(removed); renderHistory();
  });
}

// ————— render root —————

function markTab() {
  document.querySelectorAll('.tabbar button[data-tab]').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === state.tab));
}

function render() {
  resetSwipe();
  if (state.tab !== 'routine') leaveRoutine();
  markTab();
  if (state.tab === 'exercises') renderExercises();
  else if (state.tab === 'history') renderHistory();
  else mountRoutine(view);
  placeControls();   // the tabs row only exists on one screen — re-measure while it is there
}

// ————— events —————

// Remember the vertical scroll position of each screen — and of each Exercises
// category / sub-group — so switching filters or tabs returns you to where you
// were instead of snapping back to the top.
const scrollMem = {};
const viewKey = () => (state.tab === 'exercises' ? `ex:${state.cat}:${state.group}` : state.tab);
let curScrollKey = viewKey();
let restoringScroll = false;
let restoreTimers = [];
function saveScroll() { if (!restoringScroll) scrollMem[curScrollKey] = scrollY; }
function restoreScroll() {
  restoreTimers.forEach(clearTimeout); restoreTimers = [];
  curScrollKey = viewKey();
  const y = scrollMem[curScrollKey] || 0;
  // Fresh screen (top): jump once and leave it immediately scrollable.
  if (!y) { restoringScroll = false; scrollTo(0, 0); return; }
  // Re-apply across a few frames + a short fallback: replacing a small
  // sub-group with the long "All groups" list can leave iOS ignoring a single
  // scroll until layout settles. The guard keeps saveScroll from clobbering the
  // remembered value while we settle.
  restoringScroll = true;
  const apply = () => scrollTo(0, y);
  apply();
  requestAnimationFrame(apply);
  requestAnimationFrame(() => requestAnimationFrame(apply));
  restoreTimers.push(setTimeout(apply, 90));
  restoreTimers.push(setTimeout(() => { restoringScroll = false; }, 140));
}

// Show a hairline under the sticky filter bar once the grid scrolls beneath it,
// and keep the current screen's scroll position up to date.
addEventListener('scroll', () => {
  document.querySelector('.topbar')?.classList.toggle('stuck', scrollY > 4);
  saveScroll();
  if (!sw && view.querySelector('.swipe.open')) closeSwipes();
}, { passive: true });

document.querySelector('.tabbar').addEventListener('click', e => {
  const ctl = e.target.closest('button[data-r]');
  if (ctl) { routineControl(ctl.dataset.r); return; }
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  saveScroll();
  if (btn.dataset.tab === 'history' && state.tab !== 'history') { state.hView = 'list'; state.openDay = null; }
  state.tab = btn.dataset.tab;
  render();
  restoreScroll();
});

// ————— the tab bar doubles as the routine transport —————
// A running série is a mode: the three tabs are swapped for back · play/pause ·
// skip · End in the same pill, in place. That frees the 82px the in-content
// control row used to cost, which is what pushed the up-next rail behind the bar.
const TABS_HTML = tabBar.innerHTML;

const RT_ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
};

function transportHTML(running) {
  return `
    <button class="rt-btn" data-r="back" aria-label="Previous">${RT_ICON.back}</button>
    <button class="rt-btn primary" data-r="playpause" aria-label="${running ? 'Pause' : 'Resume'}">
      ${running ? RT_ICON.pause : RT_ICON.play}
    </button>
    <button class="rt-btn" data-r="skip" aria-label="Skip">${RT_ICON.skip}</button>
    <span class="rt-div" aria-hidden="true"></span>
    <button class="rt-end" data-r="exit">End</button>`;
}

document.addEventListener('routine:player', e => {
  const { open, running } = e.detail;
  tabBar.classList.toggle('transport', open);
  tabBar.setAttribute('aria-label', open ? 'Routine controls' : 'Sections');
  tabBar.innerHTML = open ? transportHTML(running) : TABS_HTML;
  if (!open) markTab();
});

view.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) {
    saveScroll();
    if (chip.dataset.cat) {
      state.cat = chip.dataset.cat;
      state.group = groupMem[state.cat] || 'all'; // resume this category's last sub-group
    } else if (chip.dataset.group) {
      state.group = chip.dataset.group;
      groupMem[state.cat] = state.group;          // remember it for next time
    }
    renderExercises();
    restoreScroll();
    return;
  }
  const q = e.target.closest('.qlog[data-q]');
  if (q) { quickLog(byId[q.dataset.q]); return; }
  const card = e.target.closest('.gcard[data-ex]');
  if (card) {
    const list = filteredList().map(x => x.id);
    openPlayer(list, list.indexOf(card.dataset.ex));
    return;
  }
  // history: delete a swiped-open row
  const del = e.target.closest('.swipe-del[data-del]');
  if (del) { deleteTarget(del.dataset.del); return; }

  // history: expand/collapse a day (single open at a time)
  const dayRow = e.target.closest('[data-day]');
  if (dayRow) {
    state.openDay = state.openDay === dayRow.dataset.day ? null : dayRow.dataset.day;
    renderHistory();
    return;
  }
  const actBtn = e.target.closest('button[data-act]');
  if (!actBtn) return;
  const act = actBtn.dataset.act;
  if (act === 'gear') { state.hView = 'gear'; renderHistory(); scrollTo(0, 0); return; }
  if (act === 'weights') { state.hView = state.hView === 'weights' ? 'list' : 'weights'; renderHistory(); return; }
  if (act === 'update') { checkForUpdate(); return; }
  if (act === 'h-back') { state.hView = 'list'; renderHistory(); scrollTo(0, 0); return; }
  if (actBtn.dataset.act === 'export') doExport();
  else if (actBtn.dataset.act === 'import') view.querySelector('#importFile').click();
  else if (actBtn.dataset.act === 'reset') doReset();
  else if (actBtn.dataset.act === 'reset-weights') doResetWeights(actBtn);
  else if (actBtn.dataset.act === 'sync-connect') doSyncConnect(actBtn);
  else if (actBtn.dataset.act === 'sync-now') doSyncNow(actBtn);
  else if (actBtn.dataset.act === 'sync-off') {
    if (confirm('Disconnect sync on this device? The gist and other devices keep their data.')) {
      sync.disconnect();
      toast('Sync disconnected');
      renderHistory();
    }
  }
});

// Show progress in a button without losing the icon markup inside it; the
// returned function puts the button back exactly as it was.
function busy(btn, label) {
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = label;
  return () => { btn.disabled = false; btn.innerHTML = html; };
}

async function doSyncConnect(btn) {
  const input = view.querySelector('#syncToken');
  const done = busy(btn, 'Connecting…');
  try {
    const r = await sync.connect(input.value);
    toast(`Sync connected${r?.pulled ? ` · ${r.pulled} ${r.pulled === 1 ? 'set' : 'sets'} pulled` : ''}`);
    renderHistory();
  } catch (err) {
    toast(`Sync failed: ${err.message}`);
    done();
  }
}

async function doSyncNow(btn) {
  const done = busy(btn, 'Syncing…');
  try {
    const r = await sync.syncNow();
    toast(r?.pulled ? `Synced · ${r.pulled} new ${r.pulled === 1 ? 'set' : 'sets'} pulled` : 'Synced ✓');
  } catch (err) {
    toast(`Sync failed: ${err.message}`);
  }
  done();
  if (state.tab === 'history') renderHistory();
}

view.addEventListener('change', e => {
  if (e.target.id !== 'importFile') return;
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(text => {
    store.importData(text);
    toast('Backup imported');
    render();
  }).catch(err => toast(`Import failed: ${err.message}`));
});

async function doExport() {
  const json = store.exportData();
  const name = `exercises-backup-${store.localDate()}.json`;
  // A WKWebView has no download behaviour of its own, so the blob below would
  // silently do nothing in the desktop app — the Rust side writes the file.
  if (NATIVE) {
    try {
      const path = await invoke('save_backup', { name, contents: json });
      toast(`Saved to ${String(path).split('/').slice(-2).join('/')}`);
    } catch (err) {
      toast(`Export failed: ${err.message || err}`);
    }
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
}

// Clears the recorded weight changes everywhere, on this device and through the
// gist. Logged sets are untouched, so changes the app can still read off the
// training log stay — those are not records we invented, and dropping them
// would mean deleting sessions.
async function doResetWeights(btn) {
  if (!confirm('Clear every recorded weight change, on this device and in the gist?\n\nLogged sets are kept, so changes visible from your training history stay.')) return;
  // The row carries an icon and two lines of text, so progress goes in the
  // toast rather than into the button's own label.
  btn.disabled = true;
  toast('Clearing…');
  try {
    // Pull first, so records only the other device knows about get cleared too.
    if (sync.connected()) await sync.syncNow().catch(() => {});
    const n = store.clearWeightChanges();
    if (sync.connected()) await sync.syncNow();
    toast(n ? `Cleared ${n} recorded weight change${n === 1 ? '' : 's'}` : 'Nothing to clear');
  } catch (err) {
    toast(`Cleared here, but the gist did not update: ${err.message}`);
  }
  btn.disabled = false;
  renderHistory();
}

function doReset() {
  if (!confirm('Delete all logged sets and preferences on this device?')) return;
  store.resetAll();
  toast('Data reset');
  render();
}

// ————— theme —————

function applyTheme() {
  const theme = (store.get('settings', {})).theme || 'auto';
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

function setTheme(theme) {
  const s = store.get('settings', {});
  s.theme = theme;
  store.set('settings', s);
  applyTheme();
}

// Theme controls live inside rendered views (tabs row / History head, and the
// Appearance segment in Settings) — delegate. Both write the same preference.
document.addEventListener('click', e => {
  const seg = e.target.closest('[data-act="theme-set"]');
  if (seg) {
    setTheme(seg.dataset.theme);
    renderGear();
    return;
  }
  if (!e.target.closest('[data-act="theme"]')) return;
  const now = (store.get('settings', {})).theme || 'auto';
  const next = { auto: 'light', light: 'dark', dark: 'auto' }[now];
  setTheme(next);
  toast(`Theme: ${next}`);
});

// ————— boot —————

applyTheme();
render();
if (sync.connected()) sync.schedule(1500); // pull other devices' sets shortly after open

// ————— updates —————
// Everything is served cache-first, so a deploy only reaches the device once a
// new service worker takes over. Left to itself iOS can sit on the old one for
// a long time: check on launch and on every return to the foreground, bypassing
// the HTTP cache, and reload as soon as the new worker is in charge.

// None of this applies to the desktop app: the assets are already on disk, a
// worker cannot register on its custom scheme, and there is no deploy to pick up.
if ('serviceWorker' in navigator && !NATIVE) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false, pendingReload = false;

  const applyUpdate = () => {
    if (reloading) return;
    if (player.open) { pendingReload = true; return; } // never mid-workout
    reloading = true;
    location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) applyUpdate();                  // not the very first install
  });

  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
        else if (pendingReload) applyUpdate();          // catch up while out of sight
      });
    }).catch(() => {});
  });

  // A downloaded build that never took over is how the app ends up showing old
  // code while the update sits there waiting to be pressed. Whenever the cache
  // holds a different build from the one running, reload onto it. Capped per
  // session so a build that somehow cannot take over cannot spin.
  const RELOAD_KEY = 'exercises.autoreloads';
  async function reloadIfStale() {
    if (player.open || reloading) return;
    const cached = shortVer(await cachedVersion());
    if (!cached || cached === BUILD) return;
    const n = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (n >= 2) return;
    sessionStorage.setItem(RELOAD_KEY, String(n + 1));
    applyUpdate();
  }
  addEventListener('pageshow', reloadIfStale);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reloadIfStale();
  });
  setTimeout(reloadIfStale, 2500);   // and shortly after a cold start
}

// Which build is actually running, and which one is downloaded. They differ
// while an update is waiting to be picked up, and reporting only the cache — as
// this used to — claims the new version is live when the old code is still
// executing, which is worse than saying nothing.
const shortVer = v => (v || '').replace('exercises-', '');

// The build of THIS file. Asking the service worker was wrong: the worker
// updates the moment a new build downloads, while an already-loaded page goes
// on running the code it started with — so the screen claimed a version it was
// not executing. A constant compiled into the running script cannot lie.
// Bump it with sw.js on every deploy.
const BUILD = 'v85';

async function cachedVersion() {

  try {
    const keys = await caches.keys();
    const n = k => Number((k.match(/-v(\d+)$/) || [])[1] || 0);
    return keys.filter(k => k.startsWith('exercises-v')).sort((a, b) => n(a) - n(b)).pop() || null;
  } catch { return null; }
}

export async function appVersion() {
  const cached = shortVer(await cachedVersion());
  return { label: BUILD, stale: !!cached && cached !== BUILD, ready: cached };
}
