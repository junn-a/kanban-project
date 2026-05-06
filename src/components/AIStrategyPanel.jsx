import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Sparkles, RefreshCw, Loader2, ChevronRight, AlertCircle, Clock, CheckCircle2, Pause } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const CACHE_DURATION_MS = 30 * 60 * 1000 // 30 menit

// Build prompt dari data task real
function buildPrompt(tasks) {
  const today = format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })

  const byStatus = (s) => tasks.filter(t => t.status === s)
  const todo      = byStatus('todo')
  const inprog    = byStatus('inprogress')
  const waiting   = byStatus('waiting')
  const done      = byStatus('done')

  const taskLine = (t) => {
    const parts = [`- ${t.title}`]
    if (t.priority)  parts.push(`[${t.priority}]`)
    if (t.due_date) {
      const due     = new Date(t.due_date + 'T00:00:00')
      const todayD  = new Date(); todayD.setHours(0,0,0,0)
      const diff    = Math.ceil((due - todayD) / 86400000)
      if (diff < 0)        parts.push(`[OVERDUE ${Math.abs(diff)} hari]`)
      else if (diff === 0) parts.push(`[DUE HARI INI]`)
      else                 parts.push(`[due ${diff} hari lagi]`)
    }
    if (t.assignee)   parts.push(`(PIC: ${t.assignee})`)
    if (t.description) parts.push(`→ ${t.description.slice(0, 80)}`)
    return parts.join(' ')
  }

  return `Kamu adalah asisten produktivitas yang cerdas dan pragmatis. Hari ini adalah ${today}.

Berikut adalah status board Kanban saat ini:

📋 TO DO (${todo.length} task):
${todo.length ? todo.map(taskLine).join('\n') : '(kosong)'}

⚡ IN PROGRESS (${inprog.length} task):
${inprog.length ? inprog.map(taskLine).join('\n') : '(kosong)'}

⏳ WAITING/BLOCKED (${waiting.length} task):
${waiting.length ? waiting.map(taskLine).join('\n') : '(kosong)'}

✅ DONE HARI INI (${done.length} task):
${done.length ? done.slice(0,5).map(taskLine).join('\n') : '(belum ada)'}

Berikan analisis dan strategi harian yang KONKRET dan ACTIONABLE dalam format berikut:

## 🎯 Penilaian Situasi
[2-3 kalimat ringkas tentang kondisi board hari ini — jujur, langsung ke poin]

## 🔥 Prioritas Utama Hari Ini
[3-5 task yang HARUS diselesaikan hari ini, dengan alasan singkat per task]

## ⚠️ Perhatian Khusus
[task overdue, risiko, atau bottleneck yang perlu segera ditangani]

## 💡 Saran Strategi
[2-3 saran praktis untuk memaksimalkan produktivitas hari ini]

## 📊 Quick Score
[Nilai kondisi board hari ini: X/10, dengan 1 kalimat alasan]

Gunakan bahasa Indonesia yang natural, padat, dan tidak bertele-tele. Maksimal 350 kata total.`
}

// Parse markdown sederhana ke React elements
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-slate-800 mt-4 mb-1.5 flex items-center gap-1.5">
          {line.replace('## ', '')}
        </h3>
      )
    } else if (line.startsWith('- ') || line.match(/^\d+\./)) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].match(/^\d+\./))) {
        items.push(
          <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
            <ChevronRight className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
            <span>{lines[i].replace(/^[-\d.]+\s*/, '')}</span>
          </li>
        )
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1 mb-2">{items}</ul>)
      continue
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-xs text-slate-600 leading-relaxed mb-1.5">{line}</p>
      )
    }
    i++
  }
  return elements
}

export default function AIStrategyPanel({ tasks, onClose }) {
  const [result, setResult]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [lastGen, setLastGen]   = useState(null)
  const cacheRef                = useRef({ text: '', ts: 0 })

  const generate = useCallback(async (force = false) => {
    // Pakai cache kalau masih fresh dan tidak di-force
    const now = Date.now()
    if (!force && cacheRef.current.text && (now - cacheRef.current.ts) < CACHE_DURATION_MS) {
      setResult(cacheRef.current.text)
      setLastGen(new Date(cacheRef.current.ts))
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const prompt = buildPrompt(tasks)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data?.error?.message || 'API error')

      const text = data.content?.find(c => c.type === 'text')?.text || ''
      cacheRef.current = { text, ts: Date.now() }
      setResult(text)
      setLastGen(new Date())
    } catch (err) {
      setError(err.message || 'Gagal generate analisis')
    } finally {
      setLoading(false)
    }
  }, [tasks])

  // Auto-generate saat panel pertama dibuka
  useEffect(() => { generate() }, [])

  const activeTasks   = tasks.filter(t => t.status !== 'done')
  const overdueTasks  = tasks.filter(t =>
    t.status !== 'done' && t.due_date && t.due_date < format(new Date(), 'yyyy-MM-dd')
  )
  const todayTasks    = tasks.filter(t =>
    t.status !== 'done' && t.due_date === format(new Date(), 'yyyy-MM-dd')
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-brand-950/30 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-brand-600 to-violet-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold text-white text-sm">AI Daily Strategy</p>
              <p className="text-white/70 text-[10px]">Analisis & saran berdasarkan board kamu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-0 border-b border-slate-100 flex-shrink-0">
          {[
            { icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,    val: overdueTasks.length, label: 'Overdue',   bg: overdueTasks.length > 0 ? 'bg-red-50' : 'bg-slate-50' },
            { icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,        val: todayTasks.length,   label: 'Due Today',  bg: todayTasks.length > 0 ? 'bg-amber-50' : 'bg-slate-50' },
            { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,val: activeTasks.length,  label: 'Active',    bg: 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} px-3 py-2.5 text-center border-r border-slate-100 last:border-0`}>
              <div className="flex justify-center mb-0.5">{s.icon}</div>
              <div className="font-display font-bold text-slate-800 text-lg leading-none">{s.val}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">AI sedang menganalisis...</p>
                <p className="text-xs text-slate-400 mt-1">Membaca {tasks.length} task di board kamu</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-slate-700 font-medium">Gagal generate analisis</p>
              <p className="text-xs text-slate-400">{error}</p>
              <button onClick={() => generate(true)} className="btn-primary text-xs py-2 px-4 mt-2">
                Coba Lagi
              </button>
            </div>
          ) : result ? (
            <div className="space-y-1 animate-fade-in">
              {renderMarkdown(result)}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between flex-shrink-0 bg-slate-50">
          <div className="text-[10px] text-slate-400">
            {lastGen
              ? `Update: ${format(lastGen, 'HH:mm')} · cache 30 mnt`
              : 'Belum pernah di-generate'}
          </div>
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-40 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </>
  )
}
