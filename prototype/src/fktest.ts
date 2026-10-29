import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
let fks = 0, defIn = 0, atkIn = 0, wallSwap = 0, wallDist = 0, wallN = 0;
for (let seed = 1; seed <= 30; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 4000 + seed);
  while (!st.done) {
    step(st);
    const pd: any = st.pending;
    if (pd && (pd.kind === 'fk' || pd.kind === 'fkshot') && Math.hypot(105 - pd.spotX, 34 - pd.spotY) < 45 && pd.at - st.t < 0.15 && pd.at - st.t > 0.05 && !pd.__seen) {
      pd.__seen = true; fks++;
      const A = pd.side;
      const fr = (p: any) => { const flip = st.half % 2 === 0; const x = (A === 0) !== flip ? p.x : 105 - p.x; const y = (A === 0) !== flip ? p.y : 68 - p.y; return [x, y]; };
      for (const p of st.players) { if (p.off || p.pos === 'GK') continue; const [x, y] = fr(p); const inBox = x > 88.5 && Math.abs(y - 34) < 20.16; if (inBox) { if (p.side === A) atkIn++; else if (!(pd.wallSet ?? []).includes(p)) defIn++; } }
      for (const w of pd.wallSet ?? []) { const [x, y] = fr(w); wallDist += Math.abs(Math.hypot(x - pd.spotX, y - pd.spotY) - 9.15); wallN++; }
    }
  }
}
console.log({ boxFreeKicks: fks, avgDefendersInBox: +(defIn / fks).toFixed(1), avgAttackersInBox: +(atkIn / fks).toFixed(1), wallAvgOffFrom915m: +(wallDist / Math.max(1, wallN)).toFixed(2) });
