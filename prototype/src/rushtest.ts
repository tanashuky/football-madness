import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, DBG } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 77);
setControl(st, 0, 'team', 0, 1);
const gk = st.players.find((p) => p.side === 0 && p.pos === 'GK')!;
let maxOut = 0, n = 0;
while (!st.done && n < 6000) {
  const opp = !!st.owner && st.owner.side === 1;
  setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, gkRush: opp });
  step(st); n++;
  const fx = st.half % 2 === 0 ? 105 - gk.x : gk.x;
  if (opp) maxOut = Math.max(maxOut, fx);
}
console.log({ maxKeeperOutWhileRushing: +maxOut.toFixed(1), dbg: DBG.kaleci_cikisi_kullanici });
