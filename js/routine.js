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

function beginPhase(seconds) {
  st.remaining = seconds;
  endAt = Date.now() + seconds * 1000;
  st.running = true;
  ensureInterval();
  grabWakeLock();
  persist();
  renderPlayer();
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
}

function complete() {
  const done = active;
  st.running = false;
  dropWakeLock();
  delete progress[done.id];
  store.set('routine', progress);
  navigator.vibrate?.([80, 80, 80, 80, 200]);
  beep([[660, 0.15], [880, 0.15], [1100, 0.3]]);
  const idx = SERIES.indexOf(done);
  const next = SERIES[idx + 1];
  if (container) {
    container.innerHTML = `
      <div class="routine-wrap r-hero">
        <h2>Done.</h2>
        <p class="tagline">${done.name} complete — ${done.slots.length} holds · ${fmtLong(seriesSeconds(done))} of work.</p>
        ${next ? `<button class="bigbtn" data-r="start" data-s="${next.id}">Continue · ${next.name}</button>` : ''}
        <button class="bigbtn ${next ? 'ghost' : ''}" data-r="overview">Back to overview</button>
      </div>`;
  }
  active = null;
  st = null;
  toast(`${done.name} complete`);
}

// ————— rendering —————

function sideBadge(side) {
  return side ? `<span class="pl-side">${side}</span>` : '';
}

function renderOverview() {
  if (!container) return;
  const cards = SERIES.map(s => {
    const saved = progress[s.id];
    const rows = s.blocks.map(bn => {
      const b = ROUTINE.blocks.find(x => x.name === bn);
      const n = b.items.reduce((a, [, sd]) => a + (sd === 'LR' ? 2 : 1), 0);
      return `<div class="block-row"><span class="b-name">${bn}</span><span class="b-count">${n} × ${ROUTINE.hold}s</span></div>`;
    }).join('');
    return `
      <div class="series-card">
        <div class="s-head">
          <span class="s-name">${s.name}</span>
          <span class="s-meta">${s.slots.length} holds · ${fmtMins(s)}</span>
        </div>
        ${rows}
        ${s.tip ? `<p class="s-tip">${s.tip}</p>` : ''}
        <div class="s-actions">
          <button class="bigbtn" data-r="${saved ? 'resume' : 'start'}" data-s="${s.id}">
            ${saved ? `Resume · ${saved.i + 1}/${s.slots.length}` : 'Start'}
          </button>
          ${saved ? `<button class="bigbtn ghost" data-r="start" data-s="${s.id}">Restart</button>` : ''}
        </div>
      </div>`;
  }).join('');
  container.innerHTML = `
    <div class="routine-wrap">
      <div class="r-hero">
        <h2>${ROUTINE.name}</h2>
        <p class="tagline">${ROUTINE.tagline}</p>
        <div class="r-stats">
          <span><b>4</b> series</span>
          <span><b>${ALL_SLOTS}</b> holds</span>
          <span><b>${ROUTINE.hold}s</b> + ${ROUTINE.rest}s rest</span>
          <span><b>2h00</b> in total</span>
        </div>
      </div>
      ${cards}
      <p class="r-src">Built from the “Corpo” playlist — @gabriel_om. Every hold is logged to History automatically.</p>
    </div>`;
}

function renderPlayer() {
  if (!container || !container.querySelector) return;
  const TOTAL = seriesSeconds(active);
  const slot = active.slots[st.i];
  const ex = byId[slot.ex];
  const isHold = st.phase === 'hold';
  const next = active.slots[st.i + 1];
  const nextEx = next ? byId[next.ex] : null;
  container.innerHTML = `
    <div class="routine-wrap player">
      <div class="pl-block">${active.name} · ${slot.block} · ${st.i + 1}/${active.slots.length}</div>
      <div class="pl-name">${ex.name}${sideBadge(slot.side)}</div>
      <p class="pl-cue">${ex.cue || ''}</p>
      <div class="pl-fig"><img src="${imgFor(ex.id)}" alt=""></div>
      <div class="pl-phase ${isHold ? '' : 'rest'}">${isHold ? 'Hold' : 'Rest'}</div>
      <div class="pl-clock" id="pClock">${fmtTime(currentRemaining())}</div>
      <p class="pl-next">${isHold
        ? '&nbsp;'
        : (nextEx ? `Next · <b>${nextEx.name}${next.side ? ' ' + next.side : ''}</b>` : 'Last one — finish strong')}</p>
      <div class="progress"><i id="pBar" style="width:${(elapsedSeconds() / TOTAL) * 100}%"></i></div>
      <div class="pl-meta"><span>${slot.block}</span><span id="pRem">−${fmtLong(TOTAL - elapsedSeconds())}</span></div>
      <div class="pl-controls">
        <button class="ctl" data-r="back" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <button class="ctl primary" data-r="playpause" aria-label="${st.running ? 'Pause' : 'Resume'}">
          ${st.running
            ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'}
        </button>
        <button class="ctl" data-r="skip" aria-label="Skip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <button class="ctl" data-r="exit" aria-label="Exit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    </div>`;
}

function updateClock() {
  const clock = container?.querySelector?.('#pClock');
  if (!clock) return;
  const TOTAL = seriesSeconds(active);
  clock.textContent = fmtTime(Math.ceil(currentRemaining()));
  const bar = container.querySelector('#pBar');
  if (bar) bar.style.width = `${(elapsedSeconds() / TOTAL) * 100}%`;
  const rem = container.querySelector('#pRem');
  if (rem) rem.textContent = `−${fmtLong(TOTAL - elapsedSeconds())}`;
}

// ————— public API —————

export function mountRoutine(el) {
  container = el;
  el.onclick = e => {
    const btn = e.target.closest('button[data-r]');
    if (!btn) return;
    const r = btn.dataset.r;
    const series = btn.dataset.s ? SERIES.find(s => s.id === btn.dataset.s) : null;
    if (r === 'start' && series) { delete progress[series.id]; startSeries(series); }
    else if (r === 'resume' && series) {
      const p = progress[series.id];
      if (p) startSeries(series, p.i, p.phase, p.remaining);
      else startSeries(series);
    }
    else if (r === 'overview') renderOverview();
    else if (r === 'playpause') { st.running ? pause() : resume(); }
    else if (r === 'skip') goto(st.i + 1);
    else if (r === 'back') goto(st.i - 1);
    else if (r === 'exit') exitToOverview();
  };
  if (st?.running) renderPlayer();
  else renderOverview();
}

export function leaveRoutine() {
  // Keep the engine running in the background (chimes still fire);
  // just detach the DOM so ticks stop touching a stale tree.
  if (container) { container.onclick = null; container = null; }
}
