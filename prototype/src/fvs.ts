// formasyon eslesme testi: her ikili, diger ayarlar rastgele, taraf degistirerek
import { simulate, makeTeam, NAMES_B, FORMATION_LIST, mulberry32 } from './engine.ts';
import { writeFileSync } from 'node:fs';
const [n, part, parts, out] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const DIMS: Record<string, any[]> = { press: [0, 1, 2], line: [0, 1, 2], style: [0, 1, 2], tempo: [0, 1, 2], width: [0, 1, 2], compact: [0, 1, 2], trap: [0, 1], fb: [0, 1, 2], cm: [0, 1, 2], wing: [0, 1], runs: [0, 1, 2], spBox: [0, 1, 2] };
const pairs: [string, string][] = []; FORMATION_LIST.forEach((a, i) => FORMATION_LIST.forEach((b, j) => { if (j > i) pairs.push([a, b]); }));
const res: any[] = [];
for (let pi = part; pi < pairs.length; pi += parts) {
  const [fa, fb] = pairs[pi]; const rng = mulberry32(777 + pi); let pa = 0, pb = 0;
  const rnd = () => { const t: any = {}; for (const k in DIMS) t[k] = DIMS[k][Math.floor(rng() * DIMS[k].length)]; return t; };
  for (let i = 0; i < n; i++) {
    const A = makeTeam('A', 'A', 60, { formation: fa as any, tactic: rnd() }); const B = makeTeam('B', 'B', 60, { formation: fb as any, tactic: rnd() }, NAMES_B);
    const flip = i % 2 === 1; const st = flip ? simulate(B, A, 30000 + pi * 1000 + i) : simulate(A, B, 30000 + pi * 1000 + i);
    const x = st.stats[flip ? 1 : 0].goals, y = st.stats[flip ? 0 : 1].goals; pa += x > y ? 3 : x === y ? 1 : 0; pb += y > x ? 3 : x === y ? 1 : 0;
  }
  res.push({ a: fa, b: fb, pa: pa / n, pb: pb / n });
}
writeFileSync(out, JSON.stringify(res));
