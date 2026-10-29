import { createMatch, step, makeTeam, NAMES_B, setControl, setInput, controlledPlayer, DBG } from './engine.ts';
// kullanici aut kullaniyor ve kendi kalesine nisan aliyor
let tries = 0, goalsAgainst = 0;
for (let seed = 1; seed <= 30 && tries < 15; seed++) {
  const st = createMatch(makeTeam('A', 'A', 60), makeTeam('B', 'B', 60, {}, NAMES_B), 2000 + seed);
  setControl(st, 0, 'team', 0, 1);
  let n = 0, armed = false, g0 = 0;
  while (!st.done && n < 20000) {
    const p = controlledPlayer(st, 0);
    let act: any, extra: any = {};
    if (!armed && st.owner && st.owner === p && p.pos === 'GK' && st.restartKind === 'goalkick' && st.t > st.restartUntil) {
      const gx = st.half % 2 === 0 ? 105 : 0; const d = Math.hypot(gx - p.x, 34 - p.y) || 1;
      act = 'shoot'; extra = { power: 1, ax: (gx - p.x) / d, ay: (34 - p.y) / d, curve: 0, tap: false }; armed = true; tries++; g0 = st.stats[1].goals;
    }
    setInput(st, 0, { mx: 0, my: 0, sprint: false, press: false, act, ...extra });
    const k0 = st.ball.kickT;
    step(st); n++;
    if (armed && st.ball.kickT !== k0 && st.ball.kicker === p && tries <= 3) console.log('kick', st.ball.kind, 'v', st.ball.vx.toFixed(1), st.ball.vy.toFixed(1), 'vz', st.ball.vz.toFixed(1), 'at', st.ball.x.toFixed(1), st.ball.y.toFixed(1), 'half', st.half, 'fr', st.ball.fromRestart);
    if (armed && (st.pending || st.owner) && st.t > 0) { if (st.stats[1].goals > g0) goalsAgainst++; if (st.pending || (st.owner && st.owner !== p)) break; }
  }
}
console.log({ ownGoalKickAttempts: tries, ownGoals: goalsAgainst, corner: DBG.duran_top_kendi_kale_korner ?? 0 });
