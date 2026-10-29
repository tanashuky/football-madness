import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, P } from './engine.ts';
P.dt = 0.05;
const res: Record<string, { n: number; air: number; maxZ: number }> = {};
for (let seed = 1; seed <= 6; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 3000 + seed);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, last = -99, watch: any = null;
  while (!st.done && n < 40000) {
    const p = controlledPlayer(st, 0);
    let act: any, extra: any = {};
    if (p && st.owner === p && st.clock - last > 9) {
      const pw = [0.05, 0.4, 0.8, 1][n % 4]; const tap = n % 5 === 0;
      const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
      act = 'pass'; extra = { power: pw, ax: (gx - p.x) / d, ay: (34 - p.y) / d + 0.4, curve: n % 3 === 0 ? 0.6 : 0, tap }; last = st.clock;
      watch = { tag: (tap ? 'tap' : 'p' + pw) + (st.restartTaker === p ? '_' + (st.takerKind || st.restartKind) : ''), kick: -1, maxZ: 0, vz: 0 };
    }
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, ...extra });
    const k0 = st.ball.kickT;
    step(st); n++;
    if (watch && st.ball.kickT !== k0 && st.ball.kicker === p) { watch.kick = st.ball.kickT; watch.vz = st.ball.vz; watch.kind = st.ball.kind; }
    if (watch && watch.kick >= 0) {
      if (st.ball.kickT === watch.kick && !st.owner) watch.maxZ = Math.max(watch.maxZ, st.ball.z);
      else { const r = res[watch.tag] ??= { n: 0, air: 0, maxZ: 0 }; r.n++; if (watch.maxZ > 0.3 || watch.vz > 0.5) { r.air++; } r.maxZ = Math.max(r.maxZ, watch.maxZ); watch = null; }
    }
  }
}
console.log(JSON.stringify(res));
