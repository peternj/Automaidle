import { useState, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore'
import { RESOURCES } from '../../engine/config'
import { canRankUp, getNextRank } from '../../engine/GameEngine'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}
function fmtDec(n: number, d = 1) { return n.toFixed(d) }

function fmtDps(n: number): string {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(2)
}

// ── Circular gauge (decorative, Operator view) ────────────────────────────────

function CircularGauge({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  const pct  = Math.min(value, 100)
  const circ = 2 * Math.PI * 36   // r=36
  const dash = (pct / 100) * circ
  const gap  = circ - dash

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg viewBox="0 0 90 90" width="90" height="90">
          {/* Track */}
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="5" />
          {/* Fill */}
          <circle
            cx="45" cy="45" r="36"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${gap}`}
            transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color }}>
            {Math.round(pct)}
          </span>
          <span style={{ fontSize: 8, color: 'var(--c-dim)', letterSpacing: '0.1em' }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: 'var(--c-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

// ── Operator View ─────────────────────────────────────────────────────────────

function OperatorView() {
  const manualExtract = useGameStore(s => s.manualExtract)
  const resources     = useGameStore(s => s.resources)
  const buildings     = useGameStore(s => s.buildings)
  const tick          = useGameStore(s => s.tick)

  // Decorative gauge values with jitter
  const [pressure, setPressure] = useState(72)
  const [temp, setTemp]         = useState(58)
  const [flow, setFlow]         = useState(85)

  useEffect(() => {
    if (tick % 3 === 0) {
      setPressure(prev => Math.max(40, Math.min(95, prev + (Math.random() - 0.5) * 8)))
      setTemp(prev     => Math.max(35, Math.min(80, prev + (Math.random() - 0.5) * 6)))
      setFlow(prev     => Math.max(60, Math.min(100, prev + (Math.random() - 0.5) * 5)))
    }
  }, [tick])

  const totalBuildings = Object.values(buildings).reduce((a, b) => a + b, 0)
  const siliconPct     = Math.round((resources.silicon / RESOURCES.silicon.cap) * 100)
  const nitrogenPct    = Math.round((resources.nitrogen / RESOURCES.nitrogen.cap) * 100)

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header card */}
      <div className="cr-process-tile">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.12em', color: 'var(--c-dim)', textTransform: 'uppercase' }}>
              Unit 01 — Crystal Growth System
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-bright)', marginTop: 4 }}>
              Laser Extraction Unit
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="cr-led cr-led-green" />
            <span style={{ fontSize: 10, color: 'var(--c-green)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>ONLINE</span>
          </div>
        </div>

        {/* Status row */}
        <div className="flex gap-4 mb-6">
          {[
            { label: 'Silicon', val: `${resources.silicon}/${RESOURCES.silicon.cap}`, color: '#60a5fa' },
            { label: 'N₂ Gas',  val: `${resources.nitrogen}/${RESOURCES.nitrogen.cap}`,  color: '#06b6d4' },
            { label: 'Units Deployed', val: totalBuildings, color: 'var(--c-green)' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                flex: 1, background: 'rgba(59,130,246,0.05)',
                border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--c-dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: item.color }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* MANUAL OVERRIDE button */}
        <button
          className="cr-override-btn animate-override-glow"
          onClick={manualExtract}
        >
          <span style={{ fontSize: 20 }}>◈</span>
          <span>Manual Override — Extract Silicon</span>
        </button>

        <div style={{ fontSize: 9, textAlign: 'center', marginTop: 8, color: 'var(--c-dim)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          Click to manually extract 1 silicon wafer · Automate via Crystal Grower in Buildings
        </div>
      </div>

      {/* Instrument gauges */}
      <div
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <div className="cr-label mb-5">Process Instruments</div>
        <div className="flex justify-around">
          <CircularGauge label="N₂ Pressure" value={pressure}       color="var(--c-sky)"    unit="%" />
          <CircularGauge label="Temp"         value={temp}           color="var(--c-orange)" unit="°C" />
          <CircularGauge label="Flow Rate"    value={flow}           color="var(--c-green)"  unit="%" />
          <CircularGauge label="Silicon Fill" value={siliconPct}    color="#60a5fa"         unit="%" />
          <CircularGauge label="N₂ Fill"      value={nitrogenPct}   color="#06b6d4"         unit="%" />
        </div>
      </div>

      {/* Quick tips */}
      <div
        style={{
          background: 'rgba(59,130,246,0.04)', border: '1px solid var(--c-border)',
          borderRadius: 10, padding: '14px 18px',
        }}
      >
        <div className="cr-label mb-2">Operator Notes</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-dim)', lineHeight: 1.8 }}>
          › Build Crystal Growers and N₂ Gas Plants in the <strong style={{ color: 'var(--c-text)' }}>Buildings</strong> tab to automate production<br />
          › Sell resources in the <strong style={{ color: 'var(--c-text)' }}>Market</strong> panel (right sidebar) to earn coins<br />
          › Earn $1,000 total revenue to unlock <strong style={{ color: 'var(--c-sky)' }}>Department Manager</strong> rank<br />
          › Monitor alarms in the right panel — critical alarms require immediate attention
        </div>
      </div>
    </div>
  )
}

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label, value, sub, color, icon,
}: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <div className={`cr-kpi-tile cr-kpi-${color}`}>
      <div className="flex items-start justify-between mb-2">
        <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--c-dim)' }}>
          {label}
        </span>
        <span style={{ fontSize: 16, opacity: 0.4 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: `var(--c-${color === 'blue' ? 'sky' : color === 'orange' ? 'orange' : color === 'green' ? 'green' : color === 'purple' ? 'purple' : 'amber'})` }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: 'var(--c-dim)', marginTop: 4, fontFamily: 'monospace' }}>{sub}</div>
      )}
    </div>
  )
}

// ── Manager+ Dashboard ────────────────────────────────────────────────────────

function ManagerDashboard() {
  const state         = useGameStore(s => s)
  const dollarPerSec  = useGameStore(s => s.dollarPerSec)
  const alarms        = useGameStore(s => s.alarms)
  const tick          = useGameStore(s => s.tick)
  const chartData     = useGameStore(s => s.chartData)
  const buildings     = useGameStore(s => s.buildings)
  const stats         = useGameStore(s => s.stats)

  const unackedAlarms = alarms.filter(a => !a.acked).length
  const totalBuildings = Object.values(buildings).reduce((a, b) => a + b, 0)
  const uptimePct      = tick > 0 ? Math.min(100, 98 + Math.sin(tick * 0.1) * 1.5).toFixed(1) : '0.0'

  const nextRank = getNextRank(state)
  const rankPct  = nextRank
    ? Math.min(100, (state.stats.totalRevenue / nextRank.threshold) * 100)
    : 100

  // Build chart data
  const chartPoints = chartData.tickLabels.map((t, i) => ({
    tick: t,
    coins: chartData.coinHistory[i] ?? 0,
    revenue: chartData.revenueHistory[i] ?? 0,
  }))

  void fmtDec

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiTile label="Revenue / sec" value={`$${fmtDps(dollarPerSec)}`} sub="5-tick avg" color="green" icon="◆" />
        <KpiTile label="Coin Balance"  value={`${fmt(state.coins)}`}       sub="available" color="blue"  icon="◈" />
        <KpiTile label="Active Alarms" value={`${unackedAlarms}`}           sub={unackedAlarms > 0 ? 'requires attention' : 'all clear'} color={unackedAlarms > 0 ? 'orange' : 'green'} icon="⚠" />
        <KpiTile label="Uptime"        value={`${uptimePct}%`}             sub={`T${fmt(tick)}`}  color="purple" icon="⬡" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <KpiTile label="Total Revenue" value={`$${fmt(stats.totalRevenue)}`} sub="all-time earnings"    color="green"  icon="◆" />
        <KpiTile label="Chips Made"    value={`${fmt(stats.chipsProduced)}`} sub="finished microchips" color="blue"   icon="⬡" />
        <KpiTile label="Buildings"     value={`${totalBuildings}`}            sub="deployed units"      color="purple" icon="◈" />
      </div>

      {/* Rank progress */}
      {nextRank && (
        <div
          style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 10, padding: '16px 20px',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="cr-label" style={{ flex: 'unset' }}>Corporate Ladder Progress</div>
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--c-dim)', letterSpacing: '0.08em' }}>
              ${fmt(state.stats.totalRevenue)} / ${fmt(nextRank.threshold)} → {nextRank.label}
            </span>
          </div>
          <div className="cr-gauge-track" style={{ height: 6 }}>
            <div
              className="cr-gauge-fill"
              style={{
                width: `${rankPct}%`,
                background: rankPct >= 100
                  ? 'var(--c-amber)'
                  : 'linear-gradient(90deg, var(--c-blue), var(--c-sky))',
                boxShadow: rankPct >= 100 ? '0 0 12px rgba(245,158,11,0.5)' : undefined,
              }}
            />
          </div>
          {canRankUp(state) && (
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--c-amber)', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              ▲ Rank-up available — click RANK UP in the header
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {chartPoints.length > 5 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Coin history */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div className="cr-label mb-3">Coin Balance History</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartPoints}>
                <XAxis dataKey="tick" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 10 }}
                  labelFormatter={v => `T${v}`}
                  formatter={(v: number) => [fmt(v), 'Coins']}
                />
                <Line type="monotone" dataKey="coins" stroke="var(--c-sky)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue history */}
          <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div className="cr-label mb-3">Revenue per Tick</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartPoints}>
                <XAxis dataKey="tick" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 10 }}
                  labelFormatter={v => `T${v}`}
                  formatter={(v: number) => [fmt(v), '$/tick']}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--c-green)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DashboardTab({ forceOperator }: { forceOperator?: boolean } = {}) {
  const rankIndex = useGameStore(s => s.rankIndex)

  if (forceOperator || rankIndex === 0) return <OperatorView />
  return <ManagerDashboard />
}
