const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 900, height: 420 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto('file:///tmp/S/football-madness-prototip.html'); await pg.waitForTimeout(300);
  await pg.click('#guest'); await pg.click('#cOk');
  await pg.evaluate(() => go('mmOpp')); await pg.selectOption('#mMin', '6'); await pg.click('#mNext'); await pg.click('[data-go="room"]'); await pg.click('#rStart'); await pg.waitForTimeout(800);
  // 25 s gercek oyun: uzun basili tuslar, vuruslar, sprint, panelden gorev + taktik + kaydirici
  const keys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']; let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 40; i++) { const k = keys[Math.floor(rnd() * 4)]; await pg.keyboard.down(k); if (rnd() < 0.3) await pg.keyboard.down('KeyE'); await pg.waitForTimeout(300 + rnd() * 500); if (rnd() < 0.5) await pg.keyboard.press(['KeyS', 'KeyD', 'KeyW', 'KeyA'][Math.floor(rnd() * 4)]); await pg.keyboard.up(k); await pg.keyboard.up('KeyE'); if (i === 15) { await pg.click('#tacBtn'); await pg.click('[data-tab="gorev"]'); const f = await pg.$('#tacBox .du[data-k="runs"]'); await f.selectOption('2'); await pg.click('#tApplyDuty'); await pg.click('[data-tab="yaklasim"]'); await pg.click('#tMent [data-m="1"]'); await pg.click('#tClose'); } }
  await pg.evaluate(() => { setControl(st, 0, 'none'); let g = 0; while (!st.done && g++ < 60000) step(st); setPlaying(false); PLAY.endAt = performance.now(); });
  await pg.waitForTimeout(6000);
  console.log(await pg.evaluate(() => document.getElementById('rVerify')?.textContent), await pg.evaluate(() => JSON.parse(localStorage.getItem('fm.lastReplay')).cmds.length), errs);
  await br.close();
})();
