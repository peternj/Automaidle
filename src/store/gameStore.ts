import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import {
  createInitialState, update, computeSell, computeBuildingCost, canRankUp, getNextRank,
} from '../engine/GameEngine'
import {
  RESOURCES, BUILDINGS, UPGRADES, RD_NODES, RANKS,
  SAVE_KEY, MAX_LOG_ENTRIES, RANK_ORDER, REVENUE_WINDOW,
} from '../engine/config'
import { supabase } from '../lib/supabase'
import type {
  GameStore, ResourceKey, BuildingKey, UpgradeKey, RdNodeKey,
  Notification, Alarm,
} from '../engine/types'

// ─────────────────────────────────────────────────────────────────────────────
//  Zustand store — thin wrapper over pure GameEngine
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

function computeDollarPerSec(revenuePerTick: number[]): number {
  if (revenuePerTick.length === 0) return 0
  const sum = revenuePerTick.reduce((a, b) => a + b, 0)
  return sum / revenuePerTick.length   // avg per tick = avg per second (TICK_RATE_MS=1000)
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
      dollarPerSec: 0,

      // ── Core tick update ───────────────────────────────────────────────────
      update() {
        const { nextState, productionRates, starvedBuildings, newAlarms } = update(get())

        // Merge new alarms, avoiding duplicates by type for unacked alarms
        const existingUnackedTypes = new Set(
          get().alarms.filter(a => !a.acked).map(a => a.type)
        )
        const alarmsToAdd = newAlarms.filter(a => !existingUnackedTypes.has(a.type))

        // Log starved buildings (first time only)
        const prevStarved = get().starvedBuildings
        Object.entries(starvedBuildings).forEach(([key, missing]) => {
          if (missing && missing.length > 0 && !prevStarved[key as BuildingKey]) {
            const label       = BUILDINGS[key as BuildingKey]?.label ?? key
            const missingList = missing.map(r => RESOURCES[r]?.label ?? r).join(', ')
            get().addLog(`⚠ ${label} starved — missing: ${missingList}`)
          }
        })

        // Log new alarms
        alarmsToAdd.forEach(a => {
          get().addLog(`[ALARM] ${a.message}`)
          if (a.severity === 'critical') {
            get().addNotif(`⚠ ${a.message}`, 'error')
          }
        })

        // Auto-engineer: ack alarms every 10 ticks
        const tick = nextState.tick
        const engineerActive: boolean = !!(get().upgrades.autoAlarmHandler || get().rdNodes.autoEngineer)
        let alarms = [...get().alarms, ...alarmsToAdd]
        if (engineerActive && tick % 10 === 0) {
          const toAck = alarms.filter(a => !a.acked && a.severity !== 'critical').length
          alarms = alarms.map(a => a.severity !== 'critical' ? { ...a, acked: true } : a)
          if (toAck > 0) {
            get().addLog(`⚙ Engineer auto-acknowledged ${toAck} alarm(s)`)
          }
        }

        // Expire info alarms older than 30 ticks
        alarms = alarms.filter(a => !(a.severity === 'info' && (tick - a.timestamp) > 30))

        // Keep max 50 alarms total
        if (alarms.length > 50) alarms = alarms.slice(-50)

        const dollarPerSec = computeDollarPerSec(nextState.revenuePerTick)

        set(state => {
          Object.assign(state, nextState)
          state.productionRates  = productionRates
          state.starvedBuildings = starvedBuildings
          state.alarms           = alarms
          state.dollarPerSec     = dollarPerSec
          state.engineerActive   = engineerActive
        })
      },

      // ── Manual extract ─────────────────────────────────────────────────────
      manualExtract() {
        set(state => {
          const mult     = state.upgrades.betterExtraction ? UPGRADES.betterExtraction.value : 1
          const cap      = RESOURCES.silicon.cap
          const added    = Math.min(mult, cap - (state.resources.silicon ?? 0))
          state.resources.silicon = Math.min(cap, (state.resources.silicon ?? 0) + added)
          state.stats.totalProduced.silicon = (state.stats.totalProduced.silicon ?? 0) + added
          state.stats.manualClicks++
        })
      },

      // ── Buy building ───────────────────────────────────────────────────────
      buyBuilding(key: BuildingKey) {
        const cfg = BUILDINGS[key]
        if (!cfg) return

        // Check rank unlock
        if (RANK_ORDER[cfg.unlockAtRank] > get().rankIndex) {
          get().addNotif('🔒 Requires higher rank', 'error')
          return
        }

        const { cost, canAfford } = computeBuildingCost(get(), key)
        if (!canAfford) {
          get().addNotif('❌ Cannot afford', 'error')
          return
        }

        const current = get().buildings[key]
        if (current >= cfg.maxCount) {
          get().addNotif('❌ Max count reached', 'error')
          return
        }

        set(state => {
          for (const [res, amt] of Object.entries(cost)) {
            if (res === 'coins') state.coins -= amt
            else state.resources[res as ResourceKey] -= amt
          }
          state.buildings[key]++
        })

        get().addLog(`◈ Deployed ${cfg.label} #${current + 1}`)
        get().addNotif(`${cfg.icon} ${cfg.label} online`, 'success')
      },

      // ── Buy upgrade ────────────────────────────────────────────────────────
      buyUpgrade(key: UpgradeKey) {
        if (get().upgrades[key]) {
          get().addNotif('✓ Already active', 'info')
          return
        }

        const cfg = UPGRADES[key]
        let canAfford = true
        for (const [res, amt] of Object.entries(cfg.cost)) {
          if (amt === undefined) continue
          if (res === 'coins') { if (get().coins < amt) canAfford = false }
          else { if ((get().resources[res as ResourceKey] ?? 0) < amt) canAfford = false }
        }

        if (!canAfford) {
          get().addNotif('❌ Cannot afford', 'error')
          return
        }

        set(state => {
          for (const [res, amt] of Object.entries(cfg.cost)) {
            if (amt === undefined) continue
            if (res === 'coins') state.coins -= amt
            else state.resources[res as ResourceKey] -= amt
          }
          state.upgrades[key] = true
        })

        get().addLog(`⚡ Upgrade: ${cfg.label}`)
        get().addNotif(`${cfg.icon} ${cfg.label} activated`, 'success')
      },

      // ── Buy R&D node ───────────────────────────────────────────────────────
      buyRdNode(key: RdNodeKey) {
        if (get().rdNodes[key]) {
          get().addNotif('✓ Already researched', 'info')
          return
        }

        const node = RD_NODES[key]
        if (!node) return

        // Check prerequisites
        for (const req of node.requires) {
          if (!get().rdNodes[req]) {
            get().addNotif(`🔒 Requires ${RD_NODES[req]?.label ?? req}`, 'error')
            return
          }
        }

        if (get().coins < node.cost.coins) {
          get().addNotif('❌ Cannot afford', 'error')
          return
        }

        set(state => {
          state.coins -= node.cost.coins
          state.rdNodes[key] = true
        })

        get().addLog(`🔬 R&D: ${node.label} researched`)
        get().addNotif(`${node.icon} ${node.label} complete`, 'success')
      },

      // ── Sell ───────────────────────────────────────────────────────────────
      sell(resource: ResourceKey, amount: number) {
        const result = computeSell(get(), resource, amount)
        if (!result.ok) {
          get().addNotif('❌ Not enough resources', 'error')
          return
        }

        set(state => {
          state.resources[resource]          -= result.sold
          state.coins                        += result.earned
          state.stats.totalSold[resource]     = (state.stats.totalSold[resource] ?? 0) + result.sold
          state.stats.coinsEarned            += result.earned
          state.stats.totalRevenue           += result.earned
          // Push revenue to ring buffer for $/sec calculation
          const buf = [...state.revenuePerTick]
          if (buf.length > 0) buf[buf.length - 1] += result.earned
          else buf.push(result.earned)
          state.revenuePerTick = buf.slice(-REVENUE_WINDOW)
          state.dollarPerSec   = computeDollarPerSec(state.revenuePerTick)
        })

        get().addLog(`◆ Sold ${result.sold}× ${RESOURCES[resource].label} → +${fmtNum(result.earned)} coins`)
        get().addNotif(`+${fmtNum(result.earned)} coins`, 'success')
      },

      // ── Alarm ACK ─────────────────────────────────────────────────────────
      ackAlarm(id: string) {
        set(state => {
          const alarm = state.alarms.find((a: Alarm) => a.id === id)
          if (alarm) {
            alarm.acked = true
            state.stats.alarmsAcked++
          }
        })
      },

      ackAllAlarms() {
        set(state => {
          const count = state.alarms.filter((a: Alarm) => !a.acked).length
          state.alarms.forEach((a: Alarm) => { a.acked = true })
          state.stats.alarmsAcked += count
        })
        get().addLog('⚠ All alarms acknowledged')
      },

      // ── Rank up ────────────────────────────────────────────────────────────
      rankUp() {
        const state = get()
        if (!canRankUp(state)) {
          const next = getNextRank(state)
          if (next) {
            get().addNotif(`Need $${fmtNum(next.threshold)} total revenue to rank up`, 'error')
          }
          return
        }

        const nextRankIndex = state.rankIndex + 1
        const nextRank      = RANKS[nextRankIndex]

        set(s => {
          // Soft reset
          s.buildings = {
            crystalGrower: 0, gasPlant: 0,
            upwSystem: 0, resistMixer: 0,
            lithographyUnit: 0, cmpStation: 0,
            assemblyUnit: 0,
          }
          s.resources = {
            silicon: 0, nitrogen: 0, upwWater: 0,
            photoresist: 0, etchedWafer: 0, polishedDie: 0, chip: 0,
          }
          s.coins       = Math.floor(s.coins * 0.1)
          s.rank        = nextRank.key
          s.rankIndex   = nextRankIndex
          s.alarms      = []
          s.productionRates  = {}
          s.starvedBuildings = {}
          s.stats.rankUps++
          // upgrades and rdNodes persist
        })

        get().addLog(`🏆 Promoted to ${nextRank.label}! New systems unlocked.`)
        get().addNotif(`🏆 Rank Up: ${nextRank.label}`, 'success')
        get().saveLocal()
      },

      // ── Market price update ────────────────────────────────────────────────
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
          get().saveLocal()
          get().addNotif('☁ Saved to cloud', 'success')
          get().addLog('☁ Game saved to cloud.')
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

        if (error || !data) { get().loadLocal(); return }

        applyLoadedState(set, data.save_data)
        get().addLog('☁ Game loaded from cloud.')
        get().addNotif('☁ Cloud save loaded', 'success')
      },

      // ── Local save / load ──────────────────────────────────────────────────
      saveLocal() {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(buildSavePayload(get())))
        } catch { /* quota exceeded */ }
      },

      loadLocal() {
        try {
          const raw = localStorage.getItem(SAVE_KEY)
          if (!raw) return
          applyLoadedState(set, JSON.parse(raw))
          get().addLog('◆ Local save loaded.')
          get().addNotif('◆ Save loaded', 'success')
        } catch { /* corrupt save */ }
      },

      // ── Reset ──────────────────────────────────────────────────────────────
      resetGame() {
        set(() => ({
          ...createInitialState(),
          productionRates: {}, starvedBuildings: {},
          logBuffer: [], notifications: [], dollarPerSec: 0,
        }))
        localStorage.removeItem(SAVE_KEY)
        get().addLog('↺ New game started.')
        get().addNotif('↺ Game reset', 'info')
      },

      // ── Log helpers ────────────────────────────────────────────────────────
      addLog(msg: string) {
        set(state => {
          const tick = String(state.tick).padStart(5, '0')
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
        set(state => { state.notifications = state.notifications.filter((n: Notification) => n.id !== id) })
      },
    })),
    { name: 'nanofab-os' },
  ),
)

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetFn = (fn: (state: GameStore) => void) => any

