create table if not exists public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.run_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.run_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '跑友',
  color text not null default '#1677FF',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.run_locations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.run_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision not null default 0,
  speed_kmh double precision not null default 0,
  distance_km double precision not null default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists run_locations_session_recorded_idx
  on public.run_locations (session_id, recorded_at desc);

alter table public.run_sessions enable row level security;
alter table public.run_participants enable row level security;
alter table public.run_locations enable row level security;

create or replace function public.is_run_participant(run_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.run_participants
    where session_id = run_session_id
      and user_id = auth.uid()
  );
$$;

drop policy if exists "Users can create run sessions" on public.run_sessions;
drop policy if exists "Run participants can read sessions" on public.run_sessions;
drop policy if exists "Owners can update run sessions" on public.run_sessions;
drop policy if exists "Participants can read participants" on public.run_participants;
drop policy if exists "Users can read own participant row" on public.run_participants;
drop policy if exists "Users can join runs as themselves" on public.run_participants;
drop policy if exists "Users can update own participant row" on public.run_participants;
drop policy if exists "Participants can read run locations" on public.run_locations;
drop policy if exists "Users can insert own run locations" on public.run_locations;

create policy "Users can create run sessions"
  on public.run_sessions
  for insert
  with check (auth.uid() = owner_id);

create policy "Run participants can read sessions"
  on public.run_sessions
  for select
  using (
    (auth.uid() is not null and status = 'active')
    or auth.uid() = owner_id
    or public.is_run_participant(run_sessions.id)
  );

create policy "Owners can update run sessions"
  on public.run_sessions
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Participants can read participants"
  on public.run_participants
  for select
  using (
    auth.uid() = user_id
    or public.is_run_participant(run_participants.session_id)
  );

create policy "Users can read own participant row"
  on public.run_participants
  for select
  using (auth.uid() = user_id);

create policy "Users can join runs as themselves"
  on public.run_participants
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own participant row"
  on public.run_participants
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Participants can read run locations"
  on public.run_locations
  for select
  using (public.is_run_participant(run_locations.session_id));

create policy "Users can insert own run locations"
  on public.run_locations
  for insert
  with check (
    auth.uid() = user_id
    and public.is_run_participant(run_locations.session_id)
  );

do $$
begin
  alter publication supabase_realtime add table public.run_participants;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.run_locations;
exception
  when duplicate_object then null;
end $$;
