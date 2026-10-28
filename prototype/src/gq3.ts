import { simulate, makeTeam, NAMES_B, DBG, P } from './engine.ts';
const over = JSON.parse(process.argv[3] ?? '{}'); Object.assign(P, over);
const n = Number(process.argv[2]); let g = 0, sh = 0, off = 0, w0 = 0, w1 = 0;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 7000+i); for (const s of st.stats) { g += s.goals; sh += s.shots; off += s.offsides; } const [a,b]=st.stats; if(a.goals>b.goals)w0++; else if(b.goals>a.goals)w1++; }
console.log('gol', (g/n).toFixed(2), 'sut', (sh/n).toFixed(1), 'ofsayt', (off/n).toFixed(2), 'w0', w0, 'w1', w1, 'ara', ((DBG.ara_pas??0)/n).toFixed(1), 'basari', ((DBG.ara_p??0)/(DBG.ara_pas??1)).toFixed(2), process.argv[3] ?? '');
