// Kariyer: yeni kariyer kurulumu ve dort sekmeli kulup ekrani (Kulup · Takim · Mac · Kadro yenileme)
import { $, html, raw } from '../core/html.js';
import { t, fmtNum, fmtDate } from '../core/i18n.js';
import { go, home, register, render } from '../core/router.js';
import { store, save, takePendingDemoSquad } from '../core/store.js';
import { card, confirmBox, dot, muted, sel, tag, toast } from '../core/ui.js';
import { DIFFS } from '../model/templates.js';
import { closeSeason, form, newCareer, nextFixture, order, rank, seasonDone, skipWeek, weekSeed, STADIUM_CAP } from '../model/career.js';
import { INTENSITY, ROSTER_MAX, SCOUTS, SESSIONS_PER_DAY, academyUpkeep, STAFF, building, buy, coachWages, fmtLeft, overpaid, playerWages, occupancy, setStaff, staffWage, staffWages, ts, haggle, marketValue, scoutCost, sell, sellPrice, sessionsToday, signFound, startScout, startTraining, startUpgrade, tick, tmNeutral, trainMs, upgradeInfo, useBoost } from '../model/manage.js';
import { DOCTRINES } from '../engine.js';
import { ROUNDS, cupDue } from '../model/cup.js';
import { track } from '../model/missions.js';
import { grantCareer } from '../model/rewards.js';
const diffOpts = () => DIFFS.map((d) => [d, t('diff.' + d)]);
register('careerNew', () => ({ title: t('career.new.title'), html: html `
  ${card(t('career.new.title'), html `<div class="grid2">
    ${sel(t('career.new.size'), 'sN', [[4, t('career.new.teams', { n: 4, w: 6 })], [6, t('career.new.teams', { n: 6, w: 10 })], [8, t('career.new.teams', { n: 8, w: 14 })]], 6)}
    ${sel(t('career.new.diff'), 'sDiff', diffOpts(), 2)}
    ${sel(t('career.new.minutes'), 'sMin', [[6, t('career.new.min', { n: 6 })], [10, t('career.new.min', { n: 10 })], [15, t('career.new.min', { n: 15 })]], store.db.settings.minutes)}
  </div><p class="muted">${t('career.new.desc')}</p>`, 'hero')}`, foot: html `<button class="btn prim" id="sOk">${t('career.new.start')}</button>`, after: () => {
        $('sOk').onclick = () => {
            const size = +$('sN').value, diff = +$('sDiff').value, minutes = +$('sMin').value;
            const club = store.db.account.club;
            const seed = takePendingDemoSquad(); // demodan tasinan kadro varsa ilk Kariyer onu kullanir
            store.db.career = newCareer(club, { size, diff, minutes }, seed);
            save();
            home();
            go('career', { tab: 'match' }, false);
        };
    } }));
export const careerTabs = (on) => [{ id: 'club', label: t('tab.club'), on: on === 'club' }, { id: 'team', label: t('tab.team'), on: on === 'team' }, { id: 'match', label: t('tab.match'), on: on === 'match' }, { id: 'renew', label: t('tab.renew'), on: on === 'renew' }];
export const onCareerTab = (id) => { if (id === 'team')
    go('career', { tab: 'team' }, false);
else
    go('career', { tab: id }, false); };
