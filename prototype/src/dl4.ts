import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
for (const L of [0, 1, 2]) {
  const st: any = createMatch(makeTeam('A','A',60,{ tactic: { press: 1, line: L as any, style: 1, tempo: 1, width: 1 } }), makeTeam('B','B',60,{},NAMES_B), 5);
  let n = 0, cb = 0, bx = 0, gkx = 0;
  while (!st.done) { step(st); if (st.owner && st.owner.side === 1) { n++; bx += st.ball.x; const c = st.players.filter((p: any) => p.side===0 && p.pos==='CB'); cb += (c[0].x + c[1].x)/2; gkx += st.players.find((p: any)=>p.side===0&&p.pos==='GK').x; } }
  console.log('hat', L, 'B topta: top x', (bx/n).toFixed(1), 'A stoper x', (cb/n).toFixed(1), 'A kaleci x', (gkx/n).toFixed(1));
}
