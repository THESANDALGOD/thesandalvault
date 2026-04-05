-- ============================================
-- SANDAL STREAM — Add artwork, video, lyrics + messages
-- Run in Supabase SQL Editor
-- ============================================

alter table public.tracks add column if not exists artwork_path text;
alter table public.tracks add column if not exists video_path text;
alter table public.tracks add column if not exists lyrics text;
alter table public.tracks add column if not exists is_private boolean default false;
alter table public.tracks add column if not exists sort_order integer default 0;

-- Anonymous messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "Anyone can read messages" on public.messages for select using (true);
create policy "Anyone can insert messages" on public.messages for insert with check (true);
create policy "Anyone can delete messages" on public.messages for delete using (true);
