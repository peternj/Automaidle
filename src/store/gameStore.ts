import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import {
  createInitialState, update, computeSell, computeBuildingCost,
} from '../engine/GameEngine'
import {
  RESOURCES, BUILDINGS, UPGRADES, SAVE_KEY, MAX_LOG_ENTRIES, RESOURCE_KEYS,
} from '../engine/config'
import { supabase } from '../lib/supabase'
import type { GameStore, ResourceKey, BuildingKey, UpgradeKey, Notification, AutoSellConfig } from '../engine/types'

// Default auto-sell config — disabled, keep 0 (sell everything)
function defaultAutoSell(): Record<ResourceKey, AutoSellConfig> {
  return Object.fromEntries(
    RESOURCE_KEYS.map(k => [k, { enabled: false, keepAmount: 0 }])
  ) as Record<ResourceKey, AutoSellConfig>
}

// ─────────────────────────────────────────────────────────────────────────────
//  Zustand store — thin wrapper over pure GameEngine
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

export const useGameStore = create<GameStore>()(
  devtools(
    immer((set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      ...createInitialState(),
      productionRates:  {},
      starvedBuildings: {},
      logBuffer: [],
      notifications: [],
      autoSell: defaultAutoSell(),

      // ── Core tick update ───────────────────────────────────────────────────
      update() {
        const { nextState, productionRates, starvedBuildings } = update(get())

        // Log once when a building first becomes starved, listing the missing resources
        const prevStarved = get().starvedBuildings
        Object.entries(starvedBuildings).forEach(([key, missing]) => {
          if (missing && missing.length > 0 && !prevStarved[key as BuildingKey]) {
            const label       = BUILDINGS[key as BuildingKey]?.label ?? key
            const missingList = missing.map(r => RESOURCES[r]?.label ?? r).join(', ')
            get().addLog(`⚠️ ${label} is starved — missing: ${missingList}`)
          }
        })

        set(state => {
          Object.assign(state, nextState)
          state.productionRates  = productionRates
          state.starvedBuildings = starvedBuildings

          // ── Auto-sell pass (runs after production) ──────────────────────
          let autoEarned = 0
          for (const res of RESOURCE_KEYS) {
            const cfg = state.autoSell[res]
            if (!cfg?.enabled) continue
            const current = state.resources[res] ?? 0
            const toSell  = Math.floor(Math.max(0, current - cfg.keepAmount))
            if (toSell <= 0) continue
            const price  = state.marketPrices[res]
            const earned = Math.round(toSell * price)
            state.resources[res]                 -= toSell
            state.coins                          += earned
            state.stats.totalSold[res]            = (state.stats.totalSold[res] ?? 0) + toSell
            state.stats.coinsEarned              += earned
            autoEarned                           += earned
          }
          // Log a single summary line per tick instead of per-resource spam
          if (autoEarned > 0) {
            const tick = String(state.tick).padStart(4, '0')
            state.logBuffer.push(`[${tick}] 🤖 Auto-sold for +${fmtNum(autoEarned)} 🪙`)
            if (state.logBuffer.length > MAX_LOG_ENTRIES * 2) {
              state.logBuffer = state.logBuffer.slice(-MAX_LOG_ENTRIES)
            }
          }
        })
      },

      // ── Manual mine ────────────────────────────────────────────────────────
      manualMine(resource: ResourceKey) {
        set(state => {
          // improvedDrill replaces betterPickaxe at a higher value; they don't stack
          const mult =
            state.upgrades.improvedDrill  ? UPGRADES.improvedDrill.value  :
            state.upgrades.betterPickaxe  ? UPGRADES.betterPickaxe.value  : 1
          const cap   = RESOURCES[resource].cap
          const added = Math.min(mult, cap - (state.resources[resource] ?? 0))
          state.resources[resource] = Math.min(cap, (state.resources[resource] ?? 0) + added)
          state.stats.totalProduced[resource] = (state.stats.totalProduced[resource] ?? 0) + added
          state.stats.manualClicks++
        })
      },

      // ── Buy building ───────────────────────────────────────────────────────
      buyBuilding(key: BuildingKey) {
        const { cost, canAfford } = computeBuildingCost(get(), key)
        if (!canAfford) {
          get().addNotif('❌ Cannot afford!', 'error')
          return
        }

        const cfg     = BUILDINGS[key]
        const current = get().buildings[key]

        if (current >= cfg.maxCount) {
          get().addNotif('❌ Max count reached!', 'error')
          return
        }

        set(state => {
          for (const [res, amt] of Object.entries(cost)) {
            if (res === 'coins') state.coins -= amt
            else state.resources[res as ResourceKey] -= amt
          }
          state.buildings[key]++
        })

        get().addLog(`🏭 Purchased ${cfg.label} #${current + 1}`)
        get().addNotif(`🏭 ${cfg.label} purchased!`, 'success')
      },

      // ── Buy upgrade ────────────────────────────────────────────────────────
      buyUpgrade(key: UpgradeKey) {
        if (get().upgrades[key]) {
          get().addNotif('✅ Already purchased!', 'info')
          return
        }

        const cfg = UPGRADES[key]
        let canAfford = true
        for (const [res, amt] of Object.entries(cfg.cost)) {
          if (res === 'coins') { if (get().coins < amt) canAfford = false }
          else { if ((get().resources[res as ResourceKey] ?? 0) < amt) canAfford = false }
        }

        if (!canAfford) {
          get().addNotif('❌ Cannot afford!', 'error')
          return
        }

        set(state => {
          for (const [res, amt] of Object.entries(cfg.cost)) {
            if (res === 'coins') state.coins -= amt
            else state.resources[res as ResourceKey] -= amt
          }
          state.upgrades[key] = true
        })

        get().addLog(`🔬 Upgraded: ${cfg.label}`)
        get().addNotif(`🔬 ${cfg.label} activated!`, 'success')
      },

      // ── Sell ───────────────────────────────────────────────────────────────
      sell(resource: ResourceKey, amount: number) {
        const result = computeSell(get(), resource, amount)
        if (!result.ok) {
          get().addNotif('❌ Not enough resources!', 'error')
          return
        }

        set(state => {
          state.resources[resource]             -= result.sold
          state.coins                           += result.earned
          state.stats.totalSold[resource]        = (state.stats.totalSold[resource] ?? 0) + result.sold
          state.stats.coinsEarned               += result.earned
        })

        get().addLog(`💰 Sold ${result.sold} ${RESOURCES[resource].label} for ${fmtNum(result.earned)} 🪙`)
        get().addNotif(`+${fmtNum(result.earned)} 🪙`, 'success')
      },

      // ── Auto-sell config ───────────────────────────────────────────────────
      setAutoSell(resource: ResourceKey, patch: Partial<AutoSellConfig>) {
        set(state => {
          state.autoSell[resource] = { ...state.autoSell[resource], ...patch }
        })
      },

      // ── Market price update (from Supabase Realtime) ───────────────────────
      setMarketPrice(resource: ResourceKey, price: number) {
        set(state => { state.marketPrices[resource] = price })
      },

      // ── Cloud save ─────────────────────────────────────────────────────────
      async saveToCloud() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { get().addNotif('Not signed in — saving locally', 'info'); get().saveLocal(); return }

        const save = buildSavePayload(get())
        const { error } = await supabase
          .from('game_saves')
          .upsert({ user_id: user.id, save_data: save, updated_at: new Date().toISOString() })

        if (error) {
          get().addNotif('❌ Cloud save failed — saved locally', 'error')
          get().saveLocal()
        } else {
          get().saveLocal()  // always keep a local backup
          get().addNotif('☁️ Saved to cloud!', 'success')
          get().addLog('☁️ Game saved to cloud.')
        }
      },

      // ── Cloud load ─────────────────────────────────────────────────────────
      async loadFromCloud() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { get().loadLocal(); return }

        const { data, error } = await supabase
          .from('game_saves')
          .select('save_data')
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          get().loadLocal()
          return
        }

        applyLoadedState(set, data.save_data)
        get().addLog('☁️ Game loaded from cloud.')
        get().addNotif('☁️ Cloud save loaded!', 'success')
      },

      // ── Local save / load ──────────────────────────────────────────────────
      saveLocal() {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(buildSavePayload(get())))
        } catch { /* quota exceeded — ignore */ }
      },

      loadLocal() {
        try {
          const raw = localStorage.getItem(SAVE_KEY)
          if (!raw) return
          applyLoadedState(set, JSON.parse(raw))
          get().addLog('💾 Local save loaded.')
          get().addNotif('💾 Save loaded!', 'success')
        } catch { /* corrupt save — ignore */ }
      },

      // ── Reset ──────────────────────────────────────────────────────────────
      resetGame() {
        set(() => ({ ...createInitialState(), productionRates: {}, logBuffer: [], notifications: [], autoSell: defaultAutoSell() }))
        localStorage.removeItem(SAVE_KEY)
        get().addLog('🔄 New game started!')
        get().addNotif('🔄 Game reset', 'info')
      },

      // ── Log helpers ────────────────────────────────────────────────────────
      addLog(msg: string) {
        set(state => {
          const tick = String(state.tick).padStart(4, '0')
          state.logBuffer.push(`[${tick}] ${msg}`)
          if (state.logBuffer.length > MAX_LOG_ENTRIES * 2) {
            state.logBuffer = state.logBuffer.slice(-MAX_LOG_ENTRIES)
          }
        })
      },

      addNotif(message: string, type: Notification['type']) {
        const id = Math.random().toString(36).slice(2)
        set(state => { state.notifications.push({ id, message, type }) })
        setTimeout(() => get().removeNotif(id), 2800)
      },

      removeNotif(id: string) {
        set(state => { state.notifications = state.notifications.filter(n => n.id !== id) })
      },
    })),
    { name: 'industrial-empire' },
  ),
)

