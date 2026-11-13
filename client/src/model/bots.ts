// Bot kulupler: gercek kadro, kasa, tesis, ekip, bilet ve karakter. Kullaniciyla ayni ekonomi: mac primi, bilet, sponsor, sezon odulu;
// futbolcu ve ekip maasi, altyapi bakimi. Her bot kendi kadrosuna ve hedefine bakarak karar verir; sabit kota ya da sabit esik yok.
// Karakter (satici / dengeli / hirsli) hedefe, lig sirasina ve kasaya gore sezon icinde de degisir.
import { DOCTRINES, FORM_POS, NAMES_B, type TeamIn } from '../engine.js';
import type { Career, Club, LeagueTeam, RosterPlayer } from './types.js';
import { defaultLineup, mkSquad, newTeamSetup, userTeamIn } from './club.js';
import { botBrain } from './templates.js';
import { sell } from './manage.js';
import { ACADEMY, ROSTER_MAX, STADIUM_CAP, STADIUM_COST, TICKET_BASE, TICKET_STEPS, freeNumber, marketValue, mkPlayer, overpaid, prizeFor, staffWage, wageFor } from './manage.js';
import { CAREER_K, form, order } from './career.js';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const round10 = (v: number) => Math.round(v / 10) * 10;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const cost = (fm: number) => Math.round(fm * CAREER_K.cost);
// kararlar hafta icinde sabit kalsin diye kimlikten turetilen gurultu (0..1)
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
const xi = (tm: LeagueTeam, roster = tm.roster!) => { const slots = FORM_POS[tm.formation]; const by = Object.fromEntries(roster.map((p) => [p.id, p])); return defaultLineup(roster, slots).map((id, i) => ({ p: by[id], slot: slots[i] })).filter((x) => x.p); };
// ilk 11 gucu: mevkisinde oynamayan -6 sayilir
const xiSum = (tm: LeagueTeam, roster = tm.roster!) => xi(tm, roster).reduce((a, x) => a + x.p.gg - (x.p.natPos === x.slot ? 0 : 6), 0) - (11 - Math.min(11, roster.length)) * 40;
export function refreshGG(tm: LeagueTeam) { if (tm.roster && tm.roster.length >= 11) tm.gg = Math.round(xi(tm).reduce((a, x) => a + x.p.gg, 0) / 11); }
export const wages = (tm: LeagueTeam) => (tm.roster || []).reduce((a, p) => a + Math.round(((p.wage || 0) * (p.loan ? p.loan.share : 100)) / 100), 0);
export const BOT_KEEP = 18; // bot kendi tercihiyle mac kadrosunun altina inmez (kural siniri 11)
const wageCap = (tm: LeagueTeam) => 22 * wageFor(tm.gg + 5);
// haftalik gider: futbolcu maasi + ekip (3 birim) + altyapi bakimi
export const weeklyCost = (tm: LeagueTeam) => wages(tm) + 3 * staffWage(tm.staffLv || 0) + (tm.acad ? cost(ACADEMY[tm.acad]!.upkeep) : 0);

