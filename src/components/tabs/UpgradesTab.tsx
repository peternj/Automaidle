import { useGameStore } from '../../store/gameStore'
import { UPGRADES, UPGRADE_KEYS, RESOURCES } from '../../engine/config'
import type { UpgradeKey } from '../../engine/types'

function fmt(n: number) { return n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString() }

export function UpgradesTab() {
  const upgrades   = useGameStore(s => s.upgrades)
  const resources  = useGameStore(s => s.resources)
  const coins      = useGameStore(s => s.coins)
  const buyUpgrade = useGameStore(s => s.buyUpgrade)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {UPGRADE_KEYS.map(key => {
        const cfg   = UPGRADES[key]
        const bought = upgrades[key]

        let canAfford = true
        for (const [res, amt] of Object.entries(cfg.cost)) {
          if (res === 'coins') { if (coins < amt) canAfford = false }
          else { if ((resources[res as keyof typeof resources] ?? 0) < amt) canAfford = false }
        }

        return (
          <div
            key={key}
            className={`bg-slate-800 border rounded-2xl p-4 flex flex-col gap-3
              ${bought ? 'border-green-500/30 opacity-70' : 'border-slate-700'}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cfg.icon}</span>
              <div>
                <div className="font-semibold text-white">{cfg.label}</div>
                <div className="text-xs text-slate-400">{cfg.desc}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-xs">
                {Object.entries(cfg.cost).map(([res, amt]) => {
                  const icon = res === 'coins' ? '🪙' : RESOURCES[res as keyof typeof RESOURCES]?.icon ?? '?'
                  return <span key={res} className="text-slate-400">{icon}{fmt(amt)}</span>
                })}
              </div>
              <button
                onClick={() => buyUpgrade(key as UpgradeKey)}
                disabled={bought}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${bought       ? 'bg-green-900/50 text-green-300 cursor-default'
                  : !canAfford   ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  :                'bg-purple-600 hover:bg-purple-500 text-white'}
                `}
              >
                {bought ? '✅ Active' : '🔬 Buy'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
