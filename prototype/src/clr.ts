import { createMatch, step, makeTeam, NAMES_B, DBG } from './engine.ts';
let n = 0;
for (let seed = 1; seed <= 8; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 300 + seed);
  let prev = DBG.aceleli_uzaklastirma ?? 0, watch: any = null;
  while (!st.done) {
    step(st);
    const c = DBG.aceleli_uzaklastirma ?? 0;
    if (c !== prev) { prev = c; const b = st.ball; watch = { t: st.t, x: +b.x.toFixed(1), y: +b.y.toFixed(1), vx: +b.vx.toFixed(1), vy: +b.vy.toFixed(1), vz: +b.vz.toFixed(1), tx: +b.tx.toFixed(1), ty: +b.ty.toFixed(1), k: st.ball.kicker?.num, side: st.ball.kicker?.side }; continue; }
    if (watch && (st.owner || st.pending)) { console.log(JSON.stringify(watch), '->', st.owner ? `owner ${st.owner.side}:${st.owner.num}@${st.owner.x.toFixed(1)},${st.owner.y.toFixed(1)}` : `pending ${st.pending?.kind} ${st.deadReason}`, 'ball', st.ball.x.toFixed(1), st.ball.y.toFixed(1), 'dt', (st.t - watch.t).toFixed(1)); watch = null; if (++n > 12) break; }
  }
  if (n > 12) break;
}
