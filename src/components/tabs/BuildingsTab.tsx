import { useGameStore } from '../../store/gameStore'
import { BUILDINGS, BUILDING_KEYS, RESOURCES } from '../../engine/config'
import { computeBuildingCost } from '../../engine/GameEngine'
import type { BuildingKey } from '../../engine/types'

function fmt(n: number) { return n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString() }

export function BuildingsTab() {
  const state           = useGameStore(s => s)
  const buyBuilding     = useGameStore(s => s.buyBuilding)
  const starvedBuildings = useGameStore(s => s.starvedBuildings)

  const totalBuildings = Object.values(state.buildings).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {BUILDING_KEYS.map(key => {
        const cfg      = BUILDINGS[key]
        const count    = state.buildings[key] ?? 0
        const locked   = totalBuildings < cfg.unlockAt && count === 0
        const atMax    = count >= cfg.maxCount
        const isActive = count > 0
        const missingResources = isActive ? (starvedBuildings[key] ?? []) : []
        const isStarved = missingResources.length > 0

        const { cost, canAfford } = computeBuildingCost(state, key)

        const stationClass = locked
          ? 'cr-station cr-station-inactive'
          : isStarved
          ? 'cr-station cr-station-starved'
          : isActive
          ? 'cr-station cr-station-active'
          : 'cr-station cr-station-inactive'

        return (
          <div
            key={key}
            className={stationClass}
            style={{ opacity: locked ? 0.45 : 1 }}
          >
            {/* ── Header row ── */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {/* Status LED */}
                <span
                  className={`cr-led ${
                    locked     ? 'cr-led-dim'
                    : isStarved ? 'cr-led-amber'
                    : isActive  ? 'cr-led-green'
                    :             'cr-led-dim'
                  }`}
                  style={{ marginTop: 2 }}
                />

                <span style={{ fontSize: 24 }}>{cfg.icon}</span>

                <div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--c-bright)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--c-dim)', marginTop: 1 }}>
                    {cfg.desc}
                  </div>
                </div>
              </div>

              {/* Count badge */}
              <div
                className="cr-value shrink-0"
                style={{
                  fontSize: 13,
                  color: isStarved ? 'var(--c-amber)' : isActive ? 'var(--c-cyan)' : 'var(--c-dim)',
                  background: 'var(--c-bg)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 4,
                  padding: '2px 8px',
                }}
              >
                {count}/{cfg.maxCount}
              </div>
            </div>

            {/* ── Starvation warning ── */}
            {isStarved && (
              <div
                style={{
                  background: 'rgba(255,170,0,0.08)',
                  border: '1px solid rgba(255,170,0,0.35)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--c-amber)',
                  letterSpacing: '0.06em',
                }}
                title={`Missing: ${missingResources.map(r => RESOURCES[r as keyof typeof RESOURCES]?.label ?? r).join(', ')}`}
              >
                ⚠ STARVED — NO {missingResources.map(r => RESOURCES[r as keyof typeof RESOURCES]?.icon ?? r).join(' ')}
              </div>
            )}

            {/* ── I/O rates ── */}
            <div className="flex flex-wrap gap-2" style={{ fontSize: 10 }}>
              {Object.entries(cfg.production).map(([r, a]) => (
                <span key={r} style={{ color: 'var(--c-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                  +{a} {RESOURCES[r as keyof typeof RESOURCES]?.icon}
                </span>
              ))}
              {Object.entries(cfg.consumption).length > 0 && (
                <span style={{ color: 'var(--c-border-hi)' }}>│</span>
              )}
              {Object.entries(cfg.consumption).map(([r, a]) => (
                <span key={r} style={{ color: 'var(--c-red)', fontFamily: "'JetBrains Mono', monospace" }}>
                  −{a} {RESOURCES[r as keyof typeof RESOURCES]?.icon}
                </span>
              ))}
            </div>

            {/* ── Cost + buy ── */}
            <div className="flex items-center justify-between gap-2">
              {/* Cost readout */}
              <div className="flex flex-wrap gap-2" style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                {Object.entries(cost).map(([res, amt]) => {
                  const have = res === 'coins'
                    ? state.coins
                    : (state.resources[res as keyof typeof state.resources] ?? 0)
                  const icon = res === 'coins'
                    ? '🪙'
                    : RESOURCES[res as keyof typeof RESOURCES]?.icon ?? '?'
                  return (
                    <span key={res} style={{ color: have >= amt ? 'var(--c-green)' : 'var(--c-red)' }}>
                      {icon} {fmt(amt)}
                    </span>
                  )
                })}
              </div>

              {/* Buy button */}
              <button
                onClick={() => buyBuilding(key as BuildingKey)}
                disabled={locked || atMax || !canAfford}
                className={`cr-btn shrink-0 ${
                  locked || atMax  ? 'cr-btn-dim'
                  : !canAfford     ? 'cr-btn-dim'
                  :                  'cr-btn-green'
                }`}
              >
                {locked ? '🔒 LOCKED' : atMax ? '✓ MAX' : '+ BUY'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
