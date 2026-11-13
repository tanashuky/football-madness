// Bot kulupler: gercek kadro, kasa ve karakter. Her bot kendi kadrosuna bakarak alir/satar; sabit kota ya da sabit kabul esigi yok.
// Satis karari: futbolcu giderse ilk 11 ne kadar zayiflar, yerine adam alacak zaman var mi, kulubun karakteri ve kasasi.
import { DOCTRINES, FORM_POS, NAMES_B } from '../engine.js';
import { defaultLineup, mkSquad, newTeamSetup, userTeamIn } from './club.js';
import { botBrain } from './templates.js';
import { ROSTER_MAX, ROSTER_MIN, freeNumber, marketValue, mkPlayer, overpaid, wageFor } from './manage.js';
import { form, order } from './career.js';
const STYLES = ['seller', 'balanced', 'ambitious'];
const rnd = (a, b) => a + Math.random() * (b - a);
export const round10 = (v) => Math.round(v / 10) * 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// kararlar hafta icinde sabit kalsin diye kimlikten turetilen gurultu (0..1)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
const xi = (tm, roster = tm.roster) => { const slots = FORM_POS[tm.formation]; const by = Object.fromEntries(roster.map((p) => [p.id, p])); return defaultLineup(roster, slots).map((id, i) => ({ p: by[id], slot: slots[i] })).filter((x) => x.p); };
// ilk 11 gucu: mevkisinde oynamayan -6 sayilir
const xiSum = (tm, roster = tm.roster) => xi(tm, roster).reduce((a, x) => a + x.p.gg - (x.p.natPos === x.slot ? 0 : 6), 0) - (11 - Math.min(11, roster.length)) * 40;
export function refreshGG(tm) { if (tm.roster && tm.roster.length >= 11)
    tm.gg = Math.round(xi(tm).reduce((a, x) => a + x.p.gg, 0) / 11); }
