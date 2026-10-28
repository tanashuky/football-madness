import { simulate, makeTeam, NAMES_B } from './engine.ts';
const [f1, f2, n] = [process.argv[2], process.argv[3], Number(process.argv[4] ?? 200)];
let g = 0, g0 = 0, g1 = 0, sh = 0;
for (let s = 1; s <= n; s++) {
  const st = simulate(makeTeam('A', 'A', 60, { formation: f1 as any }), makeTeam('B', 'B', 60, { formation: f2 as any }, NAMES_B), s);
  g0 += st.stats[0].goals; g1 += st.stats[1].goals; sh += st.stats[0].shots + st.stats[1].shots;
}
console.log(`${f1} vs ${f2}: gol/mac ${((g0 + g1) / n).toFixed(2)} (${f1} ${(g0 / n).toFixed(2)} - ${f2} ${(g1 / n).toFixed(2)}) sut/takim ${(sh / n / 2).toFixed(1)}`);
