import { useStore, ATTRIBUTES } from '../store/useStore'
import { AttributeCard, StatBar } from '../components/StatComponents'
import { QuestCheck, Skeleton, useSkeleton, NexusAvatar } from '../components/Apex'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatNumber, difficultyConfig, xpForLevel } from '../utils/helpers'
import { Flame, Target, Trophy, Skull, ChevronRight, TrendingUp, Sparkles } from 'lucide-react'
import OperationBadge from '../components/OperationBadge'
import { getQuestOperation } from '../utils/operations'
import OptionalVideo from '../components/OptionalVideo'
import { ASSETS } from '../config/assets'

const getQuestImage = (quest) => {
  const map = { Health: 'quest-health.webp', Learning: 'quest-learning.webp', College: 'quest-college.webp', Finance: 'quest-finance.webp', Productivity: 'quest-productivity.webp', 'Personal Development': 'quest-personal.webp' }
  return `/assets/images/${map[getQuestOperation(quest).id] || 'quest-productivity.webp'}`
}

export default function Dashboard() {
  const player = useStore((s) => s.player)
  const quests = useStore((s) => s.quests)
  const bosses = useStore((s) => s.bosses)
  const stats = useStore((s) => s.stats)
  const habits = useStore((s) => s.habits)
  const completeQuest = useStore((s) => s.completeQuest)
  const loadingSkeleton = useSkeleton(320)

  const todayQuests = quests.filter((q) => q.type === 'daily')
  const completedToday = todayQuests.filter((q) => q.completed).length
  const activeBoss = bosses.find((b) => !b.defeated)
  const habitCompletionThisWeek = habits.reduce((acc, h) => acc + h.completed.filter(Boolean).length, 0)
  const habitSlotsThisWeek = habits.length * 7
  const healthQuests = quests.filter((q) => q.section === 'Health')
  const learningQuests = quests.filter((q) => q.section === 'Learning')
  const completedMetric = (list) => list.filter((q) => q.completed).reduce((sum, q) => sum + ((q.measurementType === 'quantity' || q.measurementType === 'duration') ? (Number(q.target) || 0) : 1), 0)
  const healthDone = completedMetric(healthQuests)
  const learningDone = completedMetric(learningQuests)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const xpNeeded = xpForLevel(player.level)
  const xpPct = Math.min(100, (player.xp / xpNeeded) * 100)

  if (loadingSkeleton) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-20 w-full" style={{ borderRadius: 24 }} />
        <Skeleton className="h-36 w-full" style={{ borderRadius: 24 }} />
        <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" style={{ borderRadius: 24 }} />)}</div>
        <Skeleton className="h-56 w-full" style={{ borderRadius: 24 }} />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in page-cinematic">
      {/* AI greeting */}
      <Link to="/ai" className="card p-4 flex items-center gap-4 apex-glass-hero" data-apex-parallax="0.12">
        <NexusAvatar size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] accent-text font-semibold uppercase tracking-widest">Nexus</p>
          <h1 className="text-xl font-display font-bold leading-tight truncate">{greeting}, <span className="accent-text">{player.name}</span></h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {completedToday === todayQuests.length && todayQuests.length > 0
              ? 'All daily quests complete. You are unstoppable.'
              : `${completedToday}/${todayQuests.length} daily quests complete. Tap to talk to Nexus.`}
          </p>
        </div>
        <ChevronRight size={18} className="text-text-tertiary shrink-0" />
      </Link>

      {/* Premium XP card */}
      <div className="card apex-hero p-5 cinematic-hero-card overflow-hidden">
        <OptionalVideo src={ASSETS.video.dashboardLoop} poster={ASSETS.dashboardHero} className="cinematic-hero-video" />
        <img src="/assets/images/dashboard-hero.webp" alt="" className="cinematic-hero-art" data-apex-parallax="0.09" />
        <img src="/assets/images/dashboard-atmosphere.webp" alt="" className="cinematic-hero-atmosphere" data-apex-parallax="0.05" />
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[11px] text-text-tertiary uppercase tracking-widest">Level</p>
            <p className="text-5xl font-display font-bold leading-none glow-text accent-text">{player.level}</p>
            <p className="text-xs text-text-secondary mt-2">{player.title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{formatNumber(player.xp)}<span className="text-sm text-text-tertiary"> / {formatNumber(xpNeeded)}</span></p>
            <p className="text-[11px] text-text-tertiary uppercase tracking-widest mt-1">XP to level {player.level + 1}</p>
          </div>
        </div>
        <div id="apex-xp-target" className="progress-bar" style={{ height: 10 }}>
          <motion.div className="progress-fill" style={{ width: '100%', originX: 0 }} initial={{ scaleX: 0 }} animate={{ scaleX: xpPct / 100 }} transition={{ duration: 0.8, ease: 'easeOut' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <StatBar label="HP" value={player.hp} max={player.maxHp} color="var(--error)" size="sm" />
          <StatBar label="MP" value={player.mp} max={player.maxMp} color="var(--accent)" size="sm" />
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Flame} label="Streak" value={`${player.streak}d`} />
        <MiniStat icon={Target} label="Today" value={`${completedToday}/${todayQuests.length}`} />
        <MiniStat icon={Trophy} label="Total XP" value={formatNumber(player.totalXp)} />
      </div>

      {/* Today's quests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Target size={16} className="accent-text" /> Today's Quests</h3>
          <Link to="/quests" className="text-xs accent-text">View all</Link>
        </div>
        <div className="space-y-2">
          {todayQuests.length === 0 && <p className="text-xs text-text-tertiary text-center py-4">No daily quests yet.</p>}
          {todayQuests.slice(0, 5).map((quest) => {
            const diff = difficultyConfig[quest.difficulty] || difficultyConfig.medium
            return (
              <div key={quest.id} className="flex items-center gap-3 p-3 rounded-2xl bg-bg-700 quest-row-premium">
                <img src={getQuestImage(quest)} alt="" className="quest-art-thumb" loading="lazy" />
                <QuestCheck done={quest.completed} label={quest.completed ? 'Completed quest' : `Complete ${quest.title}`} onComplete={() => completeQuest(quest.id)} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${quest.completed ? 'line-through text-text-tertiary' : ''}`}>{quest.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <OperationBadge quest={quest} />
                    <span className="text-xs text-text-tertiary">+{quest.xp} XP · +{quest.coins} 🪙</span>
                  </div>
                </div>
                <span className="badge" style={{ background: `${diff.color}20`, color: diff.color }}>{diff.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active boss */}
      {activeBoss && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 20%, var(--accent), transparent 60%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeBoss.icon}</span>
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider">Active Boss</p>
                  <h3 className="font-display font-bold text-lg">{activeBoss.name}</h3>
                  <p className="text-xs text-text-tertiary">{activeBoss.title}</p>
                </div>
              </div>
              <Link to="/bosses" className="text-text-tertiary hover:text-text-primary transition-colors"><ChevronRight size={20} /></Link>
            </div>
            <StatBar value={activeBoss.maxHp - activeBoss.hp} max={activeBoss.maxHp} color="var(--error)" showNumbers={false} size="lg" />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-text-tertiary">Damage dealt: {formatNumber(activeBoss.maxHp - activeBoss.hp)}</span>
              <span className="text-xs font-mono text-text-secondary">{formatNumber(activeBoss.hp)} HP remaining</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Life-system summaries */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/operations" className="card card-hover p-4">
          <p className="section-heading">Health</p>
          <p className="text-lg font-mono font-bold mt-2">{healthDone}</p>
          <p className="text-xs text-text-tertiary mt-1">completed tracked units</p>
        </Link>
        <Link to="/operations" className="card card-hover p-4">
          <p className="section-heading">Learning</p>
          <p className="text-lg font-mono font-bold mt-2">{learningDone}</p>
          <p className="text-xs text-text-tertiary mt-1">completed tracked units</p>
        </Link>
      </div>

      {habitSlotsThisWeek > 0 && (
        <div className="card p-5">
          <StatBar label="Habits This Week" value={habitCompletionThisWeek} max={habitSlotsThisWeek} showNumbers size="sm" />
          <p className="text-xs text-text-tertiary mt-3">{stats.questsCompleted} quests done · {stats.bossesDefeated} bosses slain</p>
        </div>
      )}

      {/* Attributes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={16} className="accent-text" /> Attributes</h3>
          <Link to="/attributes" className="text-xs accent-text">Details</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ATTRIBUTES.slice(0, 4).map((attr) => <AttributeCard key={attr.id} attrId={attr.id} />)}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="card p-3 flex flex-col items-center text-center gap-1.5">
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
        <Icon size={16} className="accent-text" />
      </div>
      <p className="text-lg font-mono font-bold leading-none">{value}</p>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</p>
    </div>
  )
}
