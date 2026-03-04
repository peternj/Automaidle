// ─────────────────────────────────────────────────────────────────────────────
//  GameEngine — pure functions, zero side effects
//  update(state) → { nextState, productionRates }
// ─────────────────────────────────────────────────────────────────────────────

import {
  RESOURCES, BUILDINGS, MARKET, UPGRADES,
  RESOURCE_KEYS, BUILDING_KEYS,
  CHART_HISTORY, MARKET_HISTORY,
} from './config'
import type { GameState, Resources, ResourceKey } from './types'

// ── Initial state factory ────────────────────────────────────────────────────

export function createInitialState(): GameState {
  const marketPrices = {} as GameState['marketPrices']
  const priceHistory = {} as GameState['priceHistory']

  RESOURCE_KEYS.forEach(r => {
    marketPrices[r] = MARKET[r].basePrice
    priceHistory[r] = [MARKET[r].basePrice]
  })

  return {
    tick: 0,
    resources: {
      ironOre: 10, copperOre: 5, coal: 15,
      ironPlate: 0, copperWire: 0, gear: 0, circuit: 0,
    },
    coins: 100,
    buildings: {
      automatedMiner: 0, copperMiner: 0, coalMine: 0,
      ironSmelter: 0, copperSmelter: 0,
      gearFactory: 0, circuitFactory: 0,
    },
    upgrades: {
      betterPickaxe: false, efficientFurnace: false,
      bulkSale: false, overclock: false,
    },
    stats: { totalProduced: {}, totalSold: {}, coinsEarned: 0, manualClicks: 0 },
    marketPrices,
    priceHistory,
    chartData: { tickLabels: [], resourceHistory: [], coinHistory: [] },
  }
}

// ── Result type ──────────────────────────────────────────────────────────────

export interface UpdateResult {
  nextState:       GameState
  productionRates: Partial<Record<ResourceKey, number>>
}

// ── Main update ──────────────────────────────────────────────────────────────

export function update(state: GameState): UpdateResult {
  // Work on a shallow copy — resources mutated in place below
  const resources = { ...state.resources }
  const stats     = {
    ...state.stats,
    totalProduced: { ...state.stats.totalProduced },
    totalSold:     { ...state.stats.totalSold },
  }

  const productionRates: Partial<Record<ResourceKey, number>> = {}
  RESOURCE_KEYS.forEach(r => { productionRates[r] = 0 })

  const speedMult  = state.upgrades.overclock        ? UPGRADES.overclock.value        : 1
  const smelterEff = state.upgrades.efficientFurnace ? UPGRADES.efficientFurnace.value : 1

  for (const bKey of BUILDING_KEYS) {
    const count = state.buildings[bKey]
    if (count === 0) continue
    const cfg = BUILDINGS[bKey]

    // Check resource availability
    let canRun = true
    for (const [res, amt] of Object.entries(cfg.consumption) as [ResourceKey, number][]) {
      const isSmelterCoal = res === 'coal' && bKey.toLowerCase().includes('smelter')
      const adjusted = isSmelterCoal ? amt * smelterEff : amt
      if ((resources[res] ?? 0) < adjusted * count) { canRun = false; break }
    }
    // Skip if all outputs are at cap — no point consuming inputs for zero production
    if (canRun) {
      const hasRoom = Object.keys(cfg.production).some(
        res => (resources[res as ResourceKey] ?? 0) < RESOURCES[res as ResourceKey].cap
      )
      if (!hasRoom) canRun = false
    }
    if (!canRun) continue

    // Consume
    for (const [res, amt] of Object.entries(cfg.consumption) as [ResourceKey, number][]) {
      const isSmelterCoal = res === 'coal' && bKey.toLowerCase().includes('smelter')
      const adjusted = isSmelterCoal ? amt * smelterEff : amt
      const total = adjusted * count
      resources[res] = Math.max(0, (resources[res] ?? 0) - total)
      productionRates[res] = (productionRates[res] ?? 0) - total
    }

    // Produce
    for (const [res, amt] of Object.entries(cfg.production) as [ResourceKey, number][]) {
      const total  = amt * count * speedMult
      const cap    = RESOURCES[res].cap
      const actual = Math.min(total, cap - (resources[res] ?? 0))
      resources[res] = Math.min(cap, (resources[res] ?? 0) + actual)
      productionRates[res] = (productionRates[res] ?? 0) + actual
      stats.totalProduced[res] = (stats.totalProduced[res] ?? 0) + actual
    }
  }

  // Market fluctuation every 5 ticks
  let marketPrices = state.marketPrices
  let priceHistory = state.priceHistory
  const tick = state.tick + 1

  if (tick % 5 === 0) {
    ;({ marketPrices, priceHistory } = fluctuateMarket(marketPrices, priceHistory))
  }

  // Collect chart data
  const chartData = collectChartData(state.chartData, tick, resources, state.coins)

  const nextState: GameState = {
    ...state,
    tick,
    resources,
    stats,
    marketPrices,
    priceHistory,
    chartData,
  }

  return { nextState, productionRates }
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
): GameState['chartData'] {
  const H = CHART_HISTORY

  const tickLabels = [...prev.tickLabels, tick]
  const resourceSnapshot: Partial<Record<ResourceKey, number>> = {}
  RESOURCE_KEYS.forEach(r => { resourceSnapshot[r] = resources[r] ?? 0 })

  const resourceHistory = [...prev.resourceHistory, resourceSnapshot]
  const coinHistory     = [...prev.coinHistory, coins]

  return {
    tickLabels:      tickLabels.length > H      ? tickLabels.slice(-H)      : tickLabels,
    resourceHistory: resourceHistory.length > H ? resourceHistory.slice(-H) : resourceHistory,
    coinHistory:     coinHistory.length > H     ? coinHistory.slice(-H)     : coinHistory,
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
  const mult   = state.upgrades.bulkSale ? UPGRADES.bulkSale.value : 1
  const toSell = Math.min(amount * mult, state.resources[resource] ?? 0)
  if (toSell <= 0) return { sold: 0, earned: 0, ok: false }
  const earned = Math.round(toSell * state.marketPrices[resource])
  return { sold: toSell, earned, ok: true }
}

// ── Buy building cost helper ──────────────────────────────────────────────────

export interface AffordResult {
  cost:      Record<string, number>
  canAfford: boolean
}

export function computeBuildingCost(state: GameState, key: string): AffordResult {
  const cfg     = BUILDINGS[key as keyof typeof BUILDINGS]
  if (!cfg) return { cost: {}, canAfford: false }
  const current = state.buildings[key as keyof typeof state.buildings] ?? 0
  const mult    = Math.pow(cfg.costMultiplier, current)
  const cost: Record<string, number> = {}
  let canAfford = true

  for (const [res, amt] of Object.entries(cfg.baseCost)) {
    const actual = Math.ceil(amt * mult)
    cost[res] = actual
    if (res === 'coins') { if (state.coins < actual) canAfford = false }
    else { if ((state.resources[res as ResourceKey] ?? 0) < actual) canAfford = false }
  }
  return { cost, canAfford }
}
