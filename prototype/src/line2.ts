// hat testi: A (secilen taktik) vs B (varsayilan): taraf basi gol, sut, ara pas alimi, ofsayt, top%
import { simulate, makeTeam, NAMES_B, P, EDGE_RULES, EDGE_BASE } from './engine.ts';
const oa = JSON.parse(process.argv[2] ?? '{}'); const n = Number(process.argv[3] ?? 150);
if (process.argv[4]) Object.assign(P, JSON.parse(process.argv[4]));
for (const r of EDGE_RULES) r.w = 0; for (const r of EDGE_BASE) r.w = 0;
const acc = [{ g: 0, sh: 0, thr: 0, off: 0, poss: 0, xg: 0, pts: 0 }, { g: 0, sh: 0, thr: 0, off: 0, poss: 0, xg: 0, pts: 0 }];
for (let i = 0; i < n; i++) {
  const flip = i % 2 === 1;
  const A = makeTeam('A', 'A', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, width: 1, ...oa } }), B = makeTeam('B', 'B', 60, {}, NAMES_B);
  const st = flip ? simulate(B, A, 500 + i) : simulate(A, B, 500 + i);
  const ia = flip ? 1 : 0;
  for (const k of [0, 1]) {
    const side = (k === 0 ? ia : 1 - ia) as 0 | 1; const s = st.stats[side];
    acc[k].g += s.goals; acc[k].sh += s.shots; acc[k].off += s.offsides; acc[k].xg += s.xg;
    acc[k].poss += s.possTicks / (st.stats[0].possTicks + st.stats[1].possTicks);
    acc[k].thr += st.log.filter((l) => l.k === 'through' && l.s === side).length;
    const o = st.stats[1 - side]; acc[k].pts += s.goals > o.goals ? 3 : s.goals === o.goals ? 1 : 0;
  }
}
const f = (a: any) => `puan ${(a.pts / n).toFixed(2)} gol ${(a.g / n).toFixed(2)} xG ${(a.xg / n).toFixed(2)} sut ${(a.sh / n).toFixed(1)} arapas-alim ${(a.thr / n).toFixed(2)} ofsayt ${(a.off / n).toFixed(2)} top% ${(100 * a.poss / n).toFixed(0)}`;
console.log(JSON.stringify(oa), '\n  A:', f(acc[0]), '\n  B:', f(acc[1]));
