// Supabase Edge Function — send-deadline-reminders
// Dipanggil oleh pg_cron setiap hari jam 08:00 WIB (01:00 UTC)
// Logika:
//   • H-1 : due_date = besok  → kirim 1x reminder awal
//   • Overdue : due_date < hari ini, status != 'done' → kirim setiap hari sampai diselesaikan / due_date diupdate

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── helpers ────────────────────────────────────────────────────────────────

function toJakartaDateStr(date: Date): string {
  // UTC+7
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

function priorityLabel(p: string) {
  return { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[p] ?? p
}

function statusLabel(s: string) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[s] ?? s
}

// ─── email template ─────────────────────────────────────────────────────────

function buildEmail(type: 'tomorrow' | 'overdue', tasks: any[], userEmail: string): string {
  const isOverdue = type === 'overdue'
  const accentColor = isOverdue ? '#dc2626' : '#2563eb'
  const headerBg    = isOverdue ? '#fef2f2' : '#eff6ff'
  const headerText  = isOverdue ? '#991b1b' : '#1e40af'
  const badgeBg     = isOverdue ? '#fee2e2' : '#dbeafe'
  const title       = isOverdue
    ? `⚠️ ${tasks.length} Task Melewati Deadline`
    : `🔔 ${tasks.length} Task Deadline Besok`
  const subtitle    = isOverdue
    ? 'Task berikut sudah melewati deadline dan belum selesai. Segera update atau selesaikan.'
    : 'Pengingat: task berikut akan deadline besok. Pastikan sudah selesai tepat waktu!'

  const taskRows = tasks.map(t => {
    const daysOverdue = isOverdue
      ? Math.floor((Date.now() - new Date(t.due_date + 'T00:00:00Z').getTime()) / 86400000)
      : null
    return `
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #f1f5f9; vertical-align:top;">
          <div style="font-weight:600; color:#1e293b; font-size:14px; margin-bottom:4px;">${t.title}</div>
          ${t.description ? `<div style="color:#64748b; font-size:12px; margin-bottom:6px;">${t.description.slice(0, 120)}${t.description.length > 120 ? '…' : ''}</div>` : ''}
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
            <span style="background:${badgeBg}; color:${accentColor}; font-size:11px; padding:2px 8px; border-radius:99px; font-weight:600;">
              ${isOverdue ? `${daysOverdue} hari terlambat` : 'Besok'}
            </span>
            <span style="background:#f8fafc; color:#64748b; font-size:11px; padding:2px 8px; border-radius:99px; border:1px solid #e2e8f0;">
              ${priorityLabel(t.priority)}
            </span>
            <span style="background:#f8fafc; color:#64748b; font-size:11px; padding:2px 8px; border-radius:99px; border:1px solid #e2e8f0;">
              ${statusLabel(t.status)}
            </span>
            ${t.assignee ? `<span style="background:#f8fafc; color:#64748b; font-size:11px; padding:2px 8px; border-radius:99px; border:1px solid #e2e8f0;">👤 ${t.assignee}</span>` : ''}
          </div>
          <div style="color:#94a3b8; font-size:11px; margin-top:6px;">📅 Due: ${formatDisplayDate(t.due_date)}</div>
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background:#f8fafc; font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); border:1px solid #e2e8f0;">

        <!-- Header -->
        <tr>
          <td style="background:${headerBg}; padding:28px 32px; border-bottom:2px solid ${accentColor}20;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
              <div style="background:${accentColor}; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                <span style="color:white; font-size:18px;">${isOverdue ? '⚠' : '🔔'}</span>
              </div>
              <div>
                <div style="font-size:11px; color:${headerText}; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Taskflow Reminder</div>
                <div style="font-size:20px; font-weight:700; color:${headerText}; margin-top:2px;">${title}</div>
              </div>
            </div>
            <p style="margin:0; color:${headerText}; font-size:14px; line-height:1.6; opacity:0.85;">${subtitle}</p>
          </td>
        </tr>

        <!-- Task list -->
        <tr>
          <td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${taskRows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 32px; text-align:center; background:#f8fafc; border-top:1px solid #f1f5f9;">
            <a href="${SUPABASE_URL.replace('.supabase.co', '')}" 
               style="display:inline-block; background:${accentColor}; color:white; text-decoration:none; padding:12px 32px; border-radius:10px; font-weight:600; font-size:14px;">
              Buka Taskflow →
            </a>
            <p style="margin:16px 0 0; color:#94a3b8; font-size:12px;">
              Email ini dikirim ke <strong>${userEmail}</strong> karena ada task yang mendekati atau melewati deadline.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px; text-align:center; border-top:1px solid #f1f5f9;">
            <p style="margin:0; color:#cbd5e1; font-size:11px;">
              © ${new Date().getFullYear()} Taskflow · Reminder otomatis harian
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── send via Resend ─────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Taskflow <reminders@taskflow.app>',  // ganti domain setelah verifikasi di Resend
      to:   [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`Resend error for ${to}:`, err)
    return false
  }
  return true
}

// ─── main handler ────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const todayStr    = toJakartaDateStr(new Date())
    const tomorrowStr = toJakartaDateStr(new Date(Date.now() + 86400000))

    console.log(`Running reminder check — today: ${todayStr}, tomorrow: ${tomorrowStr}`)

    // Fetch all non-done tasks with due_date set, joined with user email via auth.users
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id, title, description, status, priority, due_date, assignee, user_id,
        users:user_id ( email )
      `)
      .neq('status', 'done')
      .not('due_date', 'is', null)

    if (error) throw error
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No tasks to remind' }), { status: 200 })
    }

    // Group by user
    const byUser: Record<string, { email: string; tomorrow: any[]; overdue: any[] }> = {}

    for (const task of tasks) {
      const uid   = task.user_id
      const email = (task as any).users?.email
      if (!email) continue

      if (!byUser[uid]) byUser[uid] = { email, tomorrow: [], overdue: [] }

      if (task.due_date === tomorrowStr) {
        byUser[uid].tomorrow.push(task)
      } else if (task.due_date < todayStr) {
        byUser[uid].overdue.push(task)
      }
    }

    let totalSent = 0

    for (const [uid, { email, tomorrow, overdue }] of Object.entries(byUser)) {
      // Send H-1 reminder
      if (tomorrow.length > 0) {
        const subject = `🔔 ${tomorrow.length} task deadline besok — Taskflow`
        const html    = buildEmail('tomorrow', tomorrow, email)
        const ok      = await sendEmail(email, subject, html)
        if (ok) {
          totalSent++
          console.log(`H-1 reminder sent to ${email} (${tomorrow.length} tasks)`)
        }
      }

      // Send overdue reminder (daily until resolved)
      if (overdue.length > 0) {
        const subject = `⚠️ ${overdue.length} task melewati deadline — Taskflow`
        const html    = buildEmail('overdue', overdue, email)
        const ok      = await sendEmail(email, subject, html)
        if (ok) {
          totalSent++
          console.log(`Overdue reminder sent to ${email} (${overdue.length} tasks)`)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, users: Object.keys(byUser).length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
