// formasyon testi: her formasyon, rastgele formasyonlu rakiplere karsi (taraf degistirerek)
import { simulate, makeTeam, NAMES_B, P, FORMATION_LIST } from './engine.ts';
Object.assign(P, JSON.parse(process.argv[3] ?? '{}'));
const n = Number(process.argv[2]); const out: string[] = [];
const list = process.argv[4] ? process.argv[4].split(',') : FORMATION_LIST;
for (const f of list) {
  let pts = 0, gf = 0, ga = 0;
  for (let i = 0; i < n; i++) {
    const of = FORMATION_LIST[i % FORMATION_LIST.length];
    const me = makeTeam('A', 'A', 60, { formation: f as any });
    const op = makeTeam('B', 'B', 60, { formation: of }, NAMES_B);
    const flip = i % 2 === 1; const st = flip ? simulate(op, me, 4242 + i) : simulate(me, op, 4242 + i);
    const a = st.stats[flip ? 1 : 0].goals, b = st.stats[flip ? 0 : 1].goals; gf += a; ga += b; pts += a > b ? 3 : a === b ? 1 : 0;
  }
  out.push(`${f}: ${(pts / n).toFixed(2)} (${(gf / n).toFixed(2)}-${(ga / n).toFixed(2)})`);
}
console.log(out.join('   '));
