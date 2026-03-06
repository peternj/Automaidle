import type { ReactNode, CSSProperties } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useGameStore } from '../../store/gameStore'
import {
  useCoinChartData,
  useProductionRatesData, useMarketChartData,
} from '../../hooks/useChartData'
import { RESOURCES, RESOURCE_KEYS, BUILDINGS, BUILDING_KEYS, MARKET } from '../../engine/config'

// ─── Formatting ──────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}
function fmtDec(n: number, d = 1) { return n.toFixed(d) }

// ─── Shared chart style ───────────────────────────────────────────────────────
const CT = {
  grid:  'rgba(0,190,230,0.06)',
  axis:  '#2a4858',
  tt: {
    contentStyle: {
      background: '#06111e',
      border: '1px solid rgba(0,190,230,0.2)',
      borderRadius: 3,
      fontSize: 10,
      fontFamily: "'JetBrains Mono', monospace",
      color: '#9ec8d8',
      padding: '6px 10px',
    },
    labelStyle: { color: '#3d6070', fontSize: 9 },
  },
  tickStyle: { fontSize: 8, fill: '#2a4858', fontFamily: "'JetBrains Mono', monospace" },
}

// ─── Mini sparkline (inline SVG) ─────────────────────────────────────────────
function Sparkline({ data, color = 'var(--c-cyan)', height = 28 }: {
  data: number[]
  color?: string
  height?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100, h = height
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="bi-sparkline" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  )
}

