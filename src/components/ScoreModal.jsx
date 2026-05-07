import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Trophy, Flame, TrendingUp, Calendar, Zap, Target, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  startOfDay, startOfWeek, startOfMonth,
  subDays, differenceInDays, format, parseISO, isValid,
  endOfDay
} from 'date-fns'

// ─── Konstanta poin ───────────────────────────────────────────────────────────
const PRIORITY_MUL = { high: 3, medium: 2, low: 1 }
const ACTION_PTS   = { created: 1, moved: 2, updated: 1, note: 1 }
const DONE_BONUS   = 5
const IDLE_PENALTY = 1
const OVERDUE_PEN  = 2

// ─── Quick range preset definitions ──────────────────────────────────────────
const QUICK_RANGES = [
  { id: '7d',  label: '7 Hari',  days: 7  },
  { id: '14d', label: '14 Hari', days: 14 },
  { id: '30d', label: '30 Hari', days: 30 },
  { id: '90d', label: '3 Bulan', days: 90 },
]

// ─── Hitung skor ──────────────────────────────────────────────────────────────
function calcScore(activities, tasks, since, now) {
  let gained  = 0
  let penalty = 0
  const sinceMs = since instanceof Date ? since.getTime() : new Date(since).getTime()
  const nowMs   = now   instanceof Date ? now.getTime()   : new Date(now).getTime()

  for (const a of activities) {
    const ts = new Date(a.created_at).getTime()
    if (ts < sinceMs || ts >= nowMs) continue
    const task = tasks.find(t => t.id === a.task_id)
    const mul  = PRIORITY_MUL[task?.priority] ?? 1
    if (a.action === 'moved' && a.meta?.to === 'Done') {
      gained += DONE_BONUS * mul
    } else {
      gained += (ACTION_PTS[a.action] ?? 1) * mul
    }
  }

  const totalDays  = Math.max(1, differenceInDays(new Date(nowMs), new Date(sinceMs)) + 1)
  const activeDays = new Set(
    activities
      .filter(a => { const ts = new Date(a.created_at).getTime(); return ts >= sinceMs && ts < nowMs })
      .map(a => format(new Date(a.created_at), 'yyyy-MM-dd'))
  ).size
  const idleDays = Math.max(0, totalDays - activeDays)
  penalty += idleDays * IDLE_PENALTY

  const today = format(new Date(), 'yyyy-MM-dd')
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today)
  penalty += overdueTasks.length * OVERDUE_PEN

  const net = Math.max(0, gained - penalty)
  return { gained, penalty, idleDays, overdueCount: overdueTasks.length, net, activeDays, totalDays }
}

// ─── Build data tren harian ───────────────────────────────────────────────────
function buildDailyTrend(activities, tasks, startDate, endDate) {
  const result = []
  const start  = startOfDay(startDate)
  const end    = startOfDay(endDate)
  const days   = differenceInDays(end, start) + 1

  for (let i = 0; i < days; i++) {
    const dayStart = startOfDay(new Date(start.getTime() + i * 86_400_000))
    const dayEnd   = new Date(dayStart.getTime() + 86_400_000)
    const dayActs  = activities.filter(a => {
      const ts = new Date(a.created_at).getTime()
      return ts >= dayStart.getTime() && ts < dayEnd.getTime()
    })
    const { gained, penalty, net } = calcScore(dayActs, tasks, dayStart, dayEnd)
    result.push({
      label:     format(dayStart, days <= 14 ? 'EEE d/M' : 'd/M'),
      fullLabel: format(dayStart, 'EEEE, d MMMM yyyy'),
      gained, penalty, net,
      idle: dayActs.length === 0,
    })
  }
  return result
}

