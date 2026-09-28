/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — gestures.js

   Pointer-driven gestures that go beyond simple hover/tap: magnetic
   pull toward the cursor, and a 3D-ish tilt that follows pointer
   position across a card. Desktop-only (fine-pointer gated) — these
   read as noise on touch.
   ────────────────────────────────────────────────────────────────────── */

import gsap from 'gsap'

const isFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

/** Pulls `el` a few px toward the pointer while hovered. */
export function attachMagnetic(el, strength = 14) {
  if (!el || !isFinePointer()) return () => {}

  const onMove = (e) => {
    const rect = el.getBoundingClientRect()
    const relX = (e.clientX - rect.left - rect.width / 2) / rect.width
    const relY = (e.clientY - rect.top - rect.height / 2) / rect.height
    gsap.to(el, { x: relX * strength, y: relY * strength, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
  }
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
  }

  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  return () => {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    gsap.killTweensOf(el)
  }
}

/** Tilts `el` in 3D based on pointer position — subtle card-in-space feel. */
export function attachTilt(el, maxDeg = 6) {
  if (!el || !isFinePointer()) return () => {}
  el.style.transformPerspective = '800px'

  const onMove = (e) => {
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    gsap.to(el, {
      rotateY: px * maxDeg,
      rotateX: -py * maxDeg,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }
  const onLeave = () => {
    gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' })
  }

  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  return () => {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    gsap.killTweensOf(el)
  }
}
