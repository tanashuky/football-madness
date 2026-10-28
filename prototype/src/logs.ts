import { simulate, makeTeam, NAMES_B } from './engine.ts';
const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 3);
const c: any = {}; for (const l of st.log) c[l.k] = (c[l.k] ?? 0) + 1; console.log(st.log.length, JSON.stringify(c)); console.log(JSON.stringify(st.log.slice(0, 8)));
