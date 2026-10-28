import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, P } from './engine.ts';
for (const [lab, ax, ay, curve] of [['saga nisan, parmak asagi', 1, 0, 1], ['sola nisan, parmak asagi', -1, 0, 1], ['sola nisan, parmak yukari', -1, 0, -1]] as [string, number, number, number][]) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1);
  setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
  for (let i = 0; i < 12; i++) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); }
  const c = st.owner!;
  for (const p of st.players) if (p !== c) { p.x = p.side === 0 ? 2 : 103; p.y = 2 + (p.idx % 11) * 6; }
  c.x = 52; c.y = 34; c.hx = ax; c.hy = ay;
  const dragy = curve; const perp = dragy * ax; const cv = Math.max(-1, Math.min(1, perp));
  setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act: 'pass', power: 1, ax, ay, curve: cv, tap: false });
  let n = 0; const path: string[] = [];
  while (n++ < 40) {
    step(st); setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false });
    if (st.ball.kind === 'pass') path.push(`${st.ball.x.toFixed(1)},${st.ball.y.toFixed(1)} v(${st.ball.vx.toFixed(1)},${st.ball.vy.toFixed(1)}) sw${st.ball.sw.toFixed(2)}`);
    if (st.owner || st.pending) break;
  }
  console.log(lab, 'curve', cv, '\n  ' + path.filter((_, i) => i % 4 === 0).join('\n  '));
}
