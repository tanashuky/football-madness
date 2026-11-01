import { createMatch, step, makeTeam, NAMES_B, P } from './engine.ts';
P.dt = 0.1;
const a = makeTeam('A', 'A', 60, { formation: '4-3-3' }); a.tactic = { ...a.tactic, rotations: [[7, 9, 11]] };
const st: any = createMatch(a, makeTeam('B', 'B', 60, { formation: '4-3-3' }, NAMES_B), 5);
let steps = 0, possA = 0, ph6 = 0, oppHalf = 0, pend = 0, shifted = 0;
const r = st.rot[0][0];
while (!st.done) { step(st); steps++; const inPoss = st.owner ? st.owner.side === 0 : st.lastPossSide === 0; if (inPoss) possA++; if (inPoss && st.phase[0] > 0.6) ph6++; const bxf = st.half % 2 === 0 ? st.ball.x : 105 - st.ball.x; if (inPoss && st.phase[0] > 0.6 && bxf > 55) oppHalf++; if (r.pending !== null) pend++; if (r.shift !== 0) shifted++; }
console.log({ steps, possA, ph6, oppHalf, pend, shifted, rotPlayers: r.players.map((p: any) => p.num), lastT: r.lastT });
