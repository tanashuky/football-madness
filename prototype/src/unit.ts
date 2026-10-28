// bir birim (%4,5 EG) kac puan eder: A GG 62.7 vs B 60, tablolar kapali
import { simulate, makeTeam, NAMES_B, EDGE_RULES, EDGE_BASE } from './engine.ts';
for (const r of EDGE_RULES) r.w = 0;
const n = 400; let pa = 0, pb = 0;
for (let i = 0; i < n; i++) { const flip = i % 2 === 1; const A = makeTeam('A','A',62.7), B = makeTeam('B','B',60,{},NAMES_B); const st = flip ? simulate(B, A, 800 + i) : simulate(A, B, 800 + i); const x = st.stats[flip?1:0].goals, y = st.stats[flip?0:1].goals; pa += x > y ? 3 : x === y ? 1 : 0; pb += y > x ? 3 : x === y ? 1 : 0; }
console.log('+%4.5 EG:', (pa / n).toFixed(2), '-', (pb / n).toFixed(2), 'fark', ((pa - pb) / n).toFixed(2));
