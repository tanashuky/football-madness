import { createMatch, step, makeTeam, NAMES_B, DBG } from './engine.ts';
let n = 0;
for (let seed = 1; seed <= 6; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 300 + seed);
  let prevCeldi = DBG.kurtaris_celdi ?? 0, watch: any = null;
  while (!st.done) {
    step(st);
    const c = DBG.kurtaris_celdi ?? 0;
    if (c !== prevCeldi) { prevCeldi = c; const b = st.ball; watch = { t: st.t, x: +b.x.toFixed(1), y: +b.y.toFixed(1), vx: +b.vx.toFixed(1), vy: +b.vy.toFixed(1), vz: +b.vz.toFixed(1), gk: st.ball.kicker?.num, gkx: +st.ball.kicker!.x.toFixed(1) }; continue; }
    if (watch && (st.owner || st.pending)) { console.log(JSON.stringify(watch), '->', st.owner ? `owner ${st.owner.side}:${st.owner.num}@${st.owner.x.toFixed(1)},${st.owner.y.toFixed(1)}` : `pending ${st.pending?.kind}`, 'ball', st.ball.x.toFixed(1), st.ball.y.toFixed(1), 'dt', (st.t - watch.t).toFixed(1)); watch = null; if (++n > 14) break; }
  }
  if (n > 14) break;
}
