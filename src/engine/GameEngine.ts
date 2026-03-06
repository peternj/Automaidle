// ─────────────────────────────────────────────────────────────────────────────
//  GameEngine — pure functions, zero side effects
//  update(state) → { nextState, productionRates, starvedBuildings, newAlarms }
// ─────────────────────────────────────────────────────────────────────────────

import {
  RESOURCES, BUILDINGS, MARKET, UPGRADES, RD_NODES,
  RESOURCE_KEYS, BUILDING_KEYS, RANKS,
  CHART_HISTORY, MARKET_HISTORY, REVENUE_WINDOW, RANK_ORDER,
} from './config'
import type {
  GameState, Resources, ResourceKey, BuildingKey,
  Alarm, AlarmSeverity,
} from './types'

// ── Initial state factory ────────────────────────────────────────────────────

export function createInitialState(): GameState {
  const marketPrices = {} as GameState['marketPrices']
  const priceHistory = {} as GameState['priceHistory']

  RESOURCE_KEYS.forEach(r => {
    marketPrices[r] = MARKET[r].basePrice
    priceHistory[r] = [MARKET[r].basePrice]
  })

  return {
    tick:           0,
    rank:           'operator',
    rankIndex:      0,
    resources: {
      silicon: 10, nitrogen: 15, upwWater: 0,
      photoresist: 0, etchedWafer: 0, polishedDie: 0, chip: 0,
    },
    coins:    50,
    buildings: {
      crystalGrower: 0, gasPlant: 0,
      upwSystem: 0, resistMixer: 0,
      lithographyUnit: 0, cmpStation: 0,
      assemblyUnit: 0,
    },
    upgrades: {
      betterExtraction: false, efficientPurge: false, bulkShipment: false,
      overclock: false, yieldOptimizer: false, autoAlarmHandler: false,
    },
    rdNodes: {},
    stats: {
      totalProduced: {}, totalSold: {}, coinsEarned: 0,
      manualClicks: 0, chipsProduced: 0, totalRevenue: 0,
      rankUps: 0, alarmsAcked: 0,
    },
    alarms:       [],
    marketPrices,
    priceHistory,
    chartData: { tickLabels: [], resourceHistory: [], coinHistory: [], revenueHistory: [] },
    revenuePerTick:  [],
    engineerActive:  false,
  }
}

// ── Result type ──────────────────────────────────────────────────────────────

export interface UpdateResult {
  nextState:        GameState
  productionRates:  Partial<Record<ResourceKey, number>>
  starvedBuildings: Partial<Record<BuildingKey, ResourceKey[]>>
  newAlarms:        Alarm[]
}

// ── Main update ──────────────────────────────────────────────────────────────

