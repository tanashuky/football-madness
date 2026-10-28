import { simulate, makeTeam, NAMES_B } from './engine.ts';
const c = [[0,0],[0,0]]; const n = 600;
for (let i = 0; i < n; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 900+i); const half = st.events.find((e: any) => e.type === 'half')!.t; for (const e of st.events) if (e.type === 'goal') c[e.t < half ? 0 : 1][e.side]++; }
console.log('1. yari taraf0/taraf1', c[0], '2. yari', c[1]);
