import { addLedger } from './career.js';
import { ROSTER_MAX, fixLineup, freeNumber, genYouths, marketValue, mkPlayer, sell, sellPrice } from './manage.js';
export const POOL_SIZE = 50, WEEKS = { pre: 4, mid: 2 };
const rnd = (a, b) => a + Math.random() * (b - a), rint = (a, b) => Math.floor(rnd(a, b + 1));
const round10 = (v) => Math.round(v / 10) * 10;
const clubs = (c) => c.league.teams.slice(1).map((x) => x.short);
function newItem(c, fresh) {
    const base = Math.round(c.roster.reduce((a, p) => a + p.gg, 0) / Math.max(1, c.roster.length));
    const star = Math.random() < 0.12; // arada bir yildiz
    const p = mkPlayer(c, star ? [base + 6, base + 16] : [base - 12, base + 8], [18, 34], star ? 0.8 : 0.35);
    const cl = clubs(c);
    const free = Math.random() < 0.2;
    return { p, price: round10(marketValue(p) * rnd(0.95, 1.15)), left: rint(2, 4), fresh, club: free || !cl.length ? '' : cl[rint(0, cl.length - 1)] };
}
function fill(c, fresh) { while (c.pool.length < POOL_SIZE)
    c.pool.push(newItem(c, fresh)); }
export function openWindow(c, kind) {
    // donem acilisi: eski havuzun bir kismi gider, yenileri gelir
    c.pool = c.pool.filter((it) => it.mine || Math.random() < 0.5);
    for (const it of c.pool)
        it.fresh = false;
    fill(c, c.pool.length > 0);
    c.tw = { open: true, kind, week: 1, weeks: WEEKS[kind], closing: false, offers: [], listings: [], midDone: kind === 'mid' ? true : c.tw ? c.tw.midDone : false };
    if (kind === 'mid')
        genYouths(c); // devre arasi genc cikisi
}
export const canDeal = (c) => c.tw.open && !c.tw.closing;
function addToRoster(c, p) { p.num = freeNumber(c.roster); c.roster.push(p); }
export function buyNow(c, id) {
    if (!canDeal(c))
        return 'closed';
    const i = c.pool.findIndex((x) => x.p.id === id);
    if (i < 0)
        return 'no';
    const it = c.pool[i];
    if (c.roster.length >= ROSTER_MAX)
        return 'full';
    if (c.fm < it.price)
        return 'fm';
    addLedger(c, `buy:${it.p.name}`, -it.price);
    addToRoster(c, it.p);
    c.pool.splice(i, 1);
    c.tw.offers = c.tw.offers.filter((o) => o.id !== id);
    return 'ok';
}
export function sendOffer(c, id, amount) {
    if (!canDeal(c))
        return 'closed';
    const it = c.pool.find((x) => x.p.id === id);
    if (!it)
        return 'no';
    c.tw.offers = c.tw.offers.filter((o) => o.id !== id);
    c.tw.offers.push({ id, name: it.p.name, amount: round10(amount), state: 'pending', week: c.tw.week });
    return 'ok';
}
export function withdrawOffer(c, id) { c.tw.offers = c.tw.offers.filter((o) => o.id !== id); }
// karsi teklifi kabul: kapanis gununde de yapilabilir
export function acceptCounter(c, id) {
    const o = c.tw.offers.find((x) => x.id === id && x.state === 'counter');
    const i = c.pool.findIndex((x) => x.p.id === id);
    if (!o || i < 0 || !c.tw.open)
        return 'no';
    if (c.roster.length >= ROSTER_MAX)
        return 'full';
    if (c.fm < o.counter)
        return 'fm';
    const it = c.pool[i];
    addLedger(c, `buy:${it.p.name}`, -o.counter);
    addToRoster(c, it.p);
    c.pool.splice(i, 1);
    o.state = 'accepted';
    return 'ok';
}
// satis listesi
export function listPlayer(c, id, ask) {
    if (!canDeal(c))
        return 'closed';
    const p = c.roster.find((x) => x.id === id);
    if (!p)
        return 'no';
    c.tw.listings = c.tw.listings.filter((l) => l.id !== id);
    c.tw.listings.push({ id, ask: round10(ask), offer: null });
    return 'ok';
}
export function unlist(c, id) { c.tw.listings = c.tw.listings.filter((l) => l.id !== id); }
export function quickSell(c, id) { if (!canDeal(c))
    return 'closed'; const r = sell(c, id); if (r === 'ok')
    unlist(c, id); return r; }
export function acceptBid(c, id) {
    const l = c.tw.listings.find((x) => x.id === id);
    if (!l || !l.offer || !c.tw.open)
        return 'no';
    const r = sell(c, id, l.offer.amount);
    if (r === 'ok') {
        c.news.unshift(`buy|${l.offer.club}|${l.offer.name}|${l.offer.gg}`);
        unlist(c, id);
    }
    return r;
}
export function declineBid(c, id) { const l = c.tw.listings.find((x) => x.id === id); if (l)
    l.offer = null; }
