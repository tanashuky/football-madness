// Hata kaydi: yakalanmayan hatalar ekranda kutuyla gosterilir ve localStorage'a yazilir (Ayarlar > Tani'dan okunur, kopyalanir).
import { $ } from './html.js';
import { APP_VERSION } from './store.js';

export const ERR_KEY = 'fm.lastError';
const ERR = { n: 0, last: 0 };
export function reportError(where: string, e: any) {
  ERR.n++;
  const msg = (e && e.message ? e.message : String(e)) + '\n' + String(e && e.stack ? e.stack : '').split('\n').slice(0, 6).join('\n');
  const txt = `[${where}] ${msg}`;
  console.error(txt);
  try { localStorage.setItem(ERR_KEY, JSON.stringify({ t: Date.now(), where, msg, build: APP_VERSION, ua: navigator.userAgent })); } catch (e2) {}
  const now = performance.now();
  if (now - ERR.last < 2000 && ERR.n > 1) return;
  ERR.last = now;
  const box = $('errBox')!;
  box.querySelector('pre')!.textContent = txt + (ERR.n > 1 ? `\n(${ERR.n}.)` : '');
  box.hidden = false;
}
export function lastError(): { t: number; where: string; msg: string; build: string } | null { try { return JSON.parse(localStorage.getItem(ERR_KEY) || 'null'); } catch (e) { return null; } }
export function clearError() { try { localStorage.removeItem(ERR_KEY); } catch (e) {} }
export function installErrorBox(onExit: () => void) {
  const box = $('errBox')!;
  box.querySelector<HTMLButtonElement>('#errHide')!.onclick = () => { box.hidden = true; };
  box.querySelector<HTMLButtonElement>('#errCopy')!.onclick = () => { try { navigator.clipboard.writeText(box.querySelector('pre')!.textContent || ''); } catch (e) {} };
  box.querySelector<HTMLButtonElement>('#errExit')!.onclick = () => { box.hidden = true; onExit(); };
  addEventListener('error', (ev) => { if (ev.error) reportError('window', ev.error); });
  addEventListener('unhandledrejection', (ev) => reportError('promise', ev.reason));
}
