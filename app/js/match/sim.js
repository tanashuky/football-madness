// Mac ekrani (Total simulation): motor adim adim kosar, tuval cizer; kullanici kaydirici (zihniyet), talimat ve degisiklik verir.
// Team play (joystick, vurus jesti) bu surumde demoda kalir; sonraki adimda buraya tasinir. Tekrar izleme de bu ekrandan (watchReplay).
import { P, applyCmd, autoSubsFor, ballMoving, controlledPlayer, createMatch, pendingSubs, replayOf, setControl, setMentality, setTactic, step, suggestedSub, userSub } from '../engine.js';
import { $, html, raw } from '../core/html.js';
import { t, opts as iopts } from '../core/i18n.js';
import { confirmBox, toast } from '../core/ui.js';
import { reportError } from '../core/errors.js';
import * as ctl from './controls.js';
const SIM_DT = 0.1, PLAY_DT = 0.05, SPEED = 1.3; // fizik adimi ve oynama hizi (mac ~ minutes dakika surer)
const CAMS = { full: { mode: 'full', w: 65 }, length: { mode: 'smart', w: 108 }, near: { mode: 'smart', w: 65 } };
const PADX = 3.2, PADY = 2.2;
const M = {
    on: false, st: null, side: 0, user: 1, paused: false, acc: 0, prev: [], last: 0, raf: 0, endAt: 0, ment: 0,
    hooks: null, replay: null,
    names: 'auto', ball: 1.4, reduce: false, evSeen: 0, lastDead: -1, banners: [], trail: [],
    cam: { mode: 'full', w: 65, cx: 52.5, cy: 34, vx: 0, vy: 0, lx: 0, ly: 0, lt: 0 }, camKey: 'full', lastW: 0, lastH: 0, tacOpen: false, team: false, keys: 'arrows', vib: true, decide: null,
    kit: ['#d2433d', '#3b6fd6'], // cizim renkleri (forma catismasinda deplasman ikinci rengine ya da notr renge gecer)
    kitText: ['#fff', '#fff'], // numara rengi (acik formada koyu)
};
const lum = (h) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const rgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); if (!m)
    return [128, 128, 128]; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const colorDist = (a, b) => { const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b); return Math.hypot(r1 - r2, g1 - g2, b1 - b2); };
