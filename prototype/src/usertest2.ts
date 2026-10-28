import { createMatch, step, makeTeam, NAMES_B, P, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
P.dt = 0.1;
// 1) girdisiz kullanici: duran toplarda 5 s, acik oyunda 8 s sonra yapay zeka oynamali; mac bitmeli
{
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 11);
  setControl(st, 0, 'team', 2, 2);
  let n = 0, maxHold = 0, holdNow = 0;
  while (!st.done && n < 200000) {
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false });
    const info = userCarrierInfo(st, 0);
    step(st); n++;
    if (st.owner && st.owner === controlledPlayer(st, 0)) { holdNow += st.dt; maxHold = Math.max(maxHold, holdNow); } else holdNow = 0;
  }
  console.log(JSON.stringify({ test: 'idle', done: st.done, goals: st.stats.map((s) => s.goals), passes: st.stats.map((s) => s.passes), maxHoldSec: +maxHold.toFixed(1) }));
}
// 2) yonlu pas: her 1,2 s joystick yonunde pas; ofsayt sayisi, pas isabeti
{
  let off = 0, passes = 0, ok = 0, goals = [0, 0];
  for (let seed = 21; seed < 24; seed++) {
    const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed);
    setControl(st, 0, 'team', 2, 2);
    let n = 0, lastAct = -9;
    while (!st.done && n < 200000) {
      const p = controlledPlayer(st, 0);
      const inPoss = !!st.owner && st.owner.side === 0;
      let act: any, power: any;
      let mx = 0, my = 0;
      if (p) {
        const gx = st.half % 2 === 0 ? 0 : 105;
        const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
        mx = (gx - p.x) / d + (Math.random() - 0.5) * 0.6; my = (34 - p.y) / d + (Math.random() - 0.5) * 0.6;
        if (inPoss && st.t - lastAct > 1.2) { act = d < 22 ? 'shoot' : 'pass'; power = Math.random(); lastAct = st.t; }
        if (!inPoss && Math.random() < 0.05) act = 'switch';
        if (!inPoss && st.owner && Math.hypot(st.owner.x - p.x, st.owner.y - p.y) < 2.2 && Math.random() < 0.4) act = 'tackle';
      }
      setInput(st, 0, { mx, my, sprint: Math.random() < 0.5, press: !inPoss, act, power });
      step(st); n++;
    }
    off += st.stats[0].offsides; passes += st.stats[0].passes; ok += st.stats[0].passesOk; goals[0] += st.stats[0].goals; goals[1] += st.stats[1].goals;
  }
  console.log(JSON.stringify({ dbg: { player: DBG.upass_player, space: DBG.upass_space, cut: DBG.upass_space_cut } })); console.log(JSON.stringify({ test: 'dirpass', matches: 3, userOffsides: off, userPasses: passes, userPassAcc: +(ok / Math.max(1, passes)).toFixed(2), goals }));
}
