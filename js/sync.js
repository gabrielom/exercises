// Cross-device history sync through a private GitHub gist.
//
// The gist is the database: one JSON file holding the set log and per-exercise
// prefs. Merging is conflict-free by construction — the log is append-only
// (union by entry identity), prefs are last-write-wins per exercise via the
// _ts stamp store.setPref writes. Races between devices are self-healing:
// anything one device's push overwrites is still in the other device's local
// store and re-enters the union on its next sync.
//
// Setup needs a *classic* GitHub personal access token with only the `gist`
// scope (fine-grained tokens can't access gists). The token stays in this
// device's localStorage and is deliberately excluded from export backups.

import * as store from './store.js';
import { logKey, weightKey } from './store.js';

const FILE = 'exercises-sync.json';
const API = 'https://api.github.com';

export function cfg() { return store.get('sync', null); }
function saveCfg(c) { store.set('sync', c); }
export function connected() { return !!cfg()?.token; }

async function gh(path, opts, token) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      ...(opts?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const why = res.status === 401 ? 'token rejected — check it has the gist scope'
      : res.status === 404 ? 'gist not found'
      : `GitHub error ${res.status}`;
    throw new Error(why);
  }
  return res.json();
}

// Connect this device: reuse the account's existing sync gist, else create it
// seeded with this device's data. Then run a first sync.
export async function connect(token) {
  token = token.trim();
  if (!token) throw new Error('paste a token first');
  const gists = await gh('/gists?per_page=100', {}, token);
  let gist = gists.find(g => g.files && g.files[FILE]);
  if (!gist) {
    gist = await gh('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: 'Exercises app sync — managed by the app, do not edit',
        public: false,
        files: { [FILE]: { content: JSON.stringify(payload()) } },
      }),
    }, token);
  }
  saveCfg({ token, gistId: gist.id, lastSync: 0, auto: true });
  return syncNow();
}

