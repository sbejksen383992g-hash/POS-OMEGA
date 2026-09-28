import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { Trophy, Zap, Scroll, Skull, Flame, Star, Bell, X } from 'lucide-react'

const iconMap = {
  levelup: Zap,
  quest: Trophy,
  boss: Skull,
  streak: Flame,
  achievement: Star,
  skill: Star,
  journal: Scroll,
  attr: Zap,
  default: Bell,
}

const AUTO_DISMISS_MS = 4500

export default function NotificationToast() {
  const notifications = useStore((s) => s.notifications)
  const dismissNotification = useStore((s) => s.dismissNotification)
  const latest = notifications[0]

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-[200] pointer-events-none flex flex-col items-end">
      <AnimatePresence>
        {latest && (
          <ToastItem
            key={latest.id}
            notification={latest}
            onDismiss={() => dismissNotification(latest.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ notification, onDismiss }) {
  const Icon = iconMap[notification.type] || iconMap.default

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id])

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="glass rounded-xl p-4 mb-2 w-full sm:min-w-[280px] sm:max-w-sm pointer-events-auto"
      style={{ borderColor: 'var(--accent)' }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0" style={{ background: 'var(--accent-soft)' }}>
          <Icon size={18} className="accent-text" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{notification.title}</p>
          <p className="text-xs text-text-secondary mt-0.5">{notification.desc}</p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 -m-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors shrink-0"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}
