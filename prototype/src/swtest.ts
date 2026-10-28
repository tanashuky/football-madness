import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, P } from './engine.ts';
for (const [lab, ax, ay, curve] of [['saga nisan, parmak asagi (+)', 1, 0, 1], ['saga nisan, parmak yukari (-)', 1, 0, -1], ['sola nisan, parmak asagi', -1, 0, 1], ['asagi nisan, parmak saga', 0, 1, 1]] as [string, number, number, number][]) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1);
  setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
  for (let i = 0; i < 12; i++) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); }
  const c = st.owner!;
  // herkesi uzaga koy, tasiyici ortada
  for (const p of st.players) if (p !== c) { p.x = p.side === 0 ? 5 : 100; p.y = 5 + (p.idx % 11) * 5; }
  c.x = 52; c.y = 34; c.hx = ax; c.hy = ay;
  // sahte: parmak asagi/yukari cekildi => sayfa curve isaretini perp = dot(drag, (-ay, ax)) ile hesaplar
  const dragx = ay === 0 ? 0 : curve, dragy = ay === 0 ? curve : 0; // 'parmak asagi' = dragy +
  const perp = dragx * -ay + dragy * ax;
  const cv = Math.max(-1, Math.min(1, perp));
  setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act: 'pass', power: 1, ax, ay, curve: cv, tap: false });
  let x0 = -1, y0 = -1, n = 0;
  while (n++ < 60) {
    step(st); setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false });
    if (st.ball.kind === 'pass' && x0 < 0) { x0 = st.ball.x; y0 = st.ball.y; }
    if (st.owner || st.pending) break;
  }
  const dx = st.ball.x - x0, dy = st.ball.y - y0;
  const lat = dx * -ay + dy * ax; // nisana gore sag taraf (+p) bileseni
  console.log(lab.padEnd(34), 'curve', cv, '| top:', `dx ${dx.toFixed(1)} dy ${dy.toFixed(1)}`, '| nisana gore yan sapma (+ = surukleme yonu)', lat.toFixed(1));
}
