import { useState, useEffect, useCallback } from 'react'
import {
  Brain, RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, Lightbulb, Target, Zap, Clock, CheckCircle2,
  AlertCircle, Info, Sparkles, BarChart3
} from 'lucide-react'

/* ─── helpers ─── */
const STATUS_LABEL = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }
const PRIORITY_COLOR = { high: 'text-red-600', medium: 'text-yellow-600', low: 'text-green-600' }

function buildPrompt(tasks) {
  const summary = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    done: tasks.filter(t => t.status === 'done').length,
    high: tasks.filter(t => t.priority === 'high').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
  }
  const taskList = tasks.map(t =>
    `- [${STATUS_LABEL[t.status] || t.status}] "${t.title}" | Priority: ${t.priority || 'none'} | Due: ${t.due_date || 'none'} | Tags: ${(t.tags || []).join(', ') || 'none'}`
  ).join('\n')

  return `Kamu adalah analis produktivitas kanban yang berpengalaman. Berikut data kanban board seorang pengguna:

RINGKASAN:
- Total task: ${summary.total}
- To Do: ${summary.todo} | In Progress: ${summary.inprogress} | Done: ${summary.done}
- High priority: ${summary.high}
- Overdue (belum selesai melewati due date): ${summary.overdue}

DAFTAR TASK:
${taskList}

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
  "focus_task": "<judul task paling mendesak yang harus diselesaikan sekarang>",
  "focus_reason": "<alasan singkat kenapa task tersebut>"
}`
}

/* ─── sub-components ─── */
function HealthBadge({ score, label }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 60 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-red-100 text-red-700 border-red-200'
  const ring =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-blue-500' :
    score >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
      <span className={`w-2 h-2 rounded-full ${ring}`} />
      {label} · {score}/100
    </div>
  )
}

function Section({ icon: Icon, title, color = 'text-slate-600', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-200/80 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 transition text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-semibold text-slate-700">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
      </button>
      {open && <div className="px-3 py-2.5 bg-white space-y-1.5">{children}</div>}
    </div>
  )
}

function Pill({ text, variant = 'default' }) {
  const cls = {
    default: 'bg-slate-100 text-slate-600',
    high:    'bg-red-50 text-red-600 border border-red-200',
    medium:  'bg-yellow-50 text-yellow-700 border border-yellow-200',
    low:     'bg-green-50 text-green-700 border border-green-200',
  }[variant] || 'bg-slate-100 text-slate-600'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${cls}`}>
      {text}
    </span>
  )
}

/* ─── main component ─── */
export default function AIStrategyPanel({ tasks }) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [lastRun, setLastRun] = useState(null)

  const analyze = useCallback(async () => {
    if (!tasks?.length) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(tasks) }],
        }),
      })

      const data = await response.json()
      const text = data.content?.map(b => b.text || '').join('').trim()
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setResult(parsed)
      setLastRun(new Date())
    } catch (e) {
      setError('Gagal menganalisis. Periksa koneksi atau coba lagi.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tasks])

  // Auto-analyze on mount
  useEffect(() => {
    if (tasks?.length > 0 && !result && !loading) analyze()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── empty state ── */
  if (!tasks?.length) return (
    <div className="w-full sm:w-72 lg:w-80 flex-shrink-0 flex flex-col gap-3">
      <PanelHeader loading={false} onRefresh={analyze} lastRun={null} />
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Brain className="w-10 h-10 text-slate-300 mb-3" />
        <p className="text-sm text-slate-400">Belum ada task untuk dianalisis.</p>
      </div>
    </div>
  )

  return (
    <div className="w-full sm:w-72 lg:w-80 flex-shrink-0 flex flex-col gap-3">
      <PanelHeader loading={loading} onRefresh={analyze} lastRun={lastRun} />

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && <LoadingSkeleton />}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-2.5">

          {/* Health score */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Board Health</span>
              <HealthBadge score={result.health_score} label={result.health_label} />
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${result.health_score}%`,
                  background: result.health_score >= 80 ? '#10b981' :
                               result.health_score >= 60 ? '#3b82f6' :
                               result.health_score >= 40 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{result.summary}</p>
          </div>

          {/* Focus task */}
          {result.focus_task && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-xs font-semibold text-violet-700">Fokus Sekarang</span>
              </div>
              <p className="text-xs font-semibold text-violet-900">"{result.focus_task}"</p>
              {result.focus_reason && (
                <p className="text-[11px] text-violet-600 leading-relaxed">{result.focus_reason}</p>
              )}
            </div>
          )}

          {/* Bottlenecks */}
          {result.bottlenecks?.length > 0 && (
            <Section icon={AlertTriangle} title="Bottleneck" color="text-orange-500">
              {result.bottlenecks.map((b, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                  {b}
                </div>
              ))}
            </Section>
          )}

          {/* Quick wins */}
          {result.quick_wins?.length > 0 && (
            <Section icon={Zap} title="Quick Wins" color="text-yellow-500">
              {result.quick_wins.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {w}
                </div>
              ))}
            </Section>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <Section icon={Lightbulb} title="Rekomendasi" color="text-brand-500" defaultOpen={false}>
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{r.title}</span>
                    <Pill text={r.priority} variant={r.priority} />
                  </div>
                  {r.detail && <p className="text-[11px] text-slate-500 leading-relaxed">{r.detail}</p>}
                </div>
              ))}
            </Section>
          )}

          {/* Refresh note */}
          {lastRun && (
            <p className="text-[10px] text-slate-400 text-center">
              Dianalisis {lastRun.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              {' · '}
              <button onClick={analyze} className="underline hover:text-slate-600 transition">Refresh</button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Panel Header ─── */
function PanelHeader({ loading, onRefresh, lastRun }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-brand-600 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 leading-none">AI Analysis</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Powered by Claude</p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-500 disabled:opacity-40"
        title="Refresh analisis"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

/* ─── Loading skeleton ─── */
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 animate-pulse">
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-slate-100 rounded" />
          <div className="h-5 w-28 bg-slate-100 rounded-full" />
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full" />
        <div className="h-3 w-3/4 bg-slate-100 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
      </div>
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 space-y-1.5">
        <div className="h-3 w-24 bg-violet-100 rounded" />
        <div className="h-3 w-full bg-violet-100 rounded" />
        <div className="h-3 w-2/3 bg-violet-100 rounded" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
        <div className="h-3 w-20 bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-4/5 bg-slate-100 rounded" />
      </div>
      <p className="text-[10px] text-slate-400 text-center">Menganalisis board kamu…</p>
    </div>
  )
}
