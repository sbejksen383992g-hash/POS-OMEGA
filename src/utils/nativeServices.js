import { Capacitor } from '@capacitor/core'
import { isQuestOnApprovedLeave, localDateKey } from './leaveEngine'
import { LocalNotifications } from '@capacitor/local-notifications'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'

export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

let nexusNativePromise = null
let nexusNativeSpeechListeners = []

async function getNexusNativeBridge() {
  if (!isNativeApp()) return null
  if (!nexusNativePromise) {
    nexusNativePromise = import('@apex/nexus-native').then((m) => m.NexusNative).catch(() => null)
  }
  return nexusNativePromise
}

async function clearNexusNativeSpeechListeners() {
  for (const listener of nexusNativeSpeechListeners) {
    try { await listener?.remove?.() } catch {}
  }
  nexusNativeSpeechListeners = []
}

const notificationChannelId = 'pos-alarms'
let channelReady = false

export const notificationIdFor = (id) => {
  const source = String(id || 'alarm')
  let hash = 2166136261
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash % 2147483000) + 1
}

async function ensureNotificationChannel() {
  if (!isNativeApp()) return false
  try {
    if (!channelReady && LocalNotifications.createChannel) {
      await LocalNotifications.createChannel({
        id: notificationChannelId,
        name: 'POS Alarms',
        description: 'Scheduled POS reminders and execution alerts.',
        importance: 4,
        visibility: 1,
      })
      channelReady = true
    }
    return true
  } catch {
    return false
  }
}

export async function ensureNativeNotificationPermission() {
  if (!isNativeApp()) return false
  try {
    const current = await LocalNotifications.checkPermissions()
    if (current.display !== 'granted') {
      const requested = await LocalNotifications.requestPermissions()
      if (requested.display !== 'granted') return false
    }
    return await ensureNotificationChannel()
  } catch {
    return false
  }
}

export async function getNotificationHealth() {
  if (isNativeApp()) {
    try {
      const permission = await LocalNotifications.checkPermissions()
      return {
        native: true,
        available: permission.display === 'granted',
        detail: permission.display,
      }
    } catch {
      return { native: true, available: false, detail: 'Native notification service unavailable' }
    }
  }

  if (typeof Notification === 'undefined') {
    return { native: false, available: false, detail: 'Browser notifications unavailable' }
  }
  return { native: false, available: Notification.permission === 'granted', detail: Notification.permission }
}

export async function scheduleNativeAlarm(alarm, leaveRequests = []) {
  if (!isNativeApp() || !alarm?.enabled) return false
  if (alarm.linkedQuestId) {
    const alarmDate = new Date(alarm.time)
    if (!Number.isNaN(alarmDate.getTime()) && isQuestOnApprovedLeave(leaveRequests, alarm.linkedQuestId, localDateKey(alarmDate))) return false
  }
  const granted = await ensureNativeNotificationPermission()
  if (!granted) return false

  try {
    const id = notificationIdFor(alarm.id)
    await LocalNotifications.cancel({ notifications: [{ id }] })
    const at = new Date(alarm.time)
    if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) return false

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: `POS · ${alarm.title}`,
          body: alarm.note || 'Scheduled POS reminder.',
          channelId: notificationChannelId,
          schedule: {
            at,
            repeats: alarm.repeat === 'daily',
            allowWhileIdle: true,
          },
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

export async function cancelNativeAlarm(alarmId) {
  if (!isNativeApp()) return false
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationIdFor(alarmId) }] })
    return true
  } catch {
    return false
  }
}

export async function syncNativeAlarms(alarms = [], leaveRequests = []) {
  if (!isNativeApp()) return false
  try {
    const permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') return false
    await ensureNotificationChannel()

    const pending = await LocalNotifications.getPending()
    if (pending.notifications?.length) {
      const known = new Set(alarms.map((a) => notificationIdFor(a.id)))
      const stale = pending.notifications.filter((n) => !known.has(Number(n.id))).map((n) => ({ id: Number(n.id) }))
      if (stale.length) await LocalNotifications.cancel({ notifications: stale })
    }
    const active = alarms.filter((a) => a.enabled && new Date(a.time).getTime() > Date.now())
    for (const alarm of active) await scheduleNativeAlarm(alarm, leaveRequests)
    return true
  } catch {
    return false
  }
}

