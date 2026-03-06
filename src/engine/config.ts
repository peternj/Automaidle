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
export const SAVE_KEY        = 'industrial_empire_v3'   // bumped — new schema

// ── Resources ────────────────────────────────────────────────────────────────

export const RESOURCES: Record<ResourceKey, ResourceConfig> = {
  // ── Tier 1 ───────────────────────────────────────────────────────────────
  ironOre:    { label: 'Iron Ore',    icon: '🪨', color: '#64748b', cap: 800  },
  copperOre:  { label: 'Copper Ore',  icon: '🟠', color: '#c2410c', cap: 800  },
  coal:       { label: 'Coal',        icon: '⬛', color: '#94a3b8', cap: 800  },
  ironPlate:  { label: 'Iron Plate',  icon: '🔩', color: '#3b82f6', cap: 500  },
  copperWire: { label: 'Copper Wire', icon: '🔌', color: '#f97316', cap: 500  },
  gear:       { label: 'Gear',        icon: '⚙️', color: '#8b5cf6', cap: 400  },
  circuit:    { label: 'Circuit',     icon: '💡', color: '#06b6d4', cap: 300  },
  // ── Tier 2 ───────────────────────────────────────────────────────────────
  steel:      { label: 'Steel',       icon: '🔷', color: '#60a5fa', cap: 400  },
  processor:  { label: 'Processor',   icon: '💾', color: '#a78bfa', cap: 200  },
  // ── Tier 3 ───────────────────────────────────────────────────────────────
  robot:      { label: 'Robot Unit',  icon: '🤖', color: '#34d399', cap: 60   },
}

// ── Buildings ────────────────────────────────────────────────────────────────
// unlockAt = total buildings owned before this type becomes visible

export const BUILDINGS: Record<BuildingKey, BuildingConfig> = {

  // ── Tier 1 — Raw extraction ──────────────────────────────────────────────
  automatedMiner: {
    label: 'Automated Miner', icon: '⛏️',
    desc: 'Mines 2 Iron Ore per tick.',
    baseCost: { coins: 60 }, costMultiplier: 1.30,
    production: { ironOre: 2 }, consumption: {},
    maxCount: 30, unlockAt: 0,
  },
  copperMiner: {
    label: 'Copper Miner', icon: '🔶',
    desc: 'Mines 2 Copper Ore per tick.',
    baseCost: { coins: 80 }, costMultiplier: 1.30,
    production: { copperOre: 2 }, consumption: {},
    maxCount: 30, unlockAt: 0,
  },
  coalMine: {
    label: 'Coal Mine', icon: '⬛',
    desc: 'Produces 4 Coal per tick.',
    baseCost: { coins: 120 }, costMultiplier: 1.35,
    production: { coal: 4 }, consumption: {},
    maxCount: 15, unlockAt: 0,
  },

  // ── Tier 1 — Smelting ────────────────────────────────────────────────────
  ironSmelter: {
    label: 'Iron Smelter', icon: '🔥',
    desc: '2 Iron Ore + 1 Coal → 1 Iron Plate per tick.',
    baseCost: { coins: 250 }, costMultiplier: 1.45,
    production: { ironPlate: 1 }, consumption: { ironOre: 2, coal: 1 },
    maxCount: 15, unlockAt: 1,
  },
  copperSmelter: {
    label: 'Copper Smelter', icon: '🔶🔥',
    desc: '2 Copper Ore + 1 Coal → 1 Copper Wire per tick.',
    baseCost: { coins: 250 }, costMultiplier: 1.45,
    production: { copperWire: 1 }, consumption: { copperOre: 2, coal: 1 },
    maxCount: 15, unlockAt: 1,
  },

  // ── Tier 1 — Factories ───────────────────────────────────────────────────
  gearFactory: {
    label: 'Gear Factory', icon: '⚙️',
    desc: '3 Iron Plates → 1 Gear per tick.',
    baseCost: { coins: 800, ironPlate: 25 }, costMultiplier: 1.55,
    production: { gear: 1 }, consumption: { ironPlate: 3 },
    maxCount: 12, unlockAt: 3,
  },
  circuitFactory: {
    label: 'Circuit Factory', icon: '💡',
    desc: '2 Copper Wire + 1 Iron Plate → 1 Circuit per tick.',
    baseCost: { coins: 1500, copperWire: 15, ironPlate: 10 }, costMultiplier: 1.60,
    production: { circuit: 1 }, consumption: { copperWire: 2, ironPlate: 1 },
    maxCount: 10, unlockAt: 5,
  },

  // ── Tier 2 — Advanced processing ─────────────────────────────────────────
  steelFoundry: {
    label: 'Steel Foundry', icon: '🏭',
    desc: '3 Iron Plates + 2 Coal → 1 Steel per tick.',
    baseCost: { coins: 8000, ironPlate: 60, gear: 10 }, costMultiplier: 1.65,
    production: { steel: 1 }, consumption: { ironPlate: 3, coal: 2 },
    maxCount: 10, unlockAt: 8,
  },
  processorPlant: {
    label: 'Processor Plant', icon: '🖥️',
    desc: '1 Circuit + 1 Gear + 1 Steel → 1 Processor per tick.',
    baseCost: { coins: 30000, circuit: 20, gear: 20, steel: 15 }, costMultiplier: 1.75,
    production: { processor: 1 }, consumption: { circuit: 1, gear: 1, steel: 1 },
    maxCount: 8, unlockAt: 14,
  },

  // ── Tier 3 — Robotics ────────────────────────────────────────────────────
  roboticsLab: {
    label: 'Robotics Lab', icon: '🤖',
    desc: '2 Processors + 3 Steel → 1 Robot Unit per tick.',
    baseCost: { coins: 120000, processor: 10, steel: 50, circuit: 30 }, costMultiplier: 2.00,
    production: { robot: 1 }, consumption: { processor: 2, steel: 3 },
    maxCount: 5, unlockAt: 20,
  },
}

