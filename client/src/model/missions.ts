// Gorevler (Kariyer, Surum 1): her gun 3 gorev (1 sabit giris + 2 degisen), her hafta 3 gorev. Gunluk gorev odulu guclendirmedir
// (gunde en fazla 2, odul defteri tavani); giris 50 FM; haftalik gorev 300 FM x Kariyer gelir carpani. Sezon pasi puani Surum 2'de eklenecek.
import type { Missions, SaveV1 } from './types.js';
import { CAREER_K, addLedger } from './career.js';
import { grantBoost } from './rewards.js';

export const DAILY_POOL = ['train', 'analysis', 'market', 'match'] as const;
export const WEEKLY_POOL: { id: string; goal: number; cat: string }[] = [
  { id: 'win2', goal: 1, cat: 'match' }, { id: 'clean', goal: 1, cat: 'match' }, { id: 'awaywin', goal: 1, cat: 'match' },
  { id: 'train3', goal: 3, cat: 'dev' }, { id: 'youth2', goal: 2, cat: 'dev' }, { id: 'sale', goal: 1, cat: 'eco' }, { id: 'scout', goal: 1, cat: 'eco' },
];
const dayKey = (now: number) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const weekKey = (now: number) => { const d = new Date(now); const day = (d.getDay() + 6) % 7; const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day); return `${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`; };
export const emptyMissions = (): Missions => ({ day: '', daily: [], week: '', weekly: [], streak: 0 });
// gun / hafta degistiyse yeni gorevler; giris gorevi oyunu acinca tamamlanir
export function roll(db: SaveV1, now = Date.now()) {
  const m = db.missions; const dk = dayKey(now), wk = weekKey(now);
  if (m.day !== dk) {
    const seed = [...dk].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0; const a = seed % DAILY_POOL.length; let b = (seed >>> 3) % DAILY_POOL.length; if (b === a) b = (b + 1) % DAILY_POOL.length;
    m.day = dk; m.streak = (m.streak % 7) + 1; // kacirilan gun seriyi sifirlamaz
    m.daily = [{ id: 'login', done: true, claimed: false }, { id: DAILY_POOL[a], done: false, claimed: false }, { id: DAILY_POOL[b], done: false, claimed: false }];
  }
  if (m.week !== wk) {
    const seed = [...wk].reduce((a, ch) => a * 33 + ch.charCodeAt(0), 5) >>> 0; const cats = ['match', 'dev', 'eco'];
    m.week = wk; m.weekly = cats.map((cat, i) => { const pool = WEEKLY_POOL.filter((x) => x.cat === cat); const it = pool[(seed >>> (i * 4)) % pool.length]; return { id: it.id, prog: 0, goal: it.goal, claimed: false }; });
  }
}
export type Ev = { t: 'train' } | { t: 'analysis' } | { t: 'market' } | { t: 'sale' } | { t: 'scout' } | { t: 'match'; gf: number; ga: number; home: boolean; youth: number };
export function track(db: SaveV1, e: Ev) {
  roll(db); const m = db.missions;
  const daily = (id: string) => { const d = m.daily.find((x) => x.id === id); if (d) d.done = true; };
  const weekly = (id: string, n = 1) => { const w = m.weekly.find((x) => x.id === id); if (w) w.prog = Math.min(w.goal, w.prog + n); };
  if (e.t === 'train') { daily('train'); weekly('train3'); }
  else if (e.t === 'analysis') daily('analysis');
  else if (e.t === 'market') daily('market');
  else if (e.t === 'sale') { daily('market'); weekly('sale'); }
  else if (e.t === 'scout') weekly('scout');
  else { daily('match'); if (e.gf - e.ga >= 2) weekly('win2'); if (e.ga === 0) weekly('clean'); if (!e.home && e.gf > e.ga) weekly('awaywin'); if (e.youth) weekly('youth2', e.youth); }
}
export const claimable = (db: SaveV1) => db.missions.daily.filter((d) => d.done && !d.claimed).length + db.missions.weekly.filter((w) => w.prog >= w.goal && !w.claimed).length;
// odul: { fm, boost } (guclendirme gunluk tavana takilirsa 0 doner)
export function claimDaily(db: SaveV1, i: number): { fm: number; boost: number } | null {
  const d = db.missions.daily[i]; if (!d || !d.done || d.claimed) return null; d.claimed = true;
  if (d.id === 'login') { const fm = Math.round(50 * CAREER_K.income); if (db.career) addLedger(db.career, 'mission:login', fm); const boost = db.missions.streak === 7 ? grantBoost(db.rewards, 1) : 0; return { fm: db.career ? fm : 0, boost }; }
  return { fm: 0, boost: grantBoost(db.rewards, 1) };
}
export function claimWeekly(db: SaveV1, i: number): { fm: number; boost: number } | null {
  const w = db.missions.weekly[i]; if (!w || w.prog < w.goal || w.claimed) return null; w.claimed = true;
  const fm = Math.round(300 * CAREER_K.income); if (db.career) addLedger(db.career, 'mission:weekly', fm); return { fm: db.career ? fm : 0, boost: 0 };
}
