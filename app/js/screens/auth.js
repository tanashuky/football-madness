// Giris akisi (Katman 0): acilis (yukleniyor) -> karsilama (Hesap olustur / Giris yap) -> kulup kurulumu.
// Formlar ayri pencerelerde acilir (ekran yeniden cizilse de yazilan silinmez). Misafir girisi yok; hesap zorunlu.
// Tek istisna: bulut yapilandirilmamissa (gelistirme/test) "hesapsiz devam", sunucuya ulasilamiyorsa ve cihazda kayit varsa "cevrimdisi devam".
import { $, html, raw } from '../core/html.js';
import { t } from '../core/i18n.js';
import { go, register } from '../core/router.js';
import { store, save } from '../core/store.js';
import { CLOUD } from '../core/cloud.js';
import { toast } from '../core/ui.js';
import { CONFIG } from '../config.js';
export const needAuth = () => CLOUD.state !== 'off';
export function enter() { go(store.db.account ? 'home' : 'setup', {}); }
// ---- pencere ----
function dialog(inner, bind) {
    const m = $('modal');
    m.innerHTML = String(html `<div class="box auth" role="dialog" aria-modal="true">${inner}</div>`);
    m.hidden = false;
    m.onclick = null;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    const no = m.querySelector('#mNo');
    if (no)
        no.onclick = close;
    bind(m.querySelector('.box'), close);
    const first = m.querySelector('input');
    if (first)
        setTimeout(() => first.focus(), 50);
}
const v = (box, id) => (box.querySelector('#' + id)?.value || '').trim();
const msg = (box, text, ok = false) => { const el = box.querySelector('#aMsg'); if (el) {
    el.textContent = text;
    el.className = ok ? 'okp' : 'errp';
} };
const busy = async (btn, f) => { const b = btn; if (b.disabled)
    return; b.disabled = true; try {
    await f();
}
finally {
    b.disabled = false;
} };
const head = (title) => html `<div class="row between"><h3>${title}</h3><button class="ib" id="mNo" aria-label="${t('btn.close')}">✕</button></div>`;
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
// ---- hesap olustur ----
export function openSignup(prefill = '') {
    dialog(html `${head(t('auth.signup'))}
    <label class="f">${t('auth.email')}<input id="aEmail" type="email" autocomplete="email" value="${prefill}"></label>
    <label class="f">${t('auth.pw')}<input id="aPw" type="password" autocomplete="new-password"></label>
    <label class="f">${t('auth.pw2')}<input id="aPw2" type="password" autocomplete="new-password"></label>
    <p id="aMsg" class="errp"></p>
    <div class="row end"><button class="btn prim" id="aGo">${t('auth.signup')}</button></div>
    <p class="muted small center"><a href="#" id="aToLogin">${t('auth.have')}</a></p>`, (box, close) => {
        box.querySelector('#aToLogin').onclick = (e) => { e.preventDefault(); openEmailLogin(v(box, 'aEmail')); };
        const goBtn = box.querySelector('#aGo');
        goBtn.onclick = () => busy(goBtn, async () => {
            const email = v(box, 'aEmail'), pw = v(box, 'aPw'), pw2 = v(box, 'aPw2');
            if (!emailOk(email))
                return msg(box, t('auth.err.email'));
            if (pw.length < 6)
                return msg(box, t('login.pw.short'));
            if (pw !== pw2)
                return msg(box, t('auth.err.match'));
            const r = await CLOUD.signUp(email, pw);
            if (r === 'exists')
                return msg(box, t('login.exists'));
            if (r === 'session') {
                close();
                return;
            } // dogrulama kapaliysa dogrudan girilir (oturum olayi oyuna alir)
            if (r === 'verify') {
                openVerify(email, pw);
                return;
            }
            msg(box, r.err);
        });
    });
}
// ---- dogrulama: kod (e-postada kod varsa) ya da baglanti ----
function openVerify(email, pw) {
    const codes = CONFIG.emailCodes;
    dialog(html `${head(t('auth.verify'))}
    <p>${codes ? t('auth.verify.code', { e: email }) : t('auth.verify.link', { e: email })}</p>
    ${codes ? html `<input id="aCode" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······">` : ''}
    <p id="aMsg" class="errp"></p>
    <div class="row end"><button class="btn ghost sm" id="aResend">${t('auth.resend')}</button><button class="btn prim" id="aGo">${codes ? t('auth.verify.go') : t('auth.verify.done')}</button></div>`, (box, close) => {
        const goBtn = box.querySelector('#aGo');
        goBtn.onclick = () => busy(goBtn, async () => {
            if (codes) {
                const c = v(box, 'aCode').replace(/\D/g, '');
                if (c.length < 6)
                    return msg(box, t('login.code.bad'));
                const e = await CLOUD.verifySignup(email, c);
                if (e)
                    return msg(box, e);
                close();
                return;
            }
            const e = await CLOUD.signInPassword(email, pw);
            if (e)
                return msg(box, e === t('login.notconfirmed') ? t('auth.verify.notyet') : e);
            close();
        });
        const rs = box.querySelector('#aResend');
        rs.onclick = () => busy(rs, async () => { const e = await CLOUD.resendSignup(email); msg(box, e || t('auth.resent'), !e); });
    });
}
// ---- giris yap: saglayicilar alt alta, e-posta, sifremi unuttum ----
export function openLogin() {
    const prov = CLOUD.providers();
    const pbtn = (id, label) => { const on = prov.includes(id); return html `<button class="btn wide" data-oauth="${id}" ${on ? '' : raw('disabled')}>${label}${on ? '' : html ` <small>${t('sys.soon')}</small>`}</button>`; };
    dialog(html `${head(t('auth.login'))}
    <div class="stack">${pbtn('apple', t('auth.with', { p: 'Apple' }))}${pbtn('google', t('auth.with', { p: 'Google' }))}${pbtn('facebook', t('auth.with', { p: 'Facebook' }))}
      <button class="btn prim wide" id="aEmailBtn">${t('auth.withEmail')}</button></div>
    <p class="muted small center"><a href="#" id="aForgot">${t('auth.forgot')}</a></p>`, (box) => {
        for (const b of box.querySelectorAll('[data-oauth]'))
            b.onclick = () => CLOUD.signInOAuth(b.dataset.oauth);
        box.querySelector('#aEmailBtn').onclick = () => openEmailLogin();
        box.querySelector('#aForgot').onclick = (e) => { e.preventDefault(); openReset(); };
    });
}
function openEmailLogin(prefill = '') {
    dialog(html `${head(t('auth.withEmail'))}
    <label class="f">${t('auth.email')}<input id="aEmail" type="email" autocomplete="email" value="${prefill}"></label>
    <label class="f">${t('auth.pw')}<input id="aPw" type="password" autocomplete="current-password"></label>
    <p id="aMsg" class="errp"></p>
    <div class="row end"><button class="btn prim" id="aGo">${t('auth.login')}</button></div>
    <p class="muted small center"><a href="#" id="aForgot">${t('auth.forgot')}</a></p>`, (box, close) => {
        box.querySelector('#aForgot').onclick = (e) => { e.preventDefault(); openReset(v(box, 'aEmail')); };
        const goBtn = box.querySelector('#aGo');
        const run = () => busy(goBtn, async () => {
            const email = v(box, 'aEmail'), pw = v(box, 'aPw');
            if (!emailOk(email))
                return msg(box, t('auth.err.email'));
            if (!pw)
                return msg(box, t('login.pw.short'));
            const e = await CLOUD.signInPassword(email, pw);
            if (e)
                return msg(box, e);
            close();
        });
        goBtn.onclick = run;
        box.querySelector('#aPw').onkeydown = (e) => { if (e.key === 'Enter')
            run(); };
    });
}
// ---- sifre sifirlama ----
function openReset(prefill = '') {
    dialog(html `${head(t('auth.reset'))}
    <p class="muted small">${t('auth.reset.desc')}</p>
    <label class="f">${t('auth.email')}<input id="aEmail" type="email" autocomplete="email" value="${prefill}"></label>
    <p id="aMsg" class="errp"></p>
    <div class="row end"><button class="btn prim" id="aGo">${t('auth.reset.send')}</button></div>`, (box) => {
        const goBtn = box.querySelector('#aGo');
        goBtn.onclick = () => busy(goBtn, async () => {
            const email = v(box, 'aEmail');
            if (!emailOk(email))
                return msg(box, t('auth.err.email'));
            const e = await CLOUD.resetRequest(email);
            if (e)
                return msg(box, e);
            if (CONFIG.emailCodes)
                openNewPassword(email);
            else
                msg(box, t('auth.reset.link'), true);
        });
    });
}
// yeni sifre: kodla (email verilir) ya da e-postadaki baglantiyla acilan sayfada (oturum kurtarma modunda)
export function openNewPassword(email = '') {
    dialog(html `${head(t('auth.newpw'))}
    ${email ? html `<p>${t('auth.verify.code', { e: email })}</p><input id="aCode" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······">` : ''}
    <label class="f">${t('auth.newpw')}<input id="aPw" type="password" autocomplete="new-password"></label>
    <label class="f">${t('auth.pw2')}<input id="aPw2" type="password" autocomplete="new-password"></label>
    <p id="aMsg" class="errp"></p>
    <div class="row end"><button class="btn prim" id="aGo">${t('btn.save')}</button></div>`, (box, close) => {
        const goBtn = box.querySelector('#aGo');
        goBtn.onclick = () => busy(goBtn, async () => {
            const pw = v(box, 'aPw');
            if (pw.length < 6)
                return msg(box, t('login.pw.short'));
            if (pw !== v(box, 'aPw2'))
                return msg(box, t('auth.err.match'));
            const e = email ? await CLOUD.resetWithCode(email, v(box, 'aCode'), pw) : await CLOUD.setPassword(pw);
            if (e)
                return msg(box, e);
            CLOUD.recovery = false;
            close();
            toast(t('login.pw.set.ok'), 'ok');
        });
    });
}
register('login', () => {
    const loading = CLOUD.state === 'loading';
    const offline = !loading && CLOUD.state === 'error';
    return { bare: true, back: false, html: html `
  <div class="center login">
    <div class="logo">Football <span>Madness</span></div>
    <p class="muted">${t('login.tagline')}</p>
    ${loading ? html `<div class="spinner"></div><p class="muted small">${t('auth.loading')}</p>`
            : CLOUD.state === 'off' ? html `<div class="stack"><button class="btn prim big" id="guest">${t('auth.dev')}</button></div><p class="muted small">${t('login.cloud.off')}</p>`
                : html `<div class="stack"><button class="btn prim big" id="wSignup" ${offline ? raw('disabled') : ''}>${t('auth.signup')}</button><button class="btn big" id="wLogin" ${offline ? raw('disabled') : ''}>${t('auth.login')}</button>
        ${offline && store.db.account ? html `<button class="btn ghost" id="wOffline">${t('auth.offline')}</button>` : ''}</div>
      <p class="muted small">${offline ? t('auth.noconn') : t('auth.why')}</p>`}
  </div>`, after: () => {
            const g = $('guest');
            if (g)
                g.onclick = () => enter();
            const s = $('wSignup');
            if (s)
                s.onclick = () => openSignup();
            const l = $('wLogin');
            if (l)
                l.onclick = () => openLogin();
            const o = $('wOffline');
            if (o)
                o.onclick = () => enter();
        } };
});
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
            store.db.account = { guest: !CLOUD.user, club: { name, short, city: $('cCity').value.trim(), stadium: $('cStad').value.trim(), color: $('cCol').value, color2: $('cCol2').value, gg: 62, createdAt: Date.now() } };
            save();
            go('home', {}, false);
        };
    } }));
