// Mac Modu (sablon takimlarla tek mac), mac odasi (tum modlarda ortak) ve mac raporu
import { DOCTRINES, NAMES_A, NAMES_B, type TeamIn } from '../engine.js';
import { $, html, raw } from '../core/html.js';
import { t, fmtNum } from '../core/i18n.js';
import { go, home, register, render } from '../core/router.js';
import { store, save } from '../core/store.js';
import { card, dot, muted, sel, seg, tag } from '../core/ui.js';
import { getLang } from '../core/i18n.js';
import { TEMPLATES, DIFFS, botTeamIn, tplById } from '../model/templates.js';
import { avgGG, userTeamIn } from '../model/club.js';
import { form } from '../model/career.js';
import type { Report } from '../model/report.js';
import { careerTabs, onCareerTab } from './career.js';
import { loadReplay, startMatchFlow, verifyLast, watchLastReplay, type RoomCtx } from './play.js';

const diffOpts = (): [number, string][] => DIFFS.map((d) => [d, t('diff.' + d)]);
const tplCard = (tp: typeof TEMPLATES[number], btn: string, goTo: string, ctx: any) => html`<section class="card tpl"><h3>${dot(tp.color)}${tp.name} <small>${tp.formation} · ${DOCTRINES[tp.doctrine].label} · ${t('squad.gg')} ${tp.gg}</small></h3><p class="muted">${tp.blurb[getLang()]}</p><div class="row"><button class="btn prim sm" data-go="${goTo}" data-push="${goTo === 'mm' ? '0' : '1'}" data-ctx='${JSON.stringify(ctx)}'>${btn}</button></div></section>`;
register('mm', (c) => {
  const step: 'mine' | 'opp' = c.mine ? 'opp' : 'mine';
  const diff = c.diff ?? 2, minutes = c.minutes ?? store.db.settings.minutes;
  const list = step === 'mine' ? TEMPLATES.map((tp) => tplCard(tp, t('mm.pick'), 'mm', { mine: tp.id, diff, minutes })) : TEMPLATES.filter((tp) => tp.id !== c.mine).map((tp) => tplCard(tp, t('mm.vs'), 'room', { kind: 'mm', mine: c.mine, tpl: tp.id, diff, minutes } as RoomCtx));
  return { title: `${t('mm.title')} · ${step === 'mine' ? t('mm.yourteam') : t('mm.opponent')}`, html: html`
    ${card('', html`<div class="grid2">${sel(t('mm.diff'), 'mDiff', diffOpts(), diff)}${sel(t('mm.minutes'), 'mMin', [[6, t('career.new.min', { n: 6 })], [10, t('career.new.min', { n: 10 })], [15, t('career.new.min', { n: 15 })]], minutes)}</div><p class="muted">${t('mm.elo')}: <b>${store.db.mm.elo}</b> · ${store.db.mm.played}${step === 'opp' ? html` · ${t('mm.yourteam')}: <b>${tplById(c.mine).name}</b>` : ''}</p>`)}
    <div class="cards">${list}</div>`, after: (root) => {
      const upd = () => { c.diff = +($('mDiff') as HTMLSelectElement).value; c.minutes = +($('mMin') as HTMLSelectElement).value; for (const b of root.querySelectorAll<HTMLElement>('[data-ctx]')) { try { const o = JSON.parse(b.dataset.ctx!); o.diff = c.diff; o.minutes = c.minutes; b.dataset.ctx = JSON.stringify(o); } catch (e) {} } };
      $('mDiff')!.onchange = upd; $('mMin')!.onchange = upd;
    } };
});