export const NEXUS_VOICE_PROFILES = {
  'friendly-woman': { label: 'Friendly Woman', rate: 1.02, pitch: 1.12, description: 'Warm, natural assistant', gender: 'female', preferredNames: ['samantha', 'female'] },
  'girl': { label: 'Girl', rate: 1.08, pitch: 1.22, description: 'Bright and energetic', gender: 'female', preferredNames: ['girl', 'female'] },
  'woman': { label: 'Woman', rate: 0.98, pitch: 1.08, description: 'Clear and composed', gender: 'female', preferredNames: ['woman', 'female'] },
  'friendly-man': { label: 'Friendly Man', rate: 1.01, pitch: 0.94, description: 'Warm and conversational', gender: 'male', preferredNames: ['alex', 'male'] },
  'boy': { label: 'Boy', rate: 1.12, pitch: 1.04, description: 'Young and energetic', gender: 'male', preferredNames: ['boy', 'male'] },
  'man': { label: 'Man', rate: 0.96, pitch: 0.86, description: 'Deep and steady', gender: 'male', preferredNames: ['man', 'male'] },
  'ceo': { label: 'CEO', rate: 0.88, pitch: 0.78, description: 'Executive, deliberate and concise', gender: 'male', preferredNames: ['male'] },
  'commander': { label: 'Commander', rate: 0.92, pitch: 0.82, description: 'Tactical system voice', gender: 'male', preferredNames: ['commander'] },
  'microsoft-david': { label: 'Microsoft David', rate: 0.92, pitch: 0.86, description: 'Windows-style male voice when installed', gender: 'male', preferredNames: ['microsoft david', 'david'] },
}

export const getVoiceProfile = (id = 'friendly-woman') => NEXUS_VOICE_PROFILES[id] || NEXUS_VOICE_PROFILES['friendly-woman']

const languageNames = {
  en: 'English', hi: 'Hindi', kn: 'Kannada', te: 'Telugu', ta: 'Tamil', ml: 'Malayalam',
  mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi', ur: 'Urdu', fr: 'French',
  de: 'German', es: 'Spanish', it: 'Italian', pt: 'Portuguese', ja: 'Japanese', zh: 'Chinese',
  ko: 'Korean', ru: 'Russian', ar: 'Arabic',
}

function voiceLanguageLabel(lang = '') {
  const parts = String(lang).replace('_', '-').split('-')
  const base = parts[0].toLowerCase()
  const region = parts[1] ? parts[1].toUpperCase() : ''
  return `${languageNames[base] || base.toUpperCase()}${region ? ` (${region})` : ''}`
}