// ─── Rank ─────────────────────────────────────────────────────────────────────
function getRank(score) {
  if (score >= 200) return { label: 'Legendary', color: 'text-yellow-500',  bg: 'bg-yellow-50 border-yellow-200',   icon: '👑' }
  if (score >= 100) return { label: 'Elite',     color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',   icon: '💎' }
  if (score >= 50)  return { label: 'Pro',       color: 'text-brand-600',   bg: 'bg-brand-50 border-brand-200',     icon: '🚀' }
  if (score >= 20)  return { label: 'Active',    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: '⚡' }
  if (score >= 5)   return { label: 'Starter',   color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',     icon: '🌱' }
  return                   { label: 'Newbie',    color: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200',     icon: '🐣' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreBar({ value, max, color }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StackedBar({ gained, penalty }) {
  const total = Math.max(gained + penalty, 1)
  const gPct  = Math.round((gained  / total) * 100)
  const pPct  = Math.round((penalty / total) * 100)
  return (
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
      <div className="h-full bg-emerald-500 transition-all duration-700 rounded-l-full" style={{ width: `${gPct}%` }} />
      <div className="h-full bg-red-400  transition-all duration-700 rounded-r-full"    style={{ width: `${pPct}%` }} />
    </div>
  )
}

// ─── Custom Date Range Picker ─────────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, onRangeChange }) {
  const [open, setOpen]             = useState(false)
  const [localStart, setLocalStart] = useState(format(startDate, 'yyyy-MM-dd'))
  const [localEnd,   setLocalEnd]   = useState(format(endDate,   'yyyy-MM-dd'))
  const [activePreset, setActivePreset] = useState('7d')
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function applyPreset(preset) {
    const end   = new Date()
    const start = subDays(end, preset.days - 1)
    const s = format(start, 'yyyy-MM-dd')
    const e = format(end,   'yyyy-MM-dd')
    setLocalStart(s); setLocalEnd(e)
    setActivePreset(preset.id)
    onRangeChange(startOfDay(start), endOfDay(end))
    setOpen(false)
  }

  function applyCustom() {
    const s = parseISO(localStart)
    const e = parseISO(localEnd)
    if (!isValid(s) || !isValid(e) || s > e) return
    if (differenceInDays(e, s) > 365) return
    setActivePreset(null)
    onRangeChange(startOfDay(s), endOfDay(e))
    setOpen(false)
  }

  const displayLabel = activePreset
    ? QUICK_RANGES.find(r => r.id === activePreset)?.label
    : `${format(parseISO(localStart), 'd MMM')} – ${format(parseISO(localEnd), 'd MMM yyyy')}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-all"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>{displayLabel}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cepat</p>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_RANGES.map(r => (
                <button
                  key={r.id}
                  onClick={() => applyPreset(r)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    activePreset === r.id
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >{r.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Custom</p>
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Dari</label>
                <input type="date" value={localStart} max={localEnd}
                  onChange={e => { setLocalStart(e.target.value); setActivePreset(null) }}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400 text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Sampai</label>
                <input type="date" value={localEnd} min={localStart} max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => { setLocalEnd(e.target.value); setActivePreset(null) }}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400 text-slate-700"
                />
              </div>
            </div>
            <button onClick={applyCustom}
              className="mt-2 w-full py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >Terapkan</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pure SVG Trend Chart (pengganti chart.js) ────────────────────────────────
function TrendChart({ data }) {
  const [tooltip, setTooltip] = useState(null) // { x, y, d }

  if (!data.length) return null

  const W = 500, H = 130, PADX = 8, PADY = 12
  const innerW = W - PADX * 2
  const innerH = H - PADY * 2

  const maxGained  = Math.max(...data.map(d => d.gained), 1)
  const minPenalty = Math.min(...data.map(d => -d.penalty), 0)
  const maxNet     = Math.max(...data.map(d => d.net), 1)
  const peak       = Math.max(...data.map(d => d.net))

  // Bar dimensions
  const barW    = Math.max(2, (innerW / data.length) - 2)
  const barGap  = innerW / data.length
  const zeroY   = PADY + innerH * (maxGained / (maxGained - minPenalty + 0.001))

  // Net score line path
  const linePoints = data.map((d, i) => {
    const x = PADX + i * barGap + barGap / 2
    const y = PADY + innerH - (d.net / (maxNet || 1)) * innerH
    return { x, y, d }
  })

  const linePath = linePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`)
    .join(' ')

  // Area under line
  const areaPath = linePoints.length > 0
    ? `M ${linePoints[0].x},${PADY + innerH} ` +
      linePoints.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${linePoints[linePoints.length - 1].x},${PADY + innerH} Z`
    : ''

  // Show x-axis labels: show all if ≤14 days, else every Nth
  const labelStep = data.length <= 14 ? 1 : data.length <= 30 ? 3 : 7

  return (
    <div className="relative select-none">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap"
          style={{
            left: Math.min(tooltip.x, W - 120),
            top: Math.max(0, tooltip.y - 60),
            transform: 'translate(-50%, 0)',
          }}
        >
          <p className="font-semibold mb-0.5 text-slate-200">{tooltip.d.fullLabel}</p>
          <p className="text-emerald-400">+{tooltip.d.gained} diperoleh</p>
          {tooltip.d.penalty > 0 && <p className="text-red-400">−{tooltip.d.penalty} penalti</p>}
          <p className="font-bold text-white border-t border-slate-600 mt-0.5 pt-0.5">
            Net: {tooltip.d.net} pts
          </p>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = PADY + innerH * (1 - t)
          return (
            <line
              key={t}
              x1={PADX} x2={W - PADX} y1={y} y2={y}
              stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray={t === 0 ? '0' : '3 3'}
            />
          )
        })}

        {/* Stacked bars: gained (green) above zero, penalty (red) below */}
        {data.map((d, i) => {
          const cx       = PADX + i * barGap + barGap / 2
          const x        = cx - barW / 2
          const gainedH  = (d.gained  / (maxGained  || 1)) * (innerH * 0.6)
          const penaltyH = (d.penalty / (-minPenalty || 1)) * (innerH * 0.4)
          const gainY    = PADY + innerH - gainedH

          return (
            <g key={i}>
              {/* Gained bar */}
              <rect
                x={x} y={gainY} width={barW} height={gainedH}
                rx="2" ry="2"
                fill={d.idle ? '#e2e8f0' : '#5DCAA5'}
                fillOpacity={d.idle ? 0.6 : 0.85}
              />
              {/* Penalty bar (below baseline) */}
              {d.penalty > 0 && (
                <rect
                  x={x} y={PADY + innerH} width={barW} height={penaltyH}
                  rx="2" ry="2"
                  fill="#F09595"
                  fillOpacity="0.85"
                />
              )}
              {/* Hover hit area */}
              <rect
                x={cx - barGap / 2} y={PADY} width={barGap} height={innerH}
                fill="transparent"
                onMouseEnter={e => {
                  const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect()
                  const scaleX  = W / svgRect.width
                  const mx      = (e.clientX - svgRect.left) * scaleX
                  const my      = (e.clientY - svgRect.top)  * (H / svgRect.height)
                  setTooltip({ x: mx, y: my, d })
                }}
              />
            </g>
          )
        })}

        {/* Area fill under net line */}
        {linePoints.length > 1 && (
          <path d={areaPath} fill="#2563eb" fillOpacity="0.07" />
        )}

        {/* Net score line */}
        {linePoints.length > 1 && (
          <polyline
            points={linePoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots on net line */}
        {linePoints.map((p, i) => {
          const isBest = p.d.net === peak && peak > 0
          return (
            <circle
              key={i}
              cx={p.x} cy={p.y}
              r={isBest ? 4.5 : data.length > 30 ? 1.5 : 3}
              fill={isBest ? '#f59e0b' : '#2563eb'}
              stroke="white"
              strokeWidth={isBest ? 1.5 : 1}
            />
          )
        })}

        {/* X-axis baseline */}
        <line
          x1={PADX} x2={W - PADX}
          y1={PADY + innerH} y2={PADY + innerH}
          stroke="#cbd5e1" strokeWidth="1"
        />

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null
          const cx = PADX + i * barGap + barGap / 2
          return (
            <text key={i} x={cx} y={H - 1} textAnchor="middle"
              fontSize="8" fill="#94a3b8">
              {d.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Daily Trend Chart wrapper ────────────────────────────────────────────────
function DailyTrendChart({ activities, tasks }) {
  const today          = useMemo(() => new Date(), [])
  const default7Start  = useMemo(() => subDays(today, 6), [today])

  const [rangeStart, setRangeStart] = useState(startOfDay(default7Start))
  const [rangeEnd,   setRangeEnd]   = useState(endOfDay(today))

  const trendData = useMemo(
    () => buildDailyTrend(activities, tasks, rangeStart, rangeEnd),
    [activities, tasks, rangeStart, rangeEnd]
  )

  const totalDays  = trendData.length
  const avg        = totalDays ? Math.round(trendData.reduce((s, d) => s + d.net, 0) / totalDays) : 0
  const peak       = totalDays ? Math.max(...trendData.map(d => d.net)) : 0
  const total      = trendData.reduce((s, d) => s + d.net, 0)
  const activeDays = trendData.filter(d => !d.idle).length
  const bestDay    = trendData.find(d => d.net === peak)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tren Harian</p>
        <DateRangePicker
          startDate={rangeStart}
          endDate={rangeEnd}
          onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e) }}
        />
      </div>

      <p className="text-[10px] text-slate-400">
        {format(rangeStart, 'd MMM yyyy')} – {format(rangeEnd, 'd MMM yyyy')}
        <span className="ml-1 text-slate-300">({totalDays} hari)</span>
      </p>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[
          { color: '#2563eb', label: 'Net score',    line: true  },
          { color: '#f59e0b', label: 'Hari terbaik', dot: true   },
          { color: '#5DCAA5', label: 'Diperoleh'                 },
          { color: '#F09595', label: 'Penalti'                   },
          { color: '#e2e8f0', label: 'Idle',          border: '#cbd5e1' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 text-[10px] text-slate-500">
            {l.line
              ? <span className="w-4 h-0 border-t-2 flex-shrink-0" style={{ borderColor: l.color }} />
              : <span className={`w-2.5 h-2.5 flex-shrink-0 ${l.dot ? 'rounded-full' : 'rounded-sm'}`}
                  style={{ background: l.color, border: l.border ? `1px solid ${l.border}` : undefined }}
                />
            }
            {l.label}
          </span>
        ))}
      </div>

      {/* SVG Chart */}
      <TrendChart data={trendData} />

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Total',     val: total,                        suffix: 'pts', color: 'text-brand-600'   },
          { label: 'Rata-rata', val: avg,                          suffix: 'pts/hr', color: 'text-slate-700' },
          { label: 'Terbaik',   val: peak,                         suffix: 'pts', color: 'text-amber-500'  },
          { label: 'Aktif',     val: `${activeDays}/${totalDays}`, suffix: 'hr',  color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-slate-100 p-2 text-center">
            <div className={`text-sm font-bold tabular-nums ${s.color}`}>{s.val}</div>
            <div className="text-[9px] text-slate-400 leading-tight">{s.label}</div>
            <div className="text-[9px] text-slate-300">{s.suffix}</div>
          </div>
        ))}
      </div>

      {/* Best day callout */}
      {bestDay && peak > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
          <span className="text-base">🏆</span>
          <div className="text-[10px] text-amber-700">
            <span className="font-semibold">Hari terbaik:</span> {bestDay.fullLabel} — {peak} pts
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Konstanta tab ────────────────────────────────────────────────────────────
const PERIOD_TABS = [
  { id: 'daily',   label: 'Today', icon: <Flame      className="w-3.5 h-3.5" /> },
  { id: 'weekly',  label: 'Week',  icon: <TrendingUp  className="w-3.5 h-3.5" /> },
  { id: 'monthly', label: 'Month', icon: <Calendar   className="w-3.5 h-3.5" /> },
]

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function ScoreModal({ userId, tasks, onClose }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState('daily')

  useEffect(() => {
    const since = subDays(new Date(), 90).toISOString()
    supabase
      .from('task_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setActivities(data || []); setLoading(false) })
  }, [userId])

  const now = new Date()
  const periodStart = useMemo(() => ({
    daily:   startOfDay(now),
    weekly:  startOfWeek(now, { weekStartsOn: 1 }),
    monthly: startOfMonth(now),
  }[period]), [period])

  const result   = useMemo(() => calcScore(activities, tasks, periodStart, now), [activities, tasks, period])
  const rank     = getRank(result.net)
  const maxScore = { daily: 30, weekly: 150, monthly: 500 }[period]

  const sinceMs   = periodStart.getTime()
  const recent    = activities.filter(a => new Date(a.created_at).getTime() >= sinceMs)
  const doneTasks = recent.filter(a => a.action === 'moved' && a.meta?.to === 'Done').length
  const moveCount = recent.filter(a => a.action === 'moved').length

  function eventDesc(a) {
    const task  = tasks.find(t => t.id === a.task_id)
    const title = task?.title
      ? `"${task.title.slice(0, 26)}${task.title.length > 26 ? '…' : ''}"`
      : 'task'
    const mul = PRIORITY_MUL[task?.priority ?? 'medium']
    if (a.action === 'moved' && a.meta?.to === 'Done') return { text: `✅ Selesai ${title}`,  pts: `+${DONE_BONUS * mul}`          }
    if (a.action === 'moved')                          return { text: `↪ Pindah ${title}`,    pts: `+${ACTION_PTS.moved * mul}`   }
    if (a.action === 'created')                        return { text: `✏️ Buat ${title}`,     pts: `+${ACTION_PTS.created * mul}` }
    if (a.action === 'note')                           return { text: `💬 Update ${title}`,   pts: `+${ACTION_PTS.note * mul}`    }
    if (a.action === 'updated')                        return { text: `🔧 Edit ${title}`,     pts: `+${ACTION_PTS.updated * mul}` }
    return { text: a.action, pts: '+0' }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
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
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border transition-all duration-150 ${
                period === t.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-brand-200 hover:text-brand-600'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
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
                  { icon: <Target       className="w-3.5 h-3.5 text-emerald-600" />, val: doneTasks,           label: 'Done',    bg: 'bg-emerald-50' },
                  { icon: <Zap          className="w-3.5 h-3.5 text-brand-600"   />, val: moveCount,           label: 'Moves',   bg: 'bg-brand-50'   },
                  { icon: <TrendingDown className="w-3.5 h-3.5 text-red-500"     />, val: result.overdueCount, label: 'Overdue', bg: 'bg-red-50'     },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <div className="font-display font-bold text-slate-800 text-lg">{s.val}</div>
                    <div className="text-[10px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Daily Trend Chart (pure SVG, no chart.js) ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <DailyTrendChart activities={activities} tasks={tasks} />
              </div>

              {/* Penalty breakdown */}
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
                  { label: 'Task selesai (Done)',  pts: '+5 × priority'       },
                  { label: 'Pindah kolom',         pts: '+2 × priority'       },
                  { label: 'Buat task',            pts: '+1 × priority'       },
                  { label: 'Note / update',        pts: '+1 × priority'       },
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
                  { label: 'Hari tanpa aktivitas', pts: '−1 / hari'            },
                  { label: 'Task overdue',         pts: '−2 / task'            },
                  { label: 'Minimum skor',         pts: '0 (tidak bisa minus)' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="text-red-500 font-mono text-[10px]">{r.pts}</span>
                  </div>
                ))}
              </div>

              {/* Recent events */}
              {recent.length > 0 ? (
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
              ) : (
                <div className="text-center py-4">
                  <p className="text-2xl mb-2">🌱</p>
                  <p className="text-sm text-slate-500">
                    Belum ada aktivitas{' '}
                    {period === 'daily' ? 'hari ini' : period === 'weekly' ? 'minggu ini' : 'bulan ini'}.
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
