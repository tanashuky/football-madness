import { simulate, makeTeam, NAMES_B, DBG, P } from './engine.ts';
const [n, seed] = process.argv.slice(2).map(Number);
const optsA = JSON.parse(process.argv[4] ?? '{}'), optsB = JSON.parse(process.argv[5] ?? '{}');
if (process.argv[6]) Object.assign(P, JSON.parse(process.argv[6]));
const keys = ['goals','shots','onTarget','xg','passes','passesOk','fouls','yellows','reds','corners','setPieceGoals','offsides','duels','turnovers','subs','injuries'];
const sum: any = {}; for (const k of keys) sum[k] = 0;
let w0=0,w1=0,d=0; const gdist: number[] = new Array(12).fill(0); let zero=0, five=0;
for (let i = 0; i < n; i++) {
  const flip = i % 2 === 1;
  const A = makeTeam('A','A',60,optsA), B = makeTeam('B','B',60,optsB,NAMES_B);
  const st = flip ? simulate(B, A, seed+i) : simulate(A, B, seed+i);
  const a = st.stats[flip?1:0], b = st.stats[flip?0:1];
  for (const k of keys) sum[k] += (a as any)[k] + (b as any)[k];
  if (a.goals>b.goals) w0++; else if (b.goals>a.goals) w1++; else d++;
  const tg = a.goals+b.goals; gdist[Math.min(11,tg)]++; if (tg===0) zero++; if (tg>=5) five++;
}
const per: any = {}; for (const k of keys) per[k] = +(sum[k]/n/2).toFixed(3);
console.log(JSON.stringify({ n, w0: w0/n, d: d/n, w1: w1/n, perTeam: per, passAcc: +(sum.passesOk/sum.passes).toFixed(4), spShare: +(sum.setPieceGoals/sum.goals).toFixed(3), zero: zero/n, five: five/n }));
const out: any = {}; for (const k of Object.keys(DBG).sort()) out[k] = +(DBG[k]/n).toFixed(3);
console.log(JSON.stringify(out));
