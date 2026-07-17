-- MorphMatch initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.saved_comps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  -- Either {"kind":"custom","label":"Me","stats":{...}} or {"kind":"athlete","athleteId":"..."}
  subject jsonb not null,
  target_athlete_id text not null,
  mode text not null default 'overlay',
  created_at timestamptz not null default now()
);

alter table public.saved_comps enable row level security;

create policy "Users can read their own comps"
  on public.saved_comps for select
  using (auth.uid() = user_id);

create policy "Users can save their own comps"
  on public.saved_comps for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own comps"
  on public.saved_comps for delete
  using (auth.uid() = user_id);

create index if not exists saved_comps_user_created_idx
  on public.saved_comps (user_id, created_at desc);
