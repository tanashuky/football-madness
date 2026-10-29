import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
let kinds: Record<string, number> = {}, acted = 0, gk = 0;
for (let seed = 60; seed < 75; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, lastAct = -99, prevPen = false;
  while (!st.done && n < 120000) {
    const p = controlledPlayer(st, 0); const i = userCarrierInfo(st, 0);
    let act: any, extra: any = {}, mx = 0, my = 0;
    // savunmada penalti: joystick asagi tut (kaleci o tarafa atlar)
    if (st.pending && st.pending.kind === 'penalty' && st.pending.side === 1) { my = 1; prevPen = true; }
    if (p && i && i.kind && i.left < 7 && st.clock - lastAct > 6) {
      const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
      act = i.kind === 'penalty' || i.kind === 'fkshot' ? 'shoot' : i.kind === 'corner' ? 'cross' : 'pass'; extra = { power: 0.6, ax: (gx - p.x) / d, ay: (34 - p.y) / d, curve: 0.3, tap: false }; lastAct = st.clock; acted++; kinds[i.kind] = (kinds[i.kind] ?? 0) + 1;
    }
    setInput(st, 0, { mx, my, sprint: false, press: false, act, ...extra });
    step(st); n++;
  }
}
console.log(JSON.stringify({ acted, kinds, dbg: Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kullanici') || k.startsWith('duran_top'))) }));
