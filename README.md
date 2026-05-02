# Taskflow — Personal Kanban

Modern, clean Kanban board built with React + Vite + Supabase + Tailwind CSS.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, @dnd-kit (drag & drop)
- **Backend/Auth**: Supabase (PostgreSQL + Auth + Row Level Security)
- **Hosting**: Vercel

---

## Setup Guide

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Open **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase-schema.sql` and click **Run**
4. Go to **Project Settings → API**
5. Copy your **Project URL** and **anon/public key**

### 2. Local Development

```bash
# Clone / navigate to project
cd kanban-app

# Install dependencies
npm install

# Create env file
cp .env.example .env
# Edit .env → fill in your Supabase URL and anon key

# Run dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Deploy to Vercel

#### Option A — Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts
# Add env vars when asked: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### Option B — Vercel Dashboard
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Framework preset: **Vite**
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**

---

## Features

- **Auth** — Email + password sign up / sign in with Supabase Auth
- **Kanban Board** — 3 columns: To Do · In Progress · Done
- **Drag & Drop** — Smooth card reordering and column moves via @dnd-kit
- **Task Fields** — Title, description, status, priority, due date, assignee, labels
- **Activity Log** — Every change logged; click any card to expand history
- **Search** — Live filter by title/description
- **Priority Filter** — Quick filter: All / High / Medium / Low
- **Progress Bar** — Live completion % in header
- **RLS** — Each user only sees their own data (Supabase Row Level Security)
- **Responsive** — Works on desktop and mobile

---

## Database Schema

```
tasks
  id, user_id, title, description, status,
  priority, due_date, labels[], assignee,
  position, created_at, updated_at

task_activities
  id, task_id, user_id, action, meta (jsonb), created_at
```

All tables use Row Level Security — users can only access their own rows.
