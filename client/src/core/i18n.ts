// Cok dillilik: anahtar -> metin; {ad} yer tutuculari params ile dolar. Dil degisince dinleyiciler (router) ekrani yeniden cizer.
// Secenek listeleri "Etiket|A|B|C" bicimindedir: opts(key) ile parcalanir.
import { tr } from '../i18n/tr.js';
import { en } from '../i18n/en.js';

export type Lang = 'tr' | 'en';
export const LANGS: Lang[] = ['tr', 'en'];
const DICTS: Record<Lang, Record<string, string>> = { tr, en };
let lang: Lang = 'tr';
const listeners = new Set<() => void>();

export function setLang(l: Lang) { if (l === lang || !DICTS[l]) return; lang = l; document.documentElement.lang = l; listeners.forEach((f) => f()); }
export function getLang(): Lang { return lang; }
export function onLang(f: () => void) { listeners.add(f); return () => listeners.delete(f); }
export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.tr[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return s;
}
// "Etiket|Secenek0|Secenek1|..." -> { label, opts }
export function opts(key: string): { label: string; opts: string[] } { const parts = t(key).split('|'); return { label: parts[0], opts: parts.slice(1) }; }
// cogul: anahtar.one / anahtar.other
export function tn(key: string, n: number, params?: Record<string, string | number>) { return t(n === 1 ? `${key}.one` : `${key}.other`, { n, ...(params || {}) }); }
export function locale() { return lang === 'tr' ? 'tr-TR' : 'en-US'; }
export function fmtNum(n: number) { return new Intl.NumberFormat(locale()).format(n); }
// oyun parasi: ic deger x 1.000 euro olarak gosterilir ("€2,5 M", "€625 K"); yalniz gosterim, denge degismez
export function money(fm: number): string {
  const v = Math.abs(fm) * 1000, sign = fm < 0 ? '−' : '';
  const f = (n: number, d: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: d }).format(n);
  return `${sign}${f(v, 0)} €`; // her zaman tam sayi: 2.500.000 €
}
export function fmtDate(d: number | Date) { return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(d); }
export function fmtTime(d: number | Date) { return new Intl.DateTimeFormat(locale(), { timeStyle: 'short' }).format(d); }
