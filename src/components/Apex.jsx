import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { burstParticles, flyXpToTarget } from '../motion/particles'

/* ── Skeleton loading (replaces spinners) ───────────────────────── */
export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function PageSkeleton({ cards = 3 }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-28 w-full" style={{ borderRadius: 24 }} />)}
    </div>
  )
}

export function useSkeleton(ms = 320) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), ms); return () => clearTimeout(t) }, [ms])
  return !ready
}

/* ── Quest checkbox: elastic tap 0.96, glow, XP particles, haptic ─ */
export function QuestCheck({ done, onComplete, label, size = 28 }) {
  const ref = useRef(null)
  const [burst, setBurst] = useState(null)

  const handle = () => {
    if (done) return
    try { navigator.vibrate?.(18) } catch { /* haptics optional */ }
    const el = ref.current
    if (el) {
      const r = el.getBoundingClientRect()
      const xpAnchor = document.getElementById('apex-xp-target') || document.querySelector('[data-apex-xp-anchor]')
      const target = xpAnchor?.getBoundingClientRect()
      const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      const to = target
        ? { x: target.left + Math.min(target.width, 40), y: target.top + target.height / 2 }
        : { x: window.innerWidth / 2, y: 28 }
      setBurst({ from, to, key: Date.now() })
      setTimeout(() => setBurst(null), 800)
      const burstTimeline = burstParticles(from.x, from.y, { count: 18 })
      if (target) {
        burstTimeline.call(() => flyXpToTarget(from.x, from.y, document.getElementById('apex-xp-target') || document.querySelector('[data-apex-xp-anchor]'), '+XP'), null, '+=0.12')
      }
    }
    onComplete?.()
  }

  return (
    <>
      <motion.button
        ref={ref}
        type="button"
        onClick={handle}
        disabled={done}
        aria-label={label}
        whileTap={{ scale: 0.96 }}
        animate={{ scale: done ? [0.96, 1.08, 1] : 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22, duration: 0.22 }}
        className={`apex-check ${done ? 'done' : ''}`}
        style={{ width: size, height: size }}
      >
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="flex">
              <Check size={size * 0.6} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {burst && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[300]">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={`${burst.key}-${i}`}
              className="xp-particle"
              style={{ left: burst.from.x, top: burst.from.y }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: [(i - 3) * 9, burst.to.x - burst.from.x],
                y: [-14 - (i % 3) * 8, burst.to.y - burst.from.y],
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0.4],
              }}
              transition={{ duration: 0.65, delay: i * 0.03, ease: 'easeOut' }}
            />
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

/* ── Animated radial progress (stroke-dashoffset) ───────────────── */
export function RadialProgress({ value = 0, size = 96, stroke = 9, label, sub }) {
  const pct = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 0 6px var(--accent-glow))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-lg leading-none">{label ?? `${Math.round(pct)}%`}</span>
        {sub && <span className="text-[9px] text-text-tertiary mt-1 uppercase tracking-wider">{sub}</span>}
      </div>
    </div>
  )
}

/* ── Weekly heatmap ─────────────────────────────────────────────── */
export function WeeklyHeatmap({ series = [] }) {
  const max = Math.max(1, ...series.map((d) => d.xp || 0))
  const weeks = []
  for (let i = 0; i < series.length; i += 7) weeks.push(series.slice(i, i + 7))
  return (
    <div className="space-y-1.5">
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1.5">
          {week.map((d, di) => {
            const level = d.xp ? Math.max(0.18, d.xp / max) : 0
            return (
              <motion.div
                key={di}
                title={`${d.day}: ${d.xp || 0} XP`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wi * 7 + di) * 0.012, duration: 0.22 }}
                className="aspect-square rounded-lg"
                style={{ background: level ? `color-mix(in srgb, var(--accent) ${Math.round(level * 100)}%, transparent)` : 'rgba(255,255,255,0.05)' }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ── Nexus visuals ──────────────────────────────────────────────── */
export function ListeningWaveform({ bars = 18 }) {
  return (
    <div className="flex items-center gap-[3px] h-6" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] h-full rounded-full origin-center"
          style={{ background: 'var(--accent)' }}
          animate={{ scaleY: [0.2, 0.4 + ((i * 37) % 60) / 100, 0.2] }}
          transition={{ duration: 0.7 + (i % 5) * 0.09, repeat: Infinity, ease: 'easeInOut', delay: i * 0.03 }}
        />
      ))}
    </div>
  )
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1.5" aria-label="Nexus is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{ y: [0, -5, 0], scaleX: [1, 1.25, 1], scaleY: [1, 0.85, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

export function NexusAvatar({ speaking = false, listening = false, size = 44, src }) {
  const resolvedSrc = src || (speaking ? '/assets/nexus/nexus-speaking.webp' : listening ? '/assets/nexus/nexus-thinking.webp' : '/assets/nexus/nexus-idle.webp')
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {speaking && [0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-2xl"
          style={{ border: '2px solid var(--accent)' }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: i * 0.7 }}
        />
      ))}
      <motion.img
        src={resolvedSrc}
        alt=""
        className="relative w-full h-full rounded-2xl object-cover border border-border-subtle"
        animate={{ scale: listening ? [1, 1.06, 1] : [1, 1.035, 1] }}
        transition={{ duration: listening ? 1.4 : 3.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ boxShadow: '0 0 24px var(--accent-glow)' }}
      />
    </div>
  )
}
