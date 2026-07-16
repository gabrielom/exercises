import { CATS, EXERCISES, byId } from './data.js';
import * as store from './store.js';
import { initFigures } from './anim.js';
import { mountRoutine, leaveRoutine } from './routine.js';

store.init();

const view = document.getElementById('view');
const toastEl = document.getElementById('toast');

const state = { tab: 'exercises', cat: 'all' };
const counters = new Map();           // exId → reps this session
const timers = new Map();             // exId → { running, startTs, acc }

// ————— helpers —————

export function fmtTime(totalS) {
  const s = Math.max(0, Math.round(totalS));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function modeFor(ex) {
  return store.getPref(ex.id).mode || ex.mode;
}

function timerState(id) {
  if (!timers.has(id)) timers.set(id, { running: false, startTs: 0, acc: 0 });
  return timers.get(id);
}

function timerElapsed(t) {
  return (t.acc + (t.running ? Date.now() - t.startTs : 0)) / 1000;
}

let toastTimer = null;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function todayLine(exId) {
  const sets = store.todayFor(exId);
  if (!sets.length) return 'Today · —';
  const reps = sets.filter(s => s.mode === 'reps').reduce((a, s) => a + s.v, 0);
  const secs = sets.filter(s => s.mode === 'time').reduce((a, s) => a + s.v, 0);
  let out = `Today · ${sets.length} set${sets.length > 1 ? 's' : ''}`;
  if (reps) out += ` · ${reps} reps`;
  if (secs) out += ` · ${fmtTime(secs)}`;
  return out;
}

const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>';

// ————— exercises view —————

function cardHTML(ex) {
  const mode = modeFor(ex);
  const t = timerState(ex.id);
  const count = counters.get(ex.id) || 0;
  const perSide = ex.side ? ' · per side' : '';
  const counter = mode === 'reps'
    ? `<div class="counter">
         <button class="tap" data-act="plus" aria-label="Count one rep"><span class="num">${count}</span><small>tap +1</small></button>
         <div class="mini">
           <button data-act="minus" aria-label="Minus one">−</button>
           <button data-act="zero" aria-label="Reset counter">↺</button>
         </div>
       </div>
       <div class="goal">Goal ${ex.target} reps${perSide}</div>`
    : `<div class="counter">
         <div class="timerbox">
           <span class="time" data-time-ex="${ex.id}">${fmtTime(timerElapsed(t))}</span>
           <button class="playbtn" data-act="play" aria-label="Start or pause timer">${t.running ? PAUSE_SVG : PLAY_SVG}</button>
           <div class="mini"><button data-act="zero" aria-label="Reset timer">↺</button></div>
         </div>
       </div>
       <div class="goal">Goal ${fmtTime(ex.target)}${perSide}</div>`;

  return `<article class="card" data-ex="${ex.id}">
    <div class="fig-wrap"><canvas data-anim="${ex.anim}" width="260" height="168" aria-hidden="true"></canvas></div>
    <div class="card-head"><h3>${ex.name}</h3><span class="cat-tag">${CATS[ex.cat]}</span></div>
    <p class="cue">${ex.cue || ''}</p>
    <div class="seg" role="group" aria-label="Counting mode">
      <button data-act="mode" data-mode="reps" class="${mode === 'reps' ? 'on' : ''}">Reps</button>
      <button data-act="mode" data-mode="time" class="${mode === 'time' ? 'on' : ''}">Timer</button>
    </div>
    ${counter}
    <div class="meta">
      <span class="today">${todayLine(ex.id)}</span>
      <button class="logbtn" data-act="log">Log set</button>
    </div>
  </article>`;
}

function renderExercises() {
  const chips = [['all', 'All'], ...Object.entries(CATS)]
    .map(([id, label]) => `<button class="chip ${state.cat === id ? 'on' : ''}" data-cat="${id}">${label}</button>`)
    .join('');
  const list = EXERCISES.filter(e => state.cat === 'all' || e.cat === state.cat);
  view.innerHTML = `
    <div class="chips">${chips}</div>
    <div class="masonry">${list.map(cardHTML).join('')}</div>`;
  initFigures(view);
}

// ————— history view —————

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
    body = `<div class="empty">No sets logged yet.<br>Tap <b>Log set</b> on any card, or run the Corpo routine.</div>`;
  } else {
    const byDay = new Map();
    for (const e of log) {
      if (!byDay.has(e.d)) byDay.set(e.d, new Map());
      const dayMap = byDay.get(e.d);
      if (!dayMap.has(e.ex)) dayMap.set(e.ex, { sets: 0, reps: 0, secs: 0 });
      const agg = dayMap.get(e.ex);
      agg.sets += 1;
      if (e.mode === 'reps') agg.reps += e.v; else agg.secs += e.v;
    }
    const days = [...byDay.keys()].sort().reverse();
    const weekAgo = store.localDate(Date.now() - 6 * 86400000);
    const week = log.filter(e => e.d >= weekAgo);
    const weekSecs = week.filter(e => e.mode === 'time').reduce((a, e) => a + e.v, 0);
    const weekReps = week.filter(e => e.mode === 'reps').reduce((a, e) => a + e.v, 0);
    body = `
      <h2 class="h-title">History</h2>
      <p class="h-sub">Last 7 days · ${week.length} sets · ${weekReps} reps · ${Math.round(weekSecs / 60)} min</p>
      ${days.map(d => `
        <section class="day">
          <h3>${dayLabel(d)}</h3>
          <div class="rows">
            ${[...byDay.get(d)].map(([exId, a]) => `
              <div class="h-row">
                <span>${byId[exId]?.name || exId}</span>
                <span class="h-val">${a.sets}×${a.reps ? ` · ${a.reps} reps` : ''}${a.secs ? ` · ${fmtTime(a.secs)}` : ''}</span>
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
    <input type="file" id="importFile" accept="application/json" hidden>
  </div>`;
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

// ————— targeted card updates (avoid full re-render on every tap) —————

function updateCard(exId) {
  const card = view.querySelector(`.card[data-ex="${exId}"]`);
  if (!card) return;
  const num = card.querySelector('.num');
  if (num) num.textContent = counters.get(exId) || 0;
  const t = timers.get(exId);
  const time = card.querySelector('.time');
  if (time && t) {
    time.textContent = fmtTime(timerElapsed(t));
    const ex = byId[exId];
    time.classList.toggle('over', modeFor(ex) === 'time' && timerElapsed(t) >= ex.target);
    card.querySelector('.playbtn').innerHTML = t.running ? PAUSE_SVG : PLAY_SVG;
  }
  card.querySelector('.today').textContent = todayLine(exId);
}

// running timers tick
setInterval(() => {
  for (const [id, t] of timers) {
    if (!t.running) continue;
    const el = view.querySelector(`[data-time-ex="${id}"]`);
    if (el) {
      el.textContent = fmtTime(timerElapsed(t));
      const ex = byId[id];
      if (timerElapsed(t) >= ex.target) el.classList.add('over');
    }
  }
}, 500);

// ————— events —————

document.querySelector('.tabbar').addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  render();
});

view.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) { state.cat = chip.dataset.cat; renderExercises(); return; }

  const actBtn = e.target.closest('button[data-act]');
  if (!actBtn) return;
  const act = actBtn.dataset.act;

  // history data actions
  if (act === 'export') return doExport();
  if (act === 'import') return view.querySelector('#importFile').click();
  if (act === 'reset') return doReset();

  const card = actBtn.closest('.card[data-ex]');
  if (!card) return;
  const exId = card.dataset.ex;
  const ex = byId[exId];

  if (act === 'plus') {
    counters.set(exId, (counters.get(exId) || 0) + 1);
    navigator.vibrate?.(10);
    updateCard(exId);
  } else if (act === 'minus') {
    counters.set(exId, Math.max(0, (counters.get(exId) || 0) - 1));
    updateCard(exId);
  } else if (act === 'zero') {
    counters.set(exId, 0);
    timers.set(exId, { running: false, startTs: 0, acc: 0 });
    updateCard(exId);
  } else if (act === 'play') {
    const t = timerState(exId);
    if (t.running) { t.acc += Date.now() - t.startTs; t.running = false; }
    else { t.startTs = Date.now(); t.running = true; }
    updateCard(exId);
  } else if (act === 'mode') {
    store.setPref(exId, { mode: actBtn.dataset.mode });
    renderExercises();
  } else if (act === 'log') {
    const mode = modeFor(ex);
    let v;
    if (mode === 'reps') {
      v = counters.get(exId) || 0;
      if (!v) return toast('Tap a few reps first');
      counters.set(exId, 0);
    } else {
      const t = timerState(exId);
      v = Math.round(timerElapsed(t));
      if (!v) return toast('Start the timer first');
      timers.set(exId, { running: false, startTs: 0, acc: 0 });
    }
    store.logSet({ ex: exId, mode, v });
    navigator.vibrate?.(25);
    toast(`Logged · ${ex.name} · ${mode === 'reps' ? v + ' reps' : fmtTime(v)}`);
    updateCard(exId);
  }
});

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
  counters.clear();
  timers.clear();
  toast('Data reset');
  render();
}

// ————— theme —————

function applyTheme() {
  const theme = (store.get('settings', {})).theme || 'auto';
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

document.getElementById('themeBtn').addEventListener('click', () => {
  const s = store.get('settings', {});
  s.theme = { auto: 'light', light: 'dark', dark: 'auto' }[s.theme || 'auto'];
  store.set('settings', s);
  applyTheme();
  toast(`Theme: ${s.theme}`);
  render(); // re-create figures with new palette
});

// ————— boot —————

applyTheme();
render();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
