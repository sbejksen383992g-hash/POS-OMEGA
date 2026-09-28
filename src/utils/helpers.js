// ── Utility functions for POS ─────────────────────────────────────

export const cx = (...classes) => classes.filter(Boolean).join(' ')

export const formatNumber = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export const xpForLevel = (level) => Math.floor(100 * Math.pow(level, 1.4))

export const timeAgo = (ts) => {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}


export const localDateKey = (date = Date.now()) => {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const parseLocalDateKey = (key) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return null
  const [year, month, day] = String(key).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const formatDayLabel = (key) => {
  const date = parseLocalDateKey(key)
  if (!date) return ''
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export const formatDate = (ts) => {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getWeekDays = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().getDay()
  const offset = today === 0 ? 6 : today - 1
  return days.map((d, i) => ({
    name: d,
    isToday: i === offset,
    index: i,
  }))
}

// Builds a real (non-synthetic) last-N-days series from the store's
// dailyHistory map, keyed by ISO date ('YYYY-MM-DD'). Missing days are
// filled with zeros rather than invented data.
export const getDailySeries = (dailyHistory, days = 14) => {
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = localDateKey(d)
    const entry = dailyHistory?.[key] || { xp: 0, quests: 0, habits: 0 }
    out.push({
      day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      xp: entry.xp,
      quests: entry.quests,
      habits: entry.habits,
    })
  }
  return out
}

export const difficultyConfig = {
  easy: { label: 'Easy', color: '#00ff88', xp: 30, coins: 5 },
  medium: { label: 'Medium', color: '#ffaa00', xp: 60, coins: 12 },
  hard: { label: 'Hard', color: '#ff4466', xp: 120, coins: 25 },
  epic: { label: 'Epic', color: '#b366ff', xp: 250, coins: 50 },
}

export const rarityColors = {
  common: '#888888',
  rare: '#00d4ff',
  epic: '#b366ff',
  legendary: '#ffaa00',
}

// Lightweight local-only obfuscation for the App Lock PIN. This is NOT
// cryptographic security — it exists so a 4-8 digit PIN isn't sitting in
// localStorage as plain text, matching the "just keep people who pick up
// my phone out" threat model this feature targets, nothing stronger.
export const hashPin = (pin) => {
  const str = `apex-lock::${String(pin)}`
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return `p${(hash >>> 0).toString(36)}`
}

const AUDIO_CACHE = new Map()
let soundOn = true
let soundFlagAt = 0
const AUDIO_FILES = { click: 'click.mp3', hover: 'hover.mp3', open: 'open.mp3', close: 'close.mp3', success: 'success.mp3', levelup: 'levelup.mp3' }

export const playSound = (type = 'click') => {
  try {
    const nowTs = Date.now()
    if (nowTs - soundFlagAt > 2500) {
      soundFlagAt = nowTs
      try { soundOn = JSON.parse(localStorage.getItem('arise-save') || '{}')?.state?.settings?.soundEnabled !== false } catch { soundOn = true }
    }
    if (!soundOn) return

    const file = AUDIO_FILES[type]
    if (file) {
      let audio = AUDIO_CACHE.get(type)
      if (!audio) {
        audio = new Audio(`/assets/audio/${file}`)
        audio.preload = 'auto'
        AUDIO_CACHE.set(type, audio)
      }
      audio.currentTime = 0
      audio.volume = type === 'hover' ? 0.16 : type === 'click' ? 0.24 : 0.34
      const promise = audio.play()
      if (promise?.catch) promise.catch(() => {})
      return
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const notes = { error: [220], boss: [330, 494, 659] }[type] || [600]
    const now = ctx.currentTime
    notes.forEach((frequency, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type === 'error' ? 'triangle' : 'sine'
      osc.frequency.setValueAtTime(frequency, now + index * 0.09)
      gain.gain.setValueAtTime(0.0001, now + index * 0.09)
      gain.gain.exponentialRampToValueAtTime(0.045, now + index * 0.09 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.14)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + index * 0.09)
      osc.stop(now + index * 0.09 + 0.15)
    })
    setTimeout(() => ctx.close().catch(() => {}), 500)
  } catch {
    // Audio is an enhancement; it must never break the application.
  }
}
