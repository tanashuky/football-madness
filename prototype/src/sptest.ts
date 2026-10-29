import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, userCarrierInfo, DBG } from './engine.ts';
// 1) girdisiz kullanici: duran toplar 8 s sonra yapay zeka; mac bitmeli, takilma olmamali
{
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 31);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, maxWait = 0, w = 0;
  while (!st.done && n < 120000) { setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false }); step(st); n++; const i = userCarrierInfo(st, 0); if (i && i.kind) { w += st.dt; maxWait = Math.max(maxWait, w); } else w = 0; }
  console.log(JSON.stringify({ idle: { done: st.done, steps: n, maxSetPieceWait: +maxWait.toFixed(1), dbg: Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kullanici_duran') || k.startsWith('duran_top'))) } }));
}
// 2) aktif kullanici: duran topta 1 s sonra Orta (korner/serbest) ya da Sut (penalti/direkt) - mac bitmeli
{
  for (const k of Object.keys(DBG)) delete DBG[k];
  let sp = 0, goals = 0;
  for (let seed = 40; seed < 46; seed++) {
    const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), seed);
    setControl(st, 0, 'team', 0, 1);
    let n = 0, lastAct = -9;
    while (!st.done && n < 120000) {
      const p = controlledPlayer(st, 0); const i = userCarrierInfo(st, 0);
      let act: any, extra: any = {}, mx = 0, my = 0;
      if (p) { const gx = st.half % 2 === 0 ? 0 : 105; const d = Math.hypot(gx - p.x, 34 - p.y) || 1; mx = (gx - p.x) / d; my = (34 - p.y) / d;
        if (i && i.kind && i.left < 7 && st.clock - lastAct > 6) { act = i.kind === 'penalty' || i.kind === 'fkshot' ? 'shoot' : i.kind === 'corner' ? 'cross' : 'pass'; extra = { power: 0.6, ax: mx, ay: my, curve: 0.3, tap: false }; lastAct = st.clock; sp++; }
        else if (st.owner === p && st.clock - lastAct > 7) { act = d < 22 ? 'shoot' : 'pass'; extra = { power: 0.5 }; lastAct = st.clock; } }
      setInput(st, 0, { mx, my, sprint: false, press: true, act, ...extra });
      step(st); n++;
    }
    goals += st.stats[0].goals;
  }
  console.log(JSON.stringify({ active: { setPieceActions: sp, userGoals: goals, dbg: Object.fromEntries(Object.entries(DBG).filter(([k]) => k.startsWith('kullanici') || k.startsWith('duran_top'))) } }));
}
