// Gorev kartlari: her gorev 20 macta dengeli rakibe karsi; etki yonu ve denge
import { simulate, makeTeam, NAMES_B, DBG } from './engine.ts';
const n = +(process.argv[2] ?? 20);
const cases: Record<string, any> = {
  none: {},
  'ST derin, W derin': { 9: { runs: 2 }, 7: { runs: 2 }, 11: { runs: 2 } },
  'CM ilk basan x2': { 8: { press: 2 }, 10: { press: 2 } },
  'herkes blokta': { 6: { press: 0 }, 8: { press: 0 }, 10: { press: 0 }, 7: { press: 0 }, 11: { press: 0 }, 9: { press: 0 } },
  'stoperler adam': { 4: { mark: 1 }, 5: { mark: 1 } },
  'bekler bindir': { 2: { overlap: 2 }, 3: { overlap: 2 } },
  'uzun pas (DM, CB)': { 6: { pass: 2 }, 4: { pass: 2 }, 5: { pass: 2 } },
  'kisa pas (hepsi)': Object.fromEntries([2,3,4,5,6,7,8,9,10,11].map((k) => [k, { pass: 0 }])),
};
const out: Record<string, any> = {};
for (const [name, duties] of Object.entries(cases)) {
  let gf = 0, ga = 0, sf = 0, sa = 0, pa = 0, pn = 0;
  for (let i = 0; i < n; i++) {
    const A = makeTeam('A', 'A', 60, { duties } as any);
    const B = makeTeam('B', 'B', 60, {}, NAMES_B);
    const st = simulate(i % 2 ? B : A, i % 2 ? A : B, 1200 + i);
    const [a, b] = st.stats; const S = i % 2 ? b : a, O = i % 2 ? a : b;
    gf += S.goals; ga += O.goals; sf += S.shots; sa += O.shots; pa += S.passesOk; pn += S.passes;
  }
  out[name] = { gf: +(gf / n).toFixed(2), ga: +(ga / n).toFixed(2), sf: +(sf / n).toFixed(1), sa: +(sa / n).toFixed(1), passAcc: +(pa / pn).toFixed(3) };
}
console.log(JSON.stringify(out, null, 1));
