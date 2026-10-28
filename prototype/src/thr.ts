import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = 80;
for (let i = 0; i < n; i++) { const flip = i % 2; const A = makeTeam('A','A',60,{ tactic: { press: 1, line: 2, style: 1, tempo: 1, width: 1 } }); const B = makeTeam('B','B',60,{},NAMES_B); flip ? simulate(B, A, 50+i) : simulate(A, B, 50+i); }
for (const k of [1, 2]) { const c = DBG['A'+k]; console.log('rakip hatti', k, 'ara/mac', (c/n).toFixed(1), 'yol', (DBG['Ap'+k]/c).toFixed(2), 'yaris', (DBG['Ar'+k]/c).toFixed(2), 'ofs', (DBG['Ao'+k]/c).toFixed(2), 'mesafe', (DBG['Ad'+k]/c).toFixed(1), 'hedef x', (DBG['Ax'+k]/c).toFixed(1)); }
