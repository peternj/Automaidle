import type {
  ResourceConfig, BuildingConfig, MarketConfig, UpgradeConfig,
  RdNodeConfig, RankConfig,
  ResourceKey, BuildingKey, UpgradeKey, RdNodeKey, RankKey,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
//  Game Configuration — Nanofab OS
// ─────────────────────────────────────────────────────────────────────────────

export const TICK_RATE_MS    = 1000
export const CHART_HISTORY   = 60    // ticks kept in chart buffers
export const MARKET_HISTORY  = 20    // price samples kept per resource
export const MAX_LOG_ENTRIES = 100
export const SAVE_KEY        = 'nanofab_os_v1'
export const REVENUE_WINDOW  = 10   // ticks for $/sec smoothing

// ── Resources ────────────────────────────────────────────────────────────────

export const RESOURCES: Record<ResourceKey, ResourceConfig> = {
  silicon:      { label: 'Silicon Wafer',  icon: '◈', color: '#60a5fa', cap: 200, tier: 'raw' },
  nitrogen:     { label: 'N₂ Gas',         icon: '⬡', color: '#06b6d4', cap: 150, tier: 'raw' },
  upwWater:     { label: 'UPW Water',      icon: '◆', color: '#3b82f6', cap: 150, tier: 'raw' },
  photoresist:  { label: 'Photoresist',    icon: '◉', color: '#a78bfa', cap: 100, tier: 'intermediate' },
  etchedWafer:  { label: 'Etched Wafer',   icon: '⬡', color: '#f97316', cap: 80,  tier: 'intermediate' },
  polishedDie:  { label: 'Polished Die',   icon: '◈', color: '#fb923c', cap: 60,  tier: 'intermediate' },
  chip:         { label: 'Microchip',      icon: '⬡', color: '#22c55e', cap: 30,  tier: 'product' },
}

// ── Buildings ────────────────────────────────────────────────────────────────
// unlockAt = total buildings owned before this type becomes visible

export const BUILDINGS: Record<BuildingKey, BuildingConfig> = {
  crystalGrower: {
    label: 'Crystal Grower', icon: '◈',
    desc: 'CZ process — grows 2 silicon wafers per second.',
    baseCost: { coins: 50 }, costMultiplier: 1.35,
    production: { silicon: 2 }, consumption: {},
    maxCount: 20, unlockAtRank: 'operator',
  },
  gasPlant: {
    label: 'N₂ Gas Plant', icon: '⬡',
    desc: 'Separates 3 units of nitrogen per second via cryogenic distillation.',
    baseCost: { coins: 75 }, costMultiplier: 1.35,
    production: { nitrogen: 3 }, consumption: {},
    maxCount: 20, unlockAtRank: 'operator',
  },
  upwSystem: {
    label: 'UPW System', icon: '◆',
    desc: 'Ultra-pure water loop. Produces 2 UPW per second. Consumes 1 N₂ to purge.',
    baseCost: { coins: 200 }, costMultiplier: 1.45,
    production: { upwWater: 2 }, consumption: { nitrogen: 1 },
    maxCount: 15, unlockAtRank: 'deptManager',
  },
  resistMixer: {
    label: 'Resist Mixer', icon: '◉',
    desc: 'Blends photoresist from 1 silicon wafer + 1 N₂ per second.',
    baseCost: { coins: 350 }, costMultiplier: 1.5,
    production: { photoresist: 1 }, consumption: { silicon: 1, nitrogen: 1 },
    maxCount: 12, unlockAtRank: 'deptManager',
  },
  lithographyUnit: {
    label: 'Lithography Unit', icon: '⬡',
    desc: 'EUV scanner — exposes 1 etched wafer per second from 2 silicon + 1 resist + 1 N₂.',
    baseCost: { coins: 900 }, costMultiplier: 1.6,
    production: { etchedWafer: 1 }, consumption: { silicon: 2, photoresist: 1, nitrogen: 1 },
    maxCount: 10, unlockAtRank: 'prodManager',
  },
  cmpStation: {
    label: 'CMP Station', icon: '◈',
    desc: 'Chemical-mechanical polish — converts 1 etched wafer + 2 UPW → 1 polished die per second.',
    baseCost: { coins: 1800 }, costMultiplier: 1.65,
    production: { polishedDie: 1 }, consumption: { etchedWafer: 1, upwWater: 2 },
    maxCount: 8, unlockAtRank: 'prodManager',
  },
  assemblyUnit: {
    label: 'Assembly Unit', icon: '⬡',
    desc: 'Final packaging — converts 1 polished die + 2 N₂ → 1 finished microchip per second.',
    baseCost: { coins: 4000 }, costMultiplier: 1.7,
    production: { chip: 1 }, consumption: { polishedDie: 1, nitrogen: 2 },
    maxCount: 6, unlockAtRank: 'coo',
  },
}

// ── Market ───────────────────────────────────────────────────────────────────

export const MARKET: Record<ResourceKey, MarketConfig> = {
  silicon:     { basePrice: 5,   volatility: 0.08 },
  nitrogen:    { basePrice: 3,   volatility: 0.06 },
  upwWater:    { basePrice: 2,   volatility: 0.06 },
  photoresist: { basePrice: 20,  volatility: 0.12 },
  etchedWafer: { basePrice: 30,  volatility: 0.10 },
  polishedDie: { basePrice: 100, volatility: 0.12 },
  chip:        { basePrice: 500, volatility: 0.15 },
}

// ── Upgrades ─────────────────────────────────────────────────────────────────

export const UPGRADES: Record<UpgradeKey, UpgradeConfig> = {
  betterExtraction: {
    label: 'Advanced Extraction', icon: '◈+',
    desc: 'Double yield on manual silicon extraction.',
    cost: { coins: 150 }, effect: 'manualYield', value: 2,
  },
  efficientPurge: {
    label: 'Efficient N₂ Purge', icon: '⬡+',
    desc: 'Buildings use 25% less nitrogen.',
    cost: { coins: 400 }, effect: 'nitrogenEfficiency', value: 0.75,
  },
  bulkShipment: {
    label: 'Bulk Shipment', icon: '◆',
    desc: 'Sell ×5 quantity at once.',
    cost: { coins: 600 }, effect: 'sellMultiplier', value: 5,
  },
  overclock: {
    label: 'Overclock Grid', icon: '⚡',
    desc: 'All buildings produce 50% faster.',
    cost: { coins: 2000, chip: 5 }, effect: 'productionSpeed', value: 1.5,
  },
  yieldOptimizer: {
    label: 'Yield Optimizer', icon: '◉+',
    desc: 'Lithography Units produce 2 etched wafers per cycle.',
    cost: { coins: 5000, chip: 10 }, effect: 'lithographyYield', value: 2,
  },
  autoAlarmHandler: {
    label: 'Engineer On-Call', icon: '⚠+',
    desc: 'Automated engineer acknowledges alarms every 10 ticks.',
    cost: { coins: 10000 }, effect: 'autoAck', value: 10,
  },
}

// ── R&D Tree ─────────────────────────────────────────────────────────────────

export const RD_NODES: Record<RdNodeKey, RdNodeConfig> = {
  betterYield1: {
    label: 'Process Yield I', icon: '◉',
    desc: 'Lithography yield +25% permanently (survives rank-up).',
    cost: { coins: 500 }, requires: [], effect: 'yieldBonus', value: 0.25,
  },
  betterYield2: {
    label: 'Process Yield II', icon: '◉◉',
    desc: 'Lithography yield additional +50% permanently.',
    cost: { coins: 2000 }, requires: ['betterYield1'], effect: 'yieldBonus', value: 0.5,
  },
  fasterLitho: {
    label: 'EUV Throughput', icon: '⬡+',
    desc: 'Lithography Units run 30% faster permanently.',
    cost: { coins: 1500 }, requires: [], effect: 'lithoSpeed', value: 0.3,
  },
  largerStorage: {
    label: 'Expanded Storage', icon: '◆+',
    desc: 'All resource storage caps +50%.',
    cost: { coins: 800 }, requires: [], effect: 'storageMult', value: 0.5,
  },
  autoEngineer: {
    label: 'Resident Engineer', icon: '⚠',
    desc: 'Engineer automatically clears alarms every 10 ticks.',
    cost: { coins: 5000 }, requires: ['betterYield1'], effect: 'autoAck', value: 10,
  },
  bulkSell: {
    label: 'Enterprise Contract', icon: '◆',
    desc: 'Sell ×10 units per transaction.',
    cost: { coins: 3000 }, requires: [], effect: 'sellMult', value: 10,
  },
}

// ── Ranks ────────────────────────────────────────────────────────────────────

export const RANKS: RankConfig[] = [
  { key: 'operator',    label: 'Operator',           shortLabel: 'OPR', threshold: 0,      color: '#64748b' },
  { key: 'deptManager', label: 'Department Manager', shortLabel: 'DM',  threshold: 1000,   color: '#06b6d4' },
  { key: 'prodManager', label: 'Production Manager', shortLabel: 'PM',  threshold: 20000,  color: '#f97316' },
  { key: 'coo',         label: 'Chief Operating Officer', shortLabel: 'COO', threshold: 200000, color: '#a78bfa' },
]

export const RANK_KEYS: RankKey[] = RANKS.map(r => r.key)

// ── Helpers ──────────────────────────────────────────────────────────────────

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[]
export const BUILDING_KEYS = Object.keys(BUILDINGS) as BuildingKey[]
export const UPGRADE_KEYS  = Object.keys(UPGRADES)  as UpgradeKey[]
export const RD_NODE_KEYS  = Object.keys(RD_NODES)  as RdNodeKey[]

export const RANK_ORDER: Record<RankKey, number> = {
  operator: 0, deptManager: 1, prodManager: 2, coo: 3,
}
