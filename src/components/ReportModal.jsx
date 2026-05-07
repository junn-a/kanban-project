import { useState, useEffect, useMemo } from 'react'
import { X, BarChart2, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, AlertCircle, Zap, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { 
  format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, 
  subDays, eachDayOfInterval, isSameDay, startOfDay, endOfDay 
} from 'date-fns'
import { id } from 'date-fns/locale'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

// Fungsi helper tetap dipertahankan
function buildMonthStats(tasks, activities, monthStart, monthEnd) {
  const inRange = (d) => d >= monthStart && d <= monthEnd
  const created = tasks.filter(t => inRange(new Date(t.created_at))).length
  const done = activities.filter(a => a.action === 'moved' && a.meta?.to === 'Done' && inRange(new Date(a.created_at))).length
  const overdue = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date + 'T00:00:00') <= monthEnd).length
  const notes = activities.filter(a => a.action === 'note' && inRange(new Date(a.created_at))).length
  const completionRate = created > 0 ? Math.round((done / created) * 100) : 0
  return { created, done, overdue, notes, completionRate }
}

// Fitur Baru: Build Daily Stats untuk perbandingan harian
function buildDailyStats(tasks, activities, date) {
  const s = startOfDay(date);
  const e = endOfDay(date);
  const inDay = (d) => d >= s && d <= e;

  const created = tasks.filter(t => inDay(new Date(t.created_at))).length;
  const done = activities.filter(a => a.action === 'moved' && a.meta?.to === 'Done' && inDay(new Date(a.created_at))).length;
  const notes = activities.filter(a => a.action === 'note' && inDay(new Date(a.created_at))).length;
  const completionRate = created > 0 ? Math.round((done / created) * 100) : 0;

  return { created, done, notes, completionRate };
}

function BarChart({ data, dataKey, color, maxVal, height = 80 }) {
  const max = maxVal || Math.max(...data.map(d => d[dataKey]), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d[dataKey] / max) * 100 : 0
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
        return <circle key={i} cx={x} cy={y} r="2.5" fill="white" stroke={color} strokeWidth="1.5" />
      })}
    </svg>
  )
}

function TrendBadge({ current, previous }) {
  if (previous === 0 && current === 0) return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" />-</span>
  if (previous === 0) return <span className="text-emerald-600 text-xs flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />Baru</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct > 0)  return <span className="text-emerald-600 text-xs font-medium flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{pct}%</span>
  if (pct < 0)  return <span className="text-red-500 text-xs font-medium flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{pct}%</span>
  return <span className="text-slate-400 text-xs flex items-center gap-0.5"><Minus className="w-3 h-3" />0%</span>
}

const CHART_TABS = [
  { id: 'done',           label: 'Selesai',    color: 'bg-emerald-500', svgColor: '#10b981' },
  { id: 'created',        label: 'Dibuat',     color: 'bg-brand-500',   svgColor: '#3b82f6' },
  { id: 'completionRate', label: 'Rate %',     color: 'bg-violet-500',  svgColor: '#8b5cf6' },
]

