import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 20);
const t0 = performance.now();
let g = 0, sh = 0, ot = 0, xg = 0, pas = 0, pok = 0, fo = 0, co = 0, off = 0, sp = 0, du = 0, ye = 0;
const gd: Record<number, number> = {};
for (let i = 0; i < n; i++) {
  const st = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 500 + i);
  const [a, b] = st.stats;
  const tg = a.goals + b.goals; g += tg; gd[tg] = (gd[tg] ?? 0) + 1;
  sh += a.shots + b.shots; ot += a.onTarget + b.onTarget; xg += a.xg + b.xg; pas += a.passes + b.passes; pok += a.passesOk + b.passesOk; fo += a.fouls + b.fouls; co += a.corners + b.corners; off += a.offsides + b.offsides; sp += a.setPieceGoals + b.setPieceGoals; du += a.duels + b.duels; ye += a.yellows + b.yellows;
}
const ms = (performance.now() - t0) / n;
console.log(JSON.stringify({ n, msPerMatch: +ms.toFixed(0), goals: +(g / n).toFixed(2), shots: +(sh / n / 2).toFixed(1), onTarget: +(ot / n / 2).toFixed(1), xg: +(xg / n / 2).toFixed(2), passes: +(pas / n / 2).toFixed(0), passAcc: +(pok / pas).toFixed(3), fouls: +(fo / n / 2).toFixed(2), corners: +(co / n / 2).toFixed(2), offsides: +(off / n / 2).toFixed(2), spShare: +(sp / Math.max(1, g)).toFixed(2), duels: +(du / n / 2).toFixed(1), yellows: +(ye / n / 2).toFixed(2), dist: gd }));
const keys = Object.keys(DBG).sort();
console.log(keys.map((k) => k + '=' + (typeof DBG[k] === 'number' ? +(DBG[k] / n).toFixed(2) : DBG[k])).join(' '));
