import { ROUTINE, routineSlots, byId } from './data.js';
import * as store from './store.js';
import { initFigures } from './anim.js';
import { fmtTime, toast } from './app.js';

const slots = routineSlots();
const TOTAL = slots.length * (ROUTINE.hold + ROUTINE.rest);

function fmtLong(totalS) {
  const s = Math.max(0, Math.round(totalS));
  if (s < 3600) return fmtTime(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

let container = null;
let st = { i: 0, phase: 'hold', remaining: ROUTINE.hold, running: false, started: false };
let endAt = 0;
let interval = null;
let wakeLock = null;
let audio = null;

// restore saved progress
const saved = store.get('routine');
if (saved && saved.started && !saved.done) {
  st = { ...st, ...saved, running: false };
}

// ————— helpers —————

function persist() {
  store.set('routine', { i: st.i, phase: st.phase, remaining: Math.round(st.remaining), started: st.started });
}

function elapsedSeconds() {
  const inSlot = st.phase === 'hold'
    ? ROUTINE.hold - st.remaining
    : ROUTINE.hold + (ROUTINE.rest - st.remaining);
  return st.i * (ROUTINE.hold + ROUTINE.rest) + inSlot;
}

function currentRemaining() {
  return st.running ? Math.max(0, (endAt - Date.now()) / 1000) : st.remaining;
}

async function grabWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not critical */ }
}
function dropWakeLock() { wakeLock?.release().catch(() => {}); wakeLock = null; }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && st.running && !wakeLock) grabWakeLock();
  if (document.visibilityState === 'hidden') { st.remaining = currentRemaining(); persist(); }
});
addEventListener('pagehide', () => { st.remaining = currentRemaining(); persist(); });

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
  if (!st.running) return;
  const rem = (endAt - Date.now()) / 1000;
  if (rem <= 0) return advance();
  st.remaining = rem;
  updateClock();
}

function advance() {
  const slot = slots[st.i];
  if (st.phase === 'hold') {
    store.logSet({ ex: slot.ex, mode: 'time', v: ROUTINE.hold, side: slot.side || undefined, routine: true });
    navigator.vibrate?.([60, 60, 60]);
    if (st.i >= slots.length - 1) return complete();
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

function goto(i) {
  st.i = Math.min(Math.max(i, 0), slots.length - 1);
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
  if (st.running) { st.remaining = currentRemaining(); st.running = false; }
  dropWakeLock();
  persist();
  renderOverview();
}

function complete() {
  st.running = false;
  st.started = false;
  dropWakeLock();
  store.remove('routine');
  navigator.vibrate?.([80, 80, 80, 80, 200]);
  beep([[660, 0.15], [880, 0.15], [1100, 0.3]]);
  if (container) {
    container.innerHTML = `
      <div class="routine-wrap r-hero">
        <h2>Done.</h2>
        <p class="tagline">${ROUTINE.name} complete — ${slots.length} holds · ${fmtLong(TOTAL)} of work.</p>
        <div class="r-stats"><span><b>${slots.length}</b> holds logged</span><span><b>2h00</b> total</span></div>
        <button class="bigbtn" data-r="restart">Start again someday</button>
      </div>`;
  }
  toast('Corpo routine complete');
}

// ————— rendering —————

function sideBadge(side) {
  return side ? `<span class="p-side">${side}</span>` : '';
}

function renderOverview() {
  if (!container) return;
  const resume = st.started;
  const blocks = ROUTINE.blocks.map(b => {
    const n = b.items.reduce((a, [, s]) => a + (s === 'LR' ? 2 : 1), 0);
    return `<div class="block-row"><span class="b-name">${b.name}</span><span class="b-count">${n} × ${ROUTINE.hold}s</span></div>`;
  }).join('');
  container.innerHTML = `
    <div class="routine-wrap">
      <div class="r-hero">
        <h2>${ROUTINE.name}</h2>
        <p class="tagline">${ROUTINE.tagline}</p>
        <div class="r-stats">
          <span><b>${slots.length}</b> holds</span>
          <span><b>${ROUTINE.hold}s</b> each</span>
          <span><b>${ROUTINE.rest}s</b> rest</span>
          <span><b>2h00</b> total</span>
        </div>
        <button class="bigbtn" data-r="${resume ? 'resume' : 'start'}">
          ${resume ? `Resume · ${st.i + 1}/${slots.length}` : 'Start'}
        </button>
        ${resume ? '<button class="bigbtn ghost" data-r="restart">Restart from the beginning</button>' : ''}
      </div>
      <div class="blocklist">${blocks}</div>
      <p class="r-src">Built from the “Corpo” playlist — @gabriel_om. Every hold is logged to History automatically.</p>
    </div>`;
}

function renderPlayer() {
  if (!container || !container.querySelector) return;
  const slot = slots[st.i];
  const ex = byId[slot.ex];
  const isHold = st.phase === 'hold';
  const next = slots[st.i + 1];
  const nextEx = next ? byId[next.ex] : null;
  container.innerHTML = `
    <div class="routine-wrap player">
      <div class="p-block">${slot.block} · ${st.i + 1}/${slots.length}</div>
      <div class="p-name">${ex.name}${sideBadge(slot.side)}</div>
      <p class="p-cue">${ex.cue || ''}</p>
      <div class="p-fig"><canvas data-anim="${ex.anim}" width="260" height="168" aria-hidden="true"></canvas></div>
      <div class="p-phase ${isHold ? '' : 'rest'}">${isHold ? 'Hold' : 'Rest'}</div>
      <div class="p-clock" id="pClock">${fmtTime(currentRemaining())}</div>
      <p class="p-next">${isHold
        ? '&nbsp;'
        : (nextEx ? `Next · <b>${nextEx.name}${next.side ? ' ' + next.side : ''}</b>` : 'Last one — finish strong')}</p>
      <div class="progress"><i id="pBar" style="width:${(elapsedSeconds() / TOTAL) * 100}%"></i></div>
      <div class="p-meta"><span>${slot.block}</span><span id="pRem">−${fmtLong(TOTAL - elapsedSeconds())}</span></div>
      <div class="p-controls">
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
  initFigures(container);
}

function updateClock() {
  const clock = container?.querySelector?.('#pClock');
  if (!clock) return;
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
    if (r === 'start' || r === 'restart') { st.started = true; goto(0); }
    else if (r === 'resume') { st.started = true; st.running ? renderPlayer() : resume(); }
    else if (r === 'playpause') { st.running ? pause() : resume(); }
    else if (r === 'skip') goto(st.i + 1);
    else if (r === 'back') goto(st.i - 1);
    else if (r === 'exit') exitToOverview();
  };
  if (st.running) renderPlayer();
  else renderOverview();
}

export function leaveRoutine() {
  // Keep the engine running in the background (chimes still fire);
  // just detach the DOM so ticks stop touching a stale tree.
  if (container) { container.onclick = null; container = null; }
}
