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
