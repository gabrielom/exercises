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
  dispatchEvent(new CustomEvent('exercises:changed'));
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
      dispatchEvent(new CustomEvent('exercises:changed'));
      return e;
    }
  }
  return null;
}

// Delete every entry matching `pred` (History swipe-to-delete). Like
// undoLastToday it tombstones them, otherwise the next gist sync would
// union-merge them straight back in. Returns what was removed so it can be
// restored by an undo.
export function deleteEntries(pred) {
  const log = get('log', []);
  const keep = [], removed = [];
  for (const e of log) (pred(e) ? removed : keep).push(e);
  if (!removed.length) return [];
  const del = get('deleted', []);
  for (const e of removed) del.push(logKey(e));
  set('deleted', del);
  set('log', keep);
  dispatchEvent(new CustomEvent('exercises:changed'));
  return removed;
}

// Put deleted entries back and lift their tombstones.
export function restoreEntries(entries) {
  if (!entries?.length) return;
  const log = get('log', []);
  const del = new Set(get('deleted', []));
  for (const e of entries) { log.push(e); del.delete(logKey(e)); }
  log.sort((a, b) => a.t - b.t);
  set('log', log);
  set('deleted', [...del]);
  dispatchEvent(new CustomEvent('exercises:changed'));
}

export function getLog() { return get('log', []); }

export function todayFor(exId) {
  const today = localDate();
  return getLog().filter(e => e.ex === exId && e.d === today);
}

// ————— weight changes —————
// Editing a weight is worth remembering even on a day nothing was logged, so it
// gets its own record rather than being inferred from the sets log. One record
// per exercise per day (repeated taps on +/− collapse into it), which also
// makes it a clean last-write-wins key for sync.

export const weightKey = e => `${e.ex}|${e.d}`;

export function getWeightLog() { return get('wlog', []); }

export function logWeightChange(exId, from, to) {
  if (from === to || from === undefined || to === undefined) return;
  const d = localDate();
  const wlog = get('wlog', []);
  const del = new Set(get('wdeleted', []));
  const k = `${exId}|${d}`;
  const i = wlog.findIndex(e => e.ex === exId && e.d === d);
  if (i === -1) { wlog.push({ t: Date.now(), d, ex: exId, from, to }); del.delete(k); }
  else if (wlog[i].from === to) { wlog.splice(i, 1); del.add(k); }  // back where the day started
  else { wlog[i] = { ...wlog[i], to, t: Date.now() }; del.delete(k); }
  set('wlog', wlog);
  set('wdeleted', [...del]);
  dispatchEvent(new CustomEvent('exercises:changed'));
}

export function deleteWeightChanges(pred) {
  const wlog = get('wlog', []);
  const keep = [], removed = [];
  for (const e of wlog) (pred(e) ? removed : keep).push(e);
  if (!removed.length) return [];
  const del = get('wdeleted', []);
  for (const e of removed) del.push(weightKey(e));
  set('wdeleted', del);
  set('wlog', keep);
  dispatchEvent(new CustomEvent('exercises:changed'));
  return removed;
}

export function restoreWeightChanges(entries) {
  if (!entries?.length) return;
  const wlog = get('wlog', []);
  const del = new Set(get('wdeleted', []));
  for (const e of entries) { wlog.push(e); del.delete(weightKey(e)); }
  wlog.sort((a, b) => a.t - b.t);
  set('wlog', wlog);
  set('wdeleted', [...del]);
  dispatchEvent(new CustomEvent('exercises:changed'));
}

// ————— per-exercise prefs (mode override, etc.) —————

export function getPref(exId) { return (get('prefs', {}))[exId] || {}; }

export function setPref(exId, patch) {
  const prefs = get('prefs', {});
  prefs[exId] = { ...(prefs[exId] || {}), ...patch, _ts: Date.now() };
  set('prefs', prefs);
  // Editing a weight is a change worth syncing on its own — without this it
  // would sit here until the next logged set happened to push it.
  dispatchEvent(new CustomEvent('exercises:changed'));
}

// ————— backup —————

const BACKUP_KEYS = ['v', 'prefs', 'log', 'routine', 'settings', 'deleted', 'wlog', 'wdeleted'];

export function exportData() {
  const data = { app: 'exercises', exported: new Date().toISOString() };
  for (const k of BACKUP_KEYS) data[k] = get(k);
  return JSON.stringify(data, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!data || data.app !== 'exercises') throw new Error('Not an Exercises backup file');
  for (const k of BACKUP_KEYS) {
    if (data[k] !== undefined && data[k] !== null) set(k, data[k]);
  }
}

export function resetAll() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  }
  init();
}
