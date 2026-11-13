// Kadro yenileme sekmesi: transfer donemi seridi, Havuz (siralanabilir tablo + filtre) · Teklifler · Satis · Scout · Altyapi; futbolcu sayfasi ve kiyaslama.
import { $, html, raw, type Raw } from '../core/html.js';
import { t, money } from '../core/i18n.js';
import { go, register, render } from '../core/router.js';
import { store, save } from '../core/store.js';
import { card, confirmBox, muted, sel, tag, toast } from '../core/ui.js';
import type { Career, RosterPlayer } from '../model/types.js';
import { ROSTER_MAX, SCOUTS, fmtLeft, marketValue, overpaid, scoutCost, sellPrice, signFound, startScout, wageFor } from '../model/manage.js';
import { acceptBid, acceptCounter, buyNow, canDeal, declineBid, listPlayer, nextWeek, offerOf, promoteYouth, quickSell, sendOffer, skipWindow, unlist, withdrawOffer } from '../model/transfer.js';
import { track } from '../model/missions.js';
import { careerTabs, onCareerTab } from './career.js';

type Col = { k: string; label: string; num?: boolean; get: (r: Row) => number | string; show: (r: Row) => Raw | string; wide?: boolean };
type Row = { p: RosterPlayer; price?: number; left?: number; fresh?: boolean; club?: string; note?: Raw | string };
const POS_ORDER = ['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'];
// gorunum durumu (ekranlar arasi gecerken korunur)
const V = { sub: 'pool' as 'pool' | 'offers' | 'sell' | 'scout' | 'youth', sort: { pool: { k: 'gg', d: -1 }, sell: { k: 'gg', d: -1 } } as Record<string, { k: string; d: number }>, f: { pos: '', ggMin: 0, ggMax: 99, ageMax: 99, trait: false, budget: false } };
const COLS: Record<string, Col> = {
  pos: { k: 'pos', label: 'col.pos', get: (r) => POS_ORDER.indexOf(r.p.natPos), show: (r) => html`<b class="ps">${r.p.natPos}</b>` },
  name: { k: 'name', label: 'col.name', wide: true, get: (r) => r.p.name, show: (r) => html`${r.p.name}${r.fresh ? html` ${tag(t('pool.new'), 'g')}` : ''}${r.note || ''}` },
  age: { k: 'age', label: 'col.age', num: true, get: (r) => r.p.age, show: (r) => String(r.p.age) },
  gg: { k: 'gg', label: 'col.gg', num: true, get: (r) => r.p.gg, show: (r) => html`<b>${Math.round(r.p.gg)}</b>` },
  trait: { k: 'trait', label: 'col.trait', get: (r) => r.p.traits.length, show: (r) => r.p.traits.join(', ') || '–' },
  wage: { k: 'wage', label: 'col.wage', num: true, get: (r) => r.p.wage || 0, show: (r) => html`<span class="${overpaid(r.p) ? 'neg' : ''}">${money(r.p.wage || 0)}</span>` },
  value: { k: 'value', label: 'col.value', num: true, get: (r) => marketValue(r.p), show: (r) => money(marketValue(r.p)) },
  price: { k: 'price', label: 'col.price', num: true, get: (r) => r.price || 0, show: (r) => html`<b>${money(r.price || 0)}</b>` },
  fat: { k: 'fat', label: 'col.fat', num: true, get: (r) => r.p.fatigue, show: (r) => String(Math.round(r.p.fatigue)) },
  club: { k: 'club', label: 'col.club', get: (r) => r.club || '', show: (r) => r.club || t('pool.free') },
  left: { k: 'left', label: 'col.left', num: true, get: (r) => r.left || 0, show: (r) => t('pool.weeks', { n: r.left || 0 }) },
};
// siralanabilir tablo: basliga dokun = sirala, tekrar dokun = ters cevir; satira dokun = futbolcu sayfasi
function table(id: string, cols: string[], rows: Row[], src: string): Raw {
  const s = V.sort[id]; const c = COLS[s.k] || COLS.gg;
  const sorted = [...rows].sort((a, b) => { const x = c.get(a), y = c.get(b); return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * s.d; });
  return html`<div class="tblwrap"><table class="grid" data-tbl="${id}"><thead><tr>${cols.map((k) => html`<th class="${COLS[k].num ? 'n' : ''} ${COLS[k].wide ? 'w' : ''}"><button data-sort="${k}">${t(COLS[k].label)}${s.k === k ? (s.d < 0 ? ' ▾' : ' ▴') : ''}</button></th>`)}</tr></thead>
    <tbody>${sorted.map((r) => html`<tr data-go="player" data-ctx='${JSON.stringify({ id: r.p.id, src })}'>${cols.map((k) => html`<td class="${COLS[k].num ? 'n' : ''} ${COLS[k].wide ? 'w' : ''}">${COLS[k].show(r)}</td>`)}</tr>`)}</tbody></table></div>${rows.length ? '' : muted(t('pool.nomatch'))}`;
}
const winLabel = (k: Career) => k.tw.open ? (k.tw.closing ? t('tw.closing') : t('tw.open', { kind: t('tw.' + k.tw.kind), w: k.tw.week, n: k.tw.weeks })) : t('tw.closed');
// transfer donemi seridi (Mac ve Kadro yenileme sekmelerinde)
export function windowBar(k: Career): Raw {
  const tw = k.tw; const pend = tw.offers.filter((o) => o.state === 'pending').length, wait = tw.offers.filter((o) => o.state === 'counter').length + tw.listings.filter((l) => !!l.offer).length;
  if (!tw.open) return html`<section class="card twbar closed"><b>${t('tw.closed')}</b><span class="muted small">${t('tw.closed.desc')}</span></section>`;
  return html`<section class="card twbar hero"><div><b>${winLabel(k)}</b><br><span class="muted small">${tw.closing ? t('tw.closing.desc') : t('tw.desc')}${pend ? ' · ' + t('tw.pending', { n: pend }) : ''}${wait ? ' · ' + t('tw.waiting', { n: wait }) : ''}</span></div>
    <div class="row">${tw.closing ? html`<button class="btn prim sm" id="twNext">${t('tw.finish')}</button>` : html`<button class="btn prim sm" id="twNext">${tw.week >= tw.weeks ? t('tw.toClosing') : t('tw.next')}</button><button class="btn sm ghost" id="twSkip">${t('tw.skip')}</button>`}</div></section>`;
}
export function bindWindowBar(k: Career) {
  const say = (r: string) => { save(); toast(r === 'closed' ? t('tw.done') : r === 'closing' ? t('tw.closing') : t('tw.week', { w: k.tw.week }), 'ok'); render(); };
  const n = $('twNext'); if (n) n.onclick = () => say(nextWeek(k));
  const s = $('twSkip'); if (s) s.onclick = async () => { if (await confirmBox(t('tw.skip.confirm'), t('tw.skip'))) say(skipWindow(k)); };
}
const left = (until: number) => fmtLeft(until - Date.now());
export function renewTab(k: Career): Raw {
  const f = V.f; const tw = k.tw;
  const nOff = tw.offers.length + tw.listings.filter((l) => !!l.offer).length;
  const subs: [string, string][] = [['pool', `${t('mng.pool')} (${k.pool.length})`], ['offers', `${t('tw.offers')}${nOff ? ` (${nOff})` : ''}`], ['sell', t('mng.sellTitle')], ['scout', t('renew.scout')], ['youth', `${t('renew.academy')}${k.youth.length ? ` (${k.youth.length})` : ''}`]];
  let body: Raw;
  if (V.sub === 'pool') {
    const rows: Row[] = k.pool.filter((it) => (!f.pos || it.p.natPos === f.pos) && it.p.gg >= f.ggMin && it.p.gg <= f.ggMax && it.p.age <= f.ageMax && (!f.trait || it.p.traits.length > 0) && (!f.budget || it.price <= k.fm))
      .map((it) => { const o = offerOf(k, it.p.id); return { p: it.p, price: it.price, left: it.left, fresh: it.fresh, club: it.club, note: o ? html` ${tag(t('offer.' + o.state), o.state === 'counter' ? 'y' : '')}` : '' }; });
    const opt = (vals: number[], cur: number, any: number, lab: (v: number) => string) => vals.map((v) => html`<option value="${v}" ${v === cur ? raw('selected') : ''}>${v === any ? t('flt.any') : lab(v)}</option>`);
    body = html`<div class="filters">
        <label>${t('col.pos')}<select data-f="pos"><option value="">${t('flt.any')}</option>${POS_ORDER.map((x) => html`<option value="${x}" ${f.pos === x ? raw('selected') : ''}>${t('pos.' + x)}</option>`)}</select></label>
        <label>${t('flt.ggMin')}<select data-f="ggMin">${opt([0, 45, 50, 55, 60, 65, 70, 75, 80], f.ggMin, 0, (v) => v + '+')}</select></label>
        <label>${t('flt.ggMax')}<select data-f="ggMax">${opt([99, 80, 75, 70, 65, 60, 55], f.ggMax, 99, (v) => '≤' + v)}</select></label>
        <label>${t('flt.age')}<select data-f="ageMax">${opt([99, 21, 24, 27, 30], f.ageMax, 99, (v) => '≤' + v)}</select></label>
        <label class="chk"><input type="checkbox" data-f="trait" ${f.trait ? raw('checked') : ''}> ${t('flt.trait')}</label>
        <label class="chk"><input type="checkbox" data-f="budget" ${f.budget ? raw('checked') : ''}> ${t('flt.budget', { fm: money(k.fm) })}</label></div>
      ${table('pool', ['name', 'pos', 'gg', 'age', 'price', 'wage', 'trait', 'club', 'left'], rows, 'pool')}`;
  } else if (V.sub === 'offers') {
    const mine = tw.offers.map((o) => html`<div class="li static"><div><div class="nm">${o.name} <small class="muted">${money(o.amount)}</small></div><div class="sub">${t('offer.' + o.state)}${o.state === 'counter' ? ': ' + money(o.counter || 0) : ''}</div></div><div class="acts">${o.state === 'counter' ? html`<button class="btn sm prim" data-cacc="${o.id}">${t('offer.accept')}</button>` : ''}${o.state === 'pending' || o.state === 'counter' ? html`<button class="btn sm ghost" data-owd="${o.id}">${o.state === 'counter' ? t('offer.decline') : t('offer.withdraw')}</button>` : ''}</div></div>`);
    const bids = tw.listings.map((l) => { const p = k.roster.find((x) => x.id === l.id); if (!p) return html``; return html`<div class="li static"><div><div class="nm">${p.name} <small class="muted">${t('list.ask')} ${money(l.ask)}</small></div><div class="sub">${l.offer ? t('list.bid', { club: l.offer.club, fm: money(l.offer.amount) }) : t('list.wait')}</div></div><div class="acts">${l.offer ? html`<button class="btn sm prim" data-bacc="${l.id}">${t('offer.accept')}</button><button class="btn sm ghost" data-bdec="${l.id}">${t('offer.decline')}</button>` : html`<button class="btn sm ghost" data-unl="${l.id}">${t('list.remove')}</button>`}</div></div>`; });
    body = html`${card(t('tw.myoffers'), mine.length ? html`<div class="list compact">${mine}</div>` : muted(t('tw.myoffers.none')))}${card(t('tw.mylist'), bids.length ? html`<div class="list compact">${bids}</div>` : muted(t('tw.mylist.none')))}`;
  } else if (V.sub === 'sell') {
    const rows: Row[] = k.roster.map((p) => { const l = tw.listings.find((x) => x.id === p.id); return { p, note: l ? html` ${tag(t('list.listed'), 'y')}` : '' }; });
    body = html`${muted(t('sell.desc'))}${table('sell', ['name', 'pos', 'gg', 'age', 'value', 'wage', 'trait', 'fat'], rows, 'squad')}`;
  } else if (V.sub === 'scout') {
    const sc = k.scout; const full = k.roster.length >= ROSTER_MAX;
    body = card(html`${t('renew.scout')} <small>${t('mng.roster', { n: k.roster.length, max: ROSTER_MAX })}</small>`, sc.found ? html`<div class="li" data-go="player" data-ctx='{"id":"${sc.found.id}","src":"scout"}'><div class="num">${sc.found.natPos}</div><div><div class="nm">${sc.found.name}</div><div class="sub">${t('squad.gg')} ${Math.round(sc.found.gg)} · ${sc.found.age} ${t('squad.age')} · ${money(sc.found.wage || 0)}${sc.found.traits.map((x) => ' · ' + x).join('')}</div></div><div class="gg">${money(marketValue(sc.found))}</div></div>
        <div class="row"><button class="btn prim sm" id="scSign" ${full || !canDeal(k) ? raw('disabled') : ''}>${t('scout.sign')}</button><button class="btn sm ghost" id="scDrop">${t('scout.drop')}</button></div>${canDeal(k) ? '' : muted(t('scout.wait'))}`
      : sc.job ? html`<div class="row"><span class="tag o">${t('scout.' + SCOUTS[sc.job.tier].id)} · ${left(sc.job.until)}</span>${store.db.rewards.boosts > 0 ? html`<button class="btn sm ghost" data-boost="scout">⚡ ${t('mng.boost')}</button>` : ''}</div>${muted(t('scout.running'))}`
      : html`<div class="row">${sel(t('scout.pos'), 'scPos', [['', t('scout.any')], ...POS_ORDER.map((x) => [x, t('pos.' + x)] as [string, string])], '')}</div>
        <div class="row wrap">${SCOUTS.map((s2, i) => html`<button class="btn sm" data-scout="${i}" ${k.fm < scoutCost(i) && !(i === 0 && k.scoutFree > 0) ? raw('disabled') : ''}>${t('scout.' + s2.id)} · ${t('squad.gg')} ${s2.gg[0]}–${s2.gg[1]} · ${i === 0 && k.scoutFree > 0 ? t('scout.free', { n: k.scoutFree }) : money(scoutCost(i))}</button>`)}</div>${muted(t('scout.desc'))}`);
  } else {
    body = card(t('renew.academy'), html`${k.youth.length ? html`<div class="list compact">${k.youth.map((p) => html`<div class="li static"><div class="num">${p.natPos}</div><div><div class="nm">${p.name}</div><div class="sub">${t('squad.gg')} ${Math.round(p.gg)} · ${p.age} ${t('squad.age')}${p.traits.map((x) => ' · ' + x).join('')}</div></div><div class="acts"><button class="btn sm prim" data-promo="${p.id}" ${k.roster.length >= ROSTER_MAX ? raw('disabled') : ''}>${t('youth.promote')}</button></div></div>`)}</div>` : muted(k.facilities.academy.level ? t('youth.none') : t('fac.academy.none'))}${muted(t('youth.rule'))}`);
  }
  return html`${windowBar(k)}<div class="seg sub wrapseg" id="rSub">${subs.map(([v, l]) => html`<button data-v="${v}" aria-pressed="${V.sub === v}">${l}</button>`)}</div>${body}
    ${V.sub === 'pool' && k.news.length ? card(t('mng.news'), html`${k.news.map((x) => { const [a, b, n, g] = x.split('|'); return html`<p class="muted small">${a === 'buy' ? t('news.buy', { club: b, name: n, gg: g }) : t('news.sell', { club: b, name: n, gg: g })}</p>`; })}`) : ''}`;
}
export function bindRenew(root: HTMLElement, k: Career, re: (msg?: string, kind?: '' | 'ok' | 'err') => void, fail: (r: string) => void) {
  bindWindowBar(k);
  const rs = $('rSub'); if (rs) rs.onclick = (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (b) { V.sub = b.dataset.v as any; render(); } };
  for (const b of root.querySelectorAll<HTMLElement>('[data-sort]')) b.onclick = (e) => { e.stopPropagation(); const id = b.closest<HTMLElement>('[data-tbl]')!.dataset.tbl!; const s = V.sort[id]; if (s.k === b.dataset.sort) s.d = -s.d; else { s.k = b.dataset.sort!; s.d = COLS[s.k].num ? -1 : 1; } render(); };
  for (const el of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]')) el.onchange = () => { const key = el.dataset.f!; (V.f as any)[key] = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : key === 'pos' ? el.value : +el.value; render(); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-scout]')) b.onclick = () => { const r = startScout(k, +b.dataset.scout!, (($('scPos') as HTMLSelectElement).value || '') as any); if (r === 'ok') { track(store.db, { t: 'scout' }); re(t('scout.started')); } else fail(r); };
  const ss = $('scSign'); if (ss) ss.onclick = () => { if (canDeal(k) && signFound(k)) re(t('scout.signed')); };
  const sd = $('scDrop'); if (sd) sd.onclick = () => { k.scout.found = null; re(); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-cacc]')) b.onclick = () => { const r = acceptCounter(k, b.dataset.cacc!); if (r === 'ok') { track(store.db, { t: 'market' }); re(t('mng.bought')); } else fail(r); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-owd]')) b.onclick = () => { withdrawOffer(k, b.dataset.owd!); re(); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-bacc]')) b.onclick = () => { const r = acceptBid(k, b.dataset.bacc!); if (r === 'ok') { track(store.db, { t: 'sale' }); re(t('mng.sold')); } else fail(r); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-bdec]')) b.onclick = () => { declineBid(k, b.dataset.bdec!); re(); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-unl]')) b.onclick = () => { unlist(k, b.dataset.unl!); re(); };
  for (const b of root.querySelectorAll<HTMLElement>('[data-promo]')) b.onclick = () => { if (promoteYouth(k, b.dataset.promo!)) re(k.tw.open ? t('youth.promoted') : t('youth.promoted.nocup')); };
}

