import { simulate, createMatch, makeTeam, setTactic, NAMES_B } from './engine.ts';
const mk = (s: number) => (s === 0 ? makeTeam('A', 'A', 60) : makeTeam('B', 'B', 60, {}, NAMES_B));
let ties = 0, et = 0, so = 0, etGoals = 0, soRounds: number[] = [], n = 0, subsEt = 0;
for (let seed = 1; seed <= 150; seed++) {
  const st = simulate(mk(0), mk(1), seed, { knockout: true });
  n++;
  const hasExtra = st.events.some((e) => e.type === 'extra');
  if (hasExtra) {
    et++;
    const tx = st.events.find((e) => e.type === 'extra')!.t; const g90 = st.events.filter((e) => e.type === 'goal' && e.t <= tx);
    const ga = g90.filter((e) => e.side === 0).length, gb = g90.filter((e) => e.side === 1).length;
    if (ga !== gb) console.log('BUG: extra time but not tied at 90', seed, ga, gb);
    etGoals += st.events.filter((e) => e.type === 'goal' && e.t > tx).length;
    if (st.shootout) { so++; soRounds.push(st.events.filter((e) => e.type === 'shootout').length); if (st.shootout[0] === st.shootout[1]) console.log('BUG: shootout tied', seed, st.shootout); }
    else if (st.stats[0].goals === st.stats[1].goals) console.log('BUG: tied after ET without shootout', seed);
    subsEt += st.stats[0].subs + st.stats[1].subs;
    if (st.half !== 4) console.log('BUG: half', st.half, seed);
    if (!st.done) console.log('BUG: not done', seed);
  } else if (st.stats[0].goals === st.stats[1].goals) { console.log('BUG: tied at 90 without extra', seed); ties++; }
}
console.log(JSON.stringify({ n, et, so, etGoalsPerEt: +(etGoals / Math.max(et, 1)).toFixed(2), soRoundsAvg: +(soRounds.reduce((a, b) => a + b, 0) / Math.max(so, 1)).toFixed(1), soMax: Math.max(...soRounds, 0), soMin: Math.min(...soRounds, 99), subsPerEtMatch: +(subsEt / Math.max(et, 1)).toFixed(2) }));
// non-knockout: ties stay ties, no extra events
let bad = 0;
for (let seed = 1; seed <= 30; seed++) { const st = simulate(mk(0), mk(1), seed); if (st.events.some((e) => e.type === 'extra' || e.type === 'shootout') || st.half !== 2) bad++; }
console.log('normal matches with extra:', bad);
// determinism with knockout
const s1 = simulate(mk(0), mk(1), 7, { knockout: true }), s2 = simulate(mk(0), mk(1), 7, { knockout: true });
console.log('deterministic:', JSON.stringify(s1.events) === JSON.stringify(s2.events), 'ET match:', s1.events.some((e) => e.type === 'extra'));
// setTactic API + adapt penalty + max 3
const st = createMatch(mk(0), mk(1), 3);
let ok = 0; for (let i = 0; i < 5; i++) ok += setTactic(st, 0, { press: 2 }, i === 1 ? '5-3-2' : undefined) ? 1 : 0;
console.log('setTactic accepted:', ok, 'formation:', st.teams[0].formation, 'adaptUntil:', st.adaptUntil[0], 'events:', st.events.filter((e) => e.type === 'tactic').length);
