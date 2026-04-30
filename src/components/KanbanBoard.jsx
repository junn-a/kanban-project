import { useState, useMemo } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Layers, LogOut, Plus, Search, Filter, X } from 'lucide-react'

import KanbanColumn from './KanbanColumn'
import TaskCard     from './TaskCard'
import TaskModal    from './TaskModal'
import { useTasks, logActivity } from '../hooks/useTasks'

const STATUSES = ['todo', 'inprogress', 'done']
const PRIORITY_FILTER = ['all', 'high', 'medium', 'low']

export default function KanbanBoard({ user, onSignOut }) {
  const { tasks, loading, addTask, updateTask, deleteTask, moveTask } = useTasks(user.id)

  const [modal, setModal]           = useState(null) // null | { mode:'add'|'edit', task?, defaultStatus? }
  const [activeId, setActiveId]     = useState(null)
  const [search, setSearch]         = useState('')
  const [filterPriority, setFilterPriority] = useState('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  /* Filtered tasks */
  const filtered = useMemo(() => {
    let t = tasks
    if (search.trim()) {
      const q = search.toLowerCase()
      t = t.filter(x => x.title.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q))
    }
    if (filterPriority !== 'all') t = t.filter(x => x.priority === filterPriority)
    return t
  }, [tasks, search, filterPriority])

  const byStatus = (s) => filtered.filter(t => t.status === s).sort((a, b) => a.position - b.position)
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  /* Stats */
  const total    = tasks.length
  const done     = tasks.filter(t => t.status === 'done').length
  const progress = total ? Math.round((done / total) * 100) : 0

  /* DnD handlers */
  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    const activeTask = tasks.find(t => t.id === active.id)
    const overStatus = STATUSES.includes(over.id) ? over.id : tasks.find(t => t.id === over.id)?.status
    if (!activeTask || !overStatus || activeTask.status === overStatus) return
    moveTask(active.id, overStatus, 0)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id === active.id)
    const overTask   = tasks.find(t => t.id === over.id)
    const overStatus = STATUSES.includes(over.id) ? over.id : overTask?.status

    if (!activeTask || !overStatus) return

    const colTasks  = tasks.filter(t => t.status === overStatus).sort((a, b) => a.position - b.position)
    const oldIdx    = colTasks.findIndex(t => t.id === active.id)
    const newIdx    = overTask ? colTasks.findIndex(t => t.id === over.id) : colTasks.length

    if (oldIdx === -1) return
    const reordered = arrayMove(colTasks, oldIdx, newIdx < 0 ? colTasks.length : newIdx)
    reordered.forEach((t, i) => {
      if (t.position !== i || t.status !== overStatus) moveTask(t.id, overStatus, i)
    })
  }

  /* Modal helpers */
  const openAdd  = (status) => setModal({ mode: 'add', defaultStatus: status })
  const openEdit = (task)   => setModal({ mode: 'edit', task })
  const closeModal = ()     => setModal(null)

  const handleSave = async (form) => {
    if (modal.mode === 'add') {
      await addTask(form)
    } else {
      const task   = modal.task
      const meta   = []
      if (form.status !== task.status) meta.push({ action: 'moved', meta: { from: task.status, to: form.status } })
      else meta.push({ action: 'updated', meta: { field: 'details' } })
      await updateTask(task.id, form, meta[0])
    }
  }

  const handleDelete = async () => {
    if (!modal?.task) return
    await deleteTask(modal.task.id)
    closeModal()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/70 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-slate-800 text-base hidden sm:block">Taskflow</span>
          </div>

          {/* Progress pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600">{done}/{total} done</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder="Search tasks…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Priority filter */}
            <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
              {PRIORITY_FILTER.map(p => (
                <button key={p} onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition capitalize ${
                    filterPriority === p ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>

            <button onClick={() => openAdd('todo')} className="btn-primary py-2">
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Task</span>
            </button>

            {/* User + signout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-xs font-bold text-brand-700">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <button onClick={onSignOut} className="btn-ghost py-1.5 px-2" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {STATUSES.map(s => (
                <KanbanColumn
                  key={s}
                  status={s}
                  tasks={byStatus(s)}
                  onAddTask={openAdd}
                  onEditTask={openEdit}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeTask && <TaskCard task={activeTask} onEdit={() => {}} />}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Task Modal */}
      {modal && (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.defaultStatus}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
