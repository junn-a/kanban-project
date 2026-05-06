import { useState } from 'react'
import { X, UserPlus, Trash2, Mail, Clock, CheckCircle2, Crown, Loader2, Users } from 'lucide-react'
import { useMembers } from '../hooks/useProjects'
import { supabase } from '../lib/supabase'

const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#dc2626','#ca8a04']

export default function ProjectMemberModal({ project, userId, onClose, onProjectUpdate }) {
  const { members, loading, inviteMember, removeMember } = useMembers(project?.id)
  const [email, setEmail]     = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const isOwner = project?.owner_id === userId

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setError(''); setSuccess('')
    setInviting(true)
    try {
      await inviteMember(email)

      // Send invite email via Supabase Auth (magic link / invite)
      const { error: inviteErr } = await supabase.auth.admin?.inviteUserByEmail?.(email.trim()) || {}

      // Fallback: trigger edge function to send invite email
      await supabase.functions.invoke('send-invite', {
        body: {
          email:       email.trim(),
          projectName: project.name,
          projectId:   project.id,
          inviterEmail: (await supabase.auth.getUser()).data.user?.email,
        }
      })

      setSuccess(`Undangan dikirim ke ${email}`)
      setEmail('')
    } catch (err) {
      setError(err.message || 'Gagal mengundang member')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 animate-scale-in max-h-[90dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: project?.color || '#2563eb' }}>
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-semibold text-slate-800 text-sm">{project?.name}</p>
              <p className="text-[10px] text-slate-400">Kelola anggota tim</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Invite form — owner only */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Undang anggota baru</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email" placeholder="email@contoh.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="input-base pl-9 text-sm"
                  />
                </div>
                <button type="submit" disabled={inviting || !email.trim()} className="btn-primary px-3 disabled:opacity-50">
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </button>
              </div>
              {error   && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>}
              {success && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">✅ {success}</p>}
              <p className="text-[10px] text-slate-400">Member akan menerima email undangan untuk bergabung ke project ini.</p>
            </form>
          )}

          {/* Member list */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Anggota ({members.length + 1})</p>
            <div className="space-y-2">
              {/* Owner row */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-50 border border-brand-100">
                <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-3.5 h-3.5 text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">Kamu (Owner)</p>
                  <p className="text-[10px] text-slate-400">Full access</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">Owner</span>
              </div>

              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
              ) : members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600">{m.email[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.email}</p>
                    <p className="text-[10px] text-slate-400">
                      {m.status === 'pending' ? 'Menunggu konfirmasi...' : 'Aktif'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.status === 'pending'
                      ? <Clock className="w-3.5 h-3.5 text-amber-500" />
                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    }
                    {isOwner && (
                      <button onClick={() => removeMember(m.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {members.length === 0 && !loading && (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada anggota. Undang via email di atas.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
