import { simulate, makeTeam, NAMES_B } from './engine.ts';
const f = process.argv[2]; const n = 120; let osh = 0, oxg = 0, og = 0, sh = 0, g = 0, poss = 0;
for (let i = 0; i < n; i++) { const me = makeTeam('A','A',60,{ formation: f as any }); const op = makeTeam('B','B',60,{},NAMES_B); const flip = i % 2 === 1; const st = flip ? simulate(op, me, 99+i) : simulate(me, op, 99+i); const a = st.stats[flip?1:0], b = st.stats[flip?0:1]; osh += b.shots; oxg += b.xg; og += b.goals; sh += a.shots; g += a.goals; poss += a.possTicks/(a.possTicks+b.possTicks); }
console.log(f, 'sut', (sh/n).toFixed(1), 'gol', (g/n).toFixed(2), '| rakip sut', (osh/n).toFixed(1), 'xG/sut', (oxg/osh).toFixed(3), 'gol', (og/n).toFixed(2), 'top%', (100*poss/n).toFixed(0));
