import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, DBG } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 401);
setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
let n = 0, phase = 0;
while (!st.done && n < 400 && phase < 3) {
  const p = controlledPlayer(st, 0);
  const inPoss = !!st.owner && st.owner.side === 0;
  let act: any, extra: any = {};
  if (phase === 0 && inPoss && st.owner === p && st.t > 3) {
    const mates = st.players.filter((q) => q.side === 0 && q !== p && !q.off && q.pos !== 'GK');
    const far = mates.filter((q) => { const d = Math.hypot(q.x - p!.x, q.y - p!.y); return d > 8 && d < 25; }); if (!far.length) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); n++; continue; } const m = far[0];
    const d = Math.hypot(m.x - p.x, m.y - p.y) || 1;
    act = 'pass'; extra = { power: Math.min(1, d / 30), ax: (m.x - p.x) / d, ay: (m.y - p.y) / d, curve: 0, tap: false };
    phase = 1; console.log('pass to', m.num, 'd', d.toFixed(1));
  } else if (phase === 1 && !st.owner && st.ball.kind === 'pass' && st.ball.kicker?.side === 0) {
    act = 'shoot'; extra = { power: 0.6, ax: 1, ay: 0, curve: 0, tap: false };
    phase = 2; console.log('pre shoot sent at', st.t.toFixed(2), 'intended', st.ball.intended?.num, 'ctl', p?.num);
  }
  setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, ...extra });
  step(st); n++;
  const c = st.control[0]!;
  if (phase >= 1) console.log(st.t.toFixed(2), 'owner', st.owner ? st.owner.num + '/' + st.owner.side : '-', 'kind', st.ball.kind, 'ctl', controlledPlayer(st, 0)?.num, 'pre', c.pre ? c.pre.act : null, 'act', c.input.act, JSON.stringify({ d: DBG.pre_dustu, i: DBG.pre_ilk_dokunus, k: DBG.pre_kafa, kick: c.kick ? 1 : 0 }));
  if (phase === 2 && st.owner && st.owner.side === 0 && st.ball.kind === 'none') { if (n > 300) phase = 3; }
  if (phase === 2 && st.ball.kind === 'shot') phase = 3;
}
