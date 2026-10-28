import { createMatch, step, makeTeam, NAMES_B, ballMoving } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 77);
let loose = 0, maxLoose = 0, cur = 0, n = 0, owned = 0, dead = 0, moving = 0;
const kinds: Record<string, number> = {};
let lastKind = '';
while (!st.done && n < 100000) {
  step(st); n++;
  if (st.owner) { owned++; cur = 0; }
  else if (st.t < st.restartUntil || st.pending) { dead++; cur = 0; }
  else { loose++; cur += st.dt; maxLoose = Math.max(maxLoose, cur); if (ballMoving(st)) moving++; }
  if (st.ball.kind !== lastKind) { lastKind = st.ball.kind; kinds[lastKind] = (kinds[lastKind] ?? 0) + 1; }
}
console.log({ steps: n, ownedPct: +(owned / n).toFixed(2), deadPct: +(dead / n).toFixed(2), loosePct: +(loose / n).toFixed(2), movingPct: +(moving / n).toFixed(2), maxLooseSec: +maxLoose.toFixed(1), kinds, score: st.stats.map((s) => s.goals) });
console.log(st.events.filter((e) => ['goal', 'save', 'miss', 'corner', 'offside', 'penalty', 'freekick'].includes(e.type)).map((e) => `${Math.floor(e.t / 60)}' ${e.type} ${e.side} ${e.player ?? ''} ${e.text ?? ''} ${e.xg !== undefined ? e.xg.toFixed(2) : ''}`).join('\n'));
