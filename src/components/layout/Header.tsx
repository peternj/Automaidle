import { useGameStore } from '../../store/gameStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function Header() {
  const tick        = useGameStore(s => s.tick)
  const coins       = useGameStore(s => s.coins)
  const saveToCloud = useGameStore(s => s.saveToCloud)
  const loadFromCloud = useGameStore(s => s.loadFromCloud)
  const resetGame   = useGameStore(s => s.resetGame)
  const navigate    = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function handleReset() {
    if (window.confirm('Are you sure? All progress will be lost.')) resetGame()
  }

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚙️</span>
        <div>
          <h1 className="text-lg font-bold text-white">Industrial Empire</h1>
          <p className="text-xs text-slate-400">v0.2 — React + Supabase</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Tick indicator */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="animate-tick-flash w-2 h-2 bg-green-400 rounded-full inline-block" />
          <span className="font-mono">Tick {tick}</span>
        </div>

        {/* Coins */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-1.5 flex items-center gap-2">
          <span className="text-amber-400 text-lg">🪙</span>
          <span className="font-mono font-bold text-amber-300 text-lg">{fmt(coins)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => saveToCloud()}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
          >💾 Save</button>
          <button
            onClick={() => loadFromCloud()}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
          >📂 Load</button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 text-sm rounded-lg transition-colors text-red-300"
          >🔄 Reset</button>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors text-slate-300"
          >↩ Sign out</button>
        </div>
      </div>
    </header>
  )
}
