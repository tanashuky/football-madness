-- Football Madness · Adım 2: maç kayıtları (sunucu doğrulaması) + kayıt deposu
do $$ begin
  create type match_kind as enum ('solo_league', 'cup', 'friendly', 'online');
exception when duplicate_object then null; end $$;
do $$ begin
  create type match_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null, short text not null, color text, color2 text,
  elo int default 1000, played int default 0,
  created_at timestamptz default now(),
  unique (owner)
);
alter table public.clubs enable row level security;
drop policy if exists "own club" on public.clubs;
create policy "own club" on public.clubs for all using (auth.uid() = owner) with check (auth.uid() = owner);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  kind match_kind not null,
  home uuid references public.clubs(id), away uuid references public.clubs(id),
  opp_template text,
  seed bigint not null,
  reported_score int[] not null, verified_score int[],
  reported_hash bigint not null, verified_hash bigint,
  status match_status default 'pending',
  replay_path text, stats jsonb,
  minutes int not null, played_at timestamptz default now(), verified_at timestamptz
);
alter table public.matches enable row level security;
drop policy if exists "own matches read" on public.matches;
create policy "own matches read" on public.matches for select
  using (exists (select 1 from public.clubs c where (c.id = home or c.id = away) and c.owner = auth.uid()));

insert into storage.buckets (id, name, public) values ('replays', 'replays', false) on conflict (id) do nothing;
