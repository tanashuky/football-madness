import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, DBG, P } from './engine.ts';
let tried = 0, ok = 0, lat = 0;
for (let seed = 1; seed <= 12; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 400 + seed);
  setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
  let n = 0, phase = 0, recvT = 0;
  while (!st.done && n < 4000 && phase < 3) {
    const p = controlledPlayer(st, 0);
    const inPoss = !!st.owner && st.owner.side === 0;
    let act: any, extra: any = {};
    if (phase === 0 && inPoss && st.owner === p && st.t > 3) {
      // en yakin takim arkadasina pas (yardim tam, yon arkadasa)
      const mates = st.players.filter((q) => q.side === 0 && q !== p && !q.off && q.pos !== 'GK');
      const far = mates.filter((q) => { const d = Math.hypot(q.x - p!.x, q.y - p!.y); return d > 8 && d < 30; }); if (!far.length) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); n++; continue; } const gx = st.half % 2 === 0 ? 0 : 105; const m = far.reduce((b, q) => (Math.abs(gx - q.x) < Math.abs(gx - b.x) ? q : b));
      const d = Math.hypot(m.x - p.x, m.y - p.y) || 1;
      act = 'pass'; extra = { power: Math.min(1, d / 30), ax: (m.x - p.x) / d, ay: (m.y - p.y) / d, curve: 0, tap: false };
      phase = 1;
    } else if (phase === 1 && !st.owner && st.ball.kind === 'pass' && st.ball.kicker?.side === 0) {
      // top yolda: gelisine sut niyeti
      act = 'shoot'; extra = { power: 0.6, ax: st.half % 2 === 0 ? -1 : 1, ay: 0, curve: 0, tap: false };
      phase = 2; tried++;
    } else if (phase === 2 && st.owner && st.owner.side === 0 && recvT === 0) {
      recvT = st.t;
    }
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, ...extra });
    step(st); n++;
    if (phase === 2 && recvT > 0) { if (st.ball.kind !== 'none' && !st.owner && st.ball.kicker?.side === 0 && st.ball.kickT >= recvT - 0.01) { ok++; lat += st.t - recvT; phase = 3; } else if (st.t - recvT > 0.5) phase = 3; }
  }
}
console.log({ tried, firstTimeKicks: ok, avgDelayAfterTouch: +(lat / Math.max(1, ok)).toFixed(2), dbg: { sut: DBG.usut_gelisine, pas: DBG.upass_player_gelisine, bos: DBG.upass_space_gelisine, kafa: DBG.kafa_gelisine, ilk: DBG.pre_ilk_dokunus, dustu_sure: DBG.pre_dustu_sure, dustu_rakip: DBG.pre_dustu_rakip } });
