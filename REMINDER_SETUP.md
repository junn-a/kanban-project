# Setup Email Reminder — Taskflow

Email otomatis dikirim setiap hari jam **08:00 WIB** untuk:
- **H-1** → task deadline besok
- **Overdue** → task yang sudah lewat deadline, dikirim **setiap hari** sampai diselesaikan atau due date diupdate

Stack: **Supabase Edge Functions** + **pg_cron** + **Resend**

---

## Estimasi Waktu Setup: ~15 menit

---

## Step 1 — Daftar Resend (5 menit)

1. Buka [resend.com](https://resend.com) → **Sign Up** (gratis, 3.000 email/bulan)
2. Masuk ke **API Keys** → **Create API Key**
3. Beri nama `taskflow-reminders`, permission **Full Access**
4. Copy API key-nya (format: `re_xxxxxxxxxxxx`) — **simpan, hanya muncul sekali**

### (Opsional tapi direkomendasikan) Verifikasi domain

Jika ingin email dari domain sendiri (misal `reminders@domainmu.com`):
- Resend → **Domains** → Add Domain → ikuti instruksi DNS
- Update baris `from:` di `index.ts`:
  ```
  from: 'Taskflow <reminders@domainmu.com>',
  ```

Jika skip verifikasi domain, Resend tetap bisa kirim tapi dari domain `onboarding@resend.dev` (oke untuk testing/personal).

---

## Step 2 — Deploy Edge Function (5 menit)

### Install Supabase CLI
```bash
npm install -g supabase
```

### Login & link project
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
# Project ref ada di: Supabase Dashboard → Settings → General
```

### Deploy function
```bash
supabase functions deploy send-deadline-reminders --no-verify-jwt
```

Atau jalankan script:
```bash
bash deploy-reminders.sh
```

---

## Step 3 — Set Environment Secrets (2 menit)

Di **Supabase Dashboard → Settings → Edge Functions → Secrets**, tambahkan:

| Secret Name | Value |
|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` (dari Step 1) |

> `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah otomatis tersedia di Edge Functions, tidak perlu ditambahkan manual.

---

## Step 4 — Setup pg_cron (3 menit)

1. Buka **Supabase Dashboard → SQL Editor → New Query**
2. Aktifkan extension (atau via Settings → Database → Extensions → cron):
   ```sql
   create extension if not exists pg_cron;
   ```
3. Buka file `supabase/setup-cron.sql`, ganti dua placeholder:
   - `<PROJECT_REF>` → project ref kamu (dari Settings → General)
   - `<SUPABASE_ANON_KEY>` → anon key kamu (dari Settings → API)
4. Jalankan query tersebut

---

## Step 5 — Test Manual

### Via Supabase Dashboard
1. **Edge Functions** → `send-deadline-reminders` → **Invoke**
2. Body: `{}`
3. Cek response — harusnya `{"success":true,"sent":N,...}`

### Via curl
```bash
curl -X POST \
  'https://<PROJECT_REF>.supabase.co/functions/v1/send-deadline-reminders' \
  -H 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Cek apakah ada task yang akan di-remind
```sql
select * from deadline_tasks;
```

---

## Cek Log Cron

```sql
-- Lihat history eksekusi cron
select * from cron.job_run_details 
order by start_time desc 
limit 10;
```

---

## Troubleshooting

**Email tidak terkirim:**
- Cek Resend Dashboard → Logs → apakah ada error
- Pastikan `RESEND_API_KEY` sudah di-set di Supabase Secrets
- Cek apakah task punya `due_date` yang terisi

**pg_cron error:**
- Pastikan extension `pg_cron` sudah aktif
- Pastikan `<PROJECT_REF>` dan `<SUPABASE_ANON_KEY>` sudah diganti dengan benar

**Edge function error:**
- Supabase Dashboard → Edge Functions → `send-deadline-reminders` → Logs

---

## Contoh Email

- **H-1**: Subject `🔔 2 task deadline besok — Taskflow`
- **Overdue**: Subject `⚠️ 1 task melewati deadline — Taskflow`

Email berisi: judul task, deskripsi singkat, priority badge, status, assignee, tanggal deadline, tombol "Buka Taskflow".
