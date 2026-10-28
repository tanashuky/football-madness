import { simulate, makeTeam, NAMES_B } from './engine.ts';
let adj = 0, left = 0, right = 0, line = 0, tac = 0, n = 200;
for (let s = 1; s <= n; s++) {
  const st = simulate(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 9000 + s);
  for (const e of st.events) { if (e.type === 'adjust') { adj++; if (e.text === 'left') left++; else if (e.text === 'right') right++; else line++; } if (e.type === 'tactic') tac++; }
}
console.log(JSON.stringify({ n, adjustPerMatch: adj / n, left: left / n, right: right / n, line: line / n, tacticPerMatch: tac / n }));