// ─── Tile wrapper ─────────────────────────────────────────────────────────────
function Tile({
  title, badge, accent = 'var(--c-cyan)', children, style,
}: {
  title: string
  badge?: string
  accent?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="bi-tile" style={{ '--bi-accent': accent, ...style } as CSSProperties}>
      <div className="bi-tile-header">
        <span className="bi-tile-title">{title}</span>
        {badge && <span className="bi-tile-badge">{badge}</span>}
      </div>
      <div className="bi-tile-body">{children}</div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KpiTile({
  title, value, sub, accent, trend, trendLabel, sparkData,
}: {
  title: string
  value: string
  sub: string
  accent: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  sparkData?: number[]
}) {
  const trendIcon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '●'
  const trendClass = trend === 'up' ? 'bi-kpi-trend-up' : trend === 'down' ? 'bi-kpi-trend-down' : 'bi-kpi-trend-flat'

  return (
    <Tile title={title} accent={accent}>
      <div className="bi-kpi">
        <div>
          <div className="bi-kpi-value" style={{ fontSize: 26 }}>{value}</div>
          <div className="bi-kpi-sub">{sub}</div>
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent} />}
        {trendLabel && (
          <div className={`bi-kpi-trend ${trendClass}`}>
            {trendIcon} {trendLabel}
          </div>
        )}
      </div>
    </Tile>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function DashboardTab() {
  const tick             = useGameStore(s => s.tick)
  const stats            = useGameStore(s => s.stats)
  const coins            = useGameStore(s => s.coins)
  const resources        = useGameStore(s => s.resources)
  const buildings        = useGameStore(s => s.buildings)
  const marketPrices     = useGameStore(s => s.marketPrices)
  const productionRates  = useGameStore(s => s.productionRates)
  const starvedBuildings = useGameStore(s => s.starvedBuildings)

  const coinData      = useCoinChartData()
  const ratesData     = useProductionRatesData()
  const marketData    = useMarketChartData()

  // ── Derived KPIs ──────────────────────────────────────────────────────────

  // Revenue/sec = sum of (positive production rate × current market price)
  const revPerSec = RESOURCE_KEYS.reduce((sum, key) => {
    const rate = productionRates[key] ?? 0
    return rate > 0 ? sum + rate * (marketPrices[key] ?? 0) : sum
  }, 0)

  // Yield rate = % of active buildings NOT starved
  const activeBuildings = BUILDING_KEYS.filter(k => buildings[k] > 0)
  const starvedCount    = activeBuildings.filter(k => (starvedBuildings[k]?.length ?? 0) > 0).length
  const yieldRate       = activeBuildings.length > 0
    ? ((activeBuildings.length - starvedCount) / activeBuildings.length) * 100
    : 100

  // Market health = avg (current price / base price) across all resources
  const marketHealth = RESOURCE_KEYS.reduce((sum, k) => {
    return sum + (marketPrices[k] / MARKET[k].basePrice)
  }, 0) / RESOURCE_KEYS.length * 100

  // Total items produced
  const totalProduced = Object.values(stats.totalProduced).reduce((a, b) => a + b, 0)

  // Runtime
  const mins   = Math.floor(tick / 60)
  const secs   = tick % 60
  const runtime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  // Coin sparkline
  const coinSpark = coinData.slice(-20).map(d => d.Coins)

  // Revenue trend from coin history last 10 vs previous 10
  const coinHist = coinData.map(d => d.Coins)
  const recentAvg   = coinHist.slice(-5).reduce((a, b) => a + b, 0) / 5 || 0
  const previousAvg = coinHist.slice(-10, -5).reduce((a, b) => a + b, 0) / 5 || 0
  const coinTrend   = recentAvg > previousAvg * 1.02 ? 'up' : recentAvg < previousAvg * 0.98 ? 'down' : 'flat'

  // Top 5 resources by current value (rate × price)
  const topResources = RESOURCE_KEYS
    .map(k => ({
      key: k,
      label: RESOURCES[k].label,
      icon: RESOURCES[k].icon,
      color: RESOURCES[k].color,
      val: resources[k] ?? 0,
      cap: RESOURCES[k].cap,
      rate: productionRates[k] ?? 0,
    }))
    .filter(r => r.val > 0 || r.rate !== 0)
    .sort((a, b) => b.val - a.val)


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">

      {/* ── Report header ── */}
      <div className="bi-report-header">
        <div>
          <div className="bi-report-title">Executive Dashboard</div>
          <div className="bi-report-subtitle">Industrial Empire &nbsp;·&nbsp; Tick {fmt(tick)} &nbsp;·&nbsp; Runtime {runtime}</div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Balance</div>
            <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--c-amber)', lineHeight: 1 }}>🪙 {fmt(coins)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rev/sec</div>
            <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--c-green)', lineHeight: 1 }}>+{fmt(revPerSec)}</div>
          </div>
        </div>
      </div>

      {/* ── KPI strip — 5 tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        <KpiTile
          title="Revenue / sec"
          value={`$${fmt(revPerSec)}`}
          sub="estimated from production rates"
          accent="var(--c-green)"
          trend={coinTrend}
          trendLabel={coinTrend === 'up' ? 'Growing' : coinTrend === 'down' ? 'Declining' : 'Stable'}
          sparkData={coinSpark}
        />
        <KpiTile
          title="Yield Rate"
          value={`${fmtDec(yieldRate, 1)}%`}
          sub={`${activeBuildings.length - starvedCount} / ${activeBuildings.length} lines active`}
          accent={yieldRate > 90 ? 'var(--c-green)' : yieldRate > 60 ? 'var(--c-amber)' : 'var(--c-red)'}
          trend={starvedCount === 0 ? 'up' : starvedCount < 3 ? 'flat' : 'down'}
          trendLabel={starvedCount === 0 ? 'All nominal' : `${starvedCount} starved`}
        />
        <KpiTile
          title="Coins Earned"
          value={`$${fmt(stats.coinsEarned)}`}
          sub="lifetime from sales"
          accent="var(--c-amber)"
          sparkData={coinSpark}
        />
        <KpiTile
          title="Items Produced"
          value={fmt(totalProduced)}
          sub="all resources combined"
          accent="var(--c-cyan)"
        />
        <KpiTile
          title="Market Index"
          value={`${fmtDec(marketHealth, 1)}%`}
          sub="avg price vs baseline"
          accent={marketHealth >= 100 ? 'var(--c-green)' : 'var(--c-amber)'}
          trend={marketHealth >= 105 ? 'up' : marketHealth <= 95 ? 'down' : 'flat'}
          trendLabel={`${marketHealth >= 100 ? '+' : ''}${fmtDec(marketHealth - 100, 1)}% vs base`}
        />
      </div>

      {/* ── Row 2: Coin balance (wide) + Building health ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 8, marginBottom: 8 }}>

        {/* Coin balance area chart */}
        <Tile title="Balance Over Time" badge="LAST 60 TICKS" accent="var(--c-amber)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={coinData}>
              <defs>
                <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ffaa00" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ffaa00" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CT.grid} vertical={false} />
              <XAxis dataKey="tick" tick={CT.tickStyle} stroke={CT.axis} interval="preserveStartEnd" />
              <YAxis tick={CT.tickStyle} stroke={CT.axis} width={42} tickFormatter={fmt} />
              <Tooltip {...CT.tt} formatter={(v: number) => [`$${fmt(v)}`, 'Balance']} />
              <Area
                type="monotone"
                dataKey="Coins"
                stroke="#ffaa00"
                strokeWidth={2}
                fill="url(#coinGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Tile>

        {/* Building health status */}
        <Tile title="Building Status" accent="var(--c-cyan)">
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {BUILDING_KEYS.map(key => {
              const count   = buildings[key]
              const cfg     = BUILDINGS[key]
              const isActive = count > 0
              const isStarved = isActive && (starvedBuildings[key]?.length ?? 0) > 0
              const dotColor = !isActive ? 'var(--c-dim)' : isStarved ? 'var(--c-amber)' : 'var(--c-green)'
              const dotGlow  = isActive && !isStarved
                ? '0 0 5px var(--c-green)'
                : isStarved
                ? '0 0 5px var(--c-amber)'
                : 'none'
              return (
                <div key={key} className="bi-status-row">
                  <span className="bi-status-dot" style={{ background: dotColor, boxShadow: dotGlow }} />
                  <span className="bi-status-label">{cfg.label}</span>
                  <span className="bi-status-count" style={{ color: isActive ? 'var(--c-text)' : 'var(--c-dim)' }}>
                    {count}/{cfg.maxCount}
                  </span>
                </div>
              )
            })}
          </div>
        </Tile>
      </div>

      {/* ── Row 3: Production rates + Market prices + Resource fill ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 5fr 3fr', gap: 8 }}>

        {/* Net production rates */}
        <Tile title="Net Production Rate" badge="/TICK" accent="var(--c-green)">
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={ratesData.filter(d => d.rate !== 0)} layout="vertical">
              <CartesianGrid stroke={CT.grid} horizontal={false} />
              <XAxis type="number" tick={CT.tickStyle} stroke={CT.axis} tickFormatter={v => fmtDec(v, 1)} />
              <YAxis
                dataKey="name"
                type="category"
                tick={CT.tickStyle}
                stroke={CT.axis}
                width={82}
                tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
              />
              <Tooltip
                {...CT.tt}
                formatter={(v: number) => [`${v > 0 ? '+' : ''}${fmtDec(v, 2)}/tick`, 'Rate']}
              />
              <Bar dataKey="rate" radius={2} isAnimationActive={false} maxBarSize={12}>
                {ratesData.filter(d => d.rate !== 0).map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Tile>

        {/* Market prices over time */}
        <Tile title="Market Prices" badge="LAST 20 SAMPLES" accent="var(--c-purple)">
          <ResponsiveContainer width="100%" height={175}>
            <LineChart data={marketData.points}>
              <CartesianGrid stroke={CT.grid} vertical={false} />
              <XAxis dataKey="sample" tick={CT.tickStyle} stroke={CT.axis} />
              <YAxis tick={CT.tickStyle} stroke={CT.axis} width={32} />
              <Tooltip {...CT.tt} />
              <Legend
                wrapperStyle={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: '#3d6070', paddingTop: 4 }}
                iconType="plainline"
                iconSize={12}
              />
              {marketData.datasets.map(ds => (
                <Line
                  key={ds.name}
                  type="monotone"
                  dataKey={ds.name}
                  stroke={ds.color}
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Tile>

        {/* Resource inventory levels */}
        <Tile title="Inventory Levels" accent="var(--c-cyan)">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
            {topResources.slice(0, 9).map(r => {
              const pct  = Math.min((r.val / r.cap) * 100, 100)
              const rateColor = r.rate > 0 ? 'var(--c-green)' : r.rate < 0 ? 'var(--c-red)' : 'var(--c-dim)'
              return (
                <div key={r.key} className="bi-res-row">
                  <span className="bi-res-label">{r.icon} {r.label}</span>
                  <div className="bi-res-bar-track">
                    <div
                      className="bi-res-bar-fill"
                      style={{ width: `${pct}%`, background: r.color }}
                    />
                  </div>
                  <span className="bi-res-value" style={{ color: rateColor, fontSize: 8 }}>
                    {r.rate > 0 ? '+' : ''}{fmtDec(r.rate, 1)}
                  </span>
                </div>
              )
            })}
            {topResources.length === 0 && (
              <span style={{ fontSize: 9, color: 'var(--c-dim)', fontFamily: 'JetBrains Mono', fontStyle: 'italic' }}>
                — no active resources —
              </span>
            )}
          </div>
        </Tile>
      </div>

    </div>
  )
}