function parseAndroidVoiceName(rawName = '', lang = '') {
  const raw = String(rawName || '').trim()
  const lower = raw.toLowerCase()
  const match = lower.match(/#(male|female)_(\d+)/)
  const gender = match?.[1] || (lower.includes('male') ? 'male' : lower.includes('female') ? 'female' : '')
  const variantNumber = match?.[2] || ''
  const variantMatch = lower.match(/-x-([a-z0-9]+)/)
  const variant = variantMatch?.[1] ? variantMatch[1].toUpperCase() : ''
  const network = lower.endsWith('-network') || lower.includes('-network')
  const local = lower.endsWith('-local') || lower.includes('-local')
  const languageLabel = voiceLanguageLabel(lang || raw.split('-x-')[0])

  // Android exposes entries such as en-US-language which describe a locale,
  // not a selectable voice. Those are filtered before this function is used.
  const parts = [languageLabel]
  if (variant) parts.push(variant)
  if (gender) parts.push(`${gender === 'male' ? 'Male' : 'Female'}${variantNumber ? ` ${variantNumber}` : ''}`)
  if (local) parts.push('Local')
  else if (network) parts.push('Network')

  return parts.join(' · ')
}

function normalizeVoice(voice, index = 0) {
  const rawName = String(voice?.name || voice?.voiceName || voice?.identifier || '').trim()
  const voiceURI = String(voice?.voiceURI || voice?.id || rawName || `native-${index}`).trim()
  const lang = String(voice?.lang || voice?.locale || voice?.language || '').trim()
  const rawId = rawName || voiceURI || `native-${index}`
  return {
    ...voice,
    id: rawId,
    name: rawName || voiceURI || `Android Voice ${index + 1}`,
    lang,
    voiceURI,
    index,
    voiceIndex: index,
    localService: voice?.localService !== false,
    default: !!voice?.default,
    displayName: parseAndroidVoiceName(rawName || voiceURI, lang),
  }
}

function isLocaleOnlyVoice(voice) {
  const name = String(voice?.name || voice?.voiceURI || '').toLowerCase().trim()
  const lang = String(voice?.lang || '').toLowerCase().trim()
  if (!name) return true
  if (name === lang) return true
  if (/-language$/.test(name)) return true
  return false
}

function voiceText(voice) {
  return `${voice?.name || ''} ${voice?.voiceURI || ''} ${voice?.displayName || ''} ${voice?.lang || ''}`.toLowerCase()
}

// Desktop/browser voice packs rarely label gender explicitly in the name,
// but many well-known ones use a first name that reliably implies one —
// used only as a fallback when there is no explicit #male/#female marker.
const COMMON_MALE_VOICE_NAMES = ['david', 'mark', 'james', 'alex', 'daniel', 'thomas', 'fred', 'george', 'ravi', 'rishi', 'guy', 'oliver', 'aaron', 'arthur', 'eddy']
const COMMON_FEMALE_VOICE_NAMES = ['zira', 'samantha', 'victoria', 'karen', 'susan', 'priya', 'moira', 'tessa', 'fiona', 'kate', 'serena', 'allison', 'ava', 'veena', 'lekha']

function genderScore(voice, gender) {
  const text = voiceText(voice)
  const explicitMale = /#male(?:_|-|\b)|[-_ ]male\b|\bmale\b/.test(text)
  const explicitFemale = /#female(?:_|-|\b)|[-_ ]female\b|\bfemale\b/.test(text)
  if (explicitMale || explicitFemale) {
    if (gender === 'male') return explicitMale ? 100 : -100
    if (gender === 'female') return explicitFemale ? 100 : -100
    return 0
  }
  // Fall back to common proper-name conventions (e.g. "Microsoft David",
  // "Google UK English Female" without the word itself, "Samantha").
  const nameMale = COMMON_MALE_VOICE_NAMES.some((n) => text.includes(n))
  const nameFemale = COMMON_FEMALE_VOICE_NAMES.some((n) => text.includes(n))
  if (gender === 'male') return nameMale ? 60 : nameFemale ? -60 : 0
  if (gender === 'female') return nameFemale ? 60 : nameMale ? -60 : 0
  return 0
}

function languageScore(voice, lang = 'en-US') {
  const wanted = String(lang || 'en-US').toLowerCase().replace('_', '-')
  const actual = String(voice?.lang || '').toLowerCase().replace('_', '-')
  if (!actual) return 0
  if (actual === wanted) return 100
  if (actual.split('-')[0] === wanted.split('-')[0]) return 50
  return -100
}

function voiceLooksSelectable(voice) {
  if (!voice || isLocaleOnlyVoice(voice)) return false
  const raw = String(voice.name || voice.voiceURI || '').toLowerCase()
  // Prefer real voice variants. A plain locale voice can still be usable if
  // it is the only option, but it is not shown as a separate selectable voice.
  return !!raw
}

export async function getAvailableVoices() {
  if (isNativeApp()) {
    try {
      const result = await TextToSpeech.getSupportedVoices()
      const voices = Array.isArray(result?.voices) ? result.voices : []
      const normalized = voices.map(normalizeVoice).filter(voiceLooksSelectable)
      const seen = new Set()
      return normalized.filter((voice) => {
        const key = `${voice.name}|${voice.lang}|${voice.voiceURI}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } catch {
      return []
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      return window.speechSynthesis.getVoices().map((voice, index) => ({
        ...voice,
        id: voice.voiceURI || voice.name || `web-${index}`,
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI,
        localService: voice.localService !== false,
        default: !!voice.default,
        index,
        voiceIndex: index,
        displayName: voice.name,
      }))
    } catch {
      return []
    }
  }
  return []
}

function findVoice(voices, saved) {
  if (!saved) return null
  return voices.find((voice) =>
    voice.id === saved || voice.name === saved || voice.voiceURI === saved
  ) || null
}

// Voices reported by the Android TTS engine are cached briefly: querying the engine on every
// utterance is slow and made spoken replies start late on mid-range phones.
let voiceCache = { at: 0, voices: [] }
const VOICE_CACHE_MS = 60000
let lastVoiceResolution = null

async function getNativeVoicesCached(force = false) {
  if (!force && voiceCache.voices.length && Date.now() - voiceCache.at < VOICE_CACHE_MS) return voiceCache.voices
  const supported = await TextToSpeech.getSupportedVoices()
  const raw = Array.isArray(supported?.voices) ? supported.voices : []
  // The plugin addresses a voice by its index in THIS array, so keep the original index.
  voiceCache = { at: Date.now(), voices: raw.map((voice, index) => normalizeVoice(voice, index)) }
  return voiceCache.voices
}

export const invalidateVoiceCache = () => { voiceCache = { at: 0, voices: [] } }
export const getLastVoiceResolution = () => lastVoiceResolution

const PROFILE_ORDER = Object.keys(NEXUS_VOICE_PROFILES)

function explicitGender(voice) {
  const text = voiceText(voice)
  if (/#male(?:_|-|\b)|[-_ ]male\b|\bmale\b/.test(text) && !/female/.test(text)) return 'male'
  if (/#female(?:_|-|\b)|[-_ ]female\b|\bfemale\b/.test(text)) return 'female'
  if (COMMON_MALE_VOICE_NAMES.some((n) => text.includes(n))) return 'male'
  if (COMMON_FEMALE_VOICE_NAMES.some((n) => text.includes(n))) return 'female'
  return ''
}

/**
 * Persona → real installed voice. Never claims a voice that does not exist.
 * Order: explicit device voice → exact persona name (e.g. "David") → gender match →
 * deterministic persona slot among installed voices → engine default.
 * Returns { voice, mode, requestedUnavailable, note }.
 */
export function resolveVoice({ profileId = 'friendly-woman', lang = 'en-US', voiceName = '', voices = [] } = {}) {
  const list = (voices || []).filter(voiceLooksSelectable)
  const profile = getVoiceProfile(profileId)
  const result = { voice: null, mode: 'default', requestedUnavailable: '', note: '' }
  if (!list.length) return { ...result, note: 'The Android speech engine reported no selectable voices; using the engine default.' }

  if (voiceName) {
    const explicit = findVoice(list, voiceName)
    if (explicit) return { ...result, voice: explicit, mode: 'explicit', note: 'Voice chosen manually in Device Voice.' }
    result.note = 'The saved device voice is not installed any more; falling back to the persona.'
  }

  // Keep to the requested language family, preferring the exact locale.
  const scored = list.map((voice) => ({ voice, lang: languageScore(voice, lang) }))
  const family = scored.filter((entry) => entry.lang >= 50)
  const pool = (family.length ? family : scored).sort((x, y) => (y.lang - x.lang) || String(x.voice.name).localeCompare(String(y.voice.name)))
  const candidates = pool.map((entry) => entry.voice)

  // 1) Persona names a specific voice (Microsoft David). Only "matches" if it truly exists.
  const named = (profile.preferredNames || []).map((n) => String(n).toLowerCase()).filter((n) => n.length > 3 && n !== 'male' && n !== 'female')
  if (profileId === 'microsoft-david') {
    const david = candidates.find((voice) => /david/.test(voiceText(voice)))
    if (david) return { ...result, voice: david, mode: 'exact', note: 'Installed voice matches "David".' }
    result.requestedUnavailable = 'Microsoft David'
  } else if (named.length) {
    const exact = candidates.find((voice) => named.some((n) => voiceText(voice).includes(n)))
    if (exact) return { ...result, voice: exact, mode: 'exact', note: 'Installed voice name matches this persona.' }
  }

  // 2) Gender match, when the engine exposes gender (#male / #female / well-known names).
  const withGender = candidates.filter((voice) => explicitGender(voice))
  const wanted = withGender.filter((voice) => explicitGender(voice) === profile.gender)
  const slot = Math.max(0, PROFILE_ORDER.indexOf(profileId))
  if (wanted.length) {
    const sameGender = PROFILE_ORDER.filter((id) => getVoiceProfile(id).gender === profile.gender)
    const pick = wanted[Math.max(0, sameGender.indexOf(profileId)) % wanted.length]
    return { ...result, voice: pick, mode: 'gender', note: `Matched by ${profile.gender} voice metadata.` }
  }

  // 3) Deterministic persona slot: personas map to different installed voices when there are
  // several, so switching persona audibly changes the voice even if Android hides gender.
  const local = candidates.filter((voice) => voice.localService)
  const source = local.length ? local : candidates
  if (source.length) {
    const pick = source[slot % source.length]
    return { ...result, voice: pick, mode: 'deterministic', note: 'Android does not label voice gender here; voice assigned by persona slot. Pitch and rate shape the persona.' }
  }
  return { ...result, note: 'No installed voice fits; using the engine default.' }
}

export async function chooseVoiceForProfile(profileId = 'friendly-woman', lang = 'en-US', voicesArg = null) {
  const voices = Array.isArray(voicesArg) && voicesArg.length
    ? voicesArg.map((voice, index) => normalizeVoice(voice, voice?.index ?? index))
    : (isNativeApp() ? await getNativeVoicesCached().catch(() => []) : await getAvailableVoices())
  const { voice } = resolveVoice({ profileId, lang, voices })
  return voice ? (voice.id || voice.name || '') : ''
}

/** Human-readable, truthful description of what the persona will actually sound like. */
export async function describeVoiceChoice({ profileId = 'friendly-woman', lang = 'en-US', voiceName = '' } = {}) {
  try {
    const voices = isNativeApp() ? await getNativeVoicesCached().catch(() => []) : await getAvailableVoices()
    const r = resolveVoice({ profileId, lang, voices })
    const name = r.voice ? (r.voice.displayName || r.voice.name) : 'engine default voice'
    const unavailable = r.requestedUnavailable ? `${r.requestedUnavailable} is not installed on this device. ` : ''
    return { ...r, name, text: `${unavailable}Speaking with: ${name}. ${r.note}`.trim() }
  } catch {
    return { voice: null, mode: 'default', name: 'engine default voice', requestedUnavailable: '', note: '', text: 'Speaking with the engine default voice.' }
  }
}

let speechRequestId = 0

export async function speakText(text, { volume = 0.7, rate = 1, pitch = 1, voiceName = '', lang = 'en-IN', profile = '' } = {}) {
  if (!text) return false
  const requestId = ++speechRequestId
  const voiceProfile = getVoiceProfile(profile)
  const finalRate = Math.max(0.5, Math.min(2, (Number(rate) || 1) * voiceProfile.rate))
  const finalPitch = Math.max(0.5, Math.min(2, (Number(pitch) || 1) * voiceProfile.pitch))

  if (isNativeApp()) {
    try {
      await TextToSpeech.stop()
      if (requestId !== speechRequestId) return false

      const voices = await getNativeVoicesCached()
      if (requestId !== speechRequestId) return false
      const resolution = resolveVoice({ profileId: profile || 'friendly-woman', lang, voiceName, voices })
      lastVoiceResolution = { ...resolution, at: Date.now() }
      const chosen = resolution.voice

      const payload = {
        text,
        lang,
        rate: finalRate,
        pitch: finalPitch,
        volume: Math.max(0, Math.min(1, Number(volume) || 0.7)),
        queueStrategy: 0,
      }

      // Use the resolved voice's own locale so the engine does not silently switch voices.
      if (chosen && Number.isFinite(Number(chosen.index))) {
        payload.voice = Number(chosen.index)
        if (chosen.lang) payload.lang = String(chosen.lang).replace('_', '-')
      }

      if (!chosen) {
        try {
          const languageCheck = await TextToSpeech.isLanguageSupported({ lang })
          if (languageCheck?.supported === false && lang !== 'en-US') payload.lang = 'en-US'
        } catch {
          // Some Android engines do not expose the locale probe.
        }
      }

      try {
        await TextToSpeech.speak(payload)
      } catch (speakError) {
        // A stale voice index (engine updated/voices changed) must not silence Nexus: refresh and retry once.
        if (requestId !== speechRequestId) return false
        invalidateVoiceCache()
        delete payload.voice
        await TextToSpeech.speak(payload)
      }
      return true
    } catch {
      // Fall through to browser speech if native TTS is unavailable.
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      await new Promise((resolve) => {
        const speak = async () => {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.volume = Math.max(0, Math.min(1, Number(volume) || 0.7))
          utterance.rate = finalRate
          utterance.pitch = finalPitch
          utterance.lang = lang
          const voices = window.speechSynthesis.getVoices()
          // Honor an explicit device-voice pick first; otherwise apply the
          // persona's gender/language preference — the previous version
          // ignored `profile` entirely here, so the browser always fell
          // back to whatever voice the engine defaults to (commonly
          // female), regardless of the selected persona.
          let voice = voices.find((v) => v.name === voiceName || v.voiceURI === voiceName)
          if (!voice) {
            const chosenId = await chooseVoiceForProfile(profile || 'friendly-woman', lang, voices)
            voice = voices.find((v) => v.name === chosenId || v.voiceURI === chosenId)
          }
          if (voice) utterance.voice = voice
          utterance.onend = resolve
          utterance.onerror = resolve
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
        }
        if (window.speechSynthesis.getVoices().length) speak()
        else {
          const handler = () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handler)
            speak()
          }
          window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true })
          window.setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', handler)
            speak()
          }, 700)
        }
      })
      return true
    } catch {
      return false
    }
  }
  return false
}

export async function stopSpeaking() {
  speechRequestId += 1
  try { await TextToSpeech.stop() } catch {}
  try { window.speechSynthesis?.cancel() } catch {}
}

export async function voiceHealth() {
  if (isNativeApp()) {
    try {
      const result = await TextToSpeech.getSupportedLanguages()
      const languages = Array.isArray(result?.languages) ? result.languages : []
      let supportedLocale = true
      try {
        const check = await TextToSpeech.isLanguageSupported({ lang: 'en-US' })
        supportedLocale = check?.supported !== false
      } catch {
        // Treat the engine as available when the locale-specific probe is not exposed.
      }
      if (languages.length > 0 || supportedLocale) {
        return { native: true, available: true, detail: languages.length ? `Native TTS ready · ${languages.length} languages` : 'Native TTS ready' }
      }
      return { native: true, available: false, detail: 'Native TTS language pack unavailable' }
    } catch {
      // Some Android TTS engines expose speak() but not language enumeration.
      try {
        const probe = await TextToSpeech.isLanguageSupported({ lang: 'en-US' })
        if (probe?.supported) return { native: true, available: true, detail: 'Native TTS ready' }
      } catch {
        // Ignore and report unavailable.
      }
      return { native: true, available: false, detail: 'Native TTS unavailable' }
    }
  }
  return { native: false, available: typeof window !== 'undefined' && 'speechSynthesis' in window, detail: 'Browser speech synthesis' }
}

export async function nativeSpeechHealth() {
  if (!isNativeApp()) return { native: false, available: false, detail: 'Browser speech recognition' }

  try {
    const permission = await SpeechRecognition.checkPermissions().catch(() => ({}))
    const Native = await getNexusNativeBridge()
    const nativeStatus = Native?.speechAvailable ? await Native.speechAvailable().catch(() => null) : null
    const capgoStatus = await SpeechRecognition.available().catch(() => null)
    const available = !!(nativeStatus?.available || capgoStatus?.available)
    const permissionState = permission?.speechRecognition || 'unknown'
    return {
      native: true,
      available,
      onDevice: !!nativeStatus?.onDevice,
      permission: permissionState,
      detail: available
        ? (nativeStatus?.onDevice ? 'Native Android speech ready · on-device recognition available' : 'Native Android speech ready')
        : 'Speech recognition unavailable on this device',
    }
  } catch {
    return { native: true, available: false, permission: 'unknown', detail: 'Native speech recognition unavailable' }
  }
}

let nativeSpeechListeners = []
let nativeSpeechSession = 0
let nativeSpeechStartLock = null

export async function startNativeSpeech({ lang = 'en-US', onPartial, onFinal, onText, onError, onState, onReleased } = {}) {
  if (!isNativeApp()) return false

  // Android SpeechRecognizer is single-session per recognition service. Serialize
  // starts so a continuous-listening restart can never race the previous stop.
  if (nativeSpeechStartLock) {
    try { await nativeSpeechStartLock } catch { /* current starter failed; retry below */ }
  }

  const session = ++nativeSpeechSession
  const run = (async () => {
    try {
      const Native = await getNexusNativeBridge()

      // Only one Android SpeechRecognizer should own the microphone at a time.
      // If Hey Nexus wake listening is armed, pause its foreground-service
      // recognizer while the foreground AI screen captures a command.
      try { await Native?.setWakePaused?.({ paused: true }) } catch {}

      // Tear down BOTH possible recognizers before creating a new one. This is the
      // important fix for Android's ERROR_RECOGNIZER_BUSY on rapid restarts.
      try { await Native?.stopSpeech?.() } catch {}
      try { await clearNexusNativeSpeechListeners() } catch {}
      try { await SpeechRecognition.forceStop?.({ timeout: 700 }) } catch {}
      try { await SpeechRecognition.removeAllListeners?.() } catch {}
      await new Promise((resolve) => window.setTimeout(resolve, 220))

      let permissionGranted = false
      try {
        if (Native?.requestMicrophonePermission) {
          permissionGranted = !!(await Native.requestMicrophonePermission())?.granted
        }
      } catch {}
      if (!permissionGranted) {
        try {
          const permission = await SpeechRecognition.requestPermissions()
          permissionGranted = permission?.speechRecognition === 'granted'
        } catch {}
      }
      if (!permissionGranted) {
        onError?.('Microphone permission is not granted for Nexus. Open Android Settings → Apps → APEX → Permissions → Microphone and allow it.')
        return false
      }

      if (Native?.startSpeech && Native?.stopSpeech) {
        const finalise = (value) => {
          const transcript = String(value || '').trim()
          if (!transcript || session !== nativeSpeechSession) return
          onFinal?.(transcript)
          onText?.(transcript)
        }

        nexusNativeSpeechListeners.push(await Native.addListener('speechState', (event) => {
          if (session === nativeSpeechSession) onState?.(!!event?.active)
        }))
        nexusNativeSpeechListeners.push(await Native.addListener('speechPartial', (event) => {
          if (session !== nativeSpeechSession) return
          const transcript = String(event?.text || '').trim()
          if (transcript) onPartial?.(transcript)
        }))
        nexusNativeSpeechListeners.push(await Native.addListener('speechFinal', (event) => finalise(event?.text || '')))
        nexusNativeSpeechListeners.push(await Native.addListener('speechError', (event) => {
          if (session !== nativeSpeechSession) return
          const code = Number(event?.error)
          const message = String(event?.message || event?.error || 'Android speech recognition failed.')
          onState?.(false)
          onError?.(code === 8 ? 'Microphone was briefly busy. Nexus is resetting the listener.' : message, { code, recoverable: event?.recoverable })
        }))
        nexusNativeSpeechListeners.push(await Native.addListener('speechReleased', () => {
          if (session === nativeSpeechSession) onReleased?.()
        }))

        try {
          const started = await Native.startSpeech({ language: lang || 'en-IN' })
          if (started?.started !== false) {
            onState?.(true)
            return true
          }
          throw new Error(started?.error || 'Native recognizer did not start')
        } catch (error) {
          await clearNexusNativeSpeechListeners()
          onState?.(false)
          // Fall through to Capgo only when the custom native recognizer truly cannot start.
        }
      }

      const available = await SpeechRecognition.available()
      if (!available?.available) {
        onError?.('Android speech recognition is unavailable. Install or enable the device speech service, then try again.')
        return false
      }

      const locales = [...new Set([lang, 'en-IN', 'en-US'])]
      const finalise = (value) => {
        const transcript = String(value || '').trim()
        if (!transcript || session !== nativeSpeechSession) return
        onFinal?.(transcript)
        onText?.(transcript)
      }
      nativeSpeechListeners.push(await SpeechRecognition.addListener('partialResults', (event) => {
        if (session !== nativeSpeechSession) return
        const transcript = String(event?.matches?.[0] || event?.accumulatedText || event?.accumulated || '').trim()
        if (transcript) onPartial?.(transcript)
      }))
      try { nativeSpeechListeners.push(await SpeechRecognition.addListener('segmentResults', (event) => finalise(event?.matches?.[0] || ''))) } catch {}
      nativeSpeechListeners.push(await SpeechRecognition.addListener('listeningState', (event) => {
        if (session === nativeSpeechSession) onState?.(event?.status === 'started')
      }))
      nativeSpeechListeners.push(await SpeechRecognition.addListener('error', (event) => {
        if (session !== nativeSpeechSession) return
        onState?.(false)
        onError?.(String(event?.message || event?.error || 'Native speech recognition failed.'))
      }))
      try { nativeSpeechListeners.push(await SpeechRecognition.addListener('endOfSegmentedSession', () => { if (session === nativeSpeechSession) onState?.(false) })) } catch {}

      let useOnDevice = false
      try { useOnDevice = !!(await SpeechRecognition.isOnDeviceRecognitionAvailable?.()) } catch {}
      for (const locale of locales) {
        try {
          await SpeechRecognition.start({
            language: locale,
            maxResults: 3,
            partialResults: true,
            popup: false,
            allowForSilence: 2600,
            addPunctuation: true,
            ...(useOnDevice ? { useOnDeviceRecognition: true } : {}),
          })
          onState?.(true)
          return true
        } catch (error) {
          if (locale === locales[locales.length - 1]) onError?.(error?.message || 'Native speech recognition failed to start.')
        }
      }
      return false
    } catch (error) {
      onState?.(false)
      onError?.(error?.message || 'Native speech recognition failed to start.')
      return false
    }
  })()

  nativeSpeechStartLock = run
  try { return await run } finally { if (nativeSpeechStartLock === run) nativeSpeechStartLock = null }
}
export async function stopNativeSpeech() {
  if (!isNativeApp()) return false
  nativeSpeechSession += 1
  try { await nativeSpeechStartLock?.catch?.(() => {}) } catch {}
  try {
    const Native = await getNexusNativeBridge()
    await Native?.stopSpeech?.()
    // Keep the wake recognizer paused until the foreground caller explicitly
    // resumes it. This prevents a continuous voice session from racing the
    // background wake recognizer between commands.
  } catch {}
  try { await clearNexusNativeSpeechListeners() } catch {}
  try { await SpeechRecognition.forceStop?.({ timeout: 700 }) } catch {
    try { await SpeechRecognition.stop?.() } catch {}
  }
  try { await SpeechRecognition.removeAllListeners?.() } catch {}
  for (const listener of nativeSpeechListeners) { try { await listener?.remove?.() } catch {} }
  nativeSpeechListeners = []
  await new Promise((resolve) => window.setTimeout(resolve, 160))
  return true
}
let webRecognition = null
let keepListening = false
let wakeLock = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      // Re-acquire if the tab regains visibility mid-session (Android
      // releases wake locks when the screen is hidden/backgrounded).
      document.addEventListener('visibilitychange', async () => {
        if (keepListening && wakeLock === null && document.visibilityState === 'visible') {
          try { wakeLock = await navigator.wakeLock.request('screen') } catch { /* optional */ }
        }
      })
    }
  } catch { /* optional on unsupported browsers */ }
}

// Continuous, auto-restarting Web Speech recognition for the browser/WebView
// path. Stays open across multiple spoken commands — only a genuine
// permission denial or an explicit stopWebSpeech() call ends the session.
// onPartial fires on interim (in-progress) speech for live transcript
// display; onFinal fires once per completed utterance for auto-submit;
// onState reports whether the mic is actively listening right now.
export async function startWebSpeech({ lang = 'en-IN', onPartial, onFinal, onError, onState } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return false
  keepListening = true
  await requestWakeLock()
  if (webRecognition) { try { webRecognition.stop() } catch { /* optional */ } }

  const rec = new SR()
  webRecognition = rec
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = true
  rec.maxAlternatives = 1

  rec.onstart = () => onState?.(true)
  rec.onresult = (e) => {
    let interim = ''
    let final = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = e.results[i][0]?.transcript || ''
      if (e.results[i].isFinal) final += chunk
      else interim += chunk
    }
    if (interim.trim()) onPartial?.(interim.trim())
    if (final.trim()) onFinal?.(final.trim())
  }
  rec.onerror = (e) => {
    // "no-speech" and "aborted" are routine pauses in a continuous session,
    // not failures — onend will restart automatically. A denied permission
    // is fatal and needs explicit recovery from the caller.
    if (e.error === 'not-allowed' || e.error === 'permission-denied' || e.error === 'service-not-allowed') {
      keepListening = false
      onState?.(false)
      onError?.('permission-denied')
      return
    }
    if (e.error !== 'aborted' && e.error !== 'no-speech') onError?.(e.error)
  }
  rec.onend = () => {
    onState?.(false)
    if (!keepListening) return
    try { rec.start(); onState?.(true) } catch {
      setTimeout(() => {
        if (!keepListening) return
        try { rec.start(); onState?.(true) } catch { /* engine still settling; next onend retries */ }
      }, 400)
    }
  }
  try {
    rec.start()
    return true
  } catch {
    keepListening = false
    return false
  }
}

export async function stopWebSpeech() {
  keepListening = false
  try { webRecognition?.stop() } catch { /* optional */ }
  try { await wakeLock?.release() } catch { /* optional */ }
  wakeLock = null
}
