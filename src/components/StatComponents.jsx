import { ATTRIBUTES, useStore } from '../store/useStore'
import { cx, formatNumber, xpForLevel } from '../utils/helpers'
import { motion } from 'framer-motion'

export function StatBar({ label, value, max, color, showNumbers = true, size = 'md' }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          {showNumbers && (
            <span className="text-xs font-mono text-text-tertiary">{value}/{max}</span>
          )}
        </div>
      )}
      <div className={cx('progress-bar', size === 'sm' && 'h-1', size === 'lg' && 'h-2.5')}>
        <motion.div
          className="progress-fill"
          style={{ width: '100%', originX: 0, background: color || 'var(--accent)', boxShadow: `0 0 8px ${color || 'var(--accent-glow)'}` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function PlayerHeader() {
  const player = useStore((s) => s.player)
  const xpNeeded = xpForLevel(player.level)
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-display font-bold accent-bg">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold accent-bg">
            Lv.{player.level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-lg truncate">{player.name}</h2>
          <p className="text-xs text-text-tertiary">{player.title}</p>
        </div>
      </div>
      <div id="apex-xp-target"><StatBar label="XP" value={player.xp} max={xpNeeded} /></div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatBar label="HP" value={player.hp} max={player.maxHp} color="var(--error)" size="sm" />
        <StatBar label="MP" value={player.mp} max={player.maxMp} color="var(--accent)" size="sm" />
      </div>
    </div>
  )
}

export function ResourceBar() {
  const player = useStore((s) => s.player)
  return (
    <div className="flex items-center gap-3" data-apex-xp-anchor>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass">
        <span className="text-sm">🪙</span>
        <span className="text-sm font-mono font-semibold">{formatNumber(player.coins)}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass">
        <span className="text-sm">💎</span>
        <span className="text-sm font-mono font-semibold">{formatNumber(player.gems)}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass">
        <span className="text-sm">🔥</span>
        <span className="text-sm font-mono font-semibold">{player.streak}d</span>
      </div>
    </div>
  )
}

export function AttributeCard({ attrId }) {
  const attr = useStore((s) => s.attributes[attrId])
  const meta = ATTRIBUTES.find((a) => a.id === attrId)
  if (!attr || !meta) return null
  const xpNeeded = xpForLevel(attr.level)
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${meta.color}20` }}>
          {meta.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{meta.name}</h3>
          <p className="text-xs text-text-tertiary">Level {attr.level}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-tertiary">Total XP</p>
          <p className="text-sm font-mono font-semibold">{formatNumber(attr.totalXp)}</p>
        </div>
      </div>
      <StatBar value={attr.xp} max={xpNeeded} color={meta.color} showNumbers={false} size="sm" />
    </div>
  )
}
