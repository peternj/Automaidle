// ─────────────────────────────────────────────────────────────────────────────
//  Core domain types for Industrial Empire
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceKey =
  | 'ironOre' | 'copperOre' | 'coal'
  | 'ironPlate' | 'copperWire' | 'gear' | 'circuit'
  // Tier 2
  | 'steel' | 'processor'
  // Tier 3
  | 'robot'

export type BuildingKey =
  | 'automatedMiner' | 'copperMiner' | 'coalMine'
  | 'ironSmelter' | 'copperSmelter'
  | 'gearFactory' | 'circuitFactory'
  // Tier 2
  | 'steelFoundry' | 'processorPlant'
  // Tier 3
  | 'roboticsLab'

export type UpgradeKey =
  // Tier 1 — early
  | 'betterPickaxe'       // +2× manual yield
  | 'efficientFurnace'    // smelters use 25% less coal
  | 'bulkSale'            // sell ×5
  | 'overclock'           // all production ×1.5
  // Tier 2 — mid
  | 'improvedDrill'       // +4× manual yield (replaces betterPickaxe)
  | 'heatRecovery'        // smelters use 50% less coal (stacks)
  | 'bulkSale2'           // sell ×25 (replaces bulkSale)
  | 'overclock2'          // all production ×2 (stacks with overclock)
  // Tier 3 — late
  | 'massProduction'      // factories produce ×2
  | 'aiOptimization'      // all buildings ×3 (prestige)

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
  effect: string    // descriptive tag; engine reads by key name
  value: number
  tier: 1 | 2 | 3
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Resources    = Record<ResourceKey, number>
export type Buildings    = Record<BuildingKey, number>
export type Upgrades     = Record<UpgradeKey, boolean>
export type MarketPrices = Record<ResourceKey, number>
export type PriceHistory = Record<ResourceKey, number[]>

export interface GameStats {
  totalProduced: Partial<Record<ResourceKey, number>>
  totalSold:     Partial<Record<ResourceKey, number>>
  coinsEarned:   number
  manualClicks:  number
}

export interface ChartData {
  tickLabels:      number[]
  resourceHistory: Partial<Record<ResourceKey, number>>[]
  coinHistory:     number[]
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

// ── Auto-sell config ─────────────────────────────────────────────────────────

export interface AutoSellConfig {
  enabled:     boolean
  keepAmount:  number   // keep at least this many units; sell the rest each tick
}

// ── Zustand store shape ──────────────────────────────────────────────────────

export interface Notification {
  id:      string
  message: string
  type:    'success' | 'error' | 'info'
}

export interface GameStore extends GameState {
  // Derived (computed per tick, not persisted)
  productionRates:  Partial<Record<ResourceKey, number>>
  starvedBuildings: Partial<Record<BuildingKey, ResourceKey[]>>
  logBuffer:        string[]
  notifications:    Notification[]

  // Auto-sell configuration (persisted separately in save payload)
  autoSell: Record<ResourceKey, AutoSellConfig>

  // Game actions
  update:       () => void
  manualMine:   (resource: ResourceKey) => void
  buyBuilding:  (key: BuildingKey) => void
  buyUpgrade:   (key: UpgradeKey) => void
  sell:         (resource: ResourceKey, amount: number) => void

  // Auto-sell
  setAutoSell: (resource: ResourceKey, patch: Partial<AutoSellConfig>) => void

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
