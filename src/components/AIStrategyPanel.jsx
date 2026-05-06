import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  Lightbulb, Target, Zap, CheckCircle2,
  AlertCircle, Sparkles, X, Brain
} from 'lucide-react'

/* ─── helpers ─── */
const STATUS_LABEL = {
  todo: 'To Do',
  inprogress: 'In Progress',
  waiting: 'Waiting/Blocked',
  done: 'Done',
}

function buildPrompt(tasks) {
  const s = {
    total:     tasks.length,
    todo:      tasks.filter(t => t.status === 'todo').length,
    inprogress:tasks.filter(t => t.status === 'inprogress').length,
    waiting:   tasks.filter(t => t.status === 'waiting').length,
    done:      tasks.filter(t => t.status === 'done').length,
    high:      tasks.filter(t => t.priority === 'high').length,
    overdue:   tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  }
  const list = tasks.map(t =>
    `- [${STATUS_LABEL[t.status] || t.status}] "${t.title}" | Priority: ${t.priority || 'none'} | Due: ${t.due_date || 'none'} | Tags: ${(t.tags || []).join(', ') || 'none'}`
  ).join('\n')

  return `Kamu adalah analis produktivitas kanban yang berpengalaman. Berikut data kanban board seorang pengguna:

RINGKASAN:
- Total task: ${s.total}
- To Do: ${s.todo} | In Progress: ${s.inprogress} | Waiting/Blocked: ${s.waiting} | Done: ${s.done}
- High priority: ${s.high} | Overdue: ${s.overdue}

DAFTAR TASK:
${list}

Berikan analisis dalam format JSON ONLY (tanpa markdown, tanpa backtick). Struktur JSON:
{
  "health_score": <angka 0-100>,
  "health_label": "<Kritis|Perlu Perhatian|Cukup Baik|Baik|Sangat Baik>",
  "summary": "<1-2 kalimat ringkasan kondisi board>",
  "bottlenecks": ["<masalah 1>", "<masalah 2>"],
  "quick_wins": ["<saran cepat 1>", "<saran cepat 2>"],
  "recommendations": [
    {"title": "<judul saran>", "detail": "<penjelasan singkat>", "priority": "<high|medium|low>"}
  ],
  "focus_task": "<judul task paling mendesak>",
  "focus_reason": "<alasan singkat>"
}`
}

/* ─── sub-components ─── */
function HealthBar({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
  const bg    = score >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : score >= 60 ? 'bg-blue-50 border-blue-200 text-blue-700'
              : score >= 40 ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'

  return (
    <div className={`rounded-lg border p-2.5 flex flex-col gap-1.5 ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">Board Health</span>
        <span className="text-[11px] font-bold">{score}/100</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

function Accordion({ icon: Icon, iconColor, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 ${iconColor}`} />
          <span className="text-[11px] font-semibold text-slate-700">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
      </button>
      {open && <div className="px-2.5 py-2 bg-white space-y-1.5">{children}</div>}
    </div>
  )
}

function Pill({ text, variant }) {
  const cls = variant === 'high'   ? 'bg-red-50 text-red-600 border border-red-200'
            : variant === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : variant === 'low'    ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${cls}`}>{text}</span>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="h-10 rounded-lg bg-slate-100" />
      <div className="h-3 w-3/4 rounded bg-slate-100" />
      <div className="h-14 rounded-lg bg-violet-50" />
      <div className="h-16 rounded-lg bg-slate-100" />
      <div className="h-10 rounded-lg bg-slate-100" />
      <p className="text-[10px] text-slate-400 text-center">Menganalisis board kamu…</p>
    </div>
  )
}

/* ─── main ─── */
export default function AIStrategyPanel({ tasks, onClose }) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [lastRun, setLastRun] = useState(null)

  const analyze = useCallback(async () => {
    if (!tasks?.length) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(tasks) }],
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error?.message || `HTTP ${res.status}`)
      }
      const data    = await res.json()
      const text    = data.content?.map(b => b.text || '').join('').trim()
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed  = JSON.parse(cleaned)
      setResult(parsed)
      setLastRun(new Date())
    } catch (e) {
      console.error('AI analyze error:', e)
      setError(e.message || 'Gagal menganalisis. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [tasks])

  useEffect(() => { analyze() }, []) // auto-run on open // eslint-disable-line

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* drawer — width matches a kanban column */}
      <div className="relative z-10 h-full w-72 bg-white border-l border-slate-200 shadow-2xl flex flex-col">

        {/* ── header ── */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-none">AI Analysis</p>
              <p className="text-[9px] text-slate-400">Powered by Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={analyze}
              disabled={loading}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 transition text-slate-500 disabled:opacity-40"
              title="Refresh analisis"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 transition text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── body ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {!tasks?.length && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Brain className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-400">Belum ada task untuk dianalisis.</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-red-600 leading-snug">{error}</p>
            </div>
          )}

          {loading && !result && <Skeleton />}

          {result && (
            <>
              <HealthBar score={result.health_score} />

              {result.summary && (
                <p className="text-[11px] text-slate-500 leading-relaxed">{result.summary}</p>
              )}

              {result.focus_task && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-violet-500" />
                    <span className="text-[11px] font-semibold text-violet-700">Fokus Sekarang</span>
                  </div>
                  <p className="text-[11px] font-semibold text-violet-900 leading-snug">"{result.focus_task}"</p>
                  {result.focus_reason && (
                    <p className="text-[10px] text-violet-600 leading-relaxed">{result.focus_reason}</p>
                  )}
                </div>
              )}

              {result.bottlenecks?.length > 0 && (
                <Accordion icon={AlertTriangle} iconColor="text-orange-500" title="Bottleneck">
                  {result.bottlenecks.map((b, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                      {b}
                    </div>
                  ))}
                </Accordion>
              )}

              {result.quick_wins?.length > 0 && (
                <Accordion icon={Zap} iconColor="text-yellow-500" title="Quick Wins">
                  {result.quick_wins.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {w}
                    </div>
                  ))}
                </Accordion>
              )}

              {result.recommendations?.length > 0 && (
                <Accordion icon={Lightbulb} iconColor="text-blue-500" title="Rekomendasi" defaultOpen={false}>
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex flex-col gap-0.5 p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-700">{r.title}</span>
                        <Pill text={r.priority} variant={r.priority} />
                      </div>
                      {r.detail && <p className="text-[10px] text-slate-500 leading-relaxed">{r.detail}</p>}
                    </div>
                  ))}
                </Accordion>
              )}

              {lastRun && (
                <p className="text-[9px] text-slate-400 text-center pb-1">
                  Dianalisis {lastRun.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  <button onClick={analyze} className="underline hover:text-slate-500 transition">Refresh</button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
