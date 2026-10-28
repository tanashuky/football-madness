(globalThis as any).NOCH = process.argv[2] === '1';
const { simulate, makeTeam, NAMES_B } = await import('./engine.ts');
let w0 = 0, w1 = 0, g0 = 0, g1 = 0;
for (let i = 0; i < 300; i++) { const st = simulate(makeTeam('A','A',60), makeTeam('B','B',60,{},NAMES_B), 555 + i); const [a, b] = st.stats; g0 += a.goals; g1 += b.goals; if (a.goals > b.goals) w0++; else if (b.goals > a.goals) w1++; }
console.log('NOCH', process.argv[2], w0, w1, g0, g1);
