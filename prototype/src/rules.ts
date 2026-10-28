import { createMatch, step, makeTeam, NAMES_B, DBG, P } from './engine.ts';
// santra: santra aninda (kickoff olayi) herkes kendi yarisinda, kullanan haric orta yuvarlagin disinda
let koChecks = 0, koBad = 0, throwSelf = 0, throws = 0, gkHandsBack = 0, backPass = 0, goals = 0;
for (let seed = 1; seed <= 20; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 900 + seed);
  let ev = 0;
  while (!st.done) {
    const prevOwner = st.owner;
    step(st);
    for (; ev < st.events.length; ev++) {
      const e = st.events[ev];
      if (e.type === 'kickoff') {
        koChecks++;
        for (const p of st.players) {
          if (p.off || p === st.owner) continue;
          const own = (p.side === 0) !== (st.half % 2 === 0) ? p.x <= 52.5 + 0.01 : p.x >= 52.5 - 0.01;
          const out = Math.hypot(p.x - 52.5, p.y - 34) >= 9.15;
          if (!own || !out) koBad++;
        }
      }
      if (e.type === 'goal') goals++;
    }
  }
}
console.log({ kickoffs: koChecks, playersMisplaced: koBad, goals, dbg: { geri_pas: DBG.geri_pas, tac: DBG.tac } });
