import { useState, useEffect, useMemo, useRef } from 'react'
import { X, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  startOfDay, endOfDay,
  subDays, differenceInDays,
  format, parseISO, isValid,
} from 'date-fns'

// ─── Konstanta poin (sama persis dengan ScoreModal) ───────────────────────────
const PRIORITY_MUL = { high: 3, medium: 2, low: 1 }
const ACTION_PTS   = { created: 1, moved: 2, updated: 1, note: 1 }
const DONE_BONUS   = 5
const IDLE_PENALTY = 1
const OVERDUE_PEN  = 2

const QUICK_RANGES = [
  { id: '7d',   label: '7 Hari',   days: 7   },
  { id: '14d',  label: '14 Hari',  days: 14  },
  { id: '30d',  label: '30 Hari',  days: 30  },
  { id: '90d',  label: '3 Bulan',  days: 90  },
]

// ─── Scoring helpers ──────────────────────────────────────────────────────────
function calcDayScore(dayActs, tasks, dayStart, dayEnd) {
  let gained = 0
  const sinceMs = dayStart.getTime()
  const nowMs   = dayEnd.getTime()

  for (const a of dayActs) {
    const ts = new Date(a.created_at).getTime()
    if (ts < sinceMs || ts >= nowMs) continue
    const task = tasks.find(t => t.id === a.task_id)
    const mul  = PRIORITY_MUL[task?.priority] ?? 1
    gained += a.action === 'moved' && a.meta?.to === 'Done'
      ? DONE_BONUS * mul
      : (ACTION_PTS[a.action] ?? 1) * mul
  }

  const today        = format(new Date(), 'yyyy-MM-dd')
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today)
  const penalty      = overdueTasks.length * OVERDUE_PEN
  const net          = Math.max(0, gained - penalty)
  return { gained, penalty, net }
}

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
    const { gained, penalty, net } = calcDayScore(dayActs, tasks, dayStart, dayEnd)
    result.push({
      label:     format(dayStart, days <= 14 ? 'EEE d/M' : 'd/M'),
      fullLabel: format(dayStart, 'EEEE, d MMMM yyyy'),
      gained, penalty, net,
      idle: dayActs.length === 0,
      actCount: dayActs.length,
    })
  }
  return result
}

