import { simulate, makeTeam, NAMES_B, P } from './engine.ts';
const n = +(process.argv[2] ?? 150);
for (const dt of [0.5, 0.1]) {
  P.dt = dt;
  let g = 0, sh = 0, fo = 0, pas = 0, pok = 0, sp = 0, co = 0, w0 = 0, w1 = 0, du = 0;
  for (let i = 0; i < n; i++) {
    const flip = i % 2 === 1;
    const A = makeTeam('A', 'A', 60), B = makeTeam('B', 'B', 60, {}, NAMES_B);
    const st = flip ? simulate(B, A, 7000 + i) : simulate(A, B, 7000 + i);
    const a = st.stats[flip ? 1 : 0], b = st.stats[flip ? 0 : 1];
    g += a.goals + b.goals; sh += a.shots + b.shots; fo += a.fouls + b.fouls; pas += a.passes + b.passes; pok += a.passesOk + b.passesOk; sp += a.setPieceGoals + b.setPieceGoals; co += a.corners + b.corners; du += a.duels + b.duels;
    if (a.goals > b.goals) w0++; else if (b.goals > a.goals) w1++;
  }
  console.log(JSON.stringify({ dt, goals: +(g / n).toFixed(2), shots: +(sh / n / 2).toFixed(1), fouls: +(fo / n / 2).toFixed(2), passAcc: +(pok / pas).toFixed(3), passes: +(pas / n / 2).toFixed(0), spShare: +(sp / g).toFixed(2), corners: +(co / n / 2).toFixed(2), duels: +(du / n / 2).toFixed(1), w0: w0 / n, w1: w1 / n }));
}
