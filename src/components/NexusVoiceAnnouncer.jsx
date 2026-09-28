import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { speakText } from '../utils/nativeServices'

const speechFor = (notification) => {
  const type = notification?.type
  if (type === 'quest') return 'Quest complete. Experience gained.'
  if (type === 'levelup') return 'Level up detected.'
  if (type === 'boss') return 'Boss defeated. Rewards unlocked.'
  if (type === 'achievement') return 'Achievement unlocked.'
  if (type === 'attr-levelup') return `${notification?.title || 'Attribute'} increased.`
  if (type === 'system' && /Quest Registered/i.test(notification.desc || '')) return 'Quest registered.'
  if (type === 'error') return 'Action could not be completed.'
  return null
}

export default function NexusVoiceAnnouncer() {
  const notifications = useStore((s) => s.notifications || [])
  const settings = useStore((s) => s.settings)
  const lastSpoken = useRef(null)
  const greetingSpoken = useRef(false)

  useEffect(() => {
    if (!settings.voiceEnabled) {
      greetingSpoken.current = false
      return
    }

    const speakGreeting = async () => {
      if (greetingSpoken.current) return
      greetingSpoken.current = true
      await speakText(`Welcome back, ${useStore.getState().player.name || 'Operator'}.`, {
        volume: settings.voiceVolume,
        rate: settings.voiceRate,
        voiceName: settings.voiceName,
        lang: settings.voiceLanguage || 'en-US',
      })
    }

    // A short delay lets Android initialise its TTS engine after a settings toggle.
    const timer = window.setTimeout(speakGreeting, 120)
    return () => window.clearTimeout(timer)
  }, [settings.voiceEnabled, settings.voiceName, settings.voiceProfile, settings.voiceRate, settings.voiceVolume])

  useEffect(() => {
    if (!settings.voiceEnabled) return
    const newest = notifications[0]
    if (!newest || newest.id === lastSpoken.current) return
    const text = speechFor(newest)
    lastSpoken.current = newest.id
    if (!text) return
    void speakText(text, {
      volume: settings.voiceVolume,
      rate: settings.voiceRate,
      voiceName: settings.voiceName,
      profile: settings.voiceProfile || 'friendly-woman',
      lang: settings.voiceLanguage || 'en-US',
    })
  }, [notifications, settings.voiceEnabled, settings.voiceName, settings.voiceProfile, settings.voiceRate, settings.voiceVolume])

  return null
}
