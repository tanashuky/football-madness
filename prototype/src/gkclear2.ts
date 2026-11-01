import { createMatch, step, makeTeam, NAMES_B, P, setControl, setInput, controlledPlayer } from './engine.ts';
P.dt = 0.05;
let kicks = 0, near3 = 0, near6 = 0; const minOpp: number[] = []; let holdT: number[] = [];
for (let seed = 1; seed <= 12; seed++) {
  const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 700 + seed);
  setControl(st, 0, 'team', 0, 1);
  let holdStart = -1;
  while (!st.done) {
    const feetBefore = st.gkFeet, ownerBefore = st.owner;
    const cp = controlledPlayer(st, 0);
    const gkHold = ownerBefore && ownerBefore.side === 0 && ownerBefore.pos === 'GK' && !feetBefore;
    if (gkHold && holdStart < 0) holdStart = st.t;
    // kullanici: kaleci topu elindeyken 4 s bekler sonra ileri uzun vurur
    const act = gkHold && st.t - holdStart > 4 ? 'pass' : undefined;
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, power: 0.95, ax: st.half % 2 === 0 ? 1 : -1, ay: 0 });
    step(st);
    const b = st.ball;
    if (gkHold && b.kicker === ownerBefore && b.kickT === st.t) {
      kicks++; holdT.push(st.t - holdStart); holdStart = -1;
      let md = 99; for (const q of st.players) if (!q.off && q.side !== 0) md = Math.min(md, Math.hypot(q.x - b.kicker.x, q.y - b.kicker.y));
      minOpp.push(+md.toFixed(1)); if (md < 3) near3++; if (md < 6) near6++;
    }
    if (!gkHold) holdStart = -1;
  }
}
minOpp.sort((a, b) => a - b);
console.log(JSON.stringify({ kicks, near3, near6, minOpp: minOpp.slice(0, 40), medianHold: holdT.sort((a,b)=>a-b)[holdT.length>>1] }));
