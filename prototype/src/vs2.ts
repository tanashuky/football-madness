// iki taktik karsi karsiya (tablolar kapali), taraf degistirerek
import { simulate, makeTeam, NAMES_B, P, EDGE_RULES, EDGE_BASE } from './engine.ts';
const oa = JSON.parse(process.argv[2] ?? '{}'), ob = JSON.parse(process.argv[3] ?? '{}'); const n = Number(process.argv[4] ?? 150);
const mode = process.argv[5] ?? 'noedge'; if (process.argv[6]) Object.assign(P, JSON.parse(process.argv[6]));
if (mode === 'noedge') { for (const r of EDGE_RULES) r.w = 0; for (const r of EDGE_BASE) r.w = 0; }
let pa = 0, pb = 0, ga = 0, gb = 0;
for (let i = 0; i < n; i++) {
  const flip = i % 2 === 1;
  const { formation: fa, ...ta } = oa; const { formation: fb, ...tb } = ob;
  const A = makeTeam('A', 'A', 60, { formation: fa ?? '4-3-3', tactic: { press: 1, line: 1, style: 1, tempo: 1, width: 1, ...ta } });
  const B = makeTeam('B', 'B', 60, { formation: fb ?? '4-3-3', tactic: { press: 1, line: 1, style: 1, tempo: 1, width: 1, ...tb } }, NAMES_B);
  const st = flip ? simulate(B, A, 500 + i) : simulate(A, B, 500 + i);
  const x = st.stats[flip ? 1 : 0].goals, y = st.stats[flip ? 0 : 1].goals;
  ga += x; gb += y; pa += x > y ? 3 : x === y ? 1 : 0; pb += y > x ? 3 : x === y ? 1 : 0;
}
console.log(`${JSON.stringify(oa)} vs ${JSON.stringify(ob)} [${mode}]: ${(pa / n).toFixed(2)} - ${(pb / n).toFixed(2)}  gol ${(ga / n).toFixed(2)}-${(gb / n).toFixed(2)}`);
