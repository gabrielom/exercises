import { ROUTINE, seriesSlots, SLOT_SECONDS, byId, imgFor } from './data.js';
import * as store from './store.js';
import { fmtTime, toast } from './app.js';

const SERIES = ROUTINE.series.map(s => ({ ...s, slots: seriesSlots(s) }));
const ALL_SLOTS = SERIES.reduce((a, s) => a + s.slots.length, 0);

function fmtLong(totalS) {
  const s = Math.max(0, Math.round(totalS));
  if (s < 3600) return fmtTime(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
const seriesSeconds = s => s.slots.length * SLOT_SECONDS;
// "Série 2 · Psoas & Hamstrings" → "Série 2". The blocks it covers are listed
// under it on the card instead of being squeezed into the heading.
const seriesTitle = s => s.name.split(' · ')[0];
const seriesBlocks = s => s.blocks.join(' · ');
const fmtMins = s => `~${Math.round(seriesSeconds(s) / 60)} min`;

let container = null;
let active = null;   // series currently in the player
let st = null;       // { i, phase, remaining, running } for the active series
let endAt = 0;
let interval = null;
let wakeLock = null;
let audio = null;

// ————— per-series saved progress —————
// store 'routine' = { [seriesId]: { i, phase, remaining } }

function loadProgress() {
  const raw = store.get('routine');
  if (!raw) return {};
  // migrate the pre-series format ({ i, phase, remaining, started } over the
  // old 80-slot flat order: warm/feet/psoas/hams/frontsplit/pancake/back/glutes)
  if (typeof raw.i === 'number' && raw.started !== undefined) {
    const i = raw.i;
    const [id, local] =
      i < 21 ? ['feet', i] :
      i < 41 ? ['psoas', i - 21] :
      i < 53 ? ['split', i - 41] :
      i < 67 ? ['pancake', i - 53] :
      i < 75 ? ['split', 12 + (i - 67)] :
               ['pancake', 14 + (i - 75)];
    return { [id]: { i: local, phase: raw.phase, remaining: raw.remaining } };
  }
  return raw;
}
let progress = loadProgress();

// Completed séries in the current cycle: { [seriesId]: finishedAt }. Kept apart
// from `progress` (which only holds in-flight state) so the overview can show
// "Complete · 5d ago" and count holds done this cycle. Clears once all four are
// done and a new série is started.
let doneMap = store.get('routineDone') || {};

function persistDone() { store.set('routineDone', doneMap); }

function cycleComplete() { return SERIES.every(s => doneMap[s.id]); }

// Holds finished this cycle: a completed série counts all of its slots, an
// in-flight one counts the slots already passed.
function holdsDone(s) {
  if (doneMap[s.id]) return s.slots.length;
  const p = progress[s.id];
  return p ? p.i : 0;
}

function agoShort(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}

function persist() {
  if (active && st) {
    progress[active.id] = { i: st.i, phase: st.phase, remaining: Math.round(currentRemaining()) };
  }
  store.set('routine', progress);
}

// ————— helpers —————

function elapsedSeconds() {
  const inSlot = st.phase === 'hold'
    ? ROUTINE.hold - st.remaining
    : ROUTINE.hold + (ROUTINE.rest - st.remaining);
  return st.i * SLOT_SECONDS + inSlot;
}

function currentRemaining() {
  return st.running ? Math.max(0, (endAt - Date.now()) / 1000) : st.remaining;
}

async function grabWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not critical */ }
}
function dropWakeLock() { wakeLock?.release().catch(() => {}); wakeLock = null; }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && st?.running && !wakeLock) grabWakeLock();
  if (document.visibilityState === 'hidden' && st) { st.remaining = currentRemaining(); persist(); }
});
addEventListener('pagehide', () => { if (st) { st.remaining = currentRemaining(); persist(); } });

