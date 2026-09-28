import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Award, CalendarDays, ChevronRight, Coins, Crown, Flame, Gem, Shield, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ASSETS } from '../config/assets'
import { formatNumber, xpForLevel } from '../utils/helpers'

const ATTRS = [
  { id: 'strength', name: 'Strength', icon: '💪', color: '#ff4466' },
  { id: 'intelligence', name: 'Intelligence', icon: '🧠', color: '#00d4ff' },
  { id: 'wisdom', name: 'Wisdom', icon: '🦉', color: '#b366ff' },
  { id: 'charisma', name: 'Charisma', icon: '✨', color: '#ffaa00' },
  { id: 'vitality', name: 'Vitality', icon: '❤️', color: '#00ff88' },
  { id: 'discipline', name: 'Discipline', icon: '⚡', color: '#ff6b35' },
]

export default function Profile() {
  const player = useStore((s) => s.player)
  const attributes = useStore((s) => s.attributes || {})
  const achievements = useStore((s) => s.achievements || [])
  const stats = useStore((s) => s.stats || {})
  const quests = useStore((s) => s.quests || [])
  const xpNeeded = xpForLevel(player.level)
  const xpPct = Math.min(100, (player.xp / xpNeeded) * 100)
  const completed = quests.filter((q) => q.completed).length

  return (
    <div className="space-y-6 page-cinematic profile-page">
      <section className="card profile-hero-card overflow-hidden">
        <img src={ASSETS.profileAtmosphere} alt="" className="profile-hero-atmosphere" data-apex-parallax="0.05" />
        <motion.div className="profile-hero-glow" animate={{ opacity: [0.4, 0.65, 0.4], scale: [1, 1.04, 1] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 min-w-0">
            <motion.div whileHover={{ scale: 1.04, rotateZ: -1 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 340, damping: 22 }} className="profile-avatar-shell">
              <img src={ASSETS.profileHero} alt={`${player.name} profile`} className="profile-avatar-image premium-image-zoom" />
              <div className="profile-avatar-scan" />
            </motion.div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-tertiary">Operator Profile</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display font-black tracking-tight break-words">{player.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">{player.title}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge bg-accent-soft text-accent"><Crown size={11} /> Level {player.level}</span>
                <span className="badge bg-bg-700/60 text-text-secondary"><Flame size={11} /> {player.streak} day streak</span>
                <span className="badge bg-bg-700/60 text-text-secondary"><Target size={11} /> {completed} quests complete</span>
              </div>
            </div>
          </div>

          <div className="profile-xp-panel">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary">Experience</p>
                <p className="mt-1 text-3xl font-mono font-black accent-text">{formatNumber(player.xp)}</p>
              </div>
              <Zap size={22} className="accent-text" />
            </div>
            <div className="mt-4 progress-bar" style={{ height: 8 }}>
              <motion.div className="progress-fill" initial={{ scaleX: 0 }} animate={{ scaleX: xpPct / 100 }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
            <p className="mt-2 text-[10px] text-text-tertiary">{Math.round(xpPct)}% toward Level {player.level + 1}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ProfileMetric icon={Trophy} label="Total XP" value={formatNumber(player.totalXp)} />
        <ProfileMetric icon={Coins} label="Coins" value={formatNumber(player.coins)} />
        <ProfileMetric icon={Gem} label="Gems" value={formatNumber(player.gems)} />
        <ProfileMetric icon={Shield} label="HP" value={`${player.hp}/${player.maxHp}`} />
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="section-heading">Attributes</p>
            <h2 className="text-xl font-display font-bold mt-1">Current profile build</h2>
          </div>
          <Link to="/attributes" className="text-xs accent-text inline-flex items-center gap-1">Details <ChevronRight size={13} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ATTRS.map((attr, i) => {
            const value = attributes[attr.id] || { level: 1, xp: 0, totalXp: 0 }
            return (
              <motion.div key={attr.id} whileHover={{ y: -4, scale: 1.01 }} transition={{ type: 'spring', stiffness: 340, damping: 24 }} className="profile-attribute-card card-hover rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl">{attr.icon}</span>
                  <span className="text-[10px] font-mono text-text-tertiary">LV.{value.level}</span>
                </div>
                <p className="mt-3 text-sm font-semibold">{attr.name}</p>
                <p className="mt-1 text-[10px] text-text-tertiary">{formatNumber(value.totalXp)} lifetime XP</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><CalendarDays size={16} className="accent-text" /><h2 className="text-sm font-semibold">Operator Record</h2></div>
          <div className="space-y-3">
            <Record label="Quests completed" value={stats.questsCompleted || 0} />
            <Record label="Habits completed" value={stats.habitsCompleted || 0} />
            <Record label="Bosses defeated" value={stats.bossesDefeated || 0} />
            <Record label="Perfect days" value={stats.perfectDays || 0} />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Award size={16} className="accent-text" /><h2 className="text-sm font-semibold">Achievements</h2></div>
          {achievements.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-bg-700/40 p-5 text-center">
              <Sparkles size={20} className="mx-auto text-text-tertiary" />
              <p className="mt-2 text-xs text-text-secondary">No achievements unlocked yet.</p>
              <Link to="/achievements" className="mt-3 inline-flex text-xs accent-text">View system milestones</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {achievements.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-subtle bg-bg-700/40 p-3">
                  <p className="text-lg">{item.icon}</p>
                  <p className="mt-2 text-xs font-semibold truncate">{item.name}</p>
                  <p className="mt-1 text-[10px] text-text-tertiary line-clamp-2">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Link to="/settings" className="card card-hover p-4 flex items-center justify-between gap-3 group">
        <div><p className="text-xs font-semibold">Profile settings</p><p className="text-[10px] text-text-tertiary mt-1">Manage system preferences and Nexus configuration.</p></div>
        <ChevronRight size={16} className="text-text-tertiary transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  )
}

function ProfileMetric({ icon: Icon, label, value }) {
  return (
    <div className="card p-4 profile-metric-card">
      <Icon size={16} className="accent-text" />
      <p className="mt-3 text-xl font-mono font-bold">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
    </div>
  )
}

function Record({ label, value }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-700/35 px-3 py-2.5"><span className="text-xs text-text-secondary">{label}</span><span className="text-xs font-mono font-bold accent-text">{value}</span></div>
}
