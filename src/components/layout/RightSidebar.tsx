import { useGameStore } from '../../store/gameStore'
import { RESOURCES, MARKET, RESOURCE_KEYS } from '../../engine/config'
import type { Alarm, ResourceKey } from '../../engine/types'

function fmt(n: number) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}
void fmt

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 }

function AlarmRow({ alarm }: { alarm: Alarm }) {
  const ackAlarm = useGameStore(s => s.ackAlarm)

  const cls =
    alarm.severity === 'critical' ? 'cr-alarm-critical'
    : alarm.severity === 'warning'  ? 'cr-alarm-warning'
    : 'cr-alarm-info'

  const icon =
    alarm.severity === 'critical' ? '⚠'
    : alarm.severity === 'warning'  ? '▲'
    : '●'

  return (
    <div className={`cr-alarm-row ${cls}`}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 10, lineHeight: 1.4, wordBreak: 'break-word' }}>
          {alarm.message}
        </div>
        <div style={{ fontSize: 8, opacity: 0.5, marginTop: 2, letterSpacing: '0.06em' }}>
          T{String(alarm.timestamp).padStart(5, '0')}
        </div>
      </div>
      <button
        onClick={() => ackAlarm(alarm.id)}
        style={{
          fontSize: 9,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '2px 6px',
          borderRadius: 3,
          border: '1px solid currentColor',
          background: 'transparent',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.7' }}
      >
        ACK
      </button>
    </div>
  )
}

function MarketRow({ res }: { res: ResourceKey }) {
  const marketPrices = useGameStore(s => s.marketPrices)
  const priceHistory = useGameStore(s => s.priceHistory)
  const upgrades     = useGameStore(s => s.upgrades)
  const rdNodes      = useGameStore(s => s.rdNodes)
  const sell         = useGameStore(s => s.sell)

  const cfg   = RESOURCES[res]
  const price = marketPrices[res] ?? MARKET[res].basePrice
  const hist  = priceHistory[res]
  const trend = hist && hist.length >= 2 ? hist[hist.length - 1] - hist[hist.length - 2] : 0

  const trendIcon  = trend > 2 ? '▲▲' : trend > 0 ? '▲' : trend < -2 ? '▼▼' : trend < 0 ? '▼' : '●'
  const trendColor = trend > 0 ? 'var(--c-green)' : trend < 0 ? 'var(--c-red)' : 'var(--c-dim)'

  let sellMult = upgrades.bulkShipment ? 5 : 1
  if (rdNodes.bulkSell) sellMult = Math.max(sellMult, 10)

  return (
    <div className="cr-ticker-row">
      <div className="flex items-center gap-1.5 min-w-0">
        <span style={{ fontSize: 11, color: cfg.color }}>{cfg.icon}</span>
        <div className="min-w-0">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.1em', color: 'var(--c-dim)', textTransform: 'uppercase' }}>
            {cfg.label}
          </div>
          <div className="flex items-center gap-1">
            <span className="cr-value" style={{ fontSize: 11, color: 'var(--c-sky)' }}>{price}</span>
            <span style={{ fontSize: 7, color: 'var(--c-dim)' }}>◆</span>
            <span style={{ fontSize: 9, color: trendColor, fontFamily: "'JetBrains Mono', monospace" }}>{trendIcon}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => sell(res, 10)}
        className="cr-btn cr-btn-green shrink-0"
        style={{ fontSize: 9, padding: '2px 6px' }}
        title={`Sell ${10 * sellMult} units`}
      >
        ×{10 * sellMult}
      </button>
    </div>
  )
}

export function RightSidebar() {
  const alarms    = useGameStore(s => s.alarms)
  const logBuffer = useGameStore(s => s.logBuffer)
  const ackAll    = useGameStore(s => s.ackAllAlarms)

  const unacked = alarms.filter(a => !a.acked).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  return (
    <aside
      className="flex flex-col overflow-hidden"
      style={{
        width: 268,
        background: 'var(--c-panel)',
        borderLeft: '1px solid var(--c-border)',
        flexShrink: 0,
      }}
    >
      {/* ── Alarm Panel ── */}
      <section
        className="flex flex-col flex-shrink-0"
        style={{ borderBottom: '1px solid var(--c-border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-border)' }}
        >
          <div className="flex items-center gap-2">
            <div className={
              unacked.some(a => a.severity === 'critical') ? 'cr-led cr-led-red'
              : unacked.length > 0 ? 'cr-led cr-led-orange'
              : 'cr-led cr-led-green'
            } />
            <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-dim)' }}>
              {unacked.length > 0 ? `Alarms (${unacked.length})` : 'All Clear'}
            </span>
          </div>
          {unacked.length > 0 && (
            <button onClick={ackAll} className="cr-btn cr-btn-dim" style={{ fontSize: 9, padding: '2px 7px' }}>
              ACK ALL
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex flex-col gap-1.5 p-3" style={{ maxHeight: 140 }}>
          {unacked.length === 0 ? (
            <div style={{ color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontStyle: 'italic', padding: '6px 4px' }}>
              — no active alarms —
            </div>
          ) : (
            unacked.map(alarm => <AlarmRow key={alarm.id} alarm={alarm} />)
          )}
        </div>
      </section>

      {/* ── Market Feed ── */}
      <section className="p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="cr-label mb-2">Market</div>
        <div className="flex flex-col gap-1">
          {RESOURCE_KEYS.map(res => <MarketRow key={res} res={res} />)}
        </div>
      </section>

      {/* ── System Log ── */}
      <section className="p-3 flex flex-col flex-1 min-h-0">
        <div className="cr-label mb-2">System Log</div>
        <div
          className="flex-1 overflow-y-auto flex flex-col gap-0"
          style={{
            background: 'var(--c-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 4,
            padding: '5px 7px',
          }}
        >
          {[...logBuffer].reverse().slice(0, 80).map((msg, i) => (
            <div key={i} className="cr-log-line">{msg}</div>
          ))}
          {logBuffer.length === 0 && (
            <span style={{ color: 'var(--c-dim)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontStyle: 'italic' }}>
              — awaiting events —
            </span>
          )}
        </div>
      </section>
    </aside>
  )
}