function beep(pattern) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    let t = audio.currentTime + 0.02;
    for (const [freq, dur] of pattern) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
      t += dur + 0.12;
    }
  } catch { /* audio unavailable */ }
}
const CHIME_REST = [[660, 0.14], [520, 0.18]];   // hold finished → relax
const CHIME_GO = [[880, 0.16]];                  // rest finished → go

// ————— engine —————

function ensureInterval() {
  if (interval) return;
  interval = setInterval(tick, 250);
}

// A running série is a mode: the tab bar turns into the transport for as long
// as one is live. app.js owns the bar, so tell it whenever that changes.
function signal() {
  document.dispatchEvent(new CustomEvent('routine:player', {
    detail: { open: !!st, running: !!st?.running },
  }));
}

function beginPhase(seconds) {
  st.remaining = seconds;
  endAt = Date.now() + seconds * 1000;
  st.running = true;
  ensureInterval();
  grabWakeLock();
  persist();
  renderPlayer();
  signal();
}

function tick() {
  if (!st?.running) return;
  const rem = (endAt - Date.now()) / 1000;
  if (rem <= 0) return advance();
  st.remaining = rem;
  updateClock();
}

function advance() {
  const slot = active.slots[st.i];
  if (st.phase === 'hold') {
    store.logSet({ ex: slot.ex, mode: 'time', v: ROUTINE.hold, side: slot.side || undefined, routine: true });
    navigator.vibrate?.([60, 60, 60]);
    if (st.i >= active.slots.length - 1) return complete();
    beep(CHIME_REST);
    st.phase = 'rest';
    beginPhase(ROUTINE.rest);
  } else {
    st.i += 1;
    st.phase = 'hold';
    beep(CHIME_GO);
    navigator.vibrate?.(40);
    beginPhase(ROUTINE.hold);
  }
}

function startSeries(series, at = 0, phase = 'hold', remaining = null) {
  // Starting anything once all four séries are done begins a fresh cycle.
  if (cycleComplete()) { doneMap = {}; persistDone(); }
  active = series;
  st = { i: Math.min(Math.max(at, 0), series.slots.length - 1), phase, remaining: ROUTINE.hold, running: false };
  if (remaining !== null) {
    st.remaining = remaining;
    beginPhase(remaining);
  } else {
    beginPhase(phase === 'rest' ? ROUTINE.rest : ROUTINE.hold);
  }
}

function goto(i) {
  st.i = Math.min(Math.max(i, 0), active.slots.length - 1);
  st.phase = 'hold';
  beginPhase(ROUTINE.hold);
}

function pause() {
  st.remaining = currentRemaining();
  st.running = false;
  dropWakeLock();
  persist();
  renderPlayer();
  signal();
}

function resume() {
  beginPhase(st.remaining);
}

function exitToOverview() {
  if (st) { st.remaining = currentRemaining(); st.running = false; }
  dropWakeLock();
  persist();
  active = null;
  st = null;
  renderOverview();
  signal();
}

function complete() {
  const done = active;
  st.running = false;
  dropWakeLock();
  delete progress[done.id];
  store.set('routine', progress);
  doneMap[done.id] = Date.now();
  persistDone();
  navigator.vibrate?.([80, 80, 80, 80, 200]);
  beep([[660, 0.15], [880, 0.15], [1100, 0.3]]);
  const idx = SERIES.indexOf(done);
  const next = SERIES[idx + 1];
  if (container) {
    container.innerHTML = `
      <div class="routine-wrap r-hero">
        <h2>Done.</h2>
        <p class="tagline">${seriesTitle(done)} complete — ${done.slots.length} holds · ${fmtLong(seriesSeconds(done))} of work.</p>
        ${next ? `<button class="bigbtn" data-r="start" data-s="${next.id}">Continue · ${seriesTitle(next)}</button>` : ''}
        <button class="bigbtn ${next ? 'ghost' : ''}" data-r="overview">Back to overview</button>
      </div>`;
  }
  active = null;
  st = null;
  signal();
  toast(`${seriesTitle(done)} complete`);
}

