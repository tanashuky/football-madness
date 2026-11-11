// Ekran yonlendirme: ad + baglam (ctx) yigini. go() iter, back() doner; tarayici/telefon geri tusu popstate ile yigina baglidir.
// Her ekran bir fonksiyondur: ctx -> View. render() kabugu (baslik, govde, sekmeler, alt cubuk) doldurur ve after() ile olaylari baglar.
import { Raw, $, html } from './html.js';
import { onLang } from './i18n.js';

export interface Tab { id: string; label: string; on?: boolean }
export interface View {
  title?: string | Raw; back?: boolean; html: Raw | string; tabs?: Tab[]; onTab?: (id: string) => void; foot?: Raw | string;
  after?: (root: HTMLElement) => void; cls?: string; // body sinifi (ornegin 'match' tam ekran)
  bare?: boolean; // ust cubuk yok (giris, mac)
}
export type Screen = (ctx: any) => View;
const SCREENS: Record<string, Screen> = {};
export const R = { screen: '', ctx: {} as any, stack: [] as { s: string; c: any }[], depth: 0, onLeave: null as null | (() => boolean | void) };
export function register(name: string, s: Screen) { SCREENS[name] = s; }
export function go(name: string, ctx: any = {}, push = true) {
  if (!SCREENS[name]) { console.warn('ekran yok', name); return; }
  if (R.onLeave) { const stay = R.onLeave(); if (stay === true) return; R.onLeave = null; }
  if (push && R.screen && R.screen !== name) { R.stack.push({ s: R.screen, c: R.ctx }); try { history.pushState({ d: ++R.depth }, ''); } catch (e) {} }
  R.screen = name; R.ctx = ctx;
  render();
}
export function back() { if (R.stack.length) history.back(); else go('home', {}, false); }
export function home() { R.stack.length = 0; go('home', {}, false); }
// tarayici geri: yigin bos degilse bir onceki ekran
window.addEventListener('popstate', () => {
  if (R.onLeave) { const stay = R.onLeave(); if (stay === true) { try { history.pushState({ d: ++R.depth }, ''); } catch (e) {} return; } R.onLeave = null; }
  const prev = R.stack.pop(); if (prev) { R.screen = prev.s; R.ctx = prev.c; render(); }
});
onLang(() => render());

export function render() {
  const sc = SCREENS[R.screen]; if (!sc) return;
  const v = sc(R.ctx);
  const app = $('app')!;
  document.body.className = document.body.className.replace(/\bscr-\S+/g, '').trim();
  document.body.classList.add('scr-' + R.screen);
  document.body.classList.toggle('bare', !!v.bare);
  if (v.cls) document.body.classList.add(v.cls);
  const title = $('aTitle')!; if (v.title instanceof Raw) title.innerHTML = v.title.s; else title.textContent = v.title || '';
  const bk = $('aBack') as HTMLButtonElement; bk.hidden = v.back === false || R.stack.length === 0;
  const body = $('aBody')!; body.innerHTML = String(v.html); body.scrollTop = 0;
  const foot = $('aFoot')!; if (v.foot) { foot.hidden = false; foot.innerHTML = String(v.foot); } else { foot.hidden = true; foot.innerHTML = ''; }
  const tabs = $('aTabs')!;
  if (v.tabs && v.tabs.length) {
    tabs.hidden = false;
    tabs.innerHTML = String(html`${v.tabs.map((tb) => html`<button data-tab="${tb.id}" aria-selected="${tb.on ? 'true' : 'false'}">${tb.label}</button>`)}`);
    tabs.onclick = (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('button'); if (b && v.onTab) v.onTab(b.dataset.tab!); };
  } else { tabs.hidden = true; tabs.innerHTML = ''; }
  app.classList.toggle('hasTabs', !!(v.tabs && v.tabs.length));
  if (v.after) v.after(body);
}
// data-go="ekran" data-ctx='{"a":1}' ile basit gecisler (govde ve alt cubuk)
export function bindNav(root: HTMLElement) {
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-go]'); if (!b || !b.dataset.go) return;
    e.preventDefault();
    let ctx = {}; try { ctx = b.dataset.ctx ? JSON.parse(b.dataset.ctx) : {}; } catch (err) { ctx = {}; }
    go(b.dataset.go, ctx, b.dataset.push !== '0');
  });
}
