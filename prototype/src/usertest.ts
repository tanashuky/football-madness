import { createMatch, step, makeTeam, NAMES_B, P, setControl, setInput, controlledPlayer } from './engine.ts';
P.dt = 0.1;
for (let seed = 1; seed <= 3; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed);
  setControl(st, 0, 'team', 2, 2);
  let n = 0, passes = 0, shots = 0, tackles = 0, nan = 0, lastAct = 0;
  const rng = () => Math.random();
  while (!st.done && n < 200000) {
    const p = controlledPlayer(st, 0);
    const inPoss = !!st.owner && st.owner.side === 0;
    let act: any = undefined;
    let mx = 0, my = 0;
    if (p) {
      // hedef: rakip kalesi (taraf 0 icin saha sagi? motorun cercevesine bakmadan: topa/kaleye dogru)
      const gx = st.half % 2 === 0 ? 0 : 105, gy = 34;
      const tx = inPoss ? gx : st.ball.x, ty = inPoss ? gy : st.ball.y;
      const d = Math.hypot(tx - p.x, ty - p.y) || 1;
      mx = (tx - p.x) / d + (rng() - 0.5) * 0.4; my = (ty - p.y) / d + (rng() - 0.5) * 0.4;
      if (inPoss && st.t - lastAct > 1.5) { const dist = Math.hypot(gx - p.x, gy - p.y); act = dist < 25 ? 'shoot' : rng() < 0.3 ? 'through' : 'pass'; lastAct = st.t; if (act === 'shoot') shots++; else passes++; }
      if (!inPoss && st.owner && Math.hypot(st.owner.x - p.x, st.owner.y - p.y) < 2 && rng() < 0.3) { act = 'tackle'; tackles++; }
    }
    setInput(st, 0, { mx, my, sprint: rng() < 0.3, press: !inPoss, act, power: 0.5 + rng() * 0.5 });
    step(st); n++;
    for (const q of st.players) if (Number.isNaN(q.x) || Number.isNaN(q.y)) nan++;
  }
  console.log(JSON.stringify({ seed, done: st.done, steps: n, goals: st.stats.map((s) => s.goals), shots: st.stats.map((s) => s.shots), passes: st.stats.map((s) => s.passes), passAcc: st.stats.map((s) => +(s.passesOk / Math.max(1, s.passes)).toFixed(2)), fouls: st.stats.map((s) => s.fouls), duels: st.stats.map((s) => s.duels), userActs: { passes, shots, tackles }, nan }));
}
