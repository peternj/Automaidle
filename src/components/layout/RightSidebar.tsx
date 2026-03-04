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
    <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">

      {/* Market */}
      <section className="p-4 border-b border-slate-700 flex-shrink-0">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📈 Market</h2>
        <div className="space-y-2">
          {RESOURCE_KEYS.filter(k => k in MARKET).map(res => {
            const cfg   = RESOURCES[res]
            const price = marketPrices[res] ?? MARKET[res].basePrice
            const trend = getPriceTrend(res)
            const trendIcon  = trend > 0 ? '▲' : trend < 0 ? '▼' : '●'
            const trendClass = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-500'

            return (
              <div key={res} className="bg-slate-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{cfg.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-300 truncate">{cfg.label}</div>
                    <div className={`text-xs font-mono ${trendClass}`}>{trendIcon} {price}🪙</div>
                  </div>
                </div>
                <button
                  onClick={() => sell(res, 10)}
                  className="shrink-0 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-xs rounded-lg transition-all font-mono font-medium"
                  title={`Sell ${10 * sellMult}`}
                >
                  Sell ×{10 * sellMult}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Activity log */}
      <section className="p-4 flex flex-col flex-1 min-h-0">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📋 Activity Log</h2>
        <div className="flex-1 overflow-y-auto space-y-0.5 text-xs text-slate-400 font-mono">
          {[...logBuffer].reverse().slice(0, 80).map((msg, i) => (
            <div key={i} className="py-0.5 border-b border-slate-800 last:border-0">{msg}</div>
          ))}
        </div>
      </section>
    </aside>
  )
}
