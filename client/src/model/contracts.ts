// Sozlesme, serbest kalma maddesi, kiralama ve satin alma opsiyonu; menajerin (ekip) karar listesi.
// Sozlesme: 1-5 sezon; biten sozlesme sezon sonunda futbolcuyu serbest birakir. Uzatma her zaman yapilabilir.
// Madde: bu tutari odeyen kulup, sahibi istemese de futbolcuyu alir (yalniz transfer doneminde).
// Kiralama: sure (sezon sonu / +1 / +2 sezon), maas paylasimi, istege bagli satin alma opsiyonu (kiralayan, sure bitmeden ya da bittiginde o tutara alir).
import { FORM_POS } from '../engine.js';
import type { Career, LoanTerms, RosterPlayer } from './types.js';
import { addLedger } from './career.js';
import { ROSTER_MAX, ROSTER_MIN, freeNumber, marketValue, wageFor } from './manage.js';
import { BOT_KEEP, moveToBot, refreshGG, round10, severance, verdict, wages } from './bots.js';

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 1000; };
const clean = (c: Career, id: string) => { if (c.team.lineup) c.team.lineup = c.team.lineup.filter((x) => x !== id); if (c.team.duties) delete c.team.duties[id]; if (c.team.rotations) c.team.rotations = c.team.rotations.map((r) => r.filter((x) => x !== id)).filter((r) => r.length >= 2); c.tw.listings = c.tw.listings.filter((l) => l.id !== id); };
const note = (c: Career, kind: string, club: string, p: RosterPlayer) => { c.news.unshift(`${kind}|${club}|${p.name}|${Math.round(p.gg)}`); if (c.news.length > 8) c.news.length = 8; };
export const defaultYears = (p: RosterPlayer) => (p.age >= 33 ? 1 : p.age >= 30 ? 2 : 3);
// eksik sozlesmeler (eski kayit, yeni uretilen futbolcu): 1-3 sezon; bot yildizlarinin bir kisminda serbest kalma maddesi
export function ensureContracts(c: Career) {
  const s = c.league.season;
  for (const p of c.roster) if (!p.end && !p.loan) p.end = s + 1 + (hash(p.id) % 3);
  for (const it of c.pool) delete it.p.end;
  for (const y of c.youth) delete y.end;
  c.league.teams.forEach((tm) => { if (tm.me || !tm.roster) return; const top = [...tm.roster].sort((a, b) => b.gg - a.gg);
    for (const p of tm.roster) if (!p.end && !p.loan) { p.end = s + 1 + (hash(p.id) % 3); if (top.indexOf(p) < 6 && hash(p.id + 'c') % 2 === 0) p.clause = round10(marketValue(p) * (1.6 + (hash(p.id + 'k') % 15) / 10)); } });
}
// imza: sure ve madde secilebilir; dusuk madde maasi dusurur (1,5x: %10, 2x: %5), maddesiz %5 pahali
export const clauseWage = (k: number) => (k === 1.5 ? 0.9 : k === 2 ? 0.95 : k === 0 ? 1.05 : 1);
export function sign(c: Career, p: RosterPlayer, years = defaultYears(p), clauseK?: number) { p.end = c.league.season + Math.max(1, Math.min(maxYears(p), years)) - 1; delete p.loan; if (clauseK !== undefined) { p.wage = Math.max(1, Math.round((p.wage || wageFor(p.gg)) * clauseWage(clauseK) * (1 - 0.03 * (c.staff.manager || 0)))); if (clauseK > 0) p.clause = round10(marketValue(p) * clauseK); else delete p.clause; } }
// yildiz oyuncu maddesiz sozlesmeyi kabul etmez: madde talep eder
export const wantsClause = (c: Career, p: RosterPlayer) => p.gg >= c.roster.reduce((a, q) => a + q.gg, 0) / Math.max(1, c.roster.length) + 4;
// sozlesmesi bitmeyen oyuncuyu serbest birakmak: kalan maasi odenir
export function releasePlayer(c: Career, id: string): 'ok' | 'fm' | 'min' | 'no' {
  const p = c.roster.find((x) => x.id === id); if (!p || p.loan) return 'no'; if (c.roster.length <= ROSTER_MIN) return 'min'; const fee = severance(c, p); if (c.fm < fee) return 'fm';
  c.roster.splice(c.roster.indexOf(p), 1); clean(c, id); if (fee) addLedger(c, `release:${p.name}`, -fee); delete p.end; delete p.clause; delete p.coach; c.pool.push({ p, price: round10(marketValue(p) * 0.9), left: 0, fresh: false, club: '' }); return 'ok';
}
// uzatma: futbolcu guncel gucune gore maas ister (30 yas ustu %15, digerleri %5 zam); menajer seviyesi basina %3 indirim.
// madde: dusuk madde kabul edersen maas talebi duser (1,5x: %10, 2x: %5), maddesiz sozlesme %5 pahali
export const CLAUSES = [0, 1.5, 2, 3];
export function renewDemand(c: Career, p: RosterPlayer, clauseK: number): number {
  const k = (p.age >= 30 ? 1.15 : 1.05) * (1 - 0.03 * (c.staff.manager || 0)) * (clauseK === 1.5 ? 0.9 : clauseK === 2 ? 0.95 : clauseK === 0 ? 1.05 : 1);
  return Math.max(p.wage || 0, Math.round(wageFor(p.gg) * k));
}
export const maxYears = (p: RosterPlayer) => (p.age >= 34 ? 1 : p.age >= 31 ? 2 : 5);
export function renew(c: Career, id: string, years: number, clauseK: number): boolean {
  const p = c.roster.find((x) => x.id === id); if (!p || p.loan) return false; years = Math.max(1, Math.min(maxYears(p), Math.round(years)));
  p.wage = renewDemand(c, p, clauseK); p.end = c.league.season + years - 1; if (clauseK > 0) p.clause = round10(marketValue(p) * clauseK); else delete p.clause; return true;
}
export const expiring = (c: Career) => c.roster.filter((p) => !p.loan && p.end !== undefined && p.end <= c.league.season);
const starters = (c: Career) => new Set(c.team.lineup || []);
// menajerin onerisi: ilk 11'de ya da gelecegi olan oyuncuyu uzat, digerini birak
export const adviseRenew = (c: Career, p: RosterPlayer) => starters(c).has(p.id) || p.age <= 24 || p.gg >= c.roster.reduce((a, q) => a + q.gg, 0) / Math.max(1, c.roster.length);
export const adviseOption = (c: Career, p: RosterPlayer) => !!p.loan && !!p.loan.opt && p.loan.opt <= marketValue(p) * 1.1 && c.fm >= p.loan.opt;

