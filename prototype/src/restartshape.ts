import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
P.dt = 0.1;
const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 11);
let n = 0, ok = 0; const samples: any[] = [];
while (!st.done) {
  step(st);
  if (st.pending && (st.pending.kind === 'throw' || st.pending.kind === 'fk') && st.t > st.pending.at - 0.15 && st.t <= st.pending.at - 0.05) {
    n++; const s = st.pending.side; if (st.phase[s] > st.phase[1 - s]) ok++; if (samples.length < 6) samples.push([st.pending.kind, s, +st.phase[0].toFixed(2), +st.phase[1].toFixed(2)]);
  }
}
console.log(JSON.stringify({ n, ok, samples }));
