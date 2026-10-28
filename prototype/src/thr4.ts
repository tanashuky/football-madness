import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = 60;
for (let i = 0; i < n; i++) { const flip = i % 2; const A = makeTeam('A','A',60,{ tactic: { press: 1, line: Number(process.argv[2] ?? 1) as any, style: 1, tempo: 1, width: 1 } }); const B = makeTeam('B','B',60,{},NAMES_B); flip ? simulate(B, A, 50+i) : simulate(A, B, 50+i); }
const k = Object.keys(DBG).filter(k => k.startsWith('ara') || k.startsWith('post') || k === 'ofsayt'); console.log(k.map(x => x + ':' + ((DBG[x] as number)/n).toFixed(2)).join(' '));
