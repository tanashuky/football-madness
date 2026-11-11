// Takim: kadro (dizilis, forma no) ve taktik tahtasi (Kolay / Orta / Derin: sekiller, gorev kartlari, kurallar, rotasyon)
import { DOCTRINES, DOCTRINE_LIST, FORMATION_LIST, FORM_POS, RULE_TEMPLATES, RULES_MAX } from '../engine.js';
import { $, html, raw } from '../core/html.js';
import { t, opts as iopts } from '../core/i18n.js';
import { go, register } from '../core/router.js';
import { store, save } from '../core/store.js';
import { card, muted, seg, tag, toast } from '../core/ui.js';
import { reslot, setShirtNumber, swapPlayers, userShapes, userTeamIn } from '../model/club.js';
import { careerTabs, onCareerTab } from './career.js';
const posName = (p) => t('pos.' + p);
register('squad', (c) => {
    const k = store.db.career;
    if (!k) {
        go('home', {}, false);
        return { html: '' };
    }
    const club = store.db.account.club;
    const tt = k.team;
    const team = userTeamIn(club, k.roster, tt);
    const sel = c.sel ?? null;
    const injOf = (id) => k.roster.find((p) => p.id === id)?.inj || 0;
    const all = [...team.players.map((p, i) => ({ ...p, xi: true, slot: i })), ...team.bench.map((p) => ({ ...p, xi: false, slot: -1 }))];
    const p = sel !== null ? all.find((q) => q.id === sel) : null;
    const row = (q) => html `<button class="li ${q.id === sel ? 'sel' : ''}" data-go="squad" data-push="0" data-ctx='${JSON.stringify(c.swap ? { ...c, target: q.id } : { sel: q.id })}'><div class="num">${q.num}</div><div><div class="nm">${q.name}</div><div class="sub">${q.xi ? posName(q.pos) : posName(q.natPos) + ' · ' + t('squad.bench')} · ${q.age} ${t('squad.age')}${(q.traits || []).map((tr) => ` · ${tr}`).join('')}${injOf(q.id) ? html ` ${tag('✚ ' + t('inj.matches', { n: injOf(q.id) }), 'r')}` : ''}${q.xi && q.natPos !== q.pos ? html ` ${tag(posName(q.natPos), 'o')}` : ''}</div></div><div class="gg">${q.gg}</div></button>`;
    return { title: t('team.squad'), tabs: careerTabs('team'), onTab: onCareerTab, html: html `
    ${muted(c.swap ? t('squad.swap') : t('squad.hint', { f: tt.formation }))}
    <div class="cards two">
      <div class="list"><div class="muted">${t('squad.xi')}</div>${all.filter((q) => q.xi).map(row)}<div class="muted gap">${t('squad.bench')}</div>${all.filter((q) => !q.xi).map(row)}</div>
      <div>${p ? card(html `${p.num} ${p.name} <small>${posName(p.natPos)}${p.xi ? ` · ${posName(p.pos)}` : ' · ' + t('squad.bench')}</small>`, html `
        <div class="row wrap">${tag(`${t('squad.gg')} ${p.gg}`, 'y')}${tag(`${p.age} ${t('squad.age')}`)}${(p.traits || []).map((tr) => tag(tr, 'g'))}${tag(`${t('squad.fatigue')} ${p.fatigue ?? 20}`)}</div>
        <div class="row">${c.swap ? html `<span class="muted">${t('squad.swap')}</span><button class="btn sm ghost" data-go="squad" data-push="0" data-ctx='${JSON.stringify({ sel: p.id })}'>${t('btn.cancel')}</button>` : html `<button class="btn sm" data-go="squad" data-push="0" data-ctx='${JSON.stringify({ sel: p.id, swap: p.id })}'>${t('squad.swapBtn')}</button><label class="f inline">${t('squad.number')} <input type="number" id="sqNum" min="1" max="99" value="${p.num}"><button class="btn sm" id="sqNumOk">${t('squad.number.set')}</button></label></div>
        <div class="row"><button class="btn sm ghost" id="sqReset">${t('squad.reset')}</button></div>`}`) : card(t('squad.card'), muted(t('squad.pick')))}</div></div>`,
        after: () => {
            if (c.swap && c.target && c.target !== c.swap) {
                const lu = tt.lineup;
                const bringIn = lu.includes(c.swap) && !lu.includes(c.target) ? c.target : lu.includes(c.target) && !lu.includes(c.swap) ? c.swap : null;
                if (bringIn && injOf(bringIn)) {
                    toast(t('inj.cant'), 'err');
                    go('squad', { sel: c.swap }, false);
                    return;
                }
                swapPlayers(tt, c.swap, c.target);
                save();
                toast(t('squad.updated'), 'ok');
                go('squad', { sel: c.target }, false);
                return;
            }
            const r = $('sqReset');
            if (r)
                r.onclick = () => { delete tt.lineup; save(); go('squad', {}, false); };
            const nb = $('sqNumOk');
            if (nb)
                nb.onclick = () => { const res = setShirtNumber(k.roster, sel, +$('sqNum').value); if (res.err === 'range')
                    toast(t('squad.number.err.range'), 'err');
                else if (res.err === 'taken')
                    toast(t('squad.number.err.taken', { n: res.taken.num, name: res.taken.name }), 'err');
                else {
                    save();
                    toast(t('toast.saved'), 'ok');
                    go('squad', { sel }, false);
                } };
        } };
});
const INSTR = ['press', 'line', 'tempo', 'style', 'width', 'compact', 'fb', 'cm', 'runs'];
register('tactics', (c) => {
    const k = store.db.career;
    if (!k) {
        go('home', {}, false);
        return { html: '' };
    }
    const club = store.db.account.club;
    const tt = k.team;
    const level = c.level || 'easy';
    const team = userTeamIn(club, k.roster, tt);
    const show = c.shape || 'def';
    const sh = userShapes(tt);
    const shape = show === 'def' ? sh.def : sh.att;
    const rotMode = level === 'deep' && !!c.rot;
    const curRot = (c.rot && c.rot.cur) || [];
    const idOf = (i) => tt.lineup[i], idxOf = (id) => tt.lineup.indexOf(id);
    const arrow = (a, b, dashed) => { const [x1, y1] = shape[a], [x2, y2] = shape[b]; const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1; const sx = x1 + (dx / d) * 2.2, sy = y1 + (dy / d) * 2.2, ex = x2 - (dx / d) * 2.6, ey = y2 - (dy / d) * 2.6; return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${dashed ? 'var(--warn)' : '#fff'}" stroke-width="0.7" ${dashed ? 'stroke-dasharray="1.5 1"' : ''} marker-end="url(#ah)"/>`; };
    let rotSvg = '';
    if (level === 'deep') {
        const parts = [];
        for (const cyc of tt.rotations || []) {
            const ix = cyc.map(idxOf).filter((i) => i >= 0);
            for (let q = 0; q < ix.length; q++)
                parts.push(arrow(ix[q], ix[(q + 1) % ix.length], false));
        }
        const ci = curRot.map(idxOf).filter((i) => i >= 0);
        for (let q = 0; q + 1 < ci.length; q++)
            parts.push(arrow(ci[q], ci[q + 1], true));
        rotSvg = `<svg class="rot" viewBox="0 0 105 68" preserveAspectRatio="none"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#fff"/></marker></defs>${parts.join('')}</svg>`;
    }
    const inRot = new Set([...(tt.rotations || []).flat(), ...curRot]);
    const dots = shape.map(([x, y], i) => html `<div class="dot ${show === 'att' ? 'att' : ''} ${inRot.has(idOf(i)) ? 'inrot' : ''}" data-i="${i}" style="left:${(x / 105) * 100}%;top:${(y / 68) * 100}%;background:${team.color}">${team.players[i].num}</div>`);
    const rotList = level === 'deep' ? html `<div class="row wrap">${(tt.rotations || []).map((cyc, q) => tag(html `↻ ${cyc.map((id) => { const i = idxOf(id); return i >= 0 ? team.players[i].num : '?'; }).join(' → ')} <button class="x rotDel" data-k="${q}">×</button>`))}${rotMode ? html `<span class="muted">${curRot.length ? `${curRot.map((id) => team.players[idxOf(id)].num).join(' → ')}` : t('tactics.rotation.hint')}</span>${curRot.length >= 2 ? html `<button class="btn sm" id="rotClose">${t('tactics.rotation.close')}</button>` : ''}<button class="btn sm ghost" id="rotCancel">${t('tactics.rotation.cancel')}</button>` : html `<button class="btn sm ghost" id="rotStart">${t('tactics.rotation.start')}</button>`}</div>` : html ``;
    const shapeCard = card(html `${show === 'def' ? t('tactics.shape.def') : t('tactics.shape.att')}`, html `<div class="pitchmini ${rotMode ? 'rotmode' : ''}" id="mini">${raw(rotSvg)}${dots}</div>${rotList}
    <div class="row">${seg('shp', [['def', t('tactics.shape.def')], ['att', t('tactics.shape.att')]], show, 'data-s')}</div>
    ${level === 'deep' ? html `<div class="row"><label class="f">${t('tactics.load')}<select id="shLoad">${FORMATION_LIST.map((f) => html `<option ${f === (show === 'def' ? tt.formation : tt.formationAtt || tt.formation) ? raw('selected') : ''}>${f}</option>`)}</select></label><button class="btn sm" id="shLoadBtn">${t('btn.apply')}</button><button class="btn sm ghost" id="shReset">${t('tactics.reset')}</button></div>${muted(t('tactics.drag'))}` : muted(t('tactics.easy.shape'))}`);
    let right = html ``;
    if (level !== 'deep') {
        right = html `<label class="f">${t('tactics.formation')}<select id="tForm">${FORMATION_LIST.map((f) => html `<option ${f === tt.formation ? raw('selected') : ''}>${f}</option>`)}</select></label>
      <label class="f">${t('tactics.formationAtt')}<select id="tFormAtt">${FORMATION_LIST.map((f) => html `<option ${f === (tt.formationAtt || tt.formation) ? raw('selected') : ''}>${f}</option>`)}</select></label>
      <label class="f">${t('tactics.doctrine')}<select id="tDoc">${DOCTRINE_LIST.map((d) => html `<option value="${d}" ${d === tt.doctrine ? raw('selected') : ''}>${DOCTRINES[d].label}</option>`)}</select></label>
      ${level === 'easy' ? html `<label class="f">${iopts('instr.compact').label}<select id="tCompact">${iopts('instr.compact').opts.map((l, i) => html `<option value="${i}" ${i === (tt.tactic.compact ?? 1) ? raw('selected') : ''}>${l}</option>`)}</select></label>${muted(t('tactics.easy.desc'))}`
            : html `<div class="grid2">${INSTR.map((kk) => { const o = iopts('instr.' + kk); return html `<label class="f">${o.label}<select data-k="${kk}" class="tk">${o.opts.map((l, i) => html `<option value="${i}" ${i === (tt.tactic[kk] ?? 1) ? raw('selected') : ''}>${l}</option>`)}</select></label>`; })}<label class="f">${iopts('instr.trap').label}<select data-k="trap" class="tk"><option value="0" ${!tt.tactic.trap ? raw('selected') : ''}>${iopts('instr.trap').opts[0]}</option><option value="1" ${tt.tactic.trap ? raw('selected') : ''}>${iopts('instr.trap').opts[1]}</option></select></label></div>${muted(t('tactics.mid.desc'))}`}`;
    }
    else {
        const du = (p, key, def) => { const o = iopts('duty.' + key); const d = ((tt.duties || {})[p.id] || {}); return html `<select class="du" data-n="${p.id}" data-k="${key}"><option value="">${o.label}: ${def}</option>${o.opts.map((l, i) => html `<option value="${i}" ${d[key] === i ? raw('selected') : ''}>${l}</option>`)}</select>`; };
        right = html `<p class="muted">${t('tactics.duties')}</p>
      ${team.players.filter((p) => p.pos !== 'GK').map((p) => html `<div class="row duty"><span class="who"><b>${p.num}</b> ${p.name} <span class="muted">${posName(p.pos)}</span></span>${du(p, 'runs', t('duty.role'))}${du(p, 'press', t('duty.role'))}${du(p, 'pass', t('duty.role'))}${du(p, 'mark', iopts('duty.mark').opts[0])}${p.pos === 'FB' ? du(p, 'overlap', iopts('duty.overlap').opts[1]) : ''}</div>`)}
      <p class="muted gap">${t('tactics.rules')} (${t('tactics.rules.max', { n: RULES_MAX })})</p>
      <div class="row wrap">${RULE_TEMPLATES.map((r) => html `<label class="tag chk"><input type="checkbox" class="rl" value="${r.id}" ${(tt.rules || []).includes(r.id) ? raw('checked') : ''}> ${r.label}</label>`)}</div>${muted(t('tactics.deep.desc'))}`;
    }
    return { title: t('tactics.title'), tabs: careerTabs('team'), onTab: onCareerTab, html: html `
    <div class="row between">${seg('lvl', [['easy', t('tactics.level.easy')], ['mid', t('tactics.level.mid')], ['deep', t('tactics.level.deep')]], level, 'data-l')}<span class="muted">${tt.shapeDef || tt.shapeAtt ? t('tactics.custom') : `${tt.formation} → ${tt.formationAtt || tt.formation} · ${DOCTRINES[tt.doctrine].label}`}</span></div>
    <div class="cards two">${shapeCard}${card('', html `${right}<div class="row gap"><button class="btn prim" id="tSave">${t('btn.save')}</button></div>`)}</div>`,
        after: () => {
            $('lvl').onclick = (e) => { const b = e.target.closest('button'); if (b)
                go('tactics', { ...c, level: b.dataset.l }, false); };
            $('shp').onclick = (e) => { const b = e.target.closest('button'); if (b)
                go('tactics', { ...c, shape: b.dataset.s }, false); };
            const rs = $('shReset');
            if (rs)
                rs.onclick = () => { if (show === 'def')
                    delete tt.shapeDef;
                else
                    delete tt.shapeAtt; save(); go('tactics', { ...c }, false); };
            const lb = $('shLoadBtn');
            if (lb)
                lb.onclick = () => { const f = $('shLoad').value; if (show === 'def') {
                    if (f !== tt.formation && Array.isArray(tt.lineup))
                        tt.lineup = reslot(k.roster, tt.lineup, FORM_POS[f]);
                    tt.formation = f;
                    delete tt.shapeDef;
                }
                else {
                    tt.formationAtt = f;
                    delete tt.shapeAtt;
                } save(); toast(f, 'ok'); go('tactics', { ...c }, false); };
            if (level === 'deep') {
                const r1 = $('rotStart');
                if (r1)
                    r1.onclick = () => go('tactics', { ...c, rot: { cur: [] } }, false);
                const rc = $('rotCancel');
                if (rc)
                    rc.onclick = () => { const c2 = { ...c }; delete c2.rot; go('tactics', c2, false); };
                const closeRot = () => { tt.rotations = [...(tt.rotations || []), curRot]; save(); const c2 = { ...c }; delete c2.rot; toast(t('tactics.saved'), 'ok'); go('tactics', c2, false); };
                const rk = $('rotClose');
                if (rk)
                    rk.onclick = closeRot;
                for (const b of document.querySelectorAll('.rotDel'))
                    b.onclick = () => { tt.rotations = (tt.rotations || []).filter((_, q) => q !== +b.dataset.k); save(); go('tactics', { ...c }, false); };
                const mini = $('mini');
                if (rotMode) {
                    mini.addEventListener('click', (ev) => {
                        const d = ev.target.closest('.dot');
                        if (!d)
                            return;
                        const i = +d.dataset.i;
                        const id = idOf(i);
                        if (team.players[i].pos === 'GK') {
                            toast(t('tactics.rotation.gk'), 'err');
                            return;
                        }
                        if ((tt.rotations || []).flat().includes(id)) {
                            toast(t('tactics.rotation.dup'), 'err');
                            return;
                        }
                        if (curRot.length >= 2 && id === curRot[0]) {
                            closeRot();
                            return;
                        }
                        if (curRot.includes(id))
                            return;
                        if (curRot.length >= 6) {
                            toast(t('tactics.rotation.max'), 'err');
                            return;
                        }
                        go('tactics', { ...c, rot: { cur: [...curRot, id] } }, false);
                    });
                }
                else {
                    let drag = null;
                    const toXY = (ev) => { const r = mini.getBoundingClientRect(); return [Math.max(2, Math.min(103, ((ev.clientX - r.left) / r.width) * 105)), Math.max(2, Math.min(66, ((ev.clientY - r.top) / r.height) * 68))]; };
                    mini.addEventListener('pointerdown', (ev) => { const d = ev.target.closest('.dot'); if (!d)
                        return; drag = d; try {
                        d.setPointerCapture(ev.pointerId);
                    }
                    catch (e) { } ev.preventDefault(); });
                    mini.addEventListener('pointermove', (ev) => { if (!drag)
                        return; const [x, y] = toXY(ev); drag.style.left = (x / 105) * 100 + '%'; drag.style.top = (y / 68) * 100 + '%'; });
                    const drop = (ev) => { if (!drag)
                        return; const i = +drag.dataset.i; const [x0, y0] = toXY(ev); const x = i === 0 ? Math.min(x0, 14) : x0; const key = show === 'def' ? 'shapeDef' : 'shapeAtt'; const cur = (tt[key] || (show === 'def' ? sh.def : sh.att)).map((q) => [q[0], q[1]]); cur[i] = [Math.round(x * 10) / 10, Math.round(y0 * 10) / 10]; tt[key] = cur; save(); drag = null; };
                    mini.addEventListener('pointerup', drop);
                    mini.addEventListener('pointercancel', () => { drag = null; });
                }
            }
            $('tSave').onclick = () => {
                if (level !== 'deep') {
                    const nf = $('tForm').value, nfa = $('tFormAtt').value, nd = $('tDoc').value;
                    const docChanged = nd !== tt.doctrine;
                    if (nf !== tt.formation) {
                        delete tt.shapeDef;
                        if (Array.isArray(tt.lineup))
                            tt.lineup = reslot(k.roster, tt.lineup, FORM_POS[nf]);
                    }
                    if (nfa !== (tt.formationAtt || tt.formation) || docChanged)
                        delete tt.shapeAtt;
                    tt.formation = nf;
                    tt.formationAtt = nfa;
                    tt.doctrine = nd;
                    if (level === 'easy')
                        tt.tactic = { ...DOCTRINES[nd].tactic, compact: +$('tCompact').value };
                    else {
                        if (docChanged)
                            tt.tactic = { ...DOCTRINES[nd].tactic };
                        for (const s of document.querySelectorAll('.tk'))
                            tt.tactic[s.dataset.k] = +s.value;
                    }
                }
                else {
                    const du = {};
                    for (const s of document.querySelectorAll('.du')) {
                        if (s.value === '')
                            continue;
                        du[s.dataset.n] = du[s.dataset.n] || {};
                        du[s.dataset.n][s.dataset.k] = +s.value;
                    }
                    tt.duties = du;
                    const rl = [...document.querySelectorAll('.rl:checked')].map((x) => x.value);
                    if (rl.length > RULES_MAX) {
                        toast(t('tactics.rules.max', { n: RULES_MAX }), 'err');
                        return;
                    }
                    tt.rules = rl;
                }
                save();
                toast(t('tactics.saved'), 'ok');
                go('tactics', { ...c }, false);
            };
        } };
});
