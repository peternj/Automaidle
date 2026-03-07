import { useGameStore } from '../../store/gameStore'
import { RANKS } from '../../engine/config'
import { canRankUp, getNextRank } from '../../engine/GameEngine'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

const RANK_COLORS: Record<string, string> = {
  operator:    '#64748b',
  deptManager: '#06b6d4',
  prodManager: '#f97316',
  coo:         '#a78bfa',
}

const RANK_UNLOCKS: Record<string, string[]> = {
  operator:    ['Crystal Grower', 'N₂ Gas Plant', 'Manual Override', 'Basic Market'],
  deptManager: ['UPW System', 'Resist Mixer', 'Dashboard Tiles', 'KPI Monitor', 'Process Systems View'],
  prodManager: ['Lithography Unit', 'CMP Station', 'SCADA Flow Diagram', 'Yield Optimizer upgrade'],
  coo:         ['Assembly Unit', 'Global Ops View', 'Supply Chain Map', 'Full Financial Dashboard'],
}

export function CorporateLadderTab() {
  const state     = useGameStore(s => s)
  const rankUpFn  = useGameStore(s => s.rankUp)
  const rankIndex = state.rankIndex
  const stats     = state.stats

  const canRank   = canRankUp(state)
  const nextRank  = getNextRank(state)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="cr-label mb-1">Corporate Ladder</div>
        <div style={{ fontSize: 10, color: 'var(--c-dim)', fontFamily: 'monospace', lineHeight: 1.7 }}>
          Advancing your rank unlocks new systems, UI capabilities, and building tiers.<br />
          <strong style={{ color: 'var(--c-orange)' }}>Rank-up performs a soft reset:</strong> buildings and resources reset, coins reduced to 10%.
          R&D bonuses and upgrades are <strong style={{ color: 'var(--c-purple)' }}>permanent</strong>.
        </div>
      </div>

      {/* Rank cards */}
      <div className="flex flex-col gap-4">
        {RANKS.map((rank, i) => {
          const isActive   = i === rankIndex
          const isComplete = i < rankIndex
          const isNext     = i === rankIndex + 1
          const color      = RANK_COLORS[rank.key] ?? '#64748b'

          const pct = isComplete ? 100
            : isActive && nextRank
            ? Math.min(100, (stats.totalRevenue / nextRank.threshold) * 100)
            : isActive
            ? 100  // COO = max rank
            : 0

          return (
            <div
              key={rank.key}
              style={{
                background: 'var(--c-surface)',
                border: `1px solid ${isActive ? `${color}55` : isComplete ? 'rgba(34,197,94,0.2)' : 'var(--c-border)'}`,
                borderRadius: 12,
                padding: '20px 24px',
                opacity: !isActive && !isComplete && !isNext ? 0.45 : 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Color accent top bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: isComplete ? 'var(--c-green)' : isActive ? color : 'var(--c-border)',
              }} />

              <div className="flex items-start justify-between gap-4">
                {/* Left: rank info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="cr-rank-badge"
                      style={{ color, borderColor: `${color}55`, background: `${color}15`, fontSize: 10, padding: '3px 10px' }}
                    >
                      {rank.shortLabel}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isActive ? 'var(--c-bright)' : 'var(--c-text)' }}>
                      {rank.label}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: 9, color: 'var(--c-green)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                        ← CURRENT
                      </span>
                    )}
                    {isComplete && (
                      <span style={{ fontSize: 9, color: 'var(--c-green)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                        ✓ COMPLETED
                      </span>
                    )}
                  </div>

                  {/* Revenue threshold */}
                  {rank.threshold > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--c-dim)', fontFamily: 'monospace', marginBottom: 10 }}>
                      THRESHOLD: ${fmt(rank.threshold)} total revenue earned
                    </div>
                  )}

                  {/* Unlocks */}
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--c-dim)', letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>
                      Unlocks
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(RANK_UNLOCKS[rank.key] ?? []).map(item => (
                        <span
                          key={item}
                          style={{
                            fontSize: 9, fontFamily: 'monospace', padding: '2px 8px',
                            borderRadius: 3, border: `1px solid ${color}33`,
                            color: isComplete || isActive ? color : 'var(--c-dim)',
                            background: `${color}0a`,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: progress or rank-up */}
                <div style={{ flexShrink: 0, minWidth: 180 }}>
                  {(isActive || isComplete) && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="flex justify-between mb-1.5">
                        <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace' }}>Progress</span>
                        <span style={{ fontSize: 9, color, fontFamily: 'monospace' }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div className="cr-gauge-track" style={{ height: 5 }}>
                        <div
                          className="cr-gauge-fill"
                          style={{
                            width: `${pct}%`,
                            background: isComplete
                              ? 'var(--c-green)'
                              : `linear-gradient(90deg, ${color}, ${color}aa)`,
                            boxShadow: pct >= 100 ? `0 0 8px ${color}88` : undefined,
                          }}
                        />
                      </div>
                      {isActive && nextRank && (
                        <div style={{ fontSize: 8, color: 'var(--c-dim)', fontFamily: 'monospace', marginTop: 4 }}>
                          ${fmt(stats.totalRevenue)} / ${fmt(nextRank.threshold)}
                        </div>
                      )}
                    </div>
                  )}

                  {isActive && canRank && (
                    <button
                      onClick={rankUpFn}
                      className="cr-btn cr-btn-rankup"
                      style={{ width: '100%', padding: '8px 0', fontSize: 11 }}
                    >
                      ▲ RANK UP NOW
                    </button>
                  )}

                  {isActive && !canRank && nextRank && (
                    <div style={{
                      fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace',
                      lineHeight: 1.6, textAlign: 'center',
                    }}>
                      Earn ${fmt(nextRank.threshold - stats.totalRevenue)} more to unlock
                    </div>
                  )}

                  {isComplete && (
                    <div style={{
                      fontSize: 9, color: 'var(--c-green)', fontFamily: 'monospace',
                      textAlign: 'center', letterSpacing: '0.1em',
                    }}>
                      ✓ RANK ACHIEVED
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div
        style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 10, padding: '16px 20px',
        }}
      >
        <div className="cr-label mb-3">Career Statistics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Revenue',  value: `$${fmt(stats.totalRevenue)}`,  color: 'var(--c-green)'  },
            { label: 'Rank-Ups',       value: String(stats.rankUps),           color: 'var(--c-sky)'    },
            { label: 'Alarms Acked',   value: fmt(stats.alarmsAcked),          color: 'var(--c-amber)'  },
            { label: 'Manual Clicks',  value: fmt(stats.manualClicks),         color: 'var(--c-purple)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.1em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
