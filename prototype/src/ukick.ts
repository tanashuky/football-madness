import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer } from './engine.ts';
const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1);
setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
for (let i = 0; i < 20; i++) { setInput(st, 0, { mx: 1, my: 0, sprint: true, press: false }); step(st); }
console.log('t', st.t.toFixed(1), 'owner', st.owner?.num, st.owner?.side, 'ctl', controlledPlayer(st, 0)?.num);
setInput(st, 0, { mx: 1, my: 0, sprint: true, press: false, act: 'pass', power: 0.8, ax: 0.8, ay: -0.6, curve: -0.45, tap: false });
for (let i = 0; i < 8; i++) { step(st); const c = st.control[0]!; console.log('t', st.t.toFixed(1), 'act', c.input.act, 'kick', c.kick ? c.kick.at.toFixed(2) : null, 'owner', st.owner?.num, 'kind', st.ball.kind, 'passes', st.stats[0].passes); setInput(st, 0, { mx: 1, my: 0, sprint: true, press: false }); }
