// Bulut: hesap (e-posta baglantisi, Google/Apple acilinca) ve kayit esitleme (saves tablosu). Yapilandirma yoksa her sey yerelde kalir.
// Kural: yerel kayit her zaman calisir (Kariyer cevrimdisi); bulut, giris yapilmissa kaydi tasir. Yeni olan kazanir (updatedAt).
import { CONFIG } from '../config.js';
import { replace, store, onSave } from './store.js';
import { toast } from './ui.js';
import { t, fmtTime } from './i18n.js';
import type { SaveV1 } from '../model/types.js';

type State = 'off' | 'loading' | 'ready' | 'error';
export const CLOUD = {
  sb: null as any, user: null as any, state: 'off' as State, recovery: false, lastPush: 0, lastErr: '', _timer: 0 as any, onChange: null as null | (() => void),
  cfg(): { url: string; anon: string; providers: string } | null {
    try { const o = JSON.parse(localStorage.getItem('fm.cloud') || 'null'); if (o && o.off) return null; if (o && o.url && o.anon) return { providers: 'email', ...o }; } catch (e) {}
    return CONFIG.supabaseUrl ? { url: CONFIG.supabaseUrl, anon: CONFIG.supabaseAnon, providers: CONFIG.providers } : null;
  },
  // bu cihazda kayitli oturum var mi (ag beklemeden): cevrimdisi acilista hesap sahibi dogrudan oyuna girer
  hasStoredSession(): boolean { try { for (let i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i) || '')) return true; } catch (e) {} return false; },
  providers(): string { return (this.cfg() || { providers: '' }).providers || ''; },
  async init() {
    const cfg = this.cfg(); if (!cfg) { this.state = 'off'; return; }
    this.state = 'loading';
    try {
      const mod = (window as any).__supabaseMock ? (window as any).__supabaseMock : await import(/* @vite-ignore */ CONFIG.supabaseJs);
      this.sb = mod.createClient(cfg.url, cfg.anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const { data } = await this.sb.auth.getSession();
      this.user = data?.session?.user ?? null;
      this.sb.auth.onAuthStateChange((_ev: string, session: any) => { if (_ev === 'PASSWORD_RECOVERY') this.recovery = true; const was = !!this.user; this.user = session?.user ?? null; if (!was && this.user) { this.state = 'loading'; this.changed(); this.afterSignIn().catch((e: any) => console.error(e)).finally(() => { this.state = 'ready'; this.changed(); }); } else this.changed(); }); // giriste once bulut kaydi cekilir, sonra oyuna alinir (kayitli kulubu olan kurulum ekranini gormesin)
      this.state = 'ready';
      if (this.user) await this.pull();
    } catch (e) { console.error('bulut', e); this.state = 'error'; }
    this.changed();
  },
  changed() { if (this.onChange) this.onChange(); },
  label(): string { if (!this.user) return '-'; const p = this.user.app_metadata?.provider || 'email'; return `${this.user.email || String(this.user.id).slice(0, 8)} · ${p === 'email' ? 'e-posta' : p}`; },
  async signInOAuth(provider: string) { if (!this.sb) return; const { error } = await this.sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } }); if (error) toast(error.message, 'err'); },
  async signInEmail(email: string) { if (!this.sb) return; const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) toast(error.message, 'err'); else toast(t('login.email.sent'), 'ok'); },
  // ---- e-posta + sifre ----
  errText(error: any): string { const m = String(error?.message || error || ''); const c = String(error?.code || ''); if (/invalid login|invalid_credentials/i.test(m + c)) return t('login.pw.bad'); if (/not confirmed/i.test(m + c)) return t('login.notconfirmed'); if (/rate limit|rate_limit/i.test(m + c)) return t('login.rate'); if (/expired|invalid.*(otp|token)|otp_expired/i.test(m + c)) return t('login.code.bad'); if (/already registered|user_already_exists/i.test(m + c)) return t('login.exists'); return m || t('cloud.error'); },
  async signInPassword(email: string, password: string): Promise<string | null> { if (!this.sb) return t('cloud.error'); const { error } = await this.sb.auth.signInWithPassword({ email, password }); return error ? this.errText(error) : null; },
  // donus: 'session' (dogrulama kapali, dogrudan girildi) | 'verify' (e-posta dogrulamasi bekleniyor) | 'exists' (bu e-posta kayitli) | { err }
  async signUp(email: string, password: string): Promise<'session' | 'verify' | 'exists' | { err: string }> {
    if (!this.sb) return { err: t('cloud.error') };
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return /already registered|user_already_exists/i.test(String(error.message) + String(error.code)) ? 'exists' : { err: this.errText(error) };
    if (data?.session) return 'session';
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return 'exists'; // Supabase kayitli e-posta icin bos kimlik listesi dondurur
    return 'verify';
  },
  async verifySignup(email: string, code: string): Promise<string | null> { if (!this.sb) return t('cloud.error'); const { error } = await this.sb.auth.verifyOtp({ email, token: code.replace(/\D/g, ''), type: 'signup' }); return error ? this.errText(error) : null; },
  async resendSignup(email: string): Promise<string | null> { if (!this.sb) return t('cloud.error'); const { error } = await this.sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } }); return error ? this.errText(error) : null; },
  async resetRequest(email: string): Promise<string | null> { if (!this.sb) return t('cloud.error'); const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); return error ? this.errText(error) : null; },
  async resetWithCode(email: string, code: string, password: string): Promise<string | null> { if (!this.sb) return t('cloud.error'); const { error } = await this.sb.auth.verifyOtp({ email, token: code.replace(/\D/g, ''), type: 'recovery' }); if (error) return this.errText(error); const r = await this.sb.auth.updateUser({ password }); return r.error ? this.errText(r.error) : null; },
  async setPassword(password: string): Promise<string | null> { if (!this.sb || !this.user) return t('cloud.error'); const { error } = await this.sb.auth.updateUser({ password }); return error ? this.errText(error) : null; },
  async signOut() { if (!this.sb) return; await this.sb.auth.signOut(); this.user = null; toast(t('cloud.signedout')); this.changed(); },
  async afterSignIn() { const r = await this.pull(); if (!r) await this.push(); toast(t('cloud.linked', { u: this.label() }), 'ok'); },
  // bulut kaydi yereldekinden yeniyse (ya da yerel hesap yoksa) bulut kazanir
  async pull(): Promise<boolean> {
    if (!this.sb || !this.user) return false;
    const { data, error } = await this.sb.from('saves').select('data, updated_at').eq('profile', this.user.id).maybeSingle();
    if (error) { console.error(error); this.lastErr = error.message; return false; }
    if (!data) return false;
    const cloudAt = new Date(data.updated_at).getTime(), localAt = store.db.updatedAt || 0;
    const cloud = data.data as SaveV1;
    if (!store.db.account || cloudAt > localAt) { replace({ ...cloud, updatedAt: cloudAt }); toast(t('cloud.pulled'), 'ok'); this.changed(); return true; }
    return true;
  },
  schedulePush() { if (!this.sb || !this.user) return; clearTimeout(this._timer); this._timer = setTimeout(() => this.push(), 1500); },
  async push() {
    if (!this.sb || !this.user) return;
    const { error } = await this.sb.from('saves').upsert({ profile: this.user.id, data: store.db, updated_at: new Date(store.db.updatedAt || Date.now()).toISOString() });
    if (error) { console.error('push', error); this.lastErr = error.message; } else { this.lastPush = Date.now(); this.lastErr = ''; }
    this.changed();
  },
  statusText(): string {
    if (this.state === 'off') return t('cloud.off'); if (this.state === 'loading') return t('cloud.loading'); if (this.state === 'error') return t('cloud.error');
    if (!this.user) return t('cloud.guest');
    return `${this.label()} · ${this.lastErr ? this.lastErr : this.lastPush ? t('cloud.synced', { t: fmtTime(this.lastPush) }) : t('cloud.syncing')}`;
  },
};
onSave(() => CLOUD.schedulePush());
