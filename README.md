# ⚡ Taskflow — Personal Kanban

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)

**Taskflow** adalah aplikasi Kanban modern yang dirancang untuk produktivitas personal. Dibangun dengan fokus pada kecepatan, pengalaman pengguna yang mulus (Drag & Drop), dan keamanan data tingkat tinggi.

[Demo Langsung](https://your-demo-link.vercel.app) · [Laporkan Bug](https://github.com/username/repo/issues) · [Ajukan Fitur](https://github.com/username/repo/issues)

---

## 📸 Tampilan Aplikasi

*Berikut adalah tampilan antarmuka Taskflow yang bersih dan intuitif:*

| Board View | Task Detail & Activity |
| :--- | :--- |
| ![Main Board](https://via.placeholder.com/800x450?text=Placeholder+Screenshot+Main+Board) | ![Task Details](https://via.placeholder.com/800x450?text=Placeholder+Screenshot+Task+Details) |
| *Antarmuka Kanban dengan Drag & Drop yang mulus.* | *Detail tugas lengkap dengan riwayat aktivitas.* |

---

## ✨ Fitur Unggulan

- 🔐 **Secure Auth** — Sistem login & daftar yang aman dikelola oleh Supabase Auth.
- 🏗️ **Smart Kanban** — 3 kolom (To Do, In Progress, Done) dengan sistem *positioning* otomatis.
- 🖱️ **Smooth Drag & Drop** — Pengalaman memindahkan kartu yang natural berkat `@dnd-kit`.
- 📝 **Rich Task Details** — Kelola judul, deskripsi, prioritas, tanggal jatuh tempo, hingga label.
- 📜 **Activity Log** — Lacak setiap perubahan (audit log) pada setiap tugas secara otomatis.
- 🔍 **Real-time Filter** — Cari tugas atau filter berdasarkan prioritas secara instan.
- 📊 **Progress Bar** — Indikator visual pencapaian tugas di bagian header.
- 📱 **Fully Responsive** — Akses lancar dari perangkat mobile maupun desktop.
- 🛡️ **RLS Security** — *Row Level Security* memastikan data Anda tidak bisa diintip pengguna lain.

---

## 🛠️ Tech Stack

- **Core**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **State & Drag**: `@dnd-kit` untuk interaksi Kanban
- **Backend-as-a-Service**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: Vercel

---

## 🚀 Panduan Instalasi Cepat

### 1. Persiapan Database (Supabase)
1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Buka **SQL Editor** dan buat query baru.
3. Tempel isi file `supabase-schema.sql` dan klik **Run**.
4. Masuk ke **Project Settings > API**, simpan `Project URL` dan `anon/public key`.

### 2. Jalankan di Lokal
```bash
# Clone repositori
git clone [https://github.com/username/taskflow.git](https://github.com/username/taskflow.git)
cd taskflow

# Instal dependensi
npm install

# Konfigurasi Environment
cp .env.example .env
# Edit .env dan masukkan kredensial Supabase Anda

Jalankan server pengembangan:

Bash
npm run dev
Aplikasi akan berjalan di http://localhost:5173.

📤 Deployment (Vercel)
Aplikasi ini siap di-deploy ke Vercel hanya dalam hitungan detik:

Hubungkan repo GitHub Anda ke Vercel.

Gunakan preset Vite.

Tambahkan Environment Variables berikut di dashboard Vercel:

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

Klik Deploy!

📊 Struktur Database
Taskflow menggunakan relasi PostgreSQL yang efisien:

Cuplikan kode
erDiagram
    USERS ||--o{ TASKS : creates
    TASKS ||--o{ TASK_ACTIVITIES : logs
    TASKS {
        uuid id PK
        uuid user_id FK
        string title
        text description
        string status
        string priority
        date due_date
        float position
    }
    TASK_ACTIVITIES {
        uuid id PK
        uuid task_id FK
        string action
        jsonb meta
        timestamp created_at
    }
🤝 Kontribusi
Kontribusi selalu terbuka! Silakan fork repositori ini, buat fitur baru, dan kirimkan Pull Request.

Fork Proyek

Buat Branch Fitur (git checkout -b fitur/FiturMantap)

Commit Perubahan (git commit -m 'Menambahkan fitur mantap')

Push ke Branch (git push origin fitur/FiturMantap)

Buka Pull Request

Dibuat dengan ❤️ oleh Nama Anda


---

### Tips Tambahan untuk Membuatnya Lebih "Powerful":

1.  **Ganti Placeholder Gambar**: Setelah kamu mengambil screenshot aplikasi, simpan gambarnya di folder `public/screenshots/` di repo kamu, lalu ubah link `https://via.placeholder.com/...` menjadi `./public/screenshots/nama-file.png`.
2.  **Gunakan Lencana (Badges)**: Saya sudah menambahkan badges di bagian atas. Kamu bisa menyesuaikan warnanya sesuai keinginan.
3.  **Tambahkan file `supabase-schema.sql`**: Pastikan file ini ada di root folder agar orang lain benar-benar bisa menduplikasi database kamu dengan sekali klik.
4.  **Gunakan Mermaid**: Saya menambahkan kode `mermaid` untuk diagram database. G
