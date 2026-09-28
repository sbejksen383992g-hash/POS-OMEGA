// Nexus automation: contacts lookup, WhatsApp send/delete, weather.
// Everything here runs only on explicit voice/text commands; risky actions are gated in AICommand.
import { Capacitor } from '@capacitor/core'
import { composeWhatsApp } from './nexusDevice'

const isNative = () => { try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' } catch { return false } }
let bridgePromise = null
const bridge = async () => {
  if (!isNative()) return null
  if (!bridgePromise) bridgePromise = import('@apex/nexus-native').then((m) => m.NexusNative).catch(() => null)
  return bridgePromise
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const LAST_KEY = 'nexus-last-whatsapp'
const COUNTRY_KEY = 'nexus-default-country'

// ── Status / permissions (used by Settings) ─────────────────────────────────────────────
export async function getAutomationStatus() {
  const Native = await bridge()
  if (!Native) return { native: false }
  const safe = async (fn, fallback) => { try { return await fn() } catch { return fallback } }
  return {
    native: true,
    accessibility: !!(await safe(() => Native.isAccessibilityEnabled(), {}))?.enabled,
    overlay: !!(await safe(() => Native.canDrawOverlays(), {}))?.granted,
  }
}
export async function requestContacts() { const N = await bridge(); try { return !!(await N?.requestContactsPermission?.())?.granted } catch { return false } }
export async function openAccessibilitySettings() { const N = await bridge(); try { return !!(await N?.openAccessibilitySettings?.())?.completed } catch { return false } }
export async function openOverlaySettings() { const N = await bridge(); try { return !!(await N?.openOverlaySettings?.())?.completed } catch { return false } }

// ── Contacts ────────────────────────────────────────────────────────────────────────────
export async function findContacts(name) {
  const Native = await bridge()
  if (!Native?.searchContacts) return { status: 'unavailable', matches: [] }
  try {
    const perm = await Native.requestContactsPermission()
    if (!perm?.granted) return { status: 'no-permission', matches: [] }
    const res = await Native.searchContacts({ query: String(name || '') })
    return { status: 'ok', matches: res?.contacts || [] }
  } catch { return { status: 'error', matches: [] } }
}

const digitsOf = (n) => String(n || '').replace(/[^\d+]/g, '')
export function toWhatsAppNumber(raw) {
  let d = digitsOf(raw)
  if (d.startsWith('+')) return d.slice(1)
  d = d.replace(/^0+/, '')
  let cc = '91'
  try { cc = localStorage.getItem(COUNTRY_KEY) || '91' } catch { /* optional */ }
  return d.length <= 10 ? `${cc}${d}` : d
}

const ORD = [[/\b(?:second|2nd|two|dusra|doosra)\b/, 1], [/\b(?:third|3rd|three|teesra)\b/, 2], [/\b(?:fourth|4th|four)\b/, 3], [/\b(?:first|1st|pehla|pehle)\b|^(?:number\s+)?one$/, 0]]
const compact = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** Resolve "uppin", "rohan 2", "the second one" against the offered options. Returns index, -1 (cancel) or null (unclear). */
export function pickOption(reply, options) {
  const text = String(reply || '').toLowerCase().trim()
  if (!text) return null
  if (/^(?:cancel|never ?mind|stop|forget it|no|nope|abort)\b/.test(text)) return -1
  const c = compact(text.replace(/\b(?:sir|the|one|please|send|to|it|him|her)\b/g, ' '))
  if (c) {
    const hits = options.map((o, i) => [i, compact(o.name)]).filter(([, n]) => n.includes(c) || (c.length > 3 && c.includes(n)))
    if (hits.length === 1) return hits[0][0]
    const tokens = text.split(/\s+/).map(compact).filter((t) => t.length > 1)
    const scored = options.map((o, i) => [i, tokens.filter((t) => compact(o.name).includes(t)).length]).sort((a, b) => b[1] - a[1])
    if (scored[0]?.[1] > 0 && scored[0][1] > (scored[1]?.[1] || 0)) return scored[0][0]
  }
  for (const [re, idx] of ORD) if (re.test(text) && idx < options.length) return idx
  if (/\blast\b/.test(text)) return options.length - 1
  return null
}

// ── WhatsApp ────────────────────────────────────────────────────────────────────────────
export const getLastWhatsApp = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null') } catch { return null } }
const saveLast = (rec) => { try { localStorage.setItem(LAST_KEY, JSON.stringify({ ...rec, at: Date.now() })) } catch { /* optional */ } }

async function waitForAutomation(timeoutMs = 24000) {
  const Native = await bridge()
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await sleep(700)
    try {
      const r = await Native.getAutomationResult()
      if (r?.done) return { ok: !!r.ok, detail: r.detail || '' }
    } catch { /* keep polling */ }
  }
  return { ok: false, detail: 'WhatsApp did not respond in time.' }
}

export async function sendWhatsAppTo({ name, number, body }) {
  const to = toWhatsAppNumber(number)
  const Native = await bridge()
  const armed = Native?.armWhatsAppAction ? await Native.armWhatsAppAction({ action: 'send' }).catch(() => null) : null
  const opened = await composeWhatsApp({ to, body })
  if (!opened.ok) return { ok: false, message: opened.message }
  if (!armed?.armed) {
    return { ok: true, sent: false, message: `I opened WhatsApp with your message to ${name} ready. To let me press Send myself, turn on “Nexus WhatsApp automation” in Settings → Nexus automation.` }
  }
  const result = await waitForAutomation()
  if (result.ok) { saveLast({ name, number: to, body }); return { ok: true, sent: true, message: `Done sir. Sent to ${name}: “${body}”.` } }
  return { ok: false, message: `I opened the chat with ${name}, but could not confirm Send. ${result.detail}` }
}

export async function deleteLastWhatsApp({ name, number } = {}) {
  const last = getLastWhatsApp()
  const target = number ? { name, number: toWhatsAppNumber(number) } : last && { name: last.name, number: last.number }
  if (!target?.number) return { ok: false, message: 'I do not have a recent WhatsApp message to delete. Tell me whose chat, for example “delete my last message to Rohan”.' }
  const Native = await bridge()
  const armed = Native?.armWhatsAppAction ? await Native.armWhatsAppAction({ action: 'delete_last' }).catch(() => null) : null
  if (!armed?.armed) return { ok: false, message: 'Deleting needs “Nexus WhatsApp automation” turned on in Settings → Nexus automation.' }
  const opened = await composeWhatsApp({ to: target.number, body: '' })
  if (!opened.ok) return { ok: false, message: opened.message }
  const result = await waitForAutomation(26000)
  if (result.ok) { try { localStorage.removeItem(LAST_KEY) } catch { /* optional */ } return { ok: true, message: `Deleted your last message to ${target.name} for everyone.` } }
  return { ok: false, message: `I could not delete it. ${result.detail}` }
}

// ── Weather (Open-Meteo: no API key) ────────────────────────────────────────────────────
const WMO = { 0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 80: 'rain showers', 81: 'rain showers', 82: 'violent rain showers', 95: 'a thunderstorm', 96: 'a thunderstorm with hail', 99: 'a thunderstorm with hail' }
const fetchJson = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json() }
const devicePosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('no-geo'))
  navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { timeout: 8000, maximumAge: 600000 })
})

