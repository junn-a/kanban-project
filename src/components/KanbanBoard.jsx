import { useState, useMemo, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Layers, LogOut, Plus, Search, X, Trophy, CalendarDays, BarChart2, Sparkles } from 'lucide-react'

import KanbanColumn    from './KanbanColumn'
import TaskCard        from './TaskCard'
import TaskModal       from './TaskModal'
import MoveReasonModal from './MoveReasonModal'
import ScoreModal      from './ScoreModal'
import CalendarModal   from './CalendarModal'
import ReportModal     from './ReportModal'
import AIStrategyPanel from './AIStrategyPanel'
import { useTasks }    from '../hooks/useTasks'

const STATUSES        = ['todo', 'inprogress', 'waiting', 'done']
const PRIORITY_FILTER = ['all', 'high', 'medium', 'low']

export default function KanbanBoard({ user, onSignOut }) {
  const { tasks, loading, addTask, updateTask, deleteTask, moveTask, moveTaskWithReason, addNote } = useTasks(user.id, currentProject?.id)

  const [modal, setModal]                   = useState(null)
  const [activeId, setActiveId]             = useState(null)
  const [search, setSearch]                 = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [scoreOpen, setScoreOpen]           = useState(false)
  const [calendarOpen, setCalendarOpen]     = useState(false)
  const [reportOpen, setReportOpen]         = useState(false)
  const [pendingMove, setPendingMove]       = useState(null)
  const [aiPanelOpen, setAiPanelOpen]       = useState(false)
  const dragOriginStatus                    = useRef(null)

  const members = []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } })
  )

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

  const byStatus = (s) => {
    const col = filtered.filter(t => t.status === s)
    if (s === 'inprogress' || s === 'waiting') {
      return col.sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && b.due_date) return 1
        return a.position - b.position
      })
    }
    return col.sort((a, b) => a.position - b.position)
  }
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  const total    = tasks.length
  const done     = tasks.filter(t => t.status === 'done').length
  const progress = total ? Math.round((done / total) * 100) : 0

  /* DnD */
  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
    dragOriginStatus.current = tasks.find(x => x.id === active.id)?.status ?? null
  }

  const handleDragOver = ({ active, over }) => {
    if (!over) return
    const at         = tasks.find(t => t.id === active.id)
    const overStatus = STATUSES.includes(over.id) ? over.id : tasks.find(t => t.id === over.id)?.status
    if (!at || !overStatus || at.status === overStatus) return
    moveTask(active.id, overStatus, 0)
  }

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) {
      if (dragOriginStatus.current) {
        const at = tasks.find(t => t.id === active.id)
        if (at && at.status !== dragOriginStatus.current) moveTask(active.id, dragOriginStatus.current, at.position)
      }
      dragOriginStatus.current = null
      return
    }

    const at         = tasks.find(t => t.id === active.id)
    const overTask   = tasks.find(t => t.id === over.id)
    const overStatus = STATUSES.includes(over.id) ? over.id : overTask?.status

    if (!at || !overStatus) { dragOriginStatus.current = null; return }

    const origin = dragOriginStatus.current
    dragOriginStatus.current = null

    if (origin && origin !== overStatus) {
      const colTasks = tasks.filter(t => t.status === overStatus).sort((a, b) => a.position - b.position)
      const newIdx   = overTask ? colTasks.findIndex(t => t.id === over.id) : colTasks.length
      setPendingMove({ id: active.id, fromStatus: origin, toStatus: overStatus, position: newIdx < 0 ? colTasks.length : newIdx })
      return
    }

    const colTasks  = tasks.filter(t => t.status === overStatus).sort((a, b) => a.position - b.position)
    const oldIdx    = colTasks.findIndex(t => t.id === active.id)
    const newIdx    = overTask ? colTasks.findIndex(t => t.id === over.id) : colTasks.length
    if (oldIdx === -1) return
    const reordered = arrayMove(colTasks, oldIdx, newIdx < 0 ? colTasks.length : newIdx)
    reordered.forEach((t, i) => { if (t.position !== i) moveTask(t.id, overStatus, i) })
  }

  const handleReasonConfirm = async (reason) => {
    if (!pendingMove) return
    const { id, toStatus, position } = pendingMove
    setPendingMove(null)
    await moveTaskWithReason(id, toStatus, position, reason)
  }

  const handleReasonCancel = () => {
    if (!pendingMove) return
    const { id, fromStatus } = pendingMove
    setPendingMove(null)
    moveTask(id, fromStatus, 0)
  }

  const openAdd    = (status) => setModal({ mode: 'add', defaultStatus: status })
  const openEdit   = (task)   => setModal({ mode: 'edit', task })
  const closeModal = ()       => setModal(null)

  const handleSave = async (form) => {
    if (modal.mode === 'add') {
      await addTask(form)
    } else {
      const task    = modal.task
      const logMeta = form.status !== task.status
        ? { action: 'moved', meta: { from: task.status, to: form.status, reason: 'Edited via modal' } }
        : { action: 'updated', meta: { field: 'details' } }
      await updateTask(task.id, form, logMeta)
    }
  }

  const handleDelete = async () => {
    if (!modal?.task) return
    await deleteTask(modal.task.id)
    closeModal()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/70 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-slate-800 text-base hidden sm:block">Taskflow</span>
          </div>

          {/* Progress pill — desktop only */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0">
            <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600">{done}/{total} done</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 placeholder-slate-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Priority filter — desktop */}
            <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
              {PRIORITY_FILTER.map(p => (
                <button key={p} onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition capitalize ${filterPriority === p ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>

            {/* AI Strategy */}
            <button
              onClick={() => setAiPanelOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-200 text-brand-600 hover:from-brand-100 hover:to-violet-100 transition"
              title="AI Daily Strategy"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Calendar */}
            <button
              onClick={() => setCalendarOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-600 hover:bg-brand-100 transition"
              title="Kalender Aktivitas"
            >
              <CalendarDays className="w-4 h-4" />
            </button>

            {/* Report */}
            <button
              onClick={() => setReportOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition"
              title="Laporan Performa"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            {/* Trophy / score */}
            <button
              onClick={() => setScoreOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-600 hover:bg-yellow-100 transition"
              title="Productivity Score"
            >
              <Trophy className="w-4 h-4" />
            </button>

            {/* New Task */}
            <button onClick={() => openAdd('todo')} className="btn-primary py-2 px-3 sm:px-4">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Task</span>
            </button>

            {/* User + sign out */}
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-700">{user.email?.[0]?.toUpperCase()}</span>
              </div>
              <button onClick={onSignOut} className="btn-ghost py-1.5 px-2" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Board ─── */}
      <main className="flex-1 p-3 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/*
              Mobile  : flex-col, full-width stacked columns
              sm+     : flex-row, side-by-side columns with horizontal scroll
            */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:overflow-x-auto pb-4 items-stretch sm:items-start">
              {STATUSES.map(s => (
                <KanbanColumn
                  key={s}
                  status={s}
                  tasks={byStatus(s)}
                  onAddTask={openAdd}
                  onEditTask={openEdit}
                  onAddNote={addNote}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeTask && <TaskCard task={activeTask} onEdit={() => {}} onAddNote={() => {}} />}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-brand-600 flex items-center justify-center">
              <Layers className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-500">Taskflow</span>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Taskflow. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Built with React · Supabase · Vercel
          </p>
        </div>
      </footer>

      {/* ─── Modals ─── */}
      {modal && (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.defaultStatus}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' ? handleDelete : undefined}
          onClose={closeModal}
          onAddNote={modal.mode === 'edit' ? addNote : undefined}
          members={members}
          userId={user.id}
        />
      )}

      {pendingMove && (
        <MoveReasonModal
          taskTitle={tasks.find(t => t.id === pendingMove.id)?.title || ''}
          fromStatus={pendingMove.fromStatus}
          toStatus={pendingMove.toStatus}
          onConfirm={handleReasonConfirm}
          onCancel={handleReasonCancel}
        />
      )}

      {scoreOpen && (
        <ScoreModal
          userId={user.id}
          tasks={tasks}
          onClose={() => setScoreOpen(false)}
        />
      )}

      {calendarOpen && (
        <CalendarModal
          userId={user.id}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {reportOpen && (
        <ReportModal
          userId={user.id}
          tasks={tasks}
          onClose={() => setReportOpen(false)}
        />
      )}

      {/* AI Strategy Panel */}
      {aiPanelOpen && (
        <AIStrategyPanel
          tasks={tasks}
          onClose={() => setAiPanelOpen(false)}
        />
      )}
    </div>
  )
}
