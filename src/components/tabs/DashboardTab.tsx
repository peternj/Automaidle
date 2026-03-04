import type { ReactNode } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useGameStore } from '../../store/gameStore'
import {
  useResourceChartData, useCoinChartData,
  useProductionRatesData, useMarketChartData,
} from '../../hooks/useChartData'

// ─── Shared chart theme (control-room dark) ────────────────────────────────
const CHART_THEME = {
  grid: 'rgba(0, 190, 230, 0.08)',
  axis: '#3d6070',
  tooltip: {
    contentStyle: {
      background: '#080f1a',
      border: '1px solid rgba(0, 190, 230, 0.25)',
      borderRadius: 4,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      color: '#9ec8d8',
    },
    labelStyle: { color: '#3d6070', fontSize: 10 },
    itemStyle: { color: '#00c8e8' },
  },
}

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

// ─── Instrument card ────────────────────────────────────────────────────────
function Instrument({
  label, value, sub, variant,
}: {
  label: string
  value: string
  sub: string
  variant: 'blue' | 'green' | 'gold' | 'purple'
}) {
  return (
    <div className={`cr-instrument cr-instrument-${variant}`}>
      <div className="cr-label mb-2">{label}</div>
      <div
        className="cr-value"
        style={{
          fontSize: 28,
          lineHeight: 1,
          color:
            variant === 'green'  ? 'var(--c-green)'
            : variant === 'gold' ? 'var(--c-amber)'
            : variant === 'purple' ? 'var(--c-purple)'
            : 'var(--c-cyan)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--c-dim)', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
        {sub}
      </div>
    </div>
  )
}

// ─── Chart panel wrapper ────────────────────────────────────────────────────
function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="cr-panel"
      style={{ borderRadius: 8, padding: '14px 16px' }}
    >
      <div className="cr-label mb-3">{title}</div>
      {children}
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export function DashboardTab() {
  const tick  = useGameStore(s => s.tick)
  const stats = useGameStore(s => s.stats)

  const resourceData = useResourceChartData()
  const coinData     = useCoinChartData()
  const ratesData    = useProductionRatesData()
  const marketData   = useMarketChartData()

  const totalProduced = Object.values(stats.totalProduced).reduce((a, b) => a + b, 0)
  const mins   = Math.floor(tick / 60)
  const secs   = tick % 60
  const runTxt = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  const axisStyle = { fontSize: 9, fill: CHART_THEME.axis, fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI Instruments ── */}
      <div className="grid grid-cols-4 gap-4">
        <Instrument
          variant="blue"
          label="⏱ Total Ticks"
          value={fmt(tick)}
          sub={`Runtime: ${runTxt}`}
        />
        <Instrument
          variant="green"
          label="📦 Items Produced"
          value={fmt(totalProduced)}
          sub="All resources combined"
        />
        <Instrument
          variant="gold"
          label="🪙 Coins Earned"
          value={fmt(stats.coinsEarned)}
          sub="Lifetime from sales"
        />
        <Instrument
          variant="purple"
          label="⛏ Manual Mines"
          value={fmt(stats.manualClicks)}
          sub="Total click extractions"
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-2 gap-4">

        <ChartPanel title="📦 Resource Inventory — last 60s">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={resourceData.points}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="tick" tick={axisStyle} stroke={CHART_THEME.axis} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} stroke={CHART_THEME.axis} width={38} />
              <Tooltip {...CHART_THEME.tooltip} />
              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 8, fontFamily: "'JetBrains Mono', monospace", color: '#3d6070' }} />
              {resourceData.datasets.map(ds => (
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
        </ChartPanel>

        <ChartPanel title="🪙 Coin Balance — last 60s">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={coinData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="tick" tick={axisStyle} stroke={CHART_THEME.axis} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} stroke={CHART_THEME.axis} width={46} tickFormatter={fmt} />
              <Tooltip {...CHART_THEME.tooltip} formatter={(v: number) => [fmt(v), 'Coins']} />
              <Line
                type="monotone"
                dataKey="Coins"
                stroke="#ffaa00"
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-2 gap-4">

        <ChartPanel title="⚡ Net Production Rate (per tick)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} horizontal={false} />
              <XAxis type="number" tick={axisStyle} stroke={CHART_THEME.axis} />
              <YAxis dataKey="name" type="category" tick={axisStyle} stroke={CHART_THEME.axis} width={88} />
              <Tooltip {...CHART_THEME.tooltip} formatter={(v: number) => [`${v.toFixed(2)}/tick`, 'Rate']} />
              <Bar dataKey="rate" radius={3} isAnimationActive={false}>
                {ratesData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="📈 Market Prices — last 20 samples">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={marketData.points}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="sample" tick={axisStyle} stroke={CHART_THEME.axis} />
              <YAxis tick={axisStyle} stroke={CHART_THEME.axis} width={32} />
              <Tooltip {...CHART_THEME.tooltip} />
              <Legend wrapperStyle={{ fontSize: 9, paddingTop: 8, fontFamily: "'JetBrains Mono', monospace", color: '#3d6070' }} />
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
        </ChartPanel>
      </div>
    </div>
  )
}
