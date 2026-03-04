import { useGameStore } from '../../store/gameStore'
import { RESOURCES, MARKET, UPGRADES } from '../../engine/config'
import { RESOURCE_KEYS } from '../../engine/config'
import type { ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function RightSidebar() {
  const marketPrices = useGameStore(s => s.marketPrices)
  const priceHistory = useGameStore(s => s.priceHistory)
  const upgrades     = useGameStore(s => s.upgrades)
  const logBuffer    = useGameStore(s => s.logBuffer)
  const sell         = useGameStore(s => s.sell)

  const sellMult = upgrades.bulkSale ? UPGRADES.bulkSale.value : 1

  function getPriceTrend(res: ResourceKey) {
    const h = priceHistory[res]
    if (!h || h.length < 2) return 0
    return h[h.length - 1] - h[h.length - 2]
  }

  return (
    <aside
      className="flex flex-col overflow-hidden"
      style={{
        width: 268,
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
            const cfg   = RESOURCES[res]
            const price = marketPrices[res] ?? MARKET[res].basePrice
            const trend = getPriceTrend(res)

            const trendIcon  = trend > 2 ? '▲▲' : trend > 0 ? '▲' : trend < -2 ? '▼▼' : trend < 0 ? '▼' : '●'
            const trendColor = trend > 0 ? 'var(--c-green)' : trend < 0 ? 'var(--c-red)' : 'var(--c-dim)'

            return (
              <div key={res} className="cr-ticker-row">
                {/* Resource info */}
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                  <div className="min-w-0">
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: '0.1em',
                        color: 'var(--c-dim)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {cfg.label}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="cr-value"
                        style={{ fontSize: 14, color: 'var(--c-amber)' }}
                      >
                        {price}
                      </span>
                      <span style={{ fontSize: 8, color: 'var(--c-dim)' }}>🪙</span>
                      <span style={{ fontSize: 10, color: trendColor, fontFamily: "'JetBrains Mono', monospace" }}>
                        {trendIcon}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sell button */}
                <button
                  onClick={() => sell(res, 10)}
                  className="cr-btn cr-btn-green shrink-0"
                  title={`Sell ${10 * sellMult} units`}
                >
                  SELL ×{10 * sellMult}
                </button>
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
