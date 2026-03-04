import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { TICK_RATE_MS } from '../engine/config'

// ─────────────────────────────────────────────────────────────────────────────
//  useGameTick — drives the game loop
//  Calls store.update() on a fixed interval and handles auto-save.
// ─────────────────────────────────────────────────────────────────────────────

export function useGameTick() {
  const update     = useGameStore(s => s.update)
  const saveToCloud = useGameStore(s => s.saveToCloud)
  const tick       = useGameStore(s => s.tick)
  const tickRef    = useRef(tick)
  tickRef.current  = tick

  useEffect(() => {
    const id = setInterval(() => {
      update()
      // Auto-save every 60 ticks (~1 minute)
      if ((tickRef.current + 1) % 60 === 0) {
        saveToCloud()
      }
    }, TICK_RATE_MS)

    return () => clearInterval(id)
  }, [update, saveToCloud])
}
