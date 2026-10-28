import { simulate, makeTeam, NAMES_B } from './engine.ts';
const [n, seed] = process.argv.slice(2).map(Number);
let w0 = 0, w1 = 0, d = 0, g0 = 0, g1 = 0;
for (let i = 0; i < n; i++) {
  const st = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed + i);
  const [a, b] = st.stats; g0 += a.goals; g1 += b.goals;
  if (a.goals > b.goals) w0++; else if (b.goals > a.goals) w1++; else d++;
}
console.log(JSON.stringify({ n, w0, w1, d, g0, g1 }));