export function kitColors(home, away) {
    const h = home.color || '#d2433d';
    for (const c of [away.color, away.color2, '#e9efe9', '#f2d94e', '#1b1a0c'])
        if (c && colorDist(h, c) > 110)
            return [h, c];
    return [h, away.color || '#3b6fd6'];
}
let cv, ctx;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#fff';
const snapshot = (st) => st.players.map((p) => [p.x, p.y, 0]).concat([[st.ball.x, st.ball.y, st.ballZ]]);
const isDead = (st) => st.t < st.restartUntil && !ballMoving(st);
const clockText = (st) => { const m = Math.floor(st.clock / 60), s = Math.floor(st.clock % 60); return `${m}:${String(s).padStart(2, '0')}`; };
function hud() {
    const st = M.st;
    const rep = !!M.replay;
    const ment = iopts('match.ment.' + M.ment);
    return String(html `
  <div class="mTop">
    <div class="sc"><span class="tm"><i style="background:${M.kit[0]}"></i>${st.teams[0].short}</span><b id="mScore">0 : 0</b><span class="tm b">${st.teams[1].short}<i style="background:${M.kit[1]}"></i></span></div>
    <div class="clk" id="mClock">0:00</div>
    <div class="right">${M.team ? html `<button class="btn sm" id="mTac">${t('match.tactic')}</button>` : ''}<button class="ib" id="mCam" title="${t('room.camera')}">⌖</button><button class="ib" id="mPause">❚❚</button><button class="ib" id="mExit">✕</button></div>
  </div>
  <div class="mTicker" id="mTicker"></div>
  ${M.team ? '' : html `<div class="mBottom">
    ${rep ? html `<span class="tag">${t('report.replay')}</span>` : html `<div class="ment"><button class="ib" id="mentDn">◀</button><span id="mentOut">${ment.label}</span><button class="ib" id="mentUp">▶</button></div><button class="btn sm" id="mTac">${t('match.tactic')}</button>`}
    <div class="seg sm" id="mSpeed"><button data-v="1" aria-pressed="true">1×</button><button data-v="2" aria-pressed="false">2×</button><button data-v="4" aria-pressed="false">4×</button></div>
  </div>`}
  <div class="mOverlay" id="mPauseBox" hidden><div class="box"><h3>${t('match.pause')}</h3><div class="row"><button class="btn prim" id="mResume">${t('match.resume')}</button><button class="btn ghost" id="mQuit">${t('match.exit')}</button></div></div></div>
  <div class="mOverlay" id="mTacBox" hidden></div>
  <div class="rotate" id="mRotate">${t('match.rotate')}</div>`);
}
function tacPanel() {
    const st = M.st, tm = st.teams[M.side];
    const tac = tm.tactic;
    const left = 3 - st.tacticChanges[M.side];
    const keys = ['press', 'line', 'tempo', 'style', 'width'];
    const subs = pendingSubs(st, M.side);
    const onPitch = st.players.filter((p) => p.side === M.side && !p.off).sort((a, b) => a.idx - b.idx);
    const bench = st.bench[M.side].filter((b) => b.off && !b.subbed && !subs.some((s) => s.inn === b.num));
    const mo = [-2, -1, 0, 1, 2].map((m) => [String(m), iopts('match.ment.' + m).label]);
    return String(html `<div class="box wide"><h3>${t('match.tactic')} <small>${t('match.changesLeft', { n: left })} · ${st.stats[0].goals} : ${st.stats[1].goals}</small></h3>
    ${M.decide !== null ? html `<p class="warnp">${t('match.decide', { n: M.decide })}</p>` : ''}
    <div class="row"><div class="seg sm" id="tMent">${mo.map(([v, l]) => html `<button data-v="${v}" aria-pressed="${+v === M.ment ? 'true' : 'false'}">${l}</button>`)}</div></div>
    <div class="grid2">${keys.map((k) => { const o = iopts('instr.' + k); return html `<label class="f">${o.label}<select class="tk" data-k="${k}">${o.opts.map((l, i) => html `<option value="${i}" ${i === (tac[k] ?? 1) ? raw('selected') : ''}>${l}</option>`)}</select></label>`; })}</div>
    <h4>${t('ev.sub')} <small>${t('match.subsLeft', { n: st.subsLeft[M.side] })}</small></h4>
    ${subs.length ? html `<p class="muted">${subs.map((s) => `${s.out} ↔ ${s.inn}`).join(', ')} · ${t('match.subPending')}</p>` : ''}
    <div class="grid2"><label class="f">${t('match.subOut')}<select id="subOut"><option value="">–</option>${onPitch.map((p) => html `<option value="${p.num}" ${p.num === M.decide ? raw('selected') : ''}>${p.num} ${p.name} · ${Math.round(p.k)}</option>`)}</select></label>
    <label class="f">${t('match.subIn')}<select id="subIn"><option value="">–</option>${bench.map((p) => html `<option value="${p.num}" ${M.decide !== null && suggestedSub(st, M.side, M.decide) === p.num ? raw('selected') : ''}>${p.num} ${p.name} · ${p.pos}</option>`)}</select></label></div>
    <div class="row end"><button class="btn ghost" id="tacClose">${t('btn.close')}</button><button class="btn prim" id="tacApply">${t('btn.apply')}</button></div></div>`);
}
function bind() {
    const root = $('match');
    $('mPause').onclick = () => togglePause();
    $('mResume').onclick = () => togglePause();
    $('mExit').onclick = () => askExit();
    $('mQuit').onclick = () => askExit();
    $('mCam').onclick = () => { const ks = Object.keys(CAMS); applyCam(ks[(ks.indexOf(M.camKey) + 1) % ks.length]); };
    const dn = $('mentDn'), up = $('mentUp');
    if (dn)
        dn.onclick = () => setMent(M.ment - 1);
    if (up)
        up.onclick = () => setMent(M.ment + 1);
    const tb = $('mTac');
    if (tb)
        tb.onclick = () => openTac();
    const sp = $('mSpeed');
    if (sp)
        sp.onclick = (e) => { const b = e.target.closest('button'); if (!b)
            return; M.user = +b.dataset.v; for (const x of sp.children)
            x.setAttribute('aria-pressed', String(x === b)); };
    root.onkeydown = null;
}
function openTac(decide = null) {
    if (!M.st || M.replay || M.st.done)
        return;
    M.decide = decide;
    ctl.resetInput();
    const box = $('mTacBox');
    box.innerHTML = tacPanel();
    box.hidden = false;
    M.tacOpen = true;
    if (!M.paused)
        togglePause(true);
    $('tacClose').onclick = () => closeTac();
    $('tMent').onclick = (e) => { const b = e.target.closest('button'); if (!b)
        return; setMent(+b.dataset.v); for (const x of $('tMent').children)
        x.setAttribute('aria-pressed', String(x === b)); };
    $('tacApply').onclick = () => {
        const st = M.st;
        const patch = {};
        let changed = false;
        for (const s of box.querySelectorAll('.tk')) {
            const k = s.dataset.k;
            const v = +s.value;
            if ((st.teams[M.side].tactic[k] ?? 1) !== v) {
                patch[k] = v;
                changed = true;
            }
        }
        if (changed) {
            if (!setTactic(st, M.side, patch))
                toast(t('match.noChanges'), 'err');
            else
                banner(t('match.tacticApplied').toUpperCase(), 'info');
        }
        const out = +(box.querySelector('#subOut').value || 0), inn = +(box.querySelector('#subIn').value || 0);
        if (out && inn) {
            if (!userSub(st, M.side, out, inn))
                toast(t('match.subFail'), 'err');
            else
                toast(t('match.subQueued'), 'ok');
        }
        closeTac();
    };
}
function closeTac() {
    // sakatlik / kaleci karari: degisiklik secilmediyse sistem en uygun yedegi alir
    if (M.decide !== null && M.st && !pendingSubs(M.st, M.side).some((q) => q.out === M.decide))
        autoSubsFor(M.st, M.side);
    M.decide = null;
    $('mTacBox').hidden = true;
    M.tacOpen = false;
    if (M.paused)
        togglePause(false);
}
function setMent(m) {
    if (!M.st || M.replay)
        return;
    M.ment = Math.max(-2, Math.min(2, m));
    setMentality(M.st, M.side, M.ment);
    const o = iopts('match.ment.' + M.ment);
    const mo = $('mentOut');
    if (mo)
        mo.textContent = o.label;
    banner(o.label.toUpperCase(), 'info', t('match.mentSub'));
}
function togglePause(force) {
    if (!M.st || M.st.done)
        return;
    M.paused = force === undefined ? !M.paused : force;
    ctl.resetInput();
    $('mPause').textContent = M.paused ? '▶' : '❚❚';
    $('mPauseBox').hidden = !M.paused || M.tacOpen;
}
async function askExit() {
    if (!M.on)
        return;
    const was = M.paused;
    if (!was)
        togglePause(true);
    const ok = M.st.done || M.replay ? true : await confirmBox(t('match.exit.confirm'), t('match.exit'), true);
    if (ok)
        exit();
    else if (!was)
        togglePause(false);
}
function applyCam(key) {
    M.camKey = key;
    const c = CAMS[key] || CAMS.full;
    M.cam.mode = c.mode;
    M.cam.w = c.w;
    if (M.st) {
        M.cam.cx = M.st.ball.x;
        M.cam.cy = M.st.ball.y;
        M.cam.vx = 0;
        M.cam.vy = 0;
    }
}
function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
    M.lastW = cv.clientWidth;
    M.lastH = cv.clientHeight;
    document.body.classList.toggle('portrait', innerHeight > innerWidth);
}
export function startMatch(o) {
    cv = $('pitch');
    ctx = cv.getContext('2d');
    P.clockRate = 90 / (o.minutes * SPEED);
    P.dt = o.mode === 'team' ? PLAY_DT : SIM_DT;
    P.playSpeed = SPEED;
    const st = createMatch(o.teams[0], o.teams[1], o.seed, { knockout: !!o.knockout });
    begin(st, o, null);
}
export function watchReplay(rep, o) {
    cv = $('pitch');
    ctx = cv.getContext('2d');
    Object.assign(P, JSON.parse(JSON.stringify(rep.P)));
    const teams = JSON.parse(JSON.stringify(rep.teams));
    const st = createMatch(teams[0], teams[1], rep.seed, { knockout: rep.knockout });
    st.rec = null;
    begin(st, { ...o, teams, minutes: 90 / (rep.P.clockRate * rep.P.playSpeed), seed: rep.seed }, { rep, ci: 0, done: false });
}
function begin(st, o, replay) {
    M.on = true;
    M.st = st;
    M.side = o.side;
    M.user = 1;
    M.paused = false;
    M.acc = 0;
    M.prev = snapshot(st);
    M.last = performance.now();
    M.endAt = 0;
    M.ment = 0;
    M.tacOpen = false;
    M.hooks = { onEnd: o.onEnd, onExit: o.onExit };
    M.replay = replay;
    M.names = o.names;
    M.ball = o.ball;
    M.reduce = !!o.reduceMotion;
    M.evSeen = 0;
    M.lastDead = -1;
    M.banners.length = 0;
    M.trail.length = 0;
    M.team = o.mode === 'team' && !replay;
    M.keys = o.keys ?? 'arrows';
    M.vib = o.vibration !== false;
    M.decide = null;
    if (M.team)
        setControl(st, M.side, 'team', o.assistP ?? 0, o.assistS ?? 1, { autoSwitch: o.autoSwitch ?? true });
    else if (!replay)
        setControl(st, M.side, 'none');
    document.body.classList.toggle('teamplay', M.team);
    ctl.install({ cv, st: () => M.st, side: () => M.side, active: () => M.on && M.team && !M.paused && !!M.st && !M.st.done, keys: () => M.keys, vibrate: () => M.vib,
        onPause: () => togglePause(), onExit: () => { if (M.tacOpen)
            closeTac();
        else
            askExit(); }, onTac: () => (M.tacOpen ? closeTac() : openTac()), onMent: (d) => setMent(M.ment + d), onCam: () => $('mCam').click() });
    M.kit = kitColors(st.teams[0], st.teams[1]);
    M.kitText = [lum(M.kit[0]) > 0.62 ? '#1b1a0c' : '#fff', lum(M.kit[1]) > 0.62 ? '#1b1a0c' : '#fff'];
    document.body.classList.add('match');
    $('match').hidden = false;
    $('mHud').innerHTML = hud();
    bind();
    applyCam(o.cam);
    fit();
    cancelAnimationFrame(M.raf);
    M.raf = requestAnimationFrame(frame);
}
export function exit() {
    if (!M.on)
        return;
    M.on = false;
    cancelAnimationFrame(M.raf);
    const hooks = M.hooks;
    M.hooks = null;
    const fin = M.st;
    M.st = null;
    M.replay = null;
    document.body.classList.remove('match', 'portrait', 'teamplay');
    $('match').hidden = true;
    $('mHud').innerHTML = '';
    if (hooks && hooks.onExit)
        hooks.onExit(fin); // terk edilen macin kalan suresi ayni P ile simule edilir (tekrar tutarliligi): once onExit, sonra P sifirlama
    P.clockRate = 6;
    P.dt = 0.1;
    P.playSpeed = 1;
}
export const isOn = () => M.on;
export const replayNow = () => (M.st ? replayOf(M.st) : null);
function frame(now) {
    if (!M.on)
        return;
    try {
        frameBody(now);
    }
    catch (e) {
        reportError('match', e);
        M.paused = true;
    }
    M.raf = requestAnimationFrame(frame);
}
function frameBody(now) {
    const st = M.st;
    const dtReal = Math.min(0.1, (now - M.last) / 1000);
    M.last = now;
    if (cv.clientWidth !== M.lastW || cv.clientHeight !== M.lastH)
        fit();
    let alpha = 1;
    if (!M.paused && !st.done) {
        M.acc += dtReal * (1 / st.dt) * SPEED * (M.team ? 1 : M.user);
        let guard = 0;
        while (M.acc >= 1 && !st.done && guard++ < 200) {
            M.prev = snapshot(st);
            if (M.replay) {
                const c = M.replay.rep.cmds;
                while (M.replay.ci < c.length && c[M.replay.ci].k <= st.stepN)
                    applyCmd(st, c[M.replay.ci++]);
                if (st.stepN >= M.replay.rep.steps)
                    M.replay.done = true;
            }
            else if (M.team)
                ctl.feedInput(st, M.side);
            if (M.replay && M.replay.done) {
                if (!st.done) {
                    st.done = true;
                    st.events.push({ t: st.clock, type: 'end', side: 0 });
                }
            }
            else
                step(st);
            M.acc -= 1;
            watchEvents(st);
        }
        alpha = Math.min(1, M.acc);
        if (st.done) {
            M.endAt = M.endAt || performance.now();
        }
        $('mScore').textContent = `${st.stats[0].goals} : ${st.stats[1].goals}`;
        $('mClock').textContent = clockText(st) + (st.half === 2 ? ' · 2' : st.half > 2 ? ' · ET' : '');
    }
    if (M.endAt && performance.now() - M.endAt > 2200 && M.hooks) {
        const h = M.hooks;
        const fin = st;
        M.hooks = null;
        M.on = false;
        document.body.classList.remove('match', 'portrait', 'teamplay');
        $('match').hidden = true;
        $('mHud').innerHTML = '';
        M.st = null;
        M.replay = null;
        P.clockRate = 6;
        P.dt = 0.1;
        P.playSpeed = 1;
        h.onEnd(fin);
        return;
    }
    draw(st, M.paused || M.reduce ? 1 : alpha, now);
}
function banner(text, kind, sub) { M.banners.push({ text, kind, sub, t0: performance.now() }); if (M.banners.length > 3)
    M.banners.shift(); }
