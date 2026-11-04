const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 900, height: 420 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto('file:///tmp/S/football-madness-prototip.html'); await pg.waitForTimeout(300);
  await pg.click('#guest'); await pg.click('#cOk');
  await pg.evaluate(() => go('mmOpp')); await pg.selectOption('#mMin', '6'); await pg.click('#mNext'); await pg.click('[data-go="room"]'); await pg.click('#rStart'); await pg.waitForTimeout(800);
  await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(1500); await pg.keyboard.press('KeyS'); await pg.keyboard.up('ArrowRight'); await pg.waitForTimeout(500);
  await pg.click('#exitPlay'); await pg.waitForTimeout(5000);
  console.log(await pg.evaluate(() => APP.screen), await pg.evaluate(() => document.getElementById('rVerify')?.textContent), errs);
  await br.close();
})();
