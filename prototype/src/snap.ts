import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
import { writeFileSync } from 'node:fs';
Object.assign(P, { shotW: 1.1 });
const a = makeTeam('A', 'A', 60);
const b = makeTeam('B', 'B', 60, {}, NAMES_B);
const st = createMatch(a, b, 7);
const snaps: any[] = [];
let lastShots = 0;
while (!st.done && snaps.length < 6) {
  const before = st.stats[0].shots + st.stats[1].shots;
  const pos = st.players.map((p) => ({ s: p.side, n: p.num, x: p.x, y: p.y, pos: p.pos }));
  const ball = { ...st.ball };
  const owner = st.owner ? { s: st.owner.side, n: st.owner.num } : null;
  step(st);
  const after = st.stats[0].shots + st.stats[1].shots;
  if (after > before && st.clock > 120) snaps.push({ t: st.clock, pos, ball, owner, ev: st.events[st.events.length - 1] });
}
writeFileSync('/tmp/claude-0/-home-claude/fa71d8fe-175a-546e-bc50-0bf7274b1f5d/scratchpad/snaps.json', JSON.stringify(snaps));
console.log(snaps.length);