// Disconnect locally first, so a hanging network can never leave this device
// still connected, then take it off the shared list as a courtesy. If that
// fails the entry simply ages out after STALE_DAYS.
export async function disconnect() {
  const c = cfg();
  const me = store.get('device')?.id;
  store.remove('sync');
  store.remove('devices');
  if (!c?.token || !me) return;
  try {
    const gist = await gh(`/gists/${c.gistId}`, {}, c.token);
    const file = gist.files?.[FILE];
    if (!file) return;
    const raw = file.truncated ? await fetch(file.raw_url).then(r => r.text()) : file.content;
    const parsed = JSON.parse(raw);
    if (parsed.app !== 'exercises' || !parsed.devices?.[me]) return;
    delete parsed.devices[me];
    await gh(`/gists/${c.gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(parsed) } } }),
    }, c.token);
  } catch { /* it ages out on its own */ }
}

function mergeLogs(a, b) {
  const seen = new Map();
  for (const e of [...a, ...b]) {
    const k = logKey(e);
    if (!seen.has(k)) seen.set(k, e);
  }
  return [...seen.values()].sort((x, y) => x.t - y.t);
}

// Weight records are keyed by exercise + day, so the newest write for a given
// day wins rather than both devices' versions surviving the union.
function mergeWeights(a, b) {
  const best = new Map();
  for (const e of [...a, ...b]) {
    const k = weightKey(e);
    const cur = best.get(k);
    if (!cur || (e.t || 0) > (cur.t || 0)) best.set(k, e);
  }
  return [...best.values()].sort((x, y) => x.t - y.t);
}

function mergePrefs(local, remote) {
  const out = { ...remote };
  for (const [id, p] of Object.entries(local)) {
    if (!out[id] || (p._ts || 0) >= (out[id]._ts || 0)) out[id] = p;
  }
  return out;
}

// ————— the shared device list —————
// Every device that syncs writes one { id, name, seen } record. Union by id,
// newest `seen` wins, and anything silent for STALE_DAYS drops off so a wiped
// or forgotten device does not linger in the list for ever.

const STALE_DAYS = 90;
// How out of date this device's own `seen` may get before a sync refreshes it.
// Without this every sync would dirty the payload and force a pointless push.
const TOUCH_AFTER = 30 * 60000;

function mergeDevices(local, remote) {
  const out = {};
  const cutoff = Date.now() - STALE_DAYS * 86400000;
  for (const d of [...Object.values(remote || {}), ...Object.values(local || {})]) {
    if (!d?.id) continue;
    const cur = out[d.id];
    if (!cur || (d.seen || 0) > (cur.seen || 0)) out[d.id] = d;
  }
  for (const [id, d] of Object.entries(out)) {
    if ((d.seen || 0) < cutoff) delete out[id];
  }
  return out;
}

// This device's entry, refreshed only when it has gone stale enough to matter.
function touchSelf(devices) {
  const me = store.device();
  const cur = devices[me.id];
  if (cur && cur.name === me.name && Date.now() - (cur.seen || 0) < TOUCH_AFTER) return devices;
  return { ...devices, [me.id]: { id: me.id, name: me.name, seen: Date.now() } };
}

// Everything that has synced, most recently seen first. Names repeat when two
// devices are the same kind, so number the repeats rather than show "iPhone"
// twice with no way to tell them apart.
export function devices() {
  const meId = store.get('device')?.id;
  // This device always leads: its own `seen` is only refreshed every TOUCH_AFTER,
  // so ordering it by that stamp would sometimes rank it below devices it had
  // just synced alongside.
  const all = Object.values(store.get('devices', {}))
    .sort((a, b) => (b.id === meId) - (a.id === meId) || (b.seen || 0) - (a.seen || 0));
  const seenNames = new Map();
  return all.map(d => {
    const n = (seenNames.get(d.name) || 0) + 1;
    seenNames.set(d.name, n);
    return { ...d, label: n > 1 ? `${d.name} ${n}` : d.name, self: d.id === meId };
  });
}

function payload(devs) {
  return {
    app: 'exercises', v: 1,
    log: store.get('log', []),
    prefs: store.get('prefs', {}),
    deleted: store.get('deleted', []),
    wlog: store.get('wlog', []),
    devices: devs || store.get('devices', {}),
  };
}

let syncing = false;

export async function syncNow() {
  const c = cfg();
  if (!c || syncing) return null;
  syncing = true;
  try {
    const gist = await gh(`/gists/${c.gistId}`, {}, c.token);
    const file = gist.files?.[FILE];
    let remote = { log: [], prefs: {} };
    if (file) {
      try {
        const raw = file.truncated ? await fetch(file.raw_url).then(r => r.text()) : file.content;
        const parsed = JSON.parse(raw);
        if (parsed.app === 'exercises') remote = parsed;
      } catch { /* unreadable remote — rewrite it from the merge below */ }
    }

    const localLog = store.get('log', []);
    // tombstones win over the union — a set untoggled on any device stays gone
    const deleted = [...new Set([...store.get('deleted', []), ...(remote.deleted || [])])];
    const delSet = new Set(deleted);
    const log = mergeLogs(localLog, remote.log || []).filter(e => !delSet.has(logKey(e)));
    const prefs = mergePrefs(store.get('prefs', {}), remote.prefs || {});
    const pulled = log.length - localLog.length;

    // Deletions are records here, so the merge already carries them.
    const wlog = mergeWeights(store.get('wlog', []), remote.wlog || []);
    const devs = touchSelf(mergeDevices(store.get('devices', {}), remote.devices));

    store.set('log', log);
    store.set('prefs', prefs);
    store.set('deleted', deleted);
    store.set('wlog', wlog);
    store.set('devices', devs);

    const changed = log.length !== (remote.log || []).length
      || deleted.length !== (remote.deleted || []).length
      || JSON.stringify(wlog) !== JSON.stringify(remote.wlog || [])
      || JSON.stringify(prefs) !== JSON.stringify(remote.prefs || {})
      || JSON.stringify(devs) !== JSON.stringify(remote.devices || {});
    if (changed) {
      await gh(`/gists/${c.gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload(devs)) } } }),
      }, c.token);
    }
    saveCfg({ ...cfg(), lastSync: Date.now() });
    return { pulled: Math.max(0, pulled) };
  } finally {
    syncing = false;
  }
}

// ————— auto-sync —————
// Shortly after any local change (a logged set, a delete, a weight edit), and
// when the app returns to the foreground.

let timer = null;
let pending = false;
export function schedule(delay = 6000) {
  if (!cfg()?.auto) return;
  clearTimeout(timer);
  pending = true;
  timer = setTimeout(() => { pending = false; syncNow().catch(() => {}); }, delay);
}

addEventListener('exercises:changed', () => schedule());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Backgrounding suspends timers on iOS, so a debounced push would never
    // land — flush it now, before the other device is picked up.
    if (pending) { clearTimeout(timer); pending = false; syncNow().catch(() => {}); }
    return;
  }
  const c = cfg();
  if (c?.auto && Date.now() - (c.lastSync || 0) > 60000) schedule(1200);
});
