import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore, ATTRIBUTES } from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { interpretCommand, detectLocalAction, generateResponse, generateQuestSuggestions, parseActionEnvelope, resolveAttributeAlias } from '../utils/aiEngine'
import { getNextBestAction, buildDailyBrief, formatDailyBrief } from '../utils/nexusAgent'
import { getNexusMemories, rememberFact, forgetFact, formatMemory } from '../utils/nexusMemory'
import { launchApp, composeSms, composeWhatsApp, openDialer, openMaps, openSystemSettings, shareText, getDeviceCapabilities, explainDeviceLimits, setWakePaused } from '../utils/nexusDevice'
import { playSound, difficultyConfig } from '../utils/helpers'
import { callAI, getProvider } from '../utils/aiProviders'
import { Bot, Send, Sparkles, Plus, Loader2, AlertCircle, RefreshCw, Trash2, Mic, Smartphone, MessageSquare, Phone, Map, Settings2, Zap, ShieldCheck, Brain, Share2, CheckCircle2 } from 'lucide-react'
import { THEMES, isThemeUnlocked } from '../utils/themes'
import { NexusAvatar, ListeningWaveform, TypingDots } from '../components/Apex'
import OptionalVideo from '../components/OptionalVideo'
import { ASSETS } from '../config/assets'
import { isNativeApp, speakText, stopSpeaking } from '../utils/nativeServices'
import { VoiceState, useVoiceState, startVoice, stopVoice, setVoiceSpeaking, voiceLabel, getVoiceState, isVoiceBusy } from '../utils/voiceController'
import { verifyNexusOwner, securityNotice, getOwnerSessionStatus, clearOwnerSession } from '../utils/nexusSecurity'
import { findContacts, pickOption, sendWhatsAppTo, deleteLastWhatsApp, getLastWhatsApp, getWeather } from '../utils/nexusAutomation'

const PAGE_MAP = {
  home: '/', dashboard: '/', quests: '/quests', quest: '/quests', habits: '/habits', bosses: '/bosses', boss: '/bosses',
  attributes: '/attributes', today: '/today', plan: '/today', analytics: '/analytics', journal: '/journal', skill: '/skilltree', 'skill tree': '/skilltree',
  nexus: '/ai', ai: '/ai', settings: '/settings', profile: '/profile', operations: '/operations', achievements: '/achievements', calendar: '/calendar', leave: '/leave', recovery: '/leave',
}

