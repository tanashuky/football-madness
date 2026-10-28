import { simulate, makeTeam, NAMES_B } from './engine.ts';

const a = makeTeam('Kartal SK', 'KSK', 60);
const b = makeTeam('Liman FK', 'LFK', 60, {}, NAMES_B, '#2c5fc8');
const t0 = Date.now();
const st = simulate(a, b, Number(process.argv[2] ?? 1));
const ms = Date.now() - t0;
const [sa, sb] = st.stats;
const pt = sa.possTicks + sb.possTicks;
console.log(`Skor ${sa.goals}-${sb.goals}  sure ${ms}ms  saat ${(st.clock / 60).toFixed(1)}dk`);
for (const [n, s] of [['A', sa], ['B', sb]] as const) {
  console.log(n, `sut ${s.shots} isabet ${s.onTarget} xG ${s.xg.toFixed(2)} pas ${s.passesOk}/${s.passes} topa sahip %${((100 * s.possTicks) / pt).toFixed(0)} faul ${s.fouls} sari ${s.yellows} kirmizi ${s.reds} korner ${s.corners}`);
}
console.log(st.events.filter((e) => e.type === 'goal').map((e) => `${(e.t / 60).toFixed(0)}' ${e.side === 0 ? 'A' : 'B'} #${e.player} xG ${e.xg?.toFixed(2)}`).join('\n'));
