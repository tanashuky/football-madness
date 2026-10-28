import { simulate, makeTeam, NAMES_B, EDGE_RULES, EDGE_BASE, P } from './engine.ts';
// usage: node vs.ts N seed '{A opts}' '{B opts}' [mode: rules|base|none|all] ['{P overrides}']
const [n, seed] = process.argv.slice(2).map(Number);
const oa = JSON.parse(process.argv[4] ?? '{}'), ob = JSON.parse(process.argv[5] ?? '{}');
const mode = process.argv[6] ?? 'all';
if (process.argv[7]) Object.assign(P, JSON.parse(process.argv[7]));
if (mode === 'none' || mode === 'base') for (const r of EDGE_RULES) r.w = 0;   // base = only EDGE_BASE kept
if (mode === 'none' || mode === 'rules') for (const r of EDGE_BASE) r.w = 0;  // rules = only EDGE_RULES kept
let pts = 0, gf = 0, ga = 0, w = 0, d = 0;
for (let i = 0; i < n; i++) {
  const flip = i % 2 === 1;
  const A = makeTeam('A','A',60,oa), B = makeTeam('B','B',60,ob,NAMES_B);
  const st = flip ? simulate(B, A, seed+i) : simulate(A, B, seed+i);
  const x = st.stats[flip?1:0].goals, y = st.stats[flip?0:1].goals;
  gf += x; ga += y; pts += x>y?3:x===y?1:0; if (x>y) w++; else if (x===y) d++;
}
console.log(JSON.stringify({ mode, n, ppgA: +(pts/n).toFixed(3), winA: +(w/n).toFixed(3), draw: +(d/n).toFixed(3), gfA: +(gf/n).toFixed(3), gaA: +(ga/n).toFixed(3) }));
