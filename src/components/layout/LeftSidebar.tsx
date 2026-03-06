import { useGameStore } from '../../store/gameStore'
import { RESOURCES, RESOURCE_KEYS } from '../../engine/config'
import type { ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

const TIERS: { tier: 'raw' | 'intermediate' | 'product'; label: string }[] = [
  { tier: 'raw',          label: 'Raw Supply' },
  { tier: 'intermediate', label: 'Process Line' },
  { tier: 'product',      label: 'Output' },
]

function ResourceRow({ rKey }: { rKey: ResourceKey }) {
  const cfg           = RESOURCES[rKey]
  const resources     = useGameStore(s => s.resources)
  const productionRates = useGameStore(s => s.productionRates)

  const val  = resources[rKey] ?? 0
  const pct  = Math.min((val / cfg.cap) * 100, 100)
  const rate = productionRates[rKey] ?? 0
  const isFull = pct >= 99.5

  return (
    <div className="flex items-center gap-2.5">
      {/* Silo (vertical fill) */}
      <div className="cr-silo" style={{ height: 40 }}>
        <div
          className="cr-silo-fill"
          style={{
            height: `${pct}%`,
            background: isFull ? 'var(--c-orange)' : cfg.color,
            boxShadow: `0 0 8px ${cfg.color}44`,
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className={`cr-led ${
                rate > 0   ? 'cr-led-green'
                : rate < 0 ? 'cr-led-orange'
                :            'cr-led-dim'
              }`}
            />
            <span style={{ fontSize: 11, color: 'var(--c-text)' }}>
              {cfg.icon} {cfg.label}
            </span>
          </span>
          <span className="cr-value" style={{ fontSize: 10 }}>
            {fmt(val)}<span style={{ color: 'var(--c-dim)', fontWeight: 400 }}>/{cfg.cap}</span>
          </span>
        </div>

        {/* Horizontal gauge */}
        <div className="cr-gauge-track">
          <div
            className="cr-gauge-fill"
            style={{
              width: `${pct}%`,
              background: isFull ? 'var(--c-orange)' : cfg.color,
              boxShadow: `0 0 4px ${cfg.color}66`,
            }}
          />
        </div>

        {/* Rate */}
        <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
          {rate > 0
            ? <span style={{ color: 'var(--c-green)' }}>+{rate.toFixed(1)}/s</span>
            : rate < 0
            ? <span style={{ color: 'var(--c-red)' }}>{rate.toFixed(1)}/s</span>
            : <span style={{ color: 'var(--c-dim)' }}>IDLE</span>
          }
        </div>
      </div>
    </div>
  )
}

export function LeftSidebar() {
  const rank         = useGameStore(s => s.rank)
  const rankIndex    = useGameStore(s => s.rankIndex)
  const upgrades     = useGameStore(s => s.upgrades)
  const manualExtract = useGameStore(s => s.manualExtract)

  const clickYield = upgrades.betterExtraction ? 2 : 1

  // Filter resources by rank visibility
  const visibleTiers = rankIndex >= 2
    ? TIERS
    : rankIndex >= 1
    ? TIERS.filter(t => t.tier !== 'product')
    : TIERS.filter(t => t.tier === 'raw')

  return (
    <aside
      className="flex flex-col overflow-y-auto"
      style={{
        width: 268,
        background: 'var(--c-panel)',
        borderRight: '1px solid var(--c-border)',
        flexShrink: 0,
      }}
    >
      {/* ── Asset Tree: Resources by tier ── */}
      {visibleTiers.map(({ tier, label }) => {
        const keys = RESOURCE_KEYS.filter(k => RESOURCES[k].tier === tier)
        return (
          <section key={tier} className="p-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div className="cr-label mb-3">{label}</div>
            <div className="flex flex-col gap-3">
              {keys.map(k => <ResourceRow key={k} rKey={k} />)}
            </div>
          </section>
        )
      })}

      {/* ── Manual Extract ── */}
      <section className="p-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="cr-label mb-3">Manual Extract</div>

        {rank === 'operator' ? (
          /* Operator: compact but visible extract button */
          <button
            onClick={manualExtract}
            className="cr-btn cr-btn-orange w-full flex items-center justify-between"
            style={{ padding: '8px 12px' }}
          >
            <span className="flex items-center gap-2">
              <span>◈ EXTRACT SILICON</span>
            </span>
            <span style={{ opacity: 0.6, fontSize: 9 }}>+{clickYield}/CLICK</span>
          </button>
        ) : (
          <button
            onClick={manualExtract}
            className="cr-btn cr-btn-dim w-full flex items-center justify-between"
            style={{ padding: '6px 10px' }}
          >
            <span>◈ Manual Silicon</span>
            <span style={{ opacity: 0.5, fontSize: 9 }}>+{clickYield}</span>
          </button>
        )}
      </section>

      {/* ── Net output summary ── */}
      <section className="p-4 flex-1">
        <div className="cr-label mb-3">Net Output/s</div>
        <NetOutput />
      </section>
    </aside>
  )
}

function NetOutput() {
  const productionRates = useGameStore(s => s.productionRates)

  const active = RESOURCE_KEYS.filter(k => (productionRates[k] ?? 0) !== 0)

  if (active.length === 0) {
    return (
      <span style={{ color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontStyle: 'italic' }}>
        — no active processes —
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {active.map(key => {
        const rate = productionRates[key] ?? 0
        return (
          <div key={key} className="cr-ticker-row" style={{ padding: '3px 7px' }}>
            <span style={{ color: 'var(--c-text)', fontSize: 10 }}>
              {RESOURCES[key].icon} {RESOURCES[key].label}
            </span>
            <span
              className="cr-value"
              style={{ fontSize: 10, color: rate > 0 ? 'var(--c-green)' : 'var(--c-red)' }}
            >
              {rate > 0 ? '+' : ''}{rate.toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
