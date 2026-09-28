import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Trophy, Skull, Sparkles, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'
import { playSound } from '../utils/helpers'
import { ASSETS } from '../config/assets'
import { burstParticles } from './particles'

const EVENT_META = {
  levelup: { label: 'LEVEL UP', kicker: 'SYSTEM ASCENSION', Icon: Zap, image: ASSETS.levelupRune },
  boss: { label: 'BOSS DEFEATED', kicker: 'THREAT ELIMINATED', Icon: Skull, image: ASSETS.levelupEnergy },
  achievement: { label: 'ACHIEVEMENT UNLOCKED', kicker: 'NEW SYSTEM MEMORY', Icon: Trophy, image: ASSETS.levelupEnergy },
}

export default function CinematicEvents() {
  const notifications = useStore((s) => s.notifications || [])
  const [event, setEvent] = useState(null)
  const seen = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    const latest = notifications[0]
    if (!latest?.id) return
    if (seen.current == null) {
      seen.current = latest.id
      return
    }
    if (latest.id === seen.current) return
    seen.current = latest.id
    if (!EVENT_META[latest.type]) return

    const meta = EVENT_META[latest.type]
    setEvent({ ...latest, meta, key: `${latest.id}-${Date.now()}` })
    if (latest.type === 'levelup') playSound('levelup')
    else playSound('success')

    const x = window.innerWidth / 2
    const y = window.innerHeight * 0.46
    burstParticles(x, y, { count: latest.type === 'levelup' ? 26 : 18 })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setEvent(null), latest.type === 'levelup' ? 3200 : 2400)

    return () => clearTimeout(timer.current)
  }, [notifications])

  useEffect(() => () => clearTimeout(timer.current), [])

  if (typeof document === 'undefined') return null
  const EventIcon = event?.meta?.Icon || Sparkles

  return createPortal(
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.key}
          className="apex-cinematic-event"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="apex-cinematic-vignette" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="apex-cinematic-core"
            initial={{ opacity: 0, scale: 0.72, y: 35, filter: 'blur(18px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.06, y: -12, filter: 'blur(10px)' }}
            transition={{ type: 'spring', stiffness: 190, damping: 20, mass: 1.1 }}
          >
            <motion.div
              className="apex-cinematic-rings"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div className="apex-cinematic-art" animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
              <img src={event.meta.image} alt="" />
            </motion.div>
            <motion.div className="apex-cinematic-icon" initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.18, type: 'spring', stiffness: 260, damping: 14 }}>
              <EventIcon size={24} />
            </motion.div>
            <p className="apex-cinematic-kicker">{event.meta.kicker}</p>
            <motion.h2 initial={{ opacity: 0, y: 18, letterSpacing: '0.4em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.12em' }} transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>{event.meta.label}</motion.h2>
            <motion.p className="apex-cinematic-desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.45 }}>{event.desc}</motion.p>
            <motion.div className="apex-cinematic-sweep" initial={{ x: '-120%' }} animate={{ x: '120%' }} transition={{ duration: 1.1, delay: 0.22, ease: 'power3.inOut' }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
