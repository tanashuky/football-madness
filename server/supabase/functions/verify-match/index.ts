// Supabase Edge Function (Deno): maç doğrulama. İstemci { kind, minutes, replay } gönderir; aynı motor baştan koşturulur,
// hash ve skor karşılaştırılır; eşleşirse maç 'verified' olarak yazılır, lig/Elo güncellenir. Motor dosyası derlemede
// prototype/src/engine.ts'ten kopyalanır (tek kaynak). Deploy: supabase functions deploy verify-match
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyReplay } from './engine.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const txt = (body: string, status: number) => new Response(body, { status, headers: CORS });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return txt('unauthorized', 401);
    const body = await req.json();
    const { kind, minutes, replay } = body;
    if (!replay || !Array.isArray(replay.cmds) || typeof replay.steps !== 'number') return txt('bad replay', 400);
    if (replay.steps > 200000 || JSON.stringify(replay).length > 4_000_000) return txt('replay too large', 413);
    const t0 = Date.now();
    const v = verifyReplay(replay);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let { data: club } = await admin.from('clubs').select('id').eq('owner', u.user.id).maybeSingle();
    if (!club) { const t = replay.teams?.[body.side ?? 0] ?? {}; const ins = await admin.from('clubs').insert({ owner: u.user.id, name: t.name ?? 'Kulüp', short: t.short ?? 'KLP', color: t.color ?? null }).select('id').single(); club = ins.data; }
    const row = { kind: kind ?? 'friendly', minutes: minutes ?? 10, home: club?.id ?? null, opp_template: body.opp ?? null, seed: replay.seed, reported_score: replay.score, verified_score: v.score, reported_hash: replay.hash, verified_hash: v.hash, status: v.ok ? 'verified' : 'rejected', verified_at: new Date().toISOString() };
    const { data: m, error } = await admin.from('matches').insert(row).select('id').single();
    if (error) return txt(error.message, 500);
    // kayıt dosyası (gzip) depoya: replays/<id>.json.gz
    try {
      const gz = new Response(new Blob([JSON.stringify(replay)]).stream().pipeThrough(new CompressionStream('gzip')));
      const up = await admin.storage.from('replays').upload(`${m.id}.json.gz`, await gz.arrayBuffer(), { contentType: 'application/gzip' });
      if (!up.error) await admin.from('matches').update({ replay_path: `replays/${m.id}.json.gz` }).eq('id', m.id);
    } catch (e) { console.error('replay upload', e); }
    return new Response(JSON.stringify({ id: m.id, ok: v.ok, score: v.score, ms: Date.now() - t0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return txt(String(e), 500);
  }
});
