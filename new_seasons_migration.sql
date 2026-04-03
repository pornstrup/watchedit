-- Notifications tabel
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  tmdb_id    integer not null,
  media_type text not null,
  payload    jsonb not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on notifications (user_id, created_at desc);
create index if not exists notifications_user_read_idx on notifications (user_id, read);

alter table notifications enable row level security;

create policy "own notifications" on notifications
  for all using (auth.uid() = user_id);

-- known_seasons tracker på watchlist_items
alter table watchlist_items
  add column if not exists known_seasons integer;
