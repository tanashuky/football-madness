import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 30);
const keys = ['sut_isabetli', 'sut_isabetsiz', 'kaleci_gecti', 'kurtaris_tuttu', 'kurtaris_celdi', 'blok', 'gol_open', 'gol_header', 'gol_penalty_sp', 'kafa_sut', 'orta_kafa', 'ara_alindi', 'ara_pas', 'birebir', 'birebir_kayip', 'mudahale_deneme', 'kontrol_hatasi', 'sert_top_sekti', 'ilk_vurus_uzaklastirma', 'karar_shot_hucum', 'arapas_sut_1v1'];
for (const dt of [0.1, 0.05]) {
  P.dt = dt;
  for (const k of Object.keys(DBG)) delete DBG[k];
  let g = 0, sh = 0;
  for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 8000 + i); g += st.stats[0].goals + st.stats[1].goals; sh += st.stats[0].shots + st.stats[1].shots; }
  console.log(JSON.stringify({ dt, goals: +(g / n).toFixed(2), shots: +(sh / n).toFixed(1), ...Object.fromEntries(keys.map((k) => [k, +((DBG[k] ?? 0) / n).toFixed(2)])) }));
}
