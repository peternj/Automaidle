import { useGameStore } from '../../store/gameStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function Header() {
  const tick          = useGameStore(s => s.tick)
  const coins         = useGameStore(s => s.coins)
  const saveToCloud   = useGameStore(s => s.saveToCloud)
  const loadFromCloud = useGameStore(s => s.loadFromCloud)
  const resetGame     = useGameStore(s => s.resetGame)
  const navigate      = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function handleReset() {
    if (window.confirm('Are you sure? All progress will be lost.')) resetGame()
  }

  const mins   = Math.floor(tick / 60)
  const secs   = tick % 60
  const runTxt = mins > 0 ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `00:${String(secs).padStart(2, '0')}`

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-5 py-2 gap-6"
      style={{
        background: 'var(--c-panel)',
        borderBottom: '1px solid var(--c-border)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* System online LED */}
        <div className="cr-led cr-led-green" />
        <div>
          <div
            className="font-bold tracking-widest uppercase text-sm"
            style={{ color: 'var(--c-bright)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.18em' }}
          >
            Industrial Empire
          </div>
          <div className="cr-label" style={{ marginTop: 1 }}>Control Room v0.2</div>
        </div>
      </div>

      {/* ── Centre: tick clock ── */}
      <div className="flex-1 flex justify-center">
        <div
          className="flex items-center gap-3 px-5 py-1.5 rounded"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        >
          <div className="cr-led cr-led-cyan" />
          <div className="text-center">
            <div
              className="cr-value animate-tick-flash"
              style={{ fontSize: 22, lineHeight: 1, letterSpacing: '0.06em' }}
            >
              {runTxt}
            </div>
            <div className="cr-label" style={{ justifyContent: 'center', marginTop: 2 }}>
              TICK&nbsp;{fmt(tick)}
            </div>
          </div>
          <div className="cr-led cr-led-cyan" />
        </div>
      </div>

      {/* ── Right: coins + actions ── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Coin readout */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded"
          style={{
            background: 'rgba(255,170,0,0.07)',
            border: '1px solid var(--c-border-am)',
          }}
        >
          <span style={{ fontSize: 16 }}>🪙</span>
          <span
            className="cr-value"
            style={{ color: 'var(--c-amber)', fontSize: 18, fontWeight: 700 }}
          >
            {fmt(coins)}
          </span>
          <span className="cr-label" style={{ letterSpacing: '0.12em' }}>COINS</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <button onClick={() => saveToCloud()} className="cr-btn cr-btn-cyan">
            ⬆ SAVE
          </button>
          <button onClick={() => loadFromCloud()} className="cr-btn cr-btn-cyan">
            ⬇ LOAD
          </button>
          <button
            onClick={handleReset}
            className="cr-btn cr-btn-amber"
          >
            ↺ RESET
          </button>
          <button
            onClick={handleSignOut}
            className="cr-btn cr-btn-dim"
          >
            ⏻ SIGN OUT
          </button>
        </div>
      </div>
    </header>
  )
}