// haftanin cevaplari: tekliflerim ve satis listemdeki futbolculara gelen teklifler
function resolve(c) {
    const tw = c.tw;
    for (const o of tw.offers) {
        if (o.state === 'counter') {
            o.state = 'rejected';
            continue;
        } // cevaplanmayan karsi teklif duser
        if (o.state !== 'pending')
            continue;
        const it = c.pool.find((x) => x.p.id === o.id);
        if (!it) {
            o.state = 'gone';
            continue;
        }
        const th = Math.max(0.78, 0.93 - 0.03 * (4 - it.left)) + rnd(-0.03, 0.03);
        const ratio = o.amount / it.price;
        if (ratio >= th) {
            if (c.fm >= o.amount && c.roster.length < ROSTER_MAX) {
                addLedger(c, `buy:${it.p.name}`, -o.amount);
                addToRoster(c, it.p);
                c.pool.splice(c.pool.indexOf(it), 1);
                o.state = 'accepted';
            }
            else
                o.state = 'failed';
        }
        else if (ratio >= th - 0.17) {
            o.state = 'counter';
            o.counter = round10(it.price * Math.min(1, (th + 0.02 + ratio) / 2 + 0.02));
        }
        else
            o.state = 'rejected';
    }
    const cl = clubs(c);
    for (const l of [...tw.listings]) {
        l.offer = null;
        const p = c.roster.find((x) => x.id === l.id);
        if (!p) {
            unlist(c, l.id);
            continue;
        }
        const value = sellPrice(p) / 0.9; // piyasa degeri (maasi yuksekse dusuk)
        if (Math.random() > Math.max(0.1, Math.min(0.9, 1.35 - l.ask / value)) || !cl.length)
            continue;
        const amount = round10(value * rnd(0.8, 1.06));
        const club = cl[rint(0, cl.length - 1)];
        if (amount >= l.ask) {
            const nm = p.name, gg = Math.round(p.gg);
            if (sell(c, l.id, l.ask) === 'ok') {
                c.news.unshift(`buy|${club}|${nm}|${gg}`);
                unlist(c, l.id);
            }
        }
        else
            l.offer = { club, amount, name: p.name, gg: Math.round(p.gg) };
    }
    if (c.news.length > 8)
        c.news.length = 8;
}
// botlar: havuzdan alir, havuza koyar; alinmayan gider; bekleyenin fiyati %5 duser
function churn(c) {
    const bots = c.league.teams.slice(1);
    const offered = new Set(c.tw.offers.filter((o) => o.state === 'pending' || o.state === 'counter').map((o) => o.id));
    for (const it of c.pool) {
        it.left--;
        if (!it.fresh)
            it.price = round10(it.price * 0.95);
        it.fresh = false;
    }
    c.pool = c.pool.filter((it) => it.left > 0 || offered.has(it.p.id)); // teklif verdigim futbolcu cevap gelene kadar kalir
    for (let k = rint(3, 6); k > 0 && c.pool.length && bots.length; k--) {
        const cand = c.pool.filter((it) => !offered.has(it.p.id));
        if (!cand.length)
            break;
        const it = cand[rint(0, cand.length - 1)];
        const b = bots[rint(0, bots.length - 1)];
        c.pool.splice(c.pool.indexOf(it), 1);
        if (it.p.gg > b.gg)
            b.gg = Math.min(90, b.gg + 0.3);
        c.news.unshift(`buy|${b.short}|${it.p.name}|${Math.round(it.p.gg)}`);
    }
    fill(c, true);
    if (c.news.length > 8)
        c.news.length = 8;
}
const awaiting = (c) => c.tw.offers.some((o) => o.state === 'counter') || c.tw.listings.some((l) => !!l.offer);
// "Sonraki hafta": cevaplar gelir, botlar hareket eder; son haftadan sonra kapanis gunu; kapanis gununden sonra donem biter
export function nextWeek(c) {
    const tw = c.tw;
    if (!tw.open)
        return 'closed';
    if (tw.closing) {
        closeWindow(c);
        return 'closed';
    }
    resolve(c);
    if (tw.week >= tw.weeks) {
        tw.closing = true;
        if (!awaiting(c)) {
            closeWindow(c);
            return 'closed';
        }
        return 'closing';
    }
    churn(c);
    tw.week++;
    return 'week';
}
// "Donemi kapat": kalan haftalar atlanir; bekleyen cevap varsa kapanis gunu, yoksa dogrudan biter
export function skipWindow(c) {
    const tw = c.tw;
    if (!tw.open)
        return 'closed';
    if (tw.closing) {
        closeWindow(c);
        return 'closed';
    }
    resolve(c);
    tw.week = tw.weeks;
    tw.closing = true;
    if (!awaiting(c)) {
        closeWindow(c);
        return 'closed';
    }
    return 'closing';
}
function closeWindow(c) {
    const tw = c.tw;
    tw.open = false;
    tw.closing = false;
    tw.offers = [];
    tw.listings = [];
    for (const p of c.roster)
        delete p.reg; // donem kapanirken kadrodaki herkes kupaya yazilir
    fixLineup(c);
}
// altyapidan kadroya: her zaman; donem disinda alinirsa bir sonraki doneme kadar kupada oynayamaz
export function promoteYouth(c, id) {
    const i = c.youth.findIndex((p) => p.id === id);
    if (i < 0 || c.roster.length >= ROSTER_MAX)
        return false;
    const p = c.youth[i];
    c.youth.splice(i, 1);
    if (!c.tw.open)
        p.reg = false;
    addToRoster(c, p);
    return true;
}
export const offerOf = (c, id) => c.tw.offers.find((o) => o.id === id);
