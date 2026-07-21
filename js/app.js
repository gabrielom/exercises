import { CATS, GYM_GROUPS, STRETCH_GROUPS, EXERCISES, byId, imgFor } from './data.js';

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

const state = { tab: 'exercises', cat: 'all', group: 'all' };

// ————— helpers —————

export function fmtTime(totalS) {
  const s = Math.max(0, Math.round(totalS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer = null;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
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

function renderExercises() {
  const prevSub = view.querySelector('.chips.sub');
  if (prevSub && renderExercises.lastCat != null) barScroll.sub[renderExercises.lastCat] = prevSub.scrollLeft;
  const prevMain = view.querySelector('.topbar > .chips:not(.sub)');
  if (prevMain) barScroll.main = prevMain.scrollLeft;

  const chips = [['all', 'All'], ...Object.entries(CATS)]
    .map(([id, label]) => `<button class="chip ${state.cat === id ? 'on' : ''}" data-cat="${id}">${label}</button>`)
    .join('');
  const subchips = SUBGROUPS[state.cat]
    ? `<div class="chips sub">${[['all', 'All groups'], ...Object.entries(SUBGROUPS[state.cat])]
        .map(([id, label]) => `<button class="chip ${state.group === id ? 'on' : ''}" data-group="${id}">${label}</button>`).join('')}</div>`
    : '';

  const list = filteredList();
  let cells = '';
  let lastGroup = null;
  for (const ex of list) {
    if (SUBGROUPS[state.cat] && state.group === 'all' && ex.group !== lastGroup) {
      lastGroup = ex.group;
      cells += `<div class="group-head">${SUBGROUPS[state.cat][ex.group]}</div>`;
    }
    cells += gcardHTML(ex);
  }
  view.innerHTML = `<div class="topbar"><div class="chips">${chips}${themeBtnHTML()}</div>${subchips}</div><div class="grid">${cells}</div>`;

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
  if (state.tab === 'exercises') renderExercises(); // refresh ✓ badges
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

function dayLabel(d) {
  const today = store.localDate();
  const yest = store.localDate(Date.now() - 86400000);
  if (d === today) return 'Today';
  if (d === yest) return 'Yesterday';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderHistory() {
  const log = store.getLog();
  let body;
  if (!log.length) {
    body = `<div class="h-head"><h2 class="h-title">History</h2>${themeBtnHTML()}</div>
      <div class="empty">No sets logged yet.<br>Open any exercise and tap <b>Done</b>, or run the Corpo routine.</div>`;
  } else {
    const byDay = new Map();
    for (const e of log) {
      if (!byDay.has(e.d)) byDay.set(e.d, new Map());
      const dayMap = byDay.get(e.d);
      if (!dayMap.has(e.ex)) dayMap.set(e.ex, { sets: 0, reps: 0, secs: 0, w: 0 });
      const agg = dayMap.get(e.ex);
      agg.sets += 1;
      if (e.mode === 'reps') agg.reps += e.v; else agg.secs += e.v;
      if (e.w) agg.w = Math.max(agg.w, e.w);
    }
    const days = [...byDay.keys()].sort().reverse();
    const weekAgo = store.localDate(Date.now() - 6 * 86400000);
    const week = log.filter(e => e.d >= weekAgo);
    const weekSecs = week.filter(e => e.mode === 'time').reduce((a, e) => a + e.v, 0);
    const weekReps = week.filter(e => e.mode === 'reps').reduce((a, e) => a + e.v, 0);
    body = `
      <div class="h-head"><h2 class="h-title">History</h2>${themeBtnHTML()}</div>
      <p class="h-sub">Last 7 days · ${week.length} sets · ${weekReps} reps · ${Math.round(weekSecs / 60)} min</p>
      ${days.map(d => `
        <section class="day">
          <h3>${dayLabel(d)}</h3>
          <div class="rows">
            ${[...byDay.get(d)].map(([exId, a]) => `
              <div class="h-row">
                <span>${byId[exId]?.name || exId}</span>
                <span class="h-val">${a.sets}×${a.reps ? ` · ${a.reps} reps` : ''}${a.secs ? ` · ${fmtTime(a.secs)}` : ''}${a.w ? ` · ${a.w} kg` : ''}</span>
              </div>`).join('')}
          </div>
        </section>`).join('')}`;
  }
  view.innerHTML = `<div class="history-wrap">${body}
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

// ————— render root —————

function render() {
  if (state.tab !== 'routine') leaveRoutine();
  document.querySelectorAll('.tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === state.tab));
  if (state.tab === 'exercises') renderExercises();
  else if (state.tab === 'history') renderHistory();
  else mountRoutine(view);
}

// ————— events —————

// Show a hairline under the sticky filter bar once the grid scrolls beneath it.
addEventListener('scroll', () => {
  document.querySelector('.topbar')?.classList.toggle('stuck', scrollY > 4);
}, { passive: true });

document.querySelector('.tabbar').addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  render();
});

view.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) {
    if (chip.dataset.cat) { state.cat = chip.dataset.cat; state.group = 'all'; }
    else if (chip.dataset.group) state.group = chip.dataset.group;
    renderExercises();
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
  const actBtn = e.target.closest('button[data-act]');
  if (!actBtn) return;
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
