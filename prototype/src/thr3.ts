import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = 60;
for (let i = 0; i < n; i++) { const flip = i % 2; const A = makeTeam('A','A',60,{ tactic: { press: 1, line: 2, style: 1, tempo: 1, width: 1 } }); const B = makeTeam('B','B',60,{},NAMES_B); flip ? simulate(B, A, 50+i) : simulate(A, B, 50+i); }
const post = Object.entries(DBG).filter(([k]) => k.startsWith('post_')); const tot = (DBG.post_shot??0)+(DBG.post_pass??0)+(DBG.post_dribble??0)+(DBG.post_through??0);
console.log(post.map(([k, v]) => k + ':' + (k==='post_x'||k==='post_d'||k==='post_front' ? ((v as number)/tot).toFixed(1) : v)).join(' '));
