import { useState, useEffect, useMemo } from 'react'
import { X, Trophy, Flame, TrendingUp, Calendar, Star, Zap, Target, TrendingDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { startOfDay, startOfWeek, startOfMonth, differenceInDays, format } from 'date-fns'

// ─── Konstanta poin ───────────────────────────────────────────────────────────
const PRIORITY_MUL  = { high: 3, medium: 2, low: 1 }
const ACTION_PTS    = { created: 1, moved: 2, updated: 1, note: 1 }
const DONE_BONUS    = 5   // bonus saat task dipindah ke Done
const IDLE_PENALTY  = 1   // -1 per hari tanpa aktivitas apapun
const OVERDUE_PEN   = 2   // -2 per task overdue (flat, bukan per hari)

// ─── Hitung skor dengan penalti ───────────────────────────────────────────────
function calcScore(activities, tasks, since, now) {
  let gained  = 0
  let penalty = 0
  const sinceMs = since.getTime()

  // 1. Poin dari aktivitas
  for (const a of activities) {
    if (new Date(a.created_at).getTime() < sinceMs) continue
    const task       = tasks.find(t => t.id === a.task_id)
    const mul        = PRIORITY_MUL[task?.priority] ?? 1
    if (a.action === 'moved' && a.meta?.to === 'Done') {
      gained += DONE_BONUS * mul
    } else {
      gained += (ACTION_PTS[a.action] ?? 1) * mul
    }
  }

  // 2. Penalti idle — hari-hari dalam periode tanpa satu pun aktivitas
  const totalDays   = Math.max(1, differenceInDays(now, since) + 1)
  const activeDays  = new Set(
    activities
      .filter(a => new Date(a.created_at).getTime() >= sinceMs)
      .map(a => format(new Date(a.created_at), 'yyyy-MM-dd'))
  ).size
  const idleDays    = Math.max(0, totalDays - activeDays)
  penalty          += idleDays * IDLE_PENALTY

  // 3. Penalti overdue — task yang lewat deadline & belum done
  const today      = format(now, 'yyyy-MM-dd')
  const overdueTasks = tasks.filter(t =>
    t.status !== 'done' && t.due_date && t.due_date < today
  )
  penalty += overdueTasks.length * OVERDUE_PEN

  const net = Math.max(0, gained - penalty)  // minimum 0
  return { gained, penalty, idleDays, overdueCount: overdueTasks.length, net, activeDays, totalDays }
}

// ─── Rank berdasarkan skor nett ───────────────────────────────────────────────
function getRank(score) {
  if (score >= 200) return { label: 'Legendary', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', icon: '👑' }
  if (score >= 100) return { label: 'Elite',     color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: '💎' }
  if (score >= 50)  return { label: 'Pro',       color: 'text-brand-600',  bg: 'bg-brand-50 border-brand-200',  icon: '🚀' }
  if (score >= 20)  return { label: 'Active',    color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200', icon: '⚡' }
  if (score >= 5)   return { label: 'Starter',   color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200',  icon: '🌱' }
  return                   { label: 'Newbie',    color: 'text-slate-400',  bg: 'bg-slate-50 border-slate-200',  icon: '🐣' }
}

function ScoreBar({ value, max, color }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Stacked bar: gained (hijau) vs penalty (merah)
function StackedBar({ gained, penalty }) {
  const total = Math.max(gained + penalty, 1)
  const gPct  = Math.round((gained  / total) * 100)
  const pPct  = Math.round((penalty / total) * 100)
  return (
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
      <div className="h-full bg-emerald-500 transition-all duration-700 rounded-l-full" style={{ width: `${gPct}%` }} />
      <div className="h-full bg-red-400 transition-all duration-700 rounded-r-full"    style={{ width: `${pPct}%` }} />
    </div>
  )
}

const PERIOD_TABS = [
  { id: 'daily',   label: 'Today', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'weekly',  label: 'Week',  icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: 'monthly', label: 'Month', icon: <Calendar className="w-3.5 h-3.5" /> },
]

export default function ScoreModal({ userId, tasks, onClose }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState('daily')

  useEffect(() => {
    // ambil aktivitas 1 bulan ke belakang (cukup untuk semua period)
    const since = startOfMonth(new Date()).toISOString()
    supabase
      .from('task_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setActivities(data || []); setLoading(false) })
  }, [userId])

  const now = new Date()
  const periodStart = {
    daily:   startOfDay(now),
    weekly:  startOfWeek(now, { weekStartsOn: 1 }),
    monthly: startOfMonth(now),
  }[period]

  const result   = useMemo(
    () => calcScore(activities, tasks, periodStart, now),
    [activities, tasks, period]
  )
  const rank     = getRank(result.net)
  const maxScore = { daily: 30, weekly: 150, monthly: 500 }[period]

  // recent activity events
  const sinceMs      = periodStart.getTime()
  const recent       = activities.filter(a => new Date(a.created_at).getTime() >= sinceMs)
  const doneTasks    = recent.filter(a => a.action === 'moved' && a.meta?.to === 'Done').length
  const noteCount    = recent.filter(a => a.action === 'note').length
  const moveCount    = recent.filter(a => a.action === 'moved').length

  function eventDesc(a) {
    const task  = tasks.find(t => t.id === a.task_id)
    const title = task?.title ? `"${task.title.slice(0, 26)}${task.title.length > 26 ? '…' : ''}"` : 'task'
    const mul   = PRIORITY_MUL[task?.priority ?? 'medium']
    if (a.action === 'moved' && a.meta?.to === 'Done') return { text: `✅ Selesai ${title}`, pts: `+${DONE_BONUS * mul}` }
    if (a.action === 'moved')   return { text: `↪ Pindah ${title}`,  pts: `+${ACTION_PTS.moved * mul}`    }
    if (a.action === 'created') return { text: `✏️ Buat ${title}`,   pts: `+${ACTION_PTS.created * mul}`  }
    if (a.action === 'note')    return { text: `💬 Update ${title}`, pts: `+${ACTION_PTS.note * mul}`     }
    if (a.action === 'updated') return { text: `🔧 Edit ${title}`,   pts: `+${ACTION_PTS.updated * mul}`  }
    return { text: a.action, pts: '+0' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-yellow-600" />
            </div>
            <span className="font-display font-semibold text-slate-800">Productivity Score</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 px-5 pt-4 pb-0">
          {PERIOD_TABS.map(t => (
            <button key={t.id} onClick={() => setPeriod(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border transition-all duration-150 ${
                period === t.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand-200 hover:text-brand-600'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Score hero */}
              <div className="text-center py-2">
                <div className="text-5xl font-display font-bold text-slate-800 tabular-nums">{result.net}</div>
                <div className="text-sm text-slate-400 mt-0.5">net points</div>
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-xs font-semibold ${rank.bg} ${rank.color}`}>
                  <span>{rank.icon}</span>{rank.label}
                </div>
              </div>

              {/* Gained vs Penalty breakdown */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-emerald-600">+{result.gained} diperoleh</span>
                  <span className="text-red-500">−{result.penalty} penalti</span>
                </div>
                <StackedBar gained={result.gained} penalty={result.penalty} />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{result.activeDays}/{result.totalDays} hari aktif</span>
                  <span>nett = {result.net} pts</span>
                </div>
              </div>

              {/* Progress to next rank */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Progress to next rank</span>
                  <span>{result.net}/{maxScore} pts</span>
                </div>
                <ScoreBar value={result.net} max={maxScore} color="bg-brand-500" />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Target className="w-3.5 h-3.5 text-emerald-600" />,       val: doneTasks,           label: 'Done',    bg: 'bg-emerald-50' },
                  { icon: <Zap className="w-3.5 h-3.5 text-brand-600" />,            val: moveCount,           label: 'Moves',   bg: 'bg-brand-50'   },
                  { icon: <TrendingDown className="w-3.5 h-3.5 text-red-500" />,     val: result.overdueCount, label: 'Overdue', bg: 'bg-red-50'     },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <div className="font-display font-bold text-slate-800 text-lg">{s.val}</div>
                    <div className="text-[10px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Penalty breakdown — tampil kalau ada penalti */}
              {result.penalty > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-2">⚠️ Penalti Aktif</p>
                  {result.idleDays > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-red-700">{result.idleDays} hari tanpa aktivitas</span>
                      <span className="text-red-500 font-semibold font-mono">−{result.idleDays * IDLE_PENALTY}</span>
                    </div>
                  )}
                  {result.overdueCount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-red-700">{result.overdueCount} task melewati deadline</span>
                      <span className="text-red-500 font-semibold font-mono">−{result.overdueCount * OVERDUE_PEN}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Sistem poin */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Sistem Poin</p>
                <p className="text-[10px] font-semibold text-emerald-600 mb-1">Penambah:</p>
                {[
                  { label: 'Task selesai (Done)',  pts: '+5 × priority' },
                  { label: 'Pindah kolom',         pts: '+2 × priority' },
                  { label: 'Buat task',            pts: '+1 × priority' },
                  { label: 'Note / update',        pts: '+1 × priority' },
                  { label: 'Multiplier priority',  pts: 'High×3 Med×2 Low×1' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="text-emerald-600 font-mono text-[10px]">{r.pts}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 my-1.5" />
                <p className="text-[10px] font-semibold text-red-500 mb-1">Pengurang:</p>
                {[
                  { label: 'Hari tanpa aktivitas', pts: '−1 / hari' },
                  { label: 'Task overdue',         pts: '−2 / task' },
                  { label: 'Minimum skor',         pts: '0 (tidak bisa minus)' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="text-red-500 font-mono text-[10px]">{r.pts}</span>
                  </div>
                ))}
              </div>

              {/* Recent events */}
              {recent.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Aktivitas Terbaru</p>
                  <div className="space-y-1.5">
                    {recent.slice(0, 5).map(a => {
                      const ev = eventDesc(a)
                      return (
                        <div key={a.id} className="flex items-center justify-between text-xs gap-2">
                          <span className="text-slate-600 flex-1 truncate">{ev.text}</span>
                          <span className="text-emerald-600 font-semibold flex-shrink-0">{ev.pts}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {recent.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">🌱</p>
                  <p className="text-sm text-slate-500">
                    Belum ada aktivitas {period === 'daily' ? 'hari ini' : period === 'weekly' ? 'minggu ini' : 'bulan ini'}.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Mulai bergerak sebelum poin berkurang!</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
