// Kalibrasyon olcum turu: 200 mac dengeli vs dengeli (doktrinli), metrikler ve mesafe dagilimi; sonra tek parametre taramasi
import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 200);
function run(label: string, patch: Record<string, number>) {
  const saved: Record<string, number> = {}; for (const k in patch) { saved[k] = (P as any)[k]; (P as any)[k] = patch[k]; }
  for (const k in DBG) delete DBG[k];
  let g = 0, sh = 0, ot = 0, xg = 0, pas = 0, pok = 0, fo = 0, co = 0, off = 0, sp = 0, z0 = 0, z5 = 0, z7 = 0, dr = 0;
  for (let i = 0; i < n; i++) {
    const st = simulate(makeTeam('A', 'A', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: 'balanced' } as any }), makeTeam('B', 'B', 60, { tactic: { press: 1, line: 1, style: 1, tempo: 1, doctrine: 'balanced' } as any }, NAMES_B), 2000 + i);
    const [a, b] = st.stats; const tg = a.goals + b.goals; g += tg; if (tg === 0) z0++; if (tg >= 5) z5++; if (tg >= 7) z7++; if (a.goals === b.goals) dr++;
    sh += a.shots + b.shots; ot += a.onTarget + b.onTarget; xg += a.xg + b.xg; pas += a.passes + b.passes; pok += a.passesOk + b.passesOk; fo += a.fouls + b.fouls; co += a.corners + b.corners; off += a.offsides + b.offsides; sp += a.setPieceGoals + b.setPieceGoals;
  }
  const far = ((DBG['sut_m_22_27'] ?? 0) + (DBG['sut_m_27_32'] ?? 0) + (DBG['sut_m_32p'] ?? 0)), farG = ((DBG['gol_m_22_27'] ?? 0) + (DBG['gol_m_27_32'] ?? 0) + (DBG['gol_m_32p'] ?? 0));
  console.log(label, JSON.stringify({ goals: +(g / n).toFixed(2), draws: +(dr / n).toFixed(2), zero: +(z0 / n).toFixed(2), five: +(z5 / n).toFixed(2), seven: +(z7 / n).toFixed(3), shots: +(sh / n / 2).toFixed(1), onT: +(ot / n / 2).toFixed(1), xg: +(xg / n / 2).toFixed(2), passAcc: +(pok / pas).toFixed(3), fouls: +(fo / n / 2).toFixed(2), corners: +(co / n / 2).toFixed(2), offs: +(off / n / 2).toFixed(2), spShare: +(sp / g).toFixed(2), farShots: +(far / n).toFixed(2), farConv: +(farG / far).toFixed(3) }));
  for (const k in saved) (P as any)[k] = saved[k];
}
run('taban', {});
if (process.argv[3] === 'sweep') {
  run('xgScale 1.0', { xgScale: 1.0 });
  run('gkFarSave 0.12', { gkFarSave: 0.12 });
  run('gkSaveBase 0.88', { gkSaveBase: 0.88 });
  run('longShotBias 0.08', { longShotBias: 0.08 });
}
