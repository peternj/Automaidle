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
import { NotificationStack } from '../components/ui/NotificationStack'

type TabId = 'dashboard' | 'buildings' | 'logistics' | 'upgrades'

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard',  label: '📊 Dashboard'  },
  { id: 'buildings',  label: '🏭 Buildings'  },
  { id: 'logistics',  label: '🔗 Logistics'  },
  { id: 'upgrades',   label: '🔬 Upgrades'   },
]

export function GamePage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const navigate   = useNavigate()
  const loadFromCloud = useGameStore(s => s.loadFromCloud)

  // Start the game tick loop
  useGameTick()

  // Auth guard + initial load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate('/'); return }
      loadFromCloud()
    })
  }, [navigate, loadFromCloud])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <Header />

      <main className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
        <LeftSidebar />

        {/* Center panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div
            className="flex gap-0 flex-shrink-0"
            style={{
              background: 'var(--c-panel)',
              borderBottom: '1px solid var(--c-border)',
              padding: '0 16px',
            }}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: isActive ? '2px solid var(--c-cyan)' : '2px solid transparent',
                    color: isActive ? 'var(--c-cyan)' : 'var(--c-dim)',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.target as HTMLElement).style.color = 'var(--c-text)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.target as HTMLElement).style.color = 'var(--c-dim)'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
            {activeTab === 'dashboard'  && <DashboardTab />}
            {activeTab === 'buildings'  && <BuildingsTab />}
            {activeTab === 'logistics'  && <LogisticsTab />}
            {activeTab === 'upgrades'   && <UpgradesTab />}
          </div>
        </div>

        <RightSidebar />
      </main>

      <NotificationStack />
    </div>
  )
}
