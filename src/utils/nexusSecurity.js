// Nexus owner authorization.
// Important: speech recognition identifies words, not the speaker. Secure Nexus
// voice access therefore uses Android biometric/device credentials as the owner
// gate, then keeps a short-lived native authorization token for hands-free wake.

import { Capacitor } from '@capacitor/core'

let verifiedUntil = 0
let inFlight = null

const isNativeAndroid = () => {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' } catch { return false }
}

async function nativeBridge() {
  if (!isNativeAndroid()) return null
  try {
    return (await import('@apex/nexus-native')).NexusNative
  } catch {
    return null
  }
}

export function isOwnerSessionValid() {
  return Date.now() < verifiedUntil
}

export function clearOwnerSession() {
  verifiedUntil = 0
}

export async function getOwnerSessionStatus() {
  if (!isNativeAndroid()) return { authorized: true, until: verifiedUntil }
  if (isOwnerSessionValid()) return { authorized: true, until: verifiedUntil, method: 'memory-cache' }
  try {
    const Native = await nativeBridge()
    const result = await Native?.getOwnerAuthStatus?.()
    if (result?.authorized) verifiedUntil = Number(result.until) || (Date.now() + 15 * 60 * 1000)
    return { authorized: !!result?.authorized, until: Number(result?.until || 0), method: 'android' }
  } catch {
    return { authorized: false, until: 0, method: 'unavailable' }
  }
}

export async function verifyNexusOwner({ force = false, ttlMs = 15 * 60 * 1000 } = {}) {
  if (!isNativeAndroid()) return { ok: true, method: 'browser-session' }
  if (!force) {
    const current = await getOwnerSessionStatus()
    if (current.authorized) return { ok: true, method: current.method || 'cached', until: current.until }
  }
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const Native = await nativeBridge()
      if (!Native?.verifyOwner) {
        return { ok: false, message: 'Owner verification bridge is unavailable. Rebuild the Android app with the current Nexus native plugin.' }
      }
      const result = await Native.verifyOwner()
      if (result?.verified) {
        verifiedUntil = Date.now() + ttlMs
        return { ok: true, method: 'android-biometric', message: 'Owner verified.', until: verifiedUntil }
      }
      return { ok: false, message: result?.reason || 'Owner verification was cancelled.' }
    } catch (error) {
      return { ok: false, message: error?.message || 'Owner verification is unavailable.' }
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export async function revokeNexusOwner() {
  verifiedUntil = 0
  if (!isNativeAndroid()) return true
  try {
    const Native = await nativeBridge()
    await Native?.revokeOwner?.()
    return true
  } catch { return false }
}

export const securityNotice = 'Speech recognition alone is not speaker authentication. Nexus uses Android biometric/device credentials for secure owner verification; the biometric data never enters the JavaScript app.'
