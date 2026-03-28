-- ============================================================
-- user_content migration
-- Kør i Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================


-- 1. Opret tabel
-- ============================================================
create table if not exists user_content (
  user_id        uuid not null references auth.users(id) on delete cascade,
  tmdb_id        integer not null,
  media_type     text not null check (media_type in ('movie', 'tv')),

  -- Interesse-signal (fra watchlist)
  on_list        boolean not null default false,
  want_since     timestamptz,

  -- Visning
  watched        boolean not null default false,
  watched_at     timestamptz,

  -- Mening (valgfrit)
  rating         integer check (rating between 1 and 5),
  note           text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  primary key (user_id, tmdb_id, media_type)
);


-- 2. updated_at trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Genbruges på tværs af tabeller — kun opret trigger hvis den ikke allerede eksisterer
drop trigger if exists user_content_updated_at on user_content;
create trigger user_content_updated_at
  before update on user_content
  for each row execute function update_updated_at();


-- 3. Indexes
-- ============================================================

-- Brugerens profil-side: alle titler for én bruger
create index if not exists idx_user_content_user_id
  on user_content(user_id);

-- Aktivitetsfeed: hvad har brugeren set for nylig (kun sete titler)
create index if not exists idx_user_content_watched_at
  on user_content(user_id, watched_at desc)
  where watched = true;

-- Social discovery: hvem har set denne film + hvad syntes de
create index if not exists idx_user_content_tmdb
  on user_content(tmdb_id, media_type)
  where watched = true;


-- 4. RLS
-- ============================================================
alter table user_content enable row level security;

-- Brugeren kan læse og skrive sin egen data
drop policy if exists "Eget indhold" on user_content;
create policy "Eget indhold" on user_content
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 5. Backfill eksisterende data fra watchlist_items
-- ============================================================

-- "done" items → watched = true
insert into user_content (user_id, tmdb_id, media_type, on_list, watched, watched_at)
select
  owner_id,
  tmdb_id,
  media_type,
  true,
  true,
  coalesce(updated_at, added_at)
from watchlist_items
where status = 'done'
  and deleted_at is null
on conflict (user_id, tmdb_id, media_type) do update
  set watched     = true,
      watched_at  = coalesce(excluded.watched_at, user_content.watched_at),
      on_list     = true,
      updated_at  = now();

-- "want" + "watching" items → on_list = true
insert into user_content (user_id, tmdb_id, media_type, on_list, want_since)
select
  owner_id,
  tmdb_id,
  media_type,
  true,
  added_at
from watchlist_items
where status in ('want', 'watching')
  and deleted_at is null
on conflict (user_id, tmdb_id, media_type) do update
  set on_list    = true,
      want_since = coalesce(user_content.want_since, excluded.want_since),
      updated_at = now();


-- 6. group_reactions tabel (fra session 8 — kør hvis ikke allerede gjort)
-- ============================================================
create table if not exists group_reactions (
  id                      uuid primary key default gen_random_uuid(),
  group_watchlist_item_id uuid not null references group_watchlist_items(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  created_at              timestamptz not null default now(),
  unique (group_watchlist_item_id, user_id)
);

alter table group_reactions enable row level security;

drop policy if exists "Gruppe-reaktioner" on group_reactions;
create policy "Gruppe-reaktioner" on group_reactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Læs-adgang til alle gruppe-reaktioner (for at vise count til alle gruppemedlemmer)
drop policy if exists "Læs reaktioner" on group_reactions;
create policy "Læs reaktioner" on group_reactions
  for select
  using (true);


-- ============================================================
-- Verificering — kør disse for at tjekke at alt gik godt
-- ============================================================
-- select count(*) from user_content;
-- select * from user_content limit 10;
-- select count(*) from group_reactions;
