import { CATS, GYM_GROUPS, EXERCISES, byId, imgFor } from './data.js';
import * as store from './store.js';
import { mountRoutine, leaveRoutine } from './routine.js';

store.init();

const view = document.getElementById('view');
const toastEl = document.getElementById('toast');

const state = { tab: 'exercises', cat: 'all', gymGroup: 'all' };

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

export function chime(pattern) {
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

// ————— exercises grid —————

function filteredList() {
  let list = EXERCISES.filter(e => state.cat === 'all' || e.cat === state.cat);
  if (state.cat === 'gym' && state.gymGroup !== 'all') {
    list = list.filter(e => e.group === state.gymGroup);
  }
  return list;
}

function gcardHTML(ex) {
  const mode = modeFor(ex);
  const bits = [];
  if (ex.weight) bits.push(`<span class="kg">${ex.weight} kg</span>`);
  bits.push(`<span>${mode === 'time' ? `⏱ ${fmtTime(ex.target)}` : `${ex.target} reps`}${ex.side ? ' · per side' : ''}</span>`);
  if (doneToday(ex.id)) bits.push('<span class="done">✓</span>');
  return `<button class="gcard" data-ex="${ex.id}">
    <img src="${imgFor(ex.id)}" alt="" loading="lazy">
    <span class="g-name">${ex.name}</span>
    <span class="g-meta">${bits.join('')}</span>
  </button>`;
}

function renderExercises() {
  const chips = [['all', 'All'], ...Object.entries(CATS)]
    .map(([id, label]) => `<button class="chip ${state.cat === id ? 'on' : ''}" data-cat="${id}">${label}</button>`)
    .join('');
  const subchips = state.cat === 'gym'
    ? `<div class="chips sub">${[['all', 'All groups'], ...Object.entries(GYM_GROUPS)]
        .map(([id, label]) => `<button class="chip ${state.gymGroup === id ? 'on' : ''}" data-group="${id}">${label}</button>`).join('')}</div>`
    : '';

  const list = filteredList();
  let cells = '';
  let lastGroup = null;
  for (const ex of list) {
    if (state.cat === 'gym' && state.gymGroup === 'all' && ex.group !== lastGroup) {
      lastGroup = ex.group;
      cells += `<div class="group-head">${GYM_GROUPS[ex.group]}</div>`;
    }
    cells += gcardHTML(ex);
  }
  view.innerHTML = `<div class="chips">${chips}</div>${subchips}<div class="grid">${cells}</div>`;
}

// ————— fullscreen player —————

const player = { open: false, list: [], idx: 0, reps: 0, timer: null, interval: null };

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
    logCurrent(currentEx().target);
    advance();
  }
}

function toggleTimerPause() {
  const t = player.timer;
  if (!t) { startTimer(currentEx().target); return; }
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
  if (ex.weight) entry.w = ex.weight;
  store.logSet(entry);
  if (mode === 'reps') store.setPref(ex.id, { reps: value });
}

function advance() {
  if (player.idx >= player.list.length - 1) return renderPlayerDone();
  player.idx += 1;
  renderPlayer(true);
}

function openPlayer(list, idx) {
  player.open = true;
  player.list = list;
  player.idx = idx;
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

  const counter = mode === 'reps'
    ? `<div class="stepper">
         <button data-p="minus" aria-label="Fewer reps">−</button>
         <div class="val"><b id="pReps">${player.reps}</b><span>reps${ex.side ? ' · per side' : ''}</span></div>
         <button data-p="plus" aria-label="More reps">+</button>
       </div>`
    : `<button class="p-clock" data-p="pausetime" aria-label="Pause or resume">
         <b id="pTime">${fmtTime(ex.target)}</b><span>tap to pause${ex.side ? ' · per side' : ''}</span>
       </button>`;

  playerEl().innerHTML = `
    <div class="p-top">
      <button class="iconbtn" data-p="close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <span class="p-count">${player.idx + 1} / ${player.list.length}</span>
      <button class="iconbtn" data-p="prev" aria-label="Previous" ${player.idx === 0 ? 'style="visibility:hidden"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
    </div>
    <div class="p-body ${slide ? 'slide' : ''}">
      <div class="p-img"><img src="${imgFor(ex.id)}" alt=""></div>
      <div class="p-name">${ex.name}</div>
      ${ex.pt ? `<div class="p-pt">${ex.pt}</div>` : ''}
      ${ex.cue ? `<p class="p-cue">${ex.cue}</p>` : ''}
      <div class="p-badges">
        ${ex.weight ? `<span class="kg">${ex.weight} kg</span>` : ''}
        ${ex.side ? `<span class="bside">per side</span>` : ''}
      </div>
      <div class="seg" role="group" aria-label="Counting mode">
        <button data-p="mode" data-mode="reps" class="${mode === 'reps' ? 'on' : ''}">Reps</button>
        <button data-p="mode" data-mode="time" class="${mode === 'time' ? 'on' : ''}">Timer</button>
      </div>
      ${counter}
    </div>
    <button class="donebtn" data-p="done">Done${mode === 'reps' ? '' : ' early'}</button>
    <p class="p-nextline">${next ? `Next · <b>${next.name}</b>` : 'Last one'}</p>`;

  if (mode === 'time') startTimer(ex.target); // timers start automatically
}

// player events (delegated on the overlay)
document.getElementById('player').addEventListener('click', e => {
  const btn = e.target.closest('[data-p]');
  if (!btn) return;
  const act = btn.dataset.p;
  const ex = currentEx();
  if (act === 'close') closePlayer();
  else if (act === 'prev') { if (player.idx > 0) { player.idx -= 1; renderPlayer(true); } }
  else if (act === 'plus' || act === 'minus') {
    player.reps = Math.max(1, Math.min(99, player.reps + (act === 'plus' ? 1 : -1)));
    playerEl().querySelector('#pReps').textContent = player.reps;
    navigator.vibrate?.(8);
  }
  else if (act === 'pausetime') toggleTimerPause();
  else if (act === 'mode') { store.setPref(ex.id, { mode: btn.dataset.mode }); renderPlayer(false); }
  else if (act === 'done') {
    const mode = modeFor(ex);
    if (mode === 'reps') {
      logCurrent(player.reps);
    } else {
      const elapsed = Math.round(ex.target - (player.timer ? Math.max(0, player.timer.remaining) : 0));
      stopTimer();
      logCurrent(Math.max(1, elapsed));
    }
    navigator.vibrate?.(30);
    toast(`Logged · ${ex.name}`);
    advance();
  }
});

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
    body = `<div class="empty">No sets logged yet.<br>Open any exercise and tap <b>Done</b>, or run the Corpo routine.</div>`;
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
      <h2 class="h-title">History</h2>
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

// ————— events —————

document.querySelector('.tabbar').addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  render();
});

view.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) {
    if (chip.dataset.cat) { state.cat = chip.dataset.cat; state.gymGroup = 'all'; }
    else if (chip.dataset.group) state.gymGroup = chip.dataset.group;
    renderExercises();
    return;
  }
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
});

// ————— boot —————

applyTheme();
render();

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
