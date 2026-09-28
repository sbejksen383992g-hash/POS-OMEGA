import { useStore } from '../store/useStore'
import { motion } from 'framer-motion'
import {
  Palette, Volume2, Mic2, Sparkles, AlertTriangle, Trash2, Check, Bot, Bell,
  ExternalLink, Eye, EyeOff, Loader2, Zap, Activity, RefreshCw, Lock, FileJson, Database, ShieldCheck,
} from 'lucide-react'
import { cx, formatNumber, hashPin } from '../utils/helpers'
import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import NexusAutomationCard from '../components/NexusAutomationCard'
import { AI_PROVIDERS, testConnection, getProvider } from '../utils/aiProviders'
import { THEMES, isThemeUnlocked } from '../utils/themes'
import { ensureNativeNotificationPermission, getNotificationHealth, isNativeApp, speakText, voiceHealth, NEXUS_VOICE_PROFILES, getAvailableVoices, chooseVoiceForProfile, describeVoiceChoice } from '../utils/nativeServices'
import { startBackgroundWake, stopBackgroundWake, getWakeStatus, getOwnerAuthorizationStatus, revokeOwnerAuthorization, requestMicrophonePermission, openAppDetails } from '../utils/nexusDevice'
import { verifyNexusOwner, securityNotice } from '../utils/nexusSecurity'