export async function getWeather(city) {
  try {
    let lat, lon, label = String(city || '').trim()
    if (label) {
      const g = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(label)}&count=1`)
      const hit = g?.results?.[0]
      if (!hit) return { ok: false, message: `I could not find a place called ${label}.` }
      lat = hit.latitude; lon = hit.longitude; label = hit.name
    } else {
      try {
        const c = await devicePosition(); lat = c.latitude; lon = c.longitude; label = 'your location'
        try { localStorage.setItem('nexus-last-geo', JSON.stringify({ lat, lon })) } catch { /* optional */ }
      } catch {
        let saved = null
        try { saved = JSON.parse(localStorage.getItem('nexus-last-geo') || 'null') } catch { /* optional */ }
        if (!saved) return { ok: false, message: 'I could not get your location. Allow location for the app, or ask “weather in Bengaluru”.' }
        lat = saved.lat; lon = saved.lon; label = 'your last known location'
      }
    }
    const w = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)
    const cur = w.current, day = w.daily
    const desc = WMO[cur.weather_code] || 'mixed conditions'
    const rain = day?.precipitation_probability_max?.[0]
    return { ok: true, message: `In ${label} it is ${Math.round(cur.temperature_2m)}°C with ${desc}, feels like ${Math.round(cur.apparent_temperature)}°C. Today ${Math.round(day.temperature_2m_min[0])}–${Math.round(day.temperature_2m_max[0])}°C${Number.isFinite(rain) ? `, ${rain}% chance of rain` : ''}.` }
  } catch {
    return { ok: false, message: 'I could not reach the weather service. Check your internet connection.' }
  }
}
