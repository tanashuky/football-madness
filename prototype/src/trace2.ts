(globalThis as any).TRACE = [];
const { simulate, makeTeam, NAMES_B } = await import('./engine.ts');
simulate(makeTeam('A','A',60,{ tactic: { press: 1, line: 2, style: 1, tempo: 1, width: 1 } }), makeTeam('B','B',60,{},NAMES_B), 7);
const T = (globalThis as any).TRACE; console.log(T.length); for (let i = 0; i < T.length; i += Math.ceil(T.length / 15)) console.log(JSON.stringify(T[i]));