export function ensureBots(c: Career) {
  c.league.teams.forEach((tm, i) => {
    if (tm.me) return;
    if (!tm.roster || tm.roster.length < 11) {
      const base = clamp(tm.gg + (c.diff - 3) * 2, 35, 95); const sq = mkSquad({ ...tm }, base, NAMES_B);
      tm.roster = [...sq.players, ...(sq.bench || [])].map((p: any) => { const q = mkPlayer(c, [p.gg, p.gg], [p.age, p.age], 0.3, false, p.pos); q.num = p.num; q.fatigue = 20; return q; });
      while (tm.roster.length < 20) { const q = mkPlayer(c, [base - 7, base], [18, 30], 0.25); q.num = freeNumber(tm.roster); q.fatigue = 20; tm.roster.push(q); }
      tm.fm = Math.round(2000 * CAREER_K.income); refreshGG(tm);
    }
    if (tm.stad === undefined) { tm.stad = 1; tm.acad = 0; tm.staffLv = 0; tm.ticket = 1; tm.tm = 52; tm.tb = 0; tm.style = tm.style || (['seller', 'balanced', 'ambitious'] as const)[(tm.short.charCodeAt(1) + i) % 3]; }
  });
  if (c.league.teams.some((t) => !t.me && !t.goal)) setGoals(c);
}
// sezon hedefi: kadro gucune gore (ilk ceyrek sampiyonluk, ust yari ust sira, sonra orta sira / ligde kalma)
export function setGoals(c: Career) {
  const bots = c.league.teams.filter((t) => !t.me); const sorted = [...bots].sort((a, b) => b.gg - a.gg);
  sorted.forEach((tm, r) => { const q = r / Math.max(1, sorted.length); tm.goal = q < 0.25 ? 'title' : q < 0.5 ? 'top' : q < 0.8 ? 'mid' : 'stay'; });
}
// bot lig takimi -> motor girdisi (kendi kadrosundan en iyi 11; ekip seviyesi taktik ve fizige yansir)
export function botLeagueTeamIn(c: Career, idx: number): TeamIn {
  ensureBots(c); const tm = c.league.teams[idx];
  if (tm.me) return userTeamIn({ name: tm.name, short: tm.short, color: tm.color, color2: tm.color2, gg: tm.gg } as Club, c.roster, c.team, c.metrics, 7); // atlanan haftada kendi takimim
  const tt = { ...newTeamSetup(), formation: tm.formation, doctrine: tm.doctrine, tactic: { ...(DOCTRINES[tm.doctrine].tactic as any) } };
  const t = botBrain(userTeamIn({ name: tm.name, short: tm.short, color: tm.color, color2: tm.color2, gg: tm.gg } as Club, tm.roster!, tt, undefined, 7), tm.doctrine, c.diff);
  const lv = tm.staffLv || 0; t.T = (t.T || 60) + 2 * lv; t.F = (t.F || 60) + 2 * lv; t.M = clamp(60 + ((tm.tm || 50) - 50) * 0.4, 50, 85);
  return t;
}

