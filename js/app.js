import { CATS, GYM_GROUPS, STRETCH_GROUPS, GROUP_FOCUS, EXERCISES, byId, imgFor } from './data.js';

const SUBGROUPS = { gym: GYM_GROUPS, stretch: STRETCH_GROUPS };
import * as store from './store.js';
import * as sync from './sync.js';
import { mountRoutine, leaveRoutine } from './routine.js';

store.init();

// When installed as a window that carries OS traffic-light controls (iPad,
// macOS), flag the document so the filter tabs inset to the right of them.
// iPhone installs are full-screen with no such controls, so exclude them.
(function markWindowed() {
  const installed = matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: window-controls-overlay)').matches
    || navigator.standalone === true;
  const isPhone = /iPhone|iPod/.test(navigator.userAgent);
  document.documentElement.classList.toggle('app-windowed', installed && !isPhone);
})();

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

// Effective weight = per-exercise override (if the user has edited it) else the
// program default from data.js. `ex.weight === undefined` means non-gym (no weight).
function hasWeight(ex) { return ex.weight !== undefined; }
function weightFor(ex) {
  const w = store.getPref(ex.id).weight;
  return (w === undefined || w === null) ? ex.weight : w;
}
function setWeight(ex, w) {
  store.setPref(ex.id, { weight: Math.max(0, Math.min(999, Math.round(w * 2) / 2)) });
}
const WEIGHT_STEP = 2.5; // one plate-ish increment

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
    <span>${mode === 'time' ? `⏱ ${fmtTime(timeFor(ex))}` : `${store.getPref(ex.id).reps || ex.target} reps`}${ex.side ? ' · per side' : ''}</span>`;
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

// Quick-log toggle: unchecked → log a set (same record as finishing it in the
// player); checked → remove today's most recent set for that exercise.
function quickLog(ex) {
  if (doneToday(ex.id)) {
    store.undoLastToday(ex.id);
    navigator.vibrate?.(12);
    toast(`Removed · ${ex.name}`);
  } else {
    const mode = modeFor(ex);
    const v = mode === 'reps' ? (store.getPref(ex.id).reps || ex.target) : timeFor(ex);
    const entry = { ex: ex.id, mode, v };
    if (weightFor(ex)) entry.w = weightFor(ex);
    store.logSet(entry);
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
    view.innerHTML = `<div class="topbar"><div class="chips">${chips}${themeBtnHTML()}</div>${subchips}</div><div class="grid">${gridCells()}</div>`;
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
  store.logSet(entry);
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
      <div class="p-img"><img src="${imgFor(ex.id)}" alt=""></div>
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
  else if (act === 'tminus' || act === 'tplus') {
    setTime(ex, timeFor(ex) + (act === 'tplus' ? TIME_STEP : -TIME_STEP));
    const el = playerEl().querySelector('#pDur');
    if (el) el.textContent = fmtTime(timeFor(ex));
    navigator.vibrate?.(8);
  }
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
    toast(`Logged · ${ex.name}`);
    advance();
  }
});

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
// The label shown on a day row: whichever série most of that day's sets belong to.
function dayGroupLabel(entries) {
  const tally = {};
  for (const e of entries) { const g = groupOf(e.ex); if (g) tally[g] = (tally[g] || 0) + 1; }
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : '';
}
function dayFocusLabel(entries) {
  const tally = {};
  for (const e of entries) {
    const ex = byId[e.ex];
    if (ex?.cat === 'gym' && GROUP_FOCUS[ex.group]) tally[GROUP_FOCUS[ex.group]] = (tally[GROUP_FOCUS[ex.group]] || 0) + 1;
  }
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (!best) return dayGroupLabel(entries);
  return best[0].replace(/\b\w/g, c => c.toUpperCase());
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

// Every time an exercise's logged weight differs from the previous time it was
// logged, that's a weight change. Newest first.
function weightChanges(log) {
  const last = {};
  const out = [];
  for (const e of [...log].sort((a, b) => a.t - b.t)) {
    if (!e.w) continue;
    const prev = last[e.ex];
    if (prev !== undefined && prev !== e.w) out.push({ ex: e.ex, from: prev, to: e.w, delta: e.w - prev, t: e.t, d: e.d });
    last[e.ex] = e.w;
  }
  return out.reverse();
}

// 5 weeks × 7 days ending this week, Monday-first, bucketed into 4 heat levels.
function heatCells(byDay) {
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;              // 0 = Monday
  const end = new Date(today.getTime() + (6 - dow) * dayMs); // Sunday of this week
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const dt = new Date(end.getTime() - i * dayMs);
    const key = store.localDate(dt.getTime());
    const n = (byDay.get(key) || []).length;
    cells.push({ key, n, future: dt > today, lvl: n === 0 ? 0 : n <= 3 ? 1 : n <= 8 ? 2 : 3 });
  }
  return cells;
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
    // walk back to the session where the weight last changed
    let delta = 0, sinceDay = upTo[0]?.day || d;
    for (let i = upTo.length - 1; i > 0; i--) {
      if (upTo[i].w !== upTo[i - 1].w) { delta = upTo[i].w - upTo[i - 1].w; sinceDay = upTo[i].day; break; }
      sinceDay = upTo[i - 1].day;
    }
    rows.push({ exId, ...a, bars, cur, delta, sinceDay });
  }
  const volume = entries.reduce((t, e) => t + (e.mode === 'reps' ? e.v * (e.w || 0) : 0), 0);
  return { entries, rows, volume };
}

function agoDay(d) {
  const diff = Math.round((Date.now() - dateOf(d).getTime()) / dayMs);
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
      <div class="h-actions">${themeBtnHTML()}<button class="iconbtn" data-act="gear" aria-label="Data & sync">${ICON_GEAR}</button></div></div>
    <div class="empty">No sets logged yet.<br>Open any exercise and tap <b>Done</b>, or run the Corpo routine.</div>`;
}