// ---- futbolcu sayfasi: tum bilgiler, islemler, kiyaslama ----
register('player', (c: { id: string; src: 'pool' | 'squad' | 'scout'; cmp?: string }) => {
  const k = store.db.career; if (!k) { go('home', {}); return { html: '' }; }
  const it = c.src === 'pool' ? k.pool.find((x) => x.p.id === c.id) : null;
  const p = c.src === 'pool' ? it?.p : c.src === 'scout' ? (k.scout.found && k.scout.found.id === c.id ? k.scout.found : undefined) : k.roster.find((x) => x.id === c.id);
  if (!p) { go('career', { tab: 'renew' }); return { html: '' }; }
  const deal = canDeal(k); const full = k.roster.length >= ROSTER_MAX; const o = offerOf(k, p.id); const lst = k.tw.listings.find((l) => l.id === p.id);
  const info = (lab: string, val: Raw | string) => html`<div class="kv"><span>${lab}</span><b>${val}</b></div>`;
  const pct = (base: number, list: number[], id: string, def: number) => html`<select id="${id}">${list.map((x) => html`<option value="${x}" ${x === def ? raw('selected') : ''}>%${x} · ${money(Math.round((base * x) / 1000) * 10)}</option>`)}</select>`;
  let actions: Raw = html``;
  if (c.src === 'pool' && it) actions = card(t('pl.actions'), html`
      <div class="row"><button class="btn prim" id="pBuy" ${!deal || full || k.fm < it.price ? raw('disabled') : ''}>${t('pl.buynow', { fm: money(it.price) })}</button></div>
      <div class="row"><label class="f inline">${t('pl.offer')} ${pct(it.price, [70, 75, 80, 85, 90, 95], 'pOfferPct', 85)}</label><button class="btn" id="pOffer" ${!deal ? raw('disabled') : ''}>${o ? t('pl.offer.update') : t('pl.offer.send')}</button></div>
      ${o ? html`<p class="muted small">${t('pl.offer.state', { fm: money(o.amount), s: t('offer.' + o.state) })}${o.state === 'counter' ? ` ${money(o.counter || 0)}` : ''}</p>${o.state === 'counter' ? html`<div class="row"><button class="btn prim sm" id="pCounter">${t('offer.accept')} · ${money(o.counter || 0)}</button></div>` : ''}` : ''}
      <p class="muted small">${deal ? t('pl.offer.hint') : k.tw.open ? t('tw.closing.desc') : t('tw.closed.desc')} · ${t('home.wallet', { fm: money(k.fm) })}</p>`);
  else if (c.src === 'squad') { const v = sellPrice(p) / 0.9; actions = card(t('pl.actions'), html`
      <div class="row"><button class="btn danger" id="pQuick" ${!deal ? raw('disabled') : ''}>${t('pl.quicksell', { fm: money(sellPrice(p)) })}</button></div>
      <div class="row"><label class="f inline">${t('list.ask')} ${pct(v, [90, 100, 110, 120, 130], 'pAskPct', 110)}</label><button class="btn" id="pList" ${!deal ? raw('disabled') : ''}>${lst ? t('pl.list.update') : t('pl.list')}</button>${lst ? html`<button class="btn ghost sm" id="pUnlist">${t('list.remove')}</button>` : ''}</div>
      ${lst ? html`<p class="muted small">${t('list.listed')}: ${money(lst.ask)}${lst.offer ? ' · ' + t('list.bid', { club: lst.offer.club, fm: money(lst.offer.amount) }) : ''}</p>` : ''}
      <p class="muted small">${deal ? t('pl.list.hint') : k.tw.open ? t('tw.closing.desc') : t('tw.closed.desc')}</p>`); }
  else actions = card(t('pl.actions'), html`<div class="row"><button class="btn prim" id="pSign" ${!deal || full ? raw('disabled') : ''}>${t('scout.sign')}</button></div>${deal ? '' : muted(t('scout.wait'))}`);
  // kiyaslama: aday ile kendi futbolcum yan yana; iyi olan yesil
  let cmp: Raw = html``;
  if (c.src !== 'squad') {
    const mineSorted = [...k.roster].sort((a, b) => (a.natPos === p.natPos ? 0 : 1) - (b.natPos === p.natPos ? 0 : 1) || b.gg - a.gg);
    const q = k.roster.find((x) => x.id === c.cmp) || mineSorted[0];
    const rowc = (lab: string, a: number, b: number, fmt: (v: number) => string, higherBetter = true) => { const better = a === b ? 0 : (a > b) === higherBetter ? 1 : -1; return html`<tr><td>${lab}</td><td class="n ${better > 0 ? 'pos' : better < 0 ? 'neg' : ''}">${fmt(a)}</td><td class="n ${better < 0 ? 'pos' : better > 0 ? 'neg' : ''}">${fmt(b)}</td><td class="n muted">${a === b ? '=' : (a > b ? '+' : '−') + fmt(Math.abs(a - b))}</td></tr>`; };
    if (q) cmp = card(t('pl.compare'), html`<label class="f">${t('pl.compare.with')}<select id="pCmp">${mineSorted.map((x) => html`<option value="${x.id}" ${x.id === q.id ? raw('selected') : ''}>${x.natPos} · ${x.name} · ${Math.round(x.gg)}</option>`)}</select></label>
      <table class="grid cmp"><thead><tr><th></th><th class="n">${p.name}</th><th class="n">${q.name}</th><th class="n">${t('pl.diff')}</th></tr></thead><tbody>
        ${rowc(t('col.gg'), Math.round(p.gg), Math.round(q.gg), String)}${rowc(t('col.age'), p.age, q.age, String, false)}${rowc(t('col.trait'), p.traits.length, q.traits.length, String)}
        ${rowc(t('col.wage'), p.wage || 0, q.wage || 0, money, false)}${rowc(t('col.value'), marketValue(p), marketValue(q), money)}</tbody></table>
      <p class="muted small">${p.natPos} · ${p.traits.join(', ') || '–'} &nbsp;|&nbsp; ${q.natPos} · ${q.traits.join(', ') || '–'}</p>`);
  }
  return { title: p.name, tabs: careerTabs('renew'), onTab: onCareerTab, html: html`
    <section class="card hero"><h3>${p.name} <small>${t('pos.' + p.natPos)}${it && it.club ? ' · ' + it.club : it ? ' · ' + t('pool.free') : ''}</small></h3>
      <div class="kvs">${info(t('col.gg'), String(Math.round(p.gg)))}${info(t('col.age'), String(p.age))}${info(t('col.value'), money(marketValue(p)))}${info(t('col.wage'), html`${money(p.wage || 0)}${overpaid(p) ? html` ${tag(t('wage.over'), 'o')}` : ''}`)}${info(t('pl.fairwage'), money(wageFor(p.gg)))}${info(t('col.trait'), p.traits.join(', ') || '–')}${it ? info(t('col.left'), t('pool.weeks', { n: it.left })) : ''}${c.src === 'squad' ? info(t('col.fat'), String(Math.round(p.fatigue))) : ''}</div></section>
    <div class="cards two">${actions}${cmp}</div>`, after: () => {
    const back = (msg: string) => { save(); toast(msg, 'ok'); go('career', { tab: 'renew' }); }; const fail = (r: string) => toast(t('mng.err.' + r), 'err');
    const pb = $('pBuy'); if (pb) pb.onclick = () => { const r = buyNow(k, p.id); if (r === 'ok') { track(store.db, { t: 'market' }); back(t('mng.bought')); } else fail(r); };
    const po = $('pOffer'); if (po && it) po.onclick = () => { const amt = Math.round((it.price * +($('pOfferPct') as HTMLSelectElement).value) / 1000) * 10; if (sendOffer(k, p.id, amt) === 'ok') { track(store.db, { t: 'market' }); save(); toast(t('pl.offer.sent'), 'ok'); render(); } };
    const pc = $('pCounter'); if (pc) pc.onclick = () => { const r = acceptCounter(k, p.id); if (r === 'ok') back(t('mng.bought')); else fail(r); };
    const pq = $('pQuick'); if (pq) pq.onclick = async () => { if (!(await confirmBox(t('mng.sell.confirm', { name: p.name, fm: money(sellPrice(p)) }), t('mng.sell'), true))) return; const r = quickSell(k, p.id); if (r === 'ok') { track(store.db, { t: 'sale' }); back(t('mng.sold')); } else fail(r); };
    const pl = $('pList'); if (pl) pl.onclick = () => { const v = sellPrice(p) / 0.9; if (listPlayer(k, p.id, Math.round((v * +($('pAskPct') as HTMLSelectElement).value) / 1000) * 10) === 'ok') { save(); toast(t('pl.listed'), 'ok'); render(); } };
    const pu = $('pUnlist'); if (pu) pu.onclick = () => { unlist(k, p.id); save(); render(); };
    const ps = $('pSign'); if (ps) ps.onclick = () => { if (canDeal(k) && signFound(k)) back(t('scout.signed')); };
    const pm = $('pCmp') as HTMLSelectElement | null; if (pm) pm.onchange = () => go('player', { ...c, cmp: pm.value });
  } };
});
