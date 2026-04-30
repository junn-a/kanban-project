import { useAuth } from './hooks/useAuth'
import AuthPage    from './components/AuthPage'
import KanbanBoard from './components/KanbanBoard'
import { Layers }  from 'lucide-react'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} />
  }

  return <KanbanBoard user={user} onSignOut={signOut} />
}
