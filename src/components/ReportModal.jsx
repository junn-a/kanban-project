import { useState, useEffect, useMemo } from 'react'
import { X, BarChart2, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const DAY_NAMES    = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

// ─── Monthly helpers ────────────────────────────────────────────────────────

function buildMonthStats(tasks, activities, monthStart, monthEnd) {
  const inRange = (d) => d >= monthStart && d <= monthEnd

  const created = tasks.filter(t => inRange(new Date(t.created_at))).length

  const done = activities.filter(a =>
    a.action === 'moved' && a.meta?.to === 'Done' && inRange(new Date(a.created_at))
  ).length

  const overdue = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const due = new Date(t.due_date + 'T00:00:00')
    return due <= monthEnd
  }).length

  const notes = activities.filter(a =>
    a.action === 'note' && inRange(new Date(a.created_at))
  ).length

  const moves = activities.filter(a =>
    a.action === 'moved' && inRange(new Date(a.created_at))
  ).length

  const completionRate = created > 0 ? Math.round((done / created) * 100) : 0

  return { created, done, overdue, notes, moves, completionRate }
}

// ─── Weekly helpers ─────────────────────────────────────────────────────────

function buildWeekStats(tasks, activities, offsetWeeks = 0) {
  const days = []
  const now  = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i - offsetWeeks * 7)
    const start = new Date(d.setHours(0, 0, 0, 0))
    const end   = new Date(new Date(start).setHours(23, 59, 59, 999))
    const inRange = (dt) => dt >= start && dt <= end

    const done = activities.filter(a =>
      a.action === 'moved' && a.meta?.to === 'Done' && inRange(new Date(a.created_at))
    ).length

    const moved = activities.filter(a =>
      a.action === 'moved' && inRange(new Date(a.created_at))
    ).length

    const notes = activities.filter(a =>
      a.action === 'note' && inRange(new Date(a.created_at))
    ).length

    days.push({
      dayIdx: new Date(start).getDay(),
      isToday: offsetWeeks === 0 && i === 0,
      done,
      moved,
      notes,
    })
  }
  return days
}

// ─── SVG bar chart (monthly) ─────────────────────────────────────────────────

function BarChart({ data, dataKey, color, maxVal, height = 80 }) {
  const max = maxVal || Math.max(...data.map(d => d[dataKey]), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const pct    = max > 0 ? (d[dataKey] / max) * 100 : 0
        const isLast = i === data.length - 1
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
              {d[dataKey]}
            </div>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${isLast ? color.replace('500','600') : color} ${isLast ? 'opacity-100' : 'opacity-70'}`}
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── SVG trend line (monthly) ────────────────────────────────────────────────

function TrendLine({ data, dataKey, color }) {
  const vals = data.map(d => d[dataKey])
  const max  = Math.max(...vals, 1)
  const min  = 0
  const W = 300, H = 60, PAD = 8

  const points = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)
    return `${x},${y}`
  }).join(' ')

  const area = `M ${PAD},${H} ` + vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)
    return `L ${x},${y}`
  }).join(' ') + ` L ${W - PAD},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <path d={area} fill={color} fillOpacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => {
        const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2)
        const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />
      })}
    </svg>
  )
}

// ─── Trend badge ─────────────────────────────────────────────────────────────

function TrendBadge({ current, previous }) {
  if (previous === 0 && current === 0)
    return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" />-</span>
  if (previous === 0)
    return <span className="text-emerald-600 text-xs flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />Baru</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0)  return <span className="text-emerald-600 text-xs font-medium flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{pct}%</span>
  if (pct < 0)  return <span className="text-red-500 text-xs font-medium flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{pct}%</span>
  return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" />0%</span>
}

// ─── Tab configs ──────────────────────────────────────────────────────────────

const CHART_TABS = [
  { id: 'done',           label: 'Selesai',  color: 'bg-emerald-500', svgColor: '#10b981' },
  { id: 'created',        label: 'Dibuat',   color: 'bg-brand-500',   svgColor: '#3b82f6' },
  { id: 'completionRate', label: 'Rate %',   color: 'bg-violet-500',  svgColor: '#8b5cf6' },
  { id: 'notes',          label: 'Notes',    color: 'bg-amber-500',   svgColor: '#f59e0b' },
]

