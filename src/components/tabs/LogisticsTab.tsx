import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import { BUILDINGS } from '../../engine/config'

export function LogisticsTab() {
  const buildings = useGameStore(s => s.buildings)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width, H = canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    const activeBuildings = Object.entries(buildings)
      .filter(([, c]) => c > 0)
      .map(([key, count]) => ({ key, count, cfg: BUILDINGS[key as keyof typeof BUILDINGS] }))

    if (activeBuildings.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Buy buildings to see the logistics network', W / 2, H / 2)
      return
    }

    const cx = W / 2, cy = H / 2
    const radius = Math.min(W, H) * 0.35
    const nodes = activeBuildings.map((b, i) => {
      const angle = (i / activeBuildings.length) * Math.PI * 2 - Math.PI / 2
      return { ...b, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
    })

    // Draw edges
    ctx.lineWidth = 1.5
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const aOut = Object.keys(a.cfg.production)
        const bIn  = Object.keys(b.cfg.consumption)
        const bOut = Object.keys(b.cfg.production)
        const aIn  = Object.keys(a.cfg.consumption)
        const connected = aOut.some(r => bIn.includes(r)) || bOut.some(r => aIn.includes(r))
        if (!connected) continue
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
        grad.addColorStop(0, 'rgba(59,130,246,0.6)')
        grad.addColorStop(1, 'rgba(6,182,212,0.6)')
        ctx.strokeStyle = grad
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      }
    }

    // Draw nodes
    nodes.forEach(node => {
      // Glow
      const grd = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, 28)
      grd.addColorStop(0, 'rgba(59,130,246,0.25)')
      grd.addColorStop(1, 'rgba(59,130,246,0)')
      ctx.fillStyle = grd
      ctx.beginPath(); ctx.arc(node.x, node.y, 28, 0, Math.PI * 2); ctx.fill()

      // Circle
      ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(node.x, node.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

      // Icon
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(node.cfg.icon[0], node.x, node.y)

      // Count badge
      ctx.fillStyle = '#2563eb'
      ctx.beginPath(); ctx.arc(node.x + 14, node.y - 14, 9, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'white'; ctx.font = 'bold 9px Inter, sans-serif'
      ctx.fillText(String(node.count), node.x + 14, node.y - 14)

      // Label
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, sans-serif'; ctx.textBaseline = 'top'
      ctx.fillText(node.cfg.label.substring(0, 14), node.x, node.y + 26)
    })
  }, [buildings])

  return (
    <div className="bg-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-1">🔗 Logistics Network</h3>
      <p className="text-xs text-slate-500 mb-4">Connections appear between buildings that share resources.</p>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl bg-slate-900"
        style={{ height: 420 }}
      />
    </div>
  )
}
