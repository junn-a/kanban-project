import { useState, useEffect } from 'react'
import { fetchActivities } from '../hooks/useTasks'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Plus, Edit3, Trash2, CheckCircle2, MoveRight, Loader2, MessageSquare } from 'lucide-react'

const actionIcon = {
  created:  <Plus className="w-3 h-3 text-emerald-600" />,
  moved:    <MoveRight className="w-3 h-3 text-brand-600" />,
  updated:  <Edit3 className="w-3 h-3 text-amber-600" />,
  note:     <MessageSquare className="w-3 h-3 text-violet-600" />,
  deleted:  <Trash2 className="w-3 h-3 text-red-500" />,
  completed:<CheckCircle2 className="w-3 h-3 text-emerald-600" />,
}

const actionColor = {
  created:  'bg-emerald-50 border-emerald-200',
  moved:    'bg-brand-50 border-brand-200',
  updated:  'bg-amber-50 border-amber-200',
  note:     'bg-violet-50 border-violet-200',
  deleted:  'bg-red-50 border-red-200',
  completed:'bg-emerald-50 border-emerald-200',
}

function describeActivity(a) {
  const m = a.meta || {}
  switch (a.action) {
    case 'created':   return 'Task dibuat'
    case 'moved':     return `Dipindah: ${m.from} → ${m.to}`
    case 'updated':   return m.field ? `Diupdate: ${m.field}` : 'Task diupdate'
    case 'note':      return null // rendered separately
    case 'completed': return 'Ditandai selesai'
    default:          return a.action
  }
}

export default function ActivityLog({ taskId, isOpen }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!isOpen || !taskId) return
    setLoading(true)
    fetchActivities(taskId).then(data => {
      setActivities(data)
      setLoading(false)
    })
  }, [taskId, isOpen])

  if (!isOpen) return null

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 rounded-b-xl animate-slide-down">
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-1">Belum ada aktivitas.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div key={a.id} className="flex items-start gap-2.5 text-xs animate-fade-in"
                style={{ animationDelay: `${i * 25}ms` }}>
                <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${actionColor[a.action] || 'bg-slate-50 border-slate-200'}`}>
                  {actionIcon[a.action] || <Activity className="w-3 h-3 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  {a.action === 'note' ? (
                    // Notes get a distinct styled bubble
                    <div className="bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
                      <p className="text-slate-700 leading-relaxed">{a.meta?.text}</p>
                      <p className="text-slate-400 mt-0.5 text-[10px]">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-700 font-medium">{describeActivity(a)}</span>
                      {/* Show reason if present */}
                      {a.meta?.reason && (
                        <span className="block text-slate-500 italic mt-0.5">"{a.meta.reason}"</span>
                      )}
                      <span className="text-slate-400 ml-1.5">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
