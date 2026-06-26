-- Create players table
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  money integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger players_updated_at
  before update on players
  for each row execute function update_updated_at();

-- Allow public read/write (for event use — no auth needed)
alter table players enable row level security;
create policy "Public read" on players for select using (true);
create policy "Public insert" on players for insert with check (true);
create policy "Public update" on players for update using (true);

-- ── challenge_completions table ────────────────────────────────────────────
-- Run this block ONCE in Supabase SQL Editor (after the players table exists).

create table if not exists challenge_completions (
  id             uuid        primary key default gen_random_uuid(),
  player_name    text        not null,
  avatar_url     text,
  challenge_text text        not null,
  status         text        not null default 'pending',
  reward         integer     not null default 0,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

-- Fast lookup by status (dealer queue polls this)
create index if not exists challenge_completions_status_idx
  on challenge_completions (status, created_at);

alter table challenge_completions enable row level security;

-- Players can read their own completion status via the GET /status route
create policy "Public read completions"
  on challenge_completions for select using (true);

-- All writes go through API routes using the service key (bypasses RLS).

-- ── REQUIRED: Run this function in your Supabase SQL editor after applying the table schema above.
-- Atomic money upsert: insert new player or add delta to existing
create or replace function upsert_player_money(
  p_name text,
  p_money_delta integer,
  p_avatar_url text default null
)
returns setof players
language plpgsql
as $$
begin
  insert into players (name, money, avatar_url)
  values (p_name, p_money_delta, p_avatar_url)
  on conflict (name) do update
    set money = players.money + p_money_delta,
        avatar_url = coalesce(p_avatar_url, players.avatar_url),
        updated_at = now();

  return query select * from players where name = p_name;
end;
$$;
