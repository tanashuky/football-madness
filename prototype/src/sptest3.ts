import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
let acted: Record<string, number> = {};
for (let seed = 80; seed < 92; seed++) {
  const st = createMatch(makeTeam('A', 'A', 75), makeTeam('B', 'B', 50, {}, NAMES_B), seed);
  setControl(st, 0, 'team', 2, 2);
  let n = 0, lastAct = -99;
  while (!st.done && n < 120000) {
    const p = controlledPlayer(st, 0); const i = userCarrierInfo(st, 0);
    const inPoss = !!st.owner && st.owner.side === 0;
    let act: any, extra: any = {}, mx = 0, my = 0;
    if (p) {
      const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1; mx = (gx - p.x) / d; my = (34 - p.y) / d;
      if (i && i.kind && st.clock - lastAct > 6) { act = i.kind === 'penalty' || i.kind === 'fkshot' ? 'shoot' : i.kind === 'corner' ? 'cross' : 'pass'; extra = { power: 0.6, ax: mx, ay: my, curve: 0.3, tap: false }; lastAct = st.clock; acted[i.kind] = (acted[i.kind] ?? 0) + 1; }
      else if (inPoss && st.owner === p && st.clock - lastAct > 8) { act = d < 25 ? 'shoot' : 'pass'; extra = { power: d < 25 ? 0.7 : 0.4 }; lastAct = st.clock; }
    }
    setInput(st, 0, { mx, my, sprint: true, press: !inPoss, act, ...extra });
    step(st); n++;
  }
}
console.log(JSON.stringify({ acted, dbg: Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kullanici') || k.startsWith('duran_top') || k === 'uorta')) }));
