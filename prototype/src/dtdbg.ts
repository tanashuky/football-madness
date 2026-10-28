import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 60);
const dt = +(process.argv[3] ?? 0.5);
if (process.argv[4]) Object.assign(P, JSON.parse(process.argv[4]));
P.dt = dt;
for (const k of Object.keys(DBG)) delete DBG[k];
let g = 0, sh = 0, fo = 0, pas = 0, pok = 0, du = 0, off = 0, co = 0;
for (let i = 0; i < n; i++) {
  const flip = i % 2 === 1;
  const A = makeTeam('A', 'A', 60), B = makeTeam('B', 'B', 60, {}, NAMES_B);
  const st = flip ? simulate(B, A, 7000 + i) : simulate(A, B, 7000 + i);
  const a = st.stats[0], b = st.stats[1];
  g += a.goals + b.goals; sh += a.shots + b.shots; fo += a.fouls + b.fouls; pas += a.passes + b.passes; pok += a.passesOk + b.passesOk; du += a.duels + b.duels; off += a.offsides + b.offsides; co += a.corners + b.corners;
}
const keys = ['reach_step','carrier_step','cs_drb','cs_hold','cs_dec','att_hold_drb','att_hold_hold','att_hold_dec','att_d_0','att_d_1','att_d_2','att_d_3','att_d_4','att_d_5','karar_pass', 'karar_dribble', 'karar_through', 'karar_shot', 'birebir', 'birebir_kayip', 'mudahale_deneme', 'kayip_mudahale', 'kaleci_aldi', 'kaleci_gecildi', 'arapas_sut'];
const out: any = { dt, goals: +(g / n).toFixed(2), shots: +(sh / n / 2).toFixed(1), fouls: +(fo / n / 2).toFixed(2), passes: +(pas / n / 2).toFixed(0), passAcc: +(pok / pas).toFixed(3), duels: +(du / n / 2).toFixed(1), offs: +(off / n / 2).toFixed(2), corners: +(co / n / 2).toFixed(2) };
for (const k of keys) out[k] = +((DBG[k] ?? 0) / n).toFixed(1);
console.log(JSON.stringify(out));
