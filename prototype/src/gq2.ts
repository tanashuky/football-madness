import { simulate, makeTeam, NAMES_B } from './engine.ts';
(globalThis as any).SAMED = Number(process.argv[2]); (globalThis as any).MIND = Number(process.argv[2]);
const n = 300; let g = 0, sh = 0, w0 = 0, w1 = 0;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 7000+i); for (const s of st.stats) { g += s.goals; sh += s.shots; } const [a,b]=st.stats; if(a.goals>b.goals)w0++; else if(b.goals>a.goals)w1++; }
console.log(process.argv[2], 'gol', (g/n).toFixed(2), 'sut', (sh/n).toFixed(1), 'w0', w0, 'w1', w1);
