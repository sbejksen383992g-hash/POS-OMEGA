import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { isNativeApp, syncNativeAlarms } from '../utils/nativeServices'

const notify = async (title, body) => {
  if (isNativeApp()) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try { new Notification(title, { body, icon: '/icon.svg', tag: `pos-${Date.now()}` }) } catch { /* browser notification is optional */ }
}

const beep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 740
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.85)
    window.setTimeout(() => ctx.close?.(), 1000)
  } catch { /* optional audio */ }
}

export default function AlarmScheduler() {
  const alarms = useStore((s) => s.alarms || [])
  const updateAlarm = useStore((s) => s.updateAlarm)
  const pushNotification = useStore((s) => s.pushNotification)
  const settings = useStore((s) => s.settings)
  const leaveRequests = useStore((s) => s.leaveRequests || [])

  useEffect(() => {
    if (!isNativeApp()) return undefined
    void syncNativeAlarms(alarms, leaveRequests)
    return undefined
  }, [alarms, leaveRequests])

  useEffect(() => {
    // The native scheduler owns delivery when POS is installed as an Android app.
    // This lightweight loop only provides in-app/browser feedback while POS is open.
    if (isNativeApp()) return undefined

    const tick = () => {
      const now = Date.now()
      alarms.forEach((alarm) => {
        if (!alarm.enabled) return
        if (alarm.linkedQuestId) {
          const alarmDate = new Date(alarm.time)
          const key = Number.isNaN(alarmDate.getTime()) ? '' : alarmDate.toISOString().slice(0, 10)
          const exempt = leaveRequests.some((entry) => entry.status === 'approved' && entry.questId === alarm.linkedQuestId && key >= entry.startDate && key <= entry.endDate)
          if (exempt) { updateAlarm(alarm.id, { enabled: false, leaveSuppressed: true }); return }
        }
        const target = new Date(alarm.time).getTime()
        if (!Number.isFinite(target) || target > now || (alarm.lastTriggeredAt && Math.abs(alarm.lastTriggeredAt - target) < 1000)) return

        pushNotification({ type: 'alarm', title: `Alarm — ${alarm.title}`, desc: alarm.note || 'Scheduled POS reminder.' })
        if (settings.notificationsEnabled !== false) void notify(`POS Alarm — ${alarm.title}`, alarm.note || 'Scheduled POS reminder.')
        if (settings.soundEnabled) beep()

        if (alarm.repeat === 'daily') {
          const next = new Date(alarm.time)
          while (next.getTime() <= now) next.setDate(next.getDate() + 1)
          updateAlarm(alarm.id, { time: next.toISOString(), lastTriggeredAt: target })
        } else {
          updateAlarm(alarm.id, { enabled: false, lastTriggeredAt: target })
        }
      })
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [alarms, leaveRequests, updateAlarm, pushNotification, settings.soundEnabled, settings.notificationsEnabled])

  return null
}