// ————— rendering —————

function sideBadge(side) {
  return side ? `<span class="pl-side">${side}</span>` : '';
}

// "1h 15" — compact hours+minutes for the cycle's remaining work.
function fmtLeft(totalS) {
  const m = Math.round(totalS / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function renderOverview() {
  if (!container) return;
  const cycleHolds = SERIES.reduce((a, s) => a + holdsDone(s), 0);
  const left = (ALL_SLOTS - cycleHolds) * SLOT_SECONDS;

  const segs = SERIES.map(s => {
    const pct = Math.round((holdsDone(s) / s.slots.length) * 100);
    return `<span class="cy-seg"><i style="width:${pct}%"></i></span>`;
  }).join('');

  const cards = SERIES.map(s => {
    const finished = doneMap[s.id];
    const saved = progress[s.id];
    const done = holdsDone(s);
    const pct = Math.round((done / s.slots.length) * 100);
    const status = finished
      ? `<span class="sc-status done">Complete · ${agoShort(finished)}</span>`
      : saved
        ? `<span class="sc-status">${done} of ${s.slots.length} holds</span>`
        : `<span class="sc-status">Not started</span>`;
    const action = finished
      ? `<button class="sc-act ghost" data-r="start" data-s="${s.id}">Redo</button>`
      : `<button class="sc-act" data-r="${saved ? 'resume' : 'start'}" data-s="${s.id}">${saved ? 'Resume' : 'Start'}</button>`;
    return `
      <div class="sc ${finished ? 'is-done' : ''}">
        <div class="sc-head">
          <span class="sc-name">${seriesTitle(s)}</span>
          <span class="sc-blocks">${seriesBlocks(s)}</span>
          <span class="sc-meta">${s.slots.length} holds · ${fmtMins(s)}</span>
        </div>
        <div class="sc-bar"><i style="width:${pct}%"></i></div>
        <div class="sc-foot">${status}${action}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="routine-wrap">
      <div class="r-head">
        <h2>${ROUTINE.name}</h2>
        <span class="r-total">2h00 · ${ALL_SLOTS} holds</span>
      </div>
      <p class="r-tagline">${ROUTINE.tagline}</p>
      <div class="cycle">
        <div class="cy-top">
          <span class="cy-count"><b>${cycleHolds}</b> of ${ALL_SLOTS} holds this cycle</span>
          <span class="cy-left">${fmtLeft(left)} left</span>
        </div>
        <div class="cy-bar">${segs}</div>
      </div>
      <div class="sc-grid">${cards}</div>
      <p class="r-src">Built from the “Corpo” playlist — @gabriel_om. Every hold is logged to History automatically.</p>
    </div>`;
}

const RING_R = 78;
const RING_C = 2 * Math.PI * RING_R;
const phaseTotal = () => (st.phase === 'hold' ? ROUTINE.hold : ROUTINE.rest);
// Ring depletes as the phase runs down: full arc at the start, empty at zero.
const ringOffset = () => RING_C * (1 - Math.max(0, currentRemaining()) / phaseTotal());

// Current slot plus the next five, for the up-next rail.
function railHTML() {
  const upcoming = active.slots.slice(st.i, st.i + 6);
  const tiles = upcoming.map((slot, k) => {
    const ex = byId[slot.ex];
    const now = k === 0;
    // The side sits in its own span so the ellipsis eats the name, never the L/R.
    const label = now ? 'Now' : ex.name;
    const side = slot.side ? `<b>${now ? '· ' : ''}${slot.side}</b>` : '';
    return `<div class="rail-item ${now ? 'now' : ''}">
      <div class="rail-tile"><img src="${imgFor(ex.id)}" alt="" loading="lazy"></div>
      <span class="rail-cap"><span>${label}</span>${side}</span>
    </div>`;
  }).join('');
  const left = active.slots.length - st.i - 1;
  return `<div class="rp-rail">
    <div class="rail-lab"><span>Up next</span><span>${left} hold${left === 1 ? '' : 's'} left</span></div>
    <div class="rail-grid">${tiles}</div>
  </div>`;
}

function renderPlayer() {
  if (!container || !container.querySelector) return;
  const TOTAL = seriesSeconds(active);
  const slot = active.slots[st.i];
  const ex = byId[slot.ex];
  const isHold = st.phase === 'hold';
  container.innerHTML = `
    <div class="routine-wrap rplayer">
      <div class="rp-main">
        <div class="rp-panel">
          <div class="rp-slotline">
            <span>${seriesTitle(active)} · ${st.i + 1}/${active.slots.length}</span>
            <span id="pRem">−${fmtLong(TOTAL - elapsedSeconds())}</span>
          </div>
          <div class="rp-fig"><img src="${imgFor(ex.id)}" alt=""></div>
          <div class="rp-sess"><i id="pBar" style="width:${(elapsedSeconds() / TOTAL) * 100}%"></i></div>
        </div>
        <div class="rp-side">
          <div class="rp-name">${ex.name}${sideBadge(slot.side)}</div>
          <p class="rp-cue">${ex.cue || ''}</p>
          <div class="rp-ring">
            <svg viewBox="0 0 180 180" aria-hidden="true">
              <circle class="rr-track" cx="90" cy="90" r="${RING_R}"></circle>
              <circle class="rr-arc" id="pArc" cx="90" cy="90" r="${RING_R}"
                style="stroke-dasharray:${RING_C};stroke-dashoffset:${ringOffset()}"></circle>
            </svg>
            <div class="rp-ring-in">
              <span class="rp-clock" id="pClock">${fmtTime(currentRemaining())}</span>
              <span class="rp-phase ${isHold ? '' : 'rest'}" id="pPhase">${isHold ? 'Hold' : 'Rest'}</span>
            </div>
          </div>
        </div>
      </div>
      ${railHTML()}
    </div>`;
}

function updateClock() {
  const clock = container?.querySelector?.('#pClock');
  if (!clock) return;
  const TOTAL = seriesSeconds(active);
  clock.textContent = fmtTime(Math.ceil(currentRemaining()));
  const arc = container.querySelector('#pArc');
  if (arc) arc.style.strokeDashoffset = ringOffset();
  const bar = container.querySelector('#pBar');
  if (bar) bar.style.width = `${(elapsedSeconds() / TOTAL) * 100}%`;
  const rem = container.querySelector('#pRem');
  if (rem) rem.textContent = `−${fmtLong(TOTAL - elapsedSeconds())}`;
}

// ————— public API —————

// Shared by the routine screen's own buttons and by the transport that
// replaces the tab bar while a série runs — the transport lives outside this
// container, so the actions have to be reachable from app.js.
export function routineControl(r, seriesId) {
  const series = seriesId ? SERIES.find(s => s.id === seriesId) : null;
  if (r === 'start' && series) { delete progress[series.id]; startSeries(series); }
  else if (r === 'resume' && series) {
    const p = progress[series.id];
    if (p) startSeries(series, p.i, p.phase, p.remaining);
    else startSeries(series);
  }
  else if (r === 'overview') renderOverview();
  else if (!st) return;                       // the rest need a live série
  else if (r === 'playpause') { st.running ? pause() : resume(); }
  else if (r === 'skip') goto(st.i + 1);
  else if (r === 'back') goto(st.i - 1);
  else if (r === 'exit') exitToOverview();
}

export function mountRoutine(el) {
  container = el;
  el.onclick = e => {
    const btn = e.target.closest('button[data-r]');
    if (btn) routineControl(btn.dataset.r, btn.dataset.s);
  };
  if (st?.running) renderPlayer();
  else renderOverview();
  signal();
}

export function leaveRoutine() {
  // Keep the engine running in the background (chimes still fire);
  // just detach the DOM so ticks stop touching a stale tree.
  if (container) { container.onclick = null; container = null; }
}
