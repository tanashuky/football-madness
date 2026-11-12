// Cok dillilik: anahtar -> metin; {ad} yer tutuculari params ile dolar. Dil degisince dinleyiciler (router) ekrani yeniden cizer.
// Secenek listeleri "Etiket|A|B|C" bicimindedir: opts(key) ile parcalanir.
import { tr } from '../i18n/tr.js';
import { en } from '../i18n/en.js';
export const LANGS = ['tr', 'en'];
const DICTS = { tr, en };
let lang = 'tr';
const listeners = new Set();
export function setLang(l) { if (l === lang || !DICTS[l])
    return; lang = l; document.documentElement.lang = l; listeners.forEach((f) => f()); }
export function getLang() { return lang; }
export function onLang(f) { listeners.add(f); return () => listeners.delete(f); }
export function t(key, params) {
    let s = DICTS[lang][key] ?? DICTS.tr[key] ?? key;
    if (params)
        for (const [k, v] of Object.entries(params))
            s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    return s;
}
// "Etiket|Secenek0|Secenek1|..." -> { label, opts }
export function opts(key) { const parts = t(key).split('|'); return { label: parts[0], opts: parts.slice(1) }; }
// cogul: anahtar.one / anahtar.other
export function tn(key, n, params) { return t(n === 1 ? `${key}.one` : `${key}.other`, { n, ...(params || {}) }); }
export function locale() { return lang === 'tr' ? 'tr-TR' : 'en-US'; }
export function fmtNum(n) { return new Intl.NumberFormat(locale()).format(n); }
// oyun parasi: ic deger x 1.000 euro olarak gosterilir ("€2,5 M", "€625 K"); yalniz gosterim, denge degismez
export function money(fm) {
    const v = Math.abs(fm) * 1000, sign = fm < 0 ? '−' : '';
    const f = (n, d) => new Intl.NumberFormat(locale(), { maximumFractionDigits: d }).format(n);
    if (v >= 1e9)
        return `${sign}€${f(v / 1e9, 2)} Mr`;
    if (v >= 1e6)
        return `${sign}€${f(v / 1e6, v >= 1e8 ? 0 : v >= 1e7 ? 1 : 2)} M`;
    if (v >= 1e3)
        return `${sign}€${f(v / 1e3, 0)} K`;
    return `${sign}€${f(v, 0)}`;
}
export function fmtDate(d) { return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(d); }
export function fmtTime(d) { return new Intl.DateTimeFormat(locale(), { timeStyle: 'short' }).format(d); }
