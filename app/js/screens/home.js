// Ana menu, profil, oduller, gorevler, ayarlar (Katman 0)
import { $, html, raw } from '../core/html.js';
import { t, fmtNum, fmtDate, money, setLang } from '../core/i18n.js';
import { go, register, render } from '../core/router.js';
import { store, save, reset, APP_VERSION } from '../core/store.js';
import { CLOUD } from '../core/cloud.js';
import { card, confirmBox, dot, muted, sel, tag, toast } from '../core/ui.js';
import { clearError, lastError } from '../core/errors.js';
import { openLogin, openNewPassword, openSignup } from './auth.js';
import { rank, seasonDone } from '../model/career.js';
import { CAP, rollCaps } from '../model/rewards.js';
import { CONFIG } from '../config.js';
import { claimDaily, claimWeekly, claimable, roll } from '../model/missions.js';
register('home', () => {
    const db = store.db;
    const c = db.account.club;
    const k = db.career;
    rollCaps(db.rewards);
    roll(db);
    return { title: raw(`<i class="crest" style="background:${c.color};border-color:${c.color2}"></i>` + c.name), back: false, html: html `
  <div class="wallet"><span>${tag(html `${fmtNum(db.rewards.pp)} ${t('home.pp')}`, 'y')}</span><span>${tag(html `${db.rewards.boosts} ${t('home.boosts')}`)}</span>${k ? html `<span>${tag(html `${money(k.fm)}`, 'g')}</span>` : ''}</div>
  <div class="cards modes">
    <section class="card hero mode"><h3>${t('home.career')}</h3><p>${t('home.career.desc')}</p>
      ${k ? html `<p class="muted">${t('career.season', { n: k.league.season })} · ${t('career.played', { w: k.league.week, total: k.league.fixtures.length })} · ${t('career.rank', { n: rank(k.league) })}${seasonDone(k.league) ? ' · ' + t('career.seasonend') : ''}</p>
        <div class="row"><button class="btn prim" data-go="career" data-ctx='{"tab":"match"}'>${t('home.career.continue')}</button><button class="btn ghost" id="careerNew">${t('home.career.new')}</button></div>`
            : html `<p class="muted">${t('home.career.none')}</p><div class="row"><button class="btn prim" data-go="careerNew">${t('home.career.new')}</button></div>`}
    </section>
    <section class="card mode"><h3>${t('home.mm')}</h3><p>${t('home.mm.desc', { elo: db.mm.elo })}</p>${db.mm.last ? html `<p class="muted">${t('mm.last')}: ${db.mm.last}</p>` : ''}<div class="row"><button class="btn prim" data-go="mm">${t('home.mm.play')}</button></div></section>
    <section class="card mode locked"><h3>${t('home.online')} <small>${t('home.online.locked')}</small></h3><p>${t('home.online.desc')}</p><div class="row"><button class="btn ghost" disabled>${t('sys.soon')}</button></div></section>
  </div>
  <div class="cards small">
    <button class="card link" data-go="rewards"><h3>${t('home.rewards')}</h3><p class="muted">${fmtNum(db.rewards.pp)} ${t('home.pp')} · ${db.rewards.boosts} ${t('home.boosts')}</p></button>
    <button class="card link" data-go="missions"><h3>${t('home.missions')}</h3><p class="muted">${claimable(db) ? t('missions.ready', { n: claimable(db) }) : t('missions.none')}</p></button>
    <button class="card link" data-go="profile"><h3>${t('profile.title')}</h3><p class="muted">${t('profile.mm', { p: db.mm.played, elo: db.mm.elo })}</p></button>
    <button class="card link" data-go="premium"><h3>${t('home.premium')}</h3><p class="muted">${t('home.premium.desc')}</p></button>
  </div>`, after: () => { const b = $('careerNew'); if (b)
            b.onclick = async () => { if (await confirmBox(t('career.endleague.confirm'), t('home.career.new'), true))
                go('careerNew'); }; } };
});
register('premium', () => ({ title: t('home.premium'), html: html `${card(t('home.premium'), html `<p>${t('home.premium.desc')}</p>${muted(t('premium.soon'))}`)}` }));
register('missions', () => {
    const db = store.db;
    roll(db);
    const m = db.missions;
    const row = (title, sub, done, claimed, attr, reward) => html `<div class="li static"><div><div class="nm">${title}</div><div class="sub">${sub}</div></div><div class="acts"><span class="muted small">${reward}</span>${claimed ? tag('✓', 'g') : html `<button class="btn sm ${done ? 'prim' : ''}" ${raw(attr)} ${done ? '' : raw('disabled')}>${t('missions.claim')}</button>`}</div></div>`;
    return { title: t('missions.title'), html: html `
    ${card(html `${t('missions.daily')} <small>${t('missions.streak', { n: m.streak })}</small>`, html `<div class="list compact">${m.daily.map((d, i) => row(t('mis.d.' + d.id), d.done ? t('missions.done') : t('missions.todo'), d.done, d.claimed, `data-cd="${i}"`, d.id === 'login' ? money(63) + (m.streak === 7 ? ' + ⚡' : '') : '⚡ 1'))}</div>${muted(t('missions.daily.desc'))}`)}
    ${card(t('missions.weekly'), html `<div class="list compact">${m.weekly.map((w, i) => row(t('mis.w.' + w.id), `${w.prog}/${w.goal}`, w.prog >= w.goal, w.claimed, `data-cw="${i}"`, money(375)))}</div>${muted(t('missions.weekly.desc'))}`)}`,
        after: (root) => {
            const show = (r) => { if (!r)
                return; save(); toast(r.fm || r.boost ? `${r.fm ? '+' + money(r.fm) + ' ' : ''}${r.boost ? '+' + r.boost + ' ⚡' : ''}` : t('missions.capped'), r.fm || r.boost ? 'ok' : ''); render(); };
            for (const b of root.querySelectorAll('[data-cd]'))
                b.onclick = () => show(claimDaily(db, +b.dataset.cd));
            for (const b of root.querySelectorAll('[data-cw]'))
                b.onclick = () => show(claimWeekly(db, +b.dataset.cw));
        } };
});
register('profile', () => {
    const db = store.db;
    const c = db.account.club;
    const k = db.career;
    const trophies = k ? k.trophies : [];
    return { title: t('profile.title'), html: html `
    ${card(t('profile.club'), html `<p>${dot(c.color)} <b>${c.name}</b> · ${c.short}${c.city ? ' · ' + c.city : ''}${c.stadium ? ' · ' + c.stadium : ''}</p><p class="muted">${t('profile.mm', { p: db.mm.played, elo: db.mm.elo })}</p>${k ? html `<p class="muted">${t('home.career')}: ${t('career.result', { w: k.stats.won, d: k.stats.drawn, l: k.stats.lost, gf: '', ga: '' }).replace(' · :', '')} · ${t('career.season', { n: k.league.season })}</p>` : ''}`)}
    ${card(t('profile.trophies'), trophies.length ? html `<div class="row wrap">${trophies.map((tr) => tag(html `🏆 ${tr.name} · ${t('career.season', { n: tr.season })} <small>${t('profile.career.tag')}</small>`, 'y'))}</div>` : muted(t('profile.empty')))}
    ${card(t('profile.achievements'), muted(t('sys.soon.desc')))}` };
});
register('rewards', () => {
    const r = store.db.rewards;
    rollCaps(r);
    const kindLabel = (k) => ({ win: t('reward.win'), draw: t('reward.draw'), cup: t('reward.cup'), cupTitle: t('reward.title'), title: t('reward.title'), boost: t('rewards.boost') }[k] || k);
    return { title: t('rewards.title'), html: html `
    <div class="wallet big"><span>${tag(html `${fmtNum(r.pp)} ${t('rewards.pp')}`, 'y')}</span><span>${tag(html `${r.boosts} ${t('rewards.boost')}`)}</span></div>
    ${muted(t('rewards.desc'))}
    ${card(t('rewards.ledger'), html `<p class="muted">${t('rewards.cap', { d: r.day.pp, dcap: CAP.day, s: r.season.pp, scap: CAP.season })}</p>${r.entries.length ? html `<div class="list">${r.entries.slice(0, 30).map((e) => html `<div class="li"><div><div class="nm">${kindLabel(e.kind)} <small class="muted">${e.src === 'career' ? t('rewards.source.career') : t('rewards.source.online')}</small></div><div class="sub">${fmtDate(e.t)}</div></div><div class="gg">${e.boost ? '+' + e.boost + ' ⚡' : '+' + e.pp + ' PP'}</div></div>`)}</div>` : muted(t('rewards.empty'))}`)}` };
});
register('settings', () => {
    const s = store.db.settings;
    const err = lastError();
    const onoff = [['1', t('settings.on')], ['0', t('settings.off')]];
    const b = (v) => (v ? '1' : '0');
    return { title: t('settings.title'), html: html `
    ${card(t('settings.game'), html `<div class="grid2">
      ${sel(t('settings.lang'), 'sLang', [['tr', 'Türkçe'], ['en', 'English']], s.lang, 'class="sk" data-k="lang"')}
      ${sel(t('settings.minutes'), 'sMin', [[6, t('career.new.min', { n: 6 })], [10, t('career.new.min', { n: 10 })], [15, t('career.new.min', { n: 15 })]], s.minutes, 'class="sk" data-k="minutes"')}
      ${sel(t('settings.cam'), 'sCam', [['full', t('cam.full')], ['length', t('cam.tall')], ['near', t('cam.near')]], s.cam, 'class="sk" data-k="cam"')}
      ${sel(t('mm.mode'), 'sMode', [['sim', t('mode.sim')], ['team', t('mode.team')]], s.mode, 'class="sk" data-k="mode"')}
      ${sel(t('settings.controls'), 'sKeys', [['arrows', t('controls.arrows')], ['wasd', t('controls.wasd')]], s.keys, 'class="sk" data-k="keys"')}
      ${sel(t('settings.assistP'), 'sAP', [[0, t('assist.0')], [1, t('assist.1')], [2, t('assist.2')]], s.assistP, 'class="sk" data-k="assistP"')}
      ${sel(t('settings.assistS'), 'sAS', [[0, t('assist.0')], [1, t('assist.1')], [2, t('assist.2')]], s.assistS, 'class="sk" data-k="assistS"')}
      ${sel(t('settings.left'), 'sLeft', onoff, b(s.left), 'class="sk" data-k="left"')}
      ${sel(t('settings.layer'), 'sLayer', onoff, b(s.layer), 'class="sk" data-k="layer"')}
      ${sel(t('settings.names'), 'sNames', [['auto', t('names.auto')], ['mine', t('names.mine')], ['off', t('settings.off')]], s.names, 'class="sk" data-k="names"')}
    </div>`)}
    ${card(t('settings.access'), html `<div class="grid2">
      ${sel(t('settings.textscale'), 'sTS', [[1, '100%'], [1.15, '115%'], [1.3, '130%']], s.textScale, 'class="sk" data-k="textScale"')}
      ${sel(t('settings.reducemotion'), 'sRM', onoff, b(s.reduceMotion), 'class="sk" data-k="reduceMotion"')}
      ${sel(t('settings.contrast'), 'sHC', onoff, b(s.contrast), 'class="sk" data-k="contrast"')}
      ${sel(t('settings.colorblind'), 'sCB', onoff, b(s.colorblind), 'class="sk" data-k="colorblind"')}
      ${sel(t('settings.vibration'), 'sVib', onoff, b(s.vibration), 'class="sk" data-k="vibration"')}
      ${sel(t('settings.sp'), 'sSP', onoff, b(s.spSlow), 'class="sk" data-k="spSlow"')}
    </div>`)}
    ${card(t('settings.sound'), muted(t('settings.soon.sound')))}
    ${card(t('settings.account'), html `<p>${store.db.account?.club.name || ''} · <span id="cloudStatus">${CLOUD.statusText()}</span></p>
      <div class="row">${CLOUD.user ? html `<button class="btn sm" id="cloudSync">${t('settings.sync')}</button><button class="btn sm" id="pwChange">${t('auth.changepw')}</button><button class="btn sm ghost" id="cloudOut">${t('settings.signout')}</button>` : CLOUD.state !== 'off' ? html `<button class="btn sm prim" id="accNew">${t('auth.signup')}</button><button class="btn sm" id="accIn">${t('auth.login')}</button>` : ''}<button class="btn sm danger" id="resetAll">${t('settings.reset')}</button></div>`)}
    ${card(t('settings.about'), html `<p class="muted">${t('settings.version')} ${APP_VERSION}</p><div class="row"><a class="btn sm ghost" href="${CONFIG.demoUrl}">${t('settings.demo')}</a></div>
      <h4>${t('settings.diag')}</h4>${err ? html `<p class="muted">${fmtDate(err.t)} · ${err.build || ''}</p><pre class="errpre">${'[' + err.where + '] ' + err.msg}</pre><div class="row"><button class="btn sm" id="errClr">${t('settings.diag.clear')}</button></div>` : muted(t('settings.diag.none'))}`)}`,
        after: (root) => {
            for (const el of root.querySelectorAll('.sk'))
                el.onchange = () => {
                    const k = el.dataset.k;
                    let v = el.value;
                    if (['reduceMotion', 'contrast', 'colorblind', 'vibration', 'spSlow', 'left', 'layer'].includes(k))
                        v = v === '1';
                    else if (!isNaN(+v) && !['keys', 'lang'].includes(k))
                        v = +v;
                    store.db.settings[k] = v;
                    save();
                    applySettings();
                    if (k === 'lang')
                        setLang(v);
                };
            const pc = $('pwChange');
            if (pc)
                pc.onclick = () => openNewPassword();
            const an = $('accNew');
            if (an)
                an.onclick = () => openSignup();
            const ai = $('accIn');
            if (ai)
                ai.onclick = () => openLogin();
            const cs = $('cloudSync');
            if (cs)
                cs.onclick = async () => { await CLOUD.push(); toast(t('toast.saved'), 'ok'); };
            const co = $('cloudOut');
            if (co)
                co.onclick = async () => { if (!(await confirmBox(t('login.switch.confirm'), t('login.switch'))))
                    return; await CLOUD.signOut(); go('login', {}, false); };
            $('resetAll').onclick = async () => { if (await confirmBox(t('settings.reset.confirm'), t('settings.reset'), true)) {
                reset();
                location.reload();
            } };
            const ec = $('errClr');
            if (ec)
                ec.onclick = () => { clearError(); render(); };
        } };
});
// ayarlarin gorsel etkileri (yazi olcegi, hareket, kontrast, renk koru)
export function applySettings() {
    const s = store.db.settings;
    const r = document.documentElement;
    r.style.setProperty('--text-scale', String(s.textScale));
    document.body.classList.toggle('reduce', s.reduceMotion);
    document.body.classList.toggle('contrast', s.contrast);
    document.body.classList.toggle('cb', s.colorblind);
}