function renderHistory() {
  resetSwipe();
  const log = store.getLog();
  if (state.hView === 'gear') return renderGear();
  if (state.hView === 'weights') return renderWeights(log);

  if (!log.length) {
    view.innerHTML = `<div class="history-wrap">${historyEmpty()}</div>`;
    return;
  }
  const byDay = byDayMap(log);
  const days = [...byDay.keys()].sort().reverse();
  const streak = streakDays(days);
  const weekAgo = store.localDate(Date.now() - 6 * dayMs);
  const sessions = days.filter(d => d >= weekAgo).length;
  const changes = weightChanges(log);
  const added = changes.reduce((a, c) => a + c.delta, 0);
  const cells = heatCells(byDay);

  const tiles = `
    <div class="h-tiles">
      <div class="h-tile"><b class="sage">${streak}</b><span>day streak</span></div>
      <div class="h-tile"><b>${sessions}</b><span>sessions this week</span></div>
      <button class="h-tile link" data-act="weights">
        <b class="sage">${added >= 0 ? '+' : ''}${+added.toFixed(1)}</b><span>kg · weight changes</span>
        <i class="t-chev">${ICON_CHEV}</i>
      </button>
    </div>`;

  const heat = `
    <div class="h-card heat">
      <div class="heat-top"><span>Last 5 weeks</span>
        <span class="heat-legend">less<i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i>more</span>
      </div>
      <div class="heat-heads">${['M','T','W','T','F','S','S'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="heat-grid">${cells.map(c => `<i class="l${c.lvl}${c.future ? ' fut' : ''}" title="${c.key} · ${c.n} sets"></i>`).join('')}</div>
    </div>`;

  const rows = days.slice(0, 30).map(d => {
    const es = byDay.get(d);
    const reps = es.filter(e => e.mode === 'reps').reduce((a, e) => a + e.v, 0);
    const open = state.openDay === d;
    if (!open) {
      return swipeRow(`day:${d}`, `<button class="d-row" data-day="${d}">
        <span class="d-main"><b>${dayLabel(d)}</b><small>${es.length} set${es.length === 1 ? '' : 's'}${reps ? ` · ${reps} reps` : ''}</small></span>
        <span class="d-chip">${dayGroupLabel(es)}</span>
        <i class="d-chev">${ICON_CHEV}</i>
      </button>`);
    }
    const det = dayDetail(log, d);
    const exRows = det.rows.map(r => {
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
        <span class="x-w">${r.cur ? `<b>${r.cur} kg</b>` : ''}${r.cur ? `<small>${deltaChip(r.delta)} · ${agoDay(r.sinceDay)}</small>` : ''}</span>
      </div>`);
    }).join('');
    return `<div class="d-open">
      <button class="d-row head" data-day="${d}">
        <span class="d-main"><b>${dayLabel(d)}</b><small>${es.length} set${es.length === 1 ? '' : 's'}${reps ? ` · ${reps} reps` : ''}</small></span>
        <span class="d-chip strong">${dayGroupLabel(es)}</span>
        <i class="d-chev open">${ICON_CHEV}</i>
      </button>
      <div class="d-focus"><span>${dayFocusLabel(es)}</span><b>${det.volume ? `${det.volume.toLocaleString()} kg` : ''}</b></div>
      ${exRows}
    </div>`;
  }).join('');

  view.innerHTML = `<div class="history-wrap">
    <div class="h-head"><h2 class="h-title">History</h2>
      <div class="h-actions">${themeBtnHTML()}<button class="iconbtn" data-act="gear" aria-label="Data & sync">${ICON_GEAR}</button></div>
    </div>
    ${tiles}
    ${heat}
    <div class="h-lab">Recent</div>
    <div class="h-card list">${rows}</div>
  </div>`;
}

function renderWeights(log) {
  const changes = weightChanges(log);
  const up = changes.filter(c => c.delta > 0).length;
  const down = changes.filter(c => c.delta < 0).length;
  const added = changes.reduce((a, c) => a + c.delta, 0);
  const exCount = new Set(changes.map(c => c.ex)).size;
  const since = changes.length
    ? dateOf(changes[changes.length - 1].d).toLocaleDateString(undefined, { month: 'long' })
    : '';
  const byMonth = new Map();
  for (const c of changes) {
    const k = c.d.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(c);
  }
  const groups = [...byMonth.entries()].map(([k, list]) => {
    const [y, m] = k.split('-').map(Number);
    const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return `<div class="h-lab">${title}</div>
      <div class="h-card list">${list.map(c => swipeRow(`ex:${c.d}:${c.ex}`, `
        <div class="w-row">
          <span class="x-main"><b>${byId[c.ex]?.name || c.ex}</b><small>${agoDay(c.d).replace(/^t/, 'T')} · ${groupOf(c.ex) || ''}</small></span>
          <span class="x-w"><b>${c.from} → ${c.to} kg</b><small>${deltaChip(c.delta)}</small></span>
        </div>`)).join('')}</div>`;
  }).join('');

  view.innerHTML = `<div class="history-wrap">
    <div class="h-head back">
      <button class="iconbtn" data-act="h-back" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <h2 class="h-title sm">Weight changes</h2>
    </div>
    ${changes.length ? `<div class="h-card sum">
      <span class="sum-l"><b>${added >= 0 ? '+' : ''}${+added.toFixed(1)}</b><small>kg added${since ? ` since ${since}` : ''}</small></span>
      <span class="sum-r"><b>${up} up · ${down} down</b><small>across ${exCount} exercise${exCount === 1 ? '' : 's'}</small></span>
    </div>${groups}` : `<div class="empty">No weight changes logged yet.</div>`}
  </div>`;
}

function renderGear() {
  view.innerHTML = `<div class="history-wrap">
    <div class="h-head back">
      <button class="iconbtn" data-act="h-back" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <h2 class="h-title sm">Data &amp; sync</h2>
    </div>
    <div class="databar">
      <button data-act="export">Export</button>
      <button data-act="import">Import</button>
      <button data-act="reset" class="danger">Reset data</button>
    </div>
    ${syncSectionHTML()}
    <input type="file" id="importFile" accept="application/json" hidden>
  </div>`;
}

function agoLabel(ts) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(ts).toLocaleDateString();
}

function syncSectionHTML() {
  const c = sync.cfg();
  const inner = c
    ? `<div class="sync-status">Synced <b>${agoLabel(c.lastSync)}</b> · private gist <code>${c.gistId.slice(0, 7)}</code></div>
       <div class="sync-actions">
         <button data-act="sync-now">Sync now</button>
         <button data-act="sync-off" class="danger">Disconnect</button>
       </div>`
    : `<p class="sync-help">Sync your history between devices through a private GitHub gist.
         Create a <b>classic</b> personal access token with only the <b>gist</b> scope
         (github.com → Settings → Developer settings → Tokens) and paste it once on each device.</p>
       <div class="sync-form">
         <input id="syncToken" type="password" placeholder="ghp_… token" autocomplete="off" spellcheck="false">
         <button data-act="sync-connect">Connect</button>
       </div>`;
  return `<section class="day sync-section"><h3>Sync</h3><div class="sync-card">${inner}</div></section>`;
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

// "day:<date>" removes that day's sets; "ex:<date>:<id>" removes one exercise's.
function deleteTarget(target) {
  const [kind, d, exId] = target.split(':');
  const pred = kind === 'day'
    ? e => e.d === d
    : e => e.d === d && e.ex === exId;
  const removed = store.deleteEntries(pred);
  if (!removed.length) return;
  const what = kind === 'day' ? dayLabel(d) : (byId[exId]?.name || exId);
  navigator.vibrate?.(14);
  if (kind === 'day' && state.openDay === d) state.openDay = null;
  renderHistory();
  toast(`Deleted · ${what}`, () => { store.restoreEntries(removed); renderHistory(); });
}

// ————— render root —————

function render() {
  resetSwipe();
  if (state.tab !== 'routine') leaveRoutine();
  document.querySelectorAll('.tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === state.tab));
  if (state.tab === 'exercises') renderExercises();
  else if (state.tab === 'history') renderHistory();
  else mountRoutine(view);
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
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  saveScroll();
  if (btn.dataset.tab === 'history' && state.tab !== 'history') { state.hView = 'list'; state.openDay = null; }
  state.tab = btn.dataset.tab;
  render();
  restoreScroll();
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
  if (act === 'gear' || act === 'weights') { state.hView = act === 'gear' ? 'gear' : 'weights'; renderHistory(); scrollTo(0, 0); return; }
  if (act === 'h-back') { state.hView = 'list'; renderHistory(); scrollTo(0, 0); return; }
  if (actBtn.dataset.act === 'export') doExport();
  else if (actBtn.dataset.act === 'import') view.querySelector('#importFile').click();
  else if (actBtn.dataset.act === 'reset') doReset();
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

async function doSyncConnect(btn) {
  const input = view.querySelector('#syncToken');
  btn.disabled = true;
  btn.textContent = 'Connecting…';
  try {
    const r = await sync.connect(input.value);
    toast(`Sync connected${r?.pulled ? ` · ${r.pulled} ${r.pulled === 1 ? 'set' : 'sets'} pulled` : ''}`);
    renderHistory();
  } catch (err) {
    toast(`Sync failed: ${err.message}`);
    btn.disabled = false;
    btn.textContent = 'Connect';
  }
}

async function doSyncNow(btn) {
  btn.disabled = true;
  btn.textContent = 'Syncing…';
  try {
    const r = await sync.syncNow();
    toast(r?.pulled ? `Synced · ${r.pulled} new ${r.pulled === 1 ? 'set' : 'sets'} pulled` : 'Synced ✓');
  } catch (err) {
    toast(`Sync failed: ${err.message}`);
  }
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

function doExport() {
  const blob = new Blob([store.exportData()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `exercises-backup-${store.localDate()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup downloaded');
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

// Theme toggle lives inside rendered views (tabs row / History head) — delegate.
document.addEventListener('click', e => {
  if (!e.target.closest('[data-act="theme"]')) return;
  const s = store.get('settings', {});
  s.theme = { auto: 'light', light: 'dark', dark: 'auto' }[s.theme || 'auto'];
  store.set('settings', s);
  applyTheme();
  toast(`Theme: ${s.theme}`);
});

// ————— boot —————

applyTheme();
render();
if (sync.connected()) sync.schedule(1500); // pull other devices' sets shortly after open

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