function ticker(text) { const el = $('mTicker'); if (el) {
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
} }
function watchEvents(st) {
    for (; M.evSeen < st.events.length; M.evSeen++) {
        const e = st.events[M.evSeen];
        const tm = st.teams[e.side];
        const pl = e.player ? st.players.find((p) => p.side === e.side && p.num === e.player) : null;
        const who = pl ? `#${pl.num} ${pl.name}` : '';
        if (e.type === 'red' && M.team && e.side === M.side && pl && pl.pos === 'GK') {
            const n = pl.num;
            setTimeout(() => { if (M.on && M.st === st)
                openTac(n); }, 700);
        }
        if (e.type === 'goal') {
            banner(t('ev.goal') + '!', 'goal', `${tm.short} · ${who}`);
            ticker(`${Math.floor(e.t / 60) + 1}' ${t('ev.goal')} ${tm.short} ${who}`);
        }
        else if (e.type === 'yellow') {
            banner(t('ev.yellow').toUpperCase(), 'yellow', `${tm.short} · ${who}`);
            ticker(`${Math.floor(e.t / 60) + 1}' ${t('ev.yellow')} ${tm.short} ${who}`);
        }
        else if (e.type === 'red') {
            banner(t('ev.red').toUpperCase(), 'red', `${tm.short} · ${who}`);
            ticker(`${Math.floor(e.t / 60) + 1}' ${t('ev.red')} ${tm.short} ${who}`);
        }
        else if (e.type === 'penalty')
            banner(t('ev.penalty').toUpperCase(), 'info', tm.short);
        else if (e.type === 'miss' && e.text && /direk/.test(e.text)) {
            banner(t('ev.post').toUpperCase() + '!', 'info', `${tm.short} · ${who}`);
        }
        else if (e.type === 'injury' && M.team && e.side === M.side && e.player) {
            banner(t('ev.injury').toUpperCase(), 'red', `${tm.short} · ${who}`);
            const n = e.player;
            setTimeout(() => { if (M.on && M.st === st)
                openTac(n); }, 700);
        }
        else if (e.type === 'injury')
            ticker(`${Math.floor(e.t / 60) + 1}' ${t('ev.injury')} ${tm.short} ${who}`);
        else if (e.type === 'sub')
            ticker(`${Math.floor(e.t / 60) + 1}' ${t('ev.sub')} ${tm.short} ${e.player2 ?? ''} → ${e.player ?? ''}`);
        else if (e.type === 'half') {
            banner(t('match.half').toUpperCase(), 'info');
            if (M.team)
                setTimeout(() => { if (M.on && M.st === st)
                    openTac(); }, 900);
        }
        else if (e.type === 'end')
            banner(t('match.end').toUpperCase(), 'info');
        else if (e.type === 'rule' && e.side === M.side && e.text)
            banner(e.text.toUpperCase(), 'rule', t('match.ruleFired'));
    }
    if (st.deadStart !== M.lastDead && isDead(st) && st.deadReason && st.deadReason !== 'GOL' && st.deadReason !== 'Penaltı')
        banner(st.deadReason.toUpperCase(), 'info');
    if (st.deadStart !== M.lastDead && M.team)
        ctl.onDead();
    M.lastDead = st.deadStart;
}
// ---------- cizim (demo sayfasindan tasindi; saha, oyuncular, efektler, top, pankartlar) ----------
function draw(st, alpha, now) {
    const Wc = cv.width, Hc = cv.height;
    if (!(Wc > 0 && Hc > 0))
        return;
    const PW = 105 + 2 * PADX, PH = 68 + 2 * PADY;
    let s, ox, oy;
    const C = M.cam;
    if (C.mode === 'smart') {
        s = Wc / C.w;
        const vh = Hc / s;
        const cdt = Math.min(0.05, (now - (C.lt || now)) / 1000);
        C.lt = now;
        const lx = (st.ball.vx ?? 0) * 0.35, ly = (st.ball.vy ?? 0) * 0.35, kl = 1 - Math.exp(-cdt * 2.0);
        C.lx += (Math.max(-8, Math.min(8, lx)) - C.lx) * kl;
        C.ly += (Math.max(-5, Math.min(5, ly)) - C.ly) * kl;
        const tx = st.ball.x + C.lx, ty = st.ball.y + C.ly, w0 = 3.2;
        C.vx += ((tx - C.cx) * w0 * w0 - 2 * w0 * C.vx) * cdt;
        C.vy += ((ty - C.cy) * w0 * w0 - 2 * w0 * C.vy) * cdt;
        const cv0 = Math.hypot(C.vx, C.vy), vmax = 26;
        if (cv0 > vmax) {
            C.vx *= vmax / cv0;
            C.vy *= vmax / cv0;
        }
        C.cx += C.vx * cdt;
        C.cy += C.vy * cdt;
        ox = Math.max(-PADX, Math.min(105 + PADX - C.w, C.cx - C.w / 2));
        oy = vh >= PH ? -PADY - (vh - PH) / 2 : Math.max(-PADY, Math.min(68 + PADY - vh, C.cy - vh / 2));
    }
    else {
        s = Math.min(Wc / PW, Hc / PH);
        ox = -PADX - (Wc / s - PW) / 2;
        oy = -PADY - (Hc / s - PH) / 2;
    }
    const X = (x) => (x - ox) * s, Y = (y) => (y - oy) * s;
    const g1 = css('--grass'), g2 = css('--grass2');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, Wc, Hc);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(0, 0, Wc, Hc);
    for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? g1 : g2;
        ctx.fillRect(X((i * 105) / 14), Y(0), (105 / 14) * s + 1, 68 * s);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = Math.max(1, s * 0.15);
    const R = (x, y, w, h) => ctx.strokeRect(X(x), Y(y), w * s, h * s);
    R(0, 0, 105, 68);
    ctx.beginPath();
    ctx.moveTo(X(52.5), Y(0));
    ctx.lineTo(X(52.5), Y(68));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(52.5), Y(34), 9.15 * s, 0, Math.PI * 2);
    ctx.stroke();
    R(0, 13.84, 16.5, 40.32);
    R(88.5, 13.84, 16.5, 40.32);
    R(0, 24.84, 5.5, 18.32);
    R(99.5, 24.84, 5.5, 18.32);
    ctx.beginPath();
    ctx.arc(X(11), Y(34), 9.15 * s, -0.93, 0.93);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(94), Y(34), 9.15 * s, Math.PI - 0.93, Math.PI + 0.93);
    ctx.stroke();
    for (const [cx, cy, a0] of [[0, 0, 0], [105, 0, Math.PI / 2], [105, 68, Math.PI], [0, 68, -Math.PI / 2]]) {
        ctx.beginPath();
        ctx.arc(X(cx), Y(cy), 1 * s, a0, a0 + Math.PI / 2);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const x of [11, 94, 52.5]) {
        ctx.beginPath();
        ctx.arc(X(x), Y(34), s * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
    for (const [gx, dir] of [[0, -1], [105, 1]]) {
        const x0 = dir < 0 ? X(gx - 2.4) : X(gx), w = 2.4 * s, y0 = Y(30.34), h = 7.32 * s;
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(x0, y0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 1; k < 7; k++) {
            ctx.moveTo(x0, y0 + (h * k) / 7);
            ctx.lineTo(x0 + w, y0 + (h * k) / 7);
        }
        for (let k = 1; k < 3; k++) {
            ctx.moveTo(x0 + (w * k) / 3, y0);
            ctx.lineTo(x0 + (w * k) / 3, y0 + h);
        }
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, s * 0.32);
        ctx.beginPath();
        ctx.moveTo(X(gx), y0);
        ctx.lineTo(dir < 0 ? x0 : x0 + w, y0);
        ctx.lineTo(dir < 0 ? x0 : x0 + w, y0 + h);
        ctx.lineTo(X(gx), y0 + h);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (const py of [y0, y0 + h]) {
            ctx.beginPath();
            ctx.arc(X(gx), py, Math.max(2, s * 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    const cur = snapshot(st);
    const cpi = M.team ? st.players.indexOf(controlledPlayer(st, M.side)) : -1;
    const pos = (i) => { const pr = M.prev[i] ?? cur[i]; const a = i === cpi ? 1 + alpha * 0.5 : alpha; return [pr[0] + (cur[i][0] - pr[0]) * a, pr[1] + (cur[i][1] - pr[1]) * a, (pr[2] ?? 0) + ((cur[i][2] ?? 0) - (pr[2] ?? 0)) * alpha]; };
    const r = Math.max(6, s * 1.0);
    const order = st.players.map((_p, i) => i).sort((a, b) => st.players[b].side - st.players[a].side);
    const dprN = Wc / cv.clientWidth;
    for (const i of order) {
        const p = st.players[i];
        if (p.off)
            continue;
        const [x, y] = pos(i);
        ctx.beginPath();
        ctx.arc(X(x) + p.hx * r * 0.95, Y(y) + p.hy * r * 0.95, Math.max(1.6, r * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
        ctx.fillStyle = p.pos === 'GK' ? (p.side === 0 ? '#7a2622' : '#22406f') : M.kit[p.side];
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, s * 0.2) * (st.owner === p ? 2 : 1);
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = p.k < 35 ? '#e5483f' : p.k < 55 ? css('--warn') : st.owner === p ? '#ffffff' : 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.arc(X(x), Y(y), r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.k / 100));
        ctx.stroke();
        ctx.fillStyle = p.pos === 'GK' ? '#fff' : M.kitText[p.side];
        ctx.font = `600 ${Math.round(r * 1.05)}px ${css('--font-body')}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(p.num), X(x), Y(y) + r * 0.05);
        const showName = M.names === 'off' ? false : M.names === 'mine' ? (M.team ? i === cpi : p.side === M.side && r >= 9) : (C.mode === 'smart' ? r >= 9 : r >= 11);
        if (showName) {
            const fs = Math.max(11 * dprN, Math.round(r * 0.68));
            ctx.font = `500 ${Math.round(fs)}px ${css('--font-body')}`;
            ctx.lineWidth = Math.max(2 * dprN, fs * 0.22);
            ctx.strokeStyle = 'rgba(0,0,0,.5)';
            ctx.lineJoin = 'round';
            const ny = Y(y) + r + fs * 0.75;
            ctx.strokeText(p.name, X(x), ny);
            ctx.fillStyle = 'rgba(255,255,255,.92)';
            ctx.fillText(p.name, X(x), ny);
        }
        if (p.yellow > 0) {
            const cw = Math.max(5, r * 0.75), ch = cw * 1.35;
            ctx.save();
            ctx.translate(X(x) + r * 0.75, Y(y) - r * 0.85);
            ctx.rotate(0.2);
            ctx.fillStyle = '#f6d32d';
            ctx.strokeStyle = 'rgba(0,0,0,.55)';
            ctx.lineWidth = 1;
            ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
            ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
            ctx.restore();
        }
    }
    for (const f of st.fx) {
        const age = st.t - f.t;
        const life = { clean: 0.9, foul: 0.9, card: 0.9, int: 0.6, kick: 0.45, save: 0.6, throw: 0.8, aim: 0.7, skill: 0.7 }[f.kind] ?? 0.8;
        if (age < -0.01 || age > life)
            continue;
        const fx = X(f.x), fy = Y(f.y);
        if (!Number.isFinite(fx) || !Number.isFinite(fy) || !Number.isFinite(r))
            continue;
        const fade = age < life * 0.4 ? 1 : 1 - (age - life * 0.4) / (life * 0.6);
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        if (f.kind === 'clean' || f.kind === 'foul' || f.kind === 'card') {
            ctx.strokeStyle = f.kind === 'clean' ? css('--good') : f.kind === 'foul' ? '#f6d32d' : '#e5483f';
            ctx.lineWidth = Math.max(2.5, s * 0.4);
            ctx.beginPath();
            ctx.arc(fx, fy, r * (2.2 + age * 0.6), 0, Math.PI * 2);
            ctx.stroke();
        }
        else if (f.kind === 'int') {
            const k = r * 0.9;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(2, s * 0.3);
            ctx.beginPath();
            ctx.moveTo(fx - k, fy - k);
            ctx.lineTo(fx + k, fy + k);
            ctx.moveTo(fx + k, fy - k);
            ctx.lineTo(fx - k, fy + k);
            ctx.stroke();
        }
        else if (f.kind === 'kick') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(1.5, s * 0.25);
            const d0 = r * (0.9 + age * 6), d1 = d0 + r * 1.1;
            for (let i = 0; i < 8; i++) {
                const an = (i / 8) * Math.PI * 2 + 0.2;
                ctx.beginPath();
                ctx.moveTo(fx + Math.cos(an) * d0, fy + Math.sin(an) * d0);
                ctx.lineTo(fx + Math.cos(an) * d1, fy + Math.sin(an) * d1);
                ctx.stroke();
            }
        }
        else if (f.kind === 'save') {
            const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 3.2);
            g.addColorStop(0, 'rgba(255,255,255,.95)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(fx, fy, r * 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (f.kind === 'throw') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(2, s * 0.3);
            ctx.lineCap = 'round';
            for (const sg of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(fx + sg * r * 0.6, fy - r * 0.6);
                ctx.lineTo(fx + sg * r * 0.9, fy - r * 2.1);
                ctx.stroke();
            }
        }
        else if (f.kind === 'skill') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(2, s * 0.3);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(fx, fy, r * (1.3 + age * 1.5), Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(fx, fy, r * (1.3 + age * 1.5), Math.PI * 0.1, Math.PI * 0.9);
            ctx.stroke();
        }
        ctx.restore();
    }
    const bk = st.ball.kind;
    const trailOn = !st.owner && (bk === 'shot' || bk === 'cross' || (st.ball.z > 0.3 && Math.hypot(st.ball.vx, st.ball.vy) > 12));
    const [bx, by, bz] = pos(cur.length - 1);
    if (trailOn)
        M.trail.push({ x: bx, y: by, z: bz, t: now, shot: bk === 'shot' });
    while (M.trail.length && now - M.trail[0].t > 450)
        M.trail.shift();
    if (M.trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < M.trail.length; i++) {
            const q0 = M.trail[i - 1], q1 = M.trail[i];
            const a0 = 1 - (now - q1.t) / 450;
            ctx.globalAlpha = Math.max(0, a0) * (q1.shot ? 0.85 : 0.5);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = Math.max(1.5, s * (q1.shot ? 0.45 : 0.25)) * a0;
            ctx.beginPath();
            ctx.moveTo(X(q0.x), Y(q0.y) - q0.z * s * 0.45);
            ctx.lineTo(X(q1.x), Y(q1.y) - q1.z * s * 0.45);
            ctx.stroke();
        }
        ctx.restore();
    }
    const br = Math.max(3.5, s * 0.55) * M.ball;
    ctx.beginPath();
    ctx.ellipse(X(bx), Y(by), br * (1 + bz * 0.05), br * 0.6 * (1 + bz * 0.05), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.35 - bz * 0.03)})`;
    ctx.fill();
    const lift = bz * s * 0.45;
    ctx.beginPath();
    ctx.arc(X(bx), Y(by) - lift, br * (1 + bz * 0.13), 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.strokeStyle = '#111';
    ctx.stroke();
    drawBanners(st, now, Wc, Hc, s);
    if (M.team && !st.done)
        ctl.drawControls(ctx, st, M.side, s, X, Y, pos, Wc, Hc, css('--flood'), css('--font-body'), M.kit[M.side], C.mode === 'smart');
}
function drawBanners(st, now, Wc, Hc, s) {
    for (const b of M.banners) {
        const age = (now - b.t0) / 1000;
        const life = b.kind === 'goal' ? 2.2 : b.kind === 'rule' ? 1.6 : 1.1;
        if (age > life)
            continue;
        const k = age / life, cx = Wc / 2, cy = Hc / 2;
        if (b.kind === 'goal' && !M.reduce) {
            const tcol = st.teams[st.events.filter((e) => e.type === 'goal').slice(-1)[0]?.side ?? 0].color;
            ctx.save();
            ctx.globalAlpha = 0.55 * (1 - k);
            ctx.translate(cx, cy);
            ctx.rotate(age * 0.6);
            for (let i = 0; i < 16; i++) {
                ctx.rotate((Math.PI * 2) / 16);
                ctx.fillStyle = i % 2 ? tcol : css('--flood');
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Wc * 0.9, -s * 2.2);
                ctx.lineTo(Wc * 0.9, s * 2.2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
            for (let i = 0; i < 48; i++) {
                const a = (i / 48) * Math.PI * 2 + (i % 3) * 0.2;
                const dist = (age * (60 + (i % 7) * 18)) * s * 0.25;
                ctx.fillStyle = i % 3 === 0 ? tcol : i % 3 === 1 ? css('--flood') : '#fff';
                ctx.fillRect(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist + age * age * s * 3, s * 0.8, s * 0.8);
            }
            ctx.restore();
        }
        const big = b.kind === 'goal';
        const pop = big && age < 0.12 ? 1.15 - age : 1;
        ctx.save();
        ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2;
        ctx.translate(cx, big ? cy : Hc * 0.22);
        ctx.scale(pop, pop);
        ctx.font = `700 ${Math.round(s * (big ? 11 : 4.2))}px ${css('--font-display')}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = s * (big ? 0.9 : 0.5);
        ctx.strokeStyle = '#1b1a0c';
        ctx.strokeText(b.text, 0, 0);
        ctx.fillStyle = b.kind === 'red' ? '#e5483f' : b.kind === 'rule' ? '#9fe3b0' : b.kind === 'yellow' || big ? css('--flood') : '#fff';
        ctx.fillText(b.text, 0, 0);
        if (b.sub) {
            ctx.font = `600 ${Math.round(s * 2.4)}px ${css('--font-body')}`;
            ctx.lineWidth = s * 0.4;
            ctx.strokeText(b.sub, 0, s * (big ? 7.5 : 3.6));
            ctx.fillStyle = '#fff';
            ctx.fillText(b.sub, 0, s * (big ? 7.5 : 3.6));
        }
        ctx.restore();
    }
}
