import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const L = Number(process.argv[2]); Object.assign((await import('./engine.ts')).P, JSON.parse(process.argv[3] ?? '{}'));
let a: any = { g: 0, sh: 0, pas: 0, pos: 0 }, b: any = { g: 0, sh: 0, pas: 0 };
const n = 20;
for (let i = 0; i < n; i++) {
  const st = simulate(makeTeam('A','A',60,{ tactic: { press: 1, line: L as any, style: 1, tempo: 1, width: 1 } }), makeTeam('B','B',60,{},NAMES_B), 100+i);
  const [x, y] = st.stats; a.g += x.goals; a.sh += x.shots; a.pas += x.passes; a.pos += x.possTicks/(x.possTicks+y.possTicks); b.g += y.goals; b.sh += y.shots; b.pas += y.passes;
}
console.log('line', L, 'A gol', a.g/n, 'sut', a.sh/n, 'pas', a.pas/n, 'top%', (100*a.pos/n).toFixed(0), '| B gol', b.g/n, 'sut', b.sh/n, 'pas', b.pas/n);
console.log(Object.entries(DBG).filter(([k])=>k.startsWith('karar')||k.startsWith('kayip')||k==='ara_pas').map(([k,v])=>k+':'+Math.round(v as number/n)).join(' '));
