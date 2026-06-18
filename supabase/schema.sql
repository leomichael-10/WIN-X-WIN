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

-- REQUIRED: Run this function in your Supabase SQL editor after applying the table schema above.
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
