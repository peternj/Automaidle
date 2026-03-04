import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthPage() {
  const [mode, setMode]       = useState<'login' | 'register'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    const { error: authError } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (authError) { setError(authError.message); return }
    navigate('/game')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">⚙️</span>
          <h1 className="text-3xl font-bold text-white mt-4">Industrial Empire</h1>
          <p className="text-slate-400 mt-2">Build your supply chain from the ground up</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
          <div className="flex gap-2 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                  ${mode === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com" required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••" required minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-all"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              By creating an account your game progress is saved to the cloud automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
