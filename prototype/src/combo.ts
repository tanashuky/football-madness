// kombinasyon testi: rastgele tam ayar setleri rastgele rakiplere karsi; ardindan en guclu kombinasyonu tirmanarak ara (somuru testi)
import { simulate, makeTeam, NAMES_B, P, FORMATION_LIST, mulberry32, EDGE_RULES, EDGE_BASE } from './engine.ts';
const K = Number(process.argv[2] ?? 30), n = Number(process.argv[3] ?? 60), seed0 = Number(process.argv[4] ?? 1);
if (process.argv[5] === 'noedge') { for (const r of EDGE_RULES) r.w = 0; for (const r of EDGE_BASE) r.w = 0; }
const DIMS: Record<string, any[]> = { formation: FORMATION_LIST, press: [0, 1, 2], line: [0, 1, 2], style: [0, 1, 2], tempo: [0, 1, 2], width: [0, 1, 2], compact: [0, 1, 2], trap: [0, 1], fb: [0, 1, 2], cm: [0, 1, 2], wing: [0, 1], runs: [0, 1, 2], spBox: [0, 1, 2] };
const rng = mulberry32(seed0);
const rnd = () => { const t: any = {}; for (const k in DIMS) t[k] = DIMS[k][Math.floor(rng() * DIMS[k].length)]; return t; };
const mk = (t: any, nm: string, names?: any) => { const { formation, ...tac } = t; return makeTeam(nm, nm, 60, { formation, tactic: tac }, names); };
let seed = 70000;
function evalCombo(c: any, m: number): number {
  let pts = 0;
  for (let i = 0; i < m; i++) {
    const o = rnd(); const flip = i % 2 === 1; seed++;
    const st = flip ? simulate(mk(o, 'B', NAMES_B), mk(c, 'A'), seed) : simulate(mk(c, 'A'), mk(o, 'B', NAMES_B), seed);
    const x = st.stats[flip ? 1 : 0].goals, y = st.stats[flip ? 0 : 1].goals; pts += x > y ? 3 : x === y ? 1 : 0;
  }
  return pts / m;
}
const res: { c: any; ppg: number }[] = [];
for (let k = 0; k < K; k++) { const c = rnd(); res.push({ c, ppg: evalCombo(c, n) }); }
res.sort((a, b) => b.ppg - a.ppg);
const ppgs = res.map((r) => r.ppg); const mean = ppgs.reduce((a, b) => a + b, 0) / K; const sd = Math.sqrt(ppgs.reduce((a, b) => a + (b - mean) ** 2, 0) / K);
console.log(`rastgele ${K} kombinasyon x ${n} mac: ortalama ${mean.toFixed(2)} sd ${sd.toFixed(2)} min ${ppgs[K - 1].toFixed(2)} max ${ppgs[0].toFixed(2)}`);
console.log('en iyi 3:', res.slice(0, 3).map((r) => JSON.stringify(r.c) + ' ' + r.ppg.toFixed(2)).join('\n        '));
console.log('en kotu 2:', res.slice(-2).map((r) => JSON.stringify(r.c) + ' ' + r.ppg.toFixed(2)).join('\n        '));
// tirmanma
let best = { ...res[0].c }, bestP = evalCombo(best, 120);
for (let round = 0; round < 2; round++) {
  for (const d in DIMS) for (const v of DIMS[d]) {
    if (best[d] === v) continue;
    const c = { ...best, [d]: v }; const p = evalCombo(c, 120);
    if (p > bestP + 0.04) { best = c; bestP = p; }
  }
}
console.log('tirmanma sonucu:', JSON.stringify(best), 'tahmini', bestP.toFixed(2), 'dogrulama (300 mac):', evalCombo(best, 300).toFixed(2));
