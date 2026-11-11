// Bulut: hesap (e-posta baglantisi, Google/Apple acilinca) ve kayit esitleme (saves tablosu). Yapilandirma yoksa her sey yerelde kalir.
// Kural: yerel kayit her zaman calisir (Kariyer cevrimdisi); bulut, giris yapilmissa kaydi tasir. Yeni olan kazanir (updatedAt).
import { CONFIG } from '../config.js';
import { replace, store, onSave } from './store.js';
import { toast } from './ui.js';
import { t, fmtTime } from './i18n.js';
export const CLOUD = {
    sb: null, user: null, state: 'off', pendingEmail: '', lastPush: 0, lastErr: '', _timer: 0, onChange: null,
    cfg() {
        try {
            const o = JSON.parse(localStorage.getItem('fm.cloud') || 'null');
            if (o && o.url && o.anon)
                return { providers: 'email', ...o };
        }
        catch (e) { }
        return CONFIG.supabaseUrl ? { url: CONFIG.supabaseUrl, anon: CONFIG.supabaseAnon, providers: CONFIG.providers } : null;
    },
    providers() { return (this.cfg() || { providers: '' }).providers || ''; },
    async init() {
        const cfg = this.cfg();
        if (!cfg) {
            this.state = 'off';
            return;
        }
        this.state = 'loading';
        try {
            const mod = window.__supabaseMock ? window.__supabaseMock : await import(/* @vite-ignore */ CONFIG.supabaseJs);
            this.sb = mod.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
            const { data } = await this.sb.auth.getSession();
            this.user = data?.session?.user ?? null;
            this.sb.auth.onAuthStateChange((_ev, session) => { const was = !!this.user; this.user = session?.user ?? null; if (!was && this.user)
                this.afterSignIn(); this.changed(); });
            this.state = 'ready';
            if (this.user)
                await this.pull();
        }
        catch (e) {
            console.error('bulut', e);
            this.state = 'error';
        }
        this.changed();
    },
    changed() { if (this.onChange)
        this.onChange(); },
    label() { if (!this.user)
        return '-'; const p = this.user.app_metadata?.provider || 'email'; return `${this.user.email || String(this.user.id).slice(0, 8)} · ${p === 'email' ? 'e-posta' : p}`; },
    async signInOAuth(provider) { if (!this.sb)
        return; const { error } = await this.sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); if (error)
        toast(error.message, 'err'); },
    async signInEmail(email) { if (!this.sb)
        return; const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error)
        toast(error.message, 'err');
    else
        toast(t('login.email.sent'), 'ok'); },
    // e-posta + sifre: ana ekrana eklenen uygulamada da calisir (e-postadaki baglanti tarayicida acilir, oturum uygulamaya gecmez)
    async signInPassword(email, password) { if (!this.sb)
        return; const { error } = await this.sb.auth.signInWithPassword({ email, password }); if (error)
        toast(t('login.pw.bad'), 'err'); },
    async signUpPassword(email, password) {
        if (!this.sb)
            return;
        if (password.length < 6) {
            toast(t('login.pw.short'), 'err');
            return;
        }
        const { data, error } = await this.sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error)
            toast(error.message, 'err');
        else if (!data?.session)
            toast(t('login.pw.confirm'), 'ok');
    },
    async setPassword(password) { if (!this.sb || !this.user)
        return; if (password.length < 6) {
        toast(t('login.pw.short'), 'err');
        return;
    } const { error } = await this.sb.auth.updateUser({ password }); toast(error ? error.message : t('login.pw.set.ok'), error ? 'err' : 'ok'); },
    async signOut() { if (!this.sb)
        return; await this.sb.auth.signOut(); this.user = null; toast(t('cloud.signedout')); this.changed(); },
    async afterSignIn() { const r = await this.pull(); if (!r)
        await this.push(); toast(t('cloud.linked', { u: this.label() }), 'ok'); },
    // bulut kaydi yereldekinden yeniyse (ya da yerel hesap yoksa) bulut kazanir
    async pull() {
        if (!this.sb || !this.user)
            return false;
        const { data, error } = await this.sb.from('saves').select('data, updated_at').eq('profile', this.user.id).maybeSingle();
        if (error) {
            console.error(error);
            this.lastErr = error.message;
            return false;
        }
        if (!data)
            return false;
        const cloudAt = new Date(data.updated_at).getTime(), localAt = store.db.updatedAt || 0;
        const cloud = data.data;
        if (!store.db.account || cloudAt > localAt) {
            replace({ ...cloud, updatedAt: cloudAt });
            toast(t('cloud.pulled'), 'ok');
            this.changed();
            return true;
        }
        return true;
    },
    schedulePush() { if (!this.sb || !this.user)
        return; clearTimeout(this._timer); this._timer = setTimeout(() => this.push(), 1500); },
    async push() {
        if (!this.sb || !this.user)
            return;
        const { error } = await this.sb.from('saves').upsert({ profile: this.user.id, data: store.db, updated_at: new Date(store.db.updatedAt || Date.now()).toISOString() });
        if (error) {
            console.error('push', error);
            this.lastErr = error.message;
        }
        else {
            this.lastPush = Date.now();
            this.lastErr = '';
        }
        this.changed();
    },
    statusText() {
        if (this.state === 'off')
            return t('cloud.off');
        if (this.state === 'loading')
            return t('cloud.loading');
        if (this.state === 'error')
            return t('cloud.error');
        if (!this.user)
            return t('cloud.guest');
        return `${this.label()} · ${this.lastErr ? this.lastErr : this.lastPush ? t('cloud.synced', { t: fmtTime(this.lastPush) }) : t('cloud.syncing')}`;
    },
};
onSave(() => CLOUD.schedulePush());
