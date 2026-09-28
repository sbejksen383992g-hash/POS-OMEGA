import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import Layout from './components/Layout'
import ErrorBoundary, { SilentBoundary } from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Quests from './pages/Quests'
import Habits from './pages/Habits'
import Bosses from './pages/Bosses'
import Attributes from './pages/Attributes'
import Analytics from './pages/Analytics'
import Journal from './pages/Journal'
import SkillTree from './pages/SkillTree'
import AICommand from './pages/AICommand'
import Settings from './pages/Settings'
import Operations from './pages/Operations'
import Achievements from './pages/Achievements'
import Calendar from './pages/Calendar'
import Leave from './pages/Leave'
import Profile from './pages/Profile'
import Today from './pages/Today'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useStore } from './store/useStore'
import { isVoiceBusy } from './utils/voiceController'
import { getPendingWakeCommand, clearPendingWakeCommand, startBackgroundWake, stopBackgroundWake, setWakePaused, isNativeAndroid, getOwnerAuthorizationStatus } from './utils/nexusDevice'

function NexusBackgroundController() {
  const settings = useStore((s) => s.settings)
  const navigate = useNavigate()

  useEffect(() => {
    const syncWake = async () => {
      if (!isNativeAndroid() || !settings.voiceEnabled || settings.wakeWordEnabled === false || settings.backgroundWakeEnabled !== true) {
        await stopBackgroundWake()
        return
      }
      if (settings.nexusOwnerVerification === true) {
        const owner = await getOwnerAuthorizationStatus()
        if (!owner?.authorized) return
      }
      // Never hand the microphone back to the wake listener while the foreground recognizer owns it.
      if (isVoiceBusy()) return
      await startBackgroundWake('nexus')
      await setWakePaused(false)
    }
    void syncWake()
    return () => {}
  }, [settings.voiceEnabled, settings.wakeWordEnabled, settings.backgroundWakeEnabled])

  useEffect(() => {
    if (!isNativeAndroid() || settings.backgroundWakeEnabled !== true) return undefined
    let cancelled = false
    let busy = false
    const check = async () => {
      if (cancelled || busy || document.visibilityState === 'hidden') return
      busy = true
      try {
        const command = await getPendingWakeCommand()
        if (command === null || cancelled) return
        // Empty command means the user only said "Hey Nexus"; AICommand opens the mic automatically.
        await clearPendingWakeCommand()
        navigate(`/ai?wake=${encodeURIComponent(command)}`)
      } catch { /* wake bridge unavailable: app keeps working */ } finally { busy = false }
    }
    // Event driven instead of a permanent 1.5s bridge loop: check when the app becomes visible
    // (the wake service launches the activity), plus a slow safety poll only while visible.
    void check()
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    const poll = window.setInterval(check, 4000)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      clearInterval(poll)
    }
  }, [navigate, settings.backgroundWakeEnabled])

  return null
}

export default function App() {
  const location = useLocation()
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  return (
    <MotionConfig reducedMotion={mobile ? 'always' : 'never'}>
      <Layout>
        <SilentBoundary name="nexus-background"><NexusBackgroundController /></SilentBoundary>
      <ErrorBoundary key={location.pathname}>
        {mobile ? (
          // Mobile: one page in the DOM at a time. No page transition layer.
          <div key={location.pathname}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/today" element={<Today />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/bosses" element={<Bosses />} />
              <Route path="/attributes" element={<Attributes />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/skilltree" element={<SkillTree />} />
              <Route path="/ai" element={<AICommand />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
        ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 24, scale: 0.985, filter: 'blur(14px)', clipPath: 'inset(2% 1% 0 1% round 22px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0 0 round 0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.992, filter: 'blur(10px)', clipPath: 'inset(0 0 2% 0 round 22px)' }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/today" element={<Today />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/bosses" element={<Bosses />} />
              <Route path="/attributes" element={<Attributes />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/skilltree" element={<SkillTree />} />
              <Route path="/ai" element={<AICommand />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        )}
        </ErrorBoundary>
      </Layout>
    </MotionConfig>
  )
}
