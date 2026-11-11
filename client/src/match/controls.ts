// Team play kontrolleri (demodan tasindi): sol yarida yuzen joystick (dis bant sprint), sag altta elmas duzeninde dort baglamsal buton,
// vurus jesti (basili tut = guc, surukle = yon, izin bukulmesi = falso), klavye semalari. Motor girdisi her adimda feedInput ile verilir.
import { P, controlledPlayer, predictLanding, previewKick, setInput, userCarrierInfo, type MatchState, type UserAct } from '../engine.js';
import { t } from '../core/i18n.js';

type Btn = { id: string; lab: string; x: number; y: number; r: number; def: string };
type Act = string | { act: string; power: number; ax: number; ay: number; curve: number; tap: boolean };
export interface Host {
  cv: HTMLCanvasElement; st: () => MatchState | null; side: () => 0 | 1; active: () => boolean; // active: Team play, mac acik, duraklatilmamis
  keys: () => 'arrows' | 'wasd'; vibrate: () => boolean;
  onPause: () => void; onExit: () => void; onTac: () => void; onMent: (d: number) => void; onCam: () => void;
}
let H: Host | null = null;
export const IN = { joyId: null as number | null, joyBase: null as [number, number] | null, mx: 0, my: 0, joyK: 0, press: false, acts: [] as Act[], keys: new Set<string>(), ptrBtn: new Map<number, Btn>(),
  kick: null as null | { id: string; ptr: number; t0: number; x0: number; y0: number; ax: number; ay: number; aimed: boolean; curve: number; trail: [number, number][] },
  kbKick: null as null | { id: string; t0: number; ax: number; ay: number; curve: number }, swDown: null as number | null, slideOver: null as string | null, t0: 0 };
