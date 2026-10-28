import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = 80;
for (let i = 0; i < n; i++) { const flip = i % 2; const A = makeTeam('A','A',60,{ tactic: { press: 1, line: 2, style: 1, tempo: 1, width: 1 } }); const B = makeTeam('B','B',60,{},NAMES_B); flip ? simulate(B, A, 50+i) : simulate(A, B, 50+i); }
for (const k of [1, 2]) console.log('savunma hatti', k, 'ara pas alinan/mac', ((DBG['ara_al_vs'+k]??0)/n).toFixed(2), 'sonrasi sut', ((DBG['ara_sut_vs'+k]??0)/n).toFixed(2), 'beklenen gol', ((DBG['ara_xg_vs'+k]??0)/n).toFixed(2));
