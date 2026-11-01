import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
P.dt = 0.1;
let goals = 0, shots = 0, steps = 0, near10 = 0, near15 = 0, throws = 0, crosses = 0, passes = 0, wideW = 0, wCount = 0, fbWide = 0, fbCount = 0, passToWide = 0;
const yHist = new Array(7).fill(0);
for (let seed = 1; seed <= 20; seed++) {
  const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 6000 + seed);
  let lastKickT = -1; let lastPend: any = null;
  while (!st.done) {
    step(st); steps++; if (st.pending && st.pending !== lastPend) { lastPend = st.pending; if (st.pending.kind === 'throw') throws++; }
    const dy = Math.min(st.ball.y, 68 - st.ball.y);
    if (dy < 10) near10++; if (dy < 15) near15++;
    yHist[Math.min(6, Math.floor(st.ball.y / 10))]++;
    if (st.ball.kickT === st.t && st.ball.kickT !== lastKickT) { lastKickT = st.t; if (st.ball.kind === 'pass' || st.ball.kind === 'through' || st.ball.kind === 'long') { passes++; const ty = st.ball.ty; if (Math.min(ty, 68 - ty) < 12) passToWide++; } if (st.ball.kind === 'cross') crosses++; }
    const inPoss = st.owner ? st.owner.side : -1;
    if (inPoss >= 0) for (const p of st.players) { if (p.off || p.side !== inPoss) continue; if (p.pos === 'W') { wideW += Math.abs(p.y - 34); wCount++; } if (p.pos === 'FB') { fbWide += Math.abs(p.y - 34); fbCount++; } }
  }
  goals += st.stats[0].goals + st.stats[1].goals; shots += st.stats[0].shots + st.stats[1].shots;
}
console.log(JSON.stringify({ near10: +(near10 / steps).toFixed(3), near15: +(near15 / steps).toFixed(3), yHist: yHist.map((v) => +(v / steps).toFixed(2)), passes: +(passes / 20).toFixed(1), passToWide: +(passToWide / Math.max(1, passes)).toFixed(2), crosses: +(crosses / 20).toFixed(1), wAvgDy: +(wideW / wCount).toFixed(1), fbAvgDy: +(fbWide / fbCount).toFixed(1), throws: throws / 20, goals: goals / 20, shots: shots / 20 }));
