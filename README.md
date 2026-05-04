<div align="center">

<img src="public/favicon.svg" width="80" height="80" alt="Taskflow Logo" />

# Taskflow

**Personal & Team Kanban — Built for Focus, Built for Progress**

*Kelola pekerjaan, pantau progres, dan evaluasi produktivitas dalam satu workspace.*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-kanbanproject--seven.vercel.app-2563eb?style=for-the-badge)](https://kanbanproject-seven.vercel.app)
[![Built with React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%2B%20Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?style=flat-square&logo=vercel)](https://vercel.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

---

[🇮🇩 Bahasa Indonesia](#-tentang-taskflow) · [🇬🇧 English](#-about-taskflow)

</div>

---

## 🖥️ Tampilan Aplikasi

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Taskflow  [Personal ▼]  🔍 Search…  [All ▼]  🔔  📅  📊  🏆  [+ New Task]  👤 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  📋 To Do  3 │  │ ⚡ Progress 2│  │ ⏳ Waiting 1 │  │ ✅  Done   5 │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │  │
│  │ │ Design   │ │  │ │ Backend  │ │  │ │ Review   │ │  │ │ Figma    │ │  │
│  │ │ [High]   │ │  │ │ [High]   │ │  │ │ Waiting  │ │  │ │ ~~Done~~ │ │  │
│  │ │ 📅 May 5 │ │  │ │ 📅 May 3 │ │  │ │ Vendor   │ │  │ │ ✅ 3/3   │ │  │
│  │ │ ████░ 2/3│ │  │ │ ██░░░ 1/3│ │  │ │ 📅 May 8 │ │  │ └──────────┘ │  │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │  │              │  │
│  │              │  │              │  │              │  │ ┌──────────┐ │  │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │              │  │ │ Research │ │  │
│  │ │ Testing  │ │  │ │ Frontend │ │  │              │  │ │ ~~Done~~ │ │  │
│  │ │ [Med]    │ │  │ │ [Med]    │ │  │              │  │ └──────────┘ │  │
│  │ └──────────┘ │  │ └──────────┘ │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# 🇮🇩 Tentang Taskflow

**Taskflow** adalah aplikasi manajemen tugas berbasis Kanban yang dirancang untuk individu maupun tim kecil. Dibangun dengan teknologi modern dan fokus pada kemudahan penggunaan, Taskflow membantu kamu tetap terorganisir, produktif, dan sadar akan progres pekerjaan setiap harinya.

---

## ✨ Fitur Lengkap

### 🗂️ Kanban Board — 4 Kolom Cerdas

| Kolom | Fungsi | Sorting |
|---|---|---|
| **To Do** | Daftar task yang perlu dikerjakan | Manual (drag & drop) |
| **In Progress** | Task yang sedang dikerjakan | Otomatis by due date terdekat |
| **Waiting / Blocked** | Task yang tertahan (nunggu vendor, approval, dll) | Otomatis by due date terdekat |
| **Done** | Task yang selesai | Manual |

- ✅ **Drag & drop** antar kolom dengan animasi halus
- ✅ **Wajib isi alasan** saat memindah task antar kolom (dengan preset alasan cepat)
- ✅ **Visual berbeda** untuk card Waiting/Blocked (border amber + badge pulse)
- ✅ **Scroll per kolom** — maksimal ~10 task terlihat, lebih dari itu scroll

### 📝 Task Detail yang Komprehensif

Setiap task bisa diisi dengan:
- **Judul & deskripsi** lengkap
- **Priority** — High / Medium / Low (dengan multiplier poin)
- **Due date** — otomatis highlight merah jika overdue, kuning jika hari ini
- **Assignee** — nama atau email PIC
- **Labels** — preset + custom label
- **Status** — bisa diubah langsung dari modal

### 📋 Tahapan Task (Subtask)

Setiap task bisa punya tahapan/subtask sendiri:
- Tambah tahapan satu per satu dengan nama + PIC email
- Status per tahapan: **To Do → In Progress → Done** (klik untuk cycle)
- **Progress bar** langsung terlihat di card kanban
- List tahapan bisa di-expand/collapse langsung dari card
- Nama PIC singkat (username sebelum @) ditampilkan di card

### 🕐 Activity Log & Update

- **Activity log** per task — semua perubahan tercatat otomatis
- **Quick note** langsung dari card (textarea inline, ⌘Enter untuk kirim)
- **Add Comment** panjang via tab di modal edit task
- Log termasuk alasan perpindahan kolom
- Tampilan note berbeda (bubble ungu) vs log sistem

### 📅 Kalender Aktivitas

- **View bulanan** — grid 7 kolom per minggu, persis GitHub contribution graph
- **View tahunan** — 12 bulan sekaligus, kotak mini per hari
- **3 layer data**: Due date (abu-abu) · Dibuat (biru) · Selesai (hijau)
- **Intensitas warna** — makin banyak task, makin pekat
- **Hover tooltip** — detail jumlah per kategori per hari
- Filter layer: Semua / Due Date / Dibuat / Selesai

### 📊 Laporan Performa

- **Trend 6 bulan** dengan grafik garis SVG + bar chart
- **4 KPI cards**: Selesai, Dibuat, Completion Rate%, Overdue
- **Badge tren** vs bulan lalu (↑+30% / ↓-10%)
- **Tabel detail** breakdown per bulan
- **Insight otomatis** — evaluasi berdasarkan data nyata
- Switch chart: Selesai / Dibuat / Rate% / Notes

### 🏆 Productivity Score

Sistem poin gamifikasi dengan penambah dan pengurang:

**Penambah:**
| Aksi | Poin |
|---|---|
| Task selesai (Done) | +5 × priority |
| Pindah kolom | +2 × priority |
| Buat task baru | +1 × priority |
| Tambah note/update | +1 × priority |
| Priority multiplier | High×3 · Med×2 · Low×1 |

**Pengurang:**
| Kondisi | Penalti |
|---|---|
| Hari tanpa aktivitas | −1 per hari |
| Task overdue | −2 per task |
| Minimum skor | 0 (tidak bisa minus) |

- **3 periode**: Today / Week / Month
- **Rank system**: Newbie → Starter → Active → Pro → Elite → Legendary 👑
- Stacked bar visualisasi gained vs penalty

### 🔔 Email Reminder Otomatis

- **H-1 deadline** → email pengingat 1 hari sebelum
- **Overdue** → email dikirim setiap hari sampai task diselesaikan atau due date diupdate
- **Jadwal**: setiap hari jam 06:00 WIB (via pg_cron)
- Email HTML yang rapi dengan detail task, priority, dan status
- Powered by **Resend** + **Supabase Edge Functions**

### 🔐 Auth & Keamanan

- Email + password sign up / sign in
- Session persists (tidak perlu login ulang)
- **Row Level Security (RLS)** — setiap user hanya bisa akses data miliknya sendiri
- Supabase Auth terintegrasi langsung

### 📱 Mobile Friendly

- Kolom stack vertikal di mobile, jejer di desktop
- **Touch drag & drop** — hold 200ms lalu seret
- Navbar responsif — label teks disembunyikan di layar kecil
- Scroll per kolom tetap berfungsi di mobile

---

## 🛠️ Tech Stack

```
Frontend    : React 18 + Vite + Tailwind CSS
Drag & Drop : @dnd-kit/core + @dnd-kit/sortable
Backend     : Supabase (PostgreSQL + Auth + RLS + Realtime)
Email       : Resend API
Cron Jobs   : Supabase pg_cron + Edge Functions (Deno)
Hosting     : Vercel
Fonts       : Sora + DM Sans + JetBrains Mono (Google Fonts)
Icons       : Lucide React
Date Util   : date-fns
```

---

## 🗄️ Database Schema

```
auth.users          ← Supabase built-in Auth

tasks               ← Task utama
  id, user_id, title, description, status, priority,
  due_date, labels[], assignee, position,
  created_at, updated_at

task_steps          ← Tahapan/subtask per task
  id, task_id, user_id, title, pic_email,
  status, position, created_at, updated_at

task_activities     ← Activity log setiap perubahan
  id, task_id, user_id, action, meta (jsonb), created_at

Semua tabel dilindungi Row Level Security (RLS)
```

---

## 🚀 Setup & Deploy

### Prerequisites
- Node.js 18+
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Vercel](https://vercel.com) (gratis)
- Akun [Resend](https://resend.com) (gratis, 3.000 email/bulan)

### 1. Clone & Install
```bash
git clone https://github.com/junn-a/kanban-project.git
cd kanban-project
npm install
```

### 2. Setup Supabase
1. Buat project baru di [supabase.com](https://supabase.com)
2. SQL Editor → New Query → paste & run `supabase-schema.sql`
3. SQL Editor → run `supabase-migration-steps.sql`
4. Settings → API → copy **Project URL** dan **anon key**

### 3. Environment Variables
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Run Development
```bash
npm run dev
# → http://localhost:5173
```

### 5. Deploy ke Vercel
```bash
# Via CLI
npm i -g vercel
vercel

# Atau push ke GitHub → import di vercel.com
# Tambah env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

### 6. Setup Email Reminder (Opsional)
Lihat panduan lengkap di [`REMINDER_SETUP.md`](./REMINDER_SETUP.md)

---

## 📁 Struktur Project

```
kanban-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AuthPage.jsx          ← Login & Register
│   │   ├── KanbanBoard.jsx       ← Main board + navbar
│   │   ├── KanbanColumn.jsx      ← Kolom dengan drop zone
│   │   ├── TaskCard.jsx          ← Card task + steps preview
│   │   ├── TaskModal.jsx         ← Create/edit task + tabs
│   │   ├── StepsTab.jsx          ← Manajemen tahapan task
│   │   ├── ActivityLog.jsx       ← Log aktivitas per task
│   │   ├── MoveReasonModal.jsx   ← Modal alasan pindah kolom
│   │   ├── CalendarModal.jsx     ← Heatmap kalender aktivitas
│   │   ├── ReportModal.jsx       ← Laporan performa 6 bulan
│   │   └── ScoreModal.jsx        ← Productivity score & rank
│   ├── hooks/
│   │   ├── useAuth.js            ← Auth state & actions
│   │   ├── useTasks.js           ← CRUD task + activity log
│   │   └── useSteps.js           ← CRUD tahapan task
│   ├── lib/
│   │   └── supabase.js           ← Supabase client
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   └── functions/
│       └── send-deadline-reminders/
│           └── index.ts          ← Edge function email
├── supabase-schema.sql           ← Schema awal
├── supabase-migration-steps.sql  ← Migration tahapan task
├── supabase-migration-waiting.sql← Migration kolom waiting
├── REMINDER_SETUP.md             ← Panduan setup email
└── vercel.json                   ← SPA routing config
```

---

## 🔧 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

---

# 🇬🇧 About Taskflow

**Taskflow** is a Kanban-based task management application designed for both individuals and small teams. Built with modern technologies and focused on ease of use, Taskflow helps you stay organized, productive, and aware of your work progress every day.

## ✨ Key Features

- **4-Column Kanban Board** — To Do, In Progress, Waiting/Blocked, Done
- **Smart Sorting** — In Progress & Waiting auto-sorted by nearest due date
- **Task Steps** — Subtask/checklist with PIC email per step, progress bar on card
- **Move Reason** — Required reason when moving tasks between columns (with presets)
- **Activity Log** — Every change logged automatically, viewable per task
- **Quick Notes** — Inline notes directly from card or long comments via modal
- **Activity Calendar** — GitHub-style heatmap, monthly & yearly view, 3 data layers
- **Performance Report** — 6-month trend chart, KPI cards, auto insights
- **Productivity Score** — Gamified points with daily idle penalty & overdue penalty
- **Email Reminders** — Automated H-1 & daily overdue reminders via Resend + pg_cron
- **Mobile Friendly** — Responsive layout with touch drag & drop support
- **Secure by Default** — Row Level Security ensures users only see their own data

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Drag & Drop | @dnd-kit |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Email | Resend API |
| Cron | Supabase pg_cron + Edge Functions |
| Hosting | Vercel |

## 🚀 Quick Start

```bash
git clone https://github.com/junn-a/kanban-project.git
cd kanban-project
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev
```

See full setup guide above (Indonesian section) or [`REMINDER_SETUP.md`](./REMINDER_SETUP.md) for email configuration.

---

<div align="center">

**© 2025 Taskflow. All rights reserved.**

Built with ❤️ using React · Supabase · Vercel

[![Live Demo](https://img.shields.io/badge/Try_it_now-→-2563eb?style=for-the-badge)](https://kanbanproject-seven.vercel.app)

</div>
