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

function init() {
  load();
  applySettings();
  setLang(store.db.settings.lang);
  installErrorBox(() => { if (sim.isOn()) sim.exit(); render(); });
  bindNav($('aBody')!); bindNav($('aFoot')!);
  $('aBack')!.onclick = () => back();
  $('aHome')!.onclick = () => { if (store.db.account) home(); else go('login', {}, false); };
  $('aSettings')!.onclick = () => { if (R.screen !== 'settings') go('settings'); };
  $('aProfile')!.onclick = () => { if (R.screen !== 'profile') go('profile'); };
  // cevrimdisi gostergesi
  const net = () => document.body.classList.toggle('offline', !navigator.onLine);
  addEventListener('online', net); addEventListener('offline', net); net();
  CLOUD.onChange = () => { if (R.screen === 'login' || R.screen === 'settings') render(); if (R.screen === 'login' && CLOUD.user && store.db.account) go('home', {}, false); };
  CLOUD.init();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw', e));
  go(store.db.account ? 'home' : 'login', {}, false);
  // sayaclar: Kariyer ekrani acikken 20 sn'de bir yenilenir (bir alana yazilirken ya da pencere acikken degil)
  setInterval(() => { if (R.screen !== 'career' || sim.isOn() || !$('modal')!.hidden) return; const ae = document.activeElement; if (ae && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT')) return; const sc = $('aBody')!.scrollTop; render(); $('aBody')!.scrollTop = sc; }, 20000);
  (window as any).FM = { store, go, sim, CLOUD };
}
init();
