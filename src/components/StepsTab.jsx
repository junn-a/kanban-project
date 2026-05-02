import { useState } from 'react'
import { Plus, Trash2, GripVertical, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSteps } from '../hooks/useSteps'

const STATUS_CONFIG = {
  todo:       { label: 'To Do',      dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200',   next: 'inprogress' },
  inprogress: { label: 'In Progress',dot: 'bg-brand-500', badge: 'bg-brand-100 text-brand-700 border-brand-200',   next: 'done'       },
  done:       { label: 'Done',       dot: 'bg-emerald-500',badge:'bg-emerald-100 text-emerald-700 border-emerald-200', next: 'todo'  },
}

export default function StepsTab({ taskId, userId }) {
  const { steps, loading, addStep, updateStep, deleteStep, cycleStatus } = useSteps(taskId)
  const [newTitle, setNewTitle]     = useState('')
  const [newPic, setNewPic]         = useState('')
  const [adding, setAdding]         = useState(false)
  const [saving, setSaving]         = useState(false)
  const [editId, setEditId]         = useState(null)
  const [editTitle, setEditTitle]   = useState('')
  const [editPic, setEditPic]       = useState('')

  // progress summary
  const total    = steps.length
  const doneCount= steps.filter(s => s.status === 'done').length
  const inpCount = steps.filter(s => s.status === 'inprogress').length
  const pct      = total > 0 ? Math.round((doneCount / total) * 100) : 0

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    await addStep(userId, newTitle, newPic)
    setNewTitle(''); setNewPic(''); setAdding(false); setSaving(false)
  }

  const handleSaveEdit = async (id) => {
    if (!editTitle.trim()) return
    await updateStep(id, { title: editTitle.trim(), pic_email: editPic.trim() })
    setEditId(null)
  }

  const startEdit = (s) => {
    setEditId(s.id); setEditTitle(s.title); setEditPic(s.pic_email || '')
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{doneCount}/{total} tahap selesai</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{doneCount} selesai</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" />{inpCount} progress</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" />{total - doneCount - inpCount} todo</span>
          </div>
        </div>
      )}

      {/* Steps list */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-2">
          {steps.map((s, idx) => {
            const cfg = STATUS_CONFIG[s.status]
            const isEditing = editId === s.id
            return (
              <div key={s.id}
                className={`rounded-xl border transition-all ${
                  s.status === 'done' ? 'bg-emerald-50/40 border-emerald-200' :
                  s.status === 'inprogress' ? 'bg-brand-50/40 border-brand-200' :
                  'bg-white border-slate-200'
                }`}>
                {isEditing ? (
                  /* Edit mode */
                  <div className="p-3 space-y-2">
                    <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(s.id); if (e.key === 'Escape') setEditId(null) }}
                      className="input-base text-sm py-1.5" placeholder="Nama tahapan…" />
                    <input value={editPic} onChange={e => setEditPic(e.target.value)}
                      className="input-base text-xs py-1.5" placeholder="PIC email (opsional)…" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditId(null)} className="btn-ghost text-xs py-1 flex-1 justify-center">Batal</button>
                      <button onClick={() => handleSaveEdit(s.id)} className="btn-primary text-xs py-1 flex-1 justify-center">Simpan</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    {/* Drag handle */}
                    <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 cursor-grab" />

                    {/* Step number */}
                    <span className="text-[10px] font-bold text-slate-400 w-4 flex-shrink-0">{idx + 1}.</span>

                    {/* Status cycle button */}
                    <button onClick={() => cycleStatus(s.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        s.status === 'done'       ? 'bg-emerald-500 border-emerald-500' :
                        s.status === 'inprogress' ? 'bg-brand-500 border-brand-500' :
                        'bg-white border-slate-300 hover:border-brand-400'
                      }`}
                      title={`Klik untuk ubah ke ${STATUS_CONFIG[cfg.next].label}`}>
                      {s.status === 'done' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {s.status === 'inprogress' && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </button>

                    {/* Title + PIC */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${s.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {s.title}
                      </p>
                      {s.pic_email && (
                        <p className="text-[10px] text-slate-400 mt-0.5">👤 {s.pic_email}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>

                    {/* Edit + Delete */}
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={() => startEdit(s)}
                        className="p-1 rounded-lg text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deleteStep(s.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add form */}
          {adding ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-3 space-y-2 animate-slide-down">
              <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewPic('') } }}
                className="input-base text-sm py-1.5" placeholder="Nama tahapan… (Enter untuk simpan)" />
              <input value={newPic} onChange={e => setNewPic(e.target.value)}
                className="input-base text-xs py-1.5" placeholder="PIC email (opsional)…" />
              <div className="flex gap-2">
                <button onClick={() => { setAdding(false); setNewTitle(''); setNewPic('') }}
                  className="btn-ghost text-xs py-1 flex-1 justify-center">Batal</button>
                <button onClick={handleAdd} disabled={saving || !newTitle.trim()}
                  className="btn-primary text-xs py-1 flex-1 justify-center disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tambah Tahapan'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-600 transition text-xs font-medium">
              <Plus className="w-3.5 h-3.5" />Tambah Tahapan
            </button>
          )}
        </div>
      )}

      {total === 0 && !loading && !adding && (
        <p className="text-xs text-slate-400 text-center py-2">
          Belum ada tahapan. Klik "+ Tambah Tahapan" untuk mulai.
        </p>
      )}
    </div>
  )
}
