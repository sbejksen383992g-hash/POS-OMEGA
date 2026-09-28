import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, CalendarClock, Sword, Repeat, Skull, BarChart3,
  BookOpen, GitBranch, Bot, Settings, Zap, Activity, Trophy, CalendarDays, CalendarOff,
} from 'lucide-react'
import { useStore } from '../store/useStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/today', icon: CalendarClock, label: 'Today' },
  { to: '/quests', icon: Sword, label: 'Quests' },
  { to: '/habits', icon: Repeat, label: 'Habits' },
  { to: '/bosses', icon: Skull, label: 'Bosses' },
  { to: '/attributes', icon: BarChart3, label: 'Attributes' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/skilltree', icon: GitBranch, label: 'Skill Tree' },
  { to: '/ai', icon: Bot, label: 'Nexus AI' },
  { to: '/operations', icon: Activity, label: 'Operations' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/leave', icon: CalendarOff, label: 'Nexus Leave' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ onNavigate }) {
  const player = useStore((s) => s.player)

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 mb-2 sidebar-brand">
        <div className="flex items-center gap-2.5">
          <motion.div className="w-9 h-9 rounded-lg flex items-center justify-center brand-orb" style={{ background: 'var(--accent)' }}>
            <Zap size={20} className="text-bg-900" fill="currentColor" />
          </motion.div>
          <div>
            <h1 className="font-display font-bold text-lg leading-none tracking-tight">POS</h1>
            <p className="text-[10px] text-text-tertiary mt-0.5">Personal Operating System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (<>
              {isActive && <motion.span layoutId="sidebar-active" className="nav-active-glow" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
              <span className="relative z-10 flex items-center gap-3"><item.icon size={18} /><span>{item.label}</span></span>
            </>)}
          </NavLink>
        ))}
      </nav>

      {/* Player mini-card */}
      <div className="p-3 mt-2">
        <NavLink to="/profile" onClick={onNavigate} className="block card p-3 profile-mini-card card-hover">
          <div className="flex items-center gap-2">
            <div className="profile-mini-avatar w-8 h-8 rounded-xl overflow-hidden border border-border-subtle bg-bg-800 shrink-0">
              <img src="/assets/images/profile-hero.webp" alt="" className="w-full h-full object-cover premium-image-zoom" onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.textContent=player.name.charAt(0).toUpperCase(); }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{player.name}</p>
              <p className="text-[10px] text-text-tertiary">Level {player.level}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-tertiary">Streak</p>
              <p className="text-xs font-mono font-bold accent-text">{player.streak}d</p>
            </div>
          </div>
        </NavLink>
      </div>
    </div>
  )
}
