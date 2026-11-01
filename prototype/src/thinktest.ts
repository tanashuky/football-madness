// Dusunen bot: derinlik 0 vs 4 (sezgisel) ve derinlik 4 + ic simulasyon; esit takimlar; galibiyet/maglubiyet, degisiklik sayisi
import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 40);
function run(label: string, think: number, sim: number) {
  P.thinkSim = sim;
  let w = 0, l = 0, gf = 0, ga = 0, ch = 0;
  for (let i = 0; i < n; i++) {
    const A = makeTeam('A', 'A', 60, { think } as any), B = makeTeam('B', 'B', 60, {}, NAMES_B);
    const st: any = simulate(i % 2 ? B : A, i % 2 ? A : B, 5000 + i);
    const me = i % 2 ? 1 : 0; const S = st.stats[me], O = st.stats[1 - me];
    gf += S.goals; ga += O.goals; if (S.goals > O.goals) w++; else if (S.goals < O.goals) l++;
    ch += st.thinkLog.filter((e: any) => e.side === me && !e.label.includes('yok')).length;
  }
  console.log(label, JSON.stringify({ win: +(w / n).toFixed(2), loss: +(l / n).toFixed(2), gf: +(gf / n).toFixed(2), ga: +(ga / n).toFixed(2), changesPerMatch: +(ch / n).toFixed(1) }));
}
const t0 = performance.now();
run('think 0', 0, 0);
run('think 2 sezgisel', 2, 0);
run('think 4 sezgisel', 4, 0);
const t1 = performance.now();
if (process.argv[3] === 'sim') run('think 4 + simulasyon', 4, 1);
console.log('sim cost per match ms', ((performance.now() - t1) / n - (t1 - t0) / (3 * n)).toFixed(0));
console.log(JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('bot_')))));
