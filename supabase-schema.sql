-- ============================================================
-- Taskflow Kanban — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. TASKS table
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'todo' check (status in ('todo','inprogress','done')),
  priority    text not null default 'medium' check (priority in ('low','medium','high')),
  due_date    date,
  labels      text[] default '{}',
  assignee    text,
  position    int not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. ACTIVITY LOG table  (stores every change per task)
create table if not exists public.task_activities (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,   -- e.g. 'created', 'moved', 'updated', 'completed'
  meta        jsonb,           -- extra context: { from, to, field, value }
  created_at  timestamptz default now()
);

-- 3. Enable RLS
alter table public.tasks           enable row level security;
alter table public.task_activities enable row level security;

-- 4. RLS policies — users only see / modify their own data
create policy "tasks: own rows" on public.tasks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "activities: own rows" on public.task_activities
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- 6. Indexes
create index if not exists tasks_user_status on public.tasks(user_id, status);
create index if not exists activities_task_id on public.task_activities(task_id, created_at desc);
