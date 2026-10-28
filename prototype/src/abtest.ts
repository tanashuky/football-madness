import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
const n = +(process.argv[2] ?? 40);
const variants: [string, Record<string, number>][] = [['base', {}], ['gk eski (30 m, x1, 13)', { gkOutRange: 30, gkOutK: 1, gkOutMax: 13 }], ['mucadele bonus yok', { contestTackle: 1, contestSlide: 1 }], ['ikisi', { gkOutRange: 30, gkOutK: 1, gkOutMax: 13, contestTackle: 1, contestSlide: 1 }]];
const base: Record<string, number> = {};
for (const [, o] of variants) for (const k of Object.keys(o)) base[k] = (P as any)[k];
for (const [lab, o] of variants) {
  Object.assign(P, base, o);
  let g = 0, sh = 0, ot = 0;
  for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 700 + i); g += st.stats[0].goals + st.stats[1].goals; sh += st.stats[0].shots + st.stats[1].shots; ot += st.stats[0].onTarget + st.stats[1].onTarget; }
  console.log(lab.padEnd(26), 'goals', (g / n).toFixed(2), 'shots', (sh / n).toFixed(1), 'onT', (ot / n).toFixed(1));
}
