// Kariyer yonetimi: tesis insaati, antrenman, scout, transfer havuzu, altyapi, yaslanma. Formuller Metrik sekmesindeki Online tablosu x Kariyer carpani
// (maliyet x0,8, sure x0,6). Sayaclar gercek zamanlidir ve cihazda tutulur; tick() her ekran ciziminde biten isleri uygular.
import type { Pos } from '../engine.js';
import type { Career, RosterPlayer, Rewards } from './types.js';
import { CAREER_K, addLedger } from './career.js';

export const HOUR = 3600e3, DAY = 24 * HOUR, WEEK = 7 * DAY;
// test/gelistirme: localStorage 'fm.timeScale' sureleri boler (ornegin 100000)
const scale = () => { try { return Math.max(1, +(localStorage.getItem('fm.timeScale') || 1)); } catch (e) { return 1; } };
const dur = (ms: number) => (ms * CAREER_K.time) / scale();
const cost = (fm: number) => Math.round(fm * CAREER_K.cost);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const rint = (a: number, b: number) => Math.floor(rnd(a, b + 1));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---------- tesisler ----------
export const STADIUM_CAP = [0, 5000, 10000, 15000, 20000, 25000, 32000, 40000, 46000, 53000, 60000];
const STADIUM_COST = [0, 0, 4000, 6800, 11600, 19700, 33400, 56800, 96600, 164100, 279000]; // hedef seviyeye gore
const ACADEMY = [null, { cost: 5000, weeks: 2, upkeep: 150, youth: 1, gg: [35, 45] }, { cost: 10000, weeks: 4, upkeep: 300, youth: 2, gg: [35, 47] }, { cost: 20000, weeks: 6, upkeep: 450, youth: 2, gg: [37, 49] }, { cost: 40000, weeks: 9, upkeep: 600, youth: 3, gg: [38, 50] }, { cost: 80000, weeks: 12, upkeep: 800, youth: 3, gg: [40, 52] }] as const;
export type FacKey = 'stadium' | 'academy';
export const FAC_MAX: Record<FacKey, number> = { stadium: 10, academy: 5 };
export function upgradeInfo(c: Career, f: FacKey): { cost: number; ms: number; to: number } | null {
  const to = c.facilities[f].level + 1; if (to > FAC_MAX[f]) return null;
  if (f === 'stadium') return { to, cost: cost(STADIUM_COST[to]), ms: dur((to - 1) * WEEK) };
  const a = ACADEMY[to]!; return { to, cost: cost(a.cost), ms: dur(a.weeks * WEEK) };
}
export const building = (c: Career): FacKey | null => (['stadium', 'academy'] as FacKey[]).find((f) => !!c.facilities[f].busyUntil) || null;
export function startUpgrade(c: Career, f: FacKey, now = Date.now()): 'ok' | 'busy' | 'fm' | 'max' {
  const u = upgradeInfo(c, f); if (!u) return 'max'; if (building(c)) return 'busy'; if (c.fm < u.cost) return 'fm';
  addLedger(c, `build:${f}:${u.to}`, -u.cost); c.facilities[f].busyUntil = now + u.ms; return 'ok';
}
export const academyUpkeep = (c: Career) => (c.facilities.academy.level > 0 ? cost(ACADEMY[c.facilities.academy.level]!.upkeep) : 0);
// taraftar morali: notr = 50 + 2 x stadyum seviyesi; her hafta farkin %10'u kadar yaklasir
export const tmNeutral = (c: Career) => 50 + 2 * c.facilities.stadium.level;

