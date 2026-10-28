import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, DBG, P } from './engine.ts';
// sentetik: kullanici oyuncusu topla ceza sahasi onunde, rakip savunma normal; sut cek, sonucu say
const res: Record<string, Record<string, number>> = {};
for (const [lab, dist] of [['11m', 11], ['18m', 18], ['25m', 25]] as [string, number][]) {
  const r = { shots: 0, goal: 0, save: 0, miss: 0, blok: 0, ot: 0 } as Record<string, number>;
  for (let seed = 1; seed <= 150; seed++) {
    const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 1000 + seed);
    setControl(st, 0, 'team', 2, 2);
    // kickoff: oyuncu 9 topla; onu ileri tasiyalim
    for (let i = 0; i < 12; i++) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); }
    const c = st.owner!;
    if (!c || c.side !== 0) continue;
    c.x = 105 - dist; c.y = 34 + (seed % 7 - 3) * 2; c.hx = 1; c.hy = 0;
    const ev0 = st.events.length;
    setInput(st, 0, { mx: 1, my: (seed % 2 ? 0.15 : -0.15), sprint: false, press: false, act: 'shoot', power: 0.5 });
    step(st);
    if (st.ball.kind !== 'shot') continue;
    r.shots++; if (st.ball.shotOT) r.ot++;
    for (let i = 0; i < 40 && !st.owner && !st.pending; i++) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); }
    for (let k = ev0; k < st.events.length; k++) { const e = st.events[k]; if (e.type === 'goal') r.goal++; else if (e.type === 'save') r.save++; else if (e.type === 'miss') r[e.text === 'blok' ? 'blok' : 'miss']++; }
  }
  res[lab] = r;
}
console.log(JSON.stringify(res));
