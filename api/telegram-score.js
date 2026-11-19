import {
  supabase, isAuthorized, sendTelegram, esc,
  wibDateStr, wibStartOfDay, wibStartOfWeek, DAY,
} from './_lib/common.js'

// ── Konstanta sama persis dengan ScoreModal.jsx ──
const PRIORITY_MUL = { high: 3, medium: 2, low: 1 }
const ACTION_PTS   = { created: 1, moved: 2, updated: 1, note: 1 }
const DONE_BONUS   = 5
const IDLE_PENALTY = 1
const OVERDUE_PEN  = 2

function calcScore(activities, tasks, sinceMs, nowMs, today) {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  let gained = 0, doneCount = 0, moveCount = 0
  const doneTitles = []
  const activeDays = new Set()

  for (const a of activities) {
    const ts = new Date(a.created_at).getTime()
    if (ts < sinceMs || ts >= nowMs) continue
    const task = taskMap.get(a.task_id)
    const mul  = PRIORITY_MUL[task?.priority] ?? 1

    if (a.action === 'moved' && a.meta?.to === 'Done') {
      gained += DONE_BONUS * mul
      doneCount++
      if (task?.title) doneTitles.push(task.title)
    } else {
      gained += (ACTION_PTS[a.action] ?? 1) * mul
    }
    if (a.action === 'moved') moveCount++
    activeDays.add(wibDateStr(ts))
  }

  const totalDays    = Math.max(1, Math.floor((nowMs - sinceMs) / DAY) + 1)
  const idleDays     = Math.max(0, totalDays - activeDays.size)
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length
  const penalty      = idleDays * IDLE_PENALTY + overdueCount * OVERDUE_PEN
  const net          = Math.max(0, gained - penalty)

  return { gained, penalty, net, idleDays, overdueCount, doneCount, moveCount, doneTitles, activeDays: activeDays.size, totalDays }
}

function getRank(score) {
  if (score >= 200) return '👑 Legendary'
  if (score >= 100) return '💎 Elite'
  if (score >= 50)  return '🚀 Pro'
  if (score >= 20)  return '⚡ Active'
  if (score >= 5)   return '🌱 Starter'
  return '🐣 Newbie'
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })

  try {
    const now        = Date.now()
    const today      = wibDateStr(now)
    const dayStart   = wibStartOfDay(now)
    const weekStart  = wibStartOfWeek(now)

    const [tasksRes, actsRes] = await Promise.all([
      supabase.from('tasks').select('id, title, priority, status, due_date'),
      supabase.from('task_activities')
        .select('task_id, action, meta, created_at')
        .gte('created_at', new Date(weekStart).toISOString()),
    ])
    if (tasksRes.error) throw tasksRes.error
    if (actsRes.error)  throw actsRes.error

    const tasks      = tasksRes.data
    const activities = actsRes.data

    const d = calcScore(activities, tasks, dayStart,  now, today)
    const w = calcScore(activities, tasks, weekStart, now, today)

    const tanggal = new Date(now).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'short',
    })

    let msg =
      `🏆 <b>Skor Hari Ini</b> (${tanggal})\n` +
      `<b>${d.net} pts</b> · ${getRank(d.net)}\n` +
      `+${d.gained} diperoleh · −${d.penalty} penalti\n` +
      `✅ ${d.doneCount} selesai · ↪ ${d.moveCount} pindah · ⚠️ ${d.overdueCount} overdue`

    if (d.doneTitles.length) {
      msg += '\n\n<b>Selesai hari ini:</b>\n' +
        d.doneTitles.slice(0, 5).map(t => `• ${esc(t)}`).join('\n') +
        (d.doneTitles.length > 5 ? `\n… +${d.doneTitles.length - 5} lainnya` : '')
    }

    if (d.idleDays > 0) {
      msg += '\n\n💤 Belum ada aktivitas hari ini (−1 poin).'
    }

    msg += `\n\n📈 <b>Minggu ini:</b> ${w.net} pts (${w.activeDays}/${w.totalDays} hari aktif)`

    await sendTelegram(msg)
    return res.status(200).json({ ok: true, sent: true, today: d.net, week: w.net })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
