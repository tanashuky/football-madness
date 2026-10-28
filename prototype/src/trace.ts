import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
const st: any = createMatch(makeTeam('A','A',60,{ tactic: { press: 1, line: 2, style: 1, tempo: 1, width: 1 } }), makeTeam('B','B',60,{},NAMES_B), 7);
let shown = 0, watch: any = null, until = 0;
while (!st.done && shown < 6) {
  const prevOwner = st.owner;
  step(st);
  if (!watch && st.owner && st.owner.side === 1 && st.owner.thruT !== undefined && st.t - st.owner.thruT < 0.6) { watch = st.owner; until = st.t + 6; shown++; console.log('--- ara pas alindi, t', st.t.toFixed(1), 'half', st.half); }
  if (watch) {
    const xf = st.half === 1 ? 105 - watch.x : watch.x; // B ilk yari sola hucum
    const nn = st.players.filter((p: any) => p.side === 0 && !p.off).map((p: any) => [Math.hypot(p.x - watch.x, p.y - watch.y), p.pos]).sort((a: any, b: any) => a[0] - b[0])[0]; const near = nn[0].toFixed(1) + nn[1];
    console.log('  t', st.t.toFixed(1), 'sahip', st.owner ? (st.owner.side + ':' + st.owner.num) : (st.flight ? 'ucus:' + st.flight.kind : '-'), 'alici xf', xf.toFixed(1), 'en yakin rakip', near, 'flight', st.flight ? (st.flight.thru ? 'T' : 'n') : '');
    if (st.t > until || (st.owner && st.owner !== watch)) watch = null;
  }
}
