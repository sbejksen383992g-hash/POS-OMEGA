/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — particles.js

   Procedural DOM+GSAP particle bursts. No sprite sheets, no GIFs —
   everything here is a handful of absolutely-positioned <span>s
   animated with transform/opacity (GPU-cheap) and removed on
   completion. Mirrors the pattern PremiumFX.jsx already uses for the
   passive click burst, but this is the *deliberate* version used for
   quest-complete and level-up moments, driven by GSAP so it can be
   sequenced with the rest of a timeline.
   ────────────────────────────────────────────────────────────────────── */

import gsap from 'gsap'
import { COLOR, DURATION } from './springs'

let portal = null
function getPortal() {
  if (portal || typeof document === 'undefined') return portal
  portal = document.createElement('div')
  portal.className = 'apex-particle-portal'
  Object.assign(portal.style, {
    position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 9999,
  })
  document.body.appendChild(portal)
  return portal
}

/**
 * XP crystal burst at (x, y): a ripple ring plus `count` particles
 * scattering outward in the app's cyan/violet palette, then fading.
 * Returns the GSAP timeline so callers can chain further beats
 * (e.g. "XP flies into profile") after it.
 */
export function burstParticles(x, y, { count = 18 } = {}) {
  const root = getPortal()
  if (!root) return gsap.timeline()

  const wrap = document.createElement('div')
  wrap.style.position = 'absolute'
  wrap.style.left = `${x}px`
  wrap.style.top = `${y}px`
  root.appendChild(wrap)

  const ring = document.createElement('span')
  Object.assign(ring.style, {
    position: 'absolute', left: '-24px', top: '-24px', width: '48px', height: '48px',
    borderRadius: '9999px', border: `2px solid ${COLOR.cyan}`, opacity: '0.8',
  })
  wrap.appendChild(ring)

  const dots = []
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span')
    const color = i % 2 === 0 ? COLOR.cyan : COLOR.violet
    Object.assign(dot.style, {
      position: 'absolute', left: '-3px', top: '-3px', width: '6px', height: '6px',
      borderRadius: '9999px', background: color, boxShadow: `0 0 8px ${color}`,
    })
    wrap.appendChild(dot)
    dots.push(dot)
  }

  const tl = gsap.timeline({
    onComplete: () => wrap.remove(),
  })

  tl.fromTo(ring, { scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: DURATION.questBurst, ease: 'power2.out' }, 0)

  dots.forEach((dot, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const dist = 40 + Math.random() * 36
    tl.fromTo(
      dot,
      { x: 0, y: 0, opacity: 1, scale: 1 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        scale: 0.3,
        duration: DURATION.questBurst * (0.8 + Math.random() * 0.4),
        ease: 'power2.out',
      },
      0.02 * i
    )
  })

  return tl
}

/**
 * Sends a small XP glyph from (fromX, fromY) toward a target element
 * (typically the profile/XP indicator in the header), then pulses the
 * target on arrival. Used to close out the quest-complete sequence.
 */
export function flyXpToTarget(fromX, fromY, targetEl, label = '+XP') {
  const root = getPortal()
  const destination = targetEl || (typeof document !== 'undefined' ? document.querySelector('[data-apex-xp-anchor]') : null)
  if (!root || !destination) return gsap.timeline()

  const rect = destination.getBoundingClientRect()
  const glyph = document.createElement('span')
  glyph.textContent = label
  Object.assign(glyph.style, {
    position: 'absolute', left: `${fromX}px`, top: `${fromY}px`,
    color: COLOR.cyan, fontWeight: '700', fontSize: '12px',
    textShadow: `0 0 10px ${COLOR.cyan}`, pointerEvents: 'none',
  })
  root.appendChild(glyph)

  const tl = gsap.timeline({ onComplete: () => glyph.remove() })
  tl.to(glyph, {
    left: rect.left + rect.width / 2,
    top: rect.top + rect.height / 2,
    scale: 0.6,
    duration: 0.55,
    ease: 'power2.inOut',
  }).to(glyph, { opacity: 0, duration: 0.15 }, '-=0.1')
    .to(destination, { scale: 1.03, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, '-=0.15')

  return tl
}
