// Doktrin havuzu: her doktrin dengeli rakibe karsi (ayni tohumlar); gol lehte/aleyhte, sut, sekil gecisi
import { simulate, makeTeam, NAMES_B, DOCTRINE_LIST, DOCTRINES, shapesOf, shapeDist, P } from './engine.ts';
const n = +(process.argv[2] ?? 30);
const out: Record<string, any> = {};
for (const d of DOCTRINE_LIST) {
  let gf = 0, ga = 0, sf = 0, sa = 0, w = 0, l = 0;
  for (let i = 0; i < n; i++) {
    const A = makeTeam('A', 'A', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: d } as any });
    const B = makeTeam('B', 'B', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: 'balanced' } as any }, NAMES_B);
    const st = simulate(i % 2 ? B : A, i % 2 ? A : B, 900 + i);
    const me = i % 2 ? 1 : 0;
    const [a, b] = st.stats; const S = me ? b : a, O = me ? a : b;
    gf += S.goals; ga += O.goals; sf += S.shots; sa += O.shots; if (S.goals > O.goals) w++; else if (S.goals < O.goals) l++;
  }
  const sh = shapesOf(makeTeam('A', 'A', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: d } as any }));
  out[DOCTRINES[d].label] = { gf: +(gf / n).toFixed(2), ga: +(ga / n).toFixed(2), sf: +(sf / n).toFixed(1), sa: +(sa / n).toFixed(1), win: +(w / n).toFixed(2), loss: +(l / n).toFixed(2), shapeDist: +shapeDist(sh.def, sh.att).toFixed(1) };
}
console.log(JSON.stringify(out, null, 1));
