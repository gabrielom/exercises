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
import { logKey } from './store.js';

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

export function disconnect() { store.remove('sync'); }

function mergeLogs(a, b) {
  const seen = new Map();
  for (const e of [...a, ...b]) {
    const k = logKey(e);
    if (!seen.has(k)) seen.set(k, e);
  }
  return [...seen.values()].sort((x, y) => x.t - y.t);
}

function mergePrefs(local, remote) {
  const out = { ...remote };
  for (const [id, p] of Object.entries(local)) {
    if (!out[id] || (p._ts || 0) >= (out[id]._ts || 0)) out[id] = p;
  }
  return out;
}

function payload() {
  return {
    app: 'exercises', v: 1,
    log: store.get('log', []),
    prefs: store.get('prefs', {}),
    deleted: store.get('deleted', []),
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

    store.set('log', log);
    store.set('prefs', prefs);
    store.set('deleted', deleted);

    const changed = log.length !== (remote.log || []).length
      || deleted.length !== (remote.deleted || []).length
      || JSON.stringify(prefs) !== JSON.stringify(remote.prefs || {});
    if (changed) {
      await gh(`/gists/${c.gistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload()) } } }),
      }, c.token);
    }
    saveCfg({ ...cfg(), lastSync: Date.now() });
    return { pulled: Math.max(0, pulled) };
  } finally {
    syncing = false;
  }
}

// ————— auto-sync —————
// Shortly after any logged set, and when the app returns to the foreground.

let timer = null;
export function schedule(delay = 6000) {
  if (!cfg()?.auto) return;
  clearTimeout(timer);
  timer = setTimeout(() => { syncNow().catch(() => {}); }, delay);
}

addEventListener('exercises:logged', () => schedule());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const c = cfg();
  if (c?.auto && Date.now() - (c.lastSync || 0) > 60000) schedule(1200);
});
