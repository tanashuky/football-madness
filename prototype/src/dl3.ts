import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
Object.assign(P, JSON.parse(process.argv[3] ?? '{}'));
const L = Number(process.argv[2]); const n = 60;
const agg = [0, 1].map(() => ({ g: 0, sh: 0, xg: 0, ot: 0, of: 0 }));
for (let i = 0; i < n; i++) {
  const A = makeTeam('A','A',60,{ tactic: { press: 1, line: L as any, style: 1, tempo: 1, width: 1 } });
  const B = makeTeam('B','B',60,{},NAMES_B);
  const flip = i % 2 === 1; const st = flip ? simulate(B, A, 300+i) : simulate(A, B, 300+i);
  const sa = st.stats[flip ? 1 : 0], sb = st.stats[flip ? 0 : 1];
  for (const [k, s] of [[0, sa], [1, sb]] as any) { agg[k].g += s.goals; agg[k].sh += s.shots; agg[k].xg += s.xg; agg[k].ot += s.onTarget; agg[k].of += s.offsides; }
}
const f = (a: any) => `gol ${(a.g/n).toFixed(2)} sut ${(a.sh/n).toFixed(1)} xG/sut ${(a.xg/a.sh).toFixed(3)} isabet ${(a.ot/n).toFixed(1)} ofs ${(a.of/n).toFixed(1)}`;
console.log('hat', L, '| A:', f(agg[0]), '| B(orta):', f(agg[1]), process.argv[3] ?? '');
import { DBG } from './engine.ts';
for (const k of [0,1,2]) if (DBG['ara_vs'+k]) console.log('  rakip hat', k, 'ara pas/mac', (DBG['ara_vs'+k]/n).toFixed(1), 'basari', (DBG['arap_vs'+k]/DBG['ara_vs'+k]).toFixed(2));
for (const k of [0,1,2]) if (DBG['sut_vs'+k]) console.log('  rakip hat', k, 'sut', DBG['sut_vs'+k], 'kalabalik', (DBG['cr_vs'+k]/DBG['sut_vs'+k]).toFixed(2), 'ham xG', (DBG['bx_vs'+k]/DBG['sut_vs'+k]).toFixed(3), 'mesafe', (DBG['d_vs'+k]/DBG['sut_vs'+k]).toFixed(1));
