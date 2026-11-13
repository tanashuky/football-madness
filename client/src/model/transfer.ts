// Transfer donemi (Kariyer): iki donem (sezon basi 4 hafta, devre arasi 2 hafta), haftalik ilerleme. Islem yalniz donem acikken.
// Alim: istenen fiyati ode, hemen al | teklif gonder (cevap bir sonraki hafta: kabul / ret / karsi teklif).
// Satis: hemen sat (dusuk fiyat) | listeye koy (botlarin teklifi sonraki hafta gelir). Son haftanin cevaplari "kapanis gunu"nde gelir;
// kapanis gununde yeni islem yok, yalniz bekleyen cevaplar sonuclanir. Havuz dinamik: botlar her hafta alir/satar, alinmayan gider, fiyat duser.
import type { Career, Offer, PoolItem, RosterPlayer } from './types.js';
import { addLedger } from './career.js';
import { ROSTER_MAX, fixLineup, freeNumber, genYouths, marketValue, mkPlayer, sell } from './manage.js';
import { bidOnListings, botWeek, botsIncome, ensureBots, moveToBot, round10, takeFromBot, verdict } from './bots.js';

export const FREE_SIZE = 14, WEEKS = { pre: 4, mid: 2 };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
// serbest futbolcular: kulubu olmayanlar. Havuzun geri kalani bot kuluplerin kadrolaridir (simule havuz yok).
function newFree(c: Career): PoolItem {
  const base = Math.round(c.league.teams.reduce((a, t) => a + t.gg, 0) / c.league.teams.length);
  const star = Math.random() < 0.12; // arada bir yildiz serbest kalir
  const p = mkPlayer(c, star ? [base + 5, base + 13] : [base - 12, base + 4], [18, 34], star ? 0.8 : 0.3);
  return { p, price: round10(marketValue(p) * rnd(0.85, 1)), left: 0, fresh: false, club: '' };
}
export function openWindow(c: Career, kind: 'pre' | 'mid') {
  ensureBots(c);
  c.pool = c.pool.filter((it) => !it.club && Math.random() < 0.6); while (c.pool.length < FREE_SIZE) c.pool.push(newFree(c)); // kulup bulamayanlarin bir kismi birakir, yenileri gelir
  c.tw = { open: true, kind, week: 1, weeks: WEEKS[kind], closing: false, offers: [], listings: [], midDone: kind === 'mid' ? true : c.tw ? c.tw.midDone : false };
  botsIncome(c, kind);
  if (kind === 'mid') genYouths(c); // devre arasi genc cikisi
}
// pazar: serbestler + bot kadrolari. ask: hemen alinabilecek fiyat (serbest ya da kulubun satis listesinde); yoksa teklif gerekir
export interface MarketRow { p: RosterPlayer; ti: number; club: string; ask?: number }
const replaceLeft = (c: Career) => c.tw.open && !c.tw.closing && c.tw.weeks - c.tw.week >= 1;
export function market(c: Career): MarketRow[] {
  ensureBots(c); const out: MarketRow[] = c.pool.map((it) => ({ p: it.p, ti: -1, club: '', ask: it.price }));
  c.league.teams.forEach((tm, ti) => { if (tm.me) return; for (const p of tm.roster || []) { const vd = verdict(c, ti, p, true); out.push({ p, ti, club: tm.short, ask: vd.listed && !vd.refuse ? vd.min : undefined }); } });
  return out;
}
export function findMarket(c: Career, id: string): MarketRow | null {
  const it = c.pool.find((x) => x.p.id === id); if (it) return { p: it.p, ti: -1, club: '', ask: it.price };
  for (let ti = 0; ti < c.league.teams.length; ti++) { const tm = c.league.teams[ti]; if (tm.me) continue; const p = (tm.roster || []).find((q) => q.id === id); if (p) { const vd = verdict(c, ti, p, true); return { p, ti, club: tm.short, ask: vd.listed && !vd.refuse ? vd.min : undefined }; } }
  return null;
}
function take(c: Career, m: MarketRow, price: number): boolean {
  let p: RosterPlayer | null = m.p; if (m.ti < 0) c.pool = c.pool.filter((it) => it.p.id !== m.p.id); else p = takeFromBot(c, m.ti, m.p.id, price);
  if (!p) return false; addLedger(c, `buy:${p.name}`, -price); p.num = freeNumber(c.roster); c.roster.push(p); return true;
}
export const canDeal = (c: Career) => c.tw.open && !c.tw.closing;
export function buyNow(c: Career, id: string): 'ok' | 'fm' | 'full' | 'closed' | 'no' {
  if (!canDeal(c)) return 'closed'; const m = findMarket(c, id); if (!m || m.ask === undefined) return 'no';
  if (c.roster.length >= ROSTER_MAX) return 'full'; if (c.fm < m.ask) return 'fm';
  if (!take(c, m, m.ask)) return 'no'; c.tw.offers = c.tw.offers.filter((o) => o.id !== id); return 'ok';
}
export function sendOffer(c: Career, id: string, amount: number): 'ok' | 'closed' | 'no' {
  if (!canDeal(c)) return 'closed'; const m = findMarket(c, id); if (!m) return 'no';
  c.tw.offers = c.tw.offers.filter((o) => o.id !== id); c.tw.offers.push({ id, name: m.p.name, amount: round10(amount), state: 'pending', week: c.tw.week }); return 'ok';
}
export function withdrawOffer(c: Career, id: string) { c.tw.offers = c.tw.offers.filter((o) => o.id !== id); }
// karsi teklifi kabul: kapanis gununde de yapilabilir
export function acceptCounter(c: Career, id: string): 'ok' | 'fm' | 'full' | 'no' {
  const o = c.tw.offers.find((x) => x.id === id && x.state === 'counter'); const m = findMarket(c, id); if (!o || !m || !c.tw.open) return 'no';
  if (c.roster.length >= ROSTER_MAX) return 'full'; if (c.fm < o.counter!) return 'fm';
  if (!take(c, m, o.counter!)) return 'no'; o.state = 'accepted'; return 'ok';
}
// satis listesi
export function listPlayer(c: Career, id: string, ask: number): 'ok' | 'closed' | 'no' {
  if (!canDeal(c)) return 'closed'; const p = c.roster.find((x) => x.id === id); if (!p) return 'no';
  c.tw.listings = c.tw.listings.filter((l) => l.id !== id); c.tw.listings.push({ id, ask: round10(ask), offer: null }); return 'ok';
}
export function unlist(c: Career, id: string) { c.tw.listings = c.tw.listings.filter((l) => l.id !== id); }
export function quickSell(c: Career, id: string) { if (!canDeal(c)) return 'closed' as const; const p = c.roster.find((x) => x.id === id); const r = sell(c, id); if (r === 'ok') { unlist(c, id); if (p) c.pool.push({ p, price: round10(marketValue(p) * 0.9), left: 0, fresh: false, club: '' }); } return r; }
export function acceptBid(c: Career, id: string): 'ok' | 'min' | 'gk' | 'no' {
  const l = c.tw.listings.find((x) => x.id === id); if (!l || !l.offer || !c.tw.open) return 'no'; const p = c.roster.find((x) => x.id === id); const o = l.offer;
  const r = sell(c, id, o.amount); if (r === 'ok') { if (p && o.ti !== undefined && c.league.teams[o.ti]) { const tm = c.league.teams[o.ti]; tm.fm = (tm.fm || 0) - o.amount; moveToBot(c, o.ti, p); } c.news.unshift(`buy|${o.club}|${o.name}|${o.gg}`); unlist(c, id); } return r;
}
export function declineBid(c: Career, id: string) { const l = c.tw.listings.find((x) => x.id === id); if (!l) return; if (l.ask > 0) l.offer = null; else unlist(c, id); }
// haftanin cevaplari: tekliflerime kulupler kendi cikarlarina gore cevap verir; kabul edilmeyen bot teklifleri duser
function resolve(c: Career) {
  const tw = c.tw; const canReplace = tw.weeks - tw.week >= 1 && !tw.closing; // cevaptan sonra satici yerine adam alabilir mi
  for (const o of tw.offers) {
    if (o.state === 'counter') { o.state = 'rejected'; o.why = 'low'; continue; } // cevaplanmayan karsi teklif duser
    if (o.state !== 'pending') continue;
    const m = findMarket(c, o.id); if (!m) { o.state = 'gone'; continue; }
    let min: number;
    if (m.ti < 0) min = round10(m.ask! * 0.9); // serbest futbolcu: imza parasi
    else { const vd = verdict(c, m.ti, m.p, canReplace); if (vd.refuse) { o.state = 'rejected'; o.why = vd.refuse; continue; } min = vd.min; }
    if (o.amount >= min) { if (c.fm >= o.amount && c.roster.length < ROSTER_MAX && take(c, m, o.amount)) o.state = 'accepted'; else o.state = 'failed'; }
    else if (o.amount >= min * 0.8) { o.state = 'counter'; o.counter = min; }
    else { o.state = 'rejected'; o.why = 'low'; }
  }
  // gecen haftanin bot teklifleri: listedeki futbolcuda istenen fiyat karsilandiysa satis tamamlanir, digerleri duser
  for (const l of [...tw.listings]) { if (!c.roster.some((x) => x.id === l.id)) { unlist(c, l.id); continue; } if (l.offer && l.ask > 0 && l.offer.amount >= l.ask) { acceptBid(c, l.id); continue; } if (l.ask > 0) l.offer = null; else unlist(c, l.id); }
}
const awaiting = (c: Career) => c.tw.offers.some((o) => o.state === 'counter') || c.tw.listings.some((l) => !!l.offer);
// "Sonraki hafta": cevaplar gelir, botlar hareket eder; son haftadan sonra kapanis gunu; kapanis gununden sonra donem biter
export function nextWeek(c: Career): 'week' | 'closing' | 'closed' {
  const tw = c.tw; if (!tw.open) return 'closed';
  if (tw.closing) { closeWindow(c); return 'closed'; }
  resolve(c);
  if (tw.week >= tw.weeks) { bidOnListings(c); tw.closing = true; if (!awaiting(c)) { closeWindow(c); return 'closed'; } return 'closing'; }
  botWeek(c, tw.weeks - tw.week >= 2); bidOnListings(c); tw.week++; return 'week';
}
// "Donemi kapat": kalan haftalar atlanir; bekleyen cevap varsa kapanis gunu, yoksa dogrudan biter
export function skipWindow(c: Career): 'closing' | 'closed' {
  const tw = c.tw; if (!tw.open) return 'closed'; if (tw.closing) { closeWindow(c); return 'closed'; }
  resolve(c); for (let w = tw.week; w < tw.weeks; w++) botWeek(c, tw.weeks - w >= 2); tw.week = tw.weeks; tw.closing = true; if (!awaiting(c)) { closeWindow(c); return 'closed'; } return 'closing';
}
function closeWindow(c: Career) {
  const tw = c.tw; tw.open = false; tw.closing = false; tw.offers = []; tw.listings = [];
  for (const p of c.roster) delete p.reg; // donem kapanirken kadrodaki herkes kupaya yazilir
  fixLineup(c);
}
// altyapidan kadroya: her zaman; donem disinda alinirsa bir sonraki doneme kadar kupada oynayamaz
export function promoteYouth(c: Career, id: string): boolean {
  const i = c.youth.findIndex((p) => p.id === id); if (i < 0 || c.roster.length >= ROSTER_MAX) return false;
  const p = c.youth[i]; c.youth.splice(i, 1); if (!c.tw.open) p.reg = false; p.num = freeNumber(c.roster); c.roster.push(p); return true;
}
export const offerOf = (c: Career, id: string): Offer | undefined => c.tw.offers.find((o) => o.id === id);
