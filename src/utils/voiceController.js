// ─────────────────────────────────────────────────────────────────────────────
// Nexus voice controller — ONE owner of the microphone at a time.
//
//   IDLE ─► STARTING ─► LISTENING ─► PROCESSING ─► STOPPING ─► IDLE
//                │            │            │
//                └────────────┴────────────┴──► ERROR (via STOPPING; recognizer already released)
//   SPEAKING is a passive state: Nexus TTS is playing and no recognizer exists.
//
// Rules enforced here (the UI never talks to the recognizer directly):
//   • start is refused while STARTING / STOPPING (no double start, no start during stop)
//   • the wake-word recognizer is paused BEFORE the foreground recognizer is created
//     and resumed only after the foreground recognizer has been released
//   • TTS is stopped before recognition starts (no audio-session fight)
//   • stale callbacks from an older session are ignored (session token)
//   • recoverable errors get exactly ONE controlled retry — never a loop
//   • watchdog timers force a clean release if a state gets stuck
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react'
import { isNativeApp, startNativeSpeech, stopNativeSpeech, startWebSpeech, stopWebSpeech, stopSpeaking } from './nativeServices'
import { setWakePaused } from './nexusDevice'

export const VoiceState = Object.freeze({
  IDLE: 'IDLE',
  STARTING: 'STARTING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  STOPPING: 'STOPPING',
  ERROR: 'ERROR',
})

const S = VoiceState
const DEBUG = (() => { try { return !!import.meta.env?.DEV } catch { return false } })()
const log = (...args) => { if (DEBUG || globalThis.__NEXUS_VOICE_DEBUG) console.info('[NexusVoice]', ...args) }

const WATCHDOG_MS = { [S.STARTING]: 9000, [S.LISTENING]: 30000, [S.PROCESSING]: 12000 }

let state = S.IDLE
let message = ''
let snapshot = { state, message }
let session = 0
let active = null // { id, opts, retries, timer }
let watchdog = null
let chain = Promise.resolve()
const subscribers = new Set()

const enqueue = (fn) => {
  const promise = chain.then(fn)
  chain = promise.catch(() => {})
  return promise
}

const isCurrent = (id) => !!active && active.id === id && session === id

function setState(next, nextMessage = '') {
  const changed = state !== next || message !== nextMessage
  if (!changed) return
  log('state', state, '→', next, nextMessage || '')
  state = next
  message = nextMessage
  snapshot = { state, message }
  if (watchdog) { clearTimeout(watchdog); watchdog = null }
  const limit = WATCHDOG_MS[next]
  if (limit && active) {
    const id = active.id
    watchdog = setTimeout(() => {
      if (!isCurrent(id)) return
      log('watchdog fired in', next)
      end(id, next === S.STARTING ? S.ERROR : S.IDLE,
        next === S.STARTING ? 'The microphone did not start. Tap the mic to try again.' : '')
    }, limit)
  }
  subscribers.forEach((fn) => { try { fn(snapshot) } catch { /* subscriber errors must not break voice */ } })
}