function roomTeams(c: RoomCtx): { me: TeamIn; opp: TeamIn } {
  if (c.kind === 'mm') return { me: botTeamIn(tplById(c.mine!), 3, NAMES_A), opp: botTeamIn(tplById(c.tpl!), c.diff, NAMES_B) };
  const k = store.db.career!; const club = store.db.account!.club;
  return { me: userTeamIn(club, k.roster, k.team), opp: botTeamIn(k.league.teams[c.oppIdx!], k.diff, NAMES_B) };
}
register('room', (c: RoomCtx) => {
  const { me, opp } = roomTeams(c); const s = store.db.settings; const home_ = c.home !== false; const k = store.db.career;
  if (c.kind === 'mm') { delete me.ai; me.rules = []; me.think = 0; me.U = 60; me.T = 60; me.F = 60; me.M = 70; }
  const tac = me.tactic;
  return { title: t('room.title'), tabs: c.kind === 'career' ? careerTabs('match') : undefined, onTab: onCareerTab, html: html`
    <section class="card score"><div class="tm">${dot(home_ ? me.color : opp.color)}<span>${home_ ? me.name : opp.name}</span></div><b>${c.kind === 'mm' ? t('mm.title') : t('career.week', { n: c.week! })}</b><div class="tm b"><span>${home_ ? opp.name : me.name}</span>${dot(home_ ? opp.color : me.color)}</div></section>
    <div class="cards two">
      ${card(t('room.opp'), html`<p><b>${opp.name}</b> · ${t('squad.gg')} ${avgGG(opp)} · ${opp.formation} · ${DOCTRINES[opp.tactic.doctrine!].label}</p><p class="muted">${t('mm.diff')}: ${t('diff.' + c.diff)}${c.kind === 'career' && k ? html` · ${t('career.form')}: ${form(k.league, c.oppIdx!).join(' ') || '–'}` : ''}</p>`)}
      ${card(t('squad.xi'), html`<p class="tags">${me.players.map((p) => tag(html`${p.num} ${p.name} <b>${p.gg}</b>`))}</p><p class="muted">${me.formation} · ${DOCTRINES[tac.doctrine!].label} · ${(['press', 'line', 'tempo'] as const).map((kk) => t('instr.' + kk).split('|')[(tac as any)[kk] + 1]).join(' · ')}</p>${c.kind === 'career' ? html`<div class="row"><button class="btn sm" data-go="squad">${t('room.edit')}: ${t('team.squad')}</button><button class="btn sm" data-go="tactics">${t('room.edit')}: ${t('team.tactics')}</button></div>` : ''}`)}
      ${card(t('mm.mode'), html`${seg('modeSeg', [['sim', t('mode.sim')], ['team', t('mode.team')]], s.mode, 'data-m')}${muted(s.mode === 'team' ? t('room.mode.team') : t('room.mode.sim'))}<label class="f">${t('room.camera')}<select id="rCam"><option value="full" ${s.cam === 'full' ? raw('selected') : ''}>${t('cam.full')}</option><option value="length" ${s.cam === 'length' ? raw('selected') : ''}>${t('cam.tall')}</option><option value="near" ${s.cam === 'near' ? raw('selected') : ''}>${t('cam.near')}</option></select></label>`)}
    </div>`, foot: html`<button class="btn prim" id="rStart">${t('room.ready')}</button>${c.kind === 'career' ? html`<button class="btn" id="rSim">${t('room.instant')}</button>` : ''}`, after: () => {
      $('modeSeg')!.onclick = (e) => { const b = (e.target as HTMLElement).closest('button'); if (!b) return; store.db.settings.mode = b.dataset.m as any; save(); render(); };
      ($('rCam') as HTMLSelectElement).onchange = () => { store.db.settings.cam = ($('rCam') as HTMLSelectElement).value as any; save(); };
      $('rStart')!.onclick = () => startMatchFlow(c, me, opp, home_, false);
      const sb = $('rSim'); if (sb) sb.onclick = () => startMatchFlow(c, me, opp, home_, true);
    } };
});

