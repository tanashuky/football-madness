-- Football Madness · Adım 1: bulut kaydı tablosu (Supabase SQL Editor'e yapıştır, Run)
create table if not exists public.saves (
  profile uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table public.saves enable row level security;
drop policy if exists "own save" on public.saves;
create policy "own save" on public.saves for all
  using (auth.uid() = profile) with check (auth.uid() = profile);
