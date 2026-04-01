-- ============================================================
-- Social migration — session 10.
-- Kør i Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================


-- 1. follows tabel
-- ============================================================
create table if not exists follows (
  follower_id   uuid not null references auth.users(id) on delete cascade,
  following_id  uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;

-- Alle kan se hvem der følger hvem (nødvendigt for feed og profil)
drop policy if exists "Læs follows" on follows;
create policy "Læs follows" on follows
  for select using (true);

-- Kun du selv kan følge/affølge
drop policy if exists "Administrer egne follows" on follows;
create policy "Administrer egne follows" on follows
  for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

create index if not exists idx_follows_follower  on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);


-- 2. profiles — tilføj username, søgbarhed og invite-token
-- ============================================================
alter table profiles
  add column if not exists username            text unique,
  add column if not exists searchable          boolean not null default true,
  add column if not exists profile_invite_token text unique default gen_random_uuid()::text;

-- Unik index på username (kun for ikke-null værdier)
create unique index if not exists idx_profiles_username
  on profiles(username)
  where username is not null;

-- Alle kan læse profiler (nødvendigt for brugersøgning og følge-system)
drop policy if exists "Læs profiler" on profiles;
create policy "Læs profiler" on profiles
  for select using (true);

-- Kun du selv kan redigere din profil
drop policy if exists "Rediger egen profil" on profiles;
create policy "Rediger egen profil" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- 3. user_content RLS — åbn for sociale reads fra følgere
-- ============================================================
-- Den eksisterende "Eget indhold"-policy dækker al read/write på egne rækker.
-- Vi tilføjer en ny SELECT-only policy så følgere kan se ratings fra folk de følger.
-- RLS bruger OR-logik: en række vises hvis ÉN af policierne giver adgang.

drop policy if exists "Sociale ratings" on user_content;
create policy "Sociale ratings" on user_content
  for select
  using (
    watched = true
    and rating is not null
    and exists (
      select 1 from follows
      where follower_id = auth.uid()
        and following_id = user_content.user_id
    )
  );


-- ============================================================
-- Verificering — kør disse for at tjekke at alt gik godt
-- ============================================================
-- select count(*) from follows;
-- select column_name from information_schema.columns where table_name = 'profiles' and column_name in ('username', 'searchable', 'profile_invite_token');
-- select policyname from pg_policies where tablename = 'user_content';
