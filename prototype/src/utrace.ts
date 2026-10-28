import { createMatch, step, makeTeam, NAMES_B, P, setControl, setInput, controlledPlayer, DBG } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 21);
setControl(st, 0, 'team', 2, 2);
let n = 0, lastAct = -9, shown = 0;
let watch: any = null;
while (!st.done && n < 6000 && shown < 12) {
  const p = controlledPlayer(st, 0);
  const inPoss = !!st.owner && st.owner.side === 0;
  let act: any, power: any, mx = 0, my = 0;
  if (p) {
    const gx = st.half % 2 === 0 ? 0 : 105;
    const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
    mx = (gx - p.x) / d; my = (34 - p.y) / d;
    if (inPoss && st.t - lastAct > 1.2) { act = 'pass'; power = 0.3; lastAct = st.t; }
  }
  setInput(st, 0, { mx, my, sprint: false, press: !inPoss, act, power });
  const before = st.owner;
  step(st); n++;
  const b = st.ball;
  if (act === 'pass' && before && !st.owner && b.kicker === before) {
    watch = { t: st.t.toFixed(1), from: [before.x.toFixed(1), before.y.toFixed(1)], aim: [b.tx.toFixed(1), b.ty.toFixed(1)], intended: b.intended ? `${b.intended.num}@${b.intended.x.toFixed(1)},${b.intended.y.toFixed(1)}` : null, v: Math.hypot(b.vx, b.vy).toFixed(1), vz: b.vz.toFixed(1), kind: b.kind };
  } else if (watch && (st.owner || st.pending)) {
    console.log(JSON.stringify(watch), '->', st.owner ? `owner ${st.owner.side}:${st.owner.num}@${st.owner.x.toFixed(1)},${st.owner.y.toFixed(1)} ball ${b.x.toFixed(1)},${b.y.toFixed(1)}` : `pending ${st.pending?.kind}`, 'kind', b.kind, 'dt', (st.t - +watch.t).toFixed(1));
    watch = null; shown++;
  }
}
