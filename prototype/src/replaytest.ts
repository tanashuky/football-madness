import { createMatch, step, makeTeam, NAMES_B, P, setControl, setInput, setTactic, setMentality, userSub, replayOf, verifyReplay, replayMatch, stateHash, setDuty } from './engine.ts';
P.dt = 0.05; P.clockRate = 90 / (6 * 1.3); P.playSpeed = 1.3;
let seed = 42; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const a = makeTeam('A', 'A', 60, { formation: '4-3-3' }); a.tactic = { ...a.tactic, rotations: [[7, 9, 11]] };
const st = createMatch(a, makeTeam('B', 'B', 60, {}, NAMES_B), 777);
setControl(st, 0, 'team', 0, 1, { autoSwitch: true });
let n = 0;
while (!st.done && n < 200000) {
  n++;
  if (n % 7 === 0) { const ang = rnd() * Math.PI * 2; setInput(st, 0, { mx: Math.cos(ang), my: Math.sin(ang), sprint: rnd() < 0.3, press: rnd() < 0.2 }); }
  if (n % 53 === 0) setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act: (['pass', 'shoot', 'through', 'cross'] as any)[Math.floor(rnd() * 4)], power: rnd(), ax: 1, ay: rnd() - 0.5, curve: 0 });
  if (n === 2000) setTactic(st, 0, { press: 2, line: 2 }, '4-4-2');
  if (n === 5000) setMentality(st, 0, 1);
  if (n === 6000) setDuty(st, 0, 9, { runs: 2 });
  if (n === 8000) userSub(st, 0, 7, 14);
  step(st);
}
const r = replayOf(st)!;
const json = JSON.stringify(r);
const r2 = JSON.parse(json);
const v = verifyReplay(r2);
console.log(JSON.stringify({ steps: r.steps, cmds: r.cmds.length, bytes: json.length, hash: r.hash, score: r.score, verify: v }));
// kismi tekrar: 1000 adim sonra hash, dogrudan kosmakla ayni mi
const st3 = replayMatch(r2, undefined, 1000);
console.log('partial', stateHash(st3), st3.stepN);