const normalizePage = (page) => {
  const key = String(page || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return PAGE_MAP[key] || (key.startsWith('/') ? key : null)
}

const findQuest = (quests, reference) => {
  const value = String(reference || '').trim().toLowerCase()
  if (!value) return null
  return quests.find((q) => q.id === reference)
    || quests.find((q) => q.title.toLowerCase() === value)
    || quests.find((q) => q.title.toLowerCase().includes(value))
}

const findHabit = (habits, reference) => {
  const value = String(reference || '').trim().toLowerCase()
  if (!value) return null
  return habits.find((h) => h.id === reference)
    || habits.find((h) => h.name.toLowerCase() === value)
    || habits.find((h) => h.name.toLowerCase().includes(value))
}

const validateAndExecute = ({ action, store, navigate }) => {
  if (!action || typeof action !== 'object' || typeof action.action !== 'string') return { ok: false, message: 'Invalid Nexus action.' }
  const type = action.action

  if (type === 'open_app') {
    return launchApp(action.app)
  }

  if (type === 'open_maps') {
    return openMaps(action.query)
  }

  if (type === 'compose_sms') {
    return composeSms({ to: action.to, body: action.body })
  }

  if (type === 'compose_whatsapp') {
    return composeWhatsApp({ to: action.to, body: action.body })
  }

  if (type === 'dial_number') {
    return openDialer(action.number)
  }

  if (type === 'open_device_settings') {
    return openSystemSettings()
  }

  if (type === 'share_text') {
    return shareText({ title: action.title || 'Nexus', text: action.text || '' })
  }

  if (type === 'create_quest') {
    const title = String(action.title || action.name || '').trim()
    if (!title) return { ok: false, message: 'I need a quest title.' }
    const difficulty = ['easy', 'medium', 'hard', 'epic'].includes(action.difficulty) ? action.difficulty : 'medium'
    const diff = difficultyConfig[difficulty]
    const questPayload = {
      title,
      desc: String(action.desc || 'Created via Nexus AI').trim(),
      difficulty,
      type: ['daily', 'weekly', 'one-time'].includes(action.type) ? action.type : 'daily',
      xp: diff?.xp,
      coins: diff?.coins,
    }
    if (action.attribute) questPayload.attribute = action.attribute
    const created = store.addQuest(questPayload)
    const verified = useStore.getState().quests.some((q) => q.id === created?.id && q.title === title)
    return verified
      ? { ok: true, message: `Quest registered: “${title}”. It is now in your quest panel.`, verified: true }
      : { ok: false, message: `I prepared the quest “${title}” but could not verify it was persisted.` }
  }

  if (type === 'toggle_habit') {
    const value = String(action.habitId || action.name || '').trim().toLowerCase()
    const habit = store.habits.find((h) => h.id === action.habitId) || store.habits.find((h) => h.name.toLowerCase().includes(value))
    if (!habit) return { ok: false, message: 'I could not find that habit.' }
    const dayIndex = Number.isInteger(action.dayIndex) ? Math.max(0, Math.min(6, action.dayIndex)) : ((new Date().getDay() + 6) % 7)
    store.toggleHabit(habit.id, dayIndex)
    return { ok: true, message: `Habit “${habit.name}” ${habit.completed[dayIndex] ? 'completed' : 'reopened'} for today.` }
  }

  if (type === 'delete_habit') {
    const value = String(action.habitId || action.name || '').trim().toLowerCase()
    const habit = store.habits.find((h) => h.id === action.habitId) || store.habits.find((h) => h.name.toLowerCase().includes(value))
    if (!habit) return { ok: false, message: 'I could not find that habit.' }
    store.deleteHabit(habit.id)
    const stillExists = useStore.getState().habits.some((h) => h.id === habit.id)
    return stillExists
      ? { ok: false, message: `I attempted to remove “${habit.name}” but it is still present.` }
      : { ok: true, message: `Habit removed: “${habit.name}”.`, verified: true }
  }

  if (type === 'create_habit') {
    const name = String(action.name || action.title || '').trim()
    if (!name) return { ok: false, message: 'I need a habit name.' }
    const created = store.addHabit({ name, attribute: action.attribute || 'discipline' })
    const verified = useStore.getState().habits.some((h) => h.id === created?.id && h.name === name)
    return verified
      ? { ok: true, message: `Habit registered: “${name}”.`, verified: true }
      : { ok: false, message: `I prepared the habit “${name}” but could not verify it was persisted.` }
  }

  if (type === 'complete_quest') {
    const quest = findQuest(store.quests, action.questId || action.title || action.name)
    if (!quest) return { ok: false, message: `I could not find that quest.` }
    if (quest.completed) return { ok: true, message: `“${quest.title}” is already complete.` }
    store.completeQuest(quest.id)
    const updated = useStore.getState().quests.find((q) => q.id === quest.id)
    return updated?.completed
      ? { ok: true, message: `Quest complete: “${quest.title}”. Experience gained.`, verified: true }
      : { ok: false, message: `I attempted to complete “${quest.title}” but could not verify the state change.` }
  }

  if (type === 'delete_quest') {
    const quest = findQuest(store.quests, action.questId || action.title || action.name)
    if (!quest) return { ok: false, message: 'I could not find that quest.' }
    store.deleteQuest(quest.id)
    const stillExists = useStore.getState().quests.some((q) => q.id === quest.id)
    return stillExists
      ? { ok: false, message: `I attempted to remove “${quest.title}” but it is still present.` }
      : { ok: true, message: `Quest removed: “${quest.title}”.`, verified: true }
  }

  if (type === 'request_leave') {
    const quest = findQuest(store.quests, action.questId || action.title || action.name)
    if (!quest) return { ok: false, message: 'I could not find that quest. Leave was not created.' }
    if (!action.startDate || !action.endDate || !action.reason) return { ok: false, message: 'Leave requires a quest, start date, end date and genuine reason.' }
    const entry = store.requestQuestLeave({ questId: quest.id, startDate: action.startDate, endDate: action.endDate, reason: action.reason })
    navigate('/leave')
    return { ok: entry.status === 'approved', message: entry.nexusReview?.summary || `Nexus reviewed leave for “${quest.title}”.` }
  }

  if (type === 'create_journal') {
    const content = String(action.content || '').trim()
    if (!content) return { ok: false, message: 'I need the journal content.' }
    store.addJournal({ content, mood: action.mood || 'reflective' })
    return { ok: true, message: 'Journal entry recorded.' }
  }

  if (type === 'schedule_alarm') {
    const date = new Date(action.time)
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return { ok: false, message: 'I need a valid future alarm time.' }
    const repeat = action.repeat === 'daily' ? 'daily' : 'once'
    const alarm = store.addAlarm({
      title: String(action.title || 'POS Alarm').trim(),
      note: String(action.note || '').trim(),
      time: date.toISOString(),
      repeat,
    })
    return { ok: true, message: `Alarm scheduled for ${new Date(alarm.time).toLocaleString()}.` }
  }

  if (type === 'toggle_setting') {
    const allowed = ['voiceEnabled', 'soundEnabled', 'animationsEnabled', 'aiEnabled']
    if (!allowed.includes(action.key) || typeof action.value !== 'boolean') return { ok: false, message: 'That setting cannot be changed by Nexus.' }
    store.updateSettings({ [action.key]: action.value })
    const labels = { voiceEnabled: 'Nexus Voice', soundEnabled: 'Sound effects', animationsEnabled: 'Animations', aiEnabled: 'Nexus AI' }
    return { ok: true, message: `${labels[action.key]} ${action.value ? 'enabled' : 'disabled'}.` }
  }

  if (type === 'navigate') {
    const path = normalizePage(action.page)
    if (!path) return { ok: false, message: `I do not know the “${action.page}” page.` }
    navigate(path)
    return { ok: true, message: `Opening ${action.page}.` }
  }

  if (type === 'set_theme') {
    const theme = String(action.theme || '').trim().toLowerCase()
    const themeMeta = THEMES.find((entry) => entry.id === theme)
    if (!themeMeta) return { ok: false, message: `Theme “${theme}” is not available.` }
    if (!isThemeUnlocked(themeMeta, store.player, store.stats)) return { ok: false, message: `${themeMeta.name} is locked — ${themeMeta.unlock?.label || 'complete its requirement'} first.` }
    store.setTheme(theme)
    return { ok: true, message: `Theme set to ${themeMeta.name}.` }
  }

  return { ok: false, message: `Action “${type}” is not supported.` }
}


const isDestructiveAction = (action) => ['delete_quest', 'delete_habit', 'delete_journal'].includes(action?.action)

const describeAction = (action, store) => {
  const type = action?.action
  if (type === 'delete_quest') {
    const quest = findQuest(store.quests, action.questId || action.title || action.name)
    return quest ? `Delete quest “${quest.title}”? This cannot be undone.` : 'I could not find that quest.'
  }
  if (type === 'delete_habit') {
    const value = String(action.habitId || action.name || '').trim().toLowerCase()
    const habit = store.habits.find((h) => h.id === action.habitId) || store.habits.find((h) => h.name.toLowerCase().includes(value))
    return habit ? `Delete habit “${habit.name}”? This cannot be undone.` : 'I could not find that habit.'
  }
  if (type === 'delete_journal') return 'Delete this journal entry? This cannot be undone.'
  return 'Confirm this action?'
}

export default function AICommand() {
  const store = useStore()
  const history = useStore((s) => s.nexusHistory || [])
  const settings = useStore((s) => s.settings)
  const aiUsage = useStore((s) => s.aiUsage)
  const trackAIUsage = useStore((s) => s.trackAIUsage)
  const appendNexusMessage = useStore((s) => s.appendNexusMessage)
  const clearNexusHistory = useStore((s) => s.clearNexusHistory)
  const navigate = useNavigate()
  const location = useLocation()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastProvider, setLastProvider] = useState(null)
  const [fellBack, setFellBack] = useState(false)
  // Voice state has ONE owner (utils/voiceController). The UI only reads it.
  const voice = useVoiceState()
  const listening = voice.state === VoiceState.LISTENING || voice.state === VoiceState.STARTING || voice.state === VoiceState.PROCESSING
  const loadingRef = useRef(false)
  const voiceGateRef = useRef(false)
  const chatMountedRef = useRef(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const scrollRef = useRef(null)
  const [deviceCaps] = useState(() => getDeviceCapabilities())
  const speakingTokenRef = useRef(0)
  const speakingRef = useRef(false)
  const [ownerAuthorized, setOwnerAuthorized] = useState(() => !isNativeApp() || settings.nexusOwnerVerification === false)
  const [ownerBusy, setOwnerBusy] = useState(false)
  const wakeHandledRef = useRef(false)
  const dialogRef = useRef(null)

  const provider = getProvider(settings.aiProvider) || getProvider('mistral')
  const currentKey = settings.apiKeys?.[settings.aiProvider] || ''
  const hasApiKey = !!currentKey
  const providersWithKeys = Object.keys(settings.apiKeys || {}).filter((id) => settings.apiKeys?.[id]).length
  const suggestions = generateQuestSuggestions(store.player, store.attributes)
  const cancelNexusSpeech = async () => {
    speakingTokenRef.current += 1
    await stopSpeaking()
    speakingRef.current = false
    setSpeaking(false)
    setVoiceSpeaking(false)
  }

  const speakNexus = (text) => {
    if (!settings.voiceEnabled || !text) return Promise.resolve()
    const token = ++speakingTokenRef.current
    speakingRef.current = true
    setSpeaking(true)
    setVoiceSpeaking(true)
    return speakText(String(text).slice(0, 1200), {
      volume: settings.voiceVolume,
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
      voiceName: settings.voiceName,
      profile: settings.voiceProfile || 'friendly-woman',
      lang: settings.voiceLanguage || 'en-IN',
    }).finally(() => {
      if (speakingTokenRef.current === token) { speakingRef.current = false; setSpeaking(false); setVoiceSpeaking(false) }
    })
  }

  useEffect(() => {
    let cancelled = false
    const refreshOwner = async () => {
      if (!isNativeApp() || settings.nexusOwnerVerification === false) {
        if (!cancelled) setOwnerAuthorized(true)
        return
      }
      const status = await getOwnerSessionStatus()
      if (!cancelled) setOwnerAuthorized(!!status?.authorized)
    }
    void refreshOwner()
    return () => { cancelled = true }
  }, [settings.nexusOwnerVerification])

  const verifyOwnerNow = async () => {
    setOwnerBusy(true)
    try {
      const result = await verifyNexusOwner({ force: true, ttlMs: 15 * 60 * 1000 })
      setOwnerAuthorized(!!result?.ok)
      if (result?.ok) playSound('success')
    } finally { setOwnerBusy(false) }
  }

  const revokeOwnerNow = async () => {
    clearOwnerSession()
    setOwnerAuthorized(false)
  }

  useEffect(() => {
    if (!history.length) {
      appendNexusMessage({
        role: 'ai',
        text: `Welcome back, ${store.player.name}. I can operate POS for you — quests, habits, journal, alarms, navigation, settings, and planning.`,
      })
    }
  }, [history.length, appendNexusMessage, store.player.name])

  loadingRef.current = loading
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const touchLayout = !!window.matchMedia?.('(pointer: coarse), (max-width: 900px)')?.matches
    if (touchLayout) {
      // Touch layout has no nested chat scroller: the page itself scrolls.
      if (chatMountedRef.current) el.lastElementChild?.scrollIntoView({ block: 'nearest' })
      chatMountedRef.current = true
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [history, loading])

  // Stop any in-flight continuous listening loop when leaving this page —
  // otherwise the recognizer/native session would keep running in the
  // background with no UI to show for it.
  useEffect(() => () => {
    void stopVoice('unmount')
    void stopSpeaking()
  }, [])

  const ensureVoiceAuthority = async (source = 'voice') => {
    if (!isNativeApp() || settings.nexusOwnerVerification === false) return { ok: true }
    const verification = await verifyNexusOwner({ ttlMs: 10 * 60 * 1000 })
    if (!verification.ok) {
      appendNexusMessage({ role: 'ai', text: `Owner verification required for ${source === 'wake' ? 'Hey Nexus' : source === 'voice' ? 'voice' : 'Nexus'} commands. ${verification.message || securityNotice}` })
    }
    return verification
  }


  // ── Conversational automation: contacts, WhatsApp send/delete, weather ─────────────────
  const ensureSensitive = async (what) => {
    if (!isNativeApp() || settings.nexusSensitiveLock === false) return { ok: true }
    const v = await verifyNexusOwner({ ttlMs: 10 * 60 * 1000 })
    return v.ok ? v : { ok: false, message: `I need you to verify it is you (fingerprint or screen lock) before I ${what}. ${v.message || ''}`.trim() }
  }

  const optionList = (matches) => matches.map((m, i) => `${i + 1}) ${m.name}`).join('   ')

  const doSend = async (contact, body) => {
    const r = await sendWhatsAppTo({ name: contact.name, number: contact.number, body })
    return r.message
  }

  const afterContactPicked = async (contact, body, then) => {
    if (then === 'delete') {
      dialogRef.current = { type: 'confirm_delete', target: contact }
      return `Delete your last WhatsApp message to ${contact.name} for everyone, sir? Say yes to confirm.`
    }
    if (!body) {
      dialogRef.current = { type: 'body', contact }
      return `What should I say to ${contact.name}, sir?`
    }
    return doSend(contact, body)
  }

  const startWhatsAppFlow = async (intent) => {
    const auth = await ensureSensitive('send messages')
    if (!auth.ok) return auth.message
    if (!isNativeApp()) return 'Sending WhatsApp messages by contact name works in the Android app.'
    const found = await findContacts(intent.name)
    if (found.status === 'no-permission') return 'I need permission to read your contacts. Allow it in Settings → Nexus automation, then ask again.'
    if (found.status !== 'ok') return 'I could not read your contacts on this build. Rebuild the app with the latest Nexus plugin.'
    if (!found.matches.length) return `I could not find “${intent.name}” in your contacts, sir.`
    if (found.matches.length > 1) {
      dialogRef.current = { type: 'pick', matches: found.matches, body: intent.body, then: 'send', name: intent.name }
      return `Sir, which ${intent.name}? ${optionList(found.matches)}`
    }
    return afterContactPicked(found.matches[0], intent.body, 'send')
  }

  const startDeleteFlow = async (intent) => {
    const auth = await ensureSensitive('delete messages')
    if (!auth.ok) return auth.message
    if (!isNativeApp()) return 'Deleting WhatsApp messages works in the Android app.'
    if (intent.name) {
      const found = await findContacts(intent.name)
      if (found.status === 'ok' && found.matches.length > 1) {
        dialogRef.current = { type: 'pick', matches: found.matches, then: 'delete', name: intent.name }
        return `Sir, which ${intent.name}? ${optionList(found.matches)}`
      }
      if (found.status === 'ok' && found.matches.length === 1) return afterContactPicked(found.matches[0], '', 'delete')
    }
    const last = getLastWhatsApp()
    if (!last) return 'I have no recent WhatsApp message from me to delete. Say “delete my last message to” and a name.'
    dialogRef.current = { type: 'confirm_delete', target: { name: last.name, number: last.number } }
    return `Delete your last WhatsApp message to ${last.name} (“${String(last.body || '').slice(0, 60)}”) for everyone, sir? Say yes to confirm.`
  }

  // Returns a reply string when the pending dialog consumed this utterance, otherwise null.
  const continueDialog = async (query) => {
    const d = dialogRef.current
    if (!d) return null
    const said = String(query || '').trim()
    if (/^(?:cancel|never ?mind|stop|forget it|abort)\b/i.test(said)) { dialogRef.current = null; return 'Cancelled, sir.' }

    if (d.type === 'pick') {
      const idx = pickOption(said, d.matches)
      if (idx === -1) { dialogRef.current = null; return 'Cancelled, sir.' }
      if (idx === null) {
        const other = detectLocalAction(said)
        if (other && !['send_whatsapp_contact', 'delete_whatsapp_message'].includes(other.intent)) { dialogRef.current = null; return null }
        return `Sorry sir, which one? ${optionList(d.matches)}`
      }
      dialogRef.current = null
      return afterContactPicked(d.matches[idx], d.body, d.then)
    }

    if (d.type === 'body') {
      dialogRef.current = null
      return doSend(d.contact, said)
    }

    if (d.type === 'confirm_delete') {
      if (/^(?:yes|yeah|yep|yup|confirm|do it|sure|ok|okay|haan|ha)\b/i.test(said)) {
        dialogRef.current = null
        const r = await deleteLastWhatsApp({ name: d.target.name, number: d.target.number })
        return r.message
      }
      if (/^(?:no|nope|nah|don'?t|do not)\b/i.test(said)) { dialogRef.current = null; return 'Okay sir, I left it.' }
      const other = detectLocalAction(said)
      if (other) { dialogRef.current = null; return null }
      return 'Say yes to delete it, or cancel.'
    }
    dialogRef.current = null
    return null
  }

  // After Nexus asks a question by voice, reopen the mic so the answer is heard hands-free.
  const relistenIfVoice = async (meta, spokenPromise) => {
    if (!dialogRef.current) return
    if (meta?.source !== 'voice' && meta?.source !== 'wake') return
    try { await spokenPromise } catch { /* speech optional */ }
    if (dialogRef.current && !isVoiceBusy()) window.setTimeout(() => { void startVoiceInput() }, 250)
  }

  const executeLocal = async (result) => {
    const personality = settings.nexusPersonality || 'friendly'

    if (result.intent === 'stop_speaking') {
      await cancelNexusSpeech()
      return 'Speech stopped.'
    }

    if (result.intent === 'next_action') {
      const next = getNextBestAction({ quests: store.quests, habits: store.habits, player: store.player, attributes: store.attributes })
      const resultText = next.kind === 'quest'
        ? `Priority: ${next.title} [${next.operation}] · +${next.xp} XP. ${next.reason}`
        : next.kind === 'habit'
          ? `Priority: ${next.title} [Habit]. ${next.reason}`
          : next.reason
      return generateResponse('next_action', { resultText, personality })
    }

    if (result.intent === 'daily_brief') {
      const brief = buildDailyBrief({ quests: store.quests, habits: store.habits, player: store.player, attributes: store.attributes })
      return generateResponse('daily_brief', { resultText: formatDailyBrief(brief), personality })
    }

    if (result.intent === 'remember') {
      return rememberFact(result.fact).message
    }

    if (result.intent === 'show_memory') {
      return generateResponse('show_memory', { resultText: formatMemory(), personality })
    }

    if (result.intent === 'forget') {
      return forgetFact(result.fact).message
    }

    if (result.intent === 'get_weather') return (await getWeather(result.city)).message
    if (result.intent === 'send_whatsapp_contact') return startWhatsAppFlow(result)
    if (result.intent === 'delete_whatsapp_message') return startDeleteFlow(result)

    if (result.intent === 'open_app') {
      return (await launchApp(result.app)).message
    }

    if (result.intent === 'open_maps') {
      return (await openMaps(result.query)).message
    }

    if (result.intent === 'compose_sms') {
      { const auth = await ensureSensitive('send SMS'); if (!auth.ok) return auth.message }
      return (await composeSms({ to: result.to, body: result.body })).message
    }

    if (result.intent === 'compose_whatsapp') {
      { const auth = await ensureSensitive('send WhatsApp messages'); if (!auth.ok) return auth.message }
      return (await composeWhatsApp({ to: result.to, body: result.body })).message
    }

    if (result.intent === 'dial_number') {
      { const auth = await ensureSensitive('place calls'); if (!auth.ok) return auth.message }
      return (await openDialer(result.number)).message
    }

    if (result.intent === 'open_device_settings') {
      return (await openSystemSettings()).message
    }
    if (result.intent === 'add_quest') {
      const diff = difficultyConfig[result.difficulty]
      store.addQuest({ title: result.match, desc: 'Created via Nexus AI', attribute: result.attribute, difficulty: result.difficulty, type: result.type || 'daily', xp: diff.xp, coins: diff.coins })
      return generateResponse('add_quest', { match: result.match, personality })
    }
    if (result.intent === 'add_habit') {
      store.addHabit({ name: result.match, attribute: result.attribute, target: 7, xp: 20, coins: 3 })
      return generateResponse('add_habit', { match: result.match, personality })
    }
    if (result.intent === 'complete_quest') return validateAndExecute({ action: { action: 'complete_quest', title: result.match }, store, navigate }).message
    if (result.intent === 'delete_quest') return validateAndExecute({ action: { action: 'delete_quest', title: result.match }, store, navigate }).message
    if (result.intent === 'delete_habit') {
      const habit = findHabit(store.habits, result.match)
      if (!habit) return generateResponse('unknown', { response: 'I could not find that habit.', personality })
      store.deleteHabit(habit.id)
      return generateResponse('delete_habit', { match: habit.name, personality })
    }
    if (result.intent === 'rename_quest') {
      const quest = findQuest(store.quests, result.match)
      if (!quest) return generateResponse('unknown', { response: 'I could not find that quest.', personality })
      store.updateQuest(quest.id, { title: result.newName })
      return generateResponse('rename_quest', { match: quest.title, newName: result.newName, personality })
    }
    if (result.intent === 'rename_habit') {
      const habit = findHabit(store.habits, result.match)
      if (!habit) return generateResponse('unknown', { response: 'I could not find that habit.', personality })
      store.updateHabit(habit.id, { name: result.newName })
      return generateResponse('rename_habit', { match: habit.name, newName: result.newName, personality })
    }
    if (result.intent === 'update_reward') {
      const quest = findQuest(store.quests, result.match)
      if (quest) {
        store.updateQuest(quest.id, { xp: result.xp })
        return generateResponse('update_reward', { match: quest.title, xp: result.xp, personality })
      }
      const habit = findHabit(store.habits, result.match)
      if (habit) {
        store.updateHabit(habit.id, { xp: result.xp })
        return generateResponse('update_reward', { match: habit.name, xp: result.xp, personality })
      }
      return generateResponse('unknown', { response: 'I could not find that quest or habit.', personality })
    }
    if (result.intent === 'undo') {
      const outcome = store.undoLast()
      return generateResponse('undo', { personality, response: outcome.message })
    }
    if (result.intent === 'add_journal') {
      store.addJournal({ content: result.match, mood: 'reflective' })
      return generateResponse('add_journal', { personality })
    }
    if (result.intent === 'show_status') return generateResponse('show_status', { player: store.player, personality })
    if (result.intent === 'show_quests') { navigate('/quests'); return generateResponse('show_quests', { personality }) }
    if (result.intent === 'show_quests_filtered') {
      const attribute = resolveAttributeAlias(result.attribute) || result.attribute
      navigate(`/quests?attribute=${attribute}`)
      return generateResponse('show_quests_filtered', { attribute, personality })
    }
    if (result.intent === 'xp_forecast') {
      const attribute = result.attribute ? (resolveAttributeAlias(result.attribute) || result.attribute) : null
      const today = new Date().getDay()
      const dayIndex = (today + 6) % 7
      const openQuests = store.quests.filter((q) => q.type === 'daily' && !q.completed && (!attribute || q.attribute === attribute))
      const openHabits = store.habits.filter((h) => !h.completed[dayIndex] && (!attribute || h.attribute === attribute))
      const xpTotal = openQuests.reduce((sum, q) => sum + (q.xp || 0), 0) + openHabits.reduce((sum, h) => sum + (h.xp || 0), 0)
      return generateResponse('xp_forecast', { attribute, count: openQuests.length + openHabits.length, xpTotal, personality })
    }
    if (result.intent === 'penalty_forecast') {
      const preview = store.getPendingPenaltyPreview()
      return generateResponse('penalty_forecast', { ...preview, personality })
    }
    if (result.intent === 'show_bosses') { navigate('/bosses'); return generateResponse('show_bosses', { personality }) }
    if (result.intent === 'show_leave') { navigate('/leave'); return generateResponse('show_leave', { personality }) }
    if (result.intent === 'request_leave') {
      const outcome = validateAndExecute({ action: { action: 'request_leave', title: result.quest, startDate: result.startDate, endDate: result.endDate, reason: result.reason }, store, navigate })
      return outcome.message
    }
    if (result.intent === 'schedule_alarm') {
      if (!result.alarm?.valid) return result.alarm?.reason || 'I need a time for the alarm.'
      return validateAndExecute({ action: { action: 'schedule_alarm', title: result.alarm.title, time: result.alarm.time, repeat: result.alarm.repeat }, store, navigate }).message
    }
    if (result.intent === 'set_setting') return validateAndExecute({ action: { action: 'toggle_setting', key: result.key, value: result.value }, store, navigate }).message
    if (result.intent === 'navigate') return validateAndExecute({ action: { action: 'navigate', page: result.match }, store, navigate }).message
    return generateResponse(result.intent, { ...result, player: store.player, text: result.match || result.text, personality })
  }

  const handleSubmit = async (rawText, meta = {}) => {
    const query = String(rawText || input).trim()
    if (!query || loading) return

    if ((isNativeApp() && settings.nexusOwnerVerification !== false) || meta.source === 'voice' || meta.source === 'wake') {
      const authority = await ensureVoiceAuthority(meta.source || 'command')
      setOwnerAuthorized(!!authority.ok)
      if (!authority.ok) {
        await stopVoice('owner-denied')
        return
      }
    }

    // Barge-in: a new command cancels any current Nexus speech before work begins.
    await cancelNexusSpeech()
    appendNexusMessage({ role: 'user', text: query })
    setInput('')
    setLoading(true)
    setFellBack(false)

    if (dialogRef.current) {
      const reply = await continueDialog(query)
      if (reply !== null) {
        appendNexusMessage({ role: 'ai', text: reply })
        const spoken = speakNexus(reply)
        setLoading(false)
        void relistenIfVoice(meta, spoken)
        return
      }
    }

    const local = interpretCommand(query)
    const localActionable = ['add_quest', 'add_habit', 'complete_quest', 'delete_quest', 'add_journal', 'schedule_alarm', 'set_setting', 'navigate', 'show_status', 'show_quests', 'show_bosses', 'show_leave', 'request_leave', 'set_theme', 'open_app', 'open_maps', 'compose_sms', 'compose_whatsapp', 'dial_number', 'open_device_settings', 'next_action', 'daily_brief', 'remember', 'show_memory', 'forget', 'stop_speaking', 'send_whatsapp_contact', 'delete_whatsapp_message', 'get_weather'].includes(local.intent)

    if (localActionable) {
      if (local.intent === 'delete_quest') {
        const action = { action: 'delete_quest', title: local.match }
        const confirmation = describeAction(action, store)
        if (/could not find/i.test(confirmation)) appendNexusMessage({ role: 'ai', text: confirmation })
        else { setPendingAction(action); appendNexusMessage({ role: 'ai', text: `Confirmation required. ${confirmation}` }) }
        setLoading(false)
        return
      }
      const response = local.intent === 'set_theme'
        ? validateAndExecute({ action: { action: 'set_theme', theme: local.match }, store, navigate }).message
        : await executeLocal(local)
      if (/quest|habit|journal|alarm|enabled|disabled|Opening|Theme set|complete|removed/i.test(response)) playSound('success')
      appendNexusMessage({ role: 'ai', text: response })
      const spokenLocal = local.intent !== 'stop_speaking' ? speakNexus(response) : undefined
      setLoading(false)
      void relistenIfVoice(meta, spokenLocal)
      return
    }

    if (query.toLowerCase() === 'help') {
      const response = generateResponse('help')
      appendNexusMessage({ role: 'ai', text: response })
      speakNexus(response)
      setLoading(false)
      return
    }

    if (!hasApiKey) {
      const response = `${generateResponse(local.intent, { ...local, player: store.player })}\n\nFor general conversation, add an API key in Settings → Nexus AI. Local app commands do not require a key.`
      appendNexusMessage({ role: 'ai', text: response })
      speakNexus(response)
      setLoading(false)
      return
    }

    try {
      const conversationHistory = [...history, { role: 'user', text: query }].slice(-40)
      const result = await callAI(
        settings.aiProvider,
        currentKey,
        settings.aiModel,
        conversationHistory,
        store.player,
        store.attributes,
        store.quests,
        store.habits,
        {
          enableFallback: settings.enableFallback,
          apiKeys: settings.apiKeys,
          alarms: store.alarms || [],
        }
      )

      setLastProvider(result.provider)
      setFellBack(result.fellBack)
      if (result.usage) trackAIUsage(result.provider, result.usage)

      const parsed = parseActionEnvelope(result.text)
      const actionResults = []
      let blockedAction = null
      for (const action of parsed.actions.slice(0, 8)) {
        if (isDestructiveAction(action)) {
          blockedAction = action
          actionResults.push(describeAction(action, useStore.getState()))
          break
        }
        try {
          const outcome = await validateAndExecute({ action, store: useStore.getState(), navigate })
          actionResults.push(`${outcome.ok ? '✓' : '✕'} ${outcome.message}`)
        } catch (error) {
          actionResults.push(`✕ ${error?.message || 'Action execution failed.'}`)
        }
      }
      if (blockedAction) setPendingAction(blockedAction)

      let displayText = parsed.cleanText || (actionResults.length ? actionResults.join('\n') : result.text)
      if (actionResults.length) {
        const failures = actionResults.filter((x) => /could not|cannot|need|not available|not supported|invalid/i.test(x))
        if (!failures.length && !parsed.cleanText) displayText = actionResults.join('\n')
        else if (!failures.length) displayText = `${parsed.cleanText}\n\n${actionResults.join('\n')}`
      }

      appendNexusMessage({ role: 'ai', text: displayText })
      speakNexus(displayText)
      playSound('success')
    } catch (err) {
      playSound('error')
      const response = err.message || 'I hit a problem reaching the AI service. Check Settings → Nexus AI.'
      appendNexusMessage({ role: 'ai', text: response })
      speakNexus(response)
    } finally {
      setLoading(false)
    }
  }

  const startVoiceInput = async () => {
    // Tap while a session is active = cancel. Never gated by owner verification.
    const current = getVoiceState()
    if (current === VoiceState.STARTING || current === VoiceState.STOPPING) return
    if (current === VoiceState.LISTENING || current === VoiceState.PROCESSING) {
      await stopVoice('user-cancel')
      setVoiceTranscript('')
      return
    }
    if (voiceGateRef.current) return // owner prompt already open

    voiceGateRef.current = true
    try {
      const authority = await ensureVoiceAuthority('voice')
      setOwnerAuthorized(!!authority.ok)
      if (!authority.ok) return
    } finally {
      voiceGateRef.current = false
    }

    // Barge-in: stop Nexus speech, then hand the audio session to the recognizer.
    await cancelNexusSpeech()

    const language = settings.voiceLanguage || navigator.language || 'en-IN'
    // Continuous listening only when explicitly enabled AND the device is not low on memory.
    const lowMemoryAndroid = /Android/i.test(navigator?.userAgent || '') && (navigator?.deviceMemory || 4) <= 6
    const continuous = settings.continuousVoiceInput !== false && !lowMemoryAndroid
    setVoiceTranscript('')

    await startVoice({
      lang: language,
      continuous,
      onPartial: (text) => {
        setVoiceTranscript(text)
        setInput(text)
      },
      onFinal: (text) => {
        const transcript = String(text || '').trim()
        if (!transcript) return
        setVoiceTranscript('')
        setInput('')
        void handleSubmit(transcript, { source: 'voice' })
      },
      // Continuous mode: only reopen the mic after Nexus finished thinking AND speaking.
      beforeRestart: async () => {
        const started = Date.now()
        while ((loadingRef.current || speakingRef.current) && Date.now() - started < 25000) {
          await new Promise((resolve) => window.setTimeout(resolve, 200))
        }
        await new Promise((resolve) => window.setTimeout(resolve, 300))
        while ((loadingRef.current || speakingRef.current) && Date.now() - started < 25000) {
          await new Promise((resolve) => window.setTimeout(resolve, 200))
        }
      },
    })
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search || '')
    const wake = params.get('wake')
    if (wakeHandledRef.current || !params.has('wake')) return
    wakeHandledRef.current = true
    navigate('/ai', { replace: true })
    const command = String(wake || '').trim()
    const run = async () => {
      if (command) {
        await handleSubmit(command, { source: 'wake' })
      } else if (settings.wakeWordEnabled !== false) {
        // Wake phrase without a command: verify owner, then listen for the next utterance.
        const authority = await ensureVoiceAuthority('wake')
        if (authority.ok) setTimeout(() => { void startVoiceInput() }, 160)
      }
    }
    void run()
  }, [location.search, navigate, settings.wakeWordEnabled])

  if (!settings.aiEnabled) {
    return <div className="space-y-6 animate-fade-in"><div><p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Nexus AI</p><h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-3"><img src="/assets/nexus/nexus-idle.webp" alt="" className="w-9 h-9 rounded-xl object-cover border border-border-subtle" /> Nexus AI</h1></div><div className="card p-8 text-center"><AlertCircle size={32} className="accent-text mx-auto mb-3" /><p className="text-sm text-text-secondary">Nexus AI is disabled. Enable it in Settings → Preferences.</p></div></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Nexus AI</p>
          <div className="nexus-stage-title"><OptionalVideo src={ASSETS.video.nexusLoop} poster={ASSETS.nexusIdle} className="nexus-title-video" /><h1 className="relative z-10 text-2xl sm:text-3xl font-display font-bold flex items-center gap-3"><NexusAvatar size={40} speaking={speaking} listening={listening} /> Nexus AI</h1></div>
          <p className="text-sm text-text-secondary mt-1">{hasApiKey ? `Connected via ${provider.name} · ${settings.aiModel}${settings.enableFallback && providersWithKeys > 1 ? ` · ${providersWithKeys} providers ready` : ''}` : 'App-control commands work offline. Add an API key for full conversation.'}</p>
        </div>
        <button onClick={() => { if (window.confirm('Clear Nexus conversation history?')) clearNexusHistory() }} className="btn-ghost text-xs self-start sm:self-auto"><Trash2 size={13} /> Clear history</button>
      </div>

      {isNativeApp() && settings.nexusOwnerVerification !== false && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border-subtle grid place-items-center shrink-0"><ShieldCheck size={16} className={ownerAuthorized ? 'accent-text' : 'text-text-tertiary'} /></div>
            <div><p className="text-xs font-semibold">Nexus owner security</p><p className="text-[10px] text-text-tertiary mt-0.5">{ownerAuthorized ? 'Owner verified for this session. Voice and device actions are unlocked.' : 'Nexus is locked. Verify with your Android biometric or device credential before using commands.'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            {!ownerAuthorized && <button className="btn-primary text-xs" disabled={ownerBusy} onClick={verifyOwnerNow}><ShieldCheck size={13} /> {ownerBusy ? 'Verifying…' : 'Unlock Nexus'}</button>}
            {ownerAuthorized && <><span className="text-[10px] accent-text">VERIFIED</span><button className="btn-ghost text-xs" onClick={revokeOwnerNow}>Lock</button></>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-0 flex flex-col nexus-chat-card h-[calc(100dvh-15rem)] min-h-[440px] lg:h-[620px]">
          {pendingAction && (
            <div className="border-b border-warning/20 bg-warning/5 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-warning">Confirmation required</p><p className="text-[11px] text-text-secondary truncate">{describeAction(pendingAction, store)}</p></div>
              <button className="btn-ghost text-xs" onClick={() => { setPendingAction(null); appendNexusMessage({ role: 'ai', text: 'Action cancelled.' }) }}>Cancel</button>
              <button className="btn-primary text-xs" onClick={() => { const outcome = validateAndExecute({ action: pendingAction, store: useStore.getState(), navigate }); setPendingAction(null); appendNexusMessage({ role: 'ai', text: outcome.message }); outcome.ok ? playSound('success') : playSound('error') }}>Confirm</button>
            </div>
          )}
          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 nexus-chat-scroll">
            <AnimatePresence initial={false}>
              {history.map((msg, idx) => (
                <motion.div key={`${msg.ts}-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-surface-elevated' : ''}`} style={msg.role === 'ai' ? { background: 'var(--accent-soft)' } : {}}>
                    {msg.role === 'ai' ? <img src="/assets/nexus/nexus-idle.webp" alt="" className="w-full h-full rounded-lg object-cover" /> : <span className="text-sm">{store.player.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className={`max-w-[82%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'accent-bg' : 'bg-bg-700'}`}>
                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
                    {msg.role === 'ai' && idx === history.length - 1 && fellBack && <p className="text-[10px] text-text-tertiary mt-2 pt-2 border-t border-border-subtle"><RefreshCw size={9} className="inline mr-1" /> Fell back to {getProvider(lastProvider)?.name}</p>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-lg overflow-hidden border border-border-subtle"><img src="/assets/nexus/nexus-thinking.webp" alt="" className="w-full h-full object-cover" /></div><div className="bg-bg-700 rounded-2xl px-3"><TypingDots /></div></div>}
          </div>
          <div className="border-t border-border-subtle p-3 nexus-composer">
            {(listening || voice.state === VoiceState.ERROR || (voice.state === VoiceState.IDLE && voice.message)) && (
              <div className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${voice.state === VoiceState.ERROR ? 'border-error/30 bg-error/5 text-error' : 'border-accent/20 bg-accent/5 accent-text'}`} role="status">
                {listening && <ListeningWaveform />}
                <span className="flex-1 min-w-0">{voiceTranscript || voiceLabel(voice)}</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button type="button" onClick={startVoiceInput} className={`relative p-3 rounded-2xl min-w-12 min-h-12 ${listening ? 'accent-bg' : 'bg-bg-700 active:bg-surface-elevated'}`} title={voiceLabel(voice)} aria-label={voiceLabel(voice)} aria-pressed={listening}><Mic size={17} /></button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }} placeholder="Tell Nexus what to do… e.g. Add a daily quest to drink 4L water" className="input-field flex-1 min-h-[48px] max-h-28 resize-none" />
              <button onClick={() => handleSubmit()} disabled={!input.trim() || loading} className="btn-primary p-3 disabled:opacity-40" title="Send"><Send size={17} /></button>
            </div>
            {!listening && <p className="mt-1.5 px-1 text-[10px] text-text-tertiary">{voice.state === VoiceState.IDLE && !voice.message ? 'Tap the mic to speak' : voiceLabel(voice)}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 border-accent/10">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Smartphone size={15} className="accent-text" /> Device bridge</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{deviceCaps.androidLike ? 'Android controls are available as user-visible intents.' : 'Browser mode uses safe web/deep-link controls where supported.'}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl bg-bg-700/50 p-2"><p className="text-[9px] uppercase tracking-wider text-text-tertiary">App launch</p><p className="text-xs font-semibold mt-1">{deviceCaps.appLaunch ? 'READY' : 'LIMITED'}</p></div>
              <div className="rounded-xl bg-bg-700/50 p-2"><p className="text-[9px] uppercase tracking-wider text-text-tertiary">SMS compose</p><p className="text-xs font-semibold mt-1">{deviceCaps.smsCompose ? 'READY' : 'LIMITED'}</p></div>
              <div className="rounded-xl bg-bg-700/50 p-2"><p className="text-[9px] uppercase tracking-wider text-text-tertiary">Dialer</p><p className="text-xs font-semibold mt-1">{deviceCaps.dialer ? 'READY' : 'LIMITED'}</p></div>
              <div className="rounded-xl bg-bg-700/50 p-2"><p className="text-[9px] uppercase tracking-wider text-text-tertiary">Web share</p><p className="text-xs font-semibold mt-1">{deviceCaps.webShare ? 'READY' : 'LIMITED'}</p></div>
            </div>
            <p className="text-[10px] text-text-tertiary mt-3 flex items-start gap-1.5"><ShieldCheck size={11} className="mt-0.5 shrink-0" /> {explainDeviceLimits()}</p>
          </div>
<div className="card p-5"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles size={15} className="accent-text" /> App control</h3><p className="text-xs text-text-secondary leading-relaxed">Nexus can execute validated actions inside POS instead of merely replying. Try:</p><div className="mt-3 space-y-2">{['Add a daily quest to drink 4L water','Remind me at 8:00 PM to review Java','Complete my Read 20 Pages quest','Open Calendar','Open ChatGPT','Open Instagram','Open WhatsApp','Open Clock','What should I do next','Remember that I prefer focused study blocks'].map((x) => <button key={x} disabled={isNativeApp() && settings.nexusOwnerVerification !== false && !ownerAuthorized} onClick={() => handleSubmit(x)} className="w-full text-left text-xs p-2.5 rounded-lg bg-bg-700/60 hover:bg-surface-elevated transition-colors">{x}</button>)}</div></div>
          <div className="card p-5"><h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus size={15} className="accent-text" /> Suggested quests</h3>{suggestions.map((s) => <button key={s.title} onClick={() => handleSubmit(`Add a quest: ${s.title}`)} className="w-full text-left p-2.5 rounded-lg bg-bg-700/50 hover:bg-surface-elevated mb-2"><p className="text-xs font-semibold">{s.title}</p><p className="text-[10px] text-text-tertiary mt-0.5">{s.desc}</p></button>)}</div>
          <div className="text-[10px] text-text-tertiary px-1">{aiUsage.totalRequests} AI requests · {aiUsage.totalTokens} tokens recorded</div>
        </div>
      </div>
    </div>
  )
}
