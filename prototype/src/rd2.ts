import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 9001);
let lastMin = -1;
while (!st.done) {
  step(st);
  const m = Math.floor(st.clock / 60);
  if (m !== lastMin && m % 15 === 0) {
    lastMin = m;
    console.log(m, 'zones', JSON.stringify(st.zoneEntries), 'topXg', st.playerXg.map((px) => Object.entries(px).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => k + ':' + v.toFixed(2)).join(' ')), 'reads', JSON.stringify(st.reads), 'mark', st.minuteMark);
  }
}
console.log('traits A', st.players.filter((p) => p.side === 0).map((p) => p.num + ':' + p.pos + ':' + p.traits.join('/')).join(' '));
console.log(st.events.filter((e) => e.type === 'adjust'));
