import { useState } from 'react'
import { X, Plus, Folder, Trash2, Users, Edit3, Check, Loader2 } from 'lucide-react'

const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#dc2626','#ca8a04','#64748b']

export default function ProjectSelectorModal({
  projects, currentProjectId, userId,
  onSelect, onCreateProject, onDeleteProject, onManageMembers, onClose
}) {
  const [creating, setCreating]   = useState(false)
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [color, setColor]         = useState(COLORS[0])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError('')
    try {
      const p = await onCreateProject({ name: name.trim(), description: desc.trim(), color })
      onSelect(p)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[90dvh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="font-display font-semibold text-slate-800">Pilih Project</span>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {/* Personal board */}
          <button
            onClick={() => { onSelect(null); onClose() }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left ${
              !currentProjectId ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <span className="text-base">👤</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">Personal Board</p>
              <p className="text-[10px] text-slate-400">Task pribadi kamu</p>
            </div>
            {!currentProjectId && <Check className="w-4 h-4 text-brand-600" />}
          </button>

          {projects.map(p => {
            const isOwner = p.owner_id === userId
            const isActive = currentProjectId === p.id
            return (
              <div key={p.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition ${
                  isActive ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <button onClick={() => { onSelect(p); onClose() }} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: p.color || '#2563eb' }}>
                    <Folder className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{isOwner ? 'Owner' : 'Member'}</p>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { onManageMembers(p); onClose() }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition" title="Kelola member">
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  {isOwner && (
                    <button onClick={() => onDeleteProject(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Hapus project">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {projects.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada project. Buat project baru di bawah.</p>
          )}
        </div>

        {/* Create new project */}
        <div className="border-t border-slate-100 px-4 py-4">
          {!creating ? (
            <button onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 transition text-sm font-medium">
              <Plus className="w-4 h-4" />Buat Project Baru
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3 animate-slide-down">
              <input autoFocus placeholder="Nama project…" value={name}
                onChange={e => setName(e.target.value)} className="input-base text-sm" />
              <input placeholder="Deskripsi (opsional)…" value={desc}
                onChange={e => setDesc(e.target.value)} className="input-base text-sm" />
              {/* Color picker */}
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                    style={{ background: c }} />
                ))}
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setCreating(false)} className="btn-ghost flex-1 justify-center text-sm">Batal</button>
                <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1 justify-center text-sm disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buat'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
