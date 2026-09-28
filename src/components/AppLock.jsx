import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Delete, Lock, ShieldCheck } from 'lucide-react'
import { useStore } from '../store/useStore'
import { playSound, hashPin } from '../utils/helpers'
import { ASSETS } from '../config/assets'
import OptionalVideo from './OptionalVideo'

const PIN_LENGTH = 4

/**
 * Full-screen gate rendered above the whole app. Three states:
 *  - lock disabled                -> renders children immediately
 *  - lock enabled, no PIN set yet -> "create a PIN" (enter twice)
 *  - lock enabled, PIN set        -> "enter PIN" (verify)
 *
 * Unlocking is per-launch (in-memory only) — reloading the app locks
 * it again, same as a phone lock screen. This is a local deterrent for
 * someone picking up the device, not account-level security.
 */
export default function AppLock({ children }) {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const playerName = useStore((s) => s.player?.name)

  // Only a lock that was already configured when this session started should gate the current session.
  // Turning App Lock on in Settings should not instantly lock the user out before setup completes.
  const gateThisSessionRef = useRef(Boolean(settings.pinEnabled && settings.pinHash))
  const [unlocked, setUnlocked] = useState(false)
  const [stage1, setStage1] = useState(null) // first entry during PIN creation
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [mode, setMode] = useState('verify') // 'verify' | 'create-first' | 'create-confirm'

  const needsGate = gateThisSessionRef.current && settings.pinEnabled && Boolean(settings.pinHash) && !unlocked

  useEffect(() => {
    if (!needsGate) return
    setMode('verify')
    setInput('')
    setStage1(null)
    setError(false)
  }, [needsGate])

  const title = useMemo(() => {
    if (mode === 'create-first') return 'Create your PIN'
    if (mode === 'create-confirm') return 'Confirm your PIN'
    return `Welcome back${playerName ? `, ${playerName}` : ''}`
  }, [mode, playerName])

  const subtitle = mode === 'verify' ? 'Enter your PIN to continue' : `${PIN_LENGTH}-digit PIN`

  const submit = (value) => {
    if (mode === 'create-first') {
      setStage1(value)
      setInput('')
      setMode('create-confirm')
      playSound('open')
      return
    }
    if (mode === 'create-confirm') {
      if (value === stage1) {
        updateSettings({ pinHash: hashPin(value) })
        playSound('success')
        setUnlocked(true)
      } else {
        setError(true)
        playSound('error')
        setInput('')
        setTimeout(() => { setError(false); setMode('create-first'); setStage1(null) }, 480)
      }
      return
    }
    // verify
    if (hashPin(value) === settings.pinHash) {
      playSound('success')
      setUnlocked(true)
    } else {
      setError(true)
      playSound('error')
      setTimeout(() => { setError(false); setInput('') }, 420)
    }
  }

  const press = (digit) => {
    if (input.length >= PIN_LENGTH || error) return
    const next = input + digit
    playSound('click')
    setInput(next)
    if (next.length === PIN_LENGTH) setTimeout(() => submit(next), 90)
  }

  const backspace = () => {
    if (error) return
    playSound('click')
    setInput((v) => v.slice(0, -1))
  }

  const forgotPin = () => {
    if (typeof window === 'undefined') return
    const ok = window.confirm('Turn off App Lock? You will need to set a new PIN to re-enable it.')
    if (ok) {
      updateSettings({ pinEnabled: false, pinHash: '' })
      setUnlocked(true)
    }
  }

  return (
    <>
      {!needsGate && children}
      <AnimatePresence>
        {needsGate && (
          <motion.div
            key="app-lock"
            className="applock-root"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(18px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <OptionalVideo src={ASSETS.video.dashboardLoop} className="applock-bg-video" />
            <div className="applock-vignette" />

            <motion.div
              className="applock-card"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="applock-icon"><Lock size={22} /></div>
              <h2 className="applock-title">{title}</h2>
              <p className="applock-subtitle">{subtitle}</p>

              <motion.div
                className="applock-dots"
                animate={error ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.42 }}
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <span key={i} className={`applock-dot ${i < input.length ? 'is-filled' : ''} ${error ? 'is-error' : ''}`} />
                ))}
              </motion.div>

              <div className="applock-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button key={d} type="button" className="applock-key" data-sound-click="false" data-sound-hover="false" onClick={() => press(d)}>{d}</button>
                ))}
                <span />
                <button type="button" className="applock-key" data-sound-click="false" data-sound-hover="false" onClick={() => press('0')}>0</button>
                <button type="button" className="applock-key applock-key-ghost" data-sound-click="false" data-sound-hover="false" onClick={backspace} aria-label="Backspace"><Delete size={18} /></button>
              </div>

              {mode === 'verify' && (
                <button type="button" className="applock-forgot" onClick={forgotPin}>Forgot PIN?</button>
              )}
              {mode !== 'verify' && (
                <p className="applock-hint"><ShieldCheck size={12} /> Stored only on this device</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
