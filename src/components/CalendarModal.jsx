import { useState, useEffect, useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, Grid3x3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  format, startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachDayOfInterval, eachMonthOfInterval, getDay, getDaysInMonth,
  isSameDay, addMonths, subMonths, addYears, subYears, parseISO
} from 'date-fns'
import { id } from 'date-fns/locale'

// ─── Heat intensity ───────────────────────────────────────────────────────────
function heatColor(count, type) {
  if (!count) return { bg: 'bg-slate-100', border: 'border-slate-200' }
  const levels = {
    due:     ['bg-slate-200','bg-slate-300','bg-slate-400','bg-slate-500','bg-slate-700'],
    created: ['bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-500', 'bg-blue-700'],
    done:    ['bg-emerald-100','bg-emerald-200','bg-emerald-400','bg-emerald-500','bg-emerald-700'],
  }
  const idx = Math.min(count - 1, 4)
  return { bg: (levels[type] || levels.due)[idx], border: 'border-transparent' }
}

function mergedHeat(counts) {
  // blend all 3 types for "all" view
  const total = (counts.due||0) + (counts.created||0) + (counts.done||0)
  if (!total) return 'bg-slate-100'
  const d = counts.done||0, p = counts.created||0, t = counts.due||0
  if (d >= p && d >= t) return heatColor(d,'done').bg
  if (p >= t) return heatColor(p,'created').bg
  return heatColor(t,'due').bg
}

const LAYER_CONFIG = {
  all:     { label: 'Semua',    color: 'bg-slate-400' },
  due:     { label: 'Due Date', color: 'bg-slate-500' },
  created: { label: 'Dibuat',   color: 'bg-blue-500'  },
  done:    { label: 'Selesai',  color: 'bg-emerald-500'},
}

const VIEW_MODES = [
  { id: 'month', label: 'Bulanan', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'year',  label: 'Tahunan', icon: <Grid3x3 className="w-3.5 h-3.5" /> },
]

const WEEKDAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function CalendarModal({ userId, onClose }) {
  const [view, setView]       = useState('month')
  const [layer, setLayer]     = useState('all')
  const [cursor, setCursor]   = useState(new Date())
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null) // { date, x, y, items }

  useEffect(() => {
    supabase.from('tasks').select('id,title,status,priority,due_date,created_at,updated_at')
      .eq('user_id', userId)
      .then(({ data }) => { setTasks(data || []); setLoading(false) })
  }, [userId])

  // Build date → counts map
  const dateMap = useMemo(() => {
    const map = {}
    const key = d => format(d, 'yyyy-MM-dd')
    for (const t of tasks) {
      if (t.due_date) {
        const k = t.due_date
        if (!map[k]) map[k] = { due:0, created:0, done:0, tasks:[] }
        map[k].due++
        map[k].tasks.push({ ...t, _layer: 'due' })
      }
      if (t.created_at) {
        const k = key(new Date(t.created_at))
        if (!map[k]) map[k] = { due:0, created:0, done:0, tasks:[] }
        map[k].created++
        map[k].tasks.push({ ...t, _layer: 'created' })
      }
      if (t.status === 'done' && t.updated_at) {
        const k = key(new Date(t.updated_at))
        if (!map[k]) map[k] = { due:0, created:0, done:0, tasks:[] }
        map[k].done++
        map[k].tasks.push({ ...t, _layer: 'done' })
      }
    }
    return map
  }, [tasks])

  // ─── Month view ────────────────────────────────────────────────────────────
  function MonthGrid() {
    const first   = startOfMonth(cursor)
    const days    = eachDayOfInterval({ start: first, end: endOfMonth(cursor) })
    const startWd = getDay(first) // 0=Sun

    const getCellBg = (d) => {
      const k   = format(d, 'yyyy-MM-dd')
      const cnt = dateMap[k]
      if (!cnt) return 'bg-slate-50 hover:bg-slate-100'
      if (layer === 'all')     return mergedHeat(cnt) + ' hover:opacity-80'
      return heatColor(cnt[layer], layer).bg + ' hover:opacity-80'
    }

    const getDots = (d) => {
      const k   = format(d, 'yyyy-MM-dd')
      const cnt = dateMap[k]
      if (!cnt) return null
      const dots = []
      if (cnt.due     > 0) dots.push('bg-slate-500')
      if (cnt.created > 0) dots.push('bg-blue-500')
      if (cnt.done    > 0) dots.push('bg-emerald-500')
      return dots
    }

    return (
      <div>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-[10px] font-semibold text-slate-400 py-1">{w}</div>
          ))}
        </div>
        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startWd }).map((_, i) => <div key={`e${i}`} />)}
          {days.map(d => {
            const k    = format(d, 'yyyy-MM-dd')
            const cnt  = dateMap[k]
            const dots = getDots(d)
            const isToday = isSameDay(d, new Date())
            return (
              <div
                key={k}
                onMouseEnter={e => cnt && setTooltip({ date: d, counts: cnt, rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => setTooltip(null)}
                className={`
                  relative aspect-square rounded-lg flex flex-col items-center justify-center cursor-default transition-all
                  ${getCellBg(d)}
                  ${isToday ? 'ring-2 ring-brand-400 ring-offset-1' : ''}
                `}
              >
                <span className={`text-[11px] font-medium leading-none ${cnt ? 'text-slate-700' : 'text-slate-400'}`}>
                  {format(d, 'd')}
                </span>
                {dots && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dots.slice(0,3).map((c,i) => <span key={i} className={`w-1 h-1 rounded-full ${c}`} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Year view (GitHub style) ──────────────────────────────────────────────
  function YearGrid() {
    const year   = cursor.getFullYear()
    const months = eachMonthOfInterval({
      start: new Date(year, 0, 1),
      end:   new Date(year, 11, 31),
    })

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {months.map(m => {
          const days    = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) })
          const startWd = getDay(startOfMonth(m))
          return (
            <div key={m.toISOString()} className="space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 text-center">
                {MONTH_NAMES[m.getMonth()]}
              </p>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startWd }).map((_,i) => <div key={`e${i}`} className="aspect-square" />)}
                {days.map(d => {
                  const k   = format(d, 'yyyy-MM-dd')
                  const cnt = dateMap[k]
                  const bg  = cnt
                    ? (layer === 'all' ? mergedHeat(cnt) : heatColor(cnt[layer], layer).bg)
                    : 'bg-slate-100'
                  return (
                    <div
                      key={k}
                      onMouseEnter={e => cnt && setTooltip({ date: d, counts: cnt, rect: e.currentTarget.getBoundingClientRect() })}
                      onMouseLeave={() => setTooltip(null)}
                      className={`aspect-square rounded-[2px] ${bg} transition-opacity hover:opacity-70 cursor-default`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Tooltip ───────────────────────────────────────────────────────────────
  function Tooltip() {
    if (!tooltip) return null
    const { date, counts } = tooltip
    return (
      <div className="fixed z-[70] pointer-events-none"
        style={{ top: (tooltip.rect?.top ?? 0) - 100, left: (tooltip.rect?.left ?? 0) - 40 }}>
        <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl min-w-[140px] animate-fade-in">
          <p className="font-semibold mb-1">{format(date, 'd MMM yyyy', { locale: id })}</p>
          {counts.due     > 0 && <p className="text-slate-300">📅 Due: {counts.due} task</p>}
          {counts.created > 0 && <p className="text-slate-300">✏️ Dibuat: {counts.created} task</p>}
          {counts.done    > 0 && <p className="text-emerald-400">✅ Selesai: {counts.done} task</p>}
        </div>
      </div>
    )
  }

  const navPrev = () => view === 'month' ? setCursor(subMonths(cursor,1)) : setCursor(subYears(cursor,1))
  const navNext = () => view === 'month' ? setCursor(addMonths(cursor,1)) : setCursor(addYears(cursor,1))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <span className="font-display font-semibold text-slate-800">Kalender Aktivitas</span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* View mode */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {VIEW_MODES.map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    view === v.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>

            {/* Nav */}
            <div className="flex items-center gap-2">
              <button onClick={navPrev} className="btn-ghost p-1.5"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
                {view === 'month' ? format(cursor, 'MMMM yyyy', { locale: id }) : cursor.getFullYear()}
              </span>
              <button onClick={navNext} className="btn-ghost p-1.5"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Layer filter */}
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(LAYER_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => setLayer(k)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  layer === k
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                <span className={`w-2 h-2 rounded-full ${v.color}`} />
                {v.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            view === 'month' ? <MonthGrid /> : <YearGrid />
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-[10px] text-slate-400 font-medium">Intensitas:</span>
            <div className="flex items-center gap-1">
              {['bg-slate-100','bg-slate-200','bg-slate-300','bg-slate-500','bg-slate-700'].map((c,i) => (
                <span key={i} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
              <span className="text-[10px] text-slate-400 ml-1">Lebih banyak</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-500" />Due</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-blue-500" />Dibuat</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500" />Selesai</span>
            </div>
          </div>
        </div>
      </div>
      <Tooltip />
    </div>
  )
}
