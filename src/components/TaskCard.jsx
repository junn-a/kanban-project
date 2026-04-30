import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, User, Flag, ChevronDown, Edit3, GripVertical } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import ActivityLog from './ActivityLog'

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

export default function TaskCard({ task, onEdit }) {
  const [activityOpen, setActivityOpen] = useState(false)

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

  return (
    <div ref={setNodeRef} style={style}
      className={`group bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 ${isDragging ? 'dragging-card' : ''}`}>
      <div className="p-3.5">
        {/* Drag handle + edit */}
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

            {/* Title */}
            <p className={`text-sm font-medium text-slate-800 leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </p>

            {/* Description preview */}
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
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
              overdue  ? 'text-red-600' :
              dueToday ? 'text-amber-600' :
              'text-slate-400'
            }`}>
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

        {/* Activity toggle */}
        <button
          onClick={() => setActivityOpen(o => !o)}
          className="mt-2.5 w-full flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-brand-600 transition group/act"
        >
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activityOpen ? 'rotate-180' : ''}`} />
          {activityOpen ? 'Hide' : 'Show'} activity
        </button>
      </div>

      <ActivityLog taskId={task.id} isOpen={activityOpen} />
    </div>
  )
}
