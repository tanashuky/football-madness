// Giris noktasi: kayit, dil, hata kutusu, bulut, ekranlar, service worker.
import { $ } from './core/html.js';
import { setLang } from './core/i18n.js';
import { back, bindNav, go, R, render, home } from './core/router.js';
import { load, store } from './core/store.js';
import { CLOUD } from './core/cloud.js';
import { installErrorBox } from './core/errors.js';
import * as sim from './match/sim.js';
import './screens/auth.js';
import './screens/home.js';
import './screens/career.js';
import './screens/team.js';
import './screens/match.js';
import { applySettings } from './screens/home.js';
import { enter, needAuth, openNewPassword } from './screens/auth.js';

function init() {
  load();
  applySettings();
  setLang(store.db.settings.lang);
  installErrorBox(() => { if (sim.isOn()) sim.exit(); render(); });
  bindNav($('aBody')!); bindNav($('aFoot')!);
  $('aBack')!.onclick = () => back();
  R.guard = () => { const m = $('modal')!; if (!m.hidden) { const b = (m.querySelector('#mNo') || m.querySelector('#mOk')) as HTMLElement | null; if (b) b.click(); return true; } if (sim.isOn()) { sim.requestExit(); return true; } return false; };
  $('aHome')!.onclick = () => { if (store.db.account) home(); else go('login', {}, false); };
  $('aSettings')!.onclick = () => { if (R.screen !== 'settings') go('settings'); };
  $('aProfile')!.onclick = () => { if (R.screen !== 'profile') go('profile'); };
  // cevrimdisi gostergesi
  const net = () => document.body.classList.toggle('offline', !navigator.onLine);
  addEventListener('online', net); addEventListener('offline', net); net();
  CLOUD.onChange = () => {
    if (CLOUD.recovery && CLOUD.user) { CLOUD.recovery = false; openNewPassword(); } // sifre sifirlama baglantisiyla gelindi
    if (R.screen === 'login') { if (CLOUD.user && CLOUD.state === 'ready') { const m = $('modal')!; if (!m.hidden && m.querySelector('.auth') && !m.querySelector('#aPw2')) { m.hidden = true; m.innerHTML = ''; } enter(); } else render(); }
    else if (R.screen === 'settings') render();
    else if (CLOUD.state === 'ready' && !CLOUD.user && needAuth() && !sim.isOn()) go('login', {}); // oturum dusmus: giris ekranina
  };
  CLOUD.init();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw', e));
  // acilis: bu cihazda kayit ve oturum varsa dogrudan oyuna (cevrimdisi da calisir); yoksa acilis/karsilama ekrani
  go(store.db.account && (CLOUD.hasStoredSession() || !CLOUD.cfg()) ? 'home' : 'login', {}, false);
  // sayaclar: Kariyer ekrani acikken 20 sn'de bir yenilenir (bir alana yazilirken ya da pencere acikken degil)
  setInterval(() => { if (R.screen !== 'career' || sim.isOn() || !$('modal')!.hidden) return; const ae = document.activeElement; if (ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT')) return; const sc = $('aBody')!.scrollTop; render(); $('aBody')!.scrollTop = sc; }, 20000);
  (window as any).FM = { store, go, sim, CLOUD, R };
}
init();