export const wages = (tm) => (tm.roster || []).reduce((a, p) => a + (p.wage || 0), 0);
const BOT_MIN = Math.max(ROSTER_MIN, 17);
const wageCap = (tm) => 22 * wageFor(tm.gg + 5);
export function ensureBots(c) {
    c.league.teams.forEach((tm, i) => {
        if (tm.me || (tm.roster && tm.roster.length >= 11))
            return;
        const base = clamp(tm.gg + (c.diff - 3) * 2, 35, 95);
        const sq = mkSquad({ ...tm }, base, NAMES_B);
        tm.roster = [...sq.players, ...(sq.bench || [])].map((p) => { const q = mkPlayer(c, [p.gg, p.gg], [p.age, p.age], 0.3, false, p.pos); q.num = p.num; q.fatigue = 20; return q; });
        while (tm.roster.length < 20) {
            const q = mkPlayer(c, [base - 7, base], [18, 30], 0.25);
            q.num = freeNumber(tm.roster);
            q.fatigue = 20;
            tm.roster.push(q);
        }
        tm.style = STYLES[(tm.short.charCodeAt(1) + i) % 3];
        tm.fm = Math.round(3000 + Math.max(0, base - 55) * 250);
        refreshGG(tm);
    });
}
// bot lig takimi -> motor girdisi (kendi kadrosundan en iyi 11)
export function botLeagueTeamIn(c, idx) {
    ensureBots(c);
    const tm = c.league.teams[idx];
    if (tm.me)
        return userTeamIn({ name: tm.name, short: tm.short, color: tm.color, color2: tm.color2, gg: tm.gg }, c.roster, c.team, c.metrics, 7); // atlanan haftada kendi takimim
    const tt = { ...newTeamSetup(), formation: tm.formation, doctrine: tm.doctrine, tactic: { ...DOCTRINES[tm.doctrine].tactic } };
    const t = userTeamIn({ name: tm.name, short: tm.short, color: tm.color, color2: tm.color2, gg: tm.gg }, tm.roster, tt, undefined, 7);
    return botBrain(t, tm.doctrine, c.diff);
}
// kulubun bu futbolcu icin karari. canReplace: cevap verildikten sonra yerine adam alacak hafta kaldi mi
export function verdict(c, ti, p, canReplace) {
    const tm = c.league.teams[ti], roster = tm.roster, l = c.league;
    const need = FORM_POS[tm.formation].filter((s) => s === p.natPos).length;
    const same = roster.filter((q) => q.natPos === p.natPos).sort((a, b) => b.gg - a.gg);
    const have = same.length;
    const starter = same.indexOf(p) < need;
    const star = [...roster].sort((a, b) => b.gg - a.gg).indexOf(p) < 2 && p.gg >= tm.gg + 3;
    const f = form(l, ti);
    const goodForm = f.length >= 3 && f.reduce((a, r) => a + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / f.length >= 2;
    let drop = starter ? Math.max(0, xiSum(tm) - xiSum(tm, roster.filter((q) => q !== p))) : 0;
    if (have <= need)
        drop += 8; // yedegi yok
    const out = (refuse) => ({ min: Infinity, refuse, listed: false, starter });
    if (roster.length <= BOT_MIN)
        return out('min');
    if (!canReplace && have <= Math.max(need, p.natPos === 'GK' ? 2 : 1))
        return out('only');
    if (!canReplace && drop >= 8)
        return out('key');
    if (star && goodForm && (tm.style === 'ambitious' || !canReplace))
        return out('star');
    let k = 1 + drop * (canReplace ? 0.06 : 0.12);
    if (star)
        k *= goodForm ? 1.6 : 1.35;
    if (!starter) {
        if (have > need + 1)
            k *= 0.9;
        if (p.age >= 31)
            k *= 0.8;
        if (overpaid(p))
            k *= 0.85;
    }
    k *= tm.style === 'seller' ? 0.9 : tm.style === 'ambitious' ? 1.12 : 1;
    if ((tm.fm || 0) < wages(tm) * 4)
        k *= 0.85; // kasa dar: paraya ihtiyac var
    const e = [0.2, 0.15, 0.1, 0.06, 0.03][clamp(c.diff, 1, 5) - 1]; // kolayda bot daha hatali fiyat bicer
    k *= 1 + (hash(`${p.id}:${l.season}:${c.tw.kind}:${c.tw.week}`) * 2 - 1) * e - (3 - c.diff) * 0.03;
    if (starter)
        k = Math.max(k, 1.1); // ilk 11 oyuncusu piyasa degerinin altina gitmez
    const listed = !starter && (have > need + 1 || p.age >= 32 || roster.length > 22);
    if (listed)
        k = Math.min(k, 1) * 0.95;
    return { min: round10(marketValue(p) * k), listed, starter };
}
export function moveToBot(c, ti, p) { const tm = c.league.teams[ti]; p.num = freeNumber(tm.roster); p.fatigue = 20; delete p.reg; delete p.coach; delete p.inj; delete p.susp; delete p.suspCup; tm.roster.push(p); refreshGG(tm); }
export function takeFromBot(c, ti, id, price) { const tm = c.league.teams[ti]; const i = tm.roster.findIndex((q) => q.id === id); if (i < 0)
    return null; const [p] = tm.roster.splice(i, 1); tm.fm = (tm.fm || 0) + price; refreshGG(tm); return p; }
const freeItem = (p) => ({ p, price: round10(marketValue(p) * rnd(0.85, 1)), left: 0, fresh: false, club: '' });
const news = (c, club, p) => { c.news.unshift(`buy|${club}|${p.name}|${Math.round(p.gg)}`); if (c.news.length > 8)
    c.news.length = 8; };
// botlarin haftasi: her bot en zayif mevkisine bakar; butcesine, maas dengesine ve ihtiyacina gore alir ya da hic almaz
export function botWeek(c, canReplaceAfter) {
    ensureBots(c);
    const l = c.league;
    const idx = l.teams.map((_, i) => i).filter((i) => !l.teams[i].me).sort(() => Math.random() - 0.5);
    const smart = clamp(c.diff, 1, 5);
    for (const bi of idx) {
        const tm = l.teams[bi], roster = tm.roster;
        // fazlalik: 25 siniri ve maas butcesi asilirsa en zayif yedek serbest kalir
        while (roster.length > ROSTER_MAX - 1 || (wages(tm) > wageCap(tm) && roster.length > 18)) {
            const st = new Set(xi(tm).map((x) => x.p.id));
            const sp = roster.filter((q) => !st.has(q.id) && (q.natPos !== 'GK' || roster.filter((g) => g.natPos === 'GK').length > 2)).sort((a, b) => a.gg - b.gg)[0];
            if (!sp)
                break;
            roster.splice(roster.indexOf(sp), 1);
            c.pool.push(freeItem(sp));
        }
        if (Math.random() > 0.45 + smart * 0.05)
            continue; // her bot her hafta pazara girmez
        const line = xi(tm);
        if (!line.length)
            continue;
        const weak = [...line].sort((a, b) => (a.p.gg - (a.p.natPos === a.slot ? 0 : 6)) - (b.p.gg - (b.p.natPos === b.slot ? 0 : 6)))[0];
        let pos = weak.slot, cur = weak.p.gg - (weak.p.natPos === weak.slot ? 0 : 6);
        // derinlik: yedegi olmayan mevki varsa once o kapatilir
        const thin = roster.length < 22 ? [...new Set(FORM_POS[tm.formation])].find((s) => roster.filter((q) => q.natPos === s).length <= FORM_POS[tm.formation].filter((x) => x === s).length) : undefined;
        if (thin && cur >= tm.gg - 3) {
            pos = thin;
            cur = tm.gg - 12;
        }
        else if (cur >= tm.gg + 2)
            continue; // en zayif halka bile yeterli: transfer gerekmiyor
        const budget = (tm.fm || 0) * 0.7;
        const room = wageCap(tm) - wages(tm);
        const cands = [];
        const want = (p) => p.natPos === pos && p.gg >= cur + 2 && p.age <= 32 && (p.wage || 0) <= room && marketValue(p) * 0.8 <= budget;
        for (const it of c.pool)
            if (want(it.p))
                cands.push({ p: it.p, from: -1, price: it.price });
        l.teams.forEach((ot, oi) => { if (oi === bi)
            return; for (const p of oi === 0 ? c.roster : ot.roster || [])
            if (want(p))
                cands.push({ p, from: oi, price: marketValue(p) }); });
        if (!cands.length)
            continue;
        cands.sort((a, b) => (b.p.gg - a.p.gg) + (a.price - b.price) / 2000 + (a.p.age - b.p.age) * 0.1);
        const pick = cands[Math.min(cands.length - 1, Math.floor(Math.random() * (6 - smart)))];
        const p = pick.p;
        const will = Math.min(budget, round10(marketValue(p) * (1 + 0.05 * Math.min(8, p.gg - cur)) * (1 + clamp(budget / Math.max(1, marketValue(p)) / 12, 0, 0.5)) * (1 + (3 - smart) * 0.05))); // ihtiyac buyudukce daha cok oder
        if (pick.from === -1) { // serbest futbolcu
            if (will < pick.price * 0.9)
                continue;
            const pay = Math.min(pick.price, will);
            tm.fm = (tm.fm || 0) - pay;
            c.pool = c.pool.filter((it) => it.p !== p);
            moveToBot(c, bi, p);
            news(c, tm.short, p);
        }
        else if (pick.from === 0) { // kullanicinin futbolcusu: teklif gelir, karar kullanicinin
            const ls = c.tw.listings.find((x) => x.id === p.id);
            if (ls && ls.offer)
                continue;
            const amount = ls && ls.ask > 0 && will >= ls.ask ? ls.ask : round10(will * rnd(0.85, 1));
            if (amount <= 0)
                continue;
            const offer = { club: tm.short, amount, name: p.name, gg: Math.round(p.gg), ti: bi };
            if (ls)
                ls.offer = offer;
            else
                c.tw.listings.push({ id: p.id, ask: 0, offer });
        }
        else { // baska bir bot: satici kendi cikarina gore karar verir
            const vd = verdict(c, pick.from, p, canReplaceAfter);
            if (vd.refuse || will < vd.min)
                continue;
            const pay = round10((vd.min + will) / 2);
            const got = takeFromBot(c, pick.from, p.id, pay);
            if (!got)
                continue;
            tm.fm = (tm.fm || 0) - pay;
            moveToBot(c, bi, got);
            news(c, tm.short, got);
        }
    }
}
// satis listeme koydugum futbolcular: isine yarayacak botlar teklif verir (istenen fiyat makulse tam fiyat)
export function bidOnListings(c) {
    const l = c.league;
    for (const ls of c.tw.listings) {
        if (ls.offer || ls.ask <= 0)
            continue;
        const p = c.roster.find((x) => x.id === ls.id);
        if (!p)
            continue;
        let best = null;
        l.teams.forEach((tm, ti) => {
            if (tm.me || !tm.roster || tm.roster.length >= ROSTER_MAX - 1)
                return;
            const same = tm.roster.filter((q) => q.natPos === p.natPos).sort((a, b) => b.gg - a.gg);
            const need = FORM_POS[tm.formation].filter((x) => x === p.natPos).length;
            if (!need)
                return;
            const ref = same[Math.min(same.length, need) - 1];
            const gain = clamp(p.gg - (ref ? ref.gg : tm.gg - 10), -6, 8);
            if (gain < -3 || (p.wage || 0) > wageCap(tm) - wages(tm))
                return;
            const fair = Math.min((tm.fm || 0) * 0.7, marketValue(p) * (1 + 0.04 * gain) * (overpaid(p) ? 0.85 : 1));
            if (!best || fair > best.fair)
                best = { ti, fair };
        });
        const b = best;
        if (!b || b.fair < ls.ask * 0.6)
            continue;
        const amount = b.fair >= ls.ask ? ls.ask : round10(b.fair * rnd(0.9, 1));
        if (amount <= 0 || (amount < ls.ask && Math.random() < 0.35))
            continue;
        ls.offer = { club: l.teams[b.ti].short, amount, name: p.name, gg: Math.round(p.gg), ti: b.ti };
    }
}
// donem acilisi: bot kasalarina gelir; sezon donumu: yas, gelisim, emeklilik, altyapidan takviye
export function botsIncome(c, kind) { ensureBots(c); const ord = order(c.league); c.league.teams.forEach((tm, i) => { if (!tm.me)
    tm.fm = Math.round((tm.fm || 0) + (kind === 'pre' ? 1500 + (c.league.teams.length - ord.indexOf(i)) * 250 : 500)); }); }
export function botsSeasonTurn(c) {
    ensureBots(c);
    for (const tm of c.league.teams) {
        if (tm.me || !tm.roster)
            continue;
        for (const p of tm.roster) {
            p.age++;
            const d = p.age <= 21 ? rnd(1, 2.5) : p.age <= 24 ? rnd(0.5, 1.5) : p.age <= 29 ? rnd(-0.3, 0.6) : p.age <= 32 ? rnd(-1.5, 0) : rnd(-3, -1);
            p.gg = clamp(Math.round((p.gg + d) * 100) / 100, 30, 99);
            p.wage = Math.max(p.wage || 0, wageFor(p.gg));
        }
        const st = new Set(xi(tm).map((x) => x.p.id));
        tm.roster = tm.roster.filter((p) => p.age < 36 && !(p.age >= 34 && !st.has(p.id)));
        const needPos = (pos, n) => { while (tm.roster.filter((p) => p.natPos === pos).length < n) {
            const q = mkPlayer(c, [tm.gg - 12, tm.gg - 3], [17, 19], 0.3, false, pos);
            q.num = freeNumber(tm.roster);
            q.fatigue = 20;
            tm.roster.push(q);
        } };
        needPos('GK', 2);
        for (const s of new Set(FORM_POS[tm.formation]))
            needPos(s, FORM_POS[tm.formation].filter((x) => x === s).length);
        while (tm.roster.length < 18) {
            const q = mkPlayer(c, [tm.gg - 12, tm.gg - 3], [17, 19], 0.3);
            q.num = freeNumber(tm.roster);
            q.fatigue = 20;
            tm.roster.push(q);
        }
        refreshGG(tm);
    }
}
