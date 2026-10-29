import { createMatch, step, makeTeam, NAMES_B, P, predictLanding } from './engine.ts';
P.dt = 0.05;
let n = 0, errSum = 0, errMax = 0;
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 5);
let pend: any = null, k = -1;
while (!st.done && n < 80) {
  step(st);
  const b = st.ball;
  if (b.kickT !== k) { k = b.kickT; const pl = predictLanding(st); pend = pl ? { ...pl, k } : null; }
  if (st.owner || st.pending) pend = null;
  if (pend && b.kickT === pend.k && b.z <= 0 && !st.owner && st.t > pend.k + 0.2) { const e = Math.hypot(b.x - pend.x, b.y - pend.y); errSum += e; errMax = Math.max(errMax, e); n++; pend = null; }
}
console.log({ landings: n, avgErr_m: +(errSum / n).toFixed(3), maxErr_m: +errMax.toFixed(3) });
