import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 40);
setControl(st, 0, 'team', 0, 1);
let n = 0, lastAct = -9, tracing = 0, shown = 0;
while (!st.done && n < 120000 && shown < 1) {
  const p = controlledPlayer(st, 0); const i = userCarrierInfo(st, 0);
  let act: any, extra: any = {};
  if (i && i.kind === 'fk' && i.left < 7 && st.t - lastAct > 1) { act = 'pass'; extra = { power: 0.6, ax: 1, ay: 0, curve: 0, tap: false }; lastAct = st.t; tracing = 30; }
  setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, ...extra });
  step(st); n++;
  if (tracing > 0) { tracing--; const c = st.control[0]!; console.log(st.t.toFixed(1), 'owner', st.owner?.num, st.owner?.side, 'ctl', p?.num, controlledPlayer(st, 0)?.num, 'act', c.input.act, 'kick', !!c.kick, 'taker', st.restartTaker?.num, 'sp', st.spWait?.kind, 'ru', st.restartUntil.toFixed(1), 'kind', st.ball.kind, 'info', JSON.stringify(userCarrierInfo(st, 0))); if (tracing === 0) shown++; }
}
