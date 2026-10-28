import { simulate, makeTeam, NAMES_B } from './engine.ts';
(globalThis as any).SAMED = Number(process.argv[2]);
const n = 300; let g = 0, sh = 0, xg = 0;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 5000+i); for (const s of st.stats) { g += s.goals; sh += s.shots; xg += s.xg; } }
console.log(process.argv[2], 'gol', (g/n).toFixed(2), 'sut', (sh/n).toFixed(1), 'xg/sut', (xg/sh).toFixed(3));
