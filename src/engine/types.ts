// ─────────────────────────────────────────────────────────────────────────────
//  Core domain types for Industrial Empire
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceKey =
  | 'ironOre' | 'copperOre' | 'coal'
  | 'ironPlate' | 'copperWire' | 'gear' | 'circuit'

export type BuildingKey =
  | 'automatedMiner' | 'copperMiner' | 'coalMine'
  | 'ironSmelter' | 'copperSmelter'
  | 'gearFactory' | 'circuitFactory'

export type UpgradeKey =
  | 'betterPickaxe' | 'efficientFurnace' | 'bulkSale' | 'overclock'

// ── Config shapes ────────────────────────────────────────────────────────────

export interface ResourceConfig {
  label: string
  icon: string
  color: string   // hex for charts / progress bars
  cap: number
}

export interface BuildingConfig {
  label: string
  icon: string
  desc: string
  baseCost: Partial<Record<ResourceKey | 'coins', number>>
  costMultiplier: number
  production: Partial<Record<ResourceKey, number>>
  consumption: Partial<Record<ResourceKey, number>>
  maxCount: number
  unlockAt: number   // total buildings owned before this unlocks
}

export interface MarketConfig {
  basePrice: number
  volatility: number   // fraction, e.g. 0.08 = ±8% per fluctuation
}

export interface UpgradeConfig {
  label: string
  icon: string
  desc: string
  cost: Partial<Record<ResourceKey | 'coins', number>>
  effect: 'manualYield' | 'smelterEfficiency' | 'sellMultiplier' | 'productionSpeed'
  value: number
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Resources  = Record<ResourceKey, number>
export type Buildings  = Record<BuildingKey, number>
export type Upgrades   = Record<UpgradeKey, boolean>
export type MarketPrices = Record<ResourceKey, number>
export type PriceHistory = Record<ResourceKey, number[]>

export interface GameStats {
  totalProduced: Partial<Record<ResourceKey, number>>
  totalSold:     Partial<Record<ResourceKey, number>>
  coinsEarned:   number
  manualClicks:  number
}

export interface ChartData {
  tickLabels:      number[]                            // tick number for x-axis
  resourceHistory: Partial<Record<ResourceKey, number>>[]  // snapshot per tick
  coinHistory:     number[]                            // coin balance per tick
}

export interface GameState {
  tick:         number
  resources:    Resources
  coins:        number
  buildings:    Buildings
  upgrades:     Upgrades
  stats:        GameStats
  marketPrices: MarketPrices
  priceHistory: PriceHistory
  chartData:    ChartData
}

// ── Zustand store shape ──────────────────────────────────────────────────────

export interface Notification {
  id:      string
  message: string
  type:    'success' | 'error' | 'info'
}

export interface GameStore extends GameState {
  // Derived (computed per tick, not persisted)
  productionRates: Partial<Record<ResourceKey, number>>
  logBuffer:       string[]
  notifications:   Notification[]

  // Game actions
  update:       () => void
  manualMine:   (resource: ResourceKey) => void
  buyBuilding:  (key: BuildingKey) => void
  buyUpgrade:   (key: UpgradeKey) => void
  sell:         (resource: ResourceKey, amount: number) => void

  // Persistence
  saveToCloud:    () => Promise<void>
  loadFromCloud:  () => Promise<void>
  saveLocal:      () => void
  loadLocal:      () => void
  resetGame:      () => void

  // Market
  setMarketPrice: (resource: ResourceKey, price: number) => void

  // Internal helpers
  addLog:     (msg: string) => void
  addNotif:   (msg: string, type: Notification['type']) => void
  removeNotif:(id: string) => void
}