export const getVoiceSnapshot = () => snapshot
export const getVoiceState = () => state
export function subscribeVoice(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
export function useVoiceState() {
  return useSyncExternalStore(subscribeVoice, getVoiceSnapshot, getVoiceSnapshot)
}

export const isVoiceBusy = () => state === S.STARTING || state === S.LISTENING || state === S.PROCESSING || state === S.STOPPING

// Releases the recognizer(s) and hands the microphone back to the wake listener. Idempotent.
async function teardown() {
  try {
    if (isNativeApp()) await stopNativeSpeech()
    else await stopWebSpeech()
  } catch (error) { log('teardown stop failed', error?.message) }
  try { if (isNativeApp()) await setWakePaused(false) } catch (error) { log('wake resume failed', error?.message) }
}

function end(id, nextState = S.IDLE, nextMessage = '') {
  if (!isCurrent(id)) return
  const a = active
  session += 1
  active = null
  if (a.timer) clearTimeout(a.timer)
  setState(S.STOPPING)
  enqueue(async () => {
    await teardown()
    setState(nextState, nextMessage)
  })
}

function handleFinal(id, text) {
  if (!isCurrent(id)) return
  const a = active
  a.retries = 0
  setState(S.PROCESSING)
  try { a.opts.onFinal?.(text) } catch (error) { log('onFinal handler threw', error?.message) }
  if (!a.opts.continuous) { end(id, S.IDLE); return }
  // Continuous mode: wait until Nexus finished answering, then open a FRESH session.
  a.timer = setTimeout(async () => {
    if (!isCurrent(id)) return
    a.timer = null
    try { await a.opts.beforeRestart?.() } catch { /* ignore */ }
    if (!isCurrent(id)) return
    enqueue(async () => {
      if (!isCurrent(id)) return
      setState(S.STARTING)
      await begin(id)
    })
  }, 450)
}

function handleError(id, text, meta = {}) {
  if (!isCurrent(id)) return
  const a = active
  const code = Number(meta.code)
  const detail = String(text || '')
  log('recognizer error', code || '', detail)

  if (code === 9 || /permission|denied|insufficient/i.test(detail)) {
    end(id, S.ERROR, `${detail.replace(/\.$/, '')}. Open Android Settings → Apps → APEX → Permissions → Microphone and allow it.`)
    return
  }
  if (code === 6 || code === 7 || /no speech|no match|didn't catch/i.test(detail)) {
    // Silence is not a failure: release cleanly and let the user tap again.
    end(id, S.IDLE, "Didn't catch that — tap the mic and speak again.")
    return
  }
  const recoverable = meta.recoverable !== false && (/busy|network|audio|server|client|disconnect|too many|resetting/i.test(detail) || [1, 2, 3, 4, 5, 8, 10, 11].includes(code))
  if (recoverable && a.retries < 1) {
    a.retries += 1
    const busy = code === 8 || /busy|resetting/i.test(detail)
    setState(S.STARTING, 'Reconnecting microphone…')
    if (a.timer) clearTimeout(a.timer)
    a.timer = setTimeout(() => {
      if (!isCurrent(id)) return
      a.timer = null
      enqueue(async () => {
        if (!isCurrent(id)) return
        try { if (isNativeApp()) await stopNativeSpeech(); else await stopWebSpeech() } catch { /* ignore */ }
        await begin(id)
      })
    }, busy ? 1000 : 400)
    return
  }
  end(id, S.ERROR, detail || 'Voice input failed. Tap the mic to try again.')
}

async function begin(id) {
  if (!isCurrent(id)) return { ok: false, reason: 'superseded' }
  const a = active
  // Stop TTS first so speech synthesis and recognition never fight over the audio session,
  // then make sure the wake-word recognizer is not holding the microphone.
  try { await stopSpeaking() } catch { /* ignore */ }
  if (!isCurrent(id)) return { ok: false, reason: 'superseded' }
  if (isNativeApp()) { try { await setWakePaused(true) } catch { /* ignore */ } }
  if (!isCurrent(id)) return { ok: false, reason: 'superseded' }

  const callbacks = {
    lang: a.opts.lang,
    onState: (on) => {
      if (!isCurrent(id)) return
      if (on && (state === S.STARTING)) setState(S.LISTENING)
      else if (!on && state === S.LISTENING) setState(S.PROCESSING)
    },
    onPartial: (text) => {
      if (!isCurrent(id)) return
      if (state === S.STARTING) setState(S.LISTENING)
      try { a.opts.onPartial?.(text) } catch { /* ignore */ }
    },
    onFinal: (text) => handleFinal(id, text),
    onError: (text, meta) => handleError(id, text, meta),
    onReleased: () => {
      // Native side dropped the recognizer (activity paused/destroyed). Nothing more will arrive.
      if (isCurrent(id)) end(id, S.IDLE)
    },
  }

  log('start', isNativeApp() ? 'native' : 'web', callbacks.lang)
  let ok = false
  try {
    ok = isNativeApp() ? await startNativeSpeech(callbacks) : await startWebSpeech(callbacks)
  } catch (error) {
    log('start threw', error?.message)
  }
  if (!isCurrent(id)) return { ok: false, reason: 'superseded' }
  if (!ok && state === S.STARTING && !a.timer) {
    // startNativeSpeech reports its own reason through onError; make sure we never stay in STARTING.
    end(id, S.ERROR, 'Voice input could not start. Tap the mic to try again.')
  }
  return { ok }
}

/** Begin a listening session. Resolves { ok }. Ignored while another start/stop is in flight. */
export function startVoice(opts = {}) {
  if (state === S.STARTING || state === S.STOPPING || state === S.LISTENING || state === S.PROCESSING) {
    return Promise.resolve({ ok: false, reason: 'busy' })
  }
  const id = ++session
  active = { id, opts, retries: 0, timer: null }
  setState(S.STARTING)
  return enqueue(() => begin(id))
}

/** Cancel/stop the current session and release the microphone. Always safe to call. */
export function stopVoice(reason = 'user') {
  log('stop requested:', reason)
  if (state === S.STOPPING) return chain.then(() => ({ ok: true }))
  if (!active) {
    if (state === S.IDLE || state === S.SPEAKING) return Promise.resolve({ ok: true })
    // ERROR state: just clear it.
    setState(S.IDLE)
    return Promise.resolve({ ok: true })
  }
  const a = active
  session += 1
  active = null
  if (a.timer) clearTimeout(a.timer)
  setState(S.STOPPING)
  return enqueue(async () => {
    await teardown()
    setState(S.IDLE)
    return { ok: true }
  })
}

/** One-tap toggle for the mic button. */
export function toggleVoice(opts) {
  if (state === S.STARTING || state === S.STOPPING) return Promise.resolve({ ok: false, reason: 'busy' })
  if (state === S.LISTENING || state === S.PROCESSING) return stopVoice('toggle')
  return startVoice(opts)
}

/** Nexus TTS reports speaking on/off so the mic label can show SPEAKING (barge-in stays allowed). */
export function setVoiceSpeaking(on) {
  if (on && (state === S.IDLE || state === S.ERROR)) setState(S.SPEAKING)
  else if (!on && state === S.SPEAKING) setState(S.IDLE)
}

export const voiceLabel = (snap = snapshot) => {
  switch (snap.state) {
    case S.STARTING: return snap.message || 'Starting…'
    case S.LISTENING: return 'Listening…'
    case S.PROCESSING: return 'Processing…'
    case S.SPEAKING: return 'Speaking — tap to talk'
    case S.STOPPING: return 'Stopping…'
    case S.ERROR: return snap.message || 'Voice error — tap to retry'
    default: return snap.message || 'Tap to speak'
  }
}
