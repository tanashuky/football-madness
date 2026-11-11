// Kucuk sablon yardimcisi: html`...` icindeki her degisken kacislanir; raw() ile isaretlenen parca oldugu gibi gecer.
// Dizi degerleri birlestirilir (her ogesi ayrica kacislanir ya da raw olabilir). null/undefined/false bos yazilir.
export class Raw { constructor(public s: string) {} toString() { return this.s; } }
export const raw = (s: string) => new Raw(s);
export const esc = (v: unknown): string => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
function part(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}
export function html(strings: TemplateStringsArray, ...values: unknown[]): Raw {
  let out = '';
  for (let i = 0; i < strings.length; i++) { out += strings[i]; if (i < values.length) out += part(values[i]); }
  return new Raw(out);
}
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];
// olay delegasyonu: kok eleman icinde data-act="isim" tasiyan ilk ataya gore isleyici cagirir
export function delegate(root: HTMLElement, handlers: Record<string, (el: HTMLElement, ev: Event) => void>, evName = 'click') {
  root.addEventListener(evName, (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el)) return;
    const h = handlers[el.dataset.act!];
    if (h) { ev.preventDefault(); h(el, ev); }
  });
}
