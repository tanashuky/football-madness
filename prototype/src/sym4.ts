import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
const n = Number(process.argv[2]); const seed = Number(process.argv[3]); if (process.argv[4]) Object.assign(P, JSON.parse(process.argv[4]));
let w0 = 0, w1 = 0, g0 = 0, g1 = 0;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), seed + i); const [a, b] = st.stats; g0 += a.goals; g1 += b.goals; if (a.goals > b.goals) w0++; else if (b.goals > a.goals) w1++; }
console.log(process.argv[4] ?? 'base', JSON.stringify({ n, w0, w1, g0, g1 }));
