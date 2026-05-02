import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, ChevronDown, Edit3, GripVertical, MessageSquarePlus, Send, X, Clock } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import ActivityLog from './ActivityLog'
import { useSteps } from '../hooks/useSteps'

const PRIORITY_BADGE = {
  low:    'badge-priority-low',
  medium: 'badge-priority-medium',
  high:   'badge-priority-high',
}

const PRIORITY_DOT = {
  low:    'bg-emerald-500',
  medium: 'bg-amber-500',
  high:   'bg-red-500',
}

export default function TaskCard({ task, onEdit, onAddNote }) {
  const [activityOpen, setActivityOpen]     = useState(false)
  const [quickNoteOpen, setQuickNoteOpen]   = useState(false)
  const [quickNote, setQuickNote]           = useState('')
  const [noteSaving, setNoteSaving]         = useState(false)
  const [activityKey, setActivityKey]       = useState(0) // force re-fetch after new note
  const [stepsOpen, setStepsOpen]           = useState(false)
  const { steps } = useSteps(task.id)

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex:  isDragging ? 50 : undefined,
  }

  const dueDate  = task.due_date ? new Date(task.due_date + 'T00:00:00') : null
  const overdue  = dueDate && isPast(dueDate) && !isToday(dueDate) && task.status !== 'done'
  const dueToday = dueDate && isToday(dueDate)

  const submitQuickNote = async () => {
    if (!quickNote.trim()) return
    setNoteSaving(true)
    await onAddNote(task.id, quickNote.trim())
    setQuickNote('')
    setNoteSaving(false)
    setQuickNoteOpen(false)
    // Re-open activity to show new note
    setActivityKey(k => k + 1)
    setActivityOpen(true)
  }

  return (
    <div ref={setNodeRef} style={style}
      className={`group bg-white rounded-xl border shadow-card hover:shadow-card-hover transition-all duration-200 ${isDragging ? 'dragging-card' : ''} ${
        task.status === 'waiting'
          ? 'border-amber-200 border-l-4 border-l-amber-400 bg-amber-50/30'
          : 'border-slate-200'
      }`}>
      <div className="p-3.5">
        {/* Drag handle + title row */}
        <div className="flex items-start gap-2">
          <button {...attributes} {...listeners}
            className="mt-0.5 p-0.5 rounded text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition flex-shrink-0">
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Labels */}
            {task.labels?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {task.labels.slice(0, 3).map(l => (
                  <span key={l} className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-brand-50 text-brand-600 border border-brand-100">
                    {l}
                  </span>
                ))}
                {task.labels.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-500">+{task.labels.length - 3}</span>
                )}
              </div>
            )}

            {/* Waiting badge */}
            {task.status === 'waiting' && (
              <div className="flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                <span className="text-[10px] font-semibold text-amber-700">Waiting / Blocked</span>
              </div>
            )}

            {/* Title */}
            <p className={`text-sm font-medium leading-snug ${
              task.status === 'done'    ? 'line-through text-slate-400' :
              task.status === 'waiting' ? 'text-amber-900' :
              'text-slate-800'
            }`}>
              {task.title}
            </p>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{task.description}</p>
            )}
          </div>

          {/* Edit button */}
          <button onClick={() => onEdit(task)}
            className="flex-shrink-0 p-1 rounded-lg text-slate-300 hover:text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Footer meta */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {/* Priority */}
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${PRIORITY_BADGE[task.priority]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
            {task.priority}
          </span>

          {/* Due date */}
          {dueDate && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-600' : dueToday ? 'text-amber-600' : 'text-slate-400'}`}>
              <Calendar className="w-3 h-3" />
              {format(dueDate, 'MMM d')}
              {overdue  && ' · overdue'}
              {dueToday && ' · today'}
            </span>
          )}

          {/* Assignee */}
          {task.assignee && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
              <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-[8px] font-bold text-brand-700">{task.assignee[0].toUpperCase()}</span>
              </div>
              <span className="text-slate-500">{task.assignee}</span>
            </span>
          )}
        </div>

        {/* Quick note input */}
        {quickNoteOpen && (
          <div className="mt-2.5 animate-slide-down">
            <div className="flex gap-1.5 items-end">
              <textarea
                autoFocus
                rows={2}
                placeholder="Tulis update singkat…"
                value={quickNote}
                onChange={e => setQuickNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitQuickNote() }}
                className="input-base resize-none text-xs flex-1 py-1.5"
              />
              <div className="flex flex-col gap-1">
                <button onClick={submitQuickNote} disabled={noteSaving || !quickNote.trim()}
                  className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition">
                  <Send className="w-3 h-3" />
                </button>
                <button onClick={() => { setQuickNoteOpen(false); setQuickNote('') }}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">⌘Enter untuk kirim</p>
          </div>
        )}

        {/* Steps progress (if any) */}
        {steps.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {/* Progress bar */}
            <button onClick={() => setStepsOpen(o => !o)}
              className="w-full text-left group/steps">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-medium">
                  Tahapan: {steps.filter(s=>s.status==='done').length}/{steps.length}
                </span>
                <span className="text-[10px] text-slate-400 group-hover/steps:text-brand-500 transition">
                  {stepsOpen ? '▲ Sembunyikan' : '▼ Lihat'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((steps.filter(s=>s.status==='done').length/steps.length)*100)}%`,
                    background: steps.every(s=>s.status==='done') ? '#10b981' : '#3b82f6'
                  }} />
              </div>
            </button>

            {/* Collapsed step list */}
            {stepsOpen && (
              <div className="space-y-1 animate-slide-down">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center border ${
                      s.status === 'done'       ? 'bg-emerald-500 border-emerald-500' :
                      s.status === 'inprogress' ? 'bg-brand-500 border-brand-500' :
                      'bg-white border-slate-300'
                    }`}>
                      {s.status === 'done' && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {s.status === 'inprogress' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className={`flex-1 truncate ${s.status==='done' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                      {i+1}. {s.title}
                    </span>
                    {s.pic_email && (
                      <span className="text-[9px] text-slate-400 truncate max-w-[60px]">{s.pic_email.split('@')[0]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bottom actions: quick note toggle + activity toggle */}
        <div className="mt-2.5 flex items-center justify-between">
          <button
            onClick={() => setQuickNoteOpen(o => !o)}
            className={`flex items-center gap-1 text-[10px] font-medium transition ${quickNoteOpen ? 'text-brand-600' : 'text-slate-400 hover:text-brand-500'}`}>
            <MessageSquarePlus className="w-3 h-3" />
            Quick note
          </button>

          <button
            onClick={() => setActivityOpen(o => !o)}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-600 transition">
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activityOpen ? 'rotate-180' : ''}`} />
            {activityOpen ? 'Hide' : 'Activity'}
          </button>
        </div>
      </div>

      <ActivityLog key={activityKey} taskId={task.id} isOpen={activityOpen} />
    </div>
  )
}
