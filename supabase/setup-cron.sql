-- ============================================================
-- Taskflow — Email Reminder Setup
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Aktifkan pg_cron extension
--    (Supabase: Settings > Database > Extensions > cron → Enable)
--    Atau jalankan query ini:
create extension if not exists pg_cron;

-- 2. Buat cron job — jalan setiap hari jam 01:00 UTC (08:00 WIB)
--    Format: (menit jam hari bulan hari-minggu)
select cron.schedule(
  'taskflow-deadline-reminders',   -- nama job (unik)
  '0 1 * * *',                     -- setiap hari jam 01:00 UTC
  $$
    select net.http_post(
      url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-deadline-reminders',
      headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
      body   := '{}'::jsonb
    );
  $$
);

-- Ganti <PROJECT_REF> dengan project ref kamu (ada di Settings > General)
-- Ganti <SUPABASE_ANON_KEY> dengan anon key kamu

-- 3. Cek cron jobs yang aktif
select * from cron.job;

-- 4. Cek log eksekusi (setelah pertama jalan)
select * from cron.job_run_details order by start_time desc limit 20;

-- 5. Hapus job jika perlu
-- select cron.unschedule('taskflow-deadline-reminders');


-- ============================================================
-- VIEW helper: tasks yang akan/sudah deadline (untuk debug)
-- ============================================================
create or replace view public.deadline_tasks as
select
  t.id,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  t.user_id,
  u.email,
  case
    when t.due_date = current_date + interval '1 day' then 'tomorrow'
    when t.due_date < current_date                    then 'overdue'
    else 'upcoming'
  end as deadline_type,
  (current_date - t.due_date) as days_overdue
from public.tasks t
join auth.users u on u.id = t.user_id
where t.status != 'done'
  and t.due_date is not null
  and t.due_date <= current_date + interval '1 day'
order by t.due_date asc;

-- Cek view:
-- select * from deadline_tasks;
