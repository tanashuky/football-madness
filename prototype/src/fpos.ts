import { createMatch, step, makeTeam, NAMES_B } from './engine.ts';
const f = process.argv[2];
const st: any = createMatch(makeTeam('A','A',60,{ formation: f as any }), makeTeam('B','B',60,{},NAMES_B), 11);
const acc: any = {}; let n = 0;
while (!st.done && st.half === 1) { step(st); if (st.owner && st.owner.side === 1 && st.ball.x < 35) { n++; for (const p of st.players.filter((q: any) => q.side === 0)) { const k = p.pos + p.idx; acc[k] = acc[k] ?? [0, 0]; acc[k][0] += p.x; acc[k][1] += p.y; } acc.ball = acc.ball ?? [0,0]; acc.ball[0] += st.ball.x; acc.ball[1] += st.ball.y; } }
console.log(f, n, Object.entries(acc).map(([k, v]: any) => `${k}:${(v[0]/n).toFixed(0)},${(v[1]/n).toFixed(0)}`).join(' '));
