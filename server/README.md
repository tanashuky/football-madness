# Sunucu tarafı (Sürüm 1) — Supabase

- `supabase/schema.sql`: Postgres şeması + RLS (profil, kulüp, kadro, taktik, maç, solo sezon, kozmetik, envanter, arkadaş, satın alma).
- `supabase/functions/verify-match`: Edge Function — istemcinin gönderdiği girdi kaydını aynı motorla koşturup skoru doğrular; `engine.ts` deploy öncesi `prototype/src/engine.ts`'ten kopyalanır.
- Depolama kovaları: `replays` (özel), `cosmetics` (herkese açık okuma).

Deploy (Supabase projesi açıldıktan sonra): `supabase link --project-ref <ref>` → `supabase db push` (schema.sql) → `cp ../prototype/src/engine.ts supabase/functions/verify-match/engine.ts && supabase functions deploy verify-match`. Anahtarlar: `SUPABASE_URL`, `SUPABASE_ANON_KEY` istemciye; `SUPABASE_SERVICE_ROLE_KEY` yalnız fonksiyon ortamında.
