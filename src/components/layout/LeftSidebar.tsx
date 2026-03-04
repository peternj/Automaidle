import { useGameStore } from '../../store/gameStore'
import { RESOURCES, RESOURCE_KEYS, UPGRADES } from '../../engine/config'
import type { ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

/** Map resource color → CSS custom prop or hex for gauge fill */
function gaugeColor(resourceColor: string): string {
  // resourceColor is already a hex / css value from config
  return resourceColor
}

export function LeftSidebar() {
  const resources       = useGameStore(s => s.resources)
  const productionRates = useGameStore(s => s.productionRates)
  const upgrades        = useGameStore(s => s.upgrades)
  const manualMine      = useGameStore(s => s.manualMine)

  const clickYield = upgrades.betterPickaxe ? UPGRADES.betterPickaxe.value : 1

  function MineButton({ resource, label, icon }: { resource: ResourceKey; label: string; icon: string }) {
    return (
      <button
        onClick={() => manualMine(resource)}
        className="cr-btn cr-btn-cyan w-full flex items-center justify-between"
        style={{ padding: '7px 10px' }}
      >
        <span className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span>MINE {label.toUpperCase()}</span>
        </span>
        <span style={{ opacity: 0.5, fontSize: 9 }}>+{clickYield}/CLICK</span>
      </button>
    )
  }

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
      {/* ── Resource gauges ── */}
      <section className="p-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="cr-label mb-3">📦 Resources</div>

        <div className="flex flex-col gap-3">
          {RESOURCE_KEYS.map(key => {
            const cfg  = RESOURCES[key]
            const val  = resources[key] ?? 0
            const pct  = Math.min((val / cfg.cap) * 100, 100)
            const rate = productionRates[key] ?? 0
            const isFull = pct >= 99.5

            return (
              <div key={key}>
                {/* Label row */}
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5">
                    {/* status LED */}
                    <span
                      className={`cr-led ${
                        rate > 0  ? 'cr-led-green'
                        : rate < 0 ? 'cr-led-amber'
                        :            'cr-led-dim'
                      }`}
                    />
                    <span style={{ fontSize: 13, color: 'var(--c-text)' }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </span>
                  <span className="cr-value" style={{ fontSize: 11 }}>
                    {fmt(val)}<span style={{ color: 'var(--c-dim)', fontWeight: 400 }}>/{cfg.cap}</span>
                  </span>
                </div>

                {/* Gauge */}
                <div className="cr-gauge-track">
                  <div
                    className="cr-gauge-fill"
                    style={{
                      width: `${pct}%`,
                      background: isFull
                        ? 'var(--c-amber)'
                        : gaugeColor(cfg.color),
                      boxShadow: `0 0 6px ${gaugeColor(cfg.color)}55`,
                    }}
                  />
                </div>

                {/* Rate */}
                <div className="flex justify-between mt-0.5" style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
                  <span style={{ color: 'var(--c-dim)' }}>{pct.toFixed(0)}%</span>
                  {rate > 0
                    ? <span style={{ color: 'var(--c-green)' }}>+{rate.toFixed(1)}/s</span>
                    : rate < 0
                    ? <span style={{ color: 'var(--c-red)' }}>{rate.toFixed(1)}/s</span>
                    : <span style={{ color: 'var(--c-dim)' }}>IDLE</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Manual mining ── */}
      <section className="p-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="cr-label mb-3">⛏ Manual Extract</div>
        <div className="flex flex-col gap-2">
          <MineButton resource="ironOre"   label="Iron"   icon="🪨" />
          <MineButton resource="copperOre" label="Copper" icon="🟠" />
          <MineButton resource="coal"      label="Coal"   icon="⬛" />
        </div>
      </section>

      {/* ── Net production summary ── */}
      <section className="p-4">
        <div className="cr-label mb-3">⚡ Net Output/s</div>
        <div className="flex flex-col gap-1">
          {RESOURCE_KEYS.filter(k => (productionRates[k] ?? 0) !== 0).length === 0
            ? (
              <span style={{ color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontStyle: 'italic' }}>
                — no active buildings —
              </span>
            )
            : RESOURCE_KEYS.filter(k => (productionRates[k] ?? 0) !== 0).map(key => {
                const rate = productionRates[key] ?? 0
                return (
                  <div key={key} className="cr-ticker-row" style={{ padding: '4px 8px' }}>
                    <span style={{ color: 'var(--c-text)', fontSize: 11 }}>
                      {RESOURCES[key].icon} {RESOURCES[key].label}
                    </span>
                    <span
                      className="cr-value"
                      style={{
                        fontSize: 11,
                        color: rate > 0 ? 'var(--c-green)' : 'var(--c-red)',
                      }}
                    >
                      {rate > 0 ? '+' : ''}{rate.toFixed(1)}
                    </span>
                  </div>
                )
              })
          }
        </div>
      </section>
    </aside>
  )
}
