import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
for (const L of [0, 1]) {
  const st: any = createMatch(makeTeam('A','A',60,{ tactic: { press: 1, line: L as any, style: 1, tempo: 1, width: 1 } }), makeTeam('B','B',60,{},NAMES_B), 5);
  let n = 0, bx = 0, stx = 0, maxb = 0, hist = [0,0,0,0,0,0,0];
  while (!st.done) { step(st); if (st.owner && st.owner.side === 0) { n++; bx += st.ball.x; maxb = Math.max(maxb, st.ball.x); hist[Math.floor(st.ball.x/15)]++; const s = st.players.filter((p: any) => p.side===0 && p.pos==='ST')[0]; stx += s.x; } }
  console.log('line', L, 'top A da ort x', (bx/n).toFixed(1), 'max', maxb.toFixed(1), 'ST x', (stx/n).toFixed(1), 'hist', hist.join(','), 'side0 attacks +x?');
}
