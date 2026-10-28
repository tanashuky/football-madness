import { createMatch, step, makeTeam, NAMES_B, P, DBG } from './engine.ts';
for (const dt of [0.1, 0.05]) {
  P.dt = dt;
  const rows: any[] = [];
  for (let seed = 0; seed < 12; seed++) {
    const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 8000 + seed);
    let cur: any = null;
    while (!st.done) {
      const before = (DBG.kaleci_gecti ?? 0) + (DBG.kurtaris_tuttu ?? 0) + (DBG.kurtaris_celdi ?? 0);
      step(st);
      const b = st.ball;
      if (!st.owner && b.kind === 'shot' && b.kicker && b.shotOT) {
        const gk = st.players.find((p) => p.side !== b.kicker!.side && p.pos === 'GK' && !p.off)!;
        const d = Math.hypot(gk.x - b.x, gk.y - b.y);
        if (!cur || cur.kickT !== b.kickT) { cur = { kickT: b.kickT, minD: d, attempt: false, gkTried: false, steps: 0 }; rows.push(cur); }
        cur.minD = Math.min(cur.minD, d); cur.steps++;
        const after = (DBG.kaleci_gecti ?? 0) + (DBG.kurtaris_tuttu ?? 0) + (DBG.kurtaris_celdi ?? 0);
        if (after !== before) cur.attempt = true;
        if (b.gkTried) cur.gkTried = true;
      } else if (cur) {
        const after = (DBG.kaleci_gecti ?? 0) + (DBG.kurtaris_tuttu ?? 0) + (DBG.kurtaris_celdi ?? 0);
        if (after !== before) cur.attempt = true;
        cur = null;
      }
    }
  }
  const n = rows.length, att = rows.filter((r) => r.attempt).length;
  const near = rows.filter((r) => r.minD < 2.4).length, nearAtt = rows.filter((r) => r.minD < 2.4 && r.attempt).length;
  console.log(JSON.stringify({ dt, onTargetShots: n, attempts: att, within2_4: near, within2_4_attempt: nearAtt, avgMinD: +(rows.reduce((a, r) => a + r.minD, 0) / n).toFixed(2), avgSteps: +(rows.reduce((a, r) => a + r.steps, 0) / n).toFixed(1) }));
}
