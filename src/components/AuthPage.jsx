import { useState } from 'react'
import { Layers, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage({ onSignIn, onSignUp }) {
  const [mode, setMode]         = useState('login') // 'login' | 'register'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow]         = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fn = mode === 'login' ? onSignIn : onSignUp
      const { error: err } = await fn(email, password)
      if (err) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 p-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-700/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-800/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 mb-4 shadow-xl">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white tracking-tight">Taskflow</h1>
          <p className="text-brand-300 text-sm mt-1">Your personal kanban workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 gap-1">
            {['login','register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email" required autoComplete="email"
                placeholder="Email address"
                value={email} onChange={e => setEmail(e.target.value)}
                className="input-base pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={show ? 'text' : 'password'} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="input-base pl-10 pr-10"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 rounded-xl text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