export default function ReportModal({ userId, tasks: allTasks, onClose }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [chartTab, setChartTab]     = useState('done')
  const [rangeType, setRangeType]   = useState('monthly') // 'monthly' atau 'weekly'

  useEffect(() => {
    const since = subMonths(new Date(), 6).toISOString()
    supabase.from('task_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .then(({ data }) => { setActivities(data || []); setLoading(false) })
  }, [userId])

  // Data Bulanan (Existing)
  const monthsData = useMemo(() => {
    const now = new Date()
    return eachMonthOfInterval({ start: subMonths(now, 5), end: now }).map(m => ({
      label: MONTH_LABELS[m.getMonth()],
      ...buildMonthStats(allTasks, activities, startOfMonth(m), endOfMonth(m))
    }))
  }, [allTasks, activities])

  // Fitur Baru: Data Mingguan (7 hari terakhir)
  const weeklyData = useMemo(() => {
    const now = new Date()
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now })
    return days.map(d => ({
      label: format(d, 'EEE', { locale: id }),
      fullDate: format(d, 'dd MMM'),
      ...buildDailyStats(allTasks, activities, d)
    }))
  }, [allTasks, activities])

  const activeData = rangeType === 'monthly' ? monthsData : weeklyData
  const current    = activeData[activeData.length - 1] || {}
  const previous   = activeData[activeData.length - 2] || {}
  const activeChart = CHART_TABS.find(t => t.id === chartTab)
  const maxVal      = Math.max(...activeData.map(d => d[chartTab] || 0), 1)

  const insightColor = { good: 'bg-emerald-50 border-emerald-200 text-emerald-800', warn: 'bg-amber-50 border-amber-200 text-amber-800', info: 'bg-brand-50 border-brand-200 text-brand-800' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <span className="font-display font-semibold text-slate-800">Laporan Performa</span>
              <div className="flex gap-2 mt-0.5">
                 <button 
                  onClick={() => setRangeType('monthly')}
                  className={`text-[10px] uppercase tracking-wider font-bold ${rangeType === 'monthly' ? 'text-brand-600' : 'text-slate-400'}`}>
                  Bulanan
                </button>
                <span className="text-[10px] text-slate-300">|</span>
                <button 
                  onClick={() => setRangeType('weekly')}
                  className={`text-[10px] uppercase tracking-wider font-bold ${rangeType === 'weekly' ? 'text-brand-600' : 'text-slate-400'}`}>
                  Mingguan
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              {/* Info Period Badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-600 font-medium">
                  {rangeType === 'monthly' ? 'Tren 6 Bulan Terakhir' : 'Perbandingan 7 Hari Terakhir'}
                </span>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, label: 'Selesai',   key: 'done',           bg: 'bg-emerald-50' },
                  { icon: <Zap className="w-4 h-4 text-brand-600" />,            label: 'Dibuat',    key: 'created',        bg: 'bg-brand-50'   },
                  { icon: <TrendingUp className="w-4 h-4 text-violet-600" />,    label: 'Rate',      key: 'completionRate', bg: 'bg-violet-50', suffix: '%' },
                  { icon: <Clock className="w-4 h-4 text-amber-600" />,          label: 'Aktivitas', key: 'notes',          bg: 'bg-amber-50'   },
                ].map(s => (
                  <div key={s.key} className={`${s.bg} rounded-xl p-3 border border-transparent hover:border-slate-200 transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                      {s.icon}
                      <TrendBadge current={current[s.key]||0} previous={previous[s.key]||0} />
                    </div>
                    <div className="font-display font-bold text-slate-800 text-2xl">{current[s.key]||0}{s.suffix||''}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">{rangeType === 'weekly' ? 'Hari Ini' : 'Bulan Ini'}</div>
                  </div>
                ))}
              </div>

              {/* Trend chart with custom toggle */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Grafik Perbandingan</p>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg">
                    {CHART_TABS.map(t => (
                      <button key={t.id} onClick={() => setChartTab(t.id)}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition ${chartTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative py-2">
                  <TrendLine data={activeData} dataKey={chartTab} color={activeChart?.svgColor || '#3b82f6'} />
                </div>

                <div>
                  <BarChart data={activeData} dataKey={chartTab} color={activeChart?.color || 'bg-brand-500'} maxVal={maxVal} height={60} />
                  <div className="flex mt-2">
                    {activeData.map((d, i) => (
                      <div key={i} className="flex-1 text-center group cursor-default">
                        <div className="text-[9px] text-slate-400 font-medium">{d.label}</div>
                        {rangeType === 'weekly' && <div className="text-[7px] text-slate-300 hidden group-hover:block">{d.fullDate}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-slate-500 font-bold uppercase text-[9px]">Periode</th>
                      <th className="text-center px-2 py-2.5 text-slate-500 font-bold uppercase text-[9px]">Done</th>
                      <th className="text-center px-2 py-2.5 text-slate-500 font-bold uppercase text-[9px]">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeData].reverse().map((d, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i === 0 ? 'bg-brand-50/30' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-2 font-medium text-slate-700">
                          {d.fullDate || d.label} {i === 0 && <span className="text-[8px] bg-brand-100 text-brand-600 px-1 rounded ml-1">LATEST</span>}
                        </td>
                        <td className="text-center px-2 py-2 text-emerald-600 font-bold">{d.done}</td>
                        <td className="text-center px-2 py-2">
                          <span className={`text-[10px] font-bold ${d.completionRate >= 80 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {d.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
