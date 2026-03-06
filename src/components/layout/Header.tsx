import { useGameStore } from '../../store/gameStore'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { RANKS } from '../../engine/config'
import { canRankUp, getNextRank } from '../../engine/GameEngine'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

function fmtDps(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(1)
}

const RANK_COLORS: Record<string, string> = {
  operator:    '#64748b',
  deptManager: '#06b6d4',
  prodManager: '#f97316',
  coo:         '#a78bfa',
}

export function Header() {
  const tick          = useGameStore(s => s.tick)
  const coins         = useGameStore(s => s.coins)
  const rank          = useGameStore(s => s.rank)
  const rankIndex     = useGameStore(s => s.rankIndex)
  const dollarPerSec  = useGameStore(s => s.dollarPerSec)
  const alarms        = useGameStore(s => s.alarms)
  const saveToCloud   = useGameStore(s => s.saveToCloud)
  const loadFromCloud = useGameStore(s => s.loadFromCloud)
  const resetGame     = useGameStore(s => s.resetGame)
  const rankUpFn      = useGameStore(s => s.rankUp)
  const navigate      = useNavigate()

  const state         = useGameStore(s => s)
  const canRank       = canRankUp(state)
  const nextRank      = getNextRank(state)

  const rankCfg       = RANKS[rankIndex]
  const rankColor     = RANK_COLORS[rank] ?? '#64748b'

  const unackedCritical = alarms.filter(a => !a.acked && a.severity === 'critical').length
  const unackedTotal    = alarms.filter(a => !a.acked).length

  const mins   = Math.floor(tick / 60)
  const secs   = tick % 60
  const runTxt = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function handleReset() {
    if (window.confirm('Reset all progress? This cannot be undone.')) resetGame()
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 gap-4"
      style={{
        background: 'var(--c-panel)',
        borderBottom: '1px solid var(--c-border)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.6)',
        height: 52,
      }}
    >
      {/* ── Brand + Rank ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="cr-led cr-led-green" />
        <div>
          <div
            style={{
              color: 'var(--c-bright)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Nanofab OS
          </div>
          <div style={{ marginTop: 2 }}>
            <span
              className="cr-rank-badge"
              style={{
                color: rankColor,
                borderColor: `${rankColor}55`,
                background: `${rankColor}12`,
              }}
            >
              ▲ {rankCfg?.shortLabel ?? rank.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Centre: uptime + $/sec + alarms ── */}
      <div className="flex-1 flex justify-center gap-3">
        {/* Uptime clock */}
        <div
          className="flex items-center gap-2 px-4 py-1 rounded"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        >
          <div className="cr-led cr-led-blue" />
          <div className="text-center">
            <div className="cr-value animate-tick-flash" style={{ fontSize: 18, lineHeight: 1, letterSpacing: '0.06em' }}>
              {runTxt}
            </div>
            <div className="cr-label" style={{ justifyContent: 'center', marginTop: 1 }}>
              UPTIME · T{fmt(tick)}
            </div>
          </div>
          <div className="cr-led cr-led-blue" />
        </div>

        {/* $/sec */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded"
          style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <span style={{ color: 'var(--c-dim)', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em' }}>$/SEC</span>
          <span className="cr-value" style={{ color: 'var(--c-green)', fontSize: 16, fontWeight: 700 }}>
            {fmtDps(dollarPerSec)}
          </span>
        </div>

        {/* Alarm badge (only if there are unacked alarms) */}
        {unackedTotal > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded"
            style={{
              background: unackedCritical > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.08)',
              border: `1px solid ${unackedCritical > 0 ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.35)'}`,
            }}
          >
            <div className={unackedCritical > 0 ? 'cr-led cr-led-red' : 'cr-led cr-led-orange'} />
            <span className="cr-value" style={{ fontSize: 14, color: unackedCritical > 0 ? 'var(--c-red)' : 'var(--c-orange)' }}>
              {unackedTotal}
            </span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em', color: unackedCritical > 0 ? 'var(--c-red)' : 'var(--c-orange)' }}>
              &nbsp;ALM
            </span>
          </div>
        )}
      </div>

      {/* ── Right: coins + actions ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Coin readout */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded"
          style={{
            background: 'rgba(96,165,250,0.07)',
            border: '1px solid rgba(96,165,250,0.2)',
          }}
        >
          <span style={{ color: 'var(--c-sky)', fontSize: 11 }}>◆</span>
          <span className="cr-value" style={{ color: 'var(--c-sky)', fontSize: 15, fontWeight: 700 }}>
            {fmt(coins)}
          </span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em', color: 'var(--c-dim)' }}>
            &nbsp;COINS
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1">
          {canRank && nextRank && (
            <button onClick={rankUpFn} className="cr-btn cr-btn-rankup" title={`Rank up to ${nextRank.label}`}>
              ▲ RANK UP
            </button>
          )}
          <button onClick={() => saveToCloud()} className="cr-btn cr-btn-blue">⬆ SAVE</button>
          <button onClick={() => loadFromCloud()} className="cr-btn cr-btn-blue">⬇ LOAD</button>
          <button onClick={handleReset} className="cr-btn cr-btn-amber">↺ RESET</button>
          <button onClick={handleSignOut} className="cr-btn cr-btn-dim">⏻ EXIT</button>
        </div>
      </div>
    </header>
  )
}
