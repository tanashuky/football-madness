import { simulate, makeTeam, NAMES_B, P, DBG } from './engine.ts';
P.dt = 0.1;
let g = 0, wood = 0, shots = 0, n = 60;
for (let seed = 1; seed <= n; seed++) { const st: any = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 9100 + seed); g += st.stats[0].goals + st.stats[1].goals; wood += (st.stats[0].woodwork || 0) + (st.stats[1].woodwork || 0); shots += st.stats[0].shots + st.stats[1].shots; }
console.log(JSON.stringify({ goals: +(g / n).toFixed(2), shots: +(shots / n).toFixed(1), woodworkPerMatch: +(wood / n).toFixed(2), dbg: Object.fromEntries(Object.entries(DBG).filter(([k]) => /direk|eski_aksiyon/.test(k))) }));
