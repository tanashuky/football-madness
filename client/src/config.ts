// Istemci yapilandirmasi. Supabase "publishable" anahtari tarayiciya gitmek icin tasarlanmistir (RLS korur); gizli anahtar asla buraya girmez.
// localStorage 'fm.cloud' ({url, anon, providers}) test icin bunu gecersiz kilar.
export const CONFIG = {
  supabaseUrl: 'https://hukoepbvntsksefzguxl.supabase.co',
  supabaseAnon: 'sb_publishable_8m8DORbwGcE-tiWPMfGV2g_tg3k2TEU',
  providers: 'email', // 'email' | 'email,google,apple,facebook' (saglayici Supabase'de acilinca)
  // true: dogrulama ve sifre sifirlama e-postasinda 6 haneli kod var (ozel SMTP + sablon gerekir); false: e-postada yalniz baglanti var
  emailCodes: false,
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm',
  demoUrl: '../', // eski demo (gelistirici sayfasi ve Team play)
};
