import { useState, useEffect, useRef } from 'react'
import { X, Tag, Calendar, Flag, User, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const PRIORITIES = [
  { value: 'low',    label: 'Low',    cls: 'badge-priority-low' },
  { value: 'medium', label: 'Medium', cls: 'badge-priority-medium' },
  { value: 'high',   label: 'High',   cls: 'badge-priority-high' },
]

const STATUSES = [
  { value: 'todo',       label: 'To Do' },
  { value: 'inprogress', label: 'In Progress' },
  { value: 'done',       label: 'Done' },
]

const LABEL_PRESETS = ['Frontend', 'Backend', 'Design', 'Research', 'Bug', 'Feature', 'Meeting', 'Review']

export default function TaskModal({ task, defaultStatus = 'todo', onSave, onDelete, onClose }) {
  const isEdit = !!task
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    status:      task?.status      || defaultStatus,
    priority:    task?.priority    || 'medium',
    due_date:    task?.due_date    || '',
    assignee:    task?.assignee    || '',
    labels:      task?.labels      || [],
  })
  const [labelInput, setLabelInput] = useState('')
  const [saving, setSaving]         = useState(false)
  const titleRef = useRef()

  useEffect(() => { titleRef.current?.focus() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addLabel = (l) => {
    const val = l.trim()
    if (val && !form.labels.includes(val)) set('labels', [...form.labels, val])
    setLabelInput('')
  }
  const removeLabel = (l) => set('labels', form.labels.filter(x => x !== l))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({ ...form, title: form.title.trim() })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-display font-semibold text-slate-800 text-base">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Title */}
            <input
              ref={titleRef}
              placeholder="Task title…"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              required
              className="input-base font-medium text-base"
            />

            {/* Description */}
            <textarea
              placeholder="Description (optional)…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="input-base resize-none"
            />

            {/* Status + Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input-base">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <Flag className="w-3 h-3 inline mr-1" />Priority
                </label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => set('priority', p.value)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                        form.priority === p.value ? p.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due date + Assignee row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <Calendar className="w-3 h-3 inline mr-1" />Due Date
                </label>
                <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  <User className="w-3 h-3 inline mr-1" />Assignee
                </label>
                <input placeholder="Name…" value={form.assignee} onChange={e => set('assignee', e.target.value)}
                  className="input-base" />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                <Tag className="w-3 h-3 inline mr-1" />Labels
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.labels.map(l => (
                  <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium">
                    {l}
                    <button type="button" onClick={() => removeLabel(l)} className="hover:text-brand-900 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {/* Preset labels */}
              <div className="flex flex-wrap gap-1 mb-2">
                {LABEL_PRESETS.filter(l => !form.labels.includes(l)).map(l => (
                  <button key={l} type="button" onClick={() => addLabel(l)}
                    className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 border border-slate-200 hover:border-brand-200 transition">
                    + {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Custom label…" value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(labelInput) } }}
                  className="input-base flex-1 text-xs py-1.5" />
                <button type="button" onClick={() => addLabel(labelInput)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-700 text-xs border border-slate-200 transition">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEdit && onDelete ? (
              <button type="button" onClick={onDelete}
                className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />Delete
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