const WEEK_TABS = [
  { id: 'done',  label: 'Selesai',  activeClass: 'bg-emerald-500', barColor: '#10b981' },
  { id: 'moved', label: 'Dipindah', activeClass: 'bg-violet-500',  barColor: '#8b5cf6' },
  { id: 'notes', label: 'Notes',    activeClass: 'bg-amber-500',   barColor: '#f59e0b' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportModal({ userId, tasks: allTasks, onClose }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [chartTab, setChartTab]     = useState('done')
  const [weekTab, setWeekTab]       = useState('done')

  useEffect(() => {
    const since = subMonths(new Date(), 6).toISOString()
    supabase.from('task_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .then(({ data }) => { setActivities(data || []); setLoading(false) })
  }, [userId])

  // ── Monthly data ──
  const monthsData = useMemo(() => {
    const now    = new Date()
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now })
    return months.map(m => {
      const start = startOfMonth(m)
      const end   = endOfMonth(m)
      const stats = buildMonthStats(allTasks, activities, start, end)
      return { label: MONTH_LABELS[m.getMonth()], month: m, ...stats }
    })
  }, [allTasks, activities])

  const current  = monthsData[monthsData.length - 1] || {}
  const previous = monthsData[monthsData.length - 2] || {}

  const activeChart = CHART_TABS.find(t => t.id === chartTab)
  const maxVal      = Math.max(...monthsData.map(d => d[chartTab] || 0), 1)

  // ── Weekly data ──
  const weekData     = useMemo(() => buildWeekStats(allTasks, activities, 0), [allTasks, activities])
  const prevWeekData = useMemo(() => buildWeekStats(allTasks, activities, 1), [allTasks, activities])

  const weekVals     = weekData.map(d => d[weekTab])
  const prevWeekVals = prevWeekData.map(d => d[weekTab])
  const weekTotal    = weekVals.reduce((a, b) => a + b, 0)
  const prevTotal    = prevWeekVals.reduce((a, b) => a + b, 0)
  const weekMax      = Math.max(...weekVals, 1)
  const weekAvg      = Math.round(weekTotal / 7)
  const bestIdx      = weekVals.indexOf(Math.max(...weekVals))
  const weekDiff     = prevTotal === 0 ? null : Math.round(((weekTotal - prevTotal) / prevTotal) * 100)
  const todayVsYest  = weekVals[5] === 0 ? null : Math.round(((weekVals[6] - weekVals[5]) / weekVals[5]) * 100)
  const activeWeekTab = WEEK_TABS.find(t => t.id === weekTab)

  // ── Insights ──
  const insights = useMemo(() => {
    const list = []
    if (!current.done && !loading)
      list.push({ icon: '💤', text: 'Belum ada task selesai bulan ini. Yuk mulai!', type: 'warn' })
    else if (current.done > (previous.done || 0))
      list.push({ icon: '🚀', text: `${current.done} task selesai bulan ini — lebih baik dari bulan lalu!`, type: 'good' })
    if (current.overdue > 0)
      list.push({ icon: '⚠️', text: `${current.overdue} task melewati deadline. Segera tindak lanjuti.`, type: 'warn' })
    if (current.completionRate >= 80)
      list.push({ icon: '🏆', text: `Completion rate ${current.completionRate}% — luar biasa!`, type: 'good' })
    else if (current.completionRate > 0)
      list.push({ icon: '📈', text: `Completion rate ${current.completionRate}%. Target: 80%+`, type: 'info' })
    if (current.notes >= 5)
      list.push({ icon: '📝', text: `Aktif mencatat — ${current.notes} update bulan ini.`, type: 'good' })
    return list.slice(0, 3)
  }, [current, previous, loading])

  const insightColor = {
    good: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-brand-50 border-brand-200 text-brand-800',
  }

  // ── Render ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <span className="font-display font-semibold text-slate-800">Laporan Performa</span>
              <p className="text-[10px] text-slate-400">6 bulan terakhir</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* ── KPI cards ── */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Bulan Ini vs Bulan Lalu</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, label: 'Selesai',  key: 'done',           bg: 'bg-emerald-50' },
                    { icon: <Zap          className="w-4 h-4 text-brand-600"   />, label: 'Dibuat',   key: 'created',        bg: 'bg-brand-50'   },
                    { icon: <TrendingUp   className="w-4 h-4 text-violet-600"  />, label: 'Rate',     key: 'completionRate', bg: 'bg-violet-50', suffix: '%' },
                    { icon: <AlertCircle  className="w-4 h-4 text-amber-600"   />, label: 'Overdue',  key: 'overdue',        bg: 'bg-amber-50'   },
                  ].map(s => (
                    <div key={s.key} className={`${s.bg} rounded-xl p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        {s.icon}
                        <TrendBadge current={current[s.key] || 0} previous={previous[s.key] || 0} />
                      </div>
                      <div className="font-display font-bold text-slate-800 text-2xl">
                        {current[s.key] || 0}{s.suffix || ''}
                      </div>
                      <div className="text-[10px] text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Monthly trend chart ── */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Tren 6 Bulan</p>
                  <div className="flex gap-1">
                    {CHART_TABS.map(t => (
                      <button key={t.id} onClick={() => setChartTab(t.id)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition ${chartTab === t.id ? `${t.color} text-white` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <TrendLine data={monthsData} dataKey={chartTab} color={activeChart?.svgColor || '#3b82f6'} />

                <div className="pt-1">
                  <BarChart data={monthsData} dataKey={chartTab} color={activeChart?.color || 'bg-brand-500'} maxVal={maxVal} height={60} />
                  <div className="flex mt-1">
                    {monthsData.map((d, i) => (
                      <div key={i} className="flex-1 text-center text-[9px] text-slate-400">{d.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Weekly trend ── */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Tren 7 Hari Terakhir</p>
                  <div className="flex gap-1">
                    {WEEK_TABS.map(t => (
                      <button key={t.id} onClick={() => setWeekTab(t.id)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition ${weekTab === t.id ? `${t.activeClass} text-white` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar chart harian */}
                <div className="flex items-end gap-1.5 pt-5" style={{ height: 72 }}>
                  {weekData.map((day, i) => {
                    const pct = Math.max((weekVals[i] / weekMax) * 100, 4)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] font-semibold text-slate-600 whitespace-nowrap z-10">
                          {weekVals[i]}
                        </span>
                        <div
                          className={`w-full rounded-t-md transition-all duration-500`}
                          style={{
                            height: `${pct}%`,
                            background: activeWeekTab?.barColor || '#10b981',
                            opacity: day.isToday ? 1 : 0.55,
                            outline: day.isToday ? `2px solid ${activeWeekTab?.barColor}` : 'none',
                            outlineOffset: 2,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Day labels */}
                <div className="flex gap-1.5">
                  {weekData.map((day, i) => (
                    <div key={i} className={`flex-1 text-center text-[9px] ${day.isToday ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                      {DAY_NAMES[day.dayIdx]}{day.isToday && ' ●'}
                    </div>
                  ))}
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total',     val: weekTotal,            sub: null },
                    { label: 'Rata-rata', val: `${weekAvg}`,         sub: 'per hari' },
                    { label: 'Hari ini',  val: weekVals[6],          trend: todayVsYest },
                    { label: 'Terbaik',   val: Math.max(...weekVals), sub: DAY_NAMES[weekData[bestIdx]?.dayIdx] },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-2">
                      <div className="text-[9px] text-slate-400 mb-1">{s.label}</div>
                      <div className="font-display font-bold text-slate-800 text-lg leading-none">{s.val}</div>
                      {s.trend !== undefined && s.trend !== null && (
                        <div className={`text-[9px] mt-1 ${s.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {s.trend >= 0 ? '▲' : '▼'} {Math.abs(s.trend)}% vs kemarin
                        </div>
                      )}
                      {s.sub && <div className="text-[9px] text-slate-400 mt-1">{s.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Best day callout */}
                {Math.max(...weekVals) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-[11px] text-slate-500">
                    <span>🏅</span>
                    <span>
                      Hari terbaik: <span className="font-medium text-slate-700">{DAY_NAMES[weekData[bestIdx]?.dayIdx]}</span>
                      {' '}dengan <span className="font-medium text-slate-700">{Math.max(...weekVals)} {WEEK_TABS.find(t=>t.id===weekTab)?.label.toLowerCase()}</span>
                    </span>
                  </div>
                )}

                {/* Minggu ini vs lalu */}
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] text-slate-400 mb-2">Minggu ini vs minggu lalu</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="shrink-0 min-w-[56px]">
                      Ini: <span className="font-semibold text-slate-700">{weekTotal}</span>
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      {(() => {
                        const maxW    = Math.max(weekTotal, prevTotal, 1)
                        const thisPct = Math.round((weekTotal / maxW) * 100)
                        return (
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${thisPct}%`, background: activeWeekTab?.barColor || '#10b981' }}
                          />
                        )
                      })()}
                    </div>
                    <span className="shrink-0 min-w-[56px] text-right">
                      Lalu: <span className="font-semibold text-slate-700">{prevTotal}</span>
                    </span>
                    {weekDiff !== null && (
                      <span className={`font-semibold shrink-0 ${weekDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {weekDiff >= 0 ? '+' : ''}{weekDiff}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Monthly breakdown table ── */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Detail Per Bulan</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Bulan</th>
                      <th className="text-center px-2 py-2 text-emerald-600 font-medium">✅</th>
                      <th className="text-center px-2 py-2 text-brand-600 font-medium">✏️</th>
                      <th className="text-center px-2 py-2 text-amber-600 font-medium">⚠️</th>
                      <th className="text-center px-2 py-2 text-violet-600 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...monthsData].reverse().map((d, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i === 0 ? 'bg-brand-50/40 font-medium' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2 text-slate-700">
                          {d.label} {i === 0 && <span className="text-[9px] text-brand-500 ml-1">ini</span>}
                        </td>
                        <td className="text-center px-2 py-2 text-slate-700">{d.done}</td>
                        <td className="text-center px-2 py-2 text-slate-700">{d.created}</td>
                        <td className="text-center px-2 py-2 text-slate-700">{d.overdue}</td>
                        <td className="text-center px-2 py-2">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            d.completionRate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            d.completionRate >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-50 text-red-600'
                          }`}>{d.completionRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Insights ── */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Insight</p>
                  {insights.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${insightColor[ins.type]}`}>
                      <span>{ins.icon}</span>
                      <span>{ins.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