const GK_HOLD_MS = 300, TAP_MS = 200, KB_AIM_LOCK_MS = 250, JOY_SPRINT = 1.5, JOY_MAX = 1.9;
const POWER_MS: Record<string, number> = { shoot: 900, pass: 900, through: 900, cross: 800 };
const TAP_POWER: Record<string, number> = { pass: 0.3, through: 0.4, shoot: 0.55, cross: 0.5 };
const powerOf = (t0: number, kind: string) => Math.min(1, (performance.now() - t0) / POWER_MS[kind]);
const SA = { t: 0, r: 0, b: 0, l: 0 };
export function readSafeArea() {
  let el = document.getElementById('sa');
  if (!el) { el = document.createElement('div'); el.id = 'sa'; el.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(el); }
  const cs = getComputedStyle(el); SA.t = parseFloat(cs.paddingTop) || 0; SA.r = parseFloat(cs.paddingRight) || 0; SA.b = parseFloat(cs.paddingBottom) || 0; SA.l = parseFloat(cs.paddingLeft) || 0;
}
export function resetInput() { IN.acts.length = 0; IN.press = false; IN.joyId = null; IN.joyBase = null; IN.mx = 0; IN.my = 0; IN.joyK = 0; IN.kick = null; IN.kbKick = null; IN.ptrBtn.clear(); IN.swDown = null; IN.slideOver = null; }
// oyun durdu: suren vurus jesti ve bekleyen aksiyonlar iptal (duran topta eski aksiyon tetiklenmesin)
export function onDead() { IN.kick = null; IN.kbKick = null; IN.acts.length = 0; IN.ptrBtn.clear(); }
function ownThird(st: MatchState, side: 0 | 1) { const gx = (st.half % 2 === 0) === (side === 0) ? 105 : 0; return Math.abs(st.ball.x - gx) < P.gkRushZone; }
export function inPossession(): boolean { const st = H?.st(); if (!st || !H) return false; const side = H.side(); return !!((st.owner && st.owner.side === side) || (!st.owner && st.ball.kicker && st.ball.kicker.side === side && (st.ball.kind === 'pass' || st.ball.kind === 'through' || st.ball.kind === 'cross'))); }
function geom() {
  const cv = H!.cv, st = H!.st()!; const Wc = cv.clientWidth, Hc = cv.clientHeight, u = Math.max(0.8, Math.min(1.6, Wc / 852));
  const r = 30 * u, d = 56 * u, cx = Wc - SA.r - 112 * u, cy = Hc - SA.b - 100 * u; const atk = inPossession();
  const btns: Btn[] = [
    { id: 'through', lab: atk ? t('ctl.through') : ownThird(st, H!.side()) ? t('ctl.switchGk') : t('ctl.switch'), x: cx, y: cy - d, r, def: 'switch' },
    { id: 'shoot', lab: atk ? t('ctl.shoot') : t('ctl.slide'), x: cx + d, y: cy, r, def: 'slide' },
    { id: 'cross', lab: atk ? t('ctl.cross') : t('ctl.tackle'), x: cx - d, y: cy, r, def: 'tackle' },
    { id: 'pass', lab: atk ? t('ctl.pass') : t('ctl.press'), x: cx, y: cy + d, r, def: 'press' },
  ];
  return { Wc, Hc, u, btns, atk, joyR: 44 * u };
}
function hitBtn(x: number, y: number): Btn | null { for (const b of geom().btns) if (Math.hypot(x - b.x, y - b.y) <= b.r * 1.2) return b; return null; }
function kickStart(id: string, ptr: number, x: number, y: number) { if (IN.kick) return; IN.kick = { id, ptr, t0: performance.now(), x0: x, y0: y, ax: 0, ay: 0, aimed: false, curve: 0, trail: [[x, y]] }; }
function kickMove(x: number, y: number) {
  const k = IN.kick; if (!k) return; const tr = k.trail, last = tr[tr.length - 1];
  if (Math.hypot(x - last[0], y - last[1]) >= 2) tr.push([x, y]);
  const dx = x - k.x0, dy = y - k.y0, m = Math.hypot(dx, dy);
  if (m < 14) return; // ilk 14 px: basparmagin dogal kaymasi
  k.aimed = true; k.ax = dx / m; k.ay = dy / m;
  let sum = 0, cnt = 0; for (let i = 1; i < tr.length - 1; i++) { const px = tr[i][0] - k.x0, py = tr[i][1] - k.y0; sum += px * -k.ay + py * k.ax; cnt++; }
  k.curve = Math.max(-1, Math.min(1, (cnt ? sum / cnt / (m * 0.4) : 0) * 2));
}
function kickEnd() { const k = IN.kick; if (!k) return; IN.kick = null; const tap = performance.now() - k.t0 < TAP_MS && !k.aimed; IN.acts.push({ act: k.id, power: tap ? TAP_POWER[k.id] : powerOf(k.t0, k.id), ax: k.aimed ? k.ax : 0, ay: k.aimed ? k.ay : 0, curve: k.aimed ? k.curve : 0, tap }); }
function pressBtn(b: Btn, down: boolean, ptr: number, x: number, y: number) {
  if (inPossession()) { if (down) kickStart(b.id, ptr, x, y); else if (IN.kick && IN.kick.ptr === ptr) kickEnd(); return; }
  if (b.def === 'press') { IN.press = down; return; }
  if (b.def === 'switch') { if (down) IN.swDown = performance.now(); else if (IN.swDown !== null) { if (performance.now() - IN.swDown < GK_HOLD_MS) IN.acts.push('switch'); IN.swDown = null; } return; }
  if (down) IN.acts.push(b.def);
}
const KEYMAPS: Record<string, any> = {
  arrows: { pass: 'KeyS', shoot: 'KeyD', through: 'KeyW', cross: 'KeyA', sprint: 'KeyE', switch: 'KeyQ', move: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },
  wasd: { pass: 'KeyJ', shoot: 'KeyK', through: 'KeyL', cross: 'KeyI', sprint: 'ShiftLeft', switch: 'Space', move: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },
};
const KB = () => KEYMAPS[H ? H.keys() : 'arrows'] ?? KEYMAPS.arrows;
const KB_DEF: Record<string, string> = { pass: 'press', shoot: 'slide', through: 'switch', cross: 'tackle' };
function kbDir(): [number, number] {
  const k = IN.keys, wasd = H?.keys() === 'wasd';
  let mx = (k.has('ArrowRight') || (wasd && k.has('KeyD')) ? 1 : 0) - (k.has('ArrowLeft') || (wasd && k.has('KeyA')) ? 1 : 0);
  let my = (k.has('ArrowDown') || (wasd && k.has('KeyS')) ? 1 : 0) - (k.has('ArrowUp') || (wasd && k.has('KeyW')) ? 1 : 0);
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; } return [mx, my];
}
function kbAimUpdate() {
  const kk = IN.kbKick, st = H?.st(); if (!kk || !st) return; const [kx, ky] = kbDir(); const km = Math.hypot(kx, ky);
  if (performance.now() - kk.t0 < KB_AIM_LOCK_MS) { if (km > 0) { kk.ax = kx / km; kk.ay = ky / km; } return; }
  if (Math.hypot(kk.ax, kk.ay) < 0.1) { const cp = controlledPlayer(st, H!.side()); if (cp) { kk.ax = cp.hx; kk.ay = cp.hy; } }
  if (km > 0) { const perp = kx * -kk.ay + ky * kk.ax; kk.curve = Math.abs(perp) > 0.3 ? Math.sign(perp) * 0.8 : 0; }
}
// her motor adimindan once: o anki girdi motora verilir
export function feedInput(st: MatchState, side: 0 | 1) {
  let mx = IN.mx, my = IN.my, sprint = IN.joyK >= JOY_SPRINT;
  if (IN.joyId === null) { [mx, my] = kbDir(); sprint = IN.keys.has(KB().sprint); }
  const a = IN.acts.shift(); const o = a && typeof a !== 'string' ? a : null;
  const gkRush = IN.swDown !== null && performance.now() - IN.swDown >= GK_HOLD_MS && !inPossession();
  setInput(st, side, { mx, my, sprint, press: IN.press, gkRush, act: (a ? (typeof a === 'string' ? a : a.act) : undefined) as UserAct | undefined, power: o?.power, ax: o?.ax, ay: o?.ay, curve: o?.curve, tap: o?.tap });
}
export function install(host: Host) {
  H = host; resetInput(); IN.t0 = performance.now(); readSafeArea();
  const cv = host.cv; if ((cv as any)._fmCtl) return; (cv as any)._fmCtl = true;
  const on = () => !!H && H.active();
  const xy = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    if (!on()) return; e.preventDefault(); const [x, y] = xy(e); const st = H!.st()!;
    const capture = () => { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* iOS */ } };
    if (st.celebrate) IN.acts.push('skip');
    const b = hitBtn(x, y);
    if (b) { if (IN.kick) return; IN.ptrBtn.set(e.pointerId, b); pressBtn(b, true, e.pointerId, x, y); capture(); return; }
    if (x < cv.clientWidth * 0.5 && IN.joyId === null) { IN.joyId = e.pointerId; IN.joyBase = [x, y]; IN.mx = 0; IN.my = 0; IN.joyK = 0; capture(); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!on()) return; const [x, y] = xy(e);
    if (e.pointerId === IN.joyId && IN.joyBase) { e.preventDefault(); const dx = x - IN.joyBase[0], dy = y - IN.joyBase[1], R = geom().joyR, m = Math.hypot(dx, dy), k = Math.min(JOY_MAX, m / R); IN.joyK = k; IN.mx = m > 2 ? (dx / m) * Math.min(1, k) : 0; IN.my = m > 2 ? (dy / m) * Math.min(1, k) : 0; return; }
    if (IN.kick && e.pointerId === IN.kick.ptr) { e.preventDefault(); kickMove(x, y); return; }
    const held = IN.ptrBtn.get(e.pointerId);
    if (held && held.def === 'press' && !inPossession()) { e.preventDefault(); const b = hitBtn(x, y); const over = b && (b.def === 'tackle' || b.def === 'slide') ? b.def : null; if (over && IN.slideOver !== over) IN.acts.push(over); IN.slideOver = over; }
  });
  const up = (e: PointerEvent) => {
    if (e.pointerId === IN.joyId) { IN.joyId = null; IN.joyBase = null; IN.mx = 0; IN.my = 0; IN.joyK = 0; }
    if (!on()) return; const [x, y] = xy(e);
    const b = IN.ptrBtn.get(e.pointerId); if (b) { IN.ptrBtn.delete(e.pointerId); pressBtn(b, false, e.pointerId, x, y); }
    IN.slideOver = null; if (IN.kick && e.pointerId === IN.kick.ptr) kickEnd();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) cv.addEventListener(ev, (e) => { if (H && H.st()) e.preventDefault(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => { if (H && H.st()) e.preventDefault(); });
  addEventListener('keydown', (e) => {
    if (!H || !H.st()) return; const st = H.st()!;
    if (e.code === 'KeyP') { H.onPause(); return; } if (e.code === 'Escape') { H.onExit(); return; } if (e.code === 'KeyT') { H.onTac(); return; } if (e.code === 'KeyC') { H.onCam(); return; }
    if (e.code === 'BracketLeft') { H.onMent(-1); return; } if (e.code === 'BracketRight') { H.onMent(1); return; }
    if (!on()) return; const kb = KB();
    if (e.repeat) { if (kb.move.includes(e.code) || e.code === kb.sprint || e.code === 'Space') e.preventDefault(); return; }
    IN.keys.add(e.code);
    if (st.celebrate) IN.acts.push('skip');
    const atk = inPossession(); const act = Object.keys(KB_DEF).find((k) => kb[k] === e.code);
    if (act) {
      if (atk) { if (!IN.kbKick) { const [kx, ky] = kbDir(); IN.kbKick = { id: act, t0: performance.now(), ax: kx, ay: ky, curve: 0 }; } }
      else if (KB_DEF[act] === 'press') IN.press = true; else if (KB_DEF[act] === 'switch') IN.swDown = performance.now(); else IN.acts.push(KB_DEF[act]);
      e.preventDefault();
    } else if (e.code === kb.switch) { IN.swDown = performance.now(); e.preventDefault(); }
    if (kb.move.includes(e.code) || e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    IN.keys.delete(e.code); if (!on()) return; const kb = KB();
    const isSw = e.code === kb.switch || (e.code === kb.through && !inPossession());
    if (isSw && IN.swDown !== null) { if (performance.now() - IN.swDown < GK_HOLD_MS) IN.acts.push('switch'); IN.swDown = null; }
    const act = Object.keys(KB_DEF).find((k) => kb[k] === e.code); if (!act) return;
    if (KB_DEF[act] === 'press') IN.press = false;
    if (IN.kbKick && IN.kbKick.id === act) { const held = performance.now() - IN.kbKick.t0; kbAimUpdate(); const tap = held < TAP_MS; const [mx, my] = tap ? kbDir() : [IN.kbKick.ax, IN.kbKick.ay]; IN.acts.push({ act, power: tap ? TAP_POWER[act] : powerOf(IN.kbKick.t0, act), ax: mx, ay: my, curve: tap ? 0 : IN.kbKick.curve, tap }); IN.kbKick = null; }
  });
  addEventListener('blur', () => { IN.keys.clear(); });
}
// nisan: yon (surukleme > joystick/klavye > bakis), guc basili tutma, falso
export function aimInfo(cp: { hx: number; hy: number }) {
  const k = IN.kick, kk = IN.kbKick; if (!k && !kk) return null;
  const id = k ? k.id : kk!.id, t0 = k ? k.t0 : kk!.t0;
  if (!(k && k.aimed) && performance.now() - t0 < TAP_MS) return null;
  const pw = powerOf(t0, id); let ax = 0, ay = 0;
  if (kk) kbAimUpdate();
  if (k && k.aimed) { ax = k.ax; ay = k.ay; }
  else if (kk && Math.hypot(kk.ax, kk.ay) > 0.1 && performance.now() - kk.t0 >= KB_AIM_LOCK_MS) { ax = kk.ax; ay = kk.ay; }
  else { const m = Math.hypot(IN.mx, IN.my); if (IN.joyId !== null && m > 0.15) { ax = IN.mx / m; ay = IN.my / m; } else { const [kx, ky] = kbDir(); const km = Math.hypot(kx, ky); if (km > 0) { ax = kx / km; ay = ky / km; } else { ax = cp.hx; ay = cp.hy; } } }
  return { id, pw, ax, ay, curve: k ? k.curve : kk ? kk.curve : 0 };
}
const LAND = { kickT: -1, p: null as null | { x: number; y: number; t: number; apex: number }, t0: 0 };
const SPR = { on: false, trail: [] as { x: number; y: number; t: number }[] };
function drawLanding(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, k = 1) {
  const r0 = Math.max(6, s * 1.2);
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = Math.max(2, s * 0.26); c.globalAlpha = 0.85; c.beginPath(); c.arc(x, y, r0, 0, Math.PI * 2); c.stroke();
  if (k > 0.05) { c.globalAlpha = 0.35; c.lineWidth = Math.max(1.5, s * 0.18); c.beginPath(); c.arc(x, y, r0 * (1 + 1.2 * k), 0, Math.PI * 2); c.stroke(); }
  c.globalAlpha = 0.9; c.beginPath(); c.arc(x, y, Math.max(2, s * 0.28), 0, Math.PI * 2); c.fill(); c.restore();
}
// oyna katmani: kontrol halkasi, sprint izi, dusus noktasi, mucadele isareti, joystick, nisan, butonlar, ipuclari, ekran disi takim arkadaslari
export function drawControls(c: CanvasRenderingContext2D, st: MatchState, side: 0 | 1, s: number, X: (x: number) => number, Y: (y: number) => number, pos: (i: number) => number[], Wc: number, Hc: number, flood: string, font: string, kit: string, smart: boolean) {
  const cv = H!.cv; const dpr = Wc / cv.clientWidth; const g = geom(); const u = g.u * dpr; const now = performance.now();
  const cp = controlledPlayer(st, side);
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
  const sprintOn = H!.active() && ((IN.joyId !== null && IN.joyK >= JOY_SPRINT) || (IN.joyId === null && IN.keys.has(KB().sprint)));
  if (sprintOn && !SPR.on && H!.vibrate() && navigator.vibrate) { try { navigator.vibrate(12); } catch (_) { /* yok */ } }
  SPR.on = sprintOn; if (sprintOn && cp) { SPR.trail.push({ x: cp.x, y: cp.y, t: now }); if (SPR.trail.length > 10) SPR.trail.shift(); }
  while (SPR.trail.length && now - SPR.trail[0].t > 350) SPR.trail.shift();
  for (const q of SPR.trail) { const a = 1 - (now - q.t) / 350; c.globalAlpha = Math.max(0, a) * 0.5; c.fillStyle = flood; c.beginPath(); c.arc(X(q.x), Y(q.y), Math.max(2, s * 0.45) * (0.4 + a * 0.6), 0, Math.PI * 2); c.fill(); }
  c.globalAlpha = 1;
  const r = Math.max(6, s * 1.0);
  if (cp && !cp.off) {
    const [x, y] = pos(st.players.indexOf(cp));
    c.strokeStyle = SPR.on ? flood : '#fff'; c.lineWidth = Math.max(2, s * 0.25); c.beginPath(); c.arc(X(x), Y(y), r * 1.9, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.arc(X(x), Y(y), r * 2.4, 0, Math.PI * 2); c.stroke();
    const ctl0 = st.control[side];
    if (ctl0 && ctl0.pre) { const lab = '⚡ ' + (({ pass: t('ctl.pass'), through: t('ctl.through'), shoot: t('ctl.shoot'), cross: t('ctl.cross') } as Record<string, string>)[ctl0.pre.act] ?? ''); c.font = `700 ${Math.round(r * 0.9)}px ${font}`; c.lineWidth = Math.max(2, r * 0.25); c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(lab, X(x), Y(y) - r * 2.9); c.fillStyle = flood; c.fillText(lab, X(x), Y(y) - r * 2.9); }
  }
  // havadaki top: dusus noktasi (vurusta bir kez hesaplanir)
  if (st.owner) LAND.p = null; else { if (st.ball.kickT !== LAND.kickT) { LAND.kickT = st.ball.kickT; LAND.p = predictLanding(st); LAND.t0 = st.t; } if (LAND.p && st.t - LAND.t0 > LAND.p.t + 0.05) LAND.p = null; }
  if (LAND.p) drawLanding(c, X(LAND.p.x), Y(LAND.p.y), s, '#ffffff', Math.max(0, 1 - (st.t - LAND.t0) / LAND.p.t));
  if (st.contest && st.t < st.contest.until) { const cx = X(st.contest.x), cy = Y(st.contest.y), rr = Math.max(6, s * 1.4), k = 1 + 0.15 * Math.sin(now / 70); c.save(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, s * 0.3); c.globalAlpha = 0.9; c.beginPath(); c.arc(cx, cy, rr * k, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); c.beginPath(); c.arc(cx, cy, rr * k, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.restore(); }
  // joystick
  const jr = g.joyR * dpr;
  if (IN.joyBase) {
    const [jx, jy] = IN.joyBase; const sprint = IN.joyK >= JOY_SPRINT; const J = (rad: number) => c.arc(jx * dpr, jy * dpr, rad, 0, Math.PI * 2);
    c.globalAlpha = 0.22; c.fillStyle = '#fff'; c.beginPath(); J(jr); c.fill(); c.globalAlpha = 0.5; c.strokeStyle = '#fff'; c.lineWidth = 2 * u; c.beginPath(); J(jr); c.stroke();
    c.globalAlpha = sprint ? 0.35 : 0.12; c.fillStyle = flood; c.beginPath(); J(jr * JOY_MAX); c.arc(jx * dpr, jy * dpr, jr * JOY_SPRINT, 0, Math.PI * 2, true); c.fill('evenodd');
    c.globalAlpha = sprint ? 0.95 : 0.45; c.strokeStyle = flood; c.lineWidth = (sprint ? 4 : 2) * u; c.setLineDash(sprint ? [] : [6 * u, 5 * u]); c.beginPath(); J(jr * JOY_SPRINT); c.stroke(); c.setLineDash([]);
    c.globalAlpha = sprint ? 0.95 : 0.3; c.strokeStyle = sprint ? flood : '#fff'; c.lineWidth = (sprint ? 5 : 1.5) * u; c.beginPath(); J(jr * JOY_MAX); c.stroke();
    if (sprint) { c.globalAlpha = 0.95; c.fillStyle = flood; c.font = `700 ${Math.round(11 * u)}px ${font}`; c.fillText('SPRINT', jx * dpr, jy * dpr - jr * JOY_MAX - 10 * u); }
    const m = Math.hypot(IN.mx, IN.my) || 1, reach = Math.min(JOY_MAX, IN.joyK) * g.joyR, kx = jx + (IN.mx / m) * reach, ky = jy + (IN.my / m) * reach;
    c.globalAlpha = sprint ? 0.92 : 0.7; c.fillStyle = sprint ? flood : '#fff'; c.beginPath(); c.arc(kx * dpr, ky * dpr, (sprint ? 28 : 22) * u, 0, Math.PI * 2); c.fill();
  } else if (now - IN.t0 < 8000) {
    const hx = (SA.l + 100) * u, hy = Hc - (SA.b + 100) * u;
    c.globalAlpha = 0.12; c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, hy, jr, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.5; c.font = `600 ${Math.round(11 * u)}px ${font}`; c.fillText('joystick', hx, hy);
  }
  c.globalAlpha = 1;
  // nisan onizlemesi: topun gercek fizikle tahmini yolu
  const ai = cp && g.atk && st.owner === cp ? aimInfo(cp) : null;
  if (ai) {
    const pv = previewKick(st, side, ai.id as UserAct, ai.pw, ai.ax, ai.ay, ai.curve, false);
    if (pv && pv.pts.length > 1) {
      const pts = pv.pts; const SY = (q: { y: number; z: number }) => Y(q.y) - q.z * s * 0.45;
      c.save(); c.globalAlpha = 0.9; c.strokeStyle = flood; c.lineWidth = Math.max(2, s * 0.22); c.setLineDash([s * 0.8, s * 0.6]); c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); pts.forEach((q, k) => { if (k) c.lineTo(X(q.x), SY(q)); else c.moveTo(X(q.x), SY(q)); }); c.stroke(); c.setLineDash([]);
      const a = pts[pts.length - 2], e = pts[pts.length - 1]; const tx = X(e.x) - X(a.x), ty = SY(e) - SY(a), tn = Math.hypot(tx, ty) || 1, hx = tx / tn, hy = ty / tn, ah = Math.max(5, s * 0.9), ex = X(e.x), ey = SY(e);
      c.fillStyle = flood; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - hx * ah - hy * ah * 0.6, ey - hy * ah + hx * ah * 0.6); c.lineTo(ex - hx * ah + hy * ah * 0.6, ey - hy * ah - hx * ah * 0.6); c.closePath(); c.fill();
      let apex = pts[0].z, land: typeof pts[number] | null = null; for (let i = 1; i < pts.length; i++) { if (pts[i].z > apex) apex = pts[i].z; if (pts[i].z <= 0.05 && pts[i - 1].z > 0.05) { land = apex >= 1.5 ? pts[i] : null; break; } }
      if (land) drawLanding(c, X(land.x), Y(land.y), s, flood);
      c.restore();
    }
  }
  // butonlar
  for (const b of g.btns) {
    const heldKick = !!IN.kick && IN.kick.id === b.id, locked = !!IN.kick && !heldKick;
    const down = heldKick || [...IN.ptrBtn.values()].some((q) => q.id === b.id) || (b.def === 'press' && IN.press && !g.atk) || (!!IN.kbKick && IN.kbKick.id === b.id);
    let under = false;
    if (!down) { const R = b.r * dpr * 1.1, bx = b.x * dpr, by = b.y * dpr; if (Math.hypot(X(st.ball.x) - bx, Y(st.ball.y) - by) < R) under = true; else for (let i = 0; i < st.players.length && !under; i++) { if (st.players[i].off) continue; const [x, y] = pos(i); if (Math.hypot(X(x) - bx, Y(y) - by) < R) under = true; } }
    const col = g.atk ? '#f2d94e' : '#6fa8ff', k0 = locked ? 0.25 : under ? 0.3 : 1;
    c.globalAlpha = down ? 0.6 : 0.08 * k0; c.fillStyle = col; c.beginPath(); c.arc(b.x * dpr, b.y * dpr, b.r * dpr, 0, Math.PI * 2); c.fill();
    c.globalAlpha = (down ? 0.95 : 0.7) * k0; c.strokeStyle = col; c.lineWidth = 2.5 * u; c.beginPath(); c.arc(b.x * dpr, b.y * dpr, b.r * dpr, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = (down ? 0.95 : 0.85) * k0; c.fillStyle = down ? '#111' : col; c.font = `700 ${Math.round((b.lab.length > 9 ? 9 : b.lab.length > 6 ? 10.5 : 12) * u)}px ${font}`;
    if (!down) { c.lineWidth = 3 * u; c.strokeStyle = 'rgba(0,0,0,.45)'; c.strokeText(b.lab, b.x * dpr, b.y * dpr); }
    c.fillText(b.lab, b.x * dpr, b.y * dpr);
  }
  c.globalAlpha = 1;
  // duran top ipucu ve geri sayim
  const ui = userCarrierInfo(st, side); let tip: string | null = null;
  if (ui && ui.mustPlay) tip = `${ui.kind && ['corner', 'fkshot', 'fk', 'penalty', 'throw', 'goalkick'].includes(ui.kind) ? t('tip.' + ui.kind) : t('tip.pass')} · ${Math.ceil(ui.left)}`;
  else if (st.pending && st.pending.kind === 'penalty' && st.pending.side !== side) tip = t('tip.penaltyDef');
  else if (st.celebrate) tip = t('tip.skip');
  if (tip) { c.font = `600 ${Math.round(13 * u)}px ${font}`; const tw = c.measureText(tip).width + 24 * u; c.fillStyle = 'rgba(10,12,16,.75)'; c.fillRect(Wc / 2 - tw / 2, Hc - (SA.b + 44) * u, tw, 30 * u); c.fillStyle = '#fff'; c.fillText(tip, Wc / 2, Hc - (SA.b + 29) * u); }
  // hucum yonu
  c.font = `600 ${Math.round(11 * u)}px ${font}`; c.fillStyle = 'rgba(255,255,255,.7)';
  const right = (st.half % 2 === 1) === (side === 0); c.fillText(right ? t('ctl.attack') + ' →' : '← ' + t('ctl.attack'), Wc / 2, (SA.t + 62) * u);
  // ekran disindaki takim arkadaslari
  if (smart) {
    const ins = 14 * u;
    st.players.forEach((p, i) => {
      if (p.side !== side || p.off) return; const [x, y] = pos(i); const px = X(x), py = Y(y);
      if (px >= 0 && px <= Wc && py >= 0 && py <= Hc) return;
      const cx = Math.max(ins, Math.min(Wc - ins, px)), cy = Math.max(ins + 44 * u, Math.min(Hc - ins, py)), an = Math.atan2(py - cy, px - cx);
      c.save(); c.translate(cx, cy); c.rotate(an); c.fillStyle = kit; c.beginPath(); c.moveTo(12 * u, 0); c.lineTo(-6 * u, -9 * u); c.lineTo(-6 * u, 9 * u); c.closePath(); c.fill(); c.restore();
      c.fillStyle = '#fff'; c.font = `700 ${Math.round(11 * u)}px ${font}`; c.fillText(String(p.num), cx - Math.cos(an) * 16 * u, cy - Math.sin(an) * 16 * u);
    });
  }
  c.restore();
}
