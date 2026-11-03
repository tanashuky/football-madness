-- Football Madness – Sürüm 1 veri şeması (Supabase / Postgres). Dilim 2b taslağı; kimlik auth.users üzerinden.
-- İlke: istemci yalnız kendi satırlarını okur/yazar (RLS); maç sonuçları yalnız doğrulama fonksiyonu (service_role) yazar.

create extension if not exists "pgcrypto";

-- Profil: her auth kullanıcısına bir kulüp
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,                      -- oyuncu adı (benzersiz, filtre)
  created_at timestamptz default now(),
  last_seen timestamptz default now(),
  premium_until timestamptz,               -- Premium bitiş (reklamsız + haftalık güçlendirme)
  settings jsonb default '{}'::jsonb        -- kontrol şeması, kamera, yardım seviyeleri
);

create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  name text not null, short text not null, color text not null, color2 text,
  crest jsonb default '{}'::jsonb,         -- kozmetik seçimleri (şekil, simge, renkler)
  kit jsonb default '{}'::jsonb,
  gg int default 62,                       -- genel güç (ekonomi/antrenman ilerledikçe sunucu günceller)
  fm bigint default 0,                     -- oyun içi para (FM) — yalnız sunucu yazar
  pp int default 0,                        -- prim para — yalnız sunucu yazar (satın alma doğrulaması)
  elo int default 1000, played int default 0,
  created_at timestamptz default now(),
  unique (owner)
);

-- Kadro: kalıcı kimlikli oyuncular (forma numarası 1–99, takımda benzersiz)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  club uuid not null references clubs(id) on delete cascade,
  name text not null, nat_pos text not null, num int not null check (num between 1 and 99),
  gg int not null, age int not null, traits text[] default '{}', fatigue real default 0,
  unique (club, num)
);

-- Taktik: tahta kayıtları (formasyon, doktrin, talimatlar, şekiller, görevler, kurallar, rotasyonlar, diziliş)
create table if not exists tactics (
  id uuid primary key default gen_random_uuid(),
  club uuid not null references clubs(id) on delete cascade,
  name text default 'Ana taktik',
  data jsonb not null,                     -- TacticIn + duties + rules(id) + rotations(id[]) + lineup(id[])
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Maç kayıtları: istemci sonucu + girdi kaydını gönderir, sunucu doğrular ve kesinleştirir
create type match_kind as enum ('solo_league', 'cup', 'friendly', 'online');
create type match_status as enum ('pending', 'verified', 'rejected');
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  kind match_kind not null,
  home uuid references clubs(id), away uuid references clubs(id),   -- bot rakipte null + opp_template
  opp_template text,
  seed bigint not null,
  reported_score int[] not null,           -- istemcinin bildirdiği
  verified_score int[],                    -- sunucunun ürettiği
  reported_hash bigint not null, verified_hash bigint,
  status match_status default 'pending',
  replay_path text,                        -- storage: replays/<id>.json.gz
  stats jsonb,                             -- doğrulanmış özet (şut, xG, sahip olma…)
  minutes int not null, played_at timestamptz default now(), verified_at timestamptz
);

-- Solo lig durumu (sezon tablosu, fikstür) kulübe bağlı
create table if not exists solo_seasons (
  id uuid primary key default gen_random_uuid(),
  club uuid not null references clubs(id) on delete cascade,
  season int not null,
  data jsonb not null,                     -- fikstür, puan tablosu, hafta
  unique (club, season)
);

-- Kozmetik katalog ve sahiplik
create table if not exists cosmetics (
  id text primary key,                     -- dosya adı kökü: kit_hoops_v1
  type text not null,                      -- kit | crest | ball | stadium | goalfx | frame | flag
  name_tr text, name_en text, tier text check (tier in ('A','B','C','D')),
  season int, visible boolean default false, price_pp int,
  asset_path text                          -- storage: cosmetics/<id>.<ext>
);
create table if not exists inventory (
  club uuid references clubs(id) on delete cascade,
  cosmetic text references cosmetics(id),
  acquired_at timestamptz default now(),
  primary key (club, cosmetic)
);

-- Arkadaşlar
create table if not exists friendships (
  a uuid references profiles(id) on delete cascade,
  b uuid references profiles(id) on delete cascade,
  status text check (status in ('pending','accepted','blocked')) default 'pending',
  created_at timestamptz default now(),
  primary key (a, b)
);

-- Satın alma kayıtları (mağaza makbuzu sunucuda doğrulanır; PP yalnız buradan artar)
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  profile uuid references profiles(id) on delete cascade,
  store text check (store in ('apple','google')), product text not null, receipt text not null,
  status text check (status in ('pending','valid','invalid','refunded')) default 'pending',
  created_at timestamptz default now()
);

-- RLS: herkes kendi satırını
alter table profiles enable row level security;
alter table clubs enable row level security;
alter table players enable row level security;
alter table tactics enable row level security;
alter table matches enable row level security;
alter table solo_seasons enable row level security;
alter table inventory enable row level security;
alter table friendships enable row level security;
alter table purchases enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own club" on clubs for select using (auth.uid() = owner);
create policy "own club update" on clubs for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "own players" on players for all using (exists (select 1 from clubs c where c.id = club and c.owner = auth.uid()));
create policy "own tactics" on tactics for all using (exists (select 1 from clubs c where c.id = club and c.owner = auth.uid()));
create policy "own matches read" on matches for select using (exists (select 1 from clubs c where (c.id = home or c.id = away) and c.owner = auth.uid()));
create policy "own seasons" on solo_seasons for all using (exists (select 1 from clubs c where c.id = club and c.owner = auth.uid()));
create policy "own inventory read" on inventory for select using (exists (select 1 from clubs c where c.id = club and c.owner = auth.uid()));
create policy "friends" on friendships for all using (auth.uid() = a or auth.uid() = b);
create policy "own purchases read" on purchases for select using (auth.uid() = profile);
-- Not: FM/PP/gg/elo sütunları istemciden güncellenmez: ayrı bir "clubs_client_update" görünümü ya da kolon düzeyi yetkiyle kısıtlanır (deploy adımında).

-- Bulut kayit (Dilim 2b ilk adim): istemcinin yerel kaydinin tamami (jsonb); normalize tablolar Sürüm 1'de doldurulur
create table if not exists saves (
  profile uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table saves enable row level security;
create policy "own save" on saves for all using (auth.uid() = profile) with check (auth.uid() = profile);
