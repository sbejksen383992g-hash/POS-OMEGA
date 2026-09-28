import { useState, useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import NotificationToast from './NotificationToast'
import { useStore } from '../store/useStore'
import { ResourceBar } from './StatComponents'
import { Menu, Search, X, LayoutDashboard, Sword, Repeat, Skull, Bot, Bell, WifiOff } from 'lucide-react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { SilentBoundary } from './ErrorBoundary'
import { motion, AnimatePresence } from 'framer-motion'
import { useScrollLock } from '../utils/useScrollLock'
import NexusVoiceAnnouncer from './NexusVoiceAnnouncer'
import AlarmScheduler from './AlarmScheduler'
import PremiumFX from './PremiumFX'
import CinematicEvents from '../motion/CinematicEvents'
import { ASSETS } from '../config/assets'
import { useEffect as useBrowserEffect, useState as useBrowserState } from 'react'

export function TopBar({ onMenuClick }) {
  const player = useStore((s) => s.player)
  return (
    <header className="sticky top-0 z-40 glass border-b border-border-subtle safe-top topbar-cinematic">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden grid place-items-center min-w-[44px] min-h-[44px] -ml-2 rounded-xl active:bg-surface-elevated transition-colors" aria-label="Open menu" data-sound-click="click">
            <Menu size={20} className="text-text-secondary" />
          </button>
          <ResourceBar />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 mr-1 text-[9px] uppercase tracking-[0.22em] text-text-tertiary"><span className="status-beacon" /> SYSTEM ONLINE</div>
          <CommandPaletteTrigger />
          <Link to="/profile" aria-label="Open profile" className="profile-topbar-button card-hover" data-sound-hover="true">
            <img src={ASSETS.profileHero} alt="" className="premium-image-zoom" />
            <span className="profile-topbar-ring" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    window.__openCommandPalette = () => setOpen(true)
  }, [])
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs text-text-tertiary hover:text-text-secondary transition-colors"
    >
      <Search size={14} />
      <span className="hidden sm:inline">Search / AI</span>
      <kbd className="hidden sm:inline text-[10px] px-1 py-0.5 rounded border border-border">⌘K</kbd>
    </button>
  )
}

const isCoarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [online, setOnline] = useBrowserState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const updateStreak = useStore((s) => s.updateStreak)
  const applyDailyPenalties = useStore((s) => s.applyDailyPenalties)
  const theme = useStore((s) => s.theme)
  const notifications = useStore((s) => s.notifications || [])
  const clearNotifications = useStore((s) => s.clearNotifications)
  const markNotificationsRead = useStore((s) => s.markNotificationsRead)

  useScrollLock(mobileNavOpen)

  useBrowserEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    updateStreak()
    applyDailyPenalties()
  }, [updateStreak, applyDailyPenalties])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col glass border-r border-border-subtle fixed h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar: static overlay on touch devices. */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            role="presentation"
          />
          <aside className="fixed left-0 top-0 bottom-0 w-72 max-w-[86vw] z-[51] glass border-r border-border-subtle lg:hidden">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-4 min-w-11 min-h-11 p-2 rounded-xl bg-bg-700 text-text-tertiary"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        {!online && <div className="mx-4 mt-3 lg:mx-8 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"><WifiOff size={14} /> Offline mode — local POS features remain available.</div>}
        <main className="app-main flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <MobileBottomNav />
      </div>

      <SilentBoundary name="command-palette"><CommandPalette /></SilentBoundary>
      <SilentBoundary name="toasts"><NotificationToast /></SilentBoundary>
      {/* On phones the notification bell would sit on top of the Nexus composer's Send button. */}
      {!(isCoarse && pathname === '/ai') && (
        <SilentBoundary name="notification-center"><NotificationCenter notifications={notifications} onClear={clearNotifications} onRead={markNotificationsRead} /></SilentBoundary>
      )}
      <SilentBoundary name="nexus-voice-announcer"><NexusVoiceAnnouncer /></SilentBoundary>
      <SilentBoundary name="alarm-scheduler"><AlarmScheduler /></SilentBoundary>
      {!isCoarse && <SilentBoundary name="premium-fx"><PremiumFX /></SilentBoundary>}
      {!isCoarse && <SilentBoundary name="cinematic-events"><CinematicEvents /></SilentBoundary>}
    </div>
  )
}


function NotificationCenter({ notifications, onClear, onRead }) {
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.readAt).length
  return (
    <div className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-4 z-[120]">
      <button aria-label="Open notifications" onClick={() => { setOpen((v) => !v); onRead() }} className="w-11 h-11 rounded-full glass flex items-center justify-center hover:bg-surface-elevated transition-colors relative">
        <Bell size={17} />{unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full accent-bg text-[10px] font-bold flex items-center justify-center">{Math.min(unread, 99)}</span>}
      </button>
      <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: 8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} className="absolute right-0 bottom-14 w-[min(360px,calc(100vw-2rem))] glass rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle"><div><p className="text-sm font-semibold">Notifications</p><p className="text-[10px] text-text-tertiary">System events and execution feedback</p></div><button onClick={onClear} className="text-[11px] text-text-tertiary hover:text-text-primary">Clear</button></div>
        <div className="max-h-72 overflow-y-auto">{notifications.length ? notifications.slice(0, 12).map((n) => <div key={n.id} className="px-4 py-3 border-b border-border-subtle last:border-0"><p className="text-xs font-semibold">{n.title}</p><p className="text-[11px] text-text-tertiary mt-0.5">{n.desc}</p></div>) : <p className="p-5 text-xs text-text-tertiary text-center">No new notifications.</p>}</div>
      </motion.div>}</AnimatePresence>
    </div>
  )
}


function MobileBottomNav() {
  const { pathname } = useLocation()
  const items = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/quests', label: 'Quests', icon: Sword },
    { to: '/habits', label: 'Habits', icon: Repeat },
    { to: '/bosses', label: 'Bosses', icon: Skull },
    { to: '/ai', label: 'Nexus', icon: Bot },
  ]

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Primary mobile navigation">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Icon size={18} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