export function update(state: GameState): UpdateResult {
  const resources = { ...state.resources }
  const stats     = {
    ...state.stats,
    totalProduced: { ...state.stats.totalProduced },
    totalSold:     { ...state.stats.totalSold },
  }

  const productionRates: Partial<Record<ResourceKey, number>> = {}
  RESOURCE_KEYS.forEach(r => { productionRates[r] = 0 })

  const starvedBuildings: Partial<Record<BuildingKey, ResourceKey[]>> = {}

  // ── Compute effective multipliers ─────────────────────────────────────────
  const speedMult     = state.upgrades.overclock         ? UPGRADES.overclock.value         : 1
  const n2Efficiency  = state.upgrades.efficientPurge    ? UPGRADES.efficientPurge.value    : 1
  const lithoYield    = state.upgrades.yieldOptimizer    ? UPGRADES.yieldOptimizer.value    : 1

  // R&D bonuses
  const rdYieldBonus   = (state.rdNodes.betterYield1 ? RD_NODES.betterYield1.value : 0)
                       + (state.rdNodes.betterYield2  ? RD_NODES.betterYield2.value  : 0)
  const rdLithoSpeed   = state.rdNodes.fasterLitho    ? RD_NODES.fasterLitho.value    : 0
  const storageCapMult = state.rdNodes.largerStorage   ? (1 + RD_NODES.largerStorage.value) : 1

  // ── Building production loop ───────────────────────────────────────────────
  for (const bKey of BUILDING_KEYS) {
    const count = state.buildings[bKey]
    if (count === 0) continue
    const cfg = BUILDINGS[bKey]

    // Skip buildings not yet unlocked for current rank
    if (RANK_ORDER[cfg.unlockAtRank] > state.rankIndex) continue

    // Per-building speed multiplier
    const bSpeed = bKey === 'lithographyUnit'
      ? speedMult * (1 + rdLithoSpeed)
      : speedMult

    // Check resource availability
    const missing: ResourceKey[] = []
    for (const [res, amt] of Object.entries(cfg.consumption) as [ResourceKey, number][]) {
      const isN2 = res === 'nitrogen'
      const adjusted = isN2 ? amt * n2Efficiency : amt
      const cap = RESOURCES[res].cap * storageCapMult
      if ((resources[res] ?? 0) < adjusted * count) missing.push(res)
      void cap // storageCapMult affects max storage, checked elsewhere
    }
    if (missing.length > 0) {
      starvedBuildings[bKey] = missing
      continue
    }

    // Consume
    for (const [res, amt] of Object.entries(cfg.consumption) as [ResourceKey, number][]) {
      const isN2 = res === 'nitrogen'
      const adjusted = isN2 ? amt * n2Efficiency : amt
      const total = adjusted * count
      resources[res] = Math.max(0, (resources[res] ?? 0) - total)
      productionRates[res] = (productionRates[res] ?? 0) - total
    }

    // Produce
    for (const [res, amt] of Object.entries(cfg.production) as [ResourceKey, number][]) {
      const isLitho = bKey === 'lithographyUnit' && res === 'etchedWafer'
      const yieldMult = isLitho ? lithoYield * (1 + rdYieldBonus) : 1
      const total  = amt * count * bSpeed * yieldMult
      const effCap = Math.floor(RESOURCES[res].cap * storageCapMult)
      const actual = Math.min(total, effCap - (resources[res] ?? 0))
      if (actual > 0) {
        resources[res] = Math.min(effCap, (resources[res] ?? 0) + actual)
        productionRates[res] = (productionRates[res] ?? 0) + actual
        stats.totalProduced[res] = (stats.totalProduced[res] ?? 0) + actual
        if (res === 'chip') stats.chipsProduced += actual
      }
    }
  }

  // ── Market fluctuation every 5 ticks ─────────────────────────────────────
  let marketPrices = state.marketPrices
  let priceHistory = state.priceHistory
  const tick = state.tick + 1

  if (tick % 5 === 0) {
    ;({ marketPrices, priceHistory } = fluctuateMarket(marketPrices, priceHistory))
  }

  // ── Revenue tracking ──────────────────────────────────────────────────────
  // revenuePerTick is updated in sell() in the store; here we just push 0 for non-sell ticks
  const revenuePerTick = [...state.revenuePerTick, 0].slice(-REVENUE_WINDOW)

  // ── Alarm generation ──────────────────────────────────────────────────────
  const newAlarms = generateAlarms(state, resources, starvedBuildings, tick)

  // ── Auto-engineer alarm handling ──────────────────────────────────────────
  // Handled in store, not here (needs to mutate alarms array)

  // ── Chart data collection ─────────────────────────────────────────────────
  const chartData = collectChartData(state.chartData, tick, resources, state.coins, 0)

  const nextState: GameState = {
    ...state,
    tick,
    resources,
    stats,
    marketPrices,
    priceHistory,
    chartData,
    revenuePerTick,
  }

  return { nextState, productionRates, starvedBuildings, newAlarms }
}

// ── Alarm generation ─────────────────────────────────────────────────────────

function makeAlarm(
  type: string, message: string, severity: AlarmSeverity, tick: number,
): Alarm {
  return {
    id: `${type}_${tick}_${Math.random().toString(36).slice(2, 6)}`,
    type, message, severity, timestamp: tick, acked: false,
  }
}

function generateAlarms(
  state: GameState,
  resources: Resources,
  starved: Partial<Record<BuildingKey, ResourceKey[]>>,
  tick: number,
): Alarm[] {
  const alarms: Alarm[] = []
  const existingTypes = new Set(
    state.alarms.filter(a => !a.acked).map(a => a.type)
  )

  // Nitrogen critical
  if ((resources.nitrogen ?? 0) < 10 && !existingTypes.has('nitrogen_critical')) {
    alarms.push(makeAlarm('nitrogen_critical', 'N₂ pressure critical — gas supply below threshold', 'critical', tick))
  }

  // Building starved (1 alarm per building type, not duplicated)
  for (const [bKey, missing] of Object.entries(starved)) {
    const alarmType = `starved_${bKey}`
    if (!existingTypes.has(alarmType) && missing && missing.length > 0) {
      const bLabel = BUILDINGS[bKey as BuildingKey]?.label ?? bKey
      alarms.push(makeAlarm(alarmType, `${bLabel} halted — insufficient ${missing.join(', ')}`, 'warning', tick))
    }
  }

  // UPW contamination (random, 0.3% chance per tick, only if UPW system exists)
  if (
    state.buildings.upwSystem > 0 &&
    Math.random() < 0.003 &&
    !existingTypes.has('upw_contamination')
  ) {
    alarms.push(makeAlarm('upw_contamination', 'UPW loop contamination detected — resistivity drop', 'warning', tick))
  }

  // Chip cap full
  if (
    resources.chip >= RESOURCES.chip.cap * 0.95 &&
    state.buildings.assemblyUnit > 0 &&
    !existingTypes.has('chip_cap_full')
  ) {
    alarms.push(makeAlarm('chip_cap_full', 'Chip inventory near capacity — sell output', 'info', tick))
  }

  return alarms
}

