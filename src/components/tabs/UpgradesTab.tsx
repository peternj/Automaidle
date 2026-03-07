import { useGameStore } from '../../store/gameStore'
import { UPGRADES, UPGRADE_KEYS, RD_NODES, RD_NODE_KEYS, RESOURCES } from '../../engine/config'
import type { UpgradeKey, RdNodeKey } from '../../engine/types'

// ── Regular Upgrade Card ───────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

function UpgradeCard({ uKey }: { uKey: UpgradeKey }) {
  const state      = useGameStore(s => s)
  const buyUpgrade = useGameStore(s => s.buyUpgrade)

  const cfg       = UPGRADES[uKey]
  const purchased = state.upgrades[uKey]

  let canAfford = true
  for (const [res, amt] of Object.entries(cfg.cost)) {
    if (amt === undefined) continue
    if (res === 'coins') { if (state.coins < amt) canAfford = false }
    else { if ((state.resources[res as keyof typeof RESOURCES] ?? 0) < amt) canAfford = false }
  }

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: `1px solid ${purchased ? 'rgba(34,197,94,0.3)' : canAfford ? 'rgba(59,130,246,0.25)' : 'var(--c-border)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        opacity: purchased ? 0.7 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Purchased overlay */}
      {purchased && (
        <div style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em',
          color: 'var(--c-green)', fontWeight: 700,
        }}>
          ✓ ACTIVE
        </div>
      )}

      <div className="flex items-start gap-3">
        <span style={{ fontSize: 22, flexShrink: 0 }}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-bright)', marginBottom: 2 }}>
            {cfg.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--c-dim)', lineHeight: 1.5, marginBottom: 8 }}>
            {cfg.desc}
          </div>

          {/* Cost */}
          <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', marginBottom: 8 }}>
            COST: {Object.entries(cfg.cost)
              .filter(([, v]) => v !== undefined)
              .map(([r, v]) => `${fmt(v ?? 0)} ${r === 'coins' ? '◆ coins' : RESOURCES[r as keyof typeof RESOURCES]?.label ?? r}`)
              .join(' · ')}
          </div>

          {!purchased && (
            <button
              onClick={() => buyUpgrade(uKey)}
              disabled={!canAfford}
              className={`cr-btn ${canAfford ? 'cr-btn-orange' : 'cr-btn-dim'}`}
              style={{ width: '100%', padding: '6px 0' }}
            >
              {canAfford ? 'ACQUIRE' : 'INSUFFICIENT RESOURCES'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── R&D Node ──────────────────────────────────────────────────────────────────

function RdNodeCard({ nKey }: { nKey: RdNodeKey }) {
  const state    = useGameStore(s => s)
  const buyRdNode = useGameStore(s => s.buyRdNode)

  const node       = RD_NODES[nKey]
  const researched = !!state.rdNodes[nKey]

  const prereqsMet = node.requires.every(r => !!state.rdNodes[r])
  const canAfford  = state.coins >= node.cost.coins && prereqsMet

  const borderColor = researched
    ? 'rgba(34,197,94,0.35)'
    : !prereqsMet
    ? 'var(--c-border)'
    : canAfford
    ? 'rgba(167,139,250,0.35)'
    : 'var(--c-border)'

  return (
    <div
      style={{
        background: 'var(--c-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '14px 16px',
        opacity: !prereqsMet && !researched ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {researched && (
        <div style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.1em',
          color: 'var(--c-green)', fontWeight: 700,
        }}>
          ✓ DONE
        </div>
      )}

      <div className="flex items-start gap-3">
        <span style={{ fontSize: 22, flexShrink: 0 }}>{node.icon}</span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-bright)', marginBottom: 2 }}>
            {node.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--c-dim)', lineHeight: 1.5, marginBottom: 6 }}>
            {node.desc}
          </div>

          {/* Prerequisites */}
          {node.requires.length > 0 && (
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--c-dim)', marginBottom: 6 }}>
              REQUIRES: {node.requires.map(r => RD_NODES[r]?.label ?? r).join(', ')}
            </div>
          )}

          {/* Cost */}
          <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'monospace', marginBottom: 8 }}>
            COST: {node.cost.coins} ◆ coins
          </div>

          {!researched && (
            <button
              onClick={() => buyRdNode(nKey)}
              disabled={!canAfford}
              className={`cr-btn ${canAfford ? 'cr-btn-purple' : 'cr-btn-dim'}`}
              style={{ width: '100%', padding: '6px 0' }}
            >
              {!prereqsMet ? 'LOCKED' : canAfford ? 'RESEARCH' : 'INSUFFICIENT COINS'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function UpgradesTab() {
  return (
    <div className="flex flex-col gap-8">

      {/* Operational Upgrades */}
      <section>
        <div className="cr-label mb-4">Operational Upgrades</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {UPGRADE_KEYS.map(k => <UpgradeCard key={k} uKey={k} />)}
        </div>
      </section>

      {/* R&D Tree */}
      <section>
        <div style={{ marginBottom: 4 }}>
          <div className="cr-label">Research & Development Tree</div>
        </div>
        <div
          style={{
            fontSize: 10, color: 'var(--c-dim)', fontFamily: 'monospace',
            marginBottom: 14, lineHeight: 1.6,
          }}
        >
          R&D bonuses are <strong style={{ color: 'var(--c-purple)' }}>permanent</strong> — they survive Corporate Ladder rank-ups.
          Prerequisites must be researched first.
        </div>

        {/* Tree visualization with dependency arrows */}
        <div style={{ position: 'relative' }}>
          {/* Simple tier layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {RD_NODE_KEYS.map(k => <RdNodeCard key={k} nKey={k} />)}
          </div>
        </div>
      </section>
    </div>
  )
}
