import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
function run(label: string, rot: number[][] | undefined, markB: boolean, n = 80) {
  for (const k in DBG) delete (DBG as any)[k];
  let g = [0, 0], xg = [0, 0], shots = [0, 0];
  for (let seed = 1; seed <= n; seed++) {
    const a = makeTeam('A', 'A', 60, { formation: '4-3-3' }); a.tactic = { ...a.tactic, rotations: rot };
    const b = makeTeam('B', 'B', 60, { formation: '4-3-3' }, NAMES_B);
    if (markB) b.duties = { 2: { mark: 1 }, 3: { mark: 1 }, 4: { mark: 1 }, 5: { mark: 1 } };
    const st: any = simulate(a, b, 4000 + seed);
    g[0] += st.stats[0].goals; g[1] += st.stats[1].goals; xg[0] += st.stats[0].xg; xg[1] += st.stats[1].xg; shots[0] += st.stats[0].shots; shots[1] += st.stats[1].shots;
  }
  console.log(label, JSON.stringify({ g: g.map((x) => +(x / n).toFixed(2)), xg: xg.map((x) => +(x / n).toFixed(2)), shots: shots.map((x) => +(x / n).toFixed(1)) }), JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('markaj') || k.startsWith('rotasyon')))));
}
run('B markaj, A rotasyon yok', undefined, true);
run('B markaj, A W-ST-W', [[7, 9, 11]], true);
run('B markaj, A FB-W x2 + ST', [[2, 7], [3, 11]], true);
run('B alan, A W-ST-W', [[7, 9, 11]], false);