register('report', (c: { rep: Report; c: RoomCtx }) => {
  const r = c.rep; const rep = loadReplay();
  const evText = (e: Report['events'][number]) => e.type === 'goal' ? t('ev.goal') : e.type === 'yellow' ? t('ev.yellow') : e.type === 'red' ? t('ev.red') : e.type === 'penalty' ? t('ev.penalty') : e.type === 'miss' ? t('ev.post') : e.type === 'rule' ? e.text : e.type;
  const tacText = (x: string) => x === 'duties' ? t('tactics.duties') : x === 'instr' ? t('tactics.mid.desc') : x.startsWith('shape:') ? `${t('tactics.formation')}: ${x.slice(6)}` : x.startsWith('rule:') ? `${t('tactics.rules')}: ${x.slice(5)}` : x.startsWith('slider:') ? `${t('match.ment.0')} ↔ ${x.slice(7)}` : x;
  return { title: t('report.title'), back: false, html: html`
    <section class="card score"><div class="tm">${dot(r.teams[0].color)}<span>${r.teams[0].name}</span></div><b class="big">${r.goals[0]} : ${r.goals[1]}</b><div class="tm b"><span>${r.teams[1].name}</span>${dot(r.teams[1].color)}</div>
      <p class="muted center">${r.result === 'win' ? t('report.win') : r.result === 'loss' ? t('report.loss') : t('report.draw')}${r.elo !== undefined ? ` · Elo ${r.elo >= 0 ? '+' : ''}${r.elo}` : ''}${r.rank ? ` · ${t('report.table', { n: r.rank })}` : ''}${r.fm ? ` · +${fmtNum(r.fm)} FM` : ''}${r.pp ? ` · ${t('report.reward', { pp: r.pp })}` : ''}</p></section>
    <div class="cards two">
      ${card(t('report.stats'), html`${r.stats.map(([l, a, b]) => html`<div class="stat"><div class="l">${a}</div><div class="c">${t(l)}</div><div class="r">${b}</div></div>`)}<p class="muted">${t('report.potm')}: ${r.potm[0]} / ${r.potm[1]}</p>`)}
      ${card(t('report.events'), r.events.length ? html`${r.events.map((e) => html`<div class="ev"><div class="t">${e.t}'</div><div>${e.type === 'half' ? tag(t('match.half')) : html`${tag(r.teams[e.side].short, e.type === 'goal' ? 'y' : e.type === 'red' ? 'r' : e.type === 'yellow' ? 'o' : '')} ${evText(e)}${e.who ? ' · ' + e.who : ''}`}</div></div>`)}` : muted('–'))}
      ${card(html`${t('report.players')} <small>${r.teams[r.side].short}</small>`, html`${r.players.map((p) => html`<div class="prow"><span><b>${p.num}</b> ${p.name} <span class="muted">${t('pos.' + p.pos)}</span>${p.goals ? ' ⚽'.repeat(p.goals) : ''}${p.yellow ? ' 🟨' : ''}${p.red ? ' 🟥' : ''}${p.injured ? ' ✚' : ''}${p.subbed ? ' ↩' : ''}</span><span class="muted">xG ${p.xg.toFixed(2)} · ${t('squad.fatigue')} ${100 - p.k}</span></div>`)}`)}
      ${card(t('report.tacticlog'), html`${r.tactics.length ? r.tactics.map((e) => html`<div class="ev"><div class="t">${e.t}'</div><div>${tacText(e.text)}</div></div>`) : muted(t('report.noTactic'))}<p class="muted">${r.ruleCounts.length ? r.ruleCounts.map(([kk, v]) => `${kk} ×${v}`).join(', ') + ' · ' : ''}${t('report.rot', { a: r.rotations.count, b: r.rotations.oppCount })}</p>`)}
      ${card(t('report.verify'), html`<p class="muted" id="rVerify">${rep && !r.instant ? '…' : t('report.verify.none')}</p>`)}
    </div>`, foot: html`${rep && !r.instant ? html`<button class="btn" id="rReplay">${t('report.replay')}</button>` : ''}${r.kind === 'mm' ? html`<button class="btn prim" data-go="mm" data-ctx='${JSON.stringify({ mine: c.c.mine, diff: c.c.diff, minutes: c.c.minutes })}'>${t('report.again')}</button><button class="btn" id="rHome">${t('nav.home')}</button>` : html`<button class="btn prim" data-go="career" data-push="0" data-ctx='{"tab":"match"}'>${t('report.backleague')}</button>`}`,
    after: () => {
      const h = $('rHome'); if (h) h.onclick = () => home();
      const rp = $('rReplay'); if (rp) rp.onclick = () => watchLastReplay();
      const rv = $('rVerify'); if (rv && rep && !r.instant) setTimeout(() => { try { const v = verifyLast(); if (!v) { rv.textContent = ''; return; } rv.textContent = v.ok ? t('report.verify.ok', { n: v.n, ms: v.ms }) : t('report.verify.fail'); } catch (e: any) { rv.textContent = String(e && e.message ? e.message : e); } }, 50);
    } };
});
