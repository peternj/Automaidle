import { useGameStore } from '../../store/gameStore'

const COLORS = {
  success: 'bg-green-800 border-green-600 text-green-100',
  error:   'bg-red-900 border-red-600 text-red-100',
  info:    'bg-slate-700 border-slate-500 text-slate-100',
}

export function NotificationStack() {
  const notifications = useGameStore(s => s.notifications)
  const removeNotif   = useGameStore(s => s.removeNotif)

  return (
    <div className="fixed top-20 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`pointer-events-auto border rounded-xl px-4 py-3 text-sm font-medium shadow-xl animate-slide-in ${COLORS[n.type]}`}
          onClick={() => removeNotif(n.id)}
        >
          {n.message}
        </div>
      ))}
    </div>
  )
}