// ── Helpers ──────────────────────────────────────────────────────────────────

type SetFn = (fn: (state: GameStore) => void) => void

function buildSavePayload(state: GameStore) {
  return {
    tick:         state.tick,
    resources:    state.resources,
    coins:        state.coins,
    buildings:    state.buildings,
    upgrades:     state.upgrades,
    stats:        state.stats,
    marketPrices: state.marketPrices,
    priceHistory: state.priceHistory,
    chartData:    state.chartData,
    autoSell:     state.autoSell,
    savedAt:      Date.now(),
  }
}

function applyLoadedState(set: SetFn, data: ReturnType<typeof buildSavePayload>) {
  const fresh         = createInitialState()
  const freshAutoSell = defaultAutoSell()
  set((state: GameStore) => {
    state.tick         = data.tick         ?? fresh.tick
    state.resources    = { ...fresh.resources,    ...data.resources }
    state.coins        = data.coins        ?? fresh.coins
    state.buildings    = { ...fresh.buildings,    ...data.buildings }
    state.upgrades     = { ...fresh.upgrades,     ...data.upgrades }
    state.stats        = { ...fresh.stats,        ...data.stats }
    state.marketPrices = { ...fresh.marketPrices, ...data.marketPrices }
    state.priceHistory = { ...fresh.priceHistory, ...data.priceHistory }
    state.chartData    = data.chartData ?? fresh.chartData
    // Merge saved auto-sell config over defaults (handles saves without autoSell)
    state.autoSell     = { ...freshAutoSell, ...(data.autoSell ?? {}) }
  })
}