// ── Market fluctuation ───────────────────────────────────────────────────────

function fluctuateMarket(
  prices: GameState['marketPrices'],
  history: GameState['priceHistory'],
): { marketPrices: GameState['marketPrices']; priceHistory: GameState['priceHistory'] } {
  const newPrices  = { ...prices }
  const newHistory = {} as GameState['priceHistory']

  for (const res of RESOURCE_KEYS) {
    const { volatility } = MARKET[res]
    const change   = (Math.random() * 2 - 1) * volatility
    const newPrice = Math.max(1, Math.round(prices[res] * (1 + change)))
    newPrices[res] = newPrice

    const hist = [...(history[res] ?? []), newPrice]
    newHistory[res] = hist.length > MARKET_HISTORY ? hist.slice(-MARKET_HISTORY) : hist
  }

  return { marketPrices: newPrices, priceHistory: newHistory }
}

// ── Chart data collection ────────────────────────────────────────────────────

function collectChartData(
  prev: GameState['chartData'],
  tick: number,
  resources: Resources,
  coins: number,
  revenueThisTick: number,
): GameState['chartData'] {
  const H = CHART_HISTORY

  const tickLabels = [...prev.tickLabels, tick]
  const resourceSnapshot: Partial<Record<ResourceKey, number>> = {}
  RESOURCE_KEYS.forEach(r => { resourceSnapshot[r] = resources[r] ?? 0 })

  const resourceHistory = [...prev.resourceHistory, resourceSnapshot]
  const coinHistory     = [...prev.coinHistory, coins]
  const revenueHistory  = [...prev.revenueHistory, revenueThisTick]

  return {
    tickLabels:      tickLabels.length > H      ? tickLabels.slice(-H)      : tickLabels,
    resourceHistory: resourceHistory.length > H ? resourceHistory.slice(-H) : resourceHistory,
    coinHistory:     coinHistory.length > H     ? coinHistory.slice(-H)     : coinHistory,
    revenueHistory:  revenueHistory.length > H  ? revenueHistory.slice(-H)  : revenueHistory,
  }
}

// ── Sell helper ──────────────────────────────────────────────────────────────

export interface SellResult {
  sold:   number
  earned: number
  ok:     boolean
}

export function computeSell(
  state: GameState,
  resource: ResourceKey,
  amount: number,
): SellResult {
  // Sell multiplier from upgrades + R&D
  let mult = state.upgrades.bulkShipment ? UPGRADES.bulkShipment.value : 1
  if (state.rdNodes.bulkSell) mult = Math.max(mult, RD_NODES.bulkSell.value)

  const toSell = Math.min(Math.floor(amount * mult), Math.floor(state.resources[resource] ?? 0))
  if (toSell <= 0) return { sold: 0, earned: 0, ok: false }
  const earned = Math.round(toSell * state.marketPrices[resource])
  return { sold: toSell, earned, ok: true }
}

// ── Building cost helper ──────────────────────────────────────────────────────

export interface AffordResult {
  cost:      Record<string, number>
  canAfford: boolean
}

export function computeBuildingCost(state: GameState, key: string): AffordResult {
  const cfg = BUILDINGS[key as BuildingKey]
  if (!cfg) return { cost: {}, canAfford: false }
  const current = state.buildings[key as BuildingKey] ?? 0
  const mult    = Math.pow(cfg.costMultiplier, current)
  const cost: Record<string, number> = {}
  let canAfford = true

  for (const [res, amt] of Object.entries(cfg.baseCost)) {
    const actual = Math.ceil((amt ?? 0) * mult)
    cost[res] = actual
    if (res === 'coins') { if (state.coins < actual) canAfford = false }
    else { if ((state.resources[res as ResourceKey] ?? 0) < actual) canAfford = false }
  }
  return { cost, canAfford }
}

// ── Rank-up eligibility ───────────────────────────────────────────────────────

export function canRankUp(state: GameState): boolean {
  const nextRankIndex = state.rankIndex + 1
  if (nextRankIndex >= RANKS.length) return false
  const nextRank = RANKS[nextRankIndex]
  return state.stats.totalRevenue >= nextRank.threshold
}

export function getNextRank(state: GameState): typeof RANKS[0] | null {
  const nextRankIndex = state.rankIndex + 1
  if (nextRankIndex >= RANKS.length) return null
  return RANKS[nextRankIndex]
}
