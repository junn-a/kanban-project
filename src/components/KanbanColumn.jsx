import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'

const COLUMN_CONFIG = {
  todo: {
    label:    'To Do',
    dotColor: 'bg-slate-400',
    headerBg: 'bg-slate-50',
    accent:   'border-slate-200',
    countBg:  'bg-slate-100 text-slate-600',
  },
  inprogress: {
    label:    'In Progress',
    dotColor: 'bg-brand-500',
    headerBg: 'bg-brand-50',
    accent:   'border-brand-200',
    countBg:  'bg-brand-100 text-brand-700',
  },
  done: {
    label:    'Done',
    dotColor: 'bg-emerald-500',
    headerBg: 'bg-emerald-50',
    accent:   'border-emerald-200',
    countBg:  'bg-emerald-100 text-emerald-700',
  },
}

// approx height of ~10 cards (each ~110px) + padding
const MAX_SCROLL_HEIGHT = '68vh'

export default function KanbanColumn({ status, tasks, onAddTask, onEditTask, onAddNote }) {
  const cfg    = COLUMN_CONFIG[status]
  const ids    = tasks.map(t => t.id)
  const canAdd = status === 'todo'

  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      className={`
        flex flex-col rounded-2xl border ${cfg.accent} shadow-column
        bg-white/80 backdrop-blur transition-all duration-200
        ${isOver ? 'ring-2 ring-brand-400 ring-offset-2' : ''}
        /* mobile: full width stacked; sm+: side-by-side */
        w-full sm:min-w-[280px] sm:flex-1 sm:max-w-sm
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${cfg.headerBg} rounded-t-2xl border-b ${cfg.accent} flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
          <span className="font-display font-semibold text-slate-700 text-sm">{cfg.label}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${cfg.countBg}`}>{tasks.length}</span>
        </div>
        {canAdd && (
          <button
            onClick={() => onAddTask(status)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-white transition border border-transparent hover:border-brand-200"
            title="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drop zone — max height = ~10 cards, then scrolls */}
      <div
        ref={setNodeRef}
        style={{ maxHeight: MAX_SCROLL_HEIGHT }}
        className="column-scroll flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[100px]"
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} onAddNote={onAddNote} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <Plus className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-xs text-slate-400">Drop tasks here</p>
            {canAdd && (
              <button
                onClick={() => onAddTask(status)}
                className="text-xs text-brand-500 hover:text-brand-700 font-medium mt-0.5 transition"
              >
                or add a task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