export type Why = 'only' | 'key' | 'star' | 'min' | 'low' | 'loan' | 'starter' | 'opt';
// min: kulubun birakacagi en dusuk fiyat (alt limit); ask: istenen fiyat (ust limit; yoksa "satilik degil", yalniz teklifle)
export interface Verdict { min: number; ask?: number; refuse?: Why; listed: boolean; starter: boolean; unwanted?: boolean }
// kulubun bu futbolcu icin karari. canReplace: cevap verildikten sonra yerine adam alacak hafta kaldi mi
export function verdict(c: Career, ti: number, p: RosterPlayer, canReplace: boolean): Verdict {
  const tm = c.league.teams[ti], roster = tm.roster!, l = c.league; const v = marketValue(p);
  const need = FORM_POS[tm.formation].filter((s) => s === p.natPos).length;
  const same = roster.filter((q) => q.natPos === p.natPos).sort((a, b) => b.gg - a.gg); const have = same.length; const starter = same.indexOf(p) < need;
  const star = [...roster].sort((a, b) => b.gg - a.gg).indexOf(p) < 2 && p.gg >= tm.gg + 3;
  const f = form(l, ti); const goodForm = f.length >= 3 && f.reduce((a, r) => a + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / f.length >= 2;
  let drop = starter ? Math.max(0, xiSum(tm) - xiSum(tm, roster.filter((q) => q !== p))) : 0; if (have <= need) drop += 8; // yedegi yok
  const out = (refuse: Why): Verdict => ({ min: Infinity, refuse, listed: false, starter });
  const h = hash(`${p.id}:${l.season}:${c.tw.kind}:${c.tw.week}`);
  if (p.loan) return out('loan'); // kiralik oyuncu el degistirmez
  if (roster.length <= 16 || (roster.length <= BOT_KEEP && !canReplace)) return out('min'); // mac kadrosunun altina ancak yerine adam alabilecekse iner
  // kulubun kurtulmak istedigi oyuncu: bedelsiz bile birakir
  const broke = (tm.fm || 0) < 0 && (p.wage || 0) > wageFor(tm.gg);
  if (!starter && ((overpaid(p) && p.age >= 30) || p.age >= 33 || (same.indexOf(p) >= need + 2 && p.gg < tm.gg - 6) || broke)) return { min: 0, ask: round10(v * (0.3 + 0.2 * h)), listed: true, starter, unwanted: true };
  if (!canReplace && have <= Math.max(need, p.natPos === 'GK' ? 2 : 1)) return out('only');
  if (!canReplace && drop >= 8) return out('key');
  if (star && goodForm && (tm.style === 'ambitious' || !canReplace)) return out('star');
  const e = [0.2, 0.15, 0.1, 0.06, 0.03][clamp(c.diff, 1, 5) - 1]; // kolayda bot daha hatali fiyat bicer
  const noise = 1 + (h * 2 - 1) * e - (3 - c.diff) * 0.03;
  const listed = !starter && (have > need + 1 || p.age >= 32 || roster.length > 22);
  if (listed) return { min: round10(v * 0.65 * noise), ask: round10(v * 0.9), listed, starter }; // fazlalik yedek
  let k = 1 + drop * (canReplace ? 0.06 : 0.12);
  if (star) k *= goodForm ? 1.6 : 1.35;
  if (!starter) { if (p.age >= 31) k *= 0.8; if (overpaid(p)) k *= 0.85; }
  k *= tm.style === 'seller' ? 0.9 : tm.style === 'ambitious' ? 1.12 : 1;
  if ((tm.fm || 0) < weeklyCost(tm) * 4) k *= 0.85; // kasa dar: paraya ihtiyac var
  k *= noise; if (starter) k = Math.max(k, 1.1); // ilk 11 oyuncusu piyasa degerinin altina gitmez
  const min = round10(v * k);
  return { min, ask: star || have <= need ? undefined : round10(min * 1.27), listed, starter };
}
export function moveToBot(c: Career, ti: number, p: RosterPlayer) { const tm = c.league.teams[ti]; p.num = freeNumber(tm.roster!); p.fatigue = 20; delete p.reg; delete p.coach; delete p.inj; delete p.susp; delete p.suspCup; tm.roster!.push(p); refreshGG(tm); }
// satis geliri kasaya girer; karaktere gore bir kismi ayni donemde transfere ayrilir
const REINVEST = { seller: 0.4, balanced: 0.7, ambitious: 0.9 };
export function takeFromBot(c: Career, ti: number, id: string, price: number): RosterPlayer | null { const tm = c.league.teams[ti]; const i = tm.roster!.findIndex((q) => q.id === id); if (i < 0) return null; const [p] = tm.roster!.splice(i, 1); tm.fm = (tm.fm || 0) + price; tm.tb = (tm.tb || 0) + price * REINVEST[tm.style || 'balanced']; refreshGG(tm); return p; }
const freeItem = (p: RosterPlayer) => ({ p, price: round10(marketValue(p) * rnd(0.85, 1)), left: 0, fresh: false, club: '' });
const news = (c: Career, kind: string, club: string, p: RosterPlayer) => { c.news.unshift(`${kind}|${club}|${p.name}|${Math.round(p.gg)}`); if (c.news.length > 8) c.news.length = 8; };
const spend = (tm: LeagueTeam, fm: number) => { tm.fm = (tm.fm || 0) - fm; tm.tb = Math.max(0, (tm.tb || 0) - fm); };
// sozlesmesi bitmeyen oyuncuyu birakmak: kalan maasi odenir
export const severance = (c: Career, p: RosterPlayer) => p.loan ? 0 : Math.round(((p.wage || 0)) * ((c.league.fixtures.length - c.league.week) + Math.max(0, (p.end ?? c.league.season) - c.league.season) * c.league.fixtures.length));
function release(c: Career, tm: LeagueTeam, p: RosterPlayer) { tm.fm = (tm.fm || 0) - severance(c, p); delete p.end; delete p.clause; tm.roster!.splice(tm.roster!.indexOf(p), 1); c.pool.push(freeItem(p)); news(c, 'free', tm.short, p); refreshGG(tm); }

// botlarin haftasi: fazlaligi birakir; en zayif ya da yedeksiz mevkisine gore, transfer butcesi ve maas dengesi icinde alir ya da hic almaz
export function botWeek(c: Career, canReplaceAfter: boolean) {
  ensureBots(c); const l = c.league; const idx = l.teams.map((_, i) => i).filter((i) => !l.teams[i].me).sort(() => Math.random() - 0.5);
  const smart = clamp(c.diff, 1, 5);
  for (const bi of idx) {
    const tm = l.teams[bi], roster = tm.roster!;
    // 25 siniri ve maas butcesi: asilirsa en zayif yedek serbest kalir. Donemin son haftasinda alici bulamayan istenmeyen oyuncu da birakilir
    while (roster.length > ROSTER_MAX || (wages(tm) > wageCap(tm) && roster.length > BOT_KEEP)) { const st = new Set(xi(tm).map((x) => x.p.id)); const sp = roster.filter((q) => !st.has(q.id) && !q.loan && (q.natPos !== 'GK' || roster.filter((g) => g.natPos === 'GK').length > 2)).sort((a, b) => a.gg - b.gg)[0]; if (!sp) break; release(c, tm, sp); }
    if (!canReplaceAfter) for (const p of [...roster]) { if (roster.length <= BOT_KEEP) break; if (verdict(c, bi, p, true).unwanted && severance(c, p) <= Math.max(0, tm.fm || 0) * 0.3) release(c, tm, p); } // kalan maasini odeyebiliyorsa birakir
    if (roster.length >= ROSTER_MAX) continue;
    const line = xi(tm); if (!line.length) continue;
    const weak = [...line].sort((a, b) => (a.p.gg - (a.p.natPos === a.slot ? 0 : 6)) - (b.p.gg - (b.p.natPos === b.slot ? 0 : 6)))[0];
    let pos = weak.slot, cur = weak.p.gg - (weak.p.natPos === weak.slot ? 0 : 6);
    // derinlik: yedegi olmayan mevki varsa once o kapatilir
    const thin = roster.length < 22 ? [...new Set(FORM_POS[tm.formation])].find((s) => roster.filter((q) => q.natPos === s).length <= FORM_POS[tm.formation].filter((x) => x === s).length) : undefined;
    // gercek ihtiyac: yedeksiz mevki ya da takim ortalamasinin belirgin altinda kalan ilk 11 oyuncusu (hirsli kulup daha titizdir). Yoksa pazara girmez
    if (thin && cur >= tm.gg - 3) { pos = thin; cur = tm.gg - 12; }
    else if (tm.gg - cur < (tm.style === 'ambitious' ? 2 : tm.style === 'seller' ? 6 : 4)) continue;
    const budget = Math.max(0, Math.min(tm.tb || 0, tm.fm || 0)); const room = wageCap(tm) - wages(tm);
    const maxAge = tm.style === 'seller' ? 24 : tm.style === 'ambitious' ? 33 : 30; // satici genc ve gelisecek oyuncuya, hirsli hazir oyuncuya bakar
    type Cand = { p: RosterPlayer; from: number; price: number }; const cands: Cand[] = [];
    const want = (p: RosterPlayer) => !p.loan && p.natPos === pos && p.gg >= cur + 3 && p.age <= maxAge && (p.wage || 0) <= room && marketValue(p) * 0.6 <= budget;
    for (const it of c.pool) if (want(it.p)) cands.push({ p: it.p, from: -1, price: it.price });
    l.teams.forEach((ot, oi) => { if (oi === bi) return; for (const p of oi === 0 ? c.roster : ot.roster || []) if (want(p)) cands.push({ p, from: oi, price: marketValue(p) }); });
    if (!cands.length) { borrow(c, bi, pos, cur, budget, room); continue; }
    const score = (x: Cand) => x.p.gg - x.price / 2000 - x.p.age * (tm.style === 'seller' ? 0.5 : 0.1);
    cands.sort((a, b) => score(b) - score(a));
    const pick = cands[Math.min(cands.length - 1, Math.floor(Math.random() * (6 - smart)))]; const p = pick.p;
    // ust limit: ihtiyac ve butce buyudukce daha cok oder
    const will = Math.min(budget, round10(marketValue(p) * (1 + 0.05 * Math.min(8, p.gg - cur)) * (1 + clamp(budget / Math.max(1, marketValue(p)) / 12, 0, 0.5)) * (1 + (3 - smart) * 0.05)));
    if (pick.from === -1) { // serbest futbolcu
      if (will < pick.price * 0.9) continue; spend(tm, Math.min(pick.price, will)); c.pool = c.pool.filter((it) => it.p !== p); moveToBot(c, bi, p); news(c, 'buy', tm.short, p);
    } else if (pick.from === 0) { // kullanicinin futbolcusu: teklif gelir, karar kullanicinin (serbest kalma maddesi odenirse karar sorulmaz)
      if (p.loan) continue;
      if (p.clause && will >= p.clause && (tm.fm || 0) >= p.clause) { const fee = p.clause; if (sell(c, p.id, fee) === 'ok') { delete p.clause; spend(tm, fee); moveToBot(c, bi, p); news(c, 'clause', tm.short, p); c.tw.listings = c.tw.listings.filter((x) => x.id !== p.id); } continue; }
      const ls = c.tw.listings.find((x) => x.id === p.id); if (ls && (ls.offer || ls.loan)) continue;
      const wkey = `${l.season}:${c.tw.kind}`; if (tm.bidW === wkey && !(ls && ls.ask > 0)) continue; tm.bidW = wkey; // listede olmayan oyuncuma donem basina bir teklif
      const amount = ls && ls.ask > 0 && will >= ls.ask ? ls.ask : round10(will * rnd(0.8, 0.95)); if (amount <= 0) continue;
      const offer = { club: tm.short, amount, name: p.name, gg: Math.round(p.gg), ti: bi };
      if (ls) ls.offer = offer; else c.tw.listings.push({ id: p.id, ask: 0, offer });
    } else { // baska bir bot: satici kendi cikarina gore karar verir
      const vd = verdict(c, pick.from, p, canReplaceAfter); const byClause = !!p.clause && will >= p.clause; if (!byClause && (vd.refuse || will < vd.min)) continue;
      const pay = byClause && (vd.refuse || p.clause! < vd.min) ? p.clause! : round10((vd.min + Math.min(will, vd.ask ?? will)) / 2); if (byClause) delete p.clause; const got = takeFromBot(c, pick.from, p.id, pay); if (!got) continue; spend(tm, pay); moveToBot(c, bi, got); news(c, 'buy', tm.short, got);
    }
  }
}
// alamiyorsa kiralar: baska bir botun ilk 11'inde olmayan oyuncusunu sezon sonuna kadar (bot-bot kiralama)
function borrow(c: Career, bi: number, pos: string, cur: number, budget: number, room: number) {
  const tm = c.league.teams[bi]; let best: { p: RosterPlayer; oi: number; fee: number } | null = null;
  c.league.teams.forEach((ot, oi) => { if (oi === bi || ot.me || !ot.roster || ot.roster.length <= BOT_KEEP) return;
    for (const p of ot.roster) { if (p.loan || p.natPos !== pos || p.gg < cur + 3 || (p.wage || 0) > room) continue; const vd = verdict(c, oi, p, true); if (vd.starter) continue;
      const fee = vd.unwanted ? 0 : round10(marketValue(p) * (p.age <= 23 ? 0.03 : 0.07)); if (fee > budget) continue; if (!best || p.gg > best.p.gg) best = { p, oi, fee }; } });
  const b = best as { p: RosterPlayer; oi: number; fee: number } | null; if (!b) return; const ot = c.league.teams[b.oi];
  ot.roster!.splice(ot.roster!.indexOf(b.p), 1); ot.fm = (ot.fm || 0) + b.fee; refreshGG(ot); spend(tm, b.fee); b.p.loan = { from: b.oi, until: c.league.season, share: 100 }; moveToBot(c, bi, b.p); news(c, 'loan', tm.short, b.p);
}
// satis listeme koydugum futbolcular: isine yarayacak botlar teklif verir (istenen fiyat makulse tam fiyat)
export function bidOnListings(c: Career) {
  const l = c.league;
  for (const ls of c.tw.listings) { if (ls.offer || ls.ask <= 0 || ls.loan) continue; const p = c.roster.find((x) => x.id === ls.id); if (!p) continue;
    let best: { ti: number; fair: number } | null = null;
    l.teams.forEach((tm, ti) => { if (tm.me || !tm.roster || tm.roster.length >= ROSTER_MAX) return;
      const same = tm.roster.filter((q) => q.natPos === p.natPos).sort((a, b) => b.gg - a.gg); const need = FORM_POS[tm.formation].filter((x) => x === p.natPos).length; if (!need) return;
      const ref = same[Math.min(same.length, need) - 1]; const gain = clamp(p.gg - (ref ? ref.gg : tm.gg - 10), -6, 8); if (gain < -3 || (p.wage || 0) > wageCap(tm) - wages(tm)) return;
      const fair = Math.min(Math.max(0, Math.min(tm.tb || 0, tm.fm || 0)), marketValue(p) * (1 + 0.04 * gain) * (overpaid(p) ? 0.85 : 1)); if (!best || fair > best.fair) best = { ti, fair }; });
    const b = best as { ti: number; fair: number } | null; if (!b || b.fair < ls.ask * 0.6) continue;
    const amount = b.fair >= ls.ask ? ls.ask : round10(b.fair * rnd(0.9, 1)); if (amount <= 0 || (amount < ls.ask && Math.random() < 0.35)) continue;
    ls.offer = { club: l.teams[b.ti].short, amount, name: p.name, gg: Math.round(p.gg), ti: b.ti };
  }
}

// ---------- kulup yonetimi: hedef, karakter, bilet, yatirim ----------
const SPLIT = { seller: { tr: 0.25, fac: 0.45 }, balanced: { tr: 0.35, fac: 0.4 }, ambitious: { tr: 0.55, fac: 0.25 } }; // kalan: yedek akce
// karakter gozden gecirme: hedefin gerisindeyse tasarruf, ilerisindeyse ve kasa uygunsa yuklenme; kasa bollugu bir kademe iddia katar
export function reviewClubs(c: Career) {
  ensureBots(c); const l = c.league, n = l.teams.length, ord = order(l);
  l.teams.forEach((tm, i) => { if (tm.me) return; const rank = ord.indexOf(i) + 1; const exp = tm.goal === 'title' ? 2 : tm.goal === 'top' ? Math.ceil(n / 2) : tm.goal === 'mid' ? Math.ceil(n * 0.75) : n;
    const wk = weeklyCost(tm); const rich = (tm.fm || 0) > wk * 20, poor = (tm.fm || 0) < wk * 4; let s: 'seller' | 'balanced' | 'ambitious' = tm.goal === 'title' ? 'ambitious' : tm.goal === 'stay' ? 'seller' : 'balanced';
    if (l.week >= 3 && rank > exp) { // hedefin gerisinde: yetisebilecekse daha da yuklenir, yetisemeyecekse gelecek sezon icin tasarrufa doner
      const need = l.table[ord[exp - 1]].pts - l.table[i].pts, left = l.fixtures.length - l.week;
      s = need <= left * 0.8 && !poor ? 'ambitious' : 'seller';
    } else if (l.week >= 3 && rank < exp - Math.max(1, Math.floor(n / 4)) && !poor) s = 'ambitious'; // beklenmedik basari: yuklen
    if (rich && s !== 'ambitious') s = s === 'seller' ? 'balanced' : 'ambitious'; if (poor) s = 'seller';
    tm.style = s; if ((tm.fm || 0) < 0 && (tm.staffLv || 0) > 0) tm.staffLv = (tm.staffLv || 0) - 1; // kasa ekside: ekip kuculur
    // bilet: tribun dolduysa bir kademe artir, bosaldiysa indir (kullanici gibi deneyerek bulur)
    const ti = TICKET_STEPS.indexOf(tm.ticket || 1); if (tm.lastAtt !== undefined && ti >= 0) { const cap = STADIUM_CAP[tm.stad || 1]; if (tm.lastAtt >= cap * 0.97 && ti < TICKET_STEPS.length - 1) tm.ticket = TICKET_STEPS[ti + 1]; else if (tm.lastAtt < cap * 0.7 && ti > 0) tm.ticket = TICKET_STEPS[ti - 1]; }
  });
}
// donem acilisi: (sezon basinda) sponsor, hedef ve karakter; butce transfer / tesis / yedek akce olarak bolunur, tesis ve ekip yatirimi yapilir
export function botsIncome(c: Career, kind: 'pre' | 'mid') {
  ensureBots(c); if (kind === 'pre') setGoals(c);
  for (const tm of c.league.teams) { if (tm.me) continue;
    if (kind === 'pre') tm.fm = Math.round((tm.fm || 0) + 5000 * CAREER_K.income * (1 + (tm.stad || 1) / 50)); // sponsor
  }
  reviewClubs(c);
  for (const tm of c.league.teams) { if (tm.me) continue; const sp = SPLIT[tm.style || 'balanced']; const free = Math.max(0, (tm.fm || 0) - weeklyCost(tm) * 6);
    let fac = free * sp.fac; tm.tb = Math.round(free * sp.tr);
    const buy = (price: number, f: () => void) => { if (price <= fac) { fac -= price; tm.fm = (tm.fm || 0) - price; f(); return true; } return false; };
    const upStad = () => (tm.stad || 1) < 10 && buy(cost(STADIUM_COST[(tm.stad || 1) + 1]), () => { tm.stad = (tm.stad || 1) + 1; });
    const upAcad = () => (tm.acad || 0) < 5 && buy(cost(ACADEMY[(tm.acad || 0) + 1]!.cost), () => { tm.acad = (tm.acad || 0) + 1; });
    const upStaff = () => { const lv = (tm.staffLv || 0) + 1; const extra = 3 * (staffWage(lv) - staffWage(lv - 1)); return lv <= 5 && free >= extra * 24 && buy(6 * staffWage(lv), () => { tm.staffLv = lv; }); }; // ekip maasini yarim sezon tasiyabiliyorsa
    for (let i = 0; i < 2; i++) { const st = tm.stad || 1; if (tm.style === 'seller') { ((tm.acad || 0) < st ? upAcad() || upStad() : upStad() || upAcad()); } else if (tm.style === 'ambitious') { ((tm.staffLv || 0) < st ? upStaff() || upStad() : upStad() || upStaff()); } else { upStad() || upStaff() || upAcad(); } }
    if ((tm.fm || 0) < 0 && (tm.staffLv || 0) > 0) tm.staffLv = (tm.staffLv || 0) - 1; // kasa ekside: ekip kuculur
  }
}
// lig haftasi sonu: mac primi, ic sahada bilet; maas ve bakim. Her 4 haftada karakter ve bilet gozden gecirilir
export function botsWeekly(c: Career) {
  ensureBots(c); const l = c.league, n = l.teams.length, ord = order(l);
  for (const m of l.results.filter((r) => r.week === l.week)) for (const side of [0, 1]) {
    const ti = side ? m.b : m.a; const tm = l.teams[ti]; if (tm.me) continue; const gf = side ? m.gb_ : m.ga_, ga = side ? m.ga_ : m.gb_; const home = side === 0; const opp = l.teams[side ? m.a : m.b];
    let fm = (gf > ga ? 500 : gf === ga ? 200 : 100) * CAREER_K.income; const rank = ord.indexOf(ti) + 1;
    if (home) { // kullaniciyla ayni seyirci formulu
      const W = Math.max(0.3, 0.5 + (tm.tm || 50) / 100 + (rank <= Math.ceil(n / 3) ? 0.2 : rank > n - Math.ceil(n / 3) ? -0.15 : 0) + (opp.gg > tm.gg ? 0.15 : 0) + rnd(-0.1, 0.1));
      const cap = STADIUM_CAP[tm.stad || 1]; const att = Math.round(cap * Math.min(1, Math.min(1, 0.35 + (0.65 * (tm.tm || 50)) / 100) * Math.pow(W / (tm.ticket || 1), 2.5))); tm.lastAtt = att; fm += att * TICKET_BASE * (tm.ticket || 1) * CAREER_K.income;
    }
    tm.tm = clamp((tm.tm || 50) + (home ? (gf > ga ? 3 : gf === ga ? -1 : -4) : gf > ga ? 2 : gf === ga ? 0 : -2), 0, 100); tm.tm += (50 + 2 * (tm.stad || 1) - tm.tm) * 0.1;
    tm.fm = Math.round((tm.fm || 0) + fm);
  }
  for (const tm of l.teams) if (!tm.me) tm.fm = Math.round((tm.fm || 0) - weeklyCost(tm));
  if ((l.week + 1) % 4 === 0) reviewClubs(c);
}
// sezon donumu: odul, yas, gelisim, emeklilik, altyapidan takviye
export function botsSeasonTurn(c: Career, finalOrder: number[]) {
  ensureBots(c); const n = c.league.teams.length;
  c.league.teams.forEach((tm, ti) => { if (tm.me || !tm.roster) return;
    tm.fm = Math.round((tm.fm || 0) + prizeFor(finalOrder.indexOf(ti) + 1, n));
    for (const p of tm.roster) { p.age++; const d = p.age <= 21 ? rnd(1, 2.5) : p.age <= 24 ? rnd(0.5, 1.5) : p.age <= 29 ? rnd(-0.3, 0.6) : p.age <= 32 ? rnd(-1.5, 0) : rnd(-3, -1); p.gg = clamp(Math.round((p.gg + d + (p.age <= 24 ? 0.2 * (tm.staffLv || 0) : 0)) * 100) / 100, 30, 99); p.wage = Math.max(p.wage || 0, wageFor(p.gg)); }
    const st = new Set(xi(tm).map((x) => x.p.id)); tm.roster = tm.roster.filter((p) => p.age < 36 && !(p.age >= 34 && !st.has(p.id)));
    const youth = (pos?: any) => { const a = tm.acad ? ACADEMY[tm.acad]! : null; const q = mkPlayer(c, a ? [a.gg[0] + 10, a.gg[1] + 12] : [tm.gg - 14, tm.gg - 6], [17, 19], 0.3, false, pos); q.num = freeNumber(tm.roster!); q.fatigue = 20; tm.roster!.push(q); };
    if (tm.acad) for (let i = 0; i < ACADEMY[tm.acad]!.youth && tm.roster.length < 23; i++) youth();
    const needPos = (pos: any, k: number) => { while (tm.roster!.filter((p) => p.natPos === pos).length < k) youth(pos); };
    needPos('GK', 2); for (const s of new Set(FORM_POS[tm.formation])) needPos(s, FORM_POS[tm.formation].filter((x) => x === s).length);
    while (tm.roster.length < 20) youth();
    refreshGG(tm);
  });
}
