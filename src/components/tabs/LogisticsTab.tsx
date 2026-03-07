import { useGameStore } from '../../store/gameStore'
import { BUILDINGS, BUILDING_KEYS, RESOURCES, RANK_ORDER } from '../../engine/config'
import type { BuildingKey } from '../../engine/types'

// Systems tab — shows process subsystem status as tiles (Dept Manager+)

function SystemTile({ bKey }: { bKey: BuildingKey }) {
  const buildings       = useGameStore(s => s.buildings)
  const starvedBuildings = useGameStore(s => s.starvedBuildings)
  const productionRates  = useGameStore(s => s.productionRates)

  const cfg    = BUILDINGS[bKey]
  const count  = buildings[bKey]
  const starved = !!starvedBuildings[bKey]
  const active = count > 0 && !starved

  const prodRes  = Object.keys(cfg.production)[0] as (keyof typeof RESOURCES) | undefined

  const statusColor = starved ? 'var(--c-orange)' : active ? 'var(--c-green)' : 'var(--c-dim)'
  const statusLabel = count === 0 ? 'NOT DEPLOYED' : starved ? 'STARVED' : 'RUNNING'

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: `1px solid ${starved ? 'rgba(249,115,22,0.35)' : active ? 'rgba(59,130,246,0.25)' : 'var(--c-border)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: count === 0 ? 0.65 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20, color: prodRes ? RESOURCES[prodRes]?.color : 'var(--c-dim)' }}>
            {cfg.icon}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-bright)' }}>{cfg.label}</div>
            <div style={{ fontSize: 8, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {cfg.unlockAtRank.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: statusColor, letterSpacing: '0.1em' }}>
            {statusLabel}
          </span>
          <div className={
            starved ? 'cr-led cr-led-orange'
            : active ? 'cr-led cr-led-green'
            : 'cr-led cr-led-dim'
          } />
        </div>
      </div>

      {/* Unit count indicator */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: cfg.maxCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8, height: 8, borderRadius: 1,
              background: i < count
                ? (starved ? 'var(--c-orange)' : 'var(--c-green)')
                : 'rgba(59,130,246,0.08)',
              border: `1px solid ${i < count ? 'transparent' : 'var(--c-border)'}`,
            }}
          />
        ))}
        <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', marginLeft: 4 }}>
          {count}/{cfg.maxCount}
        </span>
      </div>

      {/* Flow rates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {/* Produces */}
        {Object.entries(cfg.production).map(([r, v]) => {
          const rate = productionRates[r as keyof typeof RESOURCES] ?? 0
          const pct  = count > 0 ? Math.min(100, Math.abs(rate / (v * count)) * 100) : 0
          return (
            <div key={r} style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 5, padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 2 }}>
                OUT — {RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}
              </div>
              <div className="cr-gauge-track">
                <div className="cr-gauge-fill" style={{ width: `${pct}%`, background: 'var(--c-green)' }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--c-green)', fontFamily: 'monospace', marginTop: 2 }}>
                +{(v * count).toFixed(1)}/s
              </div>
            </div>
          )
        })}

        {/* Consumes */}
        {Object.entries(cfg.consumption).map(([r, v]) => {
          return (
            <div key={r} style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 5, padding: '5px 8px' }}>
              <div style={{ fontSize: 8, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 2 }}>
                IN — {RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}
              </div>
              <div className="cr-gauge-track">
                <div className="cr-gauge-fill" style={{ width: count > 0 && !starved ? '90%' : '10%', background: 'var(--c-orange)' }} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--c-orange)', fontFamily: 'monospace', marginTop: 2 }}>
                -{(v * count).toFixed(1)}/s
              </div>
            </div>
          )
        })}
      </div>

      {/* Starve detail */}
      {starved && starvedBuildings[bKey] && (
        <div style={{
          background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 5, padding: '5px 8px',
          fontSize: 9, color: 'var(--c-orange)', fontFamily: 'monospace',
        }}>
          ▲ Supply shortage: {starvedBuildings[bKey]!.map(r => RESOURCES[r]?.label ?? r).join(', ')}
        </div>
      )}
    </div>
  )
}

export function LogisticsTab() {
  const rankIndex = useGameStore(s => s.rankIndex)
  const visibleKeys = BUILDING_KEYS.filter(k => RANK_ORDER[BUILDINGS[k].unlockAtRank] <= rankIndex)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="cr-label mb-1">Process Systems — Real-Time Status</div>
        <div style={{ fontSize: 10, color: 'var(--c-dim)', fontFamily: 'monospace' }}>
          Monitor valve status, flow rates, and supply line health for each active subsystem
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {visibleKeys.map(k => <SystemTile key={k} bKey={k} />)}
      </div>
    </div>
  )
}