// ---------- antrenman ----------
export type TrainKind = 'cohesion' | 'tactic' | 'physical' | 'individual' | 'rest';
export const INTENSITY = [{ hours: 2, gain: 1.0, fat: 5 }, { hours: 4, gain: 2.0, fat: 10 }, { hours: 6, gain: 3.5, fat: 18 }];
export const SESSIONS_PER_DAY = 2;
// azalan getiri: 40'ta x0,8; 70'te x0,5; 90'da x0,3 (arasi dogrusal)
export function gainMult(v: number): number { const pts: [number, number][] = [[0, 1], [40, 0.8], [70, 0.5], [90, 0.3], [100, 0.2]]; for (let i = 1; i < pts.length; i++) if (v <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (v - x0)) / (x1 - x0); } return 0.2; }
const dayKey = (now: number) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function sessionsToday(c: Career, now = Date.now()) { if (c.train.day !== dayKey(now)) { c.train.day = dayKey(now); c.train.count = 0; } return c.train.count; }
export function trainMs(kind: TrainKind, level: number) { return dur((kind === 'rest' ? 4 : INTENSITY[level].hours) * HOUR); }
export function startTraining(c: Career, kind: TrainKind, level: number, players: string[] = [], now = Date.now()): 'ok' | 'busy' | 'limit' | 'pick' {
  if (c.train.job) return 'busy'; if (sessionsToday(c, now) >= SESSIONS_PER_DAY) return 'limit';
  if (kind === 'individual') { players = players.filter((id, i) => id && players.indexOf(id) === i && c.roster.some((p) => p.id === id)).slice(0, 3); if (!players.length) return 'pick'; }
  c.train.job = { kind, level, players, until: now + trainMs(kind, level) }; c.train.count++; return 'ok';
}
function finishTraining(c: Career) {
  const j = c.train.job!; c.train.job = null; const I = INTENSITY[j.level] || INTENSITY[0]; const m = c.metrics;
  const addFat = (f: number, only?: string[]) => { for (const p of c.roster) if (!only || only.includes(p.id)) p.fatigue = clamp(p.fatigue + f, 0, 100); };
  let text = '';
  if (j.kind === 'rest') { addFat(-20); m.M = clamp(m.M + 1, 0, 100); text = 'rest'; }
  else if (j.kind === 'cohesion') { const g = I.gain * 0.7 * gainMult(m.U); m.U = clamp(m.U + g, 0, 100); addFat(I.fat / 2); text = `U +${g.toFixed(1)}`; }
  else if (j.kind === 'tactic') { const g = I.gain * gainMult(m.T); m.T = clamp(m.T + g, 0, 100); if (j.level > 0) m.F = clamp(m.F - 0.5, 0, 100); addFat(I.fat); text = `T +${g.toFixed(1)}`; }
  else if (j.kind === 'physical') { const g = I.gain * gainMult(m.F); m.F = clamp(m.F + g, 0, 100); if (j.level > 0) m.T = clamp(m.T - 0.3, 0, 100); addFat(I.fat); text = `F +${g.toFixed(1)}`; }
  else { const g = [0.2, 0.4, 0.7][j.level]; for (const p of c.roster) if (j.players.includes(p.id)) p.gg = Math.min(99, Math.round((p.gg + g * gainMult(p.gg)) * 100) / 100); addFat(I.fat, j.players); addFat(I.fat / 3); text = `GG +${g}`; }
  if (j.kind !== 'rest' && j.level === 2) m.M = clamp(m.M - 1, 0, 100);
  c.train.last = { kind: j.kind, text, t: j.until };
}

// ---------- futbolcu uretimi, piyasa degeri ----------
const SURNAMES = ['Acar', 'Bulut', 'Çakır', 'Duman', 'Ekinci', 'Fırat', 'Güler', 'Işık', 'Kaplan', 'Korkmaz', 'Özkan', 'Sarı', 'Şimşek', 'Taş', 'Toprak', 'Turan', 'Uçar', 'Yalçın', 'Yavuz', 'Zengin', 'Bozkurt', 'Ateş', 'Kara', 'Aslan', 'Bayram', 'Çetin', 'Ercan', 'Karaca', 'Soylu', 'Tuna'];
const TRAITS = ['Hızlı', 'Hava Hakimi', 'Oyun Kurucu', 'Bitirici', 'Duvar', 'Dayanıklı', 'Çalımcı'];
const POSS: Pos[] = ['GK', 'CB', 'CB', 'FB', 'FB', 'DM', 'CM', 'CM', 'W', 'W', 'ST', 'ST'];
export function freeNumber(roster: RosterPlayer[]): number { for (let n = 2; n <= 99; n++) if (!roster.some((p) => p.num === n)) return n; return 99; }
function mkPlayer(c: Career, gg: [number, number], age: [number, number], traitP: number, forceTrait = false, pos?: Pos): RosterPlayer {
  const natPos = pos || POSS[rint(0, POSS.length - 1)];
  const traits: string[] = []; if (forceTrait || Math.random() < traitP) traits.push(natPos === 'GK' ? 'Refleks' : TRAITS[rint(0, TRAITS.length - 1)]); if (traits.length && Math.random() < 0.1 && natPos !== 'GK') { const t2 = TRAITS[rint(0, TRAITS.length - 1)]; if (!traits.includes(t2)) traits.push(t2); }
  return { id: 'n' + c.nextId++, num: 0, name: SURNAMES[rint(0, SURNAMES.length - 1)], natPos, gg: rint(gg[0], gg[1]), age: rint(age[0], age[1]), traits, fatigue: 10 };
}
// piyasa degeri: 1000 x e^((GG-50)/10) x yas katsayisi x 1,15^ozellik (dokumandaki ornek tabloyla ayni)
export function marketValue(p: { gg: number; age: number; traits: string[] }): number {
  const ageK = p.age <= 21 ? 1.3 : p.age <= 29 ? 1.0 : p.age <= 31 ? 0.7 : p.age <= 33 ? 0.45 : 0.25;
  return Math.round((1000 * Math.exp((p.gg - 50) / 10) * ageK * Math.pow(1.15, p.traits.length)) / 10) * 10;
}
export const ROSTER_MIN = 14, ROSTER_MAX = 25;

