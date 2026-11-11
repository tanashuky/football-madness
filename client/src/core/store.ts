// Kayit: tek nesne (SaveV1) localStorage'da; her save() aninda yazar ve dinleyicileri (bulut, ekran) haberdar eder.
// Eski demo kaydi (fm.demo.v1) ilk acilista tasinir: kulup, kadro, taktik, solo lig -> Kariyer; Elo -> Mac Modu.
import { DEF_SETTINGS, EMPTY_REWARDS, type Career, type SaveV1, type Settings } from '../model/types.js';

export const SAVE_KEY = 'fm.save.v1';
const DEMO_KEY = 'fm.demo.v1';
export const APP_VERSION = '0.1.0';

export const store: { db: SaveV1 } = { db: fresh() };
const listeners = new Set<(db: SaveV1) => void>();
export function onSave(f: (db: SaveV1) => void) { listeners.add(f); return () => listeners.delete(f); }

export function fresh(): SaveV1 {
  return { v: 1, updatedAt: 0, account: null, settings: { ...DEF_SETTINGS, sound: { ...DEF_SETTINGS.sound } }, career: null, mm: { elo: 1000, played: 0, last: null }, rewards: EMPTY_REWARDS(), online: null };
}
export function load(): SaveV1 {
  let db: SaveV1 | null = null;
  try { db = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { db = null; }
  if (!db) { db = migrateDemo() ?? fresh(); }
  store.db = normalize(db);
  return store.db;
}
export function save() {
  store.db.updatedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(store.db)); } catch (e) { /* depolama dolu ya da kapali: kayit bellekte surer */ }
  listeners.forEach((f) => f(store.db));
}
// bulut kaydi geldi: yereli degistir (normalize + kaydet; bulut push tetiklenmesin diye dinleyiciler cagrilmaz)
export function replace(db: SaveV1) { store.db = normalize(db); try { localStorage.setItem(SAVE_KEY, JSON.stringify(store.db)); } catch (e) {} }
export function reset() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(DEMO_KEY); localStorage.removeItem('fm.lastReplay'); } catch (e) {} store.db = fresh(); }

// eksik alanlari varsayilanla doldurur (eski surum kayitlari, bozuk alanlar)
export function normalize(db: any): SaveV1 {
  const f = fresh();
  const out: SaveV1 = { ...f, ...db, v: 1 };
  out.settings = { ...f.settings, ...(db.settings || {}), sound: { ...f.settings.sound, ...((db.settings || {}).sound || {}) } } as Settings;
  out.mm = { ...f.mm, ...(db.mm || {}) };
  out.rewards = { ...f.rewards, ...(db.rewards || {}) };
  if (!Array.isArray(out.rewards.entries)) out.rewards.entries = [];
  if (out.career) out.career = normalizeCareer(out.career);
  out.online = null;
  return out;
}
function normalizeCareer(c: any): Career {
  c.fm = Number.isFinite(c.fm) ? c.fm : 0;
  c.ledger = Array.isArray(c.ledger) ? c.ledger : [];
  c.facilities = { stadium: { level: 1, ...((c.facilities || {}).stadium || {}) }, academy: { level: 0, ...((c.facilities || {}).academy || {}) } };
  c.metrics = { U: 55, T: 55, F: 55, M: 70, ...(c.metrics || {}) };
  c.train = { day: '', count: 0, job: null, last: null, ...(c.train || {}) };
  c.scout = { job: null, found: null, ...(c.scout || {}) };
  c.pool = Array.isArray(c.pool) ? c.pool : [];
  c.nextId = c.nextId || 1; c.lastTick = c.lastTick || 0;
  c.tm = Number.isFinite(c.tm) ? c.tm : 55;
  c.stats = { played: 0, won: 0, drawn: 0, lost: 0, seasons: 1, ...(c.stats || {}) };
  c.trophies = Array.isArray(c.trophies) ? c.trophies : [];
  c.history = Array.isArray(c.history) ? c.history : [];
  if (!c.team.duties) c.team.duties = {}; if (!c.team.rules) c.team.rules = [];
  return c as Career;
}
// demo kaydindan tasima: kulup ve ayarlar; solo lig varsa kadro+taktik+lig Kariyer olur, yoksa kadro+taktik bekler (ilk Kariyer'de kullanilir)
function migrateDemo(): SaveV1 | null {
  let d: any = null;
  try { d = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { return null; }
  if (!d || !d.account || !d.account.club) return null;
  const f = fresh();
  const s = d.settings || {};
  const club = { city: '', stadium: '', gg: 62, createdAt: Date.now(), ...d.account.club };
  const out: SaveV1 = { ...f, account: { guest: !!d.account.guest, club }, mm: { elo: d.mm?.elo ?? 1000, played: d.mm?.played ?? 0, last: d.mm?.last ?? null } };
  out.settings = { ...f.settings, keys: s.keys ?? 'arrows', assistP: s.assistP ?? 0, assistS: s.assistS ?? 1, autoSwitch: s.autoSwitch ?? true, ball: s.ball ?? 1.4, names: s.names ?? 'auto', cam: s.cam ?? 'full', mode: s.mode ?? 'sim', minutes: s.minutes ?? 10 };
  if (d.solo && d.roster && d.team) {
    const sl = d.solo;
    out.career = normalizeCareer({
      startedAt: Date.now(), diff: sl.diff ?? 2, minutes: sl.minutes ?? 10, roster: d.roster, team: d.team,
      league: { size: sl.teams.length, teams: sl.teams, fixtures: sl.fixtures, week: sl.week, season: sl.season ?? 1, results: sl.results ?? [], table: sl.table },
      fm: 0, stats: { played: (sl.results || []).filter((m: any) => m.a === 0 || m.b === 0).length, won: sl.table?.[0]?.w ?? 0, drawn: sl.table?.[0]?.d ?? 0, lost: sl.table?.[0]?.l ?? 0, seasons: sl.season ?? 1 },
    });
  } else if (d.team) {
    // lig yok: kadro (varsa) ve taktik, ilk Kariyer kurulana kadar "bekleyen" olarak tutulur
    pendingDemoSquad = { roster: Array.isArray(d.roster) ? d.roster : [], team: d.team };
  }
  out.updatedAt = d.updatedAt || Date.now();
  return out;
}
export let pendingDemoSquad: { roster: any[]; team: any } | null = null;
export function takePendingDemoSquad() { const p = pendingDemoSquad; pendingDemoSquad = null; return p; }
