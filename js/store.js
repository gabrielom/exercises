// localStorage wrapper. Keys are namespaced because every *.github.io project
// site shares one localStorage origin.

const PREFIX = 'exercises.';
const VERSION = 1;

function key(k) { return PREFIX + k; }

export function get(k, fallback = null) {
  try {
    const raw = localStorage.getItem(key(k));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(k, value) {
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch (e) {
    console.warn('storage write failed', e);
  }
}

export function remove(k) {
  localStorage.removeItem(key(k));
}

export function init() {
  if (get('v') === null) set('v', VERSION);
}

// ————— sets log —————
// entry: { t: epoch ms, d: 'YYYY-MM-DD' (local), ex: id, mode: 'reps'|'time', v: number, side?: 'L'|'R', routine?: true }

export function localDate(ts = Date.now()) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function logSet(entry) {
  const log = get('log', []);
  log.push({ t: Date.now(), d: localDate(), ...entry });
  set('log', log);
  dispatchEvent(new CustomEvent('exercises:logged'));
  return log;
}

// Stable identity of a log entry — also used by sync's union merge.
export const logKey = e => `${e.t}|${e.ex}|${e.side || ''}`;

// Remove the most recent set logged today for an exercise (quick-log toggle
// off). Leaves a tombstone so sync deletes it everywhere instead of
// resurrecting it from the gist.
export function undoLastToday(exId) {
  const log = get('log', []);
  const today = localDate();
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].ex === exId && log[i].d === today) {
      const [e] = log.splice(i, 1);
      const del = get('deleted', []);
      del.push(logKey(e));
      set('deleted', del);
      set('log', log);
      dispatchEvent(new CustomEvent('exercises:logged'));
      return e;
    }
  }
  return null;
}

export function getLog() { return get('log', []); }

export function todayFor(exId) {
  const today = localDate();
  return getLog().filter(e => e.ex === exId && e.d === today);
}

// ————— per-exercise prefs (mode override, etc.) —————

export function getPref(exId) { return (get('prefs', {}))[exId] || {}; }

export function setPref(exId, patch) {
  const prefs = get('prefs', {});
  prefs[exId] = { ...(prefs[exId] || {}), ...patch, _ts: Date.now() };
  set('prefs', prefs);
}

// ————— backup —————

export function exportData() {
  const data = { app: 'exercises', exported: new Date().toISOString() };
  for (const k of ['v', 'prefs', 'log', 'routine', 'settings', 'deleted']) data[k] = get(k);
  return JSON.stringify(data, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!data || data.app !== 'exercises') throw new Error('Not an Exercises backup file');
  for (const k of ['v', 'prefs', 'log', 'routine', 'settings', 'deleted']) {
    if (data[k] !== undefined && data[k] !== null) set(k, data[k]);
  }
}

export function resetAll() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  }
  init();
}
