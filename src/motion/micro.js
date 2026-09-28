/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — micro.js

   Physical hover/tap feedback for buttons and cards, GSAP-driven.
   This is opt-in and additive: PremiumFX.jsx already gives the whole
   app a passive click-burst/tilt/spotlight layer via vanilla JS. Call
   attachMicroInteraction(el) on any element that wants the *stronger*
   named-in-spec feel (hover scale 1.04 + glow, tap scale 0.95 + 0.4°
   tilt + spring rebound) without re-deriving the tween by hand.
   ────────────────────────────────────────────────────────────────────── */

import gsap from 'gsap'
import { EASE, DURATION } from './springs'

/**
 * Wires hover/tap feedback onto a DOM element. Returns a cleanup
 * function. Safe to call multiple times on unrelated elements — each
 * call owns its own listeners.
 */
export function attachMicroInteraction(el, { tiltDeg = 0.4 } = {}) {
  if (!el) return () => {}

  const onEnter = () => {
    gsap.to(el, {
      scale: 1.04,
      boxShadow: '0 0 24px rgba(34,211,238,0.35)',
      duration: DURATION.microHover,
      ease: EASE.quick,
      overwrite: 'auto',
    })
  }
  const onLeave = () => {
    gsap.to(el, {
      scale: 1,
      boxShadow: '0 0 0 rgba(34,211,238,0)',
      duration: DURATION.microHover,
      ease: EASE.quick,
      overwrite: 'auto',
    })
  }
  const onDown = () => {
    gsap.to(el, {
      scale: 0.95,
      rotate: tiltDeg,
      duration: DURATION.microTap,
      ease: EASE.quick,
      overwrite: 'auto',
    })
  }
  const onUp = () => {
    gsap.to(el, {
      scale: 1,
      rotate: 0,
      duration: 0.5,
      ease: EASE.elastic,
      overwrite: 'auto',
    })
  }

  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)

  return () => {
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    gsap.killTweensOf(el)
  }
}

/** React hook wrapper around attachMicroInteraction for a ref. */
export function useMicroInteraction(ref, opts) {
  if (typeof window === 'undefined') return
  // Intentionally not useEffect here — this file stays framework-light
  // so it can be called from either a React useEffect or plain JS.
  // Consumers: `useEffect(() => attachMicroInteraction(ref.current), [])`.
  return () => attachMicroInteraction(ref.current, opts)
}
