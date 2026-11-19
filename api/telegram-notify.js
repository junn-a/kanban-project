import { supabase, isAuthorized, sendTelegram, esc, wibDateStr, DAY } from './_lib/common.js'

const PRI = { high: '🔴', medium: '🟠', low: '🟢' }
const MAX_ROWS = 15

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' })

  try {
    const today = wibDateStr()

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('title, priority, due_date')
      .neq('status', 'done')
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .order('due_date', { ascending: true })
    if (error) throw error

    const overdue  = tasks.filter(t => t.due_date < today)
    const dueToday = tasks.filter(t => t.due_date === today)

    if (!overdue.length && !dueToday.length) {
      return res.status(200).json({ ok: true, sent: false })
    }

    const line = t => {
      const late = Math.round((Date.parse(today) - Date.parse(t.due_date)) / DAY)
      const suffix = late > 0 ? ` — telat ${late} hari` : ''
      return `${PRI[t.priority] ?? '⚪'} ${esc(t.title)}${suffix}`
    }

    const parts = []
    if (overdue.length) {
      parts.push(
        `⚠️ <b>${overdue.length} task lewat deadline</b>\n` +
        overdue.slice(0, MAX_ROWS).map(line).join('\n') +
        (overdue.length > MAX_ROWS ? `\n… +${overdue.length - MAX_ROWS} lainnya` : '')
      )
    }
    if (dueToday.length) {
      parts.push(
        `📅 <b>${dueToday.length} task jatuh tempo hari ini</b>\n` +
        dueToday.slice(0, MAX_ROWS).map(line).join('\n')
      )
    }

    await sendTelegram(parts.join('\n\n'))
    return res.status(200).json({ ok: true, sent: true, overdue: overdue.length, dueToday: dueToday.length })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
