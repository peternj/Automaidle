import { useGameStore } from '../../store/gameStore'
import { RESOURCES, RESOURCE_KEYS, UPGRADES } from '../../engine/config'
import type { ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export function LeftSidebar() {
  const resources      = useGameStore(s => s.resources)
  const productionRates = useGameStore(s => s.productionRates)
  const upgrades       = useGameStore(s => s.upgrades)
  const manualMine     = useGameStore(s => s.manualMine)

  const clickYield = upgrades.betterPickaxe ? UPGRADES.betterPickaxe.value : 1

  function mineBtn(resource: ResourceKey, label: string, icon: string, hoverClass: string) {
    return (
      <button
        key={resource}
        onClick={() => manualMine(resource)}
        className={`w-full px-4 py-3 bg-slate-700 ${hoverClass} active:scale-95 rounded-xl font-medium transition-all flex items-center justify-between group`}
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <div className="text-sm">Mine {label}</div>
            <div className="text-xs text-slate-400 group-hover:text-blue-200">+{clickYield} per click</div>
          </div>
        </span>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">CLICK</span>
      </button>
    )
  }

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto">

      {/* Resources */}
      <section className="p-4 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📦 Resources</h2>
        <div className="space-y-2">
          {RESOURCE_KEYS.map(key => {
            const cfg  = RESOURCES[key]
            const val  = resources[key] ?? 0
            const pct  = (val / cfg.cap) * 100
            const rate = productionRates[key] ?? 0
            return (
              <div key={key} className="bg-slate-800 rounded-lg p-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm flex items-center gap-1.5">
                    <span>{cfg.icon}</span>
                    <span className="text-slate-300">{cfg.label}</span>
                  </span>
                  <span className="font-mono text-xs text-white font-medium">
                    {fmt(val)}<span className="text-slate-600">/{cfg.cap}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: cfg.color }}
                  />
                </div>
                <div className="text-right text-xs">
                  {rate > 0
                    ? <span className="text-green-400">+{rate.toFixed(1)}/s</span>
                    : rate < 0
                    ? <span className="text-red-400">{rate.toFixed(1)}/s</span>
                    : <span className="text-slate-500">0/s</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Manual mining */}
      <section className="p-4 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">⛏️ Manual Mining</h2>
        <div className="space-y-2">
          {mineBtn('ironOre',   'Iron',   '🪨', 'hover:bg-blue-700')}
          {mineBtn('copperOre', 'Copper', '🟠', 'hover:bg-orange-700')}
          {mineBtn('coal',      'Coal',   '⬛', 'hover:bg-gray-600')}
        </div>
      </section>

      {/* Production rates summary */}
      <section className="p-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">📊 Production/sec</h2>
        <div className="space-y-1 text-sm">
          {RESOURCE_KEYS.filter(k => (productionRates[k] ?? 0) !== 0).length === 0
            ? <p className="text-slate-600 italic">No active buildings</p>
            : RESOURCE_KEYS.filter(k => (productionRates[k] ?? 0) !== 0).map(key => {
                const rate = productionRates[key] ?? 0
                return (
                  <div key={key} className="flex justify-between">
                    <span>{RESOURCES[key].icon} {RESOURCES[key].label}</span>
                    <span className={`font-mono ${rate > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
