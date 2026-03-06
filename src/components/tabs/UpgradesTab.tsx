import { useGameStore } from '../../store/gameStore'
import { UPGRADES, UPGRADE_KEYS, RESOURCES } from '../../engine/config'
import type { UpgradeKey } from '../../engine/types'

function fmt(n: number) { return n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.floor(n).toString() }

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: '— Tier I  ·  Early Game',
  2: '— Tier II  ·  Mid Game',
  3: '— Tier III  ·  Late Game',
}

const TIER_COLOR: Record<1 | 2 | 3, string> = {
  1: 'var(--c-cyan)',
  2: 'var(--c-green)',
  3: 'var(--c-amber)',
}

export function UpgradesTab() {
  const upgrades   = useGameStore(s => s.upgrades)
  const resources  = useGameStore(s => s.resources)
  const coins      = useGameStore(s => s.coins)
  const buyUpgrade = useGameStore(s => s.buyUpgrade)

  const tiers: (1 | 2 | 3)[] = [1, 2, 3]

  return (
    <div className="flex flex-col gap-6">
      {tiers.map(tier => {
        const tierKeys = UPGRADE_KEYS.filter(k => UPGRADES[k].tier === tier)

        return (
          <div key={tier}>
            {/* Tier header */}
            <div
              className="cr-label mb-3"
              style={{ color: TIER_COLOR[tier], fontSize: 10 }}
            >
              {TIER_LABELS[tier]}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tierKeys.map(key => {
                const cfg    = UPGRADES[key]
                const bought = upgrades[key]

                let canAfford = true
                for (const [res, amt] of Object.entries(cfg.cost)) {
                  if (res === 'coins') { if (coins < amt) canAfford = false }
                  else { if ((resources[res as keyof typeof resources] ?? 0) < amt) canAfford = false }
                }

                return (
                  <div
                    key={key}
                    className="cr-station"
                    style={{
                      opacity: bought ? 0.65 : 1,
                      borderColor: bought
                        ? 'rgba(0, 224, 120, 0.35)'
                        : canAfford
                        ? `${TIER_COLOR[tier]}55`
                        : 'var(--c-border)',
                      boxShadow: bought
                        ? '0 0 12px rgba(0, 224, 120, 0.06)'
                        : canAfford
                        ? `0 0 18px ${TIER_COLOR[tier]}18`
                        : 'none',
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: 26 }}>{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: bought ? 'var(--c-green)' : 'var(--c-bright)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {cfg.label}
                          {bought && (
                            <span style={{ fontSize: 9, color: 'var(--c-green)', letterSpacing: '0.1em' }}>
                              ✓ ACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--c-dim)', marginTop: 3 }}>
                          {cfg.desc}
                        </div>
                      </div>
                    </div>

                    {/* Cost + buy */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(cfg.cost).map(([res, amt]) => {
                          const icon   = res === 'coins' ? '🪙' : RESOURCES[res as keyof typeof RESOURCES]?.icon ?? '?'
                          const have   = res === 'coins' ? coins : (resources[res as keyof typeof resources] ?? 0)
                          const enough = bought || have >= amt
                          return (
                            <span
                              key={res}
                              className="cr-value"
                              style={{
                                fontSize: 11,
                                color: enough ? 'var(--c-green)' : 'var(--c-red)',
                              }}
                            >
                              {icon} {fmt(amt)}
                            </span>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => buyUpgrade(key as UpgradeKey)}
                        disabled={bought || !canAfford}
                        className={`cr-btn shrink-0 ${
                          bought      ? 'cr-btn-dim'
                          : canAfford ? 'cr-btn-green'
                          :             'cr-btn-dim'
                        }`}
                        style={{ cursor: bought ? 'default' : canAfford ? 'pointer' : 'not-allowed' }}
                      >
                        {bought ? '✓ ACTIVE' : '+ INSTALL'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
