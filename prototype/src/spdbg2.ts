import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 40);
setControl(st, 0, 'team', 0, 1);
let n = 0, lastAct = -9, prevTO = 0, log: string[] = [];
while (!st.done && n < 120000) {
  const p = controlledPlayer(st, 0); const i = userCarrierInfo(st, 0);
  let act: any, extra: any = {}, mx = 0, my = 0;
  if (p) { const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1; mx = (gx - p.x) / d; my = (34 - p.y) / d;
    if (i && i.kind && i.left < 7 && st.t - lastAct > 1) { act = i.kind === 'penalty' || i.kind === 'fkshot' ? 'shoot' : i.kind === 'corner' ? 'cross' : 'pass'; extra = { power: 0.6, ax: mx, ay: my, curve: 0.3, tap: false }; lastAct = st.t; }
    else if (st.owner === p && st.t - lastAct > 1.2) { act = d < 22 ? 'shoot' : 'pass'; extra = { power: 0.5 }; lastAct = st.t; } }
  log.push(`${st.t.toFixed(1)} i=${JSON.stringify(i)} act=${act} own=${st.owner?.num}/${st.owner?.side} p=${p?.num} kick=${!!st.control[0]!.kick}`); if (log.length > 120) log.shift();
  setInput(st, 0, { mx, my, sprint: false, press: true, act, ...extra });
  step(st); n++;
  if ((DBG.duran_top_sure_doldu ?? 0) !== prevTO) { prevTO = DBG.duran_top_sure_doldu; console.log(log.filter((l) => !l.includes("act=undefined") || l.includes("kick=true")).slice(-8).join('\n')); break; }
}
