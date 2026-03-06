import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import { useGameTick } from '../hooks/useGameTick'
import { Header } from '../components/layout/Header'
import { LeftSidebar } from '../components/layout/LeftSidebar'
import { RightSidebar } from '../components/layout/RightSidebar'
import { DashboardTab } from '../components/tabs/DashboardTab'
import { BuildingsTab } from '../components/tabs/BuildingsTab'
import { LogisticsTab } from '../components/tabs/LogisticsTab'
import { UpgradesTab } from '../components/tabs/UpgradesTab'
import { CorporateLadderTab } from '../components/tabs/CorporateLadderTab'
import { NotificationStack } from '../components/ui/NotificationStack'
import type { RankKey } from '../engine/types'

type TabId = 'operator' | 'dashboard' | 'systems' | 'upgrades' | 'scada' | 'globalops' | 'ladder'

interface TabDef {
  id: TabId
  label: string
  minRankIndex: number   // 0=all, 1=deptManager+, 2=prodManager+, 3=coo
}

const ALL_TABS: TabDef[] = [
  { id: 'operator',   label: 'Operator View', minRankIndex: 0 },
  { id: 'dashboard',  label: 'Dashboard',     minRankIndex: 1 },
  { id: 'systems',    label: 'Systems',        minRankIndex: 1 },
  { id: 'upgrades',   label: 'Upgrades',       minRankIndex: 0 },
  { id: 'scada',      label: 'SCADA Flow',     minRankIndex: 2 },
  { id: 'globalops',  label: 'Global Ops',     minRankIndex: 3 },
  { id: 'ladder',     label: 'Corp. Ladder',   minRankIndex: 0 },
]

// Default tab per rank
const DEFAULT_TAB: Record<RankKey, TabId> = {
  operator:    'operator',
  deptManager: 'dashboard',
  prodManager: 'dashboard',
  coo:         'dashboard',
}

export function GamePage() {
  const rank      = useGameStore(s => s.rank)
  const rankIndex = useGameStore(s => s.rankIndex)
  const loadFromCloud = useGameStore(s => s.loadFromCloud)
  const navigate  = useNavigate()

  const [activeTab, setActiveTab] = useState<TabId>('operator')

  // Start the game tick loop
  useGameTick()

  // Auth guard + initial load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate('/'); return }
      loadFromCloud()
    })
  }, [navigate, loadFromCloud])

  // When rank changes, switch to appropriate default tab if current tab is no longer visible
  useEffect(() => {
    const visible = ALL_TABS.filter(t => t.minRankIndex <= rankIndex)
    if (!visible.find(t => t.id === activeTab)) {
      setActiveTab(DEFAULT_TAB[rank])
    }
  }, [rank, rankIndex, activeTab])

  const visibleTabs = ALL_TABS.filter(t => t.minRankIndex <= rankIndex)

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', background: 'var(--c-bg)', color: 'var(--c-text)', overflow: 'hidden' }}
    >
      <Header />

      <main className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        {/* Center panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div
            className="flex flex-shrink-0"
            style={{
              background: 'var(--c-panel)',
              borderBottom: '1px solid var(--c-border)',
              padding: '0 16px',
            }}
          >
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 16px',
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: isActive ? '2px solid var(--c-sky)' : '2px solid transparent',
                    color: isActive ? 'var(--c-sky)' : 'var(--c-dim)',
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.target as HTMLElement).style.color = 'var(--c-text)' }}
                  onMouseLeave={e => { if (!isActive) (e.target as HTMLElement).style.color = 'var(--c-dim)' }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
            {activeTab === 'operator'  && <DashboardTab forceOperator />}
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'systems'   && <LogisticsTab />}
            {activeTab === 'upgrades'  && <UpgradesTab />}
            {activeTab === 'scada'     && <BuildingsTab scadaMode />}
            {activeTab === 'globalops' && <BuildingsTab globalMode />}
            {activeTab === 'ladder'    && <CorporateLadderTab />}
          </div>
        </div>

        <RightSidebar />
      </main>

      <NotificationStack />
    </div>
  )
}