// ---------- serbest kalma maddesi ----------
export function payClause(c: Career, ti: number, id: string): 'ok' | 'fm' | 'full' | 'closed' | 'no' {
  if (!c.tw.open || c.tw.closing) return 'closed'; const tm = c.league.teams[ti]; const p = tm && tm.roster ? tm.roster.find((x) => x.id === id) : undefined; if (!p || !p.clause || p.loan) return 'no';
  if (c.roster.length >= ROSTER_MAX) return 'full'; if (c.fm < p.clause) return 'fm';
  const fee = p.clause; tm.roster!.splice(tm.roster!.indexOf(p), 1); tm.fm = (tm.fm || 0) + fee; tm.tb = (tm.tb || 0) + fee * 0.7; refreshGG(tm);
  addLedger(c, `clause:${p.name}`, -fee); delete p.clause; p.num = freeNumber(c.roster); sign(c, p); c.roster.push(p); c.tw.offers = c.tw.offers.filter((o) => o.id !== id); return 'ok';
}

// ---------- kiralama ----------
export const LOAN_FEES = [0, 5, 10, 15, 20]; // deger yuzdesi (sezon basina)
export const loanFee = (p: RosterPlayer, pct: number, years: number) => round10((marketValue(p) * pct * (years + 1)) / 100 / 1.5);
// bot kulup kiralik verir mi: ilk 11 oyuncusunu vermez; kadrosu daralmamali; ucret, maas payi ve opsiyon kendi cikarina uymali
export function loanVerdict(c: Career, ti: number, p: RosterPlayer, fee: number, terms: LoanTerms): { ok: boolean; why?: string } {
  const tm = c.league.teams[ti]; const vd = verdict(c, ti, p, true); if (p.loan) return { ok: false, why: 'loan' };
  if (vd.starter) return { ok: false, why: 'starter' }; if (tm.roster!.length <= BOT_KEEP) return { ok: false, why: 'min' };
  const young = p.age <= 23; const v = marketValue(p);
  if (terms.opt !== undefined && !vd.unwanted && terms.opt < Math.max(vd.min, v) * (young ? 1.3 : 1.05)) return { ok: false, why: 'opt' };
  // genc oyuncu oynasin diye, istenmeyen oyuncu maastan kurtulmak icin ucuz verilir
  const wantFee = vd.unwanted ? 0 : v * (young ? 0.03 : 0.07) * (terms.years + 1) + ((p.wage || 0) * (100 - terms.share) / 100) * 14 * (terms.years + 1) * (young ? 0.5 : 1);
  return fee >= round10(wantFee) ? { ok: true } : { ok: false, why: 'low' };
}
export function loanIn(c: Career, ti: number, id: string, fee: number, terms: LoanTerms): boolean {
  const tm = c.league.teams[ti]; const p = tm.roster!.find((x) => x.id === id); if (!p || c.roster.length >= ROSTER_MAX || c.fm < fee) return false;
  tm.roster!.splice(tm.roster!.indexOf(p), 1); tm.fm = (tm.fm || 0) + fee; refreshGG(tm); if (fee) addLedger(c, `loanfee:${p.name}`, -fee);
  p.loan = { from: ti, until: c.league.season + terms.years, share: terms.share, opt: terms.opt }; p.num = freeNumber(c.roster); p.fatigue = 20; c.roster.push(p); return true;
}
// kiraya verdigim futbolcuya bot teklifi: mac kadrosuna girecekse ister; opsiyonu ancak makulse kabul eder
export function loanBids(c: Career) {
  for (const ls of c.tw.listings) { if (!ls.loan || ls.offer) continue; const p = c.roster.find((x) => x.id === ls.id); if (!p || p.loan) continue; let best: { ti: number; fee: number } | null = null;
    c.league.teams.forEach((tm, ti) => { if (tm.me || !tm.roster || tm.roster.length >= ROSTER_MAX) return;
      const same = tm.roster.filter((q) => q.natPos === p.natPos).sort((a, b) => b.gg - a.gg); const need = FORM_POS[tm.formation].filter((x) => x === p.natPos).length; if (!need) return;
      const ref = same[Math.min(same.length, need + 1) - 1]; if (ref && p.gg < ref.gg - 1) return; // kulubede bile yer bulamaz
      const myWage = ((p.wage || 0) * ls.loan!.share) / 100; if (myWage > 22 * wageFor(tm.gg + 5) - wages(tm)) return;
      if (ls.loan!.opt !== undefined && ls.loan!.opt > marketValue(p) * 1.5) return;
      const gain = Math.max(0, p.gg - (same[need - 1] ? same[need - 1].gg : tm.gg - 8)); const fee = Math.min(Math.max(0, tm.tb || 0), round10(marketValue(p) * (0.04 + 0.01 * Math.min(8, gain)) * (ls.loan!.years + 1)));
      if (!best || fee > best.fee) best = { ti, fee }; });
    const b = best as { ti: number; fee: number } | null; if (!b || b.fee < ls.ask) continue;
    ls.offer = { club: c.league.teams[b.ti].short, amount: Math.max(ls.ask, b.fee), name: p.name, gg: Math.round(p.gg), ti: b.ti };
  }
}
export function loanOut(c: Career, id: string): 'ok' | 'min' | 'no' {
  const ls = c.tw.listings.find((x) => x.id === id); const p = c.roster.find((x) => x.id === id); if (!ls || !ls.loan || !ls.offer || !p || ls.offer.ti === undefined) return 'no';
  if (c.roster.length <= ROSTER_MIN) return 'min'; const ti = ls.offer.ti; const tm = c.league.teams[ti];
  c.roster.splice(c.roster.indexOf(p), 1); clean(c, id); if (ls.offer.amount) addLedger(c, `loanout:${p.name}`, ls.offer.amount); tm.fm = (tm.fm || 0) - ls.offer.amount; tm.tb = Math.max(0, (tm.tb || 0) - ls.offer.amount);
  p.loan = { from: 0, until: c.league.season + ls.loan.years, share: ls.loan.share, opt: ls.loan.opt }; moveToBot(c, ti, p); note(c, 'loan', tm.short, p); return 'ok';
}
// kiraya verdiklerim (bot kadrolarinda)
export const loanedOut = (c: Career) => c.league.teams.flatMap((tm, ti) => (tm.me ? [] : (tm.roster || []).filter((p) => p.loan && p.loan.from === 0).map((p) => ({ p, ti, club: tm.short }))));
// opsiyon: kiralayan kulup sure bitmeden ya da bittiginde anlasilan tutara alir
export function exerciseOption(c: Career, id: string): 'ok' | 'fm' | 'no' {
  const p = c.roster.find((x) => x.id === id); if (!p || !p.loan || !p.loan.opt) return 'no'; if (c.fm < p.loan.opt) return 'fm';
  const tm = c.league.teams[p.loan.from]; addLedger(c, `option:${p.name}`, -p.loan.opt); if (tm && !tm.me) { tm.fm = (tm.fm || 0) + p.loan.opt; } sign(c, p); return 'ok';
}
// sezon sonu: suresi dolan kiraliklar doner (bot opsiyonunu kendi cikarina gore kullanir), biten sozlesmeler serbest kalir.
// Menajer varsa karar verilmemis isleri kendi onerisine gore sonuclandirir.
export function seasonEndContracts(c: Career): string[] {
  ensureContracts(c); const s = c.league.season; const out: string[] = []; const mgr = (c.staff.manager || 0) > 0;
  for (const p of [...c.roster]) { if (!p.loan || p.loan.until > s) continue;
    if (mgr && adviseOption(c, p) && exerciseOption(c, p.id) === 'ok') { out.push(`opt|${p.name}`); continue; }
    const tm = c.league.teams[p.loan.from]; c.roster.splice(c.roster.indexOf(p), 1); clean(c, p.id); delete p.loan; delete p.coach; if (tm && tm.roster) { p.num = freeNumber(tm.roster); tm.roster.push(p); refreshGG(tm); } out.push(`back|${p.name}`); }
  c.league.teams.forEach((tm, ti) => { if (tm.me || !tm.roster) return; for (const p of [...tm.roster]) { if (!p.loan || p.loan.from !== 0 || p.loan.until > s) continue;
    const opt = p.loan.opt; const keeps = opt !== undefined && (tm.fm || 0) >= opt && opt <= marketValue(p) * 1.25 && p.gg >= tm.gg - 2;
    if (keeps) { tm.fm = (tm.fm || 0) - opt!; addLedger(c, `optsold:${p.name}`, opt!); delete p.loan; p.end = s + 3; note(c, 'buy', tm.short, p); out.push(`optsold|${p.name}`); continue; }
    tm.roster.splice(tm.roster.indexOf(p), 1); refreshGG(tm);
    delete p.loan; if (p.age <= 23) p.gg = Math.min(99, Math.round((p.gg + 0.8) * 100) / 100); /* kirada oynadi: ek gelisim */ p.num = freeNumber(c.roster); p.fatigue = 20; c.roster.push(p); out.push(`home|${p.name}`); } });
  // botlarin birbirinden kiraladiklari sahibine doner
  c.league.teams.forEach((tm) => { if (tm.me || !tm.roster) return; for (const p of [...tm.roster]) { if (!p.loan || p.loan.from === 0 || p.loan.until > s) continue; const own = c.league.teams[p.loan.from]; tm.roster.splice(tm.roster.indexOf(p), 1); refreshGG(tm); delete p.loan; if (own && own.roster) { p.num = freeNumber(own.roster); own.roster.push(p); refreshGG(own); } } });
  // biten sozlesmeler
  for (const p of expiring(c)) { if (mgr && adviseRenew(c, p)) { renew(c, p.id, Math.min(2, maxYears(p)), p.clause ? 3 : 0); out.push(`renewed|${p.name}`); continue; }
    if (c.roster.length <= ROSTER_MIN) { p.end = s + 1; out.push(`renewed|${p.name}`); continue; } // 11'in altina dusmemek icin bir sezon uzar
    c.roster.splice(c.roster.indexOf(p), 1); clean(c, p.id); delete p.end; delete p.clause; delete p.coach; c.pool.push({ p, price: round10(marketValue(p) * 0.9), left: 0, fresh: false, club: '' }); out.push(`left|${p.name}`); }
  c.league.teams.forEach((tm, ti) => { if (tm.me || !tm.roster) return; for (const p of [...tm.roster]) { if (p.loan || p.end === undefined || p.end > s) continue;
    const vd = verdict(c, ti, p, true); if (!vd.unwanted || tm.roster.length <= BOT_KEEP) { p.end = s + 1 + (hash(p.id + s) % 3); p.wage = Math.max(p.wage || 0, wageFor(p.gg)); if (p.clause) p.clause = round10(marketValue(p) * 2); }
    else { tm.roster.splice(tm.roster.indexOf(p), 1); delete p.end; delete p.clause; c.pool.push({ p, price: round10(marketValue(p) * 0.9), left: 0, fresh: false, club: '' }); note(c, 'free', tm.short, p); refreshGG(tm); } } });
  return out;
}
// karar listesi (Kulup sekmesi): biten sozlesmeler, opsiyonu olan kiraliklar. Menajer varsa oneriyle gelir
export interface Decision { kind: 'renew' | 'option' | 'back'; p: RosterPlayer; advise: boolean }
export function decisions(c: Career): Decision[] {
  const s = c.league.season; const out: Decision[] = [];
  for (const p of expiring(c)) out.push({ kind: 'renew', p, advise: adviseRenew(c, p) });
  for (const p of c.roster) if (p.loan && p.loan.until <= s) out.push({ kind: p.loan.opt ? 'option' : 'back', p, advise: adviseOption(c, p) });
  return out;
}
