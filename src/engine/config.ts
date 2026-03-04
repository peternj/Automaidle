import type {
  ResourceConfig, BuildingConfig, MarketConfig, UpgradeConfig,
  ResourceKey, BuildingKey, UpgradeKey,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
//  Game Configuration — single source of truth for all balance values
// ─────────────────────────────────────────────────────────────────────────────

export const TICK_RATE_MS    = 1000
export const CHART_HISTORY   = 60    // ticks kept in chart buffers
export const MARKET_HISTORY  = 20    // price samples kept per resource
export const MAX_LOG_ENTRIES = 100
export const SAVE_KEY        = 'industrial_empire_v2'

// ── Resources ────────────────────────────────────────────────────────────────

export const RESOURCES: Record<ResourceKey, ResourceConfig> = {
  ironOre:    { label: 'Iron Ore',    icon: '🪨', color: '#64748b', cap: 500 },
  copperOre:  { label: 'Copper Ore',  icon: '🟠', color: '#c2410c', cap: 500 },
  coal:       { label: 'Coal',        icon: '⬛', color: '#94a3b8', cap: 500 },
  ironPlate:  { label: 'Iron Plate',  icon: '🔩', color: '#3b82f6', cap: 300 },
  copperWire: { label: 'Copper Wire', icon: '🔌', color: '#f97316', cap: 300 },
  gear:       { label: 'Gear',        icon: '⚙️', color: '#8b5cf6', cap: 200 },
  circuit:    { label: 'Circuit',     icon: '💡', color: '#06b6d4', cap: 100 },
}

// ── Buildings ────────────────────────────────────────────────────────────────

export const BUILDINGS: Record<BuildingKey, BuildingConfig> = {
  automatedMiner: {
    label: 'Automated Miner', icon: '⛏️',
    desc: 'Mines 2 Iron Ore per tick automatically.',
    baseCost: { coins: 50 }, costMultiplier: 1.35,
    production: { ironOre: 2 }, consumption: { coal: 0.5 },
    maxCount: 20, unlockAt: 0,
  },
  copperMiner: {
    label: 'Copper Miner', icon: '🔶',
    desc: 'Mines 2 Copper Ore per tick.',
    baseCost: { coins: 75 }, costMultiplier: 1.35,
    production: { copperOre: 2 }, consumption: { coal: 0.5 },
    maxCount: 20, unlockAt: 0,
  },
  coalMine: {
    label: 'Coal Mine', icon: '⬛',
    desc: 'Produces 3 Coal per tick. Self-sufficient.',
    baseCost: { coins: 100 }, costMultiplier: 1.4,
    production: { coal: 3 }, consumption: {},
    maxCount: 10, unlockAt: 0,
  },
  ironSmelter: {
    label: 'Iron Smelter', icon: '🔥',
    desc: 'Converts 2 Iron Ore → 1 Iron Plate per tick.',
    baseCost: { coins: 200 }, costMultiplier: 1.5,
    production: { ironPlate: 1 }, consumption: { ironOre: 2, coal: 1 },
    maxCount: 10, unlockAt: 1,
  },
  copperSmelter: {
    label: 'Copper Smelter', icon: '🔶🔥',
    desc: 'Converts 2 Copper Ore → 1 Copper Wire per tick.',
    baseCost: { coins: 200 }, costMultiplier: 1.5,
    production: { copperWire: 1 }, consumption: { copperOre: 2, coal: 1 },
    maxCount: 10, unlockAt: 1,
  },
  gearFactory: {
    label: 'Gear Factory', icon: '⚙️',
    desc: 'Makes 1 Gear from 3 Iron Plates per tick.',
    baseCost: { coins: 500, ironPlate: 20 }, costMultiplier: 1.6,
    production: { gear: 1 }, consumption: { ironPlate: 3 },
    maxCount: 8, unlockAt: 2,
  },
  circuitFactory: {
    label: 'Circuit Factory', icon: '💡',
    desc: 'Makes 1 Circuit from 2 Copper Wire + 1 Iron Plate per tick.',
    baseCost: { coins: 800, copperWire: 10, ironPlate: 10 }, costMultiplier: 1.7,
    production: { circuit: 1 }, consumption: { copperWire: 2, ironPlate: 1 },
    maxCount: 6, unlockAt: 2,
  },
}

// ── Market ───────────────────────────────────────────────────────────────────

export const MARKET: Record<ResourceKey, MarketConfig> = {
  ironOre:    { basePrice: 3,  volatility: 0.08 },
  copperOre:  { basePrice: 4,  volatility: 0.10 },
  coal:       { basePrice: 2,  volatility: 0.06 },
  ironPlate:  { basePrice: 12, volatility: 0.12 },
  copperWire: { basePrice: 15, volatility: 0.14 },
  gear:       { basePrice: 40, volatility: 0.15 },
  circuit:    { basePrice: 80, volatility: 0.18 },
}

// ── Upgrades ─────────────────────────────────────────────────────────────────

export const UPGRADES: Record<UpgradeKey, UpgradeConfig> = {
  betterPickaxe: {
    label: 'Better Pickaxe', icon: '⛏️+',
    desc: 'Doubles manual click yield.',
    cost: { coins: 150 }, effect: 'manualYield', value: 2,
  },
  efficientFurnace: {
    label: 'Efficient Furnace', icon: '🔥+',
    desc: 'Smelters use 25% less coal.',
    cost: { coins: 400 }, effect: 'smelterEfficiency', value: 0.75,
  },
  bulkSale: {
    label: 'Bulk Deal', icon: '📦',
    desc: 'Sell ×5 quantity at once.',
    cost: { coins: 600 }, effect: 'sellMultiplier', value: 5,
  },
  overclock: {
    label: 'Overclock', icon: '⚡',
    desc: 'All buildings produce 50% faster.',
    cost: { coins: 1200, circuit: 5 }, effect: 'productionSpeed', value: 1.5,
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const RESOURCE_KEYS  = Object.keys(RESOURCES)  as ResourceKey[]
export const BUILDING_KEYS  = Object.keys(BUILDINGS)  as BuildingKey[]
export const UPGRADE_KEYS   = Object.keys(UPGRADES)   as UpgradeKey[]