const formTags = (f) => f.length ? html `${f.map((x) => tag(x === 'W' ? t('th.w') : x === 'D' ? t('th.d') : t('th.l'), x === 'W' ? 'g' : x === 'L' ? 'r' : ''))}` : html `<span class="muted">–</span>`;
const left = (until) => fmtLeft(until - Date.now());
const boostBtn = (what) => (store.db.rewards.boosts > 0 ? html `<button class="btn sm ghost" data-boost="${what}">⚡ ${t('mng.boost')}</button>` : html ``);
const ledgerText = (x) => { const [a, b, c2] = x.split(':'); return a === 'build' ? `${t('fac.' + b)} → ${t('fac.level', { n: c2 })}` : a === 'scout' ? `${t('renew.scout')} (${t('scout.' + b)})` : a === 'buy' ? `${t('mng.buy')}: ${b}` : a === 'sell' ? `${t('mng.sell')}: ${b}` : a === 'upkeep' ? t('mng.upkeep') : a === 'wages' ? t('staff.wages') : a === 'pwages' ? t('wage.players') : a === 'coach' ? t('coach.title') : a === 'mission' ? t('missions.title') : a === 'staff' ? `${t('staff.' + b)} → ${t('fac.level', { n: c2 })}` : a === 'sponsor' ? t('fin.sponsor') : a === 'prize' ? `${t('fin.prize')} (${t('career.rank', { n: b })})` : a === 'cup' ? `${t('cup.title.short')} · ${b === 'entry' ? t('cup.entry') : t('cup.r.' + Math.max(0, ROUNDS.indexOf(b))) + ' ' + (c2 || '')}` : /^\d+\.\d+ [HA] /.test(x) ? x.replace(' H ', ` ${t('career.home')} `).replace(' A ', ` ${t('career.away')} `) : x; };
function clubTab(k) {
    const l = k.league;
    const c = store.db.account.club;
    const nxt = nextFixture(l);
    const bld = building(k);
    const fac = (f) => {
        const lv = k.facilities[f].level;
        const u = upgradeInfo(k, f);
        const busy = k.facilities[f].busyUntil;
        return html `<div class="fac"><b>${t('fac.' + f)} <small>${lv ? t('fac.level', { n: lv }) : t('fac.none')}</small></b><span class="muted small">${f === 'stadium' ? t('fac.stadium.info', { cap: fmtNum(STADIUM_CAP[lv]), tm: Math.round(tmNeutral(k)) }) : lv ? t('fac.academy.info', { up: fmtNum(academyUpkeep(k)) }) : t('fac.academy.none')}</span>
      ${busy ? html `<div class="row"><span class="tag o">🏗 ${t('fac.level', { n: lv + 1 })} · ${left(busy)}</span>${boostBtn('build')}</div>` : u ? html `<div class="row"><button class="btn sm ${bld || k.fm < u.cost ? '' : 'prim'}" data-up="${f}" ${bld || k.fm < u.cost ? raw('disabled') : ''}>${t('fac.upgrade', { n: u.to })} · ${fmtNum(u.cost)} FM · ${fmtLeft(u.ms)}</button></div>` : html `<span class="tag g">${t('fac.max')}</span>`}</div>`;
    };
    return html `
    ${card(t('club.today'), html `<p>${dot(c.color)} <b>${c.name}</b> · ${t('career.season', { n: l.season })} · ${t('career.played', { w: l.week, total: l.fixtures.length })} · ${t('career.rank', { n: rank(l) })}</p>
      <p>${t('career.form')}: ${formTags(form(l, 0))}</p>
      ${nxt ? html `<p class="muted">${t('career.next')}: ${l.teams[nxt.oppIdx].name} (${nxt.home ? t('career.home') : t('career.away')})</p>` : seasonDone(l) ? muted(t('career.seasonend')) : ''}`)}
    ${card(t('club.facilities'), html `<div class="grid2">${fac('stadium')}${fac('academy')}</div>${muted(t('fac.rule'))}`)}
    ${card(html `${t('club.staff')} <small>${t('staff.sub', { w: fmtNum(staffWages(k)), ts: ts(k) })}</small>`, html `${STAFF.map((sk) => html `<div class="row staff"><span class="who"><b>${t('staff.' + sk)}</b><br><span class="muted small">${t('staff.fx.' + sk)}</span></span><select class="stf" data-k="${sk}">${[0, 1, 2, 3, 4, 5].map((lv) => html `<option value="${lv}" ${lv === k.staff[sk] ? raw('selected') : ''}>${lv ? `${t('fac.level', { n: lv })} · ${fmtNum(staffWage(lv))} FM` : t('fac.none')}</option>`)}</select></div>`)}${muted(t('staff.rule'))}`)}
    ${card(t('club.finance'), html `<div class="wallet"><span>${tag(html `${fmtNum(k.fm)} FM`, 'g')}</span><span class="muted">${t('finance.tm', { n: Math.round(k.tm) })} · ${t('fin.occ', { n: Math.round(occupancy(k) * 100) })}</span></div><p class="muted small">${t('fin.weekly', { p: fmtNum(playerWages(k)), s: fmtNum(staffWages(k)), c: fmtNum(coachWages(k)), a: fmtNum(academyUpkeep(k)) })}</p>
      ${k.ledger.length ? html `<div class="list compact">${k.ledger.slice(0, 10).map((e) => html `<div class="li"><div><div class="nm">${ledgerText(e.text)}</div><div class="sub">${fmtDate(e.t)}</div></div><div class="gg ${e.fm >= 0 ? 'pos' : 'neg'}">${e.fm >= 0 ? '+' : ''}${fmtNum(e.fm)}</div></div>`)}</div>` : muted(t('finance.empty'))}`)}
    ${card(t('club.history'), html `${k.history.length ? html `<div class="list compact">${k.history.map((h) => html `<div class="li"><div class="nm">${t('career.season', { n: h.season })}</div><div class="sub">${t('career.rank', { n: h.rank })} · ${h.w}-${h.d}-${h.l}</div></div>`)}</div>` : ''}${k.trophies.length ? html `<div class="row wrap">${k.trophies.map((tr) => tag(html `🏆 ${tr.name} · ${t('career.season', { n: tr.season })}`, 'y'))}</div>` : muted(t('profile.empty'))}`)}`;
}
const TRAIN_KINDS = ['cohesion', 'tactic', 'physical', 'individual', 'rest'];
function teamTab(k, c) {
    const tt = k.team;
    const m = k.metrics;
    const job = k.train.job;
    const n = sessionsToday(k);
    const fat = Math.round(k.roster.reduce((a, p) => a + p.fatigue, 0) / k.roster.length);
    const bar = (lab, v) => html `<div class="meter"><span>${lab}</span><div class="k"><i style="width:${Math.round(v)}%"></i></div><b>${v.toFixed(1)}</b></div>`;
    const kind = c.tk || 'cohesion';
    const lv = c.tl ?? 1;
    const I = INTENSITY[lv];
    return html `
    ${card(t('team.metrics'), html `${bar(t('met.U'), m.U)}${bar(t('met.T'), m.T)}${bar(t('met.F'), m.F)}${bar(t('met.M'), m.M)}${bar(t('met.fat'), fat)}${muted(t('met.desc'))}`)}
    ${card(html `${t('team.training')} <small>${t('train.today', { n, max: SESSIONS_PER_DAY })}</small>`, job ? html `<div class="row"><span class="tag o">${t('train.' + job.kind)}${job.kind === 'rest' ? '' : ' · ' + t('train.lv.' + job.level)} · ${left(job.until)}</span>${boostBtn('train')}</div>${muted(t('train.running'))}`
        : html `<div class="grid2">${sel(t('train.kind'), 'trKind', TRAIN_KINDS.map((x) => [x, t('train.' + x)]), kind)}${kind === 'rest' ? '' : sel(t('train.level'), 'trLv', [0, 1, 2].map((x) => [x, t('train.lv.' + x)]), lv)}</div>
        ${kind === 'individual' ? html `<div class="grid2">${[0, 1, 2].map((i) => html `<label class="f">${t('train.player', { n: i + 1 })}<select class="trP"><option value="">–</option>${[...k.roster].sort((a, b) => a.age - b.age).map((p) => html `<option value="${p.id}">${p.num} ${p.name} · ${p.natPos} · ${Math.round(p.gg)} · ${p.age}</option>`)}</select></label>`)}</div>` : ''}
        <p class="muted small">${t('train.effect.' + kind)} · ${fmtLeft(trainMs(kind, lv))}${kind === 'rest' ? '' : ` · ${t('squad.fatigue')} +${kind === 'cohesion' ? I.fat / 2 : I.fat}`}</p>
        <div class="row"><button class="btn prim sm" id="trGo" ${n >= SESSIONS_PER_DAY ? raw('disabled') : ''}>${n >= SESSIONS_PER_DAY ? t('train.limit') : t('train.start')}</button></div>${k.train.last ? muted(html `${t('train.last')}: ${t('train.' + k.train.last.kind)} ${k.train.last.text === 'rest' ? '' : k.train.last.text}`) : ''}`)}
    ${card(t('team.squad'), html `<p class="muted">${t('team.squad.desc', { n: k.roster.length, f: tt.formation })}</p><div class="row"><button class="btn sm" data-go="squad">${t('team.squad')}</button><button class="btn sm" data-go="tactics">${t('team.tactics')}</button></div><p class="muted small">${tt.formation} → ${tt.formationAtt || tt.formation} · ${DOCTRINES[tt.doctrine].label}</p>`)}`;
}
function matchTab(k, sub) {
    const l = k.league;
    const done = seasonDone(l);
    const nxt = nextFixture(l);
    const ord = order(l);
    let top = html ``;
    const cup = k.cup;
    const due = cupDue(k);
    const cupCard = cup ? card(html `${t('cup.' + cup.kind)} <small>${cup.done ? t('cup.title') : cup.alive ? t('cup.r.' + cup.round) : t('cup.out')}</small>`, html `${cup.log.map((g) => html `<div class="ev"><div class="t">${g.gf}–${g.ga}</div><div>${t('cup.r.' + g.round)} · ${g.opp}${g.pens ? ` (${g.pens[0]}–${g.pens[1]} ${t('cup.pens')})` : ''} ${tag(g.win ? t('th.w') : t('th.l'), g.win ? 'g' : 'r')}</div></div>`)}${cup.alive && !cup.done ? muted(html `${t('career.next')}: ${cup.opps[cup.round].name} · ${due ? t('cup.now') : t('cup.later')}`) : ''}`) : html ``;
    if (due && cup)
        top = card(html `${t('cup.' + cup.kind)} · ${t('cup.r.' + cup.round)}`, html `<p>${cup.home[cup.round] ? html `<b>${l.teams[0].name}</b> – ${cup.opps[cup.round].name}` : html `${cup.opps[cup.round].name} – <b>${l.teams[0].name}</b>`}</p><p class="muted">${t('cup.knockout')}</p><div class="row"><button class="btn prim" data-go="room" data-ctx='${JSON.stringify({ kind: 'career', cup: true, home: cup.home[cup.round], week: l.week, minutes: k.minutes, diff: k.diff })}'>${t('career.room')}</button></div>`, 'hero');
    else if (done)
        top = card(t('career.seasonend'), html `<p>${t('career.rank', { n: rank(l) })} · ${t('career.result', { w: l.table[0].w, d: l.table[0].d, l: l.table[0].l, gf: l.table[0].gf, ga: l.table[0].ga })}</p><div class="row"><button class="btn prim" id="sAgain">${t('career.newseason')}</button><button class="btn ghost danger" id="sDel">${t('career.endleague')}</button></div>`, 'hero');
    else if (nxt)
        top = card(t('career.week', { n: l.week + 1 }), html `<p>${nxt.home ? html `<b>${l.teams[0].name}</b> – ${l.teams[nxt.oppIdx].name} (${t('career.home')})` : html `${l.teams[nxt.oppIdx].name} – <b>${l.teams[0].name}</b> (${t('career.away')})`}</p><p class="muted">${t('career.form')}: ${formTags(form(l, nxt.oppIdx))}</p><div class="row"><button class="btn prim" data-go="room" data-ctx='${JSON.stringify({ kind: 'career', oppIdx: nxt.oppIdx, home: nxt.home, week: l.week + 1, minutes: k.minutes, diff: k.diff, seed: weekSeed(l) })}'>${t('career.room')}</button></div>`, 'hero');
    else
        top = card(t('career.bye', { n: l.week + 1 }), html `<div class="row"><button class="btn" id="sBye">${t('career.skipweek')}</button></div>`, 'hero');
    const fixture = card(t('match.fixture'), html `${l.fixtures.map((rd, w) => html `<p class="wk"><b>${t('career.week', { n: w + 1 })}</b>${w === l.week && !done ? html ` ${tag(t('career.nextup'), 'y')}` : ''}</p>${rd.map(([a, b]) => { const r = l.results.find((m) => m.week === w && m.a === a && m.b === b); const mine = a === 0 || b === 0; return html `<div class="ev"><div class="t">${r ? `${r.ga_}–${r.gb_}` : '–'}</div><div class="${mine ? 'me' : ''}">${l.teams[a].short} – ${l.teams[b].short}</div></div>`; })}`)}`);
    const table = card(t('match.table'), html `<table class="tbl"><tr><th>#</th><th class="l">${t('th.team')}</th><th>${t('th.p')}</th><th>${t('th.w')}</th><th>${t('th.d')}</th><th>${t('th.l')}</th><th>${t('th.ga')}</th><th>${t('th.av')}</th><th>${t('th.pts')}</th></tr>${ord.map((i, r) => { const row = l.table[i]; return html `<tr class="${i === 0 ? 'me' : ''} ${r === 0 ? 'up' : ''}"><td>${r + 1}</td><td class="l">${l.teams[i].name}</td><td>${row.p}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td><td>${row.gf}:${row.ga}</td><td>${row.gf - row.ga}</td><td><b>${row.pts}</b></td></tr>`; })}</table>`);
    return html `${top}${cupCard}<div class="seg sub" id="mSub"><button data-v="fixture" aria-pressed="${sub === 'fixture'}">${t('match.fixture')}</button><button data-v="table" aria-pressed="${sub === 'table'}">${t('match.table')}</button></div>${sub === 'table' ? table : fixture}`;
}
const plRow = (p, right) => html `<div class="li static"><div class="num">${p.num || '–'}</div><div><div class="nm">${p.name} <small class="muted">${t('pos.' + p.natPos)}</small></div><div class="sub">${t('squad.gg')} ${Math.round(p.gg)} · ${p.age} ${t('squad.age')} · ${t('wage.per', { n: p.wage || 0 })}${p.traits.map((x) => ' · ' + x).join('')}${overpaid(p) ? html ` ${tag(t('wage.over'), 'o')}` : ''}</div></div>${right}</div>`;
function renewTab(k) {
    const sc = k.scout;
    const full = k.roster.length >= ROSTER_MAX;
    return html `
    ${card(html `${t('renew.scout')} <small>${t('mng.roster', { n: k.roster.length, max: ROSTER_MAX })}</small>`, sc.found ? html `${plRow(sc.found, html `<div class="gg">${fmtNum(marketValue(sc.found))}</div>`)}<div class="row"><button class="btn prim sm" id="scSign" ${full ? raw('disabled') : ''}>${t('scout.sign')}</button><button class="btn sm ghost" id="scDrop">${t('scout.drop')}</button></div>`
        : sc.job ? html `<div class="row"><span class="tag o">${t('scout.' + SCOUTS[sc.job.tier].id)} · ${left(sc.job.until)}</span>${boostBtn('scout')}</div>${muted(t('scout.running'))}`
            : html `<div class="row">${sel(t('scout.pos'), 'scPos', [['', t('scout.any')], ...['GK', 'CB', 'FB', 'DM', 'CM', 'W', 'ST'].map((x) => [x, t('pos.' + x)])], '')}</div>
        <div class="row wrap">${SCOUTS.map((s2, i) => html `<button class="btn sm" data-scout="${i}" ${k.fm < scoutCost(i) && !(i === 0 && k.scoutFree > 0) ? raw('disabled') : ''}>${t('scout.' + s2.id)} · ${t('squad.gg')} ${s2.gg[0]}–${s2.gg[1]} · ${i === 0 && k.scoutFree > 0 ? t('scout.free', { n: k.scoutFree }) : fmtNum(scoutCost(i)) + ' FM'}</button>`)}</div>${muted(t('scout.desc'))}`)}
    ${card(html `${t('mng.pool')} <small>${t('mng.pool.sub')}</small>`, k.pool.length ? html `<div class="list compact">${k.pool.map((it) => plRow(it.p, html `<div class="acts"><b class="${it.haggled ? (it.price < marketValue(it.p) ? 'pos' : 'neg') : ''}">${fmtNum(it.price)}</b><button class="btn sm ghost" data-hag="${it.p.id}" ${it.haggled ? raw('disabled') : ''}>${t('mng.haggle')}</button><button class="btn sm" data-buy="${it.p.id}" ${k.fm < it.price || full ? raw('disabled') : ''}>${t('mng.buy')}</button></div>`))}</div>` : muted(t('mng.pool.empty')))}
    ${k.news.length ? card(t('mng.news'), html `${k.news.map((x) => { const [a, b, n, g] = x.split('|'); return html `<p class="muted small">${a === 'buy' ? t('news.buy', { club: b, name: n, gg: g }) : t('news.sell', { club: b, name: n, gg: g })}</p>`; })}`) : ''}
    ${card(html `${t('mng.sellTitle')} <small>${t('mng.sell.sub')}</small>`, html `<div class="list compact">${[...k.roster].sort((a, b) => b.gg - a.gg).map((p) => plRow(p, html `<div class="acts"><b>${fmtNum(sellPrice(p))}</b><button class="btn sm ghost danger" data-sell="${p.id}">${t('mng.sell')}</button></div>`))}</div>`)}
    ${card(t('renew.academy'), muted(k.facilities.academy.level ? t('academy.info', { n: k.facilities.academy.level }) : t('fac.academy.none')))}`;
}
register('career', (c) => {
    const k = store.db.career;
    if (!k) {
        go('home', {}, false);
        return { html: '' };
    }
    const tab = c.tab || 'match';
    const sub = c.sub || 'fixture';
    const done = tick(k);
    if (done.length) {
        save();
        setTimeout(() => { for (const d of done)
            toast(t('done.' + d.split(':')[0]) + (d.startsWith('fac:') ? ': ' + t('fac.' + d.slice(4)) : ''), 'ok'); }, 50);
    }
    const body = tab === 'club' ? clubTab(k) : tab === 'team' ? teamTab(k, c) : tab === 'renew' ? renewTab(k) : matchTab(k, sub);
    return { title: `${t('career.title')} · ${t('career.season', { n: k.league.season })}`, back: false, html: body, tabs: careerTabs(tab), onTab: onCareerTab, after: () => {
            const ms = $('mSub');
            if (ms)
                ms.onclick = (e) => { const b = e.target.closest('button'); if (b)
                    go('career', { tab: 'match', sub: b.dataset.v }, false); };
            const bye = $('sBye');
            if (bye)
                bye.onclick = () => { skipWeek(k); save(); render(); };
            const ag = $('sAgain');
            if (ag)
                ag.onclick = () => { const r = rank(k.league); const cs = closeSeason(k); const youths = cs.youths; setTimeout(() => { toast(t('fin.prize.toast', { fm: fmtNum(cs.prize), n: cs.scouts }), 'ok'); if (youths.length)
                    toast(t('academy.new', { n: youths.length }), 'ok'); toast(t('cup.entered', { cup: t('cup.' + k.cup.kind) }), 'ok'); }, 400); if (r === 1) {
                    const pp = grantCareer(store.db.rewards, 'title');
                    if (pp)
                        toast(t('report.reward', { pp }), 'ok');
                } save(); toast(t('career.season', { n: k.league.season }), 'ok'); render(); };
            const root = $('aBody');
            const re = (msg, kind = 'ok') => { save(); if (msg)
                toast(msg, kind); render(); };
            const fail = (r) => toast(t('mng.err.' + r), 'err');
            for (const b of root.querySelectorAll('[data-up]'))
                b.onclick = () => { const r = startUpgrade(k, b.dataset.up); if (r === 'ok')
                    re(t('fac.started'));
                else
                    fail(r); };
            for (const b of root.querySelectorAll('[data-boost]'))
                b.onclick = () => { if (useBoost(k, store.db.rewards, b.dataset.boost))
                    re(t('mng.boosted')); };
            for (const el of root.querySelectorAll('.stf'))
                el.onchange = () => { const r = setStaff(k, el.dataset.k, +el.value); if (r === 'ok')
                    re(t('toast.saved'));
                else {
                    if (r === 'fm')
                        fail('fm');
                    render();
                } };
            const tk = $('trKind'), tl = $('trLv');
            if (tk)
                tk.onchange = () => go('career', { ...c, tk: tk.value }, false);
            if (tl)
                tl.onchange = () => go('career', { ...c, tl: +tl.value }, false);
            const tg = $('trGo');
            if (tg)
                tg.onclick = () => { const r = startTraining(k, (tk ? tk.value : 'cohesion'), tl ? +tl.value : 0, [...root.querySelectorAll('.trP')].map((x) => x.value)); if (r === 'ok')
                    track(store.db, { t: 'train' }); if (r === 'ok')
                    re(t('train.started'));
                else
                    fail(r); };
            for (const b of root.querySelectorAll('[data-scout]'))
                b.onclick = () => { const r = startScout(k, +b.dataset.scout, ($('scPos').value || '')); if (r === 'ok')
                    track(store.db, { t: 'scout' }); if (r === 'ok')
                    re(t('scout.started'));
                else
                    fail(r); };
            const ss = $('scSign');
            if (ss)
                ss.onclick = () => { if (signFound(k))
                    re(t('scout.signed')); };
            const sd = $('scDrop');
            if (sd)
                sd.onclick = () => { k.scout.found = null; re(); };
            for (const b of root.querySelectorAll('[data-hag]'))
                b.onclick = () => { const r = haggle(k, b.dataset.hag); track(store.db, { t: 'market' }); re(r === 'down' ? t('mng.haggle.ok') : t('mng.haggle.no'), r === 'down' ? 'ok' : 'err'); };
            for (const b of root.querySelectorAll('[data-buy]'))
                b.onclick = () => { const r = buy(k, b.dataset.buy); if (r === 'ok')
                    track(store.db, { t: 'market' }); if (r === 'ok')
                    re(t('mng.bought'));
                else
                    fail(r); };
            for (const b of root.querySelectorAll('[data-sell]'))
                b.onclick = async () => { const p = k.roster.find((x) => x.id === b.dataset.sell); if (!p || !(await confirmBox(t('mng.sell.confirm', { name: p.name, fm: fmtNum(sellPrice(p)) }), t('mng.sell'), true)))
                    return; const r = sell(k, p.id); if (r === 'ok')
                    track(store.db, { t: 'sale' }); if (r === 'ok')
                    re(t('mng.sold'));
                else
                    fail(r); };
            const del = $('sDel');
            if (del)
                del.onclick = async () => { if (await confirmBox(t('career.endleague.confirm'), t('career.endleague'), true)) {
                    store.db.career = null;
                    save();
                    home();
                } };
        } };
});