// ---------- scout ----------
export const SCOUTS = [{ id: 'std', cost: 3000, gg: [45, 60] as [number, number], traitP: 0.4, force: false }, { id: 'good', cost: 8000, gg: [55, 70] as [number, number], traitP: 0.4, force: false }, { id: 'elite', cost: 20000, gg: [65, 78] as [number, number], traitP: 1, force: true }];
export const SCOUT_HOURS = 8; // oneri: dokumanda sure yok; Kariyer carpaniyla ~4,8 saat
export const scoutCost = (i: number) => cost(SCOUTS[i].cost);
export function startScout(c: Career, i: number, pos: Pos | '', now = Date.now()): 'ok' | 'busy' | 'fm' {
  if (c.scout.job || c.scout.found) return 'busy'; if (c.fm < scoutCost(i)) return 'fm';
  addLedger(c, `scout:${SCOUTS[i].id}`, -scoutCost(i)); c.scout.job = { tier: i, pos, until: now + dur(SCOUT_HOURS * HOUR) }; return 'ok';
}
export function signFound(c: Career): boolean { const p = c.scout.found; if (!p || c.roster.length >= ROSTER_MAX) return false; p.num = freeNumber(c.roster); c.roster.push(p); c.scout.found = null; return true; }

// ---------- transfer havuzu (acik artirma yok): fiyat = PD; pazarlik bir kez, +-%10 ----------
export function refreshPool(c: Career) {
  const base = Math.round(c.roster.reduce((a, p) => a + p.gg, 0) / c.roster.length);
  c.pool = Array.from({ length: 12 }, () => { const p = mkPlayer(c, [base - 8, base + 8], [18, 33], 0.35); return { p, price: marketValue(p), haggled: false }; });
}
export function haggle(c: Career, id: string): 'down' | 'up' | 'no' { const it = c.pool.find((x) => x.p.id === id); if (!it || it.haggled) return 'no'; it.haggled = true; const ok = Math.random() < 0.5; it.price = Math.round((marketValue(it.p) * (ok ? 0.9 : 1.1)) / 10) * 10; return ok ? 'down' : 'up'; }
export function buy(c: Career, id: string): 'ok' | 'fm' | 'full' | 'no' {
  const i = c.pool.findIndex((x) => x.p.id === id); if (i < 0) return 'no'; const it = c.pool[i];
  if (c.roster.length >= ROSTER_MAX) return 'full'; if (c.fm < it.price) return 'fm';
  addLedger(c, `buy:${it.p.name}`, -it.price); it.p.num = freeNumber(c.roster); c.roster.push(it.p); c.pool.splice(i, 1); return 'ok';
}
export const sellPrice = (p: RosterPlayer) => Math.round((marketValue(p) * 0.9) / 10) * 10; // bot kulupler PD'nin %90'ini oder
export function sell(c: Career, id: string): 'ok' | 'min' | 'gk' | 'no' {
  const i = c.roster.findIndex((p) => p.id === id); if (i < 0) return 'no'; const p = c.roster[i];
  if (c.roster.length <= ROSTER_MIN) return 'min'; if (p.natPos === 'GK' && c.roster.filter((q) => q.natPos === 'GK').length <= 2) return 'gk';
  addLedger(c, `sell:${p.name}`, sellPrice(p)); c.roster.splice(i, 1);
  if (c.team.lineup) c.team.lineup = c.team.lineup.filter((x) => x !== id); if (c.team.duties) delete c.team.duties[id]; if (c.team.rotations) c.team.rotations = c.team.rotations.map((r) => r.filter((x) => x !== id)).filter((r) => r.length >= 2);
  return 'ok';
}

