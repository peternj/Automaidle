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
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <Header />

      <main className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        <LeftSidebar />

        {/* Center panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="bg-slate-800/50 border-b border-slate-700 px-6 flex gap-1 pt-2 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-slate-800'
                    : 'border-transparent text-slate-400 hover:text-slate-200'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
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
