import { supabase, isAuthorized, sendTelegram, esc } from './_lib/common.js'

const PRI = { high: '🔴', medium: '🟠', low: '🟢' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  if (!isAuthorized(req))    return res.status(401).json({ error: 'unauthorized' })

  try {
    const { type, table, record } = req.body || {}
    if (type !== 'INSERT' || table !== 'task_activities' || !record) {
      return res.status(200).json({ ok: true, skipped: true })
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('title, priority, due_date')
      .eq('id', record.task_id)
      .maybeSingle()

    const title = esc(task?.title ?? 'task')
    const pri   = PRI[task?.priority] ?? '⚪'
    const m     = record.meta || {}
    let text

    switch (record.action) {
      case 'created':
        text = `✏️ <b>Task baru</b>\n${pri} ${title}`
        if (task?.due_date) text += `\n📅 Deadline: ${task.due_date}`
        break
      case 'moved':
        text = m.to === 'Done'
          ? `✅ <b>Selesai</b>\n${pri} ${title}`
          : `↪ <b>Dipindah</b>\n${pri} ${title}\n${esc(m.from)} → ${esc(m.to)}`
        if (m.reason) text += `\n💬 ${esc(m.reason)}`
        break
      case 'note':
        text = `💬 <b>Catatan</b>\n${pri} ${title}\n${esc(m.text)}`
        break
      case 'updated':
        text = `🔧 <b>Task diedit</b>\n${pri} ${title}`
        break
      default:
        return res.status(200).json({ ok: true, skipped: true })
    }

    await sendTelegram(text)
    return res.status(200).json({ ok: true, sent: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
