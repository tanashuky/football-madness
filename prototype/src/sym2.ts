import * as E from './engine.ts';
const [n, mode] = [Number(process.argv[2]), process.argv[3]];
if (mode === 'clock1') Object.assign(E.P, { clockRate: 1 });
let w0 = 0, w1 = 0;
for (let i = 0; i < n; i++) {
  const st = E.simulate(E.makeTeam('A', 'A', 60), E.makeTeam('B', 'B', 60, {}, E.NAMES_B), 123000 + i);
  const [a, b] = st.stats; if (a.goals > b.goals) w0++; else if (b.goals > a.goals) w1++;
}
console.log(mode, 'sol', w0, 'sag', w1);
