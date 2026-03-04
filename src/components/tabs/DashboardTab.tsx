import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useGameStore } from '../../store/gameStore'
import {
  useResourceChartData, useCoinChartData,
  useProductionRatesData, useMarketChartData,
} from '../../hooks/useChartData'
import { RESOURCES } from '../../engine/config'

// ─── Shared chart theme ────────────────────────────────────────────────────
const CHART_THEME = {
  background:  '#1e293b',
  grid:        '#334155',
  tooltip: {
    contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 },
    labelStyle:   { color: '#94a3b8' },
  },
}

function fmt(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toString()
}

// ─── KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string
}) {
  return (
    <div className={`bg-slate-800/80 border border-slate-700 rounded-2xl p-4 relative overflow-hidden`}>
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export function DashboardTab() {
  const tick        = useGameStore(s => s.tick)
  const stats       = useGameStore(s => s.stats)

  const resourceData  = useResourceChartData()
  const coinData      = useCoinChartData()
  const ratesData     = useProductionRatesData()
  const marketData    = useMarketChartData()

  const totalProduced = Object.values(stats.totalProduced).reduce((a, b) => a + b, 0)
  const mins  = Math.floor(tick / 60)
  const secs  = tick % 60
  const runTxt = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div className="space-y-4">

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Ticks"
          value={fmt(tick)}
          sub={`≈ ${runTxt} runtime`}
          accent="linear-gradient(90deg,#3b82f6,#06b6d4)"
        />
        <KpiCard
          label="Items Produced"
          value={fmt(totalProduced)}
          sub="all resources"
          accent="linear-gradient(90deg,#22c55e,#10b981)"
        />
        <KpiCard
          label="Coins Earned"
          value={fmt(stats.coinsEarned)}
          sub="from sales"
          accent="linear-gradient(90deg,#f59e0b,#fbbf24)"
        />
        <KpiCard
          label="Manual Clicks"
          value={fmt(stats.manualClicks)}
          sub="total mines"
          accent="linear-gradient(90deg,#8b5cf6,#a78bfa)"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4">

        {/* Resource inventory over time */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            📦 Resource Inventory — last 60s
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={resourceData.points}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="tick" stroke="#475569" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} width={40} />
              <Tooltip {...CHART_THEME.tooltip} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
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
        </div>

        {/* Coin balance over time */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            🪙 Coin Balance — last 60s
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={coinData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="tick" stroke="#475569" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} width={50} tickFormatter={fmt} />
              <Tooltip {...CHART_THEME.tooltip} formatter={(v: number) => [fmt(v), 'Coins']} />
              <Line
                type="monotone"
                dataKey="Coins"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={2}
                fill="#f59e0b22"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">

        {/* Net production rates */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            ⚡ Net Production Rate (per tick)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} horizontal={false} />
              <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" stroke="#475569" tick={{ fontSize: 10 }} width={90} />
              <Tooltip {...CHART_THEME.tooltip} formatter={(v: number) => [`${v.toFixed(2)}/tick`, 'Rate']} />
              <Bar dataKey="rate" radius={4} isAnimationActive={false}>
                {ratesData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Market prices */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            📈 Market Prices — last 20 samples
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={marketData.points}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="sample" stroke="#475569" tick={{ fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 10 }} width={35} />
              <Tooltip {...CHART_THEME.tooltip} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
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
        </div>
      </div>
    </div>
  )
}
