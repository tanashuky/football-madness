// Kucuk sablon yardimcisi: html`...` icindeki her degisken kacislanir; raw() ile isaretlenen parca oldugu gibi gecer.
// Dizi degerleri birlestirilir (her ogesi ayrica kacislanir ya da raw olabilir). null/undefined/false bos yazilir.
export class Raw {
    constructor(s) {
        Object.defineProperty(this, "s", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: s
        });
    }
    toString() { return this.s; }
}
export const raw = (s) => new Raw(s);
export const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function part(v) {
    if (v === null || v === undefined || v === false)
        return '';
    if (v instanceof Raw)
        return v.s;
    if (Array.isArray(v))
        return v.map(part).join('');
    return esc(v);
}
export function html(strings, ...values) {
    let out = '';
    for (let i = 0; i < strings.length; i++) {
        out += strings[i];
        if (i < values.length)
            out += part(values[i]);
    }
    return new Raw(out);
}
export const $ = (id) => document.getElementById(id);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
// olay delegasyonu: kok eleman icinde data-act="isim" tasiyan ilk ataya gore isleyici cagirir
export function delegate(root, handlers, evName = 'click') {
    root.addEventListener(evName, (ev) => {
        const el = ev.target.closest('[data-act]');
        if (!el || !root.contains(el))
            return;
        const h = handlers[el.dataset.act];
        if (h) {
            ev.preventDefault();
            h(el, ev);
        }
    });
}
