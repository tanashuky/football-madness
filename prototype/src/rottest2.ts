import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
function run(label: string, rot: number[][] | undefined, n = 30) {
  for (const k in DBG) delete (DBG as any)[k];
  let g = [0, 0], xg = [0, 0], rotEv = 0, rotHome = 0, rotTime = 0;
  for (let seed = 1; seed <= n; seed++) {
    const a = makeTeam('A', 'A', 60, { formation: '4-3-3' }); a.tactic = { ...a.tactic, rotations: rot };
    const b = makeTeam('B', 'B', 60, { formation: '4-3-3' }, NAMES_B);
    const st: any = simulate(a, b, 3000 + seed);
    g[0] += st.stats[0].goals; g[1] += st.stats[1].goals; xg[0] += st.stats[0].xg; xg[1] += st.stats[1].xg;
    const ev = st.events.filter((e: any) => e.type === 'adjust' && (e.text === 'rotasyon' || e.text === 'rotasyon eve'));
    rotEv += ev.filter((e: any) => e.text === 'rotasyon').length;
    let open = -1; for (const e of ev) { if (e.text === 'rotasyon' && open < 0) open = e.t; else if (e.text === 'rotasyon eve' && open >= 0) { rotTime += e.t - open; open = -1; } }
  }
  console.log(label, JSON.stringify({ g: g.map((x) => +(x / n).toFixed(2)), xg: xg.map((x) => +(x / n).toFixed(2)), rotPerMatch: +(rotEv / n).toFixed(1), avgRotS: rotEv ? +(rotTime / rotEv).toFixed(1) : 0 }));
}
for (const gain of [3, 1]) { P.rotGain = gain; run(`gain ${gain} W-ST-W`, [[7, 9, 11]]); run(`gain ${gain} FB-W x2`, [[2, 7], [3, 11]]); }
