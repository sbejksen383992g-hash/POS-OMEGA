import { useStore, ATTRIBUTES } from '../store/useStore'
import { motion } from 'framer-motion'
import { StatBar } from '../components/StatComponents'
import { formatNumber } from '../utils/helpers'
import { BOSS_CATALOG } from '../utils/bosses'
import { Skull, Trophy, Gem, Coins, Zap, Clock, ChevronRight, Star, AlertCircle, Sparkles } from 'lucide-react'

const RARITY_COLORS = {
  rare: '#8ed8ff', epic: '#b89cff', legendary: '#e5b75b', mythic: '#ff7a70',
}

const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}


const BOSS_ASSETS = {
  Procrastination: '/assets/bosses/procrastination.webp',
  Distraction: '/assets/bosses/distraction.webp',
  'Comfort Zone': '/assets/bosses/comfort-zone.webp',
  Inconsistency: '/assets/bosses/inconsistency.webp',
  'Overthinking': '/assets/bosses/distraction.webp',
  'Physical Neglect': '/assets/bosses/comfort-zone.webp',
  Avoidance: '/assets/bosses/procrastination.webp',
}

export default function Bosses() {
  const bosses = useStore((s) => s.bosses)
  const bossHistory = useStore((s) => s.bossHistory)
  const lastBossVictory = useStore((s) => s.lastBossVictory)
  const stats = useStore((s) => s.stats)
  const player = useStore((s) => s.player)

  const activeBoss = bosses.find((b) => !b.defeated)
  const defeatedBosses = bossHistory
  const totalBossesInCatalog = BOSS_CATALOG.length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Boss Arena</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Shadow Bosses</h1>
        <p className="text-sm text-text-secondary mt-1">
          Defeat the current boss through quest and habit completion. A new boss spawns automatically — scaled to your level and past victories.
        </p>
      </div>

      {/* Last victory banner */}
      {lastBossVictory && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 border-success/30"
          style={{ background: 'rgba(85, 214, 160, 0.07)' }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(85, 214, 160, 0.15)' }}>
              <Trophy size={18} className="text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-success">{lastBossVictory.victoryMessage}</p>
              <p className="text-xs text-text-tertiary mt-1">
                Defeated {lastBossVictory.name} · Next opponent: <span className="accent-text font-semibold">{lastBossVictory.nextBoss}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active boss */}
      {activeBoss ? (
        <BossCard boss={activeBoss} />
      ) : (
        <div className="card p-8 text-center">
          <Skull size={32} className="accent-text mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No active boss. Complete a quest to spawn the next challenger.</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-lg font-display font-bold accent-text">{stats.bossesDefeated}</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Defeated</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-display font-bold accent-text">{totalBossesInCatalog}</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Total Roster</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-display font-bold accent-text">{player.streak}</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Day Streak</p>
        </div>
      </div>

      {/* Boss catalog preview */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles size={16} className="accent-text" /> Boss Roster
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOSS_CATALOG.map((boss) => {
            const defeated = bossHistory.some((h) => h.configId === boss.id)
            const rarityColor = RARITY_COLORS[boss.rarity] || 'var(--accent)'
            return (
              <div key={boss.id} className={`p-3 rounded-lg border ${defeated ? 'border-success/20 bg-success/5' : 'border-border-subtle bg-bg-700/40'}`}>
                <div className="flex items-start gap-3">
                  <img src={BOSS_ASSETS[boss.category] || '/assets/bosses/distraction.webp'} alt="" className="w-12 h-12 rounded-xl object-cover border border-border-subtle shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{boss.name}</p>
                      {defeated && <Trophy size={12} className="text-success shrink-0" />}
                    </div>
                    <p className="text-[10px] text-text-tertiary uppercase tracking-wider">{boss.tier}</p>
                    <p className="text-xs text-text-tertiary mt-1 line-clamp-2">{boss.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge" style={{ background: `${rarityColor}20`, color: rarityColor }}>{boss.difficulty}</span>
                      <span className="text-[10px] text-text-tertiary">{boss.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Battle history */}
      {defeatedBosses.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="accent-text" /> Battle History
          </h3>
          <div className="space-y-2">
            {defeatedBosses.slice().reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-bg-700/40">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
                  <Trophy size={14} className="accent-text" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {entry.difficulty} · {timeAgo(entry.defeatedAt)} · Streak {entry.streak}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 accent-text"><Zap size={10} />{entry.rewards.xp}</span>
                  <span className="flex items-center gap-1 text-warning"><Coins size={10} />{entry.rewards.coins}</span>
                  <span className="flex items-center gap-1 accent-text"><Gem size={10} />{entry.rewards.gems}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="accent-text mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold mb-1">How Boss Battles Work</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Bosses take damage automatically when you complete quests or habits with matching attributes.
              Each boss is scaled to your current level and number of past victories — so they grow with you.
              When defeated, a new boss is selected from the roster and spawns immediately. The APEX boss
              takes damage from all quest types.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BossCard({ boss }) {
  const rarityColor = RARITY_COLORS[boss.rarity] || 'var(--accent)'
  const damageDealt = boss.maxHp - boss.hp
  const percent = Math.round((damageDealt / boss.maxHp) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 relative overflow-hidden card-hover"
    >
      <div className="absolute inset-0 opacity-[0.07]" style={{ background: `radial-gradient(circle at 50% 0%, ${rarityColor}, transparent 70%)` }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.025, 1] }}
              transition={{ repeat: Infinity, duration: 3.5 }}
              className="w-20 h-20 rounded-2xl overflow-hidden border border-border-subtle bg-bg-800 shrink-0"
            >
              <img src={BOSS_ASSETS[boss.category] || '/assets/bosses/distraction.webp'} alt="" className="w-full h-full object-cover" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge" style={{ background: `${rarityColor}20`, color: rarityColor }}>{boss.rarity}</span>
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{boss.tier}</span>
              </div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">{boss.title}</p>
              <h2 className="text-xl font-display font-bold">{boss.name}</h2>
            </div>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-2">{boss.desc}</p>
        <p className="text-xs text-text-tertiary italic mb-4">{boss.lore}</p>

        {/* HP bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-text-secondary">Health</span>
            <span className="text-xs font-mono text-text-tertiary">
              {formatNumber(boss.hp)} / {formatNumber(boss.maxHp)} HP
            </span>
          </div>
          <StatBar value={boss.hp} max={boss.maxHp} color="var(--error)" showNumbers={false} size="lg" />
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-text-tertiary">Damage dealt: {formatNumber(damageDealt)} ({percent}%)</span>
            <span className="text-xs font-mono text-text-secondary">{formatNumber(boss.hp)} HP left</span>
          </div>
        </div>

        {/* Recommended attributes */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-xs text-text-tertiary uppercase font-semibold">Weak to:</span>
          {boss.recommendedAttributes?.map((attrId) => {
            const attr = ATTRIBUTES.find((a) => a.id === attrId)
            return attr ? (
              <span key={attrId} className="badge" style={{ background: `${attr.color}20`, color: attr.color }}>
                {attr.icon} {attr.name}
              </span>
            ) : null
          })}
        </div>

        {/* Rewards */}
        <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary uppercase font-semibold">Rewards:</span>
          <div className="flex items-center gap-1.5 text-sm"><Zap size={14} className="accent-text" /><span className="font-mono">{formatNumber(boss.reward.xp)}</span></div>
          <div className="flex items-center gap-1.5 text-sm"><Coins size={14} className="text-warning" /><span className="font-mono">{formatNumber(boss.reward.coins)}</span></div>
          <div className="flex items-center gap-1.5 text-sm"><Gem size={14} className="accent-text" /><span className="font-mono">{formatNumber(boss.reward.gems)}</span></div>
        </div>

        <p className="text-xs text-text-tertiary mt-3 italic">
          Deal {formatNumber(boss.hp)} more damage to defeat this boss.
        </p>
      </div>
    </motion.div>
  )
}
