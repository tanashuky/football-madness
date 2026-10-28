import { createMatch, step, makeTeam, NAMES_B, DBG } from './engine.ts';
let throws = 0, walked = 0, maxWalk = 0, selfTouch = 0;
for (let seed = 1; seed <= 15; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1200 + seed);
  let taker: any = null, x0 = 0, y0 = 0, thrown = false, kickT = 0;
  while (!st.done) {
    const pk = st.pending?.kind;
    step(st);
    if (pk === 'throw' && !st.pending && st.owner) { taker = st.owner; x0 = taker.x; y0 = taker.y; thrown = false; throws++; }
    if (taker && !thrown && st.ball.kicker === taker) { thrown = true; kickT = st.t; const d = Math.hypot(taker.x - x0, taker.y - y0); maxWalk = Math.max(maxWalk, d); if (d > 0.5) walked++; }
    if (taker && thrown) { if (st.owner === taker && st.t - kickT < 5 && st.ball.touch === taker) { selfTouch++; taker = null; } else if (st.owner && st.owner !== taker) taker = null; }
  }
}
console.log({ throws, walkedOver05m: walked, maxWalk: +maxWalk.toFixed(2), selfTouch, tac_atildi: DBG.tac_atildi });
