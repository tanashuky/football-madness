const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 900, height: 420 } });
  await pg.goto('file:///tmp/S/football-madness-prototip.html'); await pg.waitForTimeout(300);
  await pg.click('#guest'); await pg.click('#cOk');
  await pg.evaluate(() => go('mmOpp')); await pg.selectOption('#mMin', '6'); await pg.click('#mNext'); await pg.click('[data-go="room"]'); await pg.click('#rStart'); await pg.waitForTimeout(300);
  // her adimdan sonra hash kaydi: step'i sar
  await pg.evaluate(() => { window.__h = []; const orig = window.step; window.step = (s) => { orig(s); if (s === st) window.__h[s.stepN] = stateHash(s); }; });
  const keys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']; let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 30; i++) { if (i === 10) { await pg.click('#tacBtn'); await pg.click('[data-tab="gorev"]'); const f = await pg.$('#tacBox .du[data-k="runs"]'); await f.selectOption('2'); await pg.click('#tApplyDuty'); await pg.click('[data-tab="yaklasim"]'); await pg.click('#tMent [data-m="1"]'); await pg.click('[data-tab="talimat"]'); await pg.selectOption('#tacBox .tk[data-k="press"]', '2'); await pg.click('#tApply'); await pg.click('#tClose'); } if (i === 20) { await pg.evaluate(() => { setControl(st, 0, 'none'); let g = 0; while (!st.done && g++ < 3000) step(st); }); } const k = keys[Math.floor(rnd() * 4)]; await pg.keyboard.down(k); if (rnd() < 0.3) await pg.keyboard.down('KeyE'); await pg.waitForTimeout(300 + rnd() * 500); if (rnd() < 0.5) await pg.keyboard.press(['KeyS', 'KeyD', 'KeyW', 'KeyA'][Math.floor(rnd() * 4)]); await pg.keyboard.up(k); await pg.keyboard.up('KeyE'); }
  const r = await pg.evaluate(() => {
    const rep = replayOf(st); const hs = window.__h;
    let first = -1; const st2 = replayMatch(rep, (s, k) => { if (first < 0 && hs[k] !== undefined && stateHash(s) !== hs[k]) first = k; });
    const near = rep.cmds.filter((c) => Math.abs(c.k - first) <= 3);
    return { steps: rep.steps, first, cmds: rep.cmds.length, near, kinds: rep.cmds.reduce((a, c) => { a[c.op] = (a[c.op] || 0) + 1; return a; }, {}) };
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  await br.close();
})();
