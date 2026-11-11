// Kariyer: yeni kariyer kurulumu ve dort sekmeli kulup ekrani (Kulup · Takim · Mac · Kadro yenileme)
import { $, html } from '../core/html.js';
import { t, fmtNum, fmtDate } from '../core/i18n.js';
import { go, home, register, render } from '../core/router.js';
import { store, save, takePendingDemoSquad } from '../core/store.js';
import { card, confirmBox, dot, muted, sel, tag, toast } from '../core/ui.js';
import { DIFFS } from '../model/templates.js';
import { closeSeason, form, newCareer, nextFixture, order, rank, seasonDone, skipWeek, weekSeed, STADIUM_CAP } from '../model/career.js';
import { DOCTRINES } from '../engine.js';
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
function clubTab(k) {
    const l = k.league;
    const c = store.db.account.club;
    const nxt = nextFixture(l);
    return html `
    ${card(t('club.today'), html `<p>${dot(c.color)} <b>${c.name}</b> · ${t('career.season', { n: l.season })} · ${t('career.played', { w: l.week, total: l.fixtures.length })} · ${t('career.rank', { n: rank(l) })}</p>
      <p>${t('career.form')}: ${formTags(form(l, 0))}</p>
      ${nxt ? html `<p class="muted">${t('career.next')}: ${l.teams[nxt.oppIdx].name} (${nxt.home ? t('career.home') : t('career.away')})</p>` : seasonDone(l) ? muted(t('career.seasonend')) : ''}`)}
    ${card(t('club.finance'), html `<div class="wallet"><span>${tag(html `${fmtNum(k.fm)} FM`, 'g')}</span><span class="muted">${t('finance.tm', { n: k.tm })}</span></div>
      ${k.ledger.length ? html `<div class="list compact">${k.ledger.slice(0, 8).map((e) => html `<div class="li"><div><div class="nm">${e.text}</div><div class="sub">${fmtDate(e.t)}</div></div><div class="gg ${e.fm >= 0 ? 'pos' : 'neg'}">${e.fm >= 0 ? '+' : ''}${fmtNum(e.fm)}</div></div>`)}</div>` : muted(t('finance.empty'))}`)}
    ${card(t('club.facilities'), html `<div class="grid2">${['stadium', 'training', 'academy', 'medical'].map((f) => html `<div class="fac"><b>${t('fac.' + f)}</b><span class="muted">${t('fac.level', { n: k.facilities[f].level })}${f === 'stadium' ? ` · ${fmtNum(STADIUM_CAP[k.facilities.stadium.level])}` : ''}</span></div>`)}</div>${muted(t('fac.soon'))}`)}
    ${card(t('club.history'), html `${k.history.length ? html `<div class="list compact">${k.history.map((h) => html `<div class="li"><div class="nm">${t('career.season', { n: h.season })}</div><div class="sub">${t('career.rank', { n: h.rank })} · ${h.w}-${h.d}-${h.l}</div></div>`)}</div>` : ''}${k.trophies.length ? html `<div class="row wrap">${k.trophies.map((tr) => tag(html `🏆 ${tr.name} · ${t('career.season', { n: tr.season })}`, 'y'))}</div>` : muted(t('profile.empty'))}`)}`;
}
function teamTab(k) {
    const tt = k.team;
    return html `
    ${card(t('team.squad'), html `<p class="muted">${t('team.squad.desc', { n: k.roster.length, f: tt.formation })}</p><div class="row"><button class="btn prim" data-go="squad">${t('team.squad')}</button></div>`)}
    ${card(t('team.tactics'), html `<p class="muted">${tt.formation} → ${tt.formationAtt || tt.formation} · ${DOCTRINES[tt.doctrine].label}</p><div class="row"><button class="btn prim" data-go="tactics">${t('team.tactics')}</button></div>`)}
    ${card(t('team.training'), muted(t('sys.soon.desc')))}`;
}
function matchTab(k, sub) {
    const l = k.league;
    const done = seasonDone(l);
    const nxt = nextFixture(l);
    const ord = order(l);
    let top = html ``;
    if (done)
        top = card(t('career.seasonend'), html `<p>${t('career.rank', { n: rank(l) })} · ${t('career.result', { w: l.table[0].w, d: l.table[0].d, l: l.table[0].l, gf: l.table[0].gf, ga: l.table[0].ga })}</p><div class="row"><button class="btn prim" id="sAgain">${t('career.newseason')}</button><button class="btn ghost danger" id="sDel">${t('career.endleague')}</button></div>`, 'hero');
    else if (nxt)
        top = card(t('career.week', { n: l.week + 1 }), html `<p>${nxt.home ? html `<b>${l.teams[0].name}</b> – ${l.teams[nxt.oppIdx].name} (${t('career.home')})` : html `${l.teams[nxt.oppIdx].name} – <b>${l.teams[0].name}</b> (${t('career.away')})`}</p><p class="muted">${t('career.form')}: ${formTags(form(l, nxt.oppIdx))}</p><div class="row"><button class="btn prim" data-go="room" data-ctx='${JSON.stringify({ kind: 'career', oppIdx: nxt.oppIdx, home: nxt.home, week: l.week + 1, minutes: k.minutes, diff: k.diff, seed: weekSeed(l) })}'>${t('career.room')}</button></div>`, 'hero');
    else
        top = card(t('career.bye', { n: l.week + 1 }), html `<div class="row"><button class="btn" id="sBye">${t('career.skipweek')}</button></div>`, 'hero');
    const fixture = card(t('match.fixture'), html `${l.fixtures.map((rd, w) => html `<p class="wk"><b>${t('career.week', { n: w + 1 })}</b>${w === l.week && !done ? html ` ${tag(t('career.nextup'), 'y')}` : ''}</p>${rd.map(([a, b]) => { const r = l.results.find((m) => m.week === w && m.a === a && m.b === b); const mine = a === 0 || b === 0; return html `<div class="ev"><div class="t">${r ? `${r.ga_}–${r.gb_}` : '–'}</div><div class="${mine ? 'me' : ''}">${l.teams[a].short} – ${l.teams[b].short}</div></div>`; })}`)}`);
    const table = card(t('match.table'), html `<table class="tbl"><tr><th>#</th><th class="l">${t('th.team')}</th><th>${t('th.p')}</th><th>${t('th.w')}</th><th>${t('th.d')}</th><th>${t('th.l')}</th><th>${t('th.ga')}</th><th>${t('th.av')}</th><th>${t('th.pts')}</th></tr>${ord.map((i, r) => { const row = l.table[i]; return html `<tr class="${i === 0 ? 'me' : ''} ${r === 0 ? 'up' : ''}"><td>${r + 1}</td><td class="l">${l.teams[i].name}</td><td>${row.p}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td><td>${row.gf}:${row.ga}</td><td>${row.gf - row.ga}</td><td><b>${row.pts}</b></td></tr>`; })}</table>`);
    return html `${top}<div class="seg sub" id="mSub"><button data-v="fixture" aria-pressed="${sub === 'fixture'}">${t('match.fixture')}</button><button data-v="table" aria-pressed="${sub === 'table'}">${t('match.table')}</button></div>${sub === 'table' ? table : fixture}`;
}
function renewTab() { return html `${card(t('renew.scout'), muted(t('renew.scout.desc')))}${card(t('renew.academy'), muted(t('renew.academy.desc')))}`; }
register('career', (c) => {
    const k = store.db.career;
    if (!k) {
        go('home', {}, false);
        return { html: '' };
    }
    const tab = c.tab || 'match';
    const sub = c.sub || 'fixture';
    const body = tab === 'club' ? clubTab(k) : tab === 'team' ? teamTab(k) : tab === 'renew' ? renewTab() : matchTab(k, sub);
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
                ag.onclick = () => { const r = rank(k.league); closeSeason(k); if (r === 1) {
                    const pp = grantCareer(store.db.rewards, 'title');
                    if (pp)
                        toast(t('report.reward', { pp }), 'ok');
                } save(); toast(t('career.season', { n: k.league.season }), 'ok'); render(); };
            const del = $('sDel');
            if (del)
                del.onclick = async () => { if (await confirmBox(t('career.endleague.confirm'), t('career.endleague'), true)) {
                    store.db.career = null;
                    save();
                    home();
                } };
        } };
});
