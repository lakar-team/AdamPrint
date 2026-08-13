-- AdamPrint — per-user printer-agent registry.
-- Run once in the Supabase SQL Editor (same project as ADAMTOOL).
-- Each user's agent publishes its current tunnel URL + token to their own row;
-- the website reads that row after login and connects automatically. RLS keeps
-- every user scoped to their own row only.

create table if not exists public.printer_agents (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  agent_url   text,
  agent_token text,
  host        text,
  updated_at  timestamptz not null default now()
);

alter table public.printer_agents enable row level security;

drop policy if exists "printer_agents_select_own" on public.printer_agents;
create policy "printer_agents_select_own" on public.printer_agents
  for select using (auth.uid() = user_id);

drop policy if exists "printer_agents_insert_own" on public.printer_agents;
create policy "printer_agents_insert_own" on public.printer_agents
  for insert with check (auth.uid() = user_id);

drop policy if exists "printer_agents_update_own" on public.printer_agents;
create policy "printer_agents_update_own" on public.printer_agents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- keep updated_at fresh on every upsert
create or replace function public.touch_printer_agents() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_touch_printer_agents on public.printer_agents;
create trigger trg_touch_printer_agents before insert or update on public.printer_agents
  for each row execute function public.touch_printer_agents();
