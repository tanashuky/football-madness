// Mac ici taktik paneli (demodan tasindi): Yaklasim · Talimatlar · Sekil (surukle, hazir sekil, rotasyon) · Gorevler (gorev karti, kural) · Degisiklik.
// Talimat/sekil/gorev uygulamalari mac basina 3 hak; kaydirici, oyun modu ve oyuncu degisikligi haktan dusmez.
import { DOCTRINES, DOCTRINE_LIST, FORMATIONS, FORMATION_LIST, FORM_POS, RULES_MAX, RULE_TEMPLATES, applyDutiesRules, attackShapeOf, pendingSubs, setRotations, setTactic, shapesOf, suggestedSub, userSub,
  type Doctrine, type Formation, type MatchState, type TacticIn } from '../engine.js';
import { html, raw, type Raw } from '../core/html.js';
import { t, opts as iopts } from '../core/i18n.js';

export interface PanelHost { st: MatchState; side: 0 | 1; ment: number; decide: number | null; half: boolean; team: boolean; canMode: boolean;
  setMent: (m: number) => void; setMode: (m: 'team' | 'sim') => void; banner: (text: string, sub?: string) => void; close: () => void }
type Draft = { changes: number; formation: Formation; formAtt: Formation; shapeDef: [number, number][]; shapeAtt: [number, number][]; rotations: number[][]; show: 'def' | 'att'; rot: null | { cur: number[] } };
const S = { tab: 'approach', draft: null as Draft | null, subOut: null as number | null, msg: '' };
const TABS = ['approach', 'instr', 'shape', 'duty', 'subs'];
export function resetPanel(decide: number | null) { S.draft = null; S.msg = ''; S.subOut = decide; if (decide !== null) S.tab = 'subs'; }
function draftOf(h: PanelHost): Draft {
  const tm = h.st.teams[h.side];
  if (S.draft && S.draft.changes === h.st.tacticChanges[h.side]) return S.draft;
  const sh = shapesOf(tm);
  S.draft = { changes: h.st.tacticChanges[h.side], formation: tm.formation, formAtt: tm.formation, shapeDef: sh.def.map((q) => [q[0], q[1]]), shapeAtt: sh.att.map((q) => [q[0], q[1]]), rotations: (tm.tactic.rotations || []).map((c) => [...c]), show: S.draft?.show || 'def', rot: null };
  return S.draft;
}
export function renderPanel(box: HTMLElement, h: PanelHost) {
  const { st, side } = h; const tm = st.teams[side], tac = tm.tactic, opp = st.teams[1 - side];
  const left = 3 - st.tacticChanges[side];
  const live = st.players.filter((p) => p.side === side && !p.off).sort((a, b) => a.idx - b.idx);
  const bench = st.bench[side].filter((b) => b.off && !b.subbed);
  const pend = pendingSubs(st, side);
  const A = st.stats[side], O = st.stats[1 - side], poss = A.possTicks + O.possTicks || 1;
  const tab = S.tab; const keep = box.querySelector('.box')?.scrollTop ?? 0;
  const sel = (k: string) => { const o = iopts('instr.' + k); return html`<label class="f">${o.label}<select data-k="${k}" class="tk">${o.opts.map((l, i) => html`<option value="${i}" ${i === ((tac as any)[k] ?? (k === 'wing' || k === 'trap' ? 0 : 1)) ? raw('selected') : ''}>${l}</option>`)}</select></label>`; };
  const hak = html`<p class="muted small">${t('panel.rights', { n: left })}</p>`;
  const msg = html`<p class="okp" id="tMsg">${S.msg}</p>`;
  let body: Raw;
  if (tab === 'approach') {
    body = html`<div class="col"><div class="seg sm" id="tMent">${[-2, -1, 0, 1, 2].map((m) => html`<button data-v="${m}" aria-pressed="${st.mentality[side] === m ? 'true' : 'false'}">${iopts('match.ment.' + m).label}</button>`)}</div>
      ${h.canMode ? html`<div class="seg sm" id="tMode"><button data-v="team" aria-pressed="${h.team}">${t('mode.team')}</button><button data-v="sim" aria-pressed="${!h.team}">${t('mode.sim')}</button></div>` : ''}
      <p class="muted small">${t('panel.approach')}</p>${hak}</div>
      <div class="col"><p>${tm.short} ${A.goals} : ${O.goals} ${opp.short}<br>${t('report.poss')} %${Math.round((100 * A.possTicks) / poss)} · ${t('report.shots')} ${A.shots} (${A.onTarget}) – ${O.shots} (${O.onTarget})<br>xG ${A.xg.toFixed(2)} – ${O.xg.toFixed(2)} · ${t('report.pass')} %${Math.round((100 * A.passesOk) / Math.max(1, A.passes))} – %${Math.round((100 * O.passesOk) / Math.max(1, O.passes))}<br>${t('report.corners')} ${A.corners}–${O.corners} · ${t('report.fouls')} ${A.fouls}–${O.fouls} · ${t('report.offs')} ${A.offsides}–${O.offsides}</p>
      <p class="muted small">${tm.formation} · ${DOCTRINES[tac.doctrine || 'balanced'].label} · ↻ ${(tac.rotations || []).length}</p></div>`;
  } else if (tab === 'instr') {
    body = html`<div class="col"><label class="f">${t('tactics.doctrine')}<select id="tDoc">${DOCTRINE_LIST.map((d) => html`<option value="${d}" ${d === (tac.doctrine || 'balanced') ? raw('selected') : ''}>${DOCTRINES[d].label}</option>`)}</select></label>${['press', 'line', 'tempo', 'style', 'width'].map(sel)}</div>
      <div class="col">${['compact', 'fb', 'cm', 'runs', 'wing', 'trap'].map(sel)}<button class="btn prim sm" id="tApply" ${left <= 0 ? raw('disabled') : ''}>${left <= 0 ? t('match.noChanges') : t('panel.applyInstr', { n: left })}</button>${msg}${hak}</div>`;
  } else if (tab === 'shape') {
    const d = draftOf(h); const show = d.show, shape = show === 'def' ? d.shapeDef : d.shapeAtt;
    const numOf = (i: number) => live.find((p) => p.idx === i)?.num ?? -1; const idxOf = (n: number) => live.find((q) => q.num === n)?.idx ?? -1;
    const curRot = d.rot ? d.rot.cur : [];
    const arrow = (a: number, b: number, dashed: boolean) => { const [x1, y1] = shape[a], [x2, y2] = shape[b]; const dx = x2 - x1, dy = y2 - y1, dd = Math.hypot(dx, dy) || 1; return `<line x1="${x1 + (dx / dd) * 2.2}" y1="${y1 + (dy / dd) * 2.2}" x2="${x2 - (dx / dd) * 2.6}" y2="${y2 - (dy / dd) * 2.6}" stroke="${dashed ? 'var(--warn)' : '#fff'}" stroke-width="0.7" ${dashed ? 'stroke-dasharray="1.5 1"' : ''} marker-end="url(#ahP)"/>`; };
    const parts: string[] = []; for (const cyc of d.rotations) { const ix = cyc.map(idxOf).filter((i) => i >= 0 && i < 11); for (let k = 0; k < ix.length; k++) parts.push(arrow(ix[k], ix[(k + 1) % ix.length], false)); }
    const ci = curRot.map(idxOf).filter((i) => i >= 0 && i < 11); for (let k = 0; k + 1 < ci.length; k++) parts.push(arrow(ci[k], ci[k + 1], true));
    const inRot = new Set([...d.rotations.flat(), ...curRot]);
    const sh0 = shapesOf(tm);
    const changed = JSON.stringify([d.shapeDef, d.shapeAtt, d.rotations, d.formation]) !== JSON.stringify([sh0.def, sh0.att, tm.tactic.rotations || [], tm.formation]);
    body = html`<div class="col wide"><div class="pitchmini ${d.rot ? 'rotmode' : ''}" id="tMini">${raw(`<svg class="rot" viewBox="0 0 105 68" preserveAspectRatio="none"><defs><marker id="ahP" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#fff"/></marker></defs>${parts.join('')}</svg>`)}${shape.map(([x, y], i) => html`<div class="dot ${show === 'att' ? 'att' : ''} ${inRot.has(numOf(i)) ? 'inrot' : ''}" data-i="${i}" style="left:${(x / 105) * 100}%;top:${(y / 68) * 100}%;background:${tm.color}">${numOf(i) < 0 ? '–' : numOf(i)}</div>`)}</div>
      <div class="row"><div class="seg sm" id="tShp"><button data-v="def" aria-pressed="${show === 'def'}">${t('tactics.shape.def')}</button><button data-v="att" aria-pressed="${show === 'att'}">${t('tactics.shape.att')}</button></div>
        <select id="tShLoad">${FORMATION_LIST.map((f) => html`<option ${f === (show === 'def' ? d.formation : d.formAtt) ? raw('selected') : ''}>${f}</option>`)}</select><button class="btn sm" id="tShLoadBtn">${t('tactics.load')}</button></div>
      <div class="row wrap">${d.rotations.map((cyc, k) => html`<span class="tag">↻ ${cyc.join(' → ')} <button class="x rotDel" data-k="${k}">×</button></span>`)}${d.rot ? html`<span class="muted small">${curRot.length ? curRot.join(' → ') : t('tactics.rotation.hint')}</span>${curRot.length >= 2 ? html`<button class="btn sm" id="rotClose">${t('tactics.rotation.close')}</button>` : ''}<button class="btn sm ghost" id="rotCancel">${t('tactics.rotation.cancel')}</button>` : html`<button class="btn sm ghost" id="rotStart">${t('tactics.rotation.start')}</button>`}</div></div>
      <div class="col"><p class="muted small">${t('panel.shape')}</p>${changed ? html`<p class="warnp small">${t('panel.draft')}</p>` : ''}
        <button class="btn prim sm" id="tApplyShape" ${left <= 0 || !changed ? raw('disabled') : ''}>${left <= 0 ? t('match.noChanges') : t('panel.applyShape', { n: left })}</button><button class="btn sm ghost" id="tShapeReset" ${changed ? '' : raw('disabled')}>${t('panel.undo')}</button>${msg}${hak}</div>`;
  } else if (tab === 'duty') {
    const du = (p: { num: number }) => ((tm.duties || {})[p.num] || {}) as any;
    const opt = (p: { num: number }, k: string, def: string) => { const o = iopts('duty.' + k); return html`<select class="du" data-n="${p.num}" data-k="${k}"><option value="">${o.label}: ${def}</option>${o.opts.map((l, i) => html`<option value="${i}" ${du(p)[k] === i ? raw('selected') : ''}>${l}</option>`)}</select>`; };
    body = html`<div class="col wide">${live.filter((p) => p.pos !== 'GK').map((p) => html`<div class="row duty"><span class="who"><b>${p.num}</b> ${p.name} <span class="muted">${p.pos}</span></span>${opt(p, 'runs', t('duty.role'))}${opt(p, 'press', t('duty.role'))}${opt(p, 'pass', t('duty.role'))}${opt(p, 'mark', iopts('duty.mark').opts[0])}${p.pos === 'FB' ? opt(p, 'overlap', iopts('duty.overlap').opts[1]) : ''}</div>`)}</div>
      <div class="col"><p class="muted small">${t('tactics.rules')} (${t('tactics.rules.max', { n: RULES_MAX })})</p><div class="row wrap">${RULE_TEMPLATES.map((r) => html`<label class="tag chk"><input type="checkbox" class="rl" value="${r.id}" ${(tm.rules || []).some((x) => x.id === r.id) ? raw('checked') : ''}> ${r.label}</label>`)}</div>
        <button class="btn prim sm" id="tApplyDuty" ${left <= 0 ? raw('disabled') : ''}>${left <= 0 ? t('match.noChanges') : t('panel.applyDuty', { n: left })}</button>${msg}${hak}</div>`;
  } else {
    const kbar = (k: number) => html`<div class="k"><i style="width:${Math.round(k)}%"></i></div>`;
    body = html`<div class="col"><p class="muted small">${h.decide !== null ? html`<span class="warnp">${t('match.decide', { n: h.decide })}</span>` : t('panel.subs', { n: st.subsLeft[side], w: st.subWindowsLeft[side] })}</p>
        ${live.map((p) => html`<div class="pl ${S.subOut === p.num ? 'sel' : ''}" data-out="${p.num}"><b>${p.num}</b><span>${p.name} <span class="muted">${p.pos}</span>${pend.some((q) => q.out === p.num) ? html` <span class="neg">↓</span>` : ''}${p.injured ? html` <span class="neg">✚</span>` : ''}</span>${kbar(p.k)}</div>`)}</div>
      <div class="col"><p class="muted small">${t('squad.bench')}</p>${bench.length ? bench.map((b) => html`<div class="pl ${S.subOut !== null && suggestedSub(st, side, S.subOut) === b.num ? 'sel' : ''}" data-in="${b.num}"><b>${b.num}</b><span>${b.name} <span class="muted">${b.pos}</span>${pend.some((q) => q.inn === b.num) ? html` <span class="pos">↑</span>` : ''}</span>${kbar(b.k)}</div>`) : html`<p class="muted small">–</p>`}</div>`;
  }
  box.innerHTML = String(html`<div class="box panel"><div class="phead"><h3>${h.half ? t('match.half') : t('match.tactic')} <small>${tm.short} ${A.goals} : ${O.goals} ${opp.short}</small></h3><button class="btn prim sm" id="tClose">${h.half ? t('panel.startHalf') : t('btn.continue')}</button></div>
    <div class="seg sm tabs" id="tTabs">${TABS.map((id) => html`<button data-v="${id}" aria-pressed="${tab === id}">${t('panel.tab.' + id)}</button>`)}</div>
    <div class="cols">${body}</div></div>`);
  const inner = box.querySelector<HTMLElement>('.box')!; inner.scrollTop = keep;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => box.querySelector<T>(s);
  const re = () => renderPanel(box, h);
  const flash = (m: string) => { S.msg = m; re(); setTimeout(() => { if (S.msg === m) { S.msg = ''; const el = box.querySelector('#tMsg'); if (el) el.textContent = ''; } }, 6000); };
  const segClick = (id: string, f: (v: string) => void) => { const el = q(id); if (el) el.onclick = (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (b) f(b.dataset.v!); }; };
  segClick('#tTabs', (v) => { S.tab = v; re(); });
  segClick('#tMent', (v) => { h.setMent(+v); h.ment = +v; re(); });
  segClick('#tMode', (v) => { h.setMode(v as 'team' | 'sim'); h.team = v === 'team'; re(); });
  const ap = q('#tApply'); if (ap) ap.onclick = () => {
    const patch: Partial<TacticIn> = {}; for (const s2 of box.querySelectorAll<HTMLSelectElement>('.tk')) (patch as any)[s2.dataset.k!] = +s2.value;
    const doc = q<HTMLSelectElement>('#tDoc')!.value as Doctrine; if (doc !== (tac.doctrine || 'balanced')) patch.doctrine = doc;
    const ok = setTactic(st, side, patch); if (ok) h.banner(t('match.tacticApplied').toUpperCase()); flash(ok ? t('panel.applied') : t('match.noChanges'));
  };
  const mini = q('#tMini');
  if (mini) {
    const d = draftOf(h); const show = d.show; const shape = show === 'def' ? d.shapeDef : d.shapeAtt;
    segClick('#tShp', (v) => { d.show = v as 'def' | 'att'; re(); });
    q('#tShLoadBtn')!.onclick = () => { const f = q<HTMLSelectElement>('#tShLoad')!.value as Formation; if (show === 'def') { d.formation = f; d.shapeDef = FORMATIONS[f].map((x) => [x[0], x[1]]); } else { d.formAtt = f; d.shapeAtt = attackShapeOf(FORMATIONS[f], FORM_POS[f], tac.doctrine).map((x) => [x[0], x[1]]); } re(); };
    const rs = q('#rotStart'); if (rs) rs.onclick = () => { d.rot = { cur: [] }; re(); };
    const rc = q('#rotCancel'); if (rc) rc.onclick = () => { d.rot = null; re(); };
    const rk = q('#rotClose'); if (rk) rk.onclick = () => { d.rotations.push(d.rot!.cur); d.rot = null; re(); };
    for (const b of box.querySelectorAll<HTMLElement>('.rotDel')) b.onclick = () => { d.rotations.splice(+b.dataset.k!, 1); re(); };
    if (d.rot) {
      mini.onclick = (e) => { const dot = (e.target as HTMLElement).closest<HTMLElement>('.dot'); if (!dot) return; const p = live.find((x) => x.idx === +dot.dataset.i!); if (!p || p.pos === 'GK') return; const n = p.num, cur = d.rot!.cur; if (d.rotations.flat().includes(n)) return; if (cur.length >= 2 && n === cur[0]) { d.rotations.push(cur); d.rot = null; re(); return; } if (cur.includes(n) || cur.length >= 6) return; cur.push(n); re(); };
    } else {
      let drag: HTMLElement | null = null;
      const toXY = (ev: PointerEvent) => { const r = mini.getBoundingClientRect(); return [Math.max(2, Math.min(103, ((ev.clientX - r.left) / r.width) * 105)), Math.max(2, Math.min(66, ((ev.clientY - r.top) / r.height) * 68))]; };
      mini.onpointerdown = (ev) => { const dot = (ev.target as HTMLElement).closest<HTMLElement>('.dot'); if (!dot) return; drag = dot; try { dot.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); };
      mini.onpointermove = (ev) => { if (!drag) return; const [x, y] = toXY(ev); drag.style.left = (x / 105) * 100 + '%'; drag.style.top = (y / 68) * 100 + '%'; };
      mini.onpointerup = (ev) => { if (!drag) return; const i = +drag.dataset.i!; const [x0, y] = toXY(ev); shape[i] = [Math.round((i === 0 ? Math.min(x0, 14) : x0) * 10) / 10, Math.round(y * 10) / 10]; drag = null; re(); };
      mini.onpointercancel = () => { drag = null; };
    }
    q('#tShapeReset')!.onclick = () => { S.draft = null; re(); };
    q('#tApplyShape')!.onclick = () => {
      const patch: Partial<TacticIn> = { shapeDef: d.shapeDef.map((x) => [x[0], x[1]] as [number, number]), shapeAtt: d.shapeAtt.map((x) => [x[0], x[1]] as [number, number]), rotations: d.rotations.length ? d.rotations.map((c) => [...c]) : undefined };
      const nRot = d.rotations.length, f = d.formation;
      const ok = setTactic(st, side, patch, f !== tm.formation ? f : undefined); if (ok && !patch.rotations) setRotations(st, side, undefined as any);
      S.draft = null; if (ok) h.banner(t('panel.shapeApplied').toUpperCase()); flash(ok ? `${t('panel.applied')} ${f} · ↻ ${nRot}` : t('match.noChanges'));
    };
  }
  const ad = q('#tApplyDuty'); if (ad) ad.onclick = () => {
    const du: Record<number, any> = {}; for (const s2 of box.querySelectorAll<HTMLSelectElement>('.du')) { if (s2.value === '') continue; const n = +s2.dataset.n!; du[n] = du[n] || {}; du[n][s2.dataset.k!] = +s2.value; }
    const rl = [...box.querySelectorAll<HTMLInputElement>('.rl:checked')].map((x) => x.value); if (rl.length > RULES_MAX) { flash(t('tactics.rules.max', { n: RULES_MAX })); return; }
    const ok = applyDutiesRules(st, side, du, rl.map((id) => RULE_TEMPLATES.find((r) => r.id === id)!).filter(Boolean));
    if (ok) h.banner(t('panel.dutyApplied').toUpperCase()); flash(ok ? t('panel.applied') : t('match.noChanges'));
  };
  inner.onclick = (e) => {
    const o = (e.target as HTMLElement).closest<HTMLElement>('[data-out]'), i = (e.target as HTMLElement).closest<HTMLElement>('[data-in]');
    if (o) { S.subOut = S.subOut === +o.dataset.out! ? null : +o.dataset.out!; re(); }
    else if (i && S.subOut !== null) { const ok = userSub(st, side, S.subOut, +i.dataset.in!); h.banner((ok ? t('match.subQueued') : t('match.subFail')).toUpperCase(), ok ? t('match.subPending') : undefined); S.subOut = null; re(); }
  };
  q('#tClose')!.onclick = () => h.close();
}
