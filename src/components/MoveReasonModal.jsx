import { useState, useRef, useEffect } from 'react'
import { X, MoveRight, Loader2 } from 'lucide-react'

const COLUMN_LABEL = { todo: 'To Do', inprogress: 'In Progress', waiting: 'Waiting / Blocked', done: 'Done' }

const PRESETS = {
  todo:       ['Perlu dikerjakan ulang', 'Belum siap dikerjakan', 'Menunggu input lain'],
  inprogress: ['Mulai dikerjakan', 'Sedang dalam review', 'Tahap A selesai, lanjut ke B', 'Unblock dari dependensi lain'],
  waiting:    ['Menunggu vendor', 'Menunggu approval atasan', 'Menunggu tim lain selesai', 'Menunggu feedback client', 'Menunggu data/aset dari pihak lain'],
  done:       ['Semua tahap selesai', 'Review & approval sudah OK', 'Testing passed', 'Delivered ke client'],
}

// Waiting column gets a special amber accent
const WAITING_STYLE = 'bg-amber-50 border-amber-200 text-amber-800'

export default function MoveReasonModal({ taskTitle, fromStatus, toStatus, onConfirm, onCancel }) {
  const [reason, setReason]   = useState('')
  const [saving, setSaving]   = useState(false)
  const textareaRef           = useRef()

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setSaving(true)
    await onConfirm(reason.trim())
    setSaving(false)
  }

  const presets = PRESETS[toStatus] || []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-950/70 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in">
        {/* Header */}
        <div className={`flex items-start justify-between px-5 pt-5 pb-4 ${toStatus === 'waiting' ? 'rounded-t-2xl bg-amber-50/60' : ''}`}>
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm">Pindah Task</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {COLUMN_LABEL[fromStatus]}
              </span>
              <MoveRight className="w-3 h-3 text-slate-400" />
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">
                {COLUMN_LABEL[toStatus]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate max-w-[240px]">"{taskTitle}"</p>
          </div>
          <button onClick={onCancel} className="btn-ghost p-1.5 rounded-lg flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* Preset reasons */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Pilih alasan cepat:</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button key={p} type="button"
                  onClick={() => setReason(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 ${
                    reason === p
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom textarea */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Atau tulis sendiri:</p>
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="Jelaskan alasan perpindahan task ini…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleConfirm() }}
              className="input-base resize-none text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">⌘Enter untuk konfirmasi</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="btn-ghost flex-1 justify-center">
              Batal
            </button>
            <button type="button" onClick={handleConfirm}
              disabled={saving || !reason.trim()}
              className="btn-primary flex-1 justify-center disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
