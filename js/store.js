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
  // Weight-change deletions used to live in a separate tombstone list keyed by
  // exercise + day. That key is reused, so those entries would go on erasing
  // later changes for the same day — drop them.
  remove('wdeleted');
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
// per exercise per day, so repeated taps on +/− collapse into it.
//
// Unlike the sets log, that key (exercise + day) gets reused, so a deletion
// cannot be a plain tombstone: a tombstone would also swallow the next change
// recorded for the same exercise on the same day, and sync would keep handing
// it back. A deletion is a timestamped record of its own instead, which makes
// every write — value or deletion — last-write-wins on the same key.

export const weightKey = e => `${e.ex}|${e.d}`;

export function getWeightLog() { return get('wlog', []); }
export function liveWeightLog() { return get('wlog', []).filter(e => !e.deleted); }

function putWeight(rec) {
  const wlog = get('wlog', []).filter(e => weightKey(e) !== weightKey(rec));
  wlog.push(rec);
  wlog.sort((a, b) => a.t - b.t);
  set('wlog', wlog);
  dispatchEvent(new CustomEvent('exercises:changed'));
}

export function logWeightChange(exId, from, to) {
  if (from === to || from == null || to == null) return;
  const d = localDate();
  const cur = liveWeightLog().find(e => e.ex === exId && e.d === d);
  const t = Date.now();
  if (!cur) putWeight({ t, d, ex: exId, from, to });
  else if (cur.from === to) putWeight({ t, d, ex: exId, deleted: true }); // back where the day started
  else putWeight({ ...cur, t, to });
}

export function deleteWeightChanges(pred) {
  const wlog = get('wlog', []);
  const removed = wlog.filter(e => !e.deleted && pred(e));
  if (!removed.length) return [];
  const gone = new Set(removed.map(weightKey));
  const t = Date.now();
  const next = wlog.filter(e => !gone.has(weightKey(e)));
  for (const e of removed) next.push({ t, d: e.d, ex: e.ex, deleted: true });
  next.sort((a, b) => a.t - b.t);
  set('wlog', next);
  dispatchEvent(new CustomEvent('exercises:changed'));
  return removed;
}

// Wipe every recorded weight change. Each one becomes a fresh deletion rather
// than simply disappearing, so the reset travels to the other devices and the
// gist instead of being undone by the next merge. Returns how many were live.
export function clearWeightChanges() {
  const wlog = get('wlog', []);
  if (!wlog.length) return 0;
  const t = Date.now();
  const live = wlog.filter(e => !e.deleted).length;
  set('wlog', wlog.map(e => ({ t, d: e.d, ex: e.ex, deleted: true })));
  dispatchEvent(new CustomEvent('exercises:changed'));
  return live;
}

export function restoreWeightChanges(entries) {
  // Stamped now so the restore out-dates the deletion it is undoing.
  for (const e of entries || []) putWeight({ ...e, t: Date.now() });
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

const BACKUP_KEYS = ['v', 'prefs', 'log', 'routine', 'settings', 'deleted', 'wlog'];

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
