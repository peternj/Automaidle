import { useGameStore } from '../../store/gameStore'
import { BUILDINGS, BUILDING_KEYS, RESOURCES } from '../../engine/config'
import { computeBuildingCost } from '../../engine/GameEngine'
import type { BuildingKey } from '../../engine/types'

function fmt(n: number) { return n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString() }

export function BuildingsTab() {
  const state       = useGameStore(s => s)
  const buyBuilding = useGameStore(s => s.buyBuilding)

  const totalBuildings = Object.values(state.buildings).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {BUILDING_KEYS.map(key => {
        const cfg     = BUILDINGS[key]
        const count   = state.buildings[key] ?? 0
        const locked  = totalBuildings < cfg.unlockAt && count === 0
        const atMax   = count >= cfg.maxCount
        const isActive = count > 0

        const { cost, canAfford } = computeBuildingCost(state, key)

        const prodStr = Object.entries(cfg.production).map(([r, a]) =>
          <span key={r} className="text-green-400">+{a} {RESOURCES[r as keyof typeof RESOURCES]?.icon}</span>
        )
        const consStr = Object.entries(cfg.consumption).map(([r, a]) =>
          <span key={r} className="text-red-400">−{a} {RESOURCES[r as keyof typeof RESOURCES]?.icon}</span>
        )

        return (
          <div
            key={key}
            className={`bg-slate-800 border rounded-2xl p-4 flex flex-col gap-3 transition-all
              ${isActive ? 'border-blue-500/40 animate-pulse-glow' : 'border-slate-700'}
              ${locked ? 'opacity-40' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{cfg.icon}</span>
                <div>
                  <div className="font-semibold text-white">{cfg.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{cfg.desc}</div>
                </div>
              </div>
              <div className={`bg-slate-700 rounded-full px-3 py-1 font-mono text-sm font-bold ${isActive ? 'text-blue-300' : 'text-slate-400'}`}>
                {count}/{cfg.maxCount}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {prodStr}
              {consStr.length > 0 && <span className="text-slate-600">|</span>}
              {consStr}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(cost).map(([res, amt]) => {
                  const have = res === 'coins' ? state.coins : (state.resources[res as keyof typeof state.resources] ?? 0)
                  const icon = res === 'coins' ? '🪙' : RESOURCES[res as keyof typeof RESOURCES]?.icon ?? '?'
                  return (
                    <span key={res} className={have >= amt ? 'text-green-400' : 'text-red-400'}>
                      {icon}{fmt(amt)}
                    </span>
                  )
                })}
              </div>
              <button
                onClick={() => buyBuilding(key as BuildingKey)}
                disabled={locked || atMax || !canAfford}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${locked || atMax  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : !canAfford       ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  :                    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'}
                `}
              >
                {locked ? '🔒 Locked' : atMax ? '✅ Max' : '+ Buy'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
