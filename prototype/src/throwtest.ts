import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, P } from './engine.ts';
P.dt = 0.05; P.playSpeed = 1.3;
let dbl = 0, n = 0; const samples: any[] = [];
for (let seed = 1; seed <= 30; seed++) {
  const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 100 + seed);
  setControl(st, 0, 'team', 0, 1);
  for (let i = 0; i < 400; i++) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); }
  // tac kur: kullanici takimi icin
  const flip = st.half % 2 === 0; const taker = st.players.find((p: any) => p.side === 0 && !p.off && p.pos === 'FB');
  st.owner = null; st.ball.x = flip ? 60 : 45; st.ball.y = 0.5; st.ball.vx = st.ball.vy = st.ball.vz = 0; st.ball.z = 0;
  st.pending = { kind: 'throw', side: 0, at: st.t + 2, taker, spotX: 45, spotY: 0 }; st.restartUntil = st.t + 2; st.holdUntil = st.t + 2;
  let thrown = -1, sent = false; const kicks: any[] = [];
  for (let i = 0; i < 300; i++) {
    const cp = controlledPlayer(st, 0); const own = cp && st.owner === cp && st.restartTaker === cp;
    let act: any; if (own && !sent) { sent = true; act = 'pass'; }
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, power: 0.9, ax: flip ? -1 : 1, ay: 0.4 });
    const kt = st.ball.kickT; step(st);
    if (st.ball.kickT === st.t && st.ball.kicker) { kicks.push({ t: +(st.t - (thrown < 0 ? st.t : thrown)).toFixed(2), who: st.ball.kicker.num + (st.ball.kicker.side === 0 ? 'A' : 'B'), kind: st.ball.kind, ctl: controlledPlayer(st, 0)?.num, pre: !!st.control[0].pre, fromRestart: st.ball.fromRestart }); if (thrown < 0 && st.ball.fromRestart === 'throw') thrown = st.t; }
    if (thrown >= 0 && st.t - thrown > 4) break;
  }
  n++;
  const after = kicks.filter((k) => k.who.endsWith('A')).slice(0, 3);
  if (after.length >= 2 && after[1].t < 1.0) { dbl++; if (samples.length < 4) samples.push(after); }
}
console.log(JSON.stringify({ n, quickSecondKick: dbl, samples }));
