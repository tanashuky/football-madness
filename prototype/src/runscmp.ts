import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
function run(label: string, mask: string, n = 100) {
  for (const k in DBG) delete (DBG as any)[k];
  (P as any).runsMask = mask;
  let g = 0, shots = 0, xg = 0, pa = 0, pn = 0, draws = 0;
  for (let seed = 1; seed <= n; seed++) {
    const st: any = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 8000 + seed);
    g += st.stats[0].goals + st.stats[1].goals; shots += st.stats[0].shots + st.stats[1].shots; xg += st.stats[0].xg + st.stats[1].xg; pa += st.stats[0].passesOk + st.stats[1].passesOk; pn += st.stats[0].passes + st.stats[1].passes; if (st.stats[0].goals === st.stats[1].goals) draws++;
  }
  console.log(label, JSON.stringify({ goals: +(g / n).toFixed(2), shots: +(shots / n / 2).toFixed(1), xg: +(xg / n / 2).toFixed(2), passAcc: +(pa / pn).toFixed(3), draws: draws / n }), JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kosu') || k.startsWith('ara_al') || k === 'kayip_pas_hucum'))));
}
run('bf', 'bf'); run('bfw', '');
