import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'
import { RESOURCES, RESOURCE_KEYS } from '../engine/config'

// ─────────────────────────────────────────────────────────────────────────────
//  useChartData — derives Recharts-ready datasets from the store
// ─────────────────────────────────────────────────────────────────────────────

export function useResourceChartData() {
  const chartData = useGameStore(s => s.chartData)

  return useMemo(() => {
    const labels = chartData.tickLabels

    const datasets = RESOURCE_KEYS.map(key => ({
      name:   RESOURCES[key].label,
      color:  RESOURCES[key].color,
      data:   chartData.resourceHistory.map(snap => snap[key] ?? 0),
    }))

    // Build flat array of { tick, [label]: value } for Recharts LineChart
    const points = labels.map((tick, i) => {
      const row: Record<string, number> = { tick }
      RESOURCE_KEYS.forEach(key => {
        row[RESOURCES[key].label] = chartData.resourceHistory[i]?.[key] ?? 0
      })
      return row
    })

    return { points, datasets, labels }
  }, [chartData])
}

export function useCoinChartData() {
  const chartData = useGameStore(s => s.chartData)

  return useMemo(() => {
    return chartData.tickLabels.map((tick, i) => ({
      tick,
      Coins: chartData.coinHistory[i] ?? 0,
    }))
  }, [chartData])
}

export function useProductionRatesData() {
  const rates = useGameStore(s => s.productionRates)

  return useMemo(() => {
    return RESOURCE_KEYS.map(key => ({
      name:  RESOURCES[key].label,
      icon:  RESOURCES[key].icon,
      rate:  rates[key] ?? 0,
      color: (rates[key] ?? 0) >= 0 ? '#22c55e' : '#ef4444',
    }))
  }, [rates])
}

export function useMarketChartData() {
  const priceHistory = useGameStore(s => s.priceHistory)

  return useMemo(() => {
    const maxLen = Math.max(...RESOURCE_KEYS.map(k => priceHistory[k]?.length ?? 0), 0)
    const points = Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, number> = { sample: i + 1 }
      RESOURCE_KEYS.forEach(key => {
        row[RESOURCES[key].label] = priceHistory[key]?.[i] ?? 0
      })
      return row
    })
    const datasets = RESOURCE_KEYS.map(key => ({
      name:  RESOURCES[key].label,
      color: RESOURCES[key].color,
    }))
    return { points, datasets }
  }, [priceHistory])
}
