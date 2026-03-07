// ─────────────────────────────────────────────────────────────────────────────
//  Core domain types — Nanofab OS / Semiconductor Lithography Sim
// ─────────────────────────────────────────────────────────────────────────────

export type ResourceKey =
  | 'silicon' | 'nitrogen' | 'upwWater'
  | 'photoresist' | 'etchedWafer' | 'polishedDie' | 'chip'

export type BuildingKey =
  | 'crystalGrower' | 'gasPlant'
  | 'upwSystem' | 'resistMixer'
  | 'lithographyUnit' | 'cmpStation'
  | 'assemblyUnit'

export type UpgradeKey =
  | 'betterExtraction' | 'efficientPurge' | 'bulkShipment'
  | 'overclock' | 'yieldOptimizer' | 'autoAlarmHandler'

export type RdNodeKey =
  | 'betterYield1' | 'betterYield2'
  | 'fasterLitho' | 'largerStorage'
  | 'autoEngineer' | 'bulkSell'

export type RankKey = 'operator' | 'deptManager' | 'prodManager' | 'coo'

export type AlarmSeverity = 'critical' | 'warning' | 'info'

// ── Config shapes ────────────────────────────────────────────────────────────

export interface ResourceConfig {
  label:   string
  icon:    string
  color:   string   // hex for charts / silos
  cap:     number
  tier:    'raw' | 'intermediate' | 'product'
}

export interface BuildingConfig {
  label:          string
  icon:           string
  desc:           string
  baseCost:       Partial<Record<ResourceKey | 'coins', number>>
  costMultiplier: number
  production:     Partial<Record<ResourceKey, number>>
  consumption:    Partial<Record<ResourceKey, number>>
  maxCount:       number
  unlockAtRank:   RankKey
}

export interface MarketConfig {
  basePrice:  number
  volatility: number   // fraction, e.g. 0.08 = ±8% per fluctuation
}

export interface UpgradeConfig {
  label:  string
  icon:   string
  desc:   string
  cost:   Partial<Record<ResourceKey | 'coins', number>>
  effect: string
  value:  number
}

export interface RdNodeConfig {
  label:    string
  icon:     string
  desc:     string
  cost:     { coins: number }
  requires: RdNodeKey[]
  effect:   string
  value:    number
}

export interface RankConfig {
  key:       RankKey
  label:     string
  shortLabel: string
  threshold: number   // total coins earned to unlock (0 = start)
  color:     string
}

// ── Runtime state ────────────────────────────────────────────────────────────

export type Resources    = Record<ResourceKey, number>
export type Buildings    = Record<BuildingKey, number>
export type Upgrades     = Record<UpgradeKey, boolean>
export type RdNodes      = Partial<Record<RdNodeKey, boolean>>
export type MarketPrices = Record<ResourceKey, number>
export type PriceHistory = Record<ResourceKey, number[]>

export interface Alarm {
  id:        string
  type:      string
  message:   string
  severity:  AlarmSeverity
  timestamp: number   // tick when raised
  acked:     boolean
}

export interface GameStats {
  totalProduced:  Partial<Record<ResourceKey, number>>
  totalSold:      Partial<Record<ResourceKey, number>>
  coinsEarned:    number
  manualClicks:   number
  chipsProduced:  number
  totalRevenue:   number   // all-time coins from sales
  rankUps:        number
  alarmsAcked:    number
}

export interface ChartData {
  tickLabels:      number[]
  resourceHistory: Partial<Record<ResourceKey, number>>[]
  coinHistory:     number[]
  revenueHistory:  number[]   // coin delta per tick (for $/sec)
}

export interface GameState {
  tick:             number
  rank:             RankKey
  rankIndex:        number   // 0–3, convenience
  resources:        Resources
  coins:            number
  buildings:        Buildings
  upgrades:         Upgrades
  rdNodes:          RdNodes
  stats:            GameStats
  alarms:           Alarm[]
  marketPrices:     MarketPrices
  priceHistory:     PriceHistory
  chartData:        ChartData
  revenuePerTick:   number[]   // ring buffer, last 10 ticks
  engineerActive:   boolean    // auto-ack from autoAlarmHandler upgrade
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
  dollarPerSec:     number

  // Auto-sell configuration (persisted separately in save payload)
  autoSell: Record<ResourceKey, AutoSellConfig>

  // Game actions
  update:        () => void
  manualExtract: () => void
  buyBuilding:   (key: BuildingKey) => void
  buyUpgrade:    (key: UpgradeKey) => void
  buyRdNode:     (key: RdNodeKey) => void
  sell:          (resource: ResourceKey, amount: number) => void
  ackAlarm:      (id: string) => void
  ackAllAlarms:  () => void
  rankUp:        () => void

  // Auto-sell
  setAutoSell: (resource: ResourceKey, patch: Partial<AutoSellConfig>) => void

  // Persistence
  saveToCloud:   () => Promise<void>
  loadFromCloud: () => Promise<void>
  saveLocal:     () => void
  loadLocal:     () => void
  resetGame:     () => void

  // Market
  setMarketPrice: (resource: ResourceKey, price: number) => void

  // Internal helpers
  addLog:     (msg: string) => void
  addNotif:   (msg: string, type: Notification['type']) => void
  removeNotif:(id: string) => void
}