// ── Market ───────────────────────────────────────────────────────────────────

export const MARKET: Record<ResourceKey, MarketConfig> = {
  ironOre:    { basePrice: 3,    volatility: 0.08 },
  copperOre:  { basePrice: 4,    volatility: 0.10 },
  coal:       { basePrice: 2,    volatility: 0.06 },
  ironPlate:  { basePrice: 12,   volatility: 0.12 },
  copperWire: { basePrice: 15,   volatility: 0.14 },
  gear:       { basePrice: 45,   volatility: 0.15 },
  circuit:    { basePrice: 90,   volatility: 0.18 },
  steel:      { basePrice: 60,   volatility: 0.13 },
  processor:  { basePrice: 300,  volatility: 0.22 },
  robot:      { basePrice: 1000, volatility: 0.28 },
}

// ── Upgrades ─────────────────────────────────────────────────────────────────

export const UPGRADES: Record<UpgradeKey, UpgradeConfig> = {

  // ── Tier 1 (0–10 min) ────────────────────────────────────────────────────
  betterPickaxe: {
    label: 'Better Pickaxe', icon: '⛏️+',
    desc: 'Manual mining yields ×2 per click.',
    cost: { coins: 200 },
    effect: 'manualYield', value: 2, tier: 1,
  },
  efficientFurnace: {
    label: 'Efficient Furnace', icon: '🔥+',
    desc: 'Smelters consume 25% less coal.',
    cost: { coins: 500 },
    effect: 'smelterEfficiency', value: 0.75, tier: 1,
  },
  bulkSale: {
    label: 'Bulk Deal', icon: '📦',
    desc: 'Sell ×5 quantity per click.',
    cost: { coins: 800 },
    effect: 'sellMultiplier', value: 5, tier: 1,
  },
  overclock: {
    label: 'Overclock I', icon: '⚡',
    desc: 'All buildings produce ×1.5 per tick.',
    cost: { coins: 2000, circuit: 5 },
    effect: 'productionSpeed', value: 1.5, tier: 1,
  },

  // ── Tier 2 (10–35 min) ───────────────────────────────────────────────────
  improvedDrill: {
    label: 'Improved Drill', icon: '⛏️⚡',
    desc: 'Manual mining yields ×4 per click (replaces Pickaxe).',
    cost: { coins: 4000, gear: 20 },
    effect: 'manualYield', value: 4, tier: 2,
  },
  heatRecovery: {
    label: 'Heat Recovery', icon: '♻️🔥',
    desc: 'Smelters use 50% less coal (stacks with Efficient Furnace → 62% total).',
    cost: { coins: 8000, gear: 30 },
    effect: 'smelterEfficiency', value: 0.50, tier: 2,
  },
  bulkSale2: {
    label: 'Trade Route', icon: '📦📦',
    desc: 'Sell ×25 quantity per click (replaces Bulk Deal).',
    cost: { coins: 12000, circuit: 10 },
    effect: 'sellMultiplier', value: 25, tier: 2,
  },
  overclock2: {
    label: 'Overclock II', icon: '⚡⚡',
    desc: 'All buildings produce ×2 per tick (stacks with Overclock I → ×3 total).',
    cost: { coins: 25000, circuit: 20, gear: 10 },
    effect: 'productionSpeed', value: 2.0, tier: 2,
  },

  // ── Tier 3 (35+ min) ─────────────────────────────────────────────────────
  massProduction: {
    label: 'Mass Production', icon: '🏭⚡',
    desc: 'Gear, Circuit, Steel, Processor & Robotics factories produce ×2.',
    cost: { coins: 80000, processor: 5, steel: 20 },
    effect: 'factoryBoost', value: 2.0, tier: 3,
  },
  aiOptimization: {
    label: 'AI Optimization', icon: '🤖⚡',
    desc: 'Every building produces ×3 additional output. Prestige upgrade.',
    cost: { coins: 500000, robot: 10, processor: 20 },
    effect: 'globalBoost', value: 3.0, tier: 3,
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const RESOURCE_KEYS  = Object.keys(RESOURCES)  as ResourceKey[]
export const BUILDING_KEYS  = Object.keys(BUILDINGS)  as BuildingKey[]
export const UPGRADE_KEYS   = Object.keys(UPGRADES)   as UpgradeKey[]

// Factory buildings that benefit from the massProduction upgrade
export const FACTORY_BUILDING_KEYS: BuildingKey[] = [
  'gearFactory', 'circuitFactory', 'steelFoundry', 'processorPlant', 'roboticsLab',
]
