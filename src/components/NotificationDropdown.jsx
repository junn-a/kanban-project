import { useRef, useEffect } from 'react'
import { Bell, CheckCheck, Loader2, UserPlus, Calendar, MoveRight, MessageSquare, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const TYPE_CONFIG = {
  assigned:         { icon: <UserPlus className="w-3.5 h-3.5" />,   bg: 'bg-brand-50',   text: 'text-brand-600'   },
  deadline_tomorrow:{ icon: <Calendar className="w-3.5 h-3.5" />,   bg: 'bg-amber-50',   text: 'text-amber-600'   },
  overdue:          { icon: <AlertCircle className="w-3.5 h-3.5" />, bg: 'bg-red-50',     text: 'text-red-600'     },
  moved:            { icon: <MoveRight className="w-3.5 h-3.5" />,   bg: 'bg-slate-50',   text: 'text-slate-600'   },
  comment:          { icon: <MessageSquare className="w-3.5 h-3.5" />,bg: 'bg-violet-50', text: 'text-violet-600'  },
}

export default function NotificationDropdown({ notifications, unreadCount, onMarkAllRead, onMarkRead, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-scale-in overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-slate-700 text-sm">Notifikasi</span>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead}
            className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-800 font-medium transition">
            <CheckCheck className="w-3.5 h-3.5" />Tandai semua
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Belum ada notifikasi</p>
          </div>
        ) : notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.moved
          return (
            <div key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 ${!n.read ? 'bg-brand-50/30' : ''}`}>
              <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.text}`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>
                  {n.message}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: id })}
                </p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
