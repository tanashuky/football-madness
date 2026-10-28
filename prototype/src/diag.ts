import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
const N = Number(process.argv[2] ?? 200);
const ratio = Number(process.argv[3] ?? 1);
const over = process.argv[4] ? JSON.parse(process.argv[4]) : {};
Object.assign(P, over);
const agg: Record<string, number> = {};
let w = 0, d = 0, l = 0, goalsTot = 0;
const scoreDist: Record<number, number> = {};
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const a = makeTeam('A', 'A', 60 * ratio);
  const b = makeTeam('B', 'B', 60, {}, NAMES_B);
  const st = simulate(a, b, 1000 + i);
  const [sa, sb] = st.stats;
  if (sa.goals > sb.goals) w++; else if (sa.goals === sb.goals) d++; else l++;
  const tg = sa.goals + sb.goals; goalsTot += tg; scoreDist[tg] = (scoreDist[tg] ?? 0) + 1;
  for (const s of [sa, sb]) for (const [k, v] of Object.entries(s)) agg[k] = (agg[k] ?? 0) + (v as number) / (2 * N);
  agg.goalsA = (agg.goalsA ?? 0) + sa.goals / N; agg.goalsB = (agg.goalsB ?? 0) + sb.goals / N;
}
const ms = Date.now() - t0;
const f = (x: number) => x.toFixed(2);
console.log(`N=${N} oran=${ratio} sure=${(ms / N).toFixed(0)}ms/mac`);
console.log(`G/B/M %${(100*w/N).toFixed(0)}/${(100*d/N).toFixed(0)}/${(100*l/N).toFixed(0)}  mac basi gol ${f(goalsTot/N)}  A ${f(agg.goalsA)} B ${f(agg.goalsB)}`);
console.log(`takim basi: sut ${f(agg.shots)} isabet ${f(agg.onTarget)} xG ${f(agg.xg)} xG/sut ${f(agg.xg/agg.shots)} pas ${f(agg.passes)} isabet% ${f(100*agg.passesOk/agg.passes)} faul ${f(agg.fouls)} duello ${f(agg.duels)} sari ${f(agg.yellows)} kirmizi ${f(agg.reds)} korner ${f(agg.corners)} top kazanma ${f(agg.turnovers)} duran top gol% ${f(100*agg.setPieceGoals/agg.goals)}`);
const keys = Object.keys(scoreDist).map(Number).sort((a,b)=>a-b);
console.log('toplam gol dagilimi:', keys.map(k=>`${k}:${(100*scoreDist[k]/N).toFixed(0)}%`).join(' '));
import { DBG } from './engine.ts';
console.log(Object.entries(DBG).sort().map(([k,v])=>`${k}: ${(v/(2*N)).toFixed(1)}`).join('\n'));
