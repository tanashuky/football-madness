import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, P } from './engine.ts';
P.dt = 0.05;
let stalls = 0, samples: string[] = [], throughs = 0;
for (let seed = 1; seed <= 10; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 5000 + seed);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, last = -99, still = 0;
  while (!st.done && n < 60000) {
    const p = controlledPlayer(st, 0);
    let act: any, extra: any = {};
    if (p && st.owner === p && st.clock - last > 9) { const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1; act = 'through'; extra = { power: [0.1, 0.5, 0.9][n % 3], ax: (gx - p.x) / d, ay: (34 - p.y) / d + (n % 2 ? 0.5 : -0.5), curve: 0, tap: false }; last = st.clock; throughs++; }
    const gx2 = st.half % 2 === 0 ? 0 : 105; const jx = Math.sign(gx2 - 52.5);
    setInput(st, 0, { mx: jx, my: 0.2, sprint: n % 7 < 3, press: false, act, ...extra });
    step(st); n++;
    const b = st.ball;
    if (!st.owner && !st.pending && !st.celebrate && st.t >= st.restartUntil && Math.hypot(b.vx, b.vy) < 0.3 && b.z < 0.05) still += st.dt; else still = 0;
    if (still > 2.0) { stalls++; if (samples.length < 3) { const near = st.players.filter((q) => !q.off).map((q) => ({ q, d: Math.hypot(q.x - b.x, q.y - b.y) })).sort((a, c) => a.d - c.d).slice(0, 3).map((o) => `${o.q.side}:${o.q.num}${o.q.pos} d${o.d.toFixed(1)} v${Math.hypot(o.q.vx ?? 0, o.q.vy ?? 0).toFixed(1)}`); samples.push(`t${st.t.toFixed(1)} ball ${b.x.toFixed(1)},${b.y.toFixed(1)} kind ${b.kind} kicker ${b.kicker?.side}:${b.kicker?.num} int ${b.intended?.num} noTouch ${b.noTouch?.num} spWait ${st.spWait?.kind} near ${near.join(' | ')}`); } still = -99; }
  }
}
console.log({ throughs, stalls }); console.log(samples.join('\n'));
