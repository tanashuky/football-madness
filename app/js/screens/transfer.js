// Kadro yenileme sekmesi: transfer donemi seridi, Havuz (siralanabilir tablo + filtre) · Teklifler · Satis · Scout · Altyapi; futbolcu sayfasi ve kiyaslama.
import { $, html, raw } from '../core/html.js';
import { t, money } from '../core/i18n.js';
import { go, register, render } from '../core/router.js';
import { store, save } from '../core/store.js';
import { card, confirmBox, muted, sel, tag, toast } from '../core/ui.js';
import { ROSTER_MAX, SCOUTS, fmtLeft, marketValue, overpaid, scoutCost, sellPrice, signFound, startScout, wageFor } from '../model/manage.js';
import { acceptBid, acceptCounter, buyNow, canDeal, declineBid, findMarket, listPlayer, market, nextWeek, offerOf, promoteYouth, quickSell, sendOffer, skipWindow, unlist, withdrawOffer } from '../model/transfer.js';
import { track } from '../model/missions.js';
import { CLAUSES, LOAN_FEES, exerciseOption, loanFee, maxYears, payClause, renew, renewDemand } from '../model/contracts.js';
import { listLoan, sendLoanOffer } from '../model/transfer.js';
import { careerTabs, onCareerTab } from './career.js';
const POS_ORDER = ['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'];
// gorunum durumu (ekranlar arasi gecerken korunur)
const V = { sub: 'pool', sort: { pool: { k: 'gg', d: -1 }, sell: { k: 'gg', d: -1 } }, f: { pos: '', st: '', ggMin: 0, ggMax: 99, ageMax: 99, trait: false, budget: false } };
const COLS = {
    pos: { k: 'pos', label: 'col.pos', get: (r) => POS_ORDER.indexOf(r.p.natPos), show: (r) => html `<b class="ps">${r.p.natPos}</b>` },
    name: { k: 'name', label: 'col.name', wide: true, get: (r) => r.p.name, show: (r) => html `${r.p.name}${r.note || ''}` },
    age: { k: 'age', label: 'col.age', num: true, get: (r) => r.p.age, show: (r) => String(r.p.age) },
    gg: { k: 'gg', label: 'col.gg', num: true, get: (r) => r.p.gg, show: (r) => html `<b>${Math.round(r.p.gg)}</b>` },
    trait: { k: 'trait', label: 'col.trait', get: (r) => r.p.traits.length, show: (r) => r.p.traits.join(', ') || '–' },
    wage: { k: 'wage', label: 'col.wage', num: true, get: (r) => r.p.wage || 0, show: (r) => html `<span class="${overpaid(r.p) ? 'neg' : ''}">${money(r.p.wage || 0)}</span>` },
    value: { k: 'value', label: 'col.value', num: true, get: (r) => marketValue(r.p), show: (r) => money(marketValue(r.p)) },
    price: { k: 'price', label: 'col.price', num: true, get: (r) => r.price || 0, show: (r) => r.price ? html `<b>${money(r.price)}</b>` : html `<span class="muted">${t('pool.ask')}</span>` },
    end: { k: 'end', label: 'col.end', num: true, get: (r) => (r.p.loan ? r.p.loan.until : r.p.end || 0), show: (r) => r.p.loan ? tag(t('loan.tag'), 'o') : r.p.end ? t('con.until', { s: r.p.end }) : '–' },
    fat: { k: 'fat', label: 'col.fat', num: true, get: (r) => r.p.fatigue, show: (r) => String(Math.round(r.p.fatigue)) },
    club: { k: 'club', label: 'col.club', get: (r) => r.club || '', show: (r) => r.club || t('pool.free') },
    left: { k: 'left', label: 'col.left', num: true, get: (r) => r.left || 0, show: (r) => t('pool.weeks', { n: r.left || 0 }) },
};
// siralanabilir tablo: basliga dokun = sirala, tekrar dokun = ters cevir; satira dokun = futbolcu sayfasi
function table(id, cols, rows, src) {
    const s = V.sort[id];
    const c = COLS[s.k] || COLS.gg;
    const sorted = [...rows].sort((a, b) => { const x = c.get(a), y = c.get(b); return (typeof x === 'string' ? x.localeCompare(y) : x - y) * s.d; });
    return html `<div class="tblwrap"><table class="grid" data-tbl="${id}"><thead><tr>${cols.map((k) => html `<th class="${COLS[k].num ? 'n' : ''} ${COLS[k].wide ? 'w' : ''}"><button data-sort="${k}">${t(COLS[k].label)}${s.k === k ? (s.d < 0 ? ' ▾' : ' ▴') : ''}</button></th>`)}</tr></thead>
    <tbody>${sorted.map((r) => html `<tr data-go="player" data-ctx='${JSON.stringify({ id: r.p.id, src })}'>${cols.map((k) => html `<td class="${COLS[k].num ? 'n' : ''} ${COLS[k].wide ? 'w' : ''}">${COLS[k].show(r)}</td>`)}</tr>`)}</tbody></table></div>${rows.length ? '' : muted(t('pool.nomatch'))}`;
}
const winLabel = (k) => k.tw.open ? (k.tw.closing ? t('tw.closing') : t('tw.open', { kind: t('tw.' + k.tw.kind), w: k.tw.week, n: k.tw.weeks })) : t('tw.closed');
// transfer donemi seridi (Mac ve Kadro yenileme sekmelerinde)
export function windowBar(k) {
    const tw = k.tw;
    const pend = tw.offers.filter((o) => o.state === 'pending').length, wait = tw.offers.filter((o) => o.state === 'counter').length + tw.listings.filter((l) => !!l.offer).length;
    if (!tw.open)
        return html `<section class="card twbar closed"><b>${t('tw.closed')}</b><span class="muted small">${t('tw.closed.desc')}</span></section>`;
    return html `<section class="card twbar hero"><div><b>${winLabel(k)}</b><br><span class="muted small">${tw.closing ? t('tw.closing.desc') : t('tw.desc')}${pend ? ' · ' + t('tw.pending', { n: pend }) : ''}${wait ? ' · ' + t('tw.waiting', { n: wait }) : ''}</span></div>
    <div class="row">${tw.closing ? html `<button class="btn prim sm" id="twNext">${t('tw.finish')}</button>` : html `<button class="btn prim sm" id="twNext">${tw.week >= tw.weeks ? t('tw.toClosing') : t('tw.next')}</button><button class="btn sm ghost" id="twSkip">${t('tw.skip')}</button>`}</div></section>`;
}
export function bindWindowBar(k) {
    const say = (r) => { save(); toast(r === 'closed' ? t('tw.done') : r === 'closing' ? t('tw.closing') : t('tw.week', { w: k.tw.week }), 'ok'); render(); };
    const n = $('twNext');
    if (n)
        n.onclick = () => say(nextWeek(k));
    const s = $('twSkip');
    if (s)
        s.onclick = async () => { if (await confirmBox(t('tw.skip.confirm'), t('tw.skip')))
            say(skipWindow(k)); };
}
const left = (until) => fmtLeft(until - Date.now());
export function renewTab(k) {
    const f = V.f;
    const tw = k.tw;
    const nOff = tw.offers.length + tw.listings.filter((l) => !!l.offer).length;
    const subs = [['pool', t('mng.pool')], ['offers', `${t('tw.offers')}${nOff ? ` (${nOff})` : ''}`], ['sell', t('mng.sellTitle')], ['scout', t('renew.scout')], ['youth', `${t('renew.academy')}${k.youth.length ? ` (${k.youth.length})` : ''}`]];
    let body;
    if (V.sub === 'pool') {
        const all = market(k);
        const rows = all.filter((m) => (!f.pos || m.p.natPos === f.pos) && (!f.st || (f.st === 'free' ? m.ti < 0 : !!m.listed)) && m.p.gg >= f.ggMin && m.p.gg <= f.ggMax && m.p.age <= f.ageMax && (!f.trait || m.p.traits.length > 0) && (!f.budget || (m.ask ?? marketValue(m.p)) <= k.fm))
            .map((m) => { const o = offerOf(k, m.p.id); return { p: m.p, price: m.ask, club: m.club, note: o ? html ` ${tag(t('offer.' + o.state), o.state === 'counter' ? 'y' : '')}` : '' }; });
        const opt = (vals, cur, any, lab) => vals.map((v) => html `<option value="${v}" ${v === cur ? raw('selected') : ''}>${v === any ? t('flt.any') : lab(v)}</option>`);
        body = html `<div class="filters">
        <label>${t('col.pos')}<select data-f="pos"><option value="">${t('flt.any')}</option>${POS_ORDER.map((x) => html `<option value="${x}" ${f.pos === x ? raw('selected') : ''}>${t('pos.' + x)}</option>`)}</select></label>
        <label>${t('flt.st')}<select data-f="st">${[['', t('flt.any')], ['sale', t('flt.sale')], ['free', t('pool.free')]].map(([v, l]) => html `<option value="${v}" ${f.st === v ? raw('selected') : ''}>${l}</option>`)}</select></label>
        <label>${t('flt.ggMin')}<select data-f="ggMin">${opt([0, 45, 50, 55, 60, 65, 70, 75, 80], f.ggMin, 0, (v) => v + '+')}</select></label>
        <label>${t('flt.ggMax')}<select data-f="ggMax">${opt([99, 80, 75, 70, 65, 60, 55], f.ggMax, 99, (v) => '≤' + v)}</select></label>
        <label>${t('flt.age')}<select data-f="ageMax">${opt([99, 21, 24, 27, 30], f.ageMax, 99, (v) => '≤' + v)}</select></label>
        <label class="chk"><input type="checkbox" data-f="trait" ${f.trait ? raw('checked') : ''}> ${t('flt.trait')}</label>
        <label class="chk"><input type="checkbox" data-f="budget" ${f.budget ? raw('checked') : ''}> ${t('flt.budget', { fm: money(k.fm) })}</label></div>
      ${table('pool', ['name', 'pos', 'gg', 'age', 'club', 'price', 'value', 'wage', 'trait'], rows, 'pool')}${muted(t('pool.count', { n: rows.length, all: all.length }))}`;
    }
    else if (V.sub === 'offers') {
        const mine = tw.offers.map((o) => html `<div class="li static"><div><div class="nm">${o.name} <small class="muted">${money(o.amount)}</small>${o.loan ? html ` ${tag(t('loan.tag'), 'o')}` : ''}</div><div class="sub">${t('offer.' + o.state)}${o.state === 'counter' ? ': ' + money(o.counter || 0) : ''}${o.state === 'rejected' && o.why ? ' · ' + t('why.' + o.why) : ''}</div></div><div class="acts">${o.state === 'counter' ? html `<button class="btn sm prim" data-cacc="${o.id}">${t('offer.accept')}</button>` : ''}${o.state === 'pending' || o.state === 'counter' ? html `<button class="btn sm ghost" data-owd="${o.id}">${o.state === 'counter' ? t('offer.decline') : t('offer.withdraw')}</button>` : ''}</div></div>`);
        const bids = tw.listings.map((l) => { const p = k.roster.find((x) => x.id === l.id); if (!p)
            return html ``; return html `<div class="li static"><div><div class="nm">${p.name} <small class="muted">${l.loan ? t('loan.listed') + ' ' + money(l.ask) : l.ask > 0 ? t('list.ask') + ' ' + money(l.ask) : t('list.unlisted')}</small></div><div class="sub">${l.offer ? t('list.bid', { club: l.offer.club, fm: money(l.offer.amount) }) : t('list.wait')}</div></div><div class="acts">${l.offer ? html `<button class="btn sm prim" data-bacc="${l.id}">${t('offer.accept')}</button><button class="btn sm ghost" data-bdec="${l.id}">${t('offer.decline')}</button>` : html `<button class="btn sm ghost" data-unl="${l.id}">${t('list.remove')}</button>`}</div></div>`; });
        body = html `${card(t('tw.myoffers'), mine.length ? html `<div class="list compact">${mine}</div>` : muted(t('tw.myoffers.none')))}${card(t('tw.mylist'), bids.length ? html `<div class="list compact">${bids}</div>` : muted(t('tw.mylist.none')))}`;
    }
    else if (V.sub === 'sell') {
        const rows = k.roster.map((p) => { const l = tw.listings.find((x) => x.id === p.id); return { p, note: l ? html ` ${tag(t('list.listed'), 'y')}` : '' }; });
        body = html `${muted(t('sell.desc'))}${table('sell', ['name', 'pos', 'gg', 'age', 'value', 'wage', 'end', 'trait', 'fat'], rows, 'squad')}`;
    }
    else if (V.sub === 'scout') {
        const sc = k.scout;
        const full = k.roster.length >= ROSTER_MAX;
        body = card(html `${t('renew.scout')} <small>${t('mng.roster', { n: k.roster.length, max: ROSTER_MAX })}</small>`, sc.found ? html `<div class="li" data-go="player" data-ctx='{"id":"${sc.found.id}","src":"scout"}'><div class="num">${sc.found.natPos}</div><div><div class="nm">${sc.found.name}</div><div class="sub">${t('squad.gg')} ${Math.round(sc.found.gg)} · ${sc.found.age} ${t('squad.age')} · ${money(sc.found.wage || 0)}${sc.found.traits.map((x) => ' · ' + x).join('')}</div></div><div class="gg">${money(marketValue(sc.found))}</div></div>
        <div class="row"><button class="btn prim sm" id="scSign" ${full || !canDeal(k) ? raw('disabled') : ''}>${t('scout.sign')}</button><button class="btn sm ghost" id="scDrop">${t('scout.drop')}</button></div>${canDeal(k) ? '' : muted(t('scout.wait'))}`
            : sc.job ? html `<div class="row"><span class="tag o">${t('scout.' + SCOUTS[sc.job.tier].id)} · ${left(sc.job.until)}</span>${store.db.rewards.boosts > 0 ? html `<button class="btn sm ghost" data-boost="scout">⚡ ${t('mng.boost')}</button>` : ''}</div>${muted(t('scout.running'))}`
                : html `<div class="row">${sel(t('scout.pos'), 'scPos', [['', t('scout.any')], ...POS_ORDER.map((x) => [x, t('pos.' + x)])], '')}</div>
        <div class="row wrap">${SCOUTS.map((s2, i) => html `<button class="btn sm" data-scout="${i}" ${k.fm < scoutCost(i) && !(i === 0 && k.scoutFree > 0) ? raw('disabled') : ''}>${t('scout.' + s2.id)} · ${t('squad.gg')} ${s2.gg[0]}–${s2.gg[1]} · ${i === 0 && k.scoutFree > 0 ? t('scout.free', { n: k.scoutFree }) : money(scoutCost(i))}</button>`)}</div>${muted(t('scout.desc'))}`);
    }
    else {
        body = card(t('renew.academy'), html `${k.youth.length ? html `<div class="list compact">${k.youth.map((p) => html `<div class="li static"><div class="num">${p.natPos}</div><div><div class="nm">${p.name}</div><div class="sub">${t('squad.gg')} ${Math.round(p.gg)} · ${p.age} ${t('squad.age')}${p.traits.map((x) => ' · ' + x).join('')}</div></div><div class="acts"><button class="btn sm prim" data-promo="${p.id}" ${k.roster.length >= ROSTER_MAX ? raw('disabled') : ''}>${t('youth.promote')}</button></div></div>`)}</div>` : muted(k.facilities.academy.level ? t('youth.none') : t('fac.academy.none'))}${muted(t('youth.rule'))}`);
    }
    return html `${windowBar(k)}<div class="seg sub wrapseg" id="rSub">${subs.map(([v, l]) => html `<button data-v="${v}" aria-pressed="${V.sub === v}">${l}</button>`)}</div>${body}
    ${V.sub === 'pool' && k.news.length ? card(t('mng.news'), html `${k.news.map((x) => { const [a, b, n, g] = x.split('|'); return html `<p class="muted small">${t(['buy', 'free', 'clause', 'loan'].includes(a) ? 'news.' + a : 'news.sell', { club: b, name: n, gg: g })}</p>`; })}`) : ''}`;
}
export function bindRenew(root, k, re, fail) {
    bindWindowBar(k);
    const rs = $('rSub');
    if (rs)
        rs.onclick = (e) => { const b = e.target.closest('button'); if (b) {
            V.sub = b.dataset.v;
            render();
        } };
    for (const b of root.querySelectorAll('[data-sort]'))
        b.onclick = (e) => { e.stopPropagation(); const id = b.closest('[data-tbl]').dataset.tbl; const s = V.sort[id]; if (s.k === b.dataset.sort)
            s.d = -s.d;
        else {
            s.k = b.dataset.sort;
            s.d = COLS[s.k].num ? -1 : 1;
        } render(); };
    for (const el of root.querySelectorAll('[data-f]'))
        el.onchange = () => { const key = el.dataset.f; V.f[key] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : key === 'pos' || key === 'st' ? el.value : +el.value; render(); };
    for (const b of root.querySelectorAll('[data-scout]'))
        b.onclick = () => { const r = startScout(k, +b.dataset.scout, ($('scPos').value || '')); if (r === 'ok') {
            track(store.db, { t: 'scout' });
            re(t('scout.started'));
        }
        else
            fail(r); };
    const ss = $('scSign');
    if (ss)
        ss.onclick = () => { if (canDeal(k) && signFound(k))
            re(t('scout.signed')); };
    const sd = $('scDrop');
    if (sd)
        sd.onclick = () => { k.scout.found = null; re(); };
    for (const b of root.querySelectorAll('[data-cacc]'))
        b.onclick = () => { const r = acceptCounter(k, b.dataset.cacc); if (r === 'ok') {
            track(store.db, { t: 'market' });
            re(t('mng.bought'));
        }
        else
            fail(r); };
    for (const b of root.querySelectorAll('[data-owd]'))
        b.onclick = () => { withdrawOffer(k, b.dataset.owd); re(); };
    for (const b of root.querySelectorAll('[data-bacc]'))
        b.onclick = () => { const r = acceptBid(k, b.dataset.bacc); if (r === 'ok') {
            track(store.db, { t: 'sale' });
            re(t('mng.sold'));
        }
        else
            fail(r); };
    for (const b of root.querySelectorAll('[data-bdec]'))
        b.onclick = () => { declineBid(k, b.dataset.bdec); re(); };
    for (const b of root.querySelectorAll('[data-unl]'))
        b.onclick = () => { unlist(k, b.dataset.unl); re(); };
    for (const b of root.querySelectorAll('[data-promo]'))
        b.onclick = () => { if (promoteYouth(k, b.dataset.promo))
            re(k.tw.open ? t('youth.promoted') : t('youth.promoted.nocup')); };
}
// ---- futbolcu sayfasi: tum bilgiler, islemler, kiyaslama ----
register('player', (c) => {
    const k = store.db.career;
    if (!k) {
        go('home', {});
        return { html: '' };
    }
    const it = c.src === 'pool' ? findMarket(k, c.id) : null;
    const p = c.src === 'pool' ? it?.p : c.src === 'scout' ? (k.scout.found && k.scout.found.id === c.id ? k.scout.found : undefined) : k.roster.find((x) => x.id === c.id);
    if (!p) {
        go('career', { tab: 'renew' });
        return { html: '' };
    }
    const deal = canDeal(k);
    const full = k.roster.length >= ROSTER_MAX;
    const o = offerOf(k, p.id);
    const lst = k.tw.listings.find((l) => l.id === p.id);
    const info = (lab, val) => html `<div class="kv"><span>${lab}</span><b>${val}</b></div>`;
    const pct = (base, list, id, def) => html `<select id="${id}">${list.map((x) => html `<option value="${x}" ${x === def ? raw('selected') : ''}>%${x} · ${money(Math.round((base * x) / 1000) * 10)}</option>`)}</select>`;
    const season = k.league.season;
    const v0 = marketValue(p);
    const terms = (pre, optBase) => html `<div class="filters"><label>${t('loan.years')}<select id="${pre}Y">${[0, 1, 2].map((y) => html `<option value="${y}">${y ? t('loan.y', { n: y }) : t('loan.y0')}</option>`)}</select></label>
      <label>${t('loan.share')}<select id="${pre}S">${[100, 50, 0].map((x) => html `<option value="${x}">${t('loan.share.' + x)}</option>`)}</select></label>
      <label>${t('loan.fee')}<select id="${pre}F">${LOAN_FEES.map((x) => html `<option value="${x}" ${x === 10 ? raw('selected') : ''}>%${x}</option>`)}</select></label>
      <label>${t('loan.opt')}<select id="${pre}O"><option value="0">${t('loan.opt.none')}</option>${[100, 120, 150, 200].map((x) => html `<option value="${x}">${money(Math.round((optBase * x) / 1000) * 10)}</option>`)}</select></label></div>`;
    const readTerms = (pre, optBase) => { const g = (x) => +$(pre + x).value; const y = g('Y'), o = g('O'); return { fee: loanFee(p, g('F'), y), terms: { years: y, share: g('S'), opt: o ? Math.round((optBase * o) / 1000) * 10 : undefined } }; };
    let actions = html ``;
    let extra = html ``;
    if (c.src === 'pool' && it)
        actions = card(t('pl.actions'), html `
      ${it.ask !== undefined ? html `<div class="row"><button class="btn prim" id="pBuy" ${!deal || full || k.fm < it.ask ? raw('disabled') : ''}>${t('pl.buynow', { fm: money(it.ask) })}</button></div>` : muted(t('pl.notlisted', { club: it.club }))}
      <div class="row"><label class="f inline">${t('pl.offer')} ${pct(marketValue(p), [0, 25, 50, 70, 80, 90, 100, 110, 125, 150, 200], 'pOfferPct', it.ask !== undefined ? Math.max(25, [25, 50, 70, 80, 90, 100, 110, 125].filter((x) => (marketValue(p) * x) / 100 <= it.ask * 0.92).pop() || 25) : 110)}</label><button class="btn" id="pOffer" ${!deal ? raw('disabled') : ''}>${o ? t('pl.offer.update') : t('pl.offer.send')}</button></div>
      ${o ? html `<p class="muted small">${t('pl.offer.state', { fm: money(o.amount), s: t('offer.' + o.state) })}${o.state === 'counter' ? ` ${money(o.counter || 0)}` : ''}${o.state === 'rejected' && o.why ? ' · ' + t('why.' + o.why) : ''}</p>${o.state === 'counter' ? html `<div class="row"><button class="btn prim sm" id="pCounter">${t('offer.accept')} · ${money(o.counter || 0)}</button></div>` : ''}` : ''}
      <p class="muted small">${deal ? t('pl.offer.hint') : k.tw.open ? t('tw.closing.desc') : t('tw.closed.desc')} · ${t('home.wallet', { fm: money(k.fm) })}</p>`);
    if (c.src === 'pool' && it && it.ti >= 0)
        extra = html `${p.clause ? card(t('cl.title'), html `<p>${t('cl.desc', { fm: money(p.clause) })}</p><div class="row"><button class="btn" id="pClause" ${!deal || full || k.fm < p.clause ? raw('disabled') : ''}>${t('cl.pay', { fm: money(p.clause) })}</button></div>`) : ''}
      ${card(t('loan.req'), html `${terms('lr', v0)}<div class="row"><button class="btn" id="pLoan" ${!deal ? raw('disabled') : ''}>${t('loan.send')}</button></div>${muted(t('loan.req.hint'))}`)}`;
    if (c.src === 'squad' && p.loan) {
        const own = k.league.teams[p.loan.from];
        actions = card(t('loan.tag'), html `<p>${t('loan.info', { club: own ? own.short : '', s: p.loan.until, share: p.loan.share })}</p>${p.loan.opt ? html `<div class="row"><button class="btn prim" id="pOpt" ${k.fm < p.loan.opt ? raw('disabled') : ''}>${t('loan.opt.use', { fm: money(p.loan.opt) })}</button></div>${muted(t('loan.opt.hint'))}` : muted(t('loan.noopt'))}`);
    }
    else if (c.src === 'squad') {
        const v = sellPrice(p) / 0.9;
        const my = Math.min(maxYears(p), 5);
        extra = html `${card(t('con.title'), html `<p>${t('con.now', { s: p.end || season, w: money(p.wage || 0) })}${p.clause ? ' · ' + t('cl.short', { fm: money(p.clause) }) : ''}</p>
        <div class="filters"><label>${t('con.years')}<select id="cnY">${Array.from({ length: my }, (_, i) => i + 1).map((y) => html `<option value="${y}" ${y === Math.min(2, my) ? raw('selected') : ''}>${t('loan.y', { n: y })}</option>`)}</select></label>
        <label>${t('cl.title')}<select id="cnC">${CLAUSES.map((x) => html `<option value="${x}" ${x === 3 ? raw('selected') : ''}>${x ? money(Math.round((v0 * x) / 10) * 10) : t('cl.none')} · ${money(renewDemand(k, p, x))}${t('con.perweek')}</option>`)}</select></label></div>
        <div class="row"><button class="btn" id="pRenew">${t('con.renew')}</button></div>${muted(t('con.hint'))}`)}
      ${card(t('loan.out'), html `${terms('lo', v0)}<div class="row"><button class="btn" id="pLoanList" ${!deal ? raw('disabled') : ''}>${t('loan.list')}</button></div>${muted(t('loan.out.hint'))}`)}`;
        actions = card(t('pl.actions'), html `
      <div class="row"><button class="btn danger" id="pQuick" ${!deal ? raw('disabled') : ''}>${t('pl.quicksell', { fm: money(sellPrice(p)) })}</button></div>
      <div class="row"><label class="f inline">${t('list.ask')} ${pct(v, [90, 100, 110, 120, 130], 'pAskPct', 110)}</label><button class="btn" id="pList" ${!deal ? raw('disabled') : ''}>${lst ? t('pl.list.update') : t('pl.list')}</button>${lst ? html `<button class="btn ghost sm" id="pUnlist">${t('list.remove')}</button>` : ''}</div>
      ${lst ? html `<p class="muted small">${t('list.listed')}: ${money(lst.ask)}${lst.offer ? ' · ' + t('list.bid', { club: lst.offer.club, fm: money(lst.offer.amount) }) : ''}</p>` : ''}
      <p class="muted small">${deal ? t('pl.list.hint') : k.tw.open ? t('tw.closing.desc') : t('tw.closed.desc')}</p>`);
    }
    else if (c.src === 'scout')
        actions = card(t('pl.actions'), html `<div class="row"><button class="btn prim" id="pSign" ${!deal || full ? raw('disabled') : ''}>${t('scout.sign')}</button></div>${deal ? '' : muted(t('scout.wait'))}`);
    // kiyaslama: aday ile kendi futbolcum yan yana; iyi olan yesil
    let cmp = html ``;
    if (c.src !== 'squad') {
        const mineSorted = [...k.roster].sort((a, b) => (a.natPos === p.natPos ? 0 : 1) - (b.natPos === p.natPos ? 0 : 1) || b.gg - a.gg);
        const q = k.roster.find((x) => x.id === c.cmp) || mineSorted[0];
        const rowc = (lab, a, b, fmt, higherBetter = true) => { const better = a === b ? 0 : (a > b) === higherBetter ? 1 : -1; return html `<tr><td>${lab}</td><td class="n ${better > 0 ? 'pos' : better < 0 ? 'neg' : ''}">${fmt(a)}</td><td class="n ${better < 0 ? 'pos' : better > 0 ? 'neg' : ''}">${fmt(b)}</td><td class="n muted">${a === b ? '=' : (a > b ? '+' : '−') + fmt(Math.abs(a - b))}</td></tr>`; };
        if (q)
            cmp = card(t('pl.compare'), html `<label class="f">${t('pl.compare.with')}<select id="pCmp">${mineSorted.map((x) => html `<option value="${x.id}" ${x.id === q.id ? raw('selected') : ''}>${x.natPos} · ${x.name} · ${Math.round(x.gg)}</option>`)}</select></label>
      <table class="grid cmp"><thead><tr><th></th><th class="n">${p.name}</th><th class="n">${q.name}</th><th class="n">${t('pl.diff')}</th></tr></thead><tbody>
        ${rowc(t('col.gg'), Math.round(p.gg), Math.round(q.gg), String)}${rowc(t('col.age'), p.age, q.age, String, false)}${rowc(t('col.trait'), p.traits.length, q.traits.length, String)}
        ${rowc(t('col.wage'), p.wage || 0, q.wage || 0, money, false)}${rowc(t('col.value'), marketValue(p), marketValue(q), money)}</tbody></table>
      <p class="muted small">${p.natPos} · ${p.traits.join(', ') || '–'} &nbsp;|&nbsp; ${q.natPos} · ${q.traits.join(', ') || '–'}</p>`);
    }
    return { title: p.name, tabs: careerTabs('renew'), onTab: onCareerTab, html: html `
    <section class="card hero"><h3>${p.name} <small>${t('pos.' + p.natPos)}${it && it.club ? ' · ' + it.club : it ? ' · ' + t('pool.free') : ''}</small></h3>
      <div class="kvs">${info(t('col.gg'), String(Math.round(p.gg)))}${info(t('col.age'), String(p.age))}${info(t('col.value'), money(marketValue(p)))}${info(t('col.wage'), html `${money(p.wage || 0)}${overpaid(p) ? html ` ${tag(t('wage.over'), 'o')}` : ''}`)}${info(t('pl.fairwage'), money(wageFor(p.gg)))}${info(t('col.trait'), p.traits.join(', ') || '–')}${p.end ? info(t('col.end'), t('con.until', { s: p.end })) : ''}${p.clause ? info(t('cl.title'), money(p.clause)) : ''}${c.src === 'squad' ? info(t('col.fat'), String(Math.round(p.fatigue))) : ''}</div></section>
    <div class="cards two">${actions}${extra}${cmp}</div>`, after: () => {
            const back = (msg) => { save(); toast(msg, 'ok'); go('career', { tab: 'renew' }); };
            const fail = (r) => toast(t('mng.err.' + r), 'err');
            const pb = $('pBuy');
            if (pb)
                pb.onclick = () => { const r = buyNow(k, p.id); if (r === 'ok') {
                    track(store.db, { t: 'market' });
                    back(t('mng.bought'));
                }
                else
                    fail(r); };
            const po = $('pOffer');
            if (po && it)
                po.onclick = () => { const amt = Math.round((marketValue(p) * +$('pOfferPct').value) / 1000) * 10; if (sendOffer(k, p.id, amt) === 'ok') {
                    track(store.db, { t: 'market' });
                    save();
                    toast(t('pl.offer.sent'), 'ok');
                    render();
                } };
            const pc = $('pCounter');
            if (pc)
                pc.onclick = () => { const r = acceptCounter(k, p.id); if (r === 'ok')
                    back(t('mng.bought'));
                else
                    fail(r); };
            const pq = $('pQuick');
            if (pq)
                pq.onclick = async () => { if (!(await confirmBox(t('mng.sell.confirm', { name: p.name, fm: money(sellPrice(p)) }), t('mng.sell'), true)))
                    return; const r = quickSell(k, p.id); if (r === 'ok') {
                    track(store.db, { t: 'sale' });
                    back(t('mng.sold'));
                }
                else
                    fail(r); };
            const pl = $('pList');
            if (pl)
                pl.onclick = () => { const v = sellPrice(p) / 0.9; if (listPlayer(k, p.id, Math.round((v * +$('pAskPct').value) / 1000) * 10) === 'ok') {
                    save();
                    toast(t('pl.listed'), 'ok');
                    render();
                } };
            const pu = $('pUnlist');
            if (pu)
                pu.onclick = () => { unlist(k, p.id); save(); render(); };
            const ps = $('pSign');
            if (ps)
                ps.onclick = () => { if (canDeal(k) && signFound(k))
                    back(t('scout.signed')); };
            const pcl = $('pClause');
            if (pcl && it)
                pcl.onclick = async () => { if (!(await confirmBox(t('cl.confirm', { name: p.name, fm: money(p.clause || 0) }), t('cl.title'))))
                    return; const r = payClause(k, it.ti, p.id); if (r === 'ok') {
                    track(store.db, { t: 'market' });
                    back(t('mng.bought'));
                }
                else
                    fail(r); };
            const plo = $('pLoan');
            if (plo)
                plo.onclick = () => { const x = readTerms('lr', v0); if (sendLoanOffer(k, p.id, x.fee, x.terms) === 'ok') {
                    save();
                    toast(t('loan.sent', { fm: money(x.fee) }), 'ok');
                    render();
                } };
            const pop = $('pOpt');
            if (pop)
                pop.onclick = () => { const r = exerciseOption(k, p.id); if (r === 'ok') {
                    save();
                    toast(t('mng.bought'), 'ok');
                    render();
                }
                else
                    fail(r); };
            const prn = $('pRenew');
            if (prn)
                prn.onclick = () => { if (renew(k, p.id, +$('cnY').value, +$('cnC').value)) {
                    save();
                    toast(t('con.renewed'), 'ok');
                    render();
                } };
            const pll = $('pLoanList');
            if (pll)
                pll.onclick = () => { const x = readTerms('lo', v0); if (listLoan(k, p.id, x.fee, x.terms) === 'ok') {
                    save();
                    toast(t('loan.listed.toast'), 'ok');
                    render();
                } };
            const pm = $('pCmp');
            if (pm)
                pm.onchange = () => go('player', { ...c, cmp: pm.value });
        } };
});