// ─── Date Range Picker ────────────────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, activePreset, onRangeChange, onPreset }) {
  const [open, setOpen]             = useState(false)
  const [localStart, setLocalStart] = useState(format(startDate, 'yyyy-MM-dd'))
  const [localEnd,   setLocalEnd]   = useState(format(endDate,   'yyyy-MM-dd'))
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function applyPreset(r) {
    const end   = new Date()
    const start = subDays(end, r.days - 1)
    setLocalStart(format(start, 'yyyy-MM-dd'))
    setLocalEnd(format(end, 'yyyy-MM-dd'))
    onPreset(r.id)
    onRangeChange(startOfDay(start), endOfDay(end))
    setOpen(false)
  }

  function applyCustom() {
    const s = parseISO(localStart)
    const e = parseISO(localEnd)
    if (!isValid(s) || !isValid(e) || s > e || differenceInDays(e, s) > 365) return
    onPreset(null)
    onRangeChange(startOfDay(s), endOfDay(e))
    setOpen(false)
  }

  const label = activePreset
    ? QUICK_RANGES.find(r => r.id === activePreset)?.label
    : `${format(parseISO(localStart), 'd MMM')} – ${format(parseISO(localEnd), 'd MMM yyyy')}`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-all"
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>{label}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-2xl p-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cepat</p>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_RANGES.map(r => (
                <button key={r.id} onClick={() => applyPreset(r)}
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
                  onChange={e => { setLocalStart(e.target.value); onPreset(null) }}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400 text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Sampai</label>
                <input type="date" value={localEnd} min={localStart} max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => { setLocalEnd(e.target.value); onPreset(null) }}
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

// ─── Main SVG Chart (full width, lebar) ──────────────────────────────────────
function TrendChart({ data, hoveredIdx, onHover }) {
  if (!data.length) return null

  const W    = 800
  const H    = 220
  const PADX = 10
  const PADY = 16
  const BOTTOM_LABEL = 20
  const innerW = W - PADX * 2
  const innerH = H - PADY - BOTTOM_LABEL

  const peak       = Math.max(...data.map(d => d.net), 1)
  const maxGained  = Math.max(...data.map(d => d.gained), 1)
  const maxPenalty = Math.max(...data.map(d => d.penalty), 0)

  const barSlot = innerW / data.length
  const barW    = Math.max(3, barSlot * 0.55)

  // Net line coords
  const pts = data.map((d, i) => ({
    x: PADX + i * barSlot + barSlot / 2,
    y: PADY + innerH - (d.net / peak) * innerH,
    d,
  }))

  // Smooth bezier path
  function bezierPath(points) {
    if (points.length < 2) return ''
    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const cpx  = (prev.x + curr.x) / 2
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
    }
    return d
  }

  const linePath = bezierPath(pts)
  const areaPath = pts.length > 1
    ? `M ${pts[0].x},${PADY + innerH} ` +
      pts.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${pts[pts.length - 1].x},${PADY + innerH} Z`
    : ''

  // Y gridlines & labels
  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  // X label: show every N-th
  const labelStep = data.length <= 14 ? 1 : data.length <= 31 ? 3 : 7

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      onMouseLeave={() => onHover(null)}
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2563eb" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="gainedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10b981" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.7"  />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Grid lines + Y labels */}
      {gridLines.map(t => {
        const y   = PADY + innerH * (1 - t)
        const val = Math.round(peak * t)
        return (
          <g key={t}>
            <line x1={PADX} x2={W - PADX} y1={y} y2={y}
              stroke={t === 0 ? '#cbd5e1' : '#f1f5f9'}
              strokeWidth={t === 0 ? 1 : 0.8}
              strokeDasharray={t === 0 ? '0' : '4 4'}
            />
            {t > 0 && (
              <text x={PADX - 2} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{val}</text>
            )}
          </g>
        )
      })}

      {/* Stacked bars */}
      {data.map((d, i) => {
        const cx       = PADX + i * barSlot + barSlot / 2
        const x        = cx - barW / 2
        const gainedH  = maxGained  > 0 ? (d.gained  / maxGained)  * innerH * 0.7 : 0
        const penaltyH = maxPenalty > 0 ? (d.penalty / maxPenalty) * innerH * 0.15 : 0
        const gainY    = PADY + innerH - gainedH
        const penaltyY = PADY + innerH
        const isHov    = hoveredIdx === i

        return (
          <g key={i}>
            {/* Hover background */}
            {isHov && (
              <rect
                x={cx - barSlot / 2} y={PADY - 4}
                width={barSlot} height={innerH + 4}
                fill="#f8fafc" rx="4"
              />
            )}

            {/* Gained bar */}
            {gainedH > 0 && (
              <rect x={x} y={gainY} width={barW} height={gainedH}
                rx="3" ry="3"
                fill={d.idle ? '#e2e8f0' : 'url(#gainedGrad)'}
                fillOpacity={isHov ? 1 : 0.82}
              />
            )}

            {/* Penalty bar */}
            {penaltyH > 0 && (
              <rect x={x} y={penaltyY} width={barW} height={penaltyH}
                rx="2" ry="2"
                fill="#f87171"
                fillOpacity={isHov ? 0.9 : 0.65}
              />
            )}

            {/* Hover hit area */}
            <rect
              x={cx - barSlot / 2} y={PADY} width={barSlot} height={innerH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onMouseEnter={() => onHover(i)}
            />
          </g>
        )
      })}

      {/* Area fill */}
      {pts.length > 1 && (
        <path d={areaPath} fill="url(#areaGrad)" />
      )}

      {/* Net score line */}
      {pts.length > 1 && (
        <path d={linePath} fill="none"
          stroke="#2563eb" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round"
        />
      )}

      {/* Dots */}
      {pts.map((p, i) => {
        const isBest = p.d.net === peak && peak > 0
        const isHov  = hoveredIdx === i
        return (
          <circle key={i}
            cx={p.x} cy={p.y}
            r={isBest ? 5 : isHov ? 4.5 : data.length > 30 ? 1.5 : 3}
            fill={isBest ? '#f59e0b' : '#2563eb'}
            stroke="white" strokeWidth={isBest || isHov ? 2 : 1.2}
            filter={isBest ? 'url(#glow)' : undefined}
          />
        )
      })}

      {/* Baseline */}
      <line x1={PADX} x2={W - PADX} y1={PADY + innerH} y2={PADY + innerH}
        stroke="#cbd5e1" strokeWidth="1" />

      {/* X-axis labels */}
      {data.map((d, i) => {
        const show = i % labelStep === 0 || i === data.length - 1
        if (!show) return null
        const cx = PADX + i * barSlot + barSlot / 2
        return (
          <text key={i} x={cx} y={H - 4}
            textAnchor="middle" fontSize="9"
            fill={hoveredIdx === i ? '#2563eb' : '#94a3b8'}
            fontWeight={hoveredIdx === i ? '600' : '400'}
          >{d.label}</text>
        )
      })}
    </svg>
  )
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────
function TooltipCard({ d }) {
  if (!d) return (
    <div className="h-[88px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
      Hover bar untuk detail hari
    </div>
  )
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-4 gap-3">
      <div className="col-span-4 sm:col-span-1">
        <p className="text-[10px] text-slate-400 mb-0.5">Tanggal</p>
        <p className="text-xs font-semibold text-slate-700 leading-tight">{d.fullLabel}</p>
        {d.idle && <span className="text-[9px] text-slate-400 bg-slate-100 rounded px-1 mt-1 inline-block">Idle</span>}
      </div>
      <div className="text-center">
        <p className="text-[10px] text-slate-400 mb-0.5">Diperoleh</p>
        <p className="text-sm font-bold text-emerald-600">+{d.gained}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-slate-400 mb-0.5">Penalti</p>
        <p className="text-sm font-bold text-red-500">−{d.penalty}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-slate-400 mb-0.5">Net</p>
        <p className="text-sm font-bold text-brand-600">{d.net}</p>
      </div>
      {d.actCount > 0 && (
        <div className="col-span-4">
          <p className="text-[10px] text-slate-400">{d.actCount} aktivitas tercatat</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function TrendModal({ userId, tasks, onClose }) {
  const [activities,   setActivities]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activePreset, setActivePreset] = useState('30d')
  const [rangeStart,   setRangeStart]   = useState(startOfDay(subDays(new Date(), 29)))
  const [rangeEnd,     setRangeEnd]     = useState(endOfDay(new Date()))
  const [hoveredIdx,   setHoveredIdx]   = useState(null)

  useEffect(() => {
    const since = subDays(new Date(), 90).toISOString()
    supabase
      .from('task_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setActivities(data || []); setLoading(false) })
  }, [userId])

  const trendData = useMemo(
    () => buildDailyTrend(activities, tasks, rangeStart, rangeEnd),
    [activities, tasks, rangeStart, rangeEnd]
  )

  const totalDays  = trendData.length
  const totalScore = trendData.reduce((s, d) => s + d.net, 0)
  const avg        = totalDays ? Math.round(totalScore / totalDays) : 0
  const peak       = totalDays ? Math.max(...trendData.map(d => d.net)) : 0
  const activeDays = trendData.filter(d => !d.idle).length
  const bestDay    = trendData.find(d => d.net === peak)
  const streak     = useMemo(() => {
    let s = 0
    for (let i = trendData.length - 1; i >= 0; i--) {
      if (!trendData[i].idle) s++
      else break
    }
    return s
  }, [trendData])

  const hoveredData = hoveredIdx !== null ? trendData[hoveredIdx] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[92dvh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-brand-600" />
            </div>
            <div>
              <p className="font-display font-semibold text-slate-800">Tren Skor Harian</p>
              <p className="text-[10px] text-slate-400">
                {format(rangeStart, 'd MMM yyyy')} – {format(rangeEnd, 'd MMM yyyy')}
                <span className="ml-1 text-slate-300">({totalDays} hari)</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker
              startDate={rangeStart}
              endDate={rangeEnd}
              activePreset={activePreset}
              onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e) }}
              onPreset={setActivePreset}
            />
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { label: 'Total Score', val: totalScore,                 suffix: 'pts',  color: 'text-brand-600',   bg: 'bg-brand-50 border-brand-100'     },
                  { label: 'Rata-rata',   val: avg,                        suffix: 'pts/hr', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200'    },
                  { label: 'Terbaik',     val: peak,                       suffix: 'pts',  color: 'text-amber-500',   bg: 'bg-amber-50 border-amber-100'     },
                  { label: 'Hari Aktif',  val: `${activeDays}/${totalDays}`, suffix: '',   color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                  { label: 'Streak',      val: streak,                     suffix: 'hr',   color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100'   },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border ${s.bg} p-3 text-center`}>
                    <div className={`text-xl font-display font-bold tabular-nums ${s.color}`}>
                      {s.val}<span className="text-xs font-normal ml-0.5 text-slate-400">{s.suffix}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 flex-wrap">
                {[
                  { color: '#2563eb', label: 'Net score',    line: true  },
                  { color: '#f59e0b', label: 'Hari terbaik', dot: true   },
                  { color: '#10b981', label: 'Diperoleh'                 },
                  { color: '#f87171', label: 'Penalti'                   },
                  { color: '#e2e8f0', label: 'Idle',         border: '#cbd5e1' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {l.line
                      ? <span className="w-5 h-0 border-t-2 flex-shrink-0 rounded" style={{ borderColor: l.color }} />
                      : <span className={`w-3 h-3 flex-shrink-0 ${l.dot ? 'rounded-full' : 'rounded-sm'}`}
                          style={{ background: l.color, border: l.border ? `1px solid ${l.border}` : undefined }}
                        />
                    }
                    {l.label}
                  </span>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <TrendChart
                  data={trendData}
                  hoveredIdx={hoveredIdx}
                  onHover={setHoveredIdx}
                />
              </div>

              {/* Tooltip / detail card */}
              <TooltipCard d={hoveredData} />

              {/* Best day callout */}
              {bestDay && peak > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Hari Terbaik dalam Periode Ini</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      {bestDay.fullLabel} — <span className="font-bold">{peak} pts</span> net
                      {bestDay.gained > 0 && ` (+${bestDay.gained} diperoleh)`}
                    </p>
                  </div>
                </div>
              )}

              {/* Streak callout */}
              {streak >= 3 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-xs font-semibold text-violet-700">Streak Aktif: {streak} Hari!</p>
                    <p className="text-[11px] text-violet-500 mt-0.5">Pertahankan momentumnya — jangan sampai putus!</p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {totalScore === 0 && !loading && (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-sm text-slate-500">Belum ada data skor dalam rentang ini.</p>
                  <p className="text-xs text-slate-400 mt-1">Coba perluas rentang tanggal atau mulai aktivitas baru.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
