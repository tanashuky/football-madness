import { createMatch, step, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
const by: Record<string, number> = {}; let n = 0; let tackles = 0, loose = 0;
for (let seed = 1; seed <= 20; seed++) {
  const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 6000 + seed);
  let lastPend: any = null, lastKind = '', lastTag = '';
  while (!st.done) {
    const k = st.ball.kind; if (k && k !== 'none') lastKind = k;
    step(st);
    if (st.pending && st.pending !== lastPend) { lastPend = st.pending; if (st.pending.kind === 'throw') { n++; by[lastKind] = (by[lastKind] || 0) + 1; } }
  }
}
console.log({ throwsPerMatch: n / 20, by });
console.log(JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => /tac|uzakl|degaj|clear|kayip|loose|top_disari/.test(k)))));
