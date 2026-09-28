// Nexus Device Bridge — native-first Android intents + launcher discovery.
// Browser mode remains safe and web-based. Native mode uses the local
// @apex/nexus-native Capacitor plugin so Android resolves real packages/intents.

import { Capacitor } from '@capacitor/core'
import { findCatalogApp, NEXUS_APP_CATALOG } from './nexusAppCatalog'
import { getOwnerSessionStatus, revokeNexusOwner } from './nexusSecurity'

let nativePromise = null
let discoveredAppsCache = { at: 0, apps: [] }

export const isNativeAndroid = () => {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' }
  catch { return false }
}

export const isAndroidLike = () => {
  try { return /android/i.test(navigator?.userAgent || '') || isNativeAndroid() }
  catch { return isNativeAndroid() }
}

const APP_LINKS = Object.fromEntries(NEXUS_APP_CATALOG.map((a) => [a.key, {
  label: a.label,
  packages: a.packages || [],
  aliases: a.aliases || [],
  webUrl: {
    chatgpt: 'https://chatgpt.com/',
    youtube: 'https://www.youtube.com/',
    whatsapp: 'https://wa.me/',
    telegram: 'https://web.telegram.org/',
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',
    gmail: 'https://mail.google.com/',
    chrome: 'https://www.google.com/',
    maps: 'https://www.google.com/maps/',
    messages: 'sms:',
    spotify: 'https://open.spotify.com/',
    calculator: 'https://www.google.com/search?q=calculator',
    camera: 'https://www.google.com/search?q=camera',
    photos: 'https://photos.google.com/',
    phone: 'tel:',
    contacts: 'content://contacts/people/',
    calendar: 'https://calendar.google.com/',
    files: 'content://com.android.documentsui.documents/root/primary',
    drive: 'https://drive.google.com/',
    meet: 'https://meet.google.com/',
    playstore: 'https://play.google.com/store',
    recorder: 'https://www.google.com/search?q=voice+recorder',
    keep: 'https://keep.google.com/',
    linkedin: 'https://www.linkedin.com/',
    reddit: 'https://www.reddit.com/',
    x: 'https://x.com/',
    snapchat: 'https://www.snapchat.com/',
    discord: 'https://discord.com/app',
    amazon: 'https://www.amazon.in/',
    flipkart: 'https://www.flipkart.com/',
  }[a.key] || `https://www.google.com/search?q=${encodeURIComponent(a.label)}`,
}]))

const normalise = (value = '') => String(value).trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ')
const toSafeDigits = (value = '') => String(value).replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')

async function getNativeBridge() {
  if (!isNativeAndroid()) return null
  if (!nativePromise) nativePromise = import('@apex/nexus-native').then((m) => m.NexusNative).catch(() => null)
  return nativePromise
}

const webOpen = (url) => {
  if (!url || typeof window === 'undefined') return false
  try { window.location.assign(url); return true } catch { return false }
}

async function nativeOpenPackage(packageName) {
  if (!packageName) return false
  const Native = await getNativeBridge()
  if (!Native?.launchApp) return false
  try { return !!(await Native.launchApp({ packageName }))?.completed } catch { return false }
}

async function nativeOpenUrl(url, packageName = '') {
  if (!url) return false
  const Native = await getNativeBridge()
  if (Native?.openUrl) {
    try { return !!(await Native.openUrl({ url, packageName }))?.completed } catch {}
  }
  return false
}

async function nativeOpenIntent({ action = 'android.intent.action.VIEW', data = '', packageName = '', type = '' } = {}) {
  const Native = await getNativeBridge()
  if (!Native?.openIntent) return false
  try {
    return !!(await Native.openIntent({ action, data, packageName, type }))?.completed
  } catch { return false }
}

export async function discoverApps(force = false) {
  if (!isNativeAndroid()) return []
  if (!force && Date.now() - discoveredAppsCache.at < 60000) return discoveredAppsCache.apps
  const Native = await getNativeBridge()
  if (!Native?.listApps) return []
  try {
    const result = await Native.listApps()
    const apps = Array.isArray(result?.apps) ? result.apps : []
    discoveredAppsCache = { at: Date.now(), apps }
    return apps
  } catch { return [] }
}

function scoreDiscoveredApp(app, query) {
  const q = normalise(query)
  const name = normalise(app?.label)
  const pkg = normalise(app?.packageName)
  if (!q || !name) return -1
  if (name === q) return 1200
  if (name.startsWith(q)) return 1000 - Math.min(100, name.length - q.length)
  if (name.includes(q)) return 900 - name.length
  if (q.includes(name)) return 860 - name.length
  if (pkg.includes(q.replace(/\s+/g, ''))) return 700 - pkg.length
  const words = q.split(' ').filter(Boolean)
  const hits = words.filter((word) => name.includes(word)).length
  return hits ? 500 + hits * 60 : -1
}