// ---------- zaman: biten isler, pasif toparlanma ----------
export function tick(c: Career, now = Date.now()): string[] {
  const done: string[] = [];
  if (!c.pool.length && c.nextId === 1) refreshPool(c);
  for (const f of ['stadium', 'academy'] as FacKey[]) { const b = c.facilities[f]; if (b.busyUntil && now >= b.busyUntil) { b.level++; delete b.busyUntil; done.push('fac:' + f); } }
  if (c.train.job && now >= c.train.job.until) { finishTraining(c); done.push('train'); }
  if (c.scout.job && now >= c.scout.job.until) { const j = c.scout.job; const s = SCOUTS[j.tier]; c.scout.found = mkPlayer(c, s.gg, [17, 30], s.traitP, s.force, (j.pos || undefined) as Pos | undefined); c.scout.job = null; done.push('scout'); }
  // pasif toparlanma: saatte -0,25 yorgunluk
  const h = ((now - (c.lastTick || now)) / HOUR) * scale(); if (h > 0.05) { const d = 0.25 * Math.min(h, 24 * 14); for (const p of c.roster) p.fatigue = clamp(p.fatigue - d, 0, 100); c.lastTick = now; } else if (!c.lastTick) c.lastTick = now;
  return done;
}
// guclendirme (zaman): bir isin kalan suresinden 4 saat duser (oneri)
export const BOOST_MS = 4 * HOUR;
export function useBoost(c: Career, r: Rewards, what: 'build' | 'train' | 'scout'): boolean {
  if (r.boosts <= 0) return false; const cut = BOOST_MS / scale();
  if (what === 'build') { const f = building(c); if (!f) return false; c.facilities[f].busyUntil! -= cut; }
  else if (what === 'train') { if (!c.train.job) return false; c.train.job.until -= cut; }
  else { if (!c.scout.job) return false; c.scout.job.until -= cut; }
  r.boosts--; return true;
}
// mac sonrasi: oynayanlara yorgunluk, haftalik altyapi bakimi, taraftar morali notre yaklasir
export function afterWeek(c: Career, lineup: string[]) {
  // Kariyer kurali (oneri): mac haftasi gecince herkes -8 toparlanir (oynayan net +1); gercek zamanli pasif toparlanma ayrica isler
  for (const p of c.roster) p.fatigue = clamp(p.fatigue + (lineup.includes(p.id) ? 9 : 0) - 8, 0, 100);
  const up = academyUpkeep(c); if (up) addLedger(c, 'upkeep:academy', -up);
  c.tm = clamp(c.tm + (tmNeutral(c) - c.tm) * 0.1, 0, 100);
}
// sezon sonu: yas +1, gelisim/gerileme, altyapi gencleri, havuz yenilenir
export function seasonTurn(c: Career): RosterPlayer[] {
  for (const p of c.roster) { p.age++; const d = p.age <= 21 ? rnd(1, 2.5) : p.age <= 24 ? rnd(0.5, 1.5) : p.age <= 29 ? rnd(-0.3, 0.6) : p.age <= 32 ? rnd(-1.5, 0) : rnd(-3, -1); p.gg = clamp(Math.round((p.gg + d) * 100) / 100, 30, 99); }
  const youths: RosterPlayer[] = []; const a = ACADEMY[c.facilities.academy.level];
  if (a) for (let i = 0; i < a.youth && c.roster.length < ROSTER_MAX; i++) { const y = mkPlayer(c, [a.gg[0], a.gg[1]], [16, 17], 0.2); y.num = freeNumber(c.roster); c.roster.push(y); youths.push(y); }
  refreshPool(c);
  return youths;
}
export function fmtLeft(ms: number): string { const s = Math.max(0, Math.ceil(ms / 1000)); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}g ${h}s` : h ? `${h}s ${m}dk` : m ? `${m}dk` : `${s}sn`; }
