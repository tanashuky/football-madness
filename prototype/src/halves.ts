import { simulate, makeTeam, NAMES_B } from './engine.ts';
let h1 = 0, h2 = 0; const n = 150;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 900+i); const half = st.events.find((e: any) => e.type === 'half')!.t; for (const e of st.events) if (e.type === 'goal') (e.t < half ? h1++ : h2++); }
console.log('1. yari', (h1/n).toFixed(2), '2. yari', (h2/n).toFixed(2));
