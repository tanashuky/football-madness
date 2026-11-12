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
// Gezinme modeli: gecmis yigini yok. Her ekranin mantiksal bir "ust" ekrani vardir (parentOf); Geri her zaman oraya gider.
// Boylece ayni iki ekran arasinda gidip geldikce yigin buyumez, oynanmis macin odasina geri donulmez, dongu olusmaz.
// Yan ekranlar (Ayarlar, Profil, Oduller, Gorevler, Premium) nereden acildiysa oraya doner (R.ret).
export const R = { screen: '', ctx: {} as any, ret: null as null | { s: string; c: any }, guard: null as null | (() => boolean), key: '' };
const SIDE = new Set(['settings', 'profile', 'rewards', 'missions', 'premium']);
export function register(name: string, s: Screen) { SCREENS[name] = s; }
export function parentOf(s: string = R.screen, c: any = R.ctx): { s: string; c: any } | null {
  if (s === 'login' || s === 'setup' || s === 'home' || !s) return null;
  if (SIDE.has(s)) return R.ret || { s: 'home', c: {} };
  if (s === 'squad' || s === 'tactics') return c && c.from ? { s: 'room', c: c.from } : { s: 'career', c: { tab: 'team' } };
  if (s === 'player') return { s: 'career', c: { tab: 'renew' } };
  if (s === 'room') return c.kind === 'mm' ? { s: 'mm', c: { mine: c.mine, diff: c.diff, minutes: c.minutes } } : { s: 'career', c: { tab: 'match' } };
  if (s === 'mm') return c && c.mine ? { s: 'mm', c: { diff: c.diff, minutes: c.minutes } } : { s: 'home', c: {} };
  if (s === 'report') return c && c.rep && c.rep.kind === 'career' ? { s: 'career', c: { tab: 'match' } } : { s: 'home', c: {} };
  return { s: 'home', c: {} }; // career, careerNew
}
let armed = false; // tarayici gecmisinde tek nobetci kayit: telefonun geri tusu "ust ekran" olarak calisir
function arm() { if (armed) return; try { history.pushState({ fm: 1 }, ''); armed = true; } catch (e) {} }
// push parametresi eski cagrilarla uyum icin duruyor; gezinme modeli onu kullanmaz
export function go(name: string, ctx: any = {}, _push = true) {
  if (!SCREENS[name]) { console.warn('ekran yok', name); return; }
  if (SIDE.has(name) && !SIDE.has(R.screen) && R.screen) R.ret = { s: R.screen, c: R.ctx };
  if (name === R.screen && R.ctx && R.ctx.from && ctx.from === undefined) ctx = { ...ctx, from: R.ctx.from }; // ayni ekranda yeniden cizimde "nereden gelindi" korunur
  R.screen = name; R.ctx = ctx;
  if (parentOf()) arm();
  render();
}
export function back() { const p = parentOf(); if (p) go(p.s, p.c); }
export function home() { go('home', {}); }
window.addEventListener('popstate', () => {
  armed = false;
  if (R.guard && R.guard()) { arm(); return; } // mac ya da pencere acik: geri tusu onu kapatir
  const p = parentOf(); if (p) go(p.s, p.c); // go() ust ekrani olan ekranda nobetciyi yeniler; kok ekranda (ana menu) yenilemez: bir sonraki geri uygulamadan cikar
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
  const bk = $('aBack') as HTMLButtonElement; bk.hidden = !parentOf();
  // ayni ekran (ve ayni sekme) yeniden cizilirken kaydirma konumu korunur; ekran degisince basa doner
  const key = R.screen + '|' + (R.ctx && R.ctx.tab || '') + '|' + (R.ctx && R.ctx.level || '') + '|' + (R.screen === 'mm' && R.ctx.mine || '');
  const body = $('aBody')!; const keep = key === R.key ? body.scrollTop : 0; R.key = key; body.innerHTML = String(v.html); body.scrollTop = keep;
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
