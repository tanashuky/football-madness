import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, P } from './engine.ts';
P.dt = 0.05;
let viol = 0, checks = 0, gkKicks = 0, gkPressed = 0, koWaits = 0, koClockRun = 0;
const kinds: Record<string, number> = {};
for (let seed = 1; seed <= 12; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 6000 + seed);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, gkT = -1, gkSide = -1, gkDone = false;
  while (!st.done && n < 60000) {
    const p = controlledPlayer(st, 0);
    // kullanici: duran topta 3 s bekle sonra pas; acik oyunda bos
    let act: any;
    if (p && st.owner === p && st.restartTaker === p && st.t - st.restartUntil > 3) act = 'pass';
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, power: 0.3 });
    (globalThis as any).KAW = []; const clk0 = st.clock, waitingKo = st.restartTaker && st.owner === st.restartTaker && st.restartKind === 'kickoff' && st.t > st.restartUntil;
    step(st); n++;
    if (waitingKo) { koWaits++; if (st.clock - clk0 > st.dt * 1.01) koClockRun++; }
    // 9,15 m: kullanilmamis duran top (pending ya da top kullananda)
    const pd: any = st.pending ?? (st.restartTaker && st.owner === st.restartTaker ? st.spWait : null);
    const kind = pd?.kind ?? (st.restartTaker && st.owner === st.restartTaker ? st.takerKind : null);
    if (kind && kind !== 'goalkick' && kind !== 'kickoff' && (!st.pending || st.pending.at - st.t < 0.5)) {
      const side = pd ? pd.side : st.restartTaker!.side; const R = kind === 'throw' ? 2.5 : 9.15;
      for (const q of st.players) { if (q.off || q.side === side) continue; checks++; const dd = Math.hypot(q.x - st.ball.x, q.y - st.ball.y); if (dd < R - 0.3) { viol++; kinds[kind] = (kinds[kind] ?? 0) + 1; if (viol % 60 === 1) console.log(JSON.stringify((globalThis as any).KAW.slice(0,3)), 'V', kind, 'sinceRU', (st.t - st.restartUntil).toFixed(2), 'pending', !!st.pending, 'left', st.pending ? (st.pending.at - st.t).toFixed(2) : '-', q.side + ':' + q.num + q.pos, 'd', dd.toFixed(2), 'owner', st.owner?.num + '/' + st.owner?.side, 'ball', st.ball.x.toFixed(1), st.ball.y.toFixed(1), 'wall', (pd?.wallSet ?? []).includes(q)); } }
    }
    // aut kullanildi: 3 s icinde rakipten biri ceza sahasina giriyor mu
    if (st.ball.fromRestart === 'goalkick' && gkT < 0 && !gkDone) { gkT = st.t; gkSide = st.ball.kicker!.side; gkKicks++; }
    if (gkT >= 0) {
      const flip = st.half % 2 === 0;
      const inBox = st.players.some((q) => { if (q.off || q.side === gkSide) return false; const x = (gkSide === 0) !== flip ? q.x : 105 - q.x; const y = (gkSide === 0) !== flip ? q.y : 68 - q.y; return x < 16.5 && Math.abs(y - 34) < 20.16; });
      if (inBox) { gkPressed++; gkT = -1; } else if (st.t - gkT > 3 || st.t < gkT) gkT = -1;
    }
  }
}
console.log({ checks, violations915: viol, kinds, goalKicks: gkKicks, oppEnteredBoxWithin3s: gkPressed, kickoffWaitSteps: koWaits, clockRanDuringKickoffWait: koClockRun });
