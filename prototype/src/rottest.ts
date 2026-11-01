import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
function run(label: string, rot: number[][] | undefined, U?: number, n = 40) {
  for (const k in DBG) delete (DBG as any)[k];
  let g = [0, 0], shots = [0, 0], xg = [0, 0], rotEv = 0, rotHome = 0;
  for (let seed = 1; seed <= n; seed++) {
    const a = makeTeam('A', 'A', 60, { formation: '4-3-3' }); a.tactic = { ...a.tactic, rotations: rot }; if (U !== undefined) (a as any).U = U;
    const b = makeTeam('B', 'B', 60, { formation: '4-3-3' }, NAMES_B);
    const st: any = simulate(a, b, 3000 + seed);
    g[0] += st.stats[0].goals; g[1] += st.stats[1].goals; shots[0] += st.stats[0].shots; shots[1] += st.stats[1].shots; xg[0] += st.stats[0].xg; xg[1] += st.stats[1].xg;
    rotEv += st.events.filter((e: any) => e.type === 'adjust' && e.text === 'rotasyon').length; rotHome += st.events.filter((e: any) => e.type === 'adjust' && e.text === 'rotasyon eve').length;
  }
  console.log(label, JSON.stringify({ g: g.map((x) => +(x / n).toFixed(2)), shots: shots.map((x) => +(x / n).toFixed(1)), xg: xg.map((x) => +(x / n).toFixed(2)), rotPerMatch: +(rotEv / n).toFixed(1), homePerMatch: +(rotHome / n).toFixed(1) }), JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('rotasyon')))));
}
run('yok', undefined);
run('W-ST-W (7,9,11)', [[7, 9, 11]]);
run('W-ST-W U40', [[7, 9, 11]], 40);
run('W-ST-W U95', [[7, 9, 11]], 95);
run('FB-W x2 (2,7)(3,11)', [[2, 7], [3, 11]]);
run('4lu (2,7,9,11)', [[2, 7, 9, 11]]);
