import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
let gks = 0, inside = 0, checks = 0;
for (let seed = 1; seed <= 15; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1500 + seed);
  let wasGk = false;
  while (!st.done) {
    const pk = st.pending?.kind;
    step(st);
    if (pk === 'goalkick' && !st.pending) gks++;
    if (st.takerKind === 'goalkick' && st.owner === st.restartTaker && st.restartTaker && st.t > st.restartUntil + 0.6) {
      const A = st.restartTaker.side;
      for (const p of st.players) { if (p.off || p.side === A) continue; const fx = A === 0 !== (st.half % 2 === 0) ? p.x : 105 - p.x; checks++; if (fx < 16.5 && Math.abs(p.y - 34) < 20.16) inside++; }
    }
  }
}
console.log({ goalKicks: gks, oppChecks: checks, oppInsideBox: inside });
