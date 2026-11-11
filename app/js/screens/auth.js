// Giris ve kulup kurulumu (Katman 0)
import { $, html } from '../core/html.js';
import { t } from '../core/i18n.js';
import { go, register } from '../core/router.js';
import { store, save } from '../core/store.js';
import { CLOUD } from '../core/cloud.js';
import { confirmBox, toast } from '../core/ui.js';
export function authButtons() {
    if (CLOUD.state === 'off')
        return html ``;
    if (CLOUD.user)
        return html `<p class="muted center">${t('login.account')}: ${CLOUD.label()} · <a href="#" id="switchAcc">${t('login.switch')}</a></p><div class="row center"><input id="pwSetIn" type="password" placeholder="${t('login.pw.set.placeholder')}" autocomplete="new-password"><button class="btn sm" id="pwSet">${t('login.pw.set')}</button></div>`;
    const prov = CLOUD.providers();
    return html `<div class="row center">${prov.includes('google') ? html `<button class="btn" data-oauth="google">${t('login.google')}</button>` : ''}${prov.includes('apple') ? html `<button class="btn" data-oauth="apple">${t('login.apple')}</button>` : ''}</div>
    <div class="col center authform"><input id="emailIn" type="email" placeholder="${t('login.email.placeholder')}" autocomplete="email"><input id="pwIn" type="password" placeholder="${t('login.pw.placeholder')}" autocomplete="current-password">
      <div class="row center"><button class="btn prim" id="pwGo">${t('login.pw.go')}</button><button class="btn" id="pwNew">${t('login.pw.new')}</button></div>
      <a href="#" id="emailGo" class="small">${t('login.email.send')}</a></div>`;
}
export function bindAuth(root) {
    const sw = root.querySelector('#switchAcc');
    if (sw)
        sw.onclick = async (e) => { e.preventDefault(); if (!(await confirmBox(t('login.switch.confirm'), t('login.switch'))))
            return; await CLOUD.signOut(); go('login', {}, false); };
    for (const b of root.querySelectorAll('[data-oauth]'))
        b.onclick = () => CLOUD.signInOAuth(b.dataset.oauth);
    const val = (id) => (root.querySelector('#' + id)?.value || '').trim();
    const pg = root.querySelector('#pwGo');
    if (pg)
        pg.onclick = () => { if (val('emailIn') && val('pwIn'))
            CLOUD.signInPassword(val('emailIn'), val('pwIn')); };
    const pn = root.querySelector('#pwNew');
    if (pn)
        pn.onclick = () => { if (val('emailIn') && val('pwIn'))
            CLOUD.signUpPassword(val('emailIn'), val('pwIn')); };
    const eg = root.querySelector('#emailGo');
    if (eg)
        eg.onclick = (e) => { e.preventDefault(); if (val('emailIn'))
            CLOUD.signInEmail(val('emailIn')); };
    const sp = root.querySelector('#pwSet');
    if (sp)
        sp.onclick = () => CLOUD.setPassword(val('pwSetIn'));
}
register('login', () => ({ bare: true, back: false, html: html `
  <div class="center login">
    <div class="logo">Football <span>Madness</span></div>
    <p class="muted">${t('login.tagline')}</p>
    <div class="row center"><button class="btn prim big" id="guest">${store.db.account ? (CLOUD.user ? t('login.playnow') : t('login.continue')) : t('login.guest')}</button></div>
    ${authButtons()}
    <p class="muted small">${CLOUD.state === 'off' ? t('login.cloud.off') : CLOUD.user ? t('login.cloud.user') : t('login.cloud.guest')}</p>
  </div>`, after: (root) => { $('guest').onclick = () => { if (!store.db.account)
        go('setup', {}, false);
    else
        go('home', {}, false); }; bindAuth(root); } }));
register('setup', () => ({ title: t('setup.title'), back: false, html: html `
  <section class="card hero">
    <div class="grid2">
      <label class="f">${t('setup.name')}<input type="text" id="cName" maxlength="24" value="Kartal SK"></label>
      <label class="f">${t('setup.short')}<input type="text" id="cShort" maxlength="3" value="KSK"></label>
      <label class="f">${t('setup.city')}<input type="text" id="cCity" maxlength="24" value="İstanbul"></label>
      <label class="f">${t('setup.stadium')}<input type="text" id="cStad" maxlength="24" value="Kartal Arena"></label>
    </div>
    <div class="row"><label class="f">${t('setup.color1')}<input type="color" id="cCol" value="#d2433d"></label><label class="f">${t('setup.color2')}<input type="color" id="cCol2" value="#ffffff"></label></div>
    <p class="muted">${t('setup.note')}</p>
  </section>`, foot: html `<button class="btn prim" id="cOk">${t('setup.create')}</button>`, after: () => {
        $('cOk').onclick = () => {
            const name = $('cName').value.trim(), short = ($('cShort').value.trim() || name.slice(0, 3)).toUpperCase().slice(0, 3);
            if (name.length < 3 || name.length > 24) {
                toast(t('setup.err.name'), 'err');
                return;
            }
            if (short.length !== 3) {
                toast(t('setup.err.short'), 'err');
                return;
            }
            store.db.account = { guest: true, club: { name, short, city: $('cCity').value.trim(), stadium: $('cStad').value.trim(), color: $('cCol').value, color2: $('cCol2').value, gg: 62, createdAt: Date.now() } };
            save();
            go('home', {}, false);
        };
    } }));
