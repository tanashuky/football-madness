import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, DBG } from './engine.ts';
let shots = 0, goals = 0, saves = 0, misses = 0, blocks = 0;
for (let seed = 31; seed < 34; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed);
  setControl(st, 0, 'team', 2, 2);
  let n = 0, lastAct = -9, ev = 0;
  while (!st.done && n < 20000) {
    const p = controlledPlayer(st, 0);
    const inPoss = !!st.owner && st.owner.side === 0;
    let act: any, power: any, mx = 0, my = 0;
    if (p) {
      const gx = st.half % 2 === 0 ? 0 : 105;
      const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
      mx = (gx - p.x) / d; my = (34 - p.y) / d;
      if (inPoss && st.t - lastAct > 1.2) { act = d < 22 ? 'shoot' : 'pass'; power = 0.5; lastAct = st.t; }
    }
    setInput(st, 0, { mx, my, sprint: false, press: !inPoss, act, power });
    const before = st.owner;
    step(st); n++;
    if (act === 'shoot' && before && st.ball.kicker === before && st.ball.kind === 'shot') { shots++; console.log('shot from', before.x.toFixed(1), before.y.toFixed(1), 'v', Math.hypot(st.ball.vx, st.ball.vy).toFixed(1), 'vz', st.ball.vz.toFixed(1), 'OT', st.ball.shotOT, 'aim', st.ball.tx.toFixed(1), st.ball.ty.toFixed(1)); }
    for (; ev < st.events.length; ev++) { const e = st.events[ev]; if (e.side === 0 && ['goal', 'save', 'miss'].includes(e.type)) { if (e.type === 'goal') goals++; else if (e.type === 'save') saves++; else if (e.text === 'blok') blocks++; else misses++; } }
  }
}
console.log({ shots, goals, saves, misses, blocks, usut: DBG.usut });