export async function resolveAppTarget(query) {
  const catalog = findCatalogApp(query)
  if (catalog) return catalog
  const discovered = await discoverApps()
  if (!discovered.length) return null
  const ranked = discovered
    .map((app) => ({ app, score: scoreDiscoveredApp(app, query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.app || null
}

export const launchApp = async (query) => {
  const raw = normalise(query)
  const catalog = findCatalogApp(raw)
  const key = catalog?.key || raw
  const entry = APP_LINKS[key]

  if (isNativeAndroid()) {
    if (entry?.packages?.length) {
      for (const packageName of entry.packages) {
        if (await nativeOpenPackage(packageName)) {
          return { ok: true, kind: 'external-app', app: entry.label, message: `Launching ${entry.label}.` }
        }
      }
    }

    const found = await resolveAppTarget(query)
    if (found?.packageName && await nativeOpenPackage(found.packageName)) {
      return { ok: true, kind: 'external-app', app: found.label, message: `Launching ${found.label}.` }
    }

    if (entry?.webUrl && webOpen(entry.webUrl)) {
      return { ok: true, kind: 'external-web', app: entry.label, message: `The native ${entry.label} app was not available, so I opened its web version.` }
    }
    return { ok: false, code: 'launch-failed', message: `I couldn't find or launch “${query}” on this Android device.` }
  }

  if (entry?.webUrl) {
    return webOpen(entry.webUrl)
      ? { ok: true, kind: 'external-web', app: entry.label, message: `Opening ${entry.label} in the browser.` }
      : { ok: false, code: 'launch-failed', message: `I couldn't open ${entry.label} from this browser.` }
  }
  return { ok: false, code: 'unknown-app', message: `I don't have a safe launcher for “${query}”.` }
}

export const composeSms = async ({ to = '', body = '' } = {}) => {
  const digits = toSafeDigits(to)
  if (!digits || digits.length < 6) return { ok: false, code: 'invalid-recipient', message: 'I need a valid phone number.' }
  const data = `smsto:${encodeURIComponent(digits)}?body=${encodeURIComponent(String(body || ''))}`
  if (await nativeOpenIntent({ action: 'android.intent.action.SENDTO', data })) {
    return { ok: true, kind: 'sms-compose', message: `SMS composer opened for ${digits}. You still press Send.` }
  }
  return webOpen(`sms:${encodeURIComponent(digits)}?body=${encodeURIComponent(String(body || ''))}`)
    ? { ok: true, kind: 'sms-compose', message: `SMS composer opened for ${digits}. You still press Send.` }
    : { ok: false, code: 'sms-failed', message: 'I could not open the SMS composer.' }
}

export const composeWhatsApp = async ({ to = '', body = '' } = {}) => {
  const digits = toSafeDigits(to).replace('+', '')
  if (!digits || digits.length < 6) return { ok: false, code: 'invalid-recipient', message: 'I need a valid phone number for WhatsApp.' }
  const data = `whatsapp://send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(String(body || ''))}`
  if (await nativeOpenIntent({ action: 'android.intent.action.VIEW', data, packageName: 'com.whatsapp' })) {
    return { ok: true, kind: 'whatsapp-compose', message: `WhatsApp compose opened for ${digits}. You still press Send.` }
  }
  if (await nativeOpenUrl(data)) {
    return { ok: true, kind: 'whatsapp-compose', message: `WhatsApp compose opened for ${digits}. You still press Send.` }
  }
  return webOpen(`https://wa.me/${digits}?text=${encodeURIComponent(String(body || ''))}`)
    ? { ok: true, kind: 'whatsapp-compose', message: `WhatsApp web compose opened for ${digits}. You still press Send.` }
    : { ok: false, code: 'whatsapp-failed', message: 'I could not open WhatsApp compose.' }
}

export const openDialer = async (number) => {
  const digits = toSafeDigits(number)
  if (!digits || digits.length < 6) return { ok: false, code: 'invalid-number', message: 'I need a valid phone number.' }
  const data = `tel:${encodeURIComponent(digits)}`
  if (await nativeOpenIntent({ action: 'android.intent.action.DIAL', data })) return { ok: true, kind: 'dialer', message: `Dialer opened for ${digits}. I did not place the call.` }
  return webOpen(data)
    ? { ok: true, kind: 'dialer', message: `Dialer opened for ${digits}. I did not place the call.` }
    : { ok: false, code: 'dialer-failed', message: 'I could not open the dialer.' }
}

export const openMaps = async (query) => {
  const q = String(query || '').trim()
  if (!q) return { ok: false, code: 'missing-query', message: 'I need a place or address.' }
  const mapsPackage = 'com.google.android.apps.maps'
  const geo = `geo:0,0?q=${encodeURIComponent(q)}`
  if (await nativeOpenIntent({ action: 'android.intent.action.VIEW', data: geo, packageName: mapsPackage })) return { ok: true, kind: 'maps', message: `Opening Maps for “${q}”.` }
  if (await nativeOpenUrl(geo, mapsPackage)) return { ok: true, kind: 'maps', message: `Opening Maps for “${q}”.` }
  return webOpen(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)
    ? { ok: true, kind: 'maps', message: `Opening Maps for “${q}”.` }
    : { ok: false, code: 'maps-failed', message: 'I could not open Maps.' }
}

export const openSystemSettings = async () => {
  const Native = await getNativeBridge()
  try {
    if (Native?.openSettings && (await Native.openSettings())?.completed) return { ok: true, kind: 'settings', message: 'Opening Android settings.' }
  } catch {}
  return webOpen('app-settings:')
    ? { ok: true, kind: 'settings', message: 'Opening device settings.' }
    : { ok: false, code: 'settings-failed', message: 'I could not open device settings.' }
}

export const shareText = async ({ title = 'Nexus', text = '' } = {}) => {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return { ok: true, kind: 'share', message: 'Share sheet opened.' }
    } catch (error) {
      if (error?.name === 'AbortError') return { ok: false, code: 'cancelled', message: 'Share cancelled.' }
    }
  }
  return { ok: false, code: 'unsupported', message: 'System sharing is not available here.' }
}

export const openAppDetails = async () => {
  const Native = await getNativeBridge()
  try {
    if (Native?.openAppDetails && (await Native.openAppDetails())?.completed) return { ok: true, kind: 'settings', message: 'Opening Nexus app permissions.' }
  } catch {}
  return { ok: false, code: 'unsupported', message: 'App permission settings are available on Android.' }
}

export const requestMicrophonePermission = async () => {
  const Native = await getNativeBridge()
  if (!Native?.requestMicrophonePermission) return false
  try { return !!(await Native.requestMicrophonePermission())?.granted } catch { return false }
}

export const getDeviceCapabilities = () => ({
  androidLike: isAndroidLike(),
  nativeCapacitor: isNativeAndroid(),
  appLaunch: isAndroidLike(),
  nativeAppLauncher: isNativeAndroid(),
  appDiscovery: isNativeAndroid(),
  smsCompose: isAndroidLike(),
  dialer: isAndroidLike(),
  maps: isAndroidLike(),
  webShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  fullDeviceAutomation: false,
  backgroundWakeWord: isNativeAndroid(),
  ownerVerification: isNativeAndroid(),
  silentMessageSend: false,
})

export async function startBackgroundWake(wakePhrase = 'nexus') {
  if (!isNativeAndroid()) return { ok: false, code: 'not-native', message: 'Background wake is available only in the Android app.' }
  const Native = await getNativeBridge()
  if (!Native?.startWakeService) return { ok: false, code: 'native-bridge-missing', message: 'Nexus native wake bridge is not installed.' }
  try {
    const mic = await Native.requestMicrophonePermission()
    if (!mic?.granted) return { ok: false, code: 'microphone-denied', message: 'Microphone permission is required for Hey Nexus.' }
    try {
      const notification = await Native.requestNotificationPermission?.()
      if (notification && !notification.granted) {
        // Do not block wake service if Android notification permission is denied.
      }
    } catch {}
    const result = await Native.startWakeService({ wakePhrase })
    if (result?.started) {
      try { await Native?.setWakePaused?.({ paused: false }) } catch {}
      return { ok: true, message: 'Nexus wake listening is armed. Say “Nexus” followed by a command.' }
    }
    return { ok: false, code: 'wake-failed', message: result?.error || 'Android could not start the Nexus wake service.' }
  } catch (error) {
    return { ok: false, code: 'wake-error', message: error?.message || 'Could not start wake listening.' }
  }
}

export async function stopBackgroundWake() {
  if (!isNativeAndroid()) return { ok: true, stopped: true }
  const Native = await getNativeBridge()
  try {
    const result = await Native?.stopWakeService?.()
    try { await Native?.setWakePaused?.({ paused: false }) } catch {}
    return { ok: !!result?.stopped, stopped: true }
  } catch {
    try { await Native?.setWakePaused?.({ paused: false }) } catch {}
    return { ok: false, stopped: false }
  }
}

export async function setWakePaused(paused) {
  if (!isNativeAndroid()) return false
  const Native = await getNativeBridge()
  try { return !!(await Native?.setWakePaused?.({ paused }))?.paused === !!paused } catch { return false }
}

export async function getWakeStatus() {
  if (!isNativeAndroid()) return { running: false }
  const Native = await getNativeBridge()
  try { return await Native?.isWakeServiceRunning?.() || { running: false } } catch { return { running: false } }
}

export async function getPendingWakeCommand() {
  if (!isNativeAndroid()) return null
  const Native = await getNativeBridge()
  try {
    const result = await Native?.getPendingWakeCommand?.()
    if (!result?.pending) return null
    return String(result?.command || '')
  } catch { return null }
}

export async function clearPendingWakeCommand() {
  if (!isNativeAndroid()) return false
  const Native = await getNativeBridge()
  try { return !!(await Native?.clearPendingWakeCommand?.())?.cleared } catch { return false }
}

export const getOwnerAuthorizationStatus = getOwnerSessionStatus
export const revokeOwnerAuthorization = revokeNexusOwner

export const explainDeviceLimits = () => 'Nexus can launch installed Android apps through native intents and launcher discovery, open Maps, prepare SMS/WhatsApp messages, open the dialer and share text. Owner verification protects voice-triggered commands. Android still controls permissions; Nexus never silently sends a message, places a call, bypasses permissions, or guarantees always-on listening after a force-stop.'
