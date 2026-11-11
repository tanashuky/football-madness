// Ortak arayuz parcalari: bildirim (toast), onay penceresi, alan/secim yardimcilari, kart.
import { $, Raw, esc, html, raw } from './html.js';
import { t } from './i18n.js';
export function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 1900);
    setTimeout(() => el.remove(), 2300);
}
// onay penceresi: Promise<boolean>; Enter/Escape calisir
export function confirmBox(msg, okLabel = t('btn.ok'), danger = false) {
    return new Promise((res) => {
        const m = $('modal');
        m.innerHTML = String(html `<div class="box" role="dialog" aria-modal="true"><p>${msg}</p><div class="row end"><button class="btn ghost" id="mNo">${t('btn.cancel')}</button><button class="btn ${danger ? 'danger' : 'prim'}" id="mOk">${okLabel}</button></div></div>`);
        m.hidden = false;
        const done = (v) => { m.hidden = true; m.innerHTML = ''; document.removeEventListener('keydown', key); res(v); };
        const key = (e) => { if (e.key === 'Escape')
            done(false); if (e.key === 'Enter')
            done(true); };
        document.addEventListener('keydown', key);
        $('mNo').onclick = () => done(false);
        $('mOk').onclick = () => done(true);
        m.onclick = (e) => { if (e.target === m)
            done(false); };
        $('mOk').focus();
    });
}
// bilgi penceresi (tek tus)
export function infoBox(title, body) {
    return new Promise((res) => {
        const m = $('modal');
        m.innerHTML = String(html `<div class="box" role="dialog" aria-modal="true"><h3>${title}</h3><div class="body">${body instanceof Raw ? body : esc(body)}</div><div class="row end"><button class="btn prim" id="mOk">${t('btn.ok')}</button></div></div>`);
        m.hidden = false;
        const done = () => { m.hidden = true; m.innerHTML = ''; res(); };
        $('mOk').onclick = done;
        m.onclick = (e) => { if (e.target === m)
            done(); };
    });
}
export const card = (title, body, extra = '') => html `<section class="card ${raw(extra)}">${title ? html `<h3>${title}</h3>` : ''}${body instanceof Raw ? body : raw(body)}</section>`;
// secim alani: options [[deger, etiket]]
export function sel(label, id, options, value, attrs = '') {
    return html `<label class="f">${label}<select id="${id}" ${raw(attrs)}>${options.map(([v, l]) => html `<option value="${v}" ${String(v) === String(value) ? raw('selected') : ''}>${l}</option>`)}</select></label>`;
}
export function seg(id, items, on, attr = 'data-v') {
    return html `<div class="seg" id="${id}">${items.map(([v, l]) => html `<button ${raw(attr)}="${v}" aria-pressed="${v === on ? 'true' : 'false'}">${l}</button>`)}</div>`;
}
export function dot(color) { return html `<i class="dot" style="background:${color}"></i>`; }
export const muted = (s) => html `<p class="muted">${s}</p>`;
export const tag = (s, cls = '') => html `<span class="tag ${raw(cls)}">${s}</span>`;
