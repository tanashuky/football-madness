// Algi katmani: guclu vs zayif takimda ofsayt ve ara pas; doktrine aliskinlik yorgunlugu
import { simulate, createMatch, step, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = 40;
function pair(ggA: number, ggB: number) {
  let offA = 0, offB = 0, thrA = 0, thrB = 0, gA = 0, gB = 0;
  for (let i = 0; i < n; i++) {
    const st = simulate(makeTeam('A', 'A', ggA), makeTeam('B', 'B', ggB, {}, NAMES_B), 4000 + i);
    offA += st.stats[0].offsides; offB += st.stats[1].offsides; gA += st.stats[0].goals; gB += st.stats[1].goals;
  }
  return { offA: +(offA / n).toFixed(2), offB: +(offB / n).toFixed(2), gA: +(gA / n).toFixed(2), gB: +(gB / n).toFixed(2) };
}
console.log('GG 70 vs 50', JSON.stringify(pair(70, 50)));
console.log('GG 60 vs 60', JSON.stringify(pair(60, 60)));
// aliskinlik: A gegenpress oynar; ana taktigi dengeli (aliskin degil) vs gegenpress (aliskin); 85. dk ortalama kondisyon
for (const fam of [true, false]) {
  let k = 0;
  for (let i = 0; i < 10; i++) {
    const A = makeTeam('A', 'A', 60, { tactic: { press: 2, line: 2, style: 1, tempo: 2, doctrine: 'gegenpress' } as any, mainTactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: fam ? 'gegenpress' : 'balanced' } as any });
    const st: any = createMatch(A, makeTeam('B', 'B', 60, {}, NAMES_B), 4100 + i);
    while (!st.done && st.clock < 85 * 60) step(st);
    const live = st.players.filter((p: any) => p.side === 0 && !p.off);
    k += live.reduce((a: number, p: any) => a + p.k, 0) / live.length;
  }
  console.log(fam ? 'aliskin' : 'aliskin degil', 'kondisyon 85. dk', (k / 10).toFixed(1));
}
