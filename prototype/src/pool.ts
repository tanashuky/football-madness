// havuz testi: her secenek degeri, digerleri rastgele olan takimlarla, tamamen rastgele rakiplere karsi
import { simulate, makeTeam, NAMES_B, P, FORMATION_LIST, mulberry32, EDGE_RULES, EDGE_BASE } from './engine.ts';
import { writeFileSync } from 'node:fs';
const [n, part, parts, out] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
Object.assign(P, JSON.parse(process.argv[6] ?? '{}'));
if (process.argv[7] === 'noedge') { for (const r of EDGE_RULES) r.w = 0; for (const r of EDGE_BASE) r.w = 0; }
if (process.argv[7] === 'nobase') { for (const r of EDGE_BASE) r.w = 0; }
const DIMS: Record<string, any[]> = { formation: FORMATION_LIST, press: [0, 1, 2], line: [0, 1, 2], style: [0, 1, 2], tempo: [0, 1, 2], width: [0, 1, 2], compact: [0, 1, 2], trap: [0, 1], fb: [0, 1, 2], cm: [0, 1, 2], wing: [0, 1], runs: [0, 1, 2], spBox: [0, 1, 2] };
const tasks: [string, any][] = []; for (const d in DIMS) for (const v of DIMS[d]) tasks.push([d, v]);
const res: any[] = [];
for (let ti = part; ti < tasks.length; ti += parts) {
  const [d, v] = tasks[ti]; const rng = mulberry32(1000 + ti);
  const rnd = () => { const t: any = {}; for (const k in DIMS) t[k] = DIMS[k][Math.floor(rng() * DIMS[k].length)]; return t; };
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < n; i++) {
    const a = rnd(); a[d] = v; const b = rnd();
    const mk = (t: any, nm: string, names?: any) => { const { formation, ...tac } = t; return makeTeam(nm, nm, 60, { formation, tactic: tac }, names); };
    const me = mk(a, 'A'), op = mk(b, 'B', NAMES_B);
    const flip = i % 2 === 1; const st = flip ? simulate(op, me, 60000 + ti * 1000 + i) : simulate(me, op, 60000 + ti * 1000 + i);
    const x = st.stats[flip ? 1 : 0].goals, y = st.stats[flip ? 0 : 1].goals; gf += x; ga += y; pts += x > y ? 3 : x === y ? 1 : 0;
  }
  res.push({ d, v, ppg: pts / n, gf: gf / n, ga: ga / n, n });
}
writeFileSync(out, JSON.stringify(res));
