import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 21);
setControl(st, 0, 'team', 2, 2);
let n = 0, lastAct = -9, tracing = 0, traced = 0;
while (!st.done && n < 6000 && traced < 3) {
  const p = controlledPlayer(st, 0);
  const inPoss = !!st.owner && st.owner.side === 0;
  let act: any, power: any, mx = 0, my = 0;
  if (p) {
    const gx = st.half % 2 === 0 ? 0 : 105;
    const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
    mx = (gx - p.x) / d; my = (34 - p.y) / d;
    if (inPoss && st.t - lastAct > 1.2 && st.t > 20) { act = 'pass'; power = 0.3; lastAct = st.t; }
  }
  setInput(st, 0, { mx, my, sprint: false, press: !inPoss, act, power });
  const before = st.owner;
  step(st); n++;
  const b = st.ball;
  if (act === 'pass' && before && !st.owner && b.kicker === before) { tracing = 25; console.log('--- kick by', before.num, 'intended', b.intended?.num, 'aim', b.tx.toFixed(1), b.ty.toFixed(1)); }
  if (tracing > 0) {
    tracing--;
    const m = b.intended; const cp = controlledPlayer(st, 0);
    const ch = (st as any)._chase as Map<any, any>;
    const c = m ? ch.get(m) : null;
    console.log(st.t.toFixed(1), 'ball', b.x.toFixed(1), b.y.toFixed(1), 'v', Math.hypot(b.vx, b.vy).toFixed(1), 'int', m ? `${m.num}@${m.x.toFixed(1)},${m.y.toFixed(1)}` : '-', 'ctl', cp?.num, 'chase', c ? `${c.x.toFixed(1)},${c.y.toFixed(1)} t${c.t.toFixed(1)}` : '-', 'owner', st.owner ? `${st.owner.side}:${st.owner.num}` : '-');
    if (st.owner) { tracing = 0; traced++; }
  }
}
