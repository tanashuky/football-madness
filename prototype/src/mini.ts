// hizli denge testi: tek bir taktik boyutu, ortalama bir rakibe karsi (taraf degistirerek)
import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
Object.assign(P, JSON.parse(process.argv[4] ?? '{}'));
const dim = process.argv[2]; const n = Number(process.argv[3]);
const out: string[] = [];
const vals = dim === 'formation' ? ['4-3-3', '4-4-2'] : [0, 1, 2];
for (const v of vals) {
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < n; i++) {
    const tac: any = { press: 1, line: 1, style: 1, tempo: 1, width: 1 };
    const opts: any = { formation: i % 4 < 2 ? '4-3-3' : '4-4-2' };
    if (dim === 'formation') opts.formation = v; else tac[dim] = v;
    const me = makeTeam('A', 'A', 60, { ...opts, tactic: tac });
    const op = makeTeam('B', 'B', 60, { formation: i % 3 === 0 ? '4-4-2' : '4-3-3' }, NAMES_B);
    const flip = i % 2 === 1;
    const st = flip ? simulate(op, me, 777 + i) : simulate(me, op, 777 + i);
    const a = st.stats[flip ? 1 : 0].goals, b = st.stats[flip ? 0 : 1].goals;
    gf += a; ga += b; pts += a > b ? 3 : a === b ? 1 : 0;
  }
  out.push(`${v}: ${(pts / n).toFixed(2)} (${(gf / n).toFixed(2)}-${(ga / n).toFixed(2)})`);
}
console.log(dim.padEnd(9), out.join('   '), process.argv[4] ?? '');
