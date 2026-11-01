import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
P.dt = 0.1;
let kicks = 0, oppTouch = 0, near = 0, dists: number[] = [], minOpp: number[] = [], lowZ = 0;
const byKind: Record<string, number> = {};
for (let seed = 1; seed <= 30; seed++) {
  const st: any = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 500 + seed);
  let track: any = null; let prevFeet = false; let prevOwner: any = null;
  while (!st.done) {
    const feetBefore = st.gkFeet, ownerBefore = st.owner;
    step(st);
    const b = st.ball;
    if (b.kicker && b.kicker.pos === 'GK' && b.kickT === st.t && ownerBefore === b.kicker && !feetBefore && !b.noTouch) {
      kicks++; byKind[b.kind] = (byKind[b.kind] || 0) + 1;
      // en yakin rakip mesafesi
      let md = 99; for (const q of st.players) if (!q.off && q.side !== b.kicker.side) md = Math.min(md, Math.hypot(q.x - b.kicker.x, q.y - b.kicker.y));
      minOpp.push(md); if (md < 6) near++;
      track = { x: b.x, y: b.y, side: b.kicker.side, t: st.t, k: b.kicker };
    }
    if (track && b.touch && b.touch !== track.k && b.kickT !== st.t) {
      if (b.touch.side !== track.side) { const d = Math.hypot(b.touch.x - track.x, b.touch.y - track.y); if (d < 20) { oppTouch++; dists.push(+d.toFixed(1)); } }
      track = null;
    }
    if (track && st.t - track.t > 4) track = null;
  }
}
minOpp.sort((a, b) => a - b); dists.sort((a, b) => a - b);
console.log(JSON.stringify({ kicks, byKind, oppWithin6m_atKick: near, oppTouchWithin20m: oppTouch, medianMinOpp: minOpp[minOpp.length >> 1], p10MinOpp: minOpp[Math.floor(minOpp.length * 0.1)], touchDists: dists.slice(0, 30) }));