export default function Settings() {
  const player = useStore((s) => s.player)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const updatePlayer = useStore((s) => s.updatePlayer)
  const hardReset = useStore((s) => s.hardReset)
  const achievements = useStore((s) => s.achievements)
  const stats = useStore((s) => s.stats)
  const aiUsage = useStore((s) => s.aiUsage)
  const trackAIUsage = useStore((s) => s.trackAIUsage)
  const resetAIUsage = useStore((s) => s.resetAIUsage)

  const [showReset, setShowReset] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState(player.name)
  const [showKeys, setShowKeys] = useState({})
  const [keyInputs, setKeyInputs] = useState(
    settings.apiKeys || { mistral: '', groq: '', gemini: '', openrouter: '', cerebras: '', huggingface: '', cloudflare: '', sambanova: '' }
  )
  const [savedKeys, setSavedKeys] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [backupPreview, setBackupPreview] = useState(null)
  const [deviceHealth, setDeviceHealth] = useState({ notifications: { available: false, detail: 'Checking…' }, voice: { available: false, detail: 'Checking…' } })
  const [voiceTesting, setVoiceTesting] = useState(false)
  const [voiceTestMessage, setVoiceTestMessage] = useState('')
  const [permissionBusy, setPermissionBusy] = useState(false)
  const [availableVoices, setAvailableVoices] = useState([])
  const [voiceChoiceText, setVoiceChoiceText] = useState('')
  const [wakeBusy, setWakeBusy] = useState(false)
  const [wakeStatus, setWakeStatus] = useState({ running: false, authorized: false })

  const selectedProvider = getProvider(settings.aiProvider) || AI_PROVIDERS[0]
  const currentKey = settings.apiKeys?.[settings.aiProvider] || ''
  const hasKey = !!currentKey

  // Count how many providers have keys (for fallback availability)
  const providersWithKeys = AI_PROVIDERS.filter((p) => settings.apiKeys?.[p.id]).length
  const THEME_ASSETS = {
    cyber: '/assets/themes/cyber.webp',
    arctic: '/assets/themes/midnight.webp',
    ember: '/assets/themes/obsidian.webp',
    forest: '/assets/themes/aurora.webp',
    solar: '/assets/themes/obsidian.webp',
    titanium: '/assets/themes/midnight.webp',
    royal: '/assets/themes/aurora.webp',
  }

  const handleSaveKey = (providerId) => {
    updateSettings({
      apiKeys: { ...settings.apiKeys, [providerId]: keyInputs[providerId]?.trim() || '' },
    })
    setSavedKeys((s) => ({ ...s, [providerId]: true }))
    setTimeout(() => setSavedKeys((s) => ({ ...s, [providerId]: false })), 3000)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testConnection(settings.aiProvider, currentKey, settings.aiModel)
    setTestResult(result)
    if (result.success && result.usage) {
      trackAIUsage(result.provider, result.usage)
    }
    setTesting(false)
  }

  const handleProviderChange = (providerId) => {
    const provider = getProvider(providerId)
    updateSettings({
      aiProvider: providerId,
      aiModel: provider.defaultModel,
    })
    setTestResult(null)
  }

  const handleModelChange = (modelId) => {
    updateSettings({ aiModel: modelId })
    setTestResult(null)
  }

  const refreshDeviceHealth = async () => {
    const [notifications, voice] = await Promise.all([getNotificationHealth(), voiceHealth()])
    setDeviceHealth({ notifications, voice })
  }

  useEffect(() => {
    let active = true
    Promise.all([getNotificationHealth(), voiceHealth()]).then(([notifications, voice]) => {
      if (active) setDeviceHealth({ notifications, voice })
    })
    getAvailableVoices().then((voices) => { if (active) setAvailableVoices(voices) })
    return () => { active = false }
  }, [settings.voiceEnabled, settings.notificationsEnabled])

  useEffect(() => {
    let active = true
    describeVoiceChoice({ profileId: settings.voiceProfile || 'friendly-woman', lang: settings.voiceLanguage || 'en-US', voiceName: settings.voiceName || '' })
      .then((choice) => { if (active) setVoiceChoiceText(choice.text) })
    return () => { active = false }
  }, [settings.voiceProfile, settings.voiceLanguage, settings.voiceName, availableVoices.length])

  const testNexusVoice = async () => {
    setVoiceTesting(true)
    setVoiceTestMessage('Testing device speech…')
    const ok = await speakText(`Nexus voice is online. Welcome back, ${player.name || 'Operator'}.`, {
      volume: settings.voiceVolume,
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
      voiceName: settings.voiceName,
      profile: settings.voiceProfile || 'friendly-woman',
      lang: settings.voiceLanguage || 'en-IN',
    })
    setVoiceTesting(false)
    setVoiceTestMessage(ok ? 'Voice test sent to the device.' : 'Voice test failed. Check the Android text-to-speech service.')
    await refreshDeviceHealth()
  }

  const enableDeviceNotifications = async () => {
    setPermissionBusy(true)
    await ensureNativeNotificationPermission()
    await refreshDeviceHealth()
    setPermissionBusy(false)
  }

  useEffect(() => {
    let cancelled = false
    const refreshWake = async () => {
      if (!isNativeApp()) return
      const [status, owner] = await Promise.all([getWakeStatus(), getOwnerAuthorizationStatus()])
      if (!cancelled) setWakeStatus({ running: !!status?.running, authorized: !!owner?.authorized })
    }
    void refreshWake()
    const timer = window.setInterval(refreshWake, 5000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [settings.backgroundWakeEnabled])

  const toggleHeyNexus = async (enabled) => {
    if (!isNativeApp()) {
      updateSettings({ backgroundWakeEnabled: false })
      return
    }
    setWakeBusy(true)
    try {
      if (enabled) {
        if (settings.nexusOwnerVerification === true) {
          const owner = await verifyNexusOwner({ force: true, ttlMs: 15 * 60 * 1000 })
          if (!owner.ok) return
        }
        updateSettings({ backgroundWakeEnabled: true, wakeWordEnabled: true })
        const result = await startBackgroundWake('nexus')
        if (!result.ok) updateSettings({ backgroundWakeEnabled: false })
      } else {
        await stopBackgroundWake()
        updateSettings({ backgroundWakeEnabled: false })
      }
      const [status, authorization] = await Promise.all([getWakeStatus(), getOwnerAuthorizationStatus()])
      setWakeStatus({ running: !!status?.running, authorized: !!authorization?.authorized })
    } finally {
      setWakeBusy(false)
    }
  }

  const verifyOwnerNow = async () => {
    setWakeBusy(true)
    try {
      const result = await verifyNexusOwner({ force: true, ttlMs: 15 * 60 * 1000 })
      if (result.ok) {
        const owner = await getOwnerAuthorizationStatus()
        setWakeStatus((s) => ({ ...s, authorized: !!owner?.authorized }))
      }
    } finally { setWakeBusy(false) }
  }


  const testNativeMic = async () => {
    setPermissionBusy(true)
    try {
      if (!isNativeApp()) { setVoiceTestMessage('Use the browser microphone permission for PWA testing.'); return }
      const granted = await requestMicrophonePermission()
      setVoiceTestMessage(granted ? 'Microphone permission granted. Open Nexus and tap the mic to test recognition.' : 'Microphone permission is not granted. Open Android app permissions and allow Microphone.')
    } finally { setPermissionBusy(false) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Settings</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Configuration</h1>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Operator Profile</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-display font-bold accent-bg">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input-field max-w-[200px]"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updatePlayer({ name: nameInput || 'Operator' })
                      setEditName(false)
                    }
                  }}
                  autoFocus
                />
                <button onClick={() => { updatePlayer({ name: nameInput || 'Operator' }); setEditName(false) }} className="btn-primary text-sm px-3 py-1.5">
                  <Check size={14} /> Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-lg font-display font-bold">{player.name}</p>
                  <p className="text-xs text-text-tertiary">Level {player.level} · {player.title}</p>
                </div>
                <button onClick={() => setEditName(true)} className="btn-ghost text-xs px-2 py-1">Edit</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Palette size={16} className="accent-text" /> Visual Theme
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const unlocked = isThemeUnlocked(t, player, stats)
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => unlocked && setTheme(t.id)}
                disabled={!unlocked}
                className={cx(
                  'p-4 rounded-xl border-2 transition-all text-left relative',
                  active ? 'border-accent' : 'border-border hover:border-border-strong',
                  !unlocked && 'opacity-50 cursor-not-allowed hover:border-border'
                )}
              >
                {!unlocked && (
                  <Lock size={12} className="absolute top-3 right-3 text-text-tertiary" />
                )}
                <div className="w-full h-20 rounded-lg mb-2 overflow-hidden border border-border-subtle bg-bg-800"><img src={THEME_ASSETS[t.id] || '/assets/themes/obsidian.webp'} alt="" className="w-full h-full object-cover" /></div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-text-tertiary">
                  {unlocked ? t.desc : t.unlock.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Volume2 size={16} className="accent-text" /> Preferences
        </h3>
        <div className="space-y-3">
          <ToggleRow
            icon={Volume2}
            label="Sound Effects"
            desc="Audio feedback on actions"
            value={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <ToggleRow
            icon={Sparkles}
            label="Animations"
            desc="Motion and transitions"
            value={settings.animationsEnabled}
            onChange={(v) => updateSettings({ animationsEnabled: v })}
          />
          <ToggleRow
            icon={Bot}
            label="Nexus AI"
            desc="Enable AI chat and commands"
            value={settings.aiEnabled}
            onChange={(v) => updateSettings({ aiEnabled: v })}
          />
          {settings.aiEnabled && (
            <div className="pl-9">
              <label className="label-text">Nexus Personality</label>
              <select className="input-field" value={settings.nexusPersonality || 'friendly'} onChange={(e) => updateSettings({ nexusPersonality: e.target.value })}>
                <option value="friendly">Friendly — warm and encouraging</option>
                <option value="ceo">CEO — blunt, outcome-focused</option>
                <option value="commander">Commander — tactical, no-nonsense</option>
                <option value="mentor">Mentor — reflective, guiding</option>
                <option value="chill">Chill — relaxed, low-pressure</option>
              </select>
              <p className="text-[10px] text-text-tertiary mt-1">Changes Nexus's tone in chat and voice. Every command still runs the same way offline.</p>
            </div>
          )}
          <ToggleRow
            icon={Bell}
            label="Notifications"
            desc="System alerts, reminders and alarm notifications"
            value={settings.notificationsEnabled !== false}
            onChange={(v) => updateSettings({ notificationsEnabled: v })}
          />
          <ToggleRow
            icon={ShieldCheck}
            label="Missed Quest Penalties"
            desc="At midnight, each missed daily quest deducts its own XP reward (and coins, if that quest opts in). Approved leave is exempt."
            value={settings.penaltiesEnabled !== false}
            onChange={(v) => updateSettings({ penaltiesEnabled: v })}
          />
          <ToggleRow
            icon={Mic2}
            label="Nexus Voice"
            desc="Speak important system events only"
            value={settings.voiceEnabled}
            onChange={(v) => updateSettings({ voiceEnabled: v })}
          />
          {settings.voiceEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-9">
              <div><label className="label-text">Volume</label><input type="range" min="0" max="1" step="0.05" value={settings.voiceVolume ?? 0.7} onChange={(e) => updateSettings({ voiceVolume: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></div>
              <div><label className="label-text">Speech rate</label><input type="range" min="0.7" max="1.3" step="0.05" value={settings.voiceRate ?? 1} onChange={(e) => updateSettings({ voiceRate: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></div>
              <div><label className="label-text">Pitch</label><input type="range" min="0.6" max="1.6" step="0.05" value={settings.voicePitch ?? 1} onChange={(e) => updateSettings({ voicePitch: Number(e.target.value) })} className="w-full accent-[var(--accent)]" /></div>
              <div className="sm:col-span-3">
                <ToggleRow
                  icon={Mic2}
                  label="Continuous listening"
                  desc="Mic stays open across multiple commands until you tap it to stop."
                  value={settings.continuousVoiceInput !== false}
                  onChange={(v) => updateSettings({ continuousVoiceInput: v })}
                />
              </div>
              <div><label className="label-text">Language</label><select className="input-field" value={settings.voiceLanguage || 'en-US'} onChange={(e) => updateSettings({ voiceLanguage: e.target.value, voiceName: '' })}><option value="en-US">English (US)</option><option value="en-IN">English (India)</option><option value="en-GB">English (UK)</option></select></div><div className="sm:col-span-3"><label className="label-text">Nexus Voice Persona</label><select className="input-field" value={settings.voiceProfile || 'friendly-woman'} onChange={async (e) => { const profile = e.target.value; updateSettings({ voiceProfile: profile, voiceName: '' }); const choice = await describeVoiceChoice({ profileId: profile, lang: settings.voiceLanguage || 'en-US' }); setVoiceChoiceText(choice.text) }}>{Object.entries(NEXUS_VOICE_PROFILES).map(([id, profile]) => <option key={id} value={id}>{profile.label} — {profile.description}</option>)}</select><p className="text-[10px] text-text-tertiary mt-1">Persona controls delivery style and automatically prefers a matching installed voice when the Android engine exposes gender metadata.</p>{voiceChoiceText && <p className="text-[10px] accent-text mt-1">{voiceChoiceText}</p>}</div><div className="sm:col-span-3"><label className="label-text">Device Voice</label><select className="input-field" value={settings.voiceName || ''} onChange={(e) => updateSettings({ voiceName: e.target.value })}><option value="">Automatic — best installed voice</option>{availableVoices.filter((voice) => !settings.voiceLanguage || voice.lang === settings.voiceLanguage || voice.lang?.startsWith((settings.voiceLanguage || 'en').split('-')[0])).map((voice) => <option key={`${voice.id}-${voice.lang}`} value={voice.id}>{voice.displayName || voice.name}{voice.lang ? ` · ${voice.lang}` : ''}</option>)}</select><p className="text-[10px] text-text-tertiary mt-1">Android exposes voice IDs such as Google TTS variants. Locale-only entries are hidden; local/network and male/female variants are shown when the device provides them.</p></div>
            </div>
          )}
          <div className="pl-9 space-y-2">
            {settings.voiceEnabled && <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button onClick={testNexusVoice} disabled={voiceTesting} className="btn-ghost text-xs self-start"><Mic2 size={14} /> {voiceTesting ? 'Testing…' : 'Test Nexus Voice'}</button>
              {voiceTestMessage && <span className={`text-[10px] ${voiceTestMessage.includes('failed') ? 'text-error' : 'text-text-tertiary'}`}>{voiceTestMessage}</span>}
            </div>}
            {isNativeApp() && <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button onClick={enableDeviceNotifications} disabled={permissionBusy || deviceHealth.notifications.available} className="btn-ghost text-xs self-start"><Bell size={14} /> {permissionBusy ? 'Checking…' : deviceHealth.notifications.available ? 'Device notifications enabled' : 'Enable device notifications'}</button>
              <span className="text-[10px] text-text-tertiary">Android status: {deviceHealth.notifications.detail}</span>
            </div>}
            {isNativeApp() && <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button onClick={testNativeMic} disabled={permissionBusy} className="btn-ghost text-xs self-start"><Mic2 size={14} /> {permissionBusy ? 'Checking…' : 'Test microphone permission'}</button>
              <button onClick={openAppDetails} className="btn-ghost text-xs self-start"><ExternalLink size={13} /> Android app permissions</button>
            </div>}
          </div>
          {isNativeApp() && settings.voiceEnabled && (
            <div className="pl-9 rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold flex items-center gap-2"><Mic2 size={13} className="accent-text" /> Hey Nexus</p>
                  <p className="text-[10px] text-text-tertiary mt-1">Android foreground listener. Say “Nexus” + a command. Risky actions (messages, calls) still ask for your fingerprint/screen lock.</p>
                </div>
                <span className={`text-[10px] ${wakeStatus.running ? 'accent-text' : 'text-text-tertiary'}`}>{wakeStatus.running ? 'Armed' : 'Off'}</span>
              </div>
              <ToggleRow
                icon={Zap}
                label="Background wake word"
                desc="Say “Nexus” (or “Hey Nexus”) while APEX is in the background or the screen is off. Android shows a foreground-service notification while listening."
                value={settings.backgroundWakeEnabled === true}
                onChange={toggleHeyNexus}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-ghost text-xs" disabled={wakeBusy} onClick={verifyOwnerNow}><ShieldCheck size={13} /> {wakeBusy ? 'Verifying…' : 'Verify owner'}</button>
                {wakeStatus.authorized && <span className="text-[10px] accent-text">Owner verified</span>}
                <button className="btn-ghost text-xs" disabled={wakeBusy || !wakeStatus.authorized} onClick={async () => { await revokeOwnerAuthorization(); await stopBackgroundWake(); updateSettings({ backgroundWakeEnabled: false }); setWakeStatus({ running:false, authorized:false }) }}><Lock size={13} /> Revoke</button>
              </div>
              <p className="text-[10px] text-text-tertiary"><ShieldCheck size={10} className="inline mr-1" />{securityNotice}</p>
            </div>
          )}
          {isNativeApp() && <div className="pl-9"><NexusAutomationCard /></div>}
          <ToggleRow
            icon={RefreshCw}
            label="Auto-Fallback"
            desc={`Switch providers on failure (${providersWithKeys} providers ready)`}
            value={settings.enableFallback}
            onChange={(v) => updateSettings({ enableFallback: v })}
          />
        </div>
      </div>

      {/* App Lock */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Lock size={16} className="accent-text" /> App Lock
        </h3>
        <div className="space-y-3">
          <ToggleRow
            icon={Lock}
            label="PIN Lock"
            desc={settings.pinHash ? 'A PIN is required every time the app opens' : 'Enable, then set a 4-digit PIN'}
            value={settings.pinEnabled}
            onChange={(v) => {
              if (v) { updateSettings({ pinEnabled: true }); if (!settings.pinHash) setShowPinModal(true) }
              else { updateSettings({ pinEnabled: false, pinHash: '' }) }
            }}
          />
          {settings.pinEnabled && settings.pinHash && (
            <button className="btn-ghost text-xs self-start" onClick={() => setShowPinModal(true)}>
              <Lock size={14} /> Change PIN
            </button>
          )}
          <p className="text-[10px] text-text-tertiary">The PIN is hashed and stays on this device only — it's a local screen lock, not account security. Losing it means turning the lock off from the lock screen's "Forgot PIN?" link.</p>
        </div>
      </div>

      <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title={settings.pinHash ? 'Change PIN' : 'Set a PIN'} maxWidth="max-w-sm">
        <PinSetupForm
          onSave={(pin) => { updateSettings({ pinEnabled: true, pinHash: hashPin(pin) }); setShowPinModal(false) }}
        />
      </Modal>

      {/* AI Provider Configuration */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Bot size={16} className="accent-text" /> Nexus AI Providers
        </h3>
        <p className="text-xs text-text-secondary mb-1">
          Choose your primary AI provider and add API keys. Free/trial options include Groq, Mistral, Gemini, OpenRouter, Cerebras, Hugging Face, Cloudflare and SambaNova.
          Keys stay on your device only.
        </p>
        <p className="text-xs text-text-tertiary mb-4">
          With Auto-Fallback enabled, Nexus AI automatically switches to another provider if your primary one hits rate limits or goes down. Add keys for multiple providers to maximize uptime.
        </p>

        {/* Provider selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {AI_PROVIDERS.map((provider) => {
            const isActive = settings.aiProvider === provider.id
            const hasProviderKey = !!(settings.apiKeys?.[provider.id])
            return (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={cx(
                  'p-4 rounded-xl border-2 transition-all text-left relative',
                  isActive ? 'border-accent' : 'border-border hover:border-border-strong'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{provider.name}</p>
                  {provider.freeTier && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/20 text-success font-semibold uppercase">Free</span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">{provider.desc}</p>
                {hasProviderKey ? (
                  <span className="text-[10px] text-success mt-2 flex items-center gap-1">
                    <Check size={10} /> Key saved
                  </span>
                ) : (
                  <span className="text-[10px] text-text-tertiary mt-2 block">No key set</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Model selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-text-secondary mb-2 block">
            {selectedProvider.name} Model
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedProvider.models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={cx(
                  'px-3 py-1.5 rounded-lg text-xs transition-all',
                  settings.aiModel === model.id
                    ? 'accent-bg text-bg-900 font-semibold'
                    : 'bg-bg-700/50 text-text-secondary hover:bg-bg-700'
                )}
              >
                {model.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-tertiary mt-2">{selectedProvider.rateLimits}</p>
        </div>

        {/* API Key input for selected provider */}
        <div className="border-t border-border-subtle pt-4">
          <label className="text-xs font-semibold text-text-secondary mb-2 block">
            {selectedProvider.name} API Key
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                className="input-field pr-10"
                type={showKeys[selectedProvider.id] ? 'text' : 'password'}
                placeholder={`Paste your ${selectedProvider.name} API key...`}
                value={keyInputs[selectedProvider.id] ?? ''}
                onChange={(e) => {
                  setKeyInputs((s) => ({ ...s, [selectedProvider.id]: e.target.value }))
                  setSavedKeys((s) => ({ ...s, [selectedProvider.id]: false }))
                }}
              />
              <button
                onClick={() => setShowKeys((s) => ({ ...s, [selectedProvider.id]: !s[selectedProvider.id] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                {showKeys[selectedProvider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={() => handleSaveKey(selectedProvider.id)}
              className="btn-primary text-sm px-3 py-2 whitespace-nowrap"
            >
              <Check size={14} /> Save
            </button>
          </div>

          {savedKeys[selectedProvider.id] && (
            <p className="text-xs text-success mt-2 flex items-center gap-1">
              <Check size={12} /> Key saved! Nexus AI is ready.
            </p>
          )}

          {/* Test connection */}
          {hasKey && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {testing ? <span className="skeleton inline-block w-3 h-3 rounded-full" /> : <Zap size={12} />}
                Test Connection
              </button>
              {testResult && (
                <span className={cx('text-xs', testResult.success ? 'text-success' : 'text-error')}>
                  {testResult.success ? `Connected via ${testResult.provider}!` : testResult.message}
                </span>
              )}
            </div>
          )}

          {/* Get key link */}
          <a
            href={selectedProvider.getKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs accent-text hover:underline inline-flex items-center gap-1 mt-3"
          >
            Get a {selectedProvider.freeTier ? 'free ' : ''}API key from {selectedProvider.name} <ExternalLink size={12} />
          </a>
          {selectedProvider.freeTierNote && (
            <p className="text-[10px] text-text-tertiary mt-1">{selectedProvider.freeTierNote}</p>
          )}
        </div>

        {/* All provider keys quick-fill */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <p className="text-xs font-semibold text-text-secondary mb-3">All Provider Keys</p>
          <div className="space-y-2">
            {AI_PROVIDERS.map((provider) => {
              const hasProviderKey = !!(settings.apiKeys?.[provider.id])
              return (
                <div key={provider.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-border-subtle bg-bg-700/30 p-2.5 sm:p-0 sm:border-0 sm:bg-transparent">
                  <span className="text-xs sm:w-24 shrink-0 font-medium">{provider.name}</span>
                  <div className="relative flex-1">
                    <input
                      className="input-field pr-10 text-xs"
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      placeholder={`${provider.name} key...`}
                      value={keyInputs[provider.id] ?? ''}
                      onChange={(e) => {
                        setKeyInputs((s) => ({ ...s, [provider.id]: e.target.value }))
                        setSavedKeys((s) => ({ ...s, [provider.id]: false }))
                      }}
                    />
                    <button
                      onClick={() => setShowKeys((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    >
                      {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSaveKey(provider.id)}
                    className={cx(
                      'text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap',
                      hasProviderKey ? 'bg-success/10 text-success' : 'btn-primary'
                    )}
                  >
                    {hasProviderKey ? <Check size={12} /> : 'Save'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Usage Stats */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Activity size={16} className="accent-text" /> AI Usage
        </h3>
        {aiUsage.totalRequests > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-bg-700/50 text-center">
                <p className="text-lg font-display font-bold accent-text">{aiUsage.totalRequests}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Requests</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-700/50 text-center">
                <p className="text-lg font-display font-bold accent-text">{formatNumber(aiUsage.totalTokens)}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Total Tokens</p>
              </div>
              <div className="p-3 rounded-lg bg-bg-700/50 text-center">
                <p className="text-lg font-display font-bold accent-text">{providersWithKeys}</p>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wide">Providers</p>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(aiUsage.perProvider).map(([providerId, data]) => {
                const provider = getProvider(providerId)
                return (
                  <div key={providerId} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{provider?.name || providerId}</span>
                    <span className="text-text-tertiary">
                      {data.requests} requests · {formatNumber(data.tokens)} tokens
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              onClick={resetAIUsage}
              className="btn-ghost text-xs px-3 py-1.5 mt-3"
            >
              <Trash2 size={12} /> Reset Usage
            </button>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">No AI requests yet. Start chatting with Nexus AI to see usage stats here.</p>
        )}
      </div>

      {/* Achievements */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Achievements ({achievements.length})</h3>
        {achievements.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg-700/50">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-xs font-semibold">{a.name}</p>
                  <p className="text-[10px] text-text-tertiary">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No achievements yet. Complete quests, defeat bosses, and build streaks to earn them.</p>
        )}
      </div>

      {/* Backup & restore */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Database size={16} className="accent-text" /> Backup & Restore</h3>
        <p className="text-xs text-text-secondary mb-2">Your POS state is stored locally. Export a portable backup before changing devices, browsers, or major versions. API keys are intentionally excluded from exports.</p>
        <p className="text-[11px] text-text-tertiary mb-4">Last backup: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : 'Never'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="btn-ghost text-sm justify-start" onClick={() => {
            const suggested = `pos-backup-${new Date().toISOString().slice(0, 10)}`
            const name = (window.prompt('Backup file name', suggested) || suggested).replace(/[^a-z0-9_-]+/gi, '-')
            const blob = new Blob([useStore.getState().exportData()], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${name}.json`
            // On Android WebView/Chrome this triggers the system's own
            // Downloads chooser/notification — the closest we can get to a
            // real folder picker without a native Capacitor plugin, which
            // isn't in this project and can't be added without network
            // access to fetch and build it.
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 500)
            updateSettings({ lastBackupAt: Date.now() })
          }}><FileJson size={15} /> Export backup</button>
          <label className="btn-ghost text-sm justify-start cursor-pointer">
            <FileJson size={15} /> Import backup
            <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const parsed = JSON.parse(await file.text())
                const data = parsed?.data || parsed
                if (!data?.player || !Array.isArray(data?.quests)) throw new Error('Invalid backup')
                setBackupPreview({
                  fileName: file.name,
                  created: parsed?.exportedAt || null,
                  player: { level: data.player.level, xp: data.player.xp, coins: data.player.coins },
                  counts: { quests: data.quests?.length || 0, habits: data.habits?.length || 0, journals: data.journals?.length || 0, achievements: data.achievements?.length || 0 },
                  payload: parsed,
                })
              } catch {
                setBackupPreview({ error: 'This file is not a valid POS backup.' })
              }
              e.target.value = ''
            }} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-text-tertiary"><ShieldCheck size={14} className="text-success" /> Local-first storage · versioned export · API keys excluded</div>
      </div>

      {/* System health */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity size={16} className="accent-text" /> System Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <HealthItem label="Local Storage" ok={typeof window !== 'undefined' && !!window.localStorage} />
          <HealthItem label="Persistence" ok={true} detail="Zustand + local storage" />
          <HealthItem label="Nexus Provider" ok={settings.aiEnabled ? providersWithKeys > 0 : true} detail={settings.aiEnabled && providersWithKeys === 0 ? 'Local commands only' : 'Ready'} />
          <HealthItem label="Notifications" ok={deviceHealth.notifications.available || (!isNativeApp() && deviceHealth.notifications.detail === 'default')} detail={deviceHealth.notifications.detail} />
          <HealthItem label="Voice" ok={deviceHealth.voice.available || !settings.voiceEnabled} detail={settings.voiceEnabled ? deviceHealth.voice.detail : 'Off'} />
          <HealthItem label="Animations" ok={true} detail={settings.animationsEnabled ? 'Enabled' : 'Reduced'} />
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-error/30">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-error">
          <AlertTriangle size={16} /> Danger Zone
        </h3>
        <p className="text-xs text-text-secondary mb-4">
          This will permanently erase all progress, quests, habits, attributes, and achievements. This cannot be undone.
        </p>
        <button onClick={() => setShowReset(true)} className="btn-ghost text-sm border-error/30 text-error hover:bg-error/10">
          <Trash2 size={14} /> Reset All Progress
        </button>
      </div>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Confirm Reset">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you absolutely sure? All your progress will be permanently lost. You will start from Level 1 with nothing.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowReset(false)} className="btn-ghost text-sm">Cancel</button>
            <button
              onClick={() => { hardReset(); setShowReset(false) }}
              className="btn-ghost text-sm border-error text-error hover:bg-error/10"
            >
              <Trash2 size={14} /> Yes, Reset Everything
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={!!backupPreview} onClose={() => setBackupPreview(null)} title="Restore POS backup">
        {backupPreview?.error ? (
          <div className="space-y-4"><p className="text-sm text-error">{backupPreview.error}</p><button className="btn-ghost text-sm" onClick={() => setBackupPreview(null)}>Close</button></div>
        ) : backupPreview && (
          <div className="space-y-4">
            <div><p className="text-sm font-semibold">{backupPreview.fileName}</p><p className="text-xs text-text-tertiary mt-1">{backupPreview.created ? new Date(backupPreview.created).toLocaleString() : 'Backup file'}</p></div>
            {backupPreview.player && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-bg-700/50 p-3"><p className="text-[10px] uppercase tracking-wider text-text-tertiary">Level</p><p className="text-lg font-mono font-bold">{backupPreview.player.level}</p></div>
                <div className="rounded-xl bg-bg-700/50 p-3"><p className="text-[10px] uppercase tracking-wider text-text-tertiary">XP</p><p className="text-lg font-mono font-bold">{backupPreview.player.xp}</p></div>
                <div className="rounded-xl bg-bg-700/50 p-3"><p className="text-[10px] uppercase tracking-wider text-text-tertiary">Coins</p><p className="text-lg font-mono font-bold">{backupPreview.player.coins}</p></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">{Object.entries(backupPreview.counts).map(([key, value]) => <div key={key} className="rounded-xl bg-bg-700/50 p-3"><p className="text-[10px] uppercase tracking-wider text-text-tertiary">{key}</p><p className="text-lg font-mono font-bold">{value}</p></div>)}</div>
            <p className="text-xs text-text-secondary">Restore replaces your current POS data with this backup. API keys already stored on this device are preserved.</p>
            <div className="flex justify-end gap-2"><button className="btn-ghost text-sm" onClick={() => setBackupPreview(null)}>Cancel</button><button className="btn-primary text-sm" onClick={() => { const ok = useStore.getState().importData(backupPreview.payload); setBackupPreview(null); setTestResult(ok ? { success: true, message: 'Backup restored successfully.' } : { success: false, message: 'Backup could not be restored.' }) }}>Restore backup</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PinSetupForm({ onSave }) {
  const [step, setStep] = useState('first')
  const [first, setFirst] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(value)) { setError('Enter exactly 4 digits'); return }
    if (step === 'first') {
      setFirst(value); setValue(''); setStep('confirm'); setError('')
      return
    }
    if (value !== first) { setError("PINs didn't match — try again"); setValue(''); setStep('first'); setFirst(''); return }
    onSave(value)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label-text">{step === 'first' ? 'Enter a new 4-digit PIN' : 'Confirm your PIN'}</label>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoFocus
        className="input-field text-center tracking-[0.5em] text-lg"
        value={value}
        onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <button type="submit" className="btn-primary text-sm w-full">{step === 'first' ? 'Next' : 'Save PIN'}</button>
    </form>
  )
}

function HealthItem({ label, ok, detail }) {
  return <div className="flex items-center gap-3 rounded-xl bg-bg-700/40 border border-border-subtle p-3"><span className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`} /><div className="min-w-0"><p className="text-xs font-semibold">{label}</p><p className="text-[10px] text-text-tertiary truncate">{detail || (ok ? 'Healthy' : 'Unavailable')}</p></div></div>
}

function ToggleRow({ icon: Icon, label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-bg-700/50">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-text-tertiary" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-text-tertiary">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cx(
          'w-11 h-6 rounded-full transition-colors relative',
          value ? 'accent-bg' : 'bg-bg-600'
        )}
      >
        <motion.div
          layout
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
          style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}
