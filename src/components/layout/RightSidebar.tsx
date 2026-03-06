import { useGameStore } from '../../store/gameStore'
import { RESOURCES, MARKET, UPGRADES } from '../../engine/config'
import { RESOURCE_KEYS } from '../../engine/config'
import type { ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

// Step sizes for the floor stepper per resource tier
const FLOOR_STEP: Partial<Record<ResourceKey, number>> = {
  ironOre: 25, copperOre: 25, coal: 25,
  ironPlate: 10, copperWire: 10,
  gear: 5, circuit: 5,
  steel: 5, processor: 2,
  robot: 1,
}

export function RightSidebar() {
  const marketPrices = useGameStore(s => s.marketPrices)
  const priceHistory = useGameStore(s => s.priceHistory)
  const upgrades     = useGameStore(s => s.upgrades)
  const logBuffer    = useGameStore(s => s.logBuffer)
  const resources    = useGameStore(s => s.resources)
  const autoSell     = useGameStore(s => s.autoSell)
  const sell         = useGameStore(s => s.sell)
  const setAutoSell  = useGameStore(s => s.setAutoSell)

  const sellMult = upgrades.bulkSale2 ? UPGRADES.bulkSale2.value
                 : upgrades.bulkSale  ? UPGRADES.bulkSale.value  : 1

  function getPriceTrend(res: ResourceKey) {
    const h = priceHistory[res]
    if (!h || h.length < 2) return 0
    return h[h.length - 1] - h[h.length - 2]
  }

  return (
    <aside
      className="flex flex-col overflow-hidden"
      style={{
        width: 288,
        background: 'var(--c-panel)',
        borderLeft: '1px solid var(--c-border)',
        flexShrink: 0,
      }}
    >
      {/* ── Market telemetry ── */}
      <section className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="cr-label mb-3">📈 Market Feed</div>

        <div className="flex flex-col gap-2">
          {RESOURCE_KEYS.filter(k => k in MARKET).map(res => {
            const cfg    = RESOURCES[res]
            const price  = marketPrices[res] ?? MARKET[res].basePrice
            const trend  = getPriceTrend(res)
            const stock  = resources[res] ?? 0
            const asCfg  = autoSell[res]
            const step   = FLOOR_STEP[res] ?? 5

            const trendIcon  = trend > 2 ? '▲▲' : trend > 0 ? '▲' : trend < -2 ? '▼▼' : trend < 0 ? '▼' : '●'
            const trendColor = trend > 0 ? 'var(--c-green)' : trend < 0 ? 'var(--c-red)' : 'var(--c-dim)'

            return (
              <div
                key={res}
                style={{
                  background: asCfg?.enabled
                    ? 'rgba(0, 224, 120, 0.04)'
                    : 'rgba(0, 190, 230, 0.03)',
                  border: `1px solid ${asCfg?.enabled ? 'rgba(0, 224, 120, 0.25)' : 'var(--c-border)'}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* ── Top row: resource + price + manual sell ── */}
                <div className="flex items-center justify-between gap-2 px-2 pt-2 pb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <div className="min-w-0">
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        color: 'var(--c-dim)',
                        textTransform: 'uppercase',
                      }}>
                        {cfg.label}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="cr-value" style={{ fontSize: 13, color: 'var(--c-amber)' }}>
                          {price}
                        </span>
                        <span style={{ fontSize: 8, color: 'var(--c-dim)' }}>🪙</span>
                        <span style={{ fontSize: 9, color: trendColor, fontFamily: "'JetBrains Mono', monospace" }}>
                          {trendIcon}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                          /{fmt(stock)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => sell(res, 10)}
                    className="cr-btn cr-btn-green shrink-0"
                    title={`Sell ${10 * sellMult} units manually`}
                    style={{ fontSize: 9, padding: '4px 7px' }}
                  >
                    SELL ×{sellMult}
                  </button>
                </div>

                {/* ── Bottom row: auto-sell controls ── */}
                <div
                  className="flex items-center gap-2 px-2 pb-2"
                  style={{
                    borderTop: '1px solid var(--c-border)',
                    paddingTop: 6,
                  }}
                >
                  {/* Toggle LED */}
                  <button
                    onClick={() => setAutoSell(res, { enabled: !asCfg?.enabled })}
                    title={asCfg?.enabled ? 'Auto-sell ON — click to disable' : 'Auto-sell OFF — click to enable'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className={`cr-led ${asCfg?.enabled ? 'cr-led-green' : 'cr-led-dim'}`}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      letterSpacing: '0.1em',
                      color: asCfg?.enabled ? 'var(--c-green)' : 'var(--c-dim)',
                      textTransform: 'uppercase',
                    }}>
                      AUTO
                    </span>
                  </button>

                  {/* Floor stepper */}
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 8,
                      color: 'var(--c-dim)',
                      letterSpacing: '0.08em',
                      flexShrink: 0,
                    }}>
                      KEEP ≥
                    </span>

                    {/* Decrease */}
                    <button
                      onClick={() => setAutoSell(res, { keepAmount: Math.max(0, (asCfg?.keepAmount ?? 0) - step) })}
                      className="cr-btn cr-btn-dim"
                      style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1 }}
                    >
                      ▼
                    </button>

                    {/* Number input */}
                    <input
                      type="number"
                      min={0}
                      value={asCfg?.keepAmount ?? 0}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10)
                        if (!isNaN(v) && v >= 0) setAutoSell(res, { keepAmount: v })
                      }}
                      style={{
                        width: 46,
                        background: 'var(--c-bg)',
                        border: '1px solid var(--c-border)',
                        borderRadius: 3,
                        color: 'var(--c-cyan)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        textAlign: 'center',
                        padding: '2px 3px',
                        outline: 'none',
                      }}
                    />

                    {/* Increase */}
                    <button
                      onClick={() => setAutoSell(res, { keepAmount: (asCfg?.keepAmount ?? 0) + step })}
                      className="cr-btn cr-btn-dim"
                      style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1 }}
                    >
                      ▲
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Activity log / terminal ── */}
      <section className="p-4 flex flex-col flex-1 min-h-0">
        <div className="cr-label mb-3">📋 System Log</div>

        <div
          className="flex-1 overflow-y-auto flex flex-col gap-0"
          style={{
            background: 'var(--c-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 4,
            padding: '6px 8px',
          }}
        >
          {[...logBuffer].reverse().slice(0, 100).map((msg, i) => (
            <div key={i} className="cr-log-line">
              {msg}
            </div>
          ))}
          {logBuffer.length === 0 && (
            <span style={{ color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontStyle: 'italic' }}>
              — awaiting events —
            </span>
          )}
        </div>
      </section>
    </aside>
  )
}