function buildSavePayload(state: GameStore) {
  return {
    tick:           state.tick,
    rank:           state.rank,
    rankIndex:      state.rankIndex,
    resources:      state.resources,
    coins:          state.coins,
    buildings:      state.buildings,
    upgrades:       state.upgrades,
    rdNodes:        state.rdNodes,
    stats:          state.stats,
    alarms:         state.alarms.filter(a => !a.acked),
    marketPrices:   state.marketPrices,
    priceHistory:   state.priceHistory,
    chartData:      state.chartData,
    revenuePerTick: state.revenuePerTick,
    savedAt:        Date.now(),
  }
}

function applyLoadedState(set: SetFn, data: ReturnType<typeof buildSavePayload>) {
  const fresh = createInitialState()
  set((state: GameStore) => {
    state.tick          = data.tick          ?? fresh.tick
    state.rank          = data.rank          ?? fresh.rank
    state.rankIndex     = data.rankIndex     ?? fresh.rankIndex
    state.resources     = { ...fresh.resources,    ...data.resources }
    state.coins         = data.coins         ?? fresh.coins
    state.buildings     = { ...fresh.buildings,    ...data.buildings }
    state.upgrades      = { ...fresh.upgrades,     ...data.upgrades }
    state.rdNodes       = { ...fresh.rdNodes,       ...data.rdNodes }
    state.stats         = { ...fresh.stats,         ...data.stats }
    state.alarms        = data.alarms        ?? []
    state.marketPrices  = { ...fresh.marketPrices,  ...data.marketPrices }
    state.priceHistory  = { ...fresh.priceHistory,  ...data.priceHistory }
    state.chartData     = data.chartData     ?? fresh.chartData
    state.revenuePerTick = data.revenuePerTick ?? []
  })
}
