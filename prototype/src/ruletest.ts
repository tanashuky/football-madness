// Kosullu kurallar: tetiklenme sayilari, sureli eylemin geri donusu, denge (4 kural vs kuralsiz)
import { simulate, makeTeam, NAMES_B, RULE_TEMPLATES, botRules, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 30);
let gf = 0, ga = 0, fires = 0, w = 0, l = 0;
for (let i = 0; i < n; i++) {
  const A = makeTeam('A', 'A', 60, { rules: RULE_TEMPLATES.slice(0, 4) } as any);
  const B = makeTeam('B', 'B', 60, {}, NAMES_B);
  const st: any = simulate(i % 2 ? B : A, i % 2 ? A : B, 1500 + i);
  const me = i % 2 ? 1 : 0; const [a, b] = st.stats; const S = me ? b : a, O = me ? a : b;
  gf += S.goals; ga += O.goals; if (S.goals > O.goals) w++; else if (S.goals < O.goals) l++;
  fires += st.events.filter((e: any) => e.type === 'rule').length;
  // sureli eylem geri dondu mu: mac sonunda aktif kalan yok, press 1'e dondu
  if (st.ruleSt[me].active.length) console.log('AKTIF KALDI', st.ruleSt[me].active);
}
console.log(JSON.stringify({ n, gf: +(gf / n).toFixed(2), ga: +(ga / n).toFixed(2), win: +(w / n).toFixed(2), loss: +(l / n).toFixed(2), firesPerMatch: +(fires / n).toFixed(1) }));
console.log(JSON.stringify(Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kural_')).map(([k, v]) => [k, +(v / n).toFixed(1)]))));
// tum sablonlar tek tek: hata yok mu
for (const r of RULE_TEMPLATES) { const st: any = simulate(makeTeam('A', 'A', 60, { rules: [r] } as any), makeTeam('B', 'B', 60, {}, NAMES_B), 77); }
console.log('templates ok', RULE_TEMPLATES.length, 'botRules(3)', botRules(3).map((r) => r.id));
