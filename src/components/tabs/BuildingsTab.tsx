import { useGameStore } from '../../store/gameStore'
import { BUILDINGS, BUILDING_KEYS, RESOURCES, RANK_ORDER } from '../../engine/config'
import { computeBuildingCost } from '../../engine/GameEngine'
import type { BuildingKey } from '../../engine/types'

function fmt(n: number): string {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

// ── SCADA Flow View (Production Manager+) ────────────────────────────────────

function ScadaFlowView() {
  const buildings       = useGameStore(s => s.buildings)
  const starvedBuildings = useGameStore(s => s.starvedBuildings)

  type NodeDef = {
    key: BuildingKey
    x: number; y: number
    color: string
    outputs: BuildingKey[]
  }

  const nodes: NodeDef[] = [
    { key: 'crystalGrower',   x: 60,  y: 80,  color: '#60a5fa', outputs: ['resistMixer', 'lithographyUnit'] },
    { key: 'gasPlant',        x: 60,  y: 220, color: '#06b6d4', outputs: ['upwSystem', 'resistMixer', 'lithographyUnit', 'assemblyUnit'] },
    { key: 'upwSystem',       x: 240, y: 220, color: '#3b82f6', outputs: ['cmpStation'] },
    { key: 'resistMixer',     x: 240, y: 80,  color: '#a78bfa', outputs: ['lithographyUnit'] },
    { key: 'lithographyUnit', x: 420, y: 80,  color: '#f97316', outputs: ['cmpStation'] },
    { key: 'cmpStation',      x: 420, y: 220, color: '#fb923c', outputs: ['assemblyUnit'] },
    { key: 'assemblyUnit',    x: 600, y: 150, color: '#22c55e', outputs: [] },
  ]

  // Edges: from center of source to center of target
  const nodeMap = Object.fromEntries(nodes.map(n => [n.key, n]))

  const edges: { x1: number; y1: number; x2: number; y2: number; color: string }[] = []
  nodes.forEach(node => {
    node.outputs.forEach(target => {
      const t = nodeMap[target]
      if (t) {
        edges.push({
          x1: node.x + 36, y1: node.y + 24,
          x2: t.x,         y2: t.y + 24,
          color: node.color,
        })
      }
    })
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="cr-label">SCADA Process Flow — Live Status</div>

      <div
        style={{
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 12, padding: '24px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Blueprint grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        <svg width="720" height="320" style={{ display: 'block', margin: '0 auto' }}>
          {/* Pipe animations */}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(96,165,250,0.5)" />
            </marker>
          </defs>

          {/* Draw edges */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1}
              x2={e.x2} y2={e.y2}
              stroke={e.color}
              strokeWidth="1.5"
              strokeOpacity="0.35"
              strokeDasharray="6 4"
              style={{
                animation: 'pipePulse 1.2s linear infinite',
                animationDelay: `${i * 0.15}s`,
              }}
              markerEnd="url(#arrow)"
            />
          ))}

          {/* Draw nodes */}
          {nodes.map(node => {
            const count   = buildings[node.key]
            const starved = !!starvedBuildings[node.key]
            const active  = count > 0 && !starved
            const cfg     = BUILDINGS[node.key]

            const nodeColor = starved ? '#f97316' : active ? node.color : '#2f4a62'
            const glowColor = starved ? 'rgba(249,115,22,0.3)' : active ? `${node.color}44` : 'none'

            return (
              <g key={node.key} transform={`translate(${node.x}, ${node.y})`}>
                {/* Node box */}
                <rect
                  x="0" y="0" width="72" height="48"
                  rx="8" ry="8"
                  fill="var(--c-raised)"
                  stroke={nodeColor}
                  strokeWidth={active || starved ? "1.5" : "1"}
                  filter={active || starved ? `drop-shadow(0 0 6px ${glowColor})` : undefined}
                />
                {/* Icon */}
                <text x="36" y="18" textAnchor="middle" fill={nodeColor} fontSize="12" fontWeight="700">
                  {cfg.icon}
                </text>
                {/* Count */}
                <text x="36" y="32" textAnchor="middle" fill={nodeColor} fontSize="9" fontFamily="monospace" fontWeight="700">
                  ×{count}
                </text>
                {/* Status dot */}
                <circle
                  cx="64" cy="8" r="4"
                  fill={starved ? '#f97316' : active ? '#22c55e' : '#2f4a62'}
                />
                {/* Label below */}
                <text x="36" y="62" textAnchor="middle" fill="var(--c-dim)" fontSize="8" fontFamily="monospace" letterSpacing="0.05">
                  {cfg.label.split(' ').slice(-1)[0]}
                </text>
              </g>
            )
          })}

          {/* Chip output arrow */}
          <text x="684" y="158" fill="var(--c-green)" fontSize="18" fontWeight="700">→$</text>
        </svg>

        {/* Legend */}
        <div className="flex gap-6 justify-center mt-3">
          {[
            { color: 'var(--c-green)',  label: 'Active' },
            { color: 'var(--c-orange)', label: 'Starved' },
            { color: 'var(--c-dim)',    label: 'Idle' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buildings grid below */}
      <BuildingsGrid />
    </div>
  )
}

// ── Global Ops View (COO) ─────────────────────────────────────────────────────

function GlobalOpsView() {
  const stats     = useGameStore(s => s.stats)
  const tick      = useGameStore(s => s.tick)
  const chartData = useGameStore(s => s.chartData)
  const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } = require('recharts')

  const regions = [
    { name: 'Silicon Valley', role: 'R&D Hub',        status: 'NOMINAL', color: '#60a5fa' },
    { name: 'Taiwan (TSMC)',   role: 'Fab Partner',    status: 'ACTIVE',  color: '#22c55e' },
    { name: 'South Korea',     role: 'Memory Supply',  status: 'ACTIVE',  color: '#22c55e' },
    { name: 'Netherlands',     role: 'EUV Systems',    status: 'NOMINAL', color: '#a78bfa' },
    { name: 'Japan',           role: 'Chemicals',      status: tick % 50 < 5 ? 'DELAY' : 'ACTIVE', color: tick % 50 < 5 ? '#f97316' : '#22c55e' },
    { name: 'Germany',         role: 'Metrology',      status: 'NOMINAL', color: '#06b6d4' },
  ]

  const chartPoints = chartData.tickLabels.map((t, i) => ({
    tick: t,
    coins: chartData.coinHistory[i] ?? 0,
    rev: chartData.revenueHistory[i] ?? 0,
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="cr-label">Global Operations Center — COO View</div>

      {/* World map grid */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 12, padding: '20px',
        }}
      >
        <div
          className="cr-label"
          style={{ gridColumn: '1/-1', marginBottom: 4 }}
        >
          Global Supply Chain Network
        </div>
        {regions.map(r => (
          <div key={r.name} className="cr-world-region">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--c-bright)', fontWeight: 600 }}>{r.name}</span>
              <span style={{
                fontSize: 8, fontFamily: 'monospace', letterSpacing: '0.1em',
                color: r.status === 'DELAY' ? 'var(--c-orange)' : r.status === 'ACTIVE' ? 'var(--c-green)' : 'var(--c-sky)',
              }}>
                {r.status}
              </span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace' }}>{r.role}</div>
            <div className="cr-gauge-track" style={{ marginTop: 4 }}>
              <div className="cr-gauge-fill" style={{
                width: r.status === 'DELAY' ? '35%' : r.status === 'ACTIVE' ? '80%' : '65%',
                background: r.color,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Revenue',   value: `$${fmt(stats.totalRevenue)}`,  color: 'var(--c-green)'  },
          { label: 'Chips Produced',  value: fmt(stats.chipsProduced),        color: 'var(--c-sky)'    },
          { label: 'Alarms Handled',  value: fmt(stats.alarmsAcked),          color: 'var(--c-amber)'  },
          { label: 'Rank-Ups',        value: String(stats.rankUps),           color: 'var(--c-purple)' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 700, color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Financial charts */}
      {chartPoints.length > 5 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div className="cr-label mb-3">Coin Balance</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartPoints}>
                <XAxis dataKey="tick" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [fmt(v), 'Coins']} />
                <Line type="monotone" dataKey="coins" stroke="var(--c-sky)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div className="cr-label mb-3">Revenue Stream</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartPoints}>
                <XAxis dataKey="tick" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 10 }} formatter={(v: number) => [fmt(v), '$/tick']} />
                <Line type="monotone" dataKey="rev" stroke="var(--c-green)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Buildings grid */}
      <BuildingsGrid />
    </div>
  )
}

// ── Building card ─────────────────────────────────────────────────────────────

function BuildingCard({ bKey }: { bKey: BuildingKey }) {
  const state           = useGameStore(s => s)
  const buyBuilding     = useGameStore(s => s.buyBuilding)
  const starvedBuildings = useGameStore(s => s.starvedBuildings)

  const cfg     = BUILDINGS[bKey]
  const count   = state.buildings[bKey]
  const starved = !!starvedBuildings[bKey]
  const { cost, canAfford } = computeBuildingCost(state, bKey)
  const atMax   = count >= cfg.maxCount

  const status = count === 0 ? 'inactive' : starved ? 'starved' : 'active'

  return (
    <div className={`cr-station cr-station-${status}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18, color: RESOURCES[Object.keys(cfg.production)[0] as keyof typeof RESOURCES]?.color ?? 'var(--c-sky)' }}>
            {cfg.icon}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-bright)' }}>{cfg.label}</div>
            <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              {cfg.unlockAtRank.toUpperCase()} TIER
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={
            status === 'active' ? 'cr-led cr-led-green'
            : status === 'starved' ? 'cr-led cr-led-orange'
            : 'cr-led cr-led-dim'
          } />
          <span className="cr-value" style={{ fontSize: 16 }}>{count}</span>
          <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace' }}>/{cfg.maxCount}</span>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 10, color: 'var(--c-dim)', lineHeight: 1.5 }}>{cfg.desc}</div>

      {/* Production / consumption */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Produces */}
        {Object.entries(cfg.production).length > 0 && (
          <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 8, color: 'var(--c-dim)', marginBottom: 3, fontFamily: 'monospace', letterSpacing: '0.1em' }}>PRODUCES</div>
            {Object.entries(cfg.production).map(([r, v]) => (
              <div key={r} style={{ fontSize: 10, color: 'var(--c-green)', fontFamily: 'monospace' }}>
                +{v} {RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}/s
              </div>
            ))}
          </div>
        )}

        {/* Consumes */}
        {Object.entries(cfg.consumption).length > 0 && (
          <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 8, color: 'var(--c-dim)', marginBottom: 3, fontFamily: 'monospace', letterSpacing: '0.1em' }}>CONSUMES</div>
            {Object.entries(cfg.consumption).map(([r, v]) => (
              <div key={r} style={{ fontSize: 10, color: 'var(--c-orange)', fontFamily: 'monospace' }}>
                -{v} {RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}/s
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Starve warning */}
      {starved && starvedBuildings[bKey] && (
        <div style={{ fontSize: 9, color: 'var(--c-orange)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
          ▲ Starved — insufficient: {starvedBuildings[bKey]!.map(r => RESOURCES[r]?.label ?? r).join(', ')}
        </div>
      )}

      {/* Buy button + cost */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace' }}>
            COST: {Object.entries(cost).map(([r, v]) => `${v} ${r === 'coins' ? '◆' : RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}`).join(' · ')}
          </div>
        </div>
        <button
          onClick={() => buyBuilding(bKey)}
          disabled={!canAfford || atMax}
          className={`cr-btn w-full ${canAfford && !atMax ? 'cr-btn-blue' : 'cr-btn-dim'}`}
          style={{ padding: '7px 0' }}
        >
          {atMax ? 'MAX REACHED' : canAfford ? `DEPLOY #${count + 1}` : 'INSUFFICIENT RESOURCES'}
        </button>
      </div>
    </div>
  )
}

// ── Buildings Grid ─────────────────────────────────────────────────────────────

function BuildingsGrid() {
  const rankIndex = useGameStore(s => s.rankIndex)

  const availableKeys = BUILDING_KEYS.filter(k => RANK_ORDER[BUILDINGS[k].unlockAtRank] <= rankIndex)

  return (
    <div>
      <div className="cr-label mb-4">Deployed Units</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {availableKeys.map(k => <BuildingCard key={k} bKey={k} />)}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BuildingsTab({ scadaMode, globalMode }: { scadaMode?: boolean; globalMode?: boolean } = {}) {
  const rankIndex = useGameStore(s => s.rankIndex)

  if (globalMode && rankIndex >= 3) return <GlobalOpsView />
  if (scadaMode && rankIndex >= 2) return <ScadaFlowView />
  return (
    <div className="flex flex-col gap-6">
      <BuildingsGrid />
    </div>
  )
}
