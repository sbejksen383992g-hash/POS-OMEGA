import gsap from 'gsap'
import { useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────
   APEX v3.5 — Premium interaction layer.

   One component, mounted once at the app root (Layout.jsx), that adds a
   "motion graphic" reaction to hover and click across the WHOLE app
   without touching every page: a click particle burst + ring pulse, a
   magnetic tilt + spotlight on cards/buttons, a soft cursor glow on
   desktop, and a shine sweep on primary buttons.

   Everything here is done with plain DOM + CSS keyframes (transform and
   opacity only, per the app's own performance rules) via direct style
   mutation rather than React state, specifically so hover/move tracking
   never triggers a re-render — that would fight the 60fps target on a
   mid-range device. No extra dependencies: framer-motion is already a
   project dependency and is used elsewhere for the bigger, deliberate
   animations (page transitions, quest checks, etc.); this layer only
   handles the passive, ambient stuff those components don't cover.
   ────────────────────────────────────────────────────────────────────── */

const INTERACTIVE_SELECTOR = 'button, a, [role="button"], .card-hover, .nav-item, .mobile-nav-item, input[type="range"]'
const TILT_SELECTOR = '.card-hover, .btn-primary, .btn-ghost, .mobile-nav-item'
const isFinePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

let burstSeq = 0

function spawnBurst(container, x, y, color) {
  if (!container) return
  const wrap = document.createElement('span')
  wrap.className = 'apexfx-burst'
  wrap.style.left = `${x}px`
  wrap.style.top = `${y}px`

  const halo = document.createElement('span')
  halo.className = 'apexfx-halo'
  halo.style.setProperty('--fx-color', color)
  wrap.appendChild(halo)

  const ring = document.createElement('span')
  ring.className = 'apexfx-ring'
  ring.style.setProperty('--fx-color', color)
  wrap.appendChild(ring)

  const count = 9
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span')
    dot.className = 'apexfx-dot'
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const dist = 22 + Math.random() * 14
    dot.style.setProperty('--fx-dx', `${Math.cos(angle) * dist}px`)
    dot.style.setProperty('--fx-dy', `${Math.sin(angle) * dist}px`)
    dot.style.setProperty('--fx-color', color)
    dot.style.animationDelay = `${i * 8}ms`
    wrap.appendChild(dot)
  }

  container.appendChild(wrap)
  setTimeout(() => wrap.remove(), 700)
}

export default function PremiumFX() {
  const portalRef = useRef(null)
  if (!portalRef.current && typeof document !== 'undefined') {
    portalRef.current = document.createElement('div')
    portalRef.current.className = 'apexfx-layer'
  }

  useEffect(() => {
    const layer = portalRef.current
    if (layer) document.body.appendChild(layer)

    const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a855f7'

    // ── Click burst + ripple, delegated to the whole document ──────────
    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      const target = e.target.closest?.(INTERACTIVE_SELECTOR)
      if (!target || target.disabled) return

      const fine = isFinePointer()
      const color = accentColor()
      // Keep touch interaction lightweight. The actual button/card already has
      // its own spring feedback; global particle DOM is desktop-only to prevent
      // accumulated overlays from hurting low-end Android hit-testing/FPS.
      if (fine) spawnBurst(layer, e.clientX, e.clientY, color)

      // Contained ripple inside the element itself (buttons/cards), sized
      // to the element so it reads as "the button lighting up", not just
      // a generic click dot.
      if (!fine) { try { navigator.vibrate?.(6) } catch {} ; return }
      const rect = target.getBoundingClientRect()
      const ripple = document.createElement('span')
      ripple.className = 'apexfx-ripple'
      const size = Math.max(rect.width, rect.height) * 1.6
      ripple.style.width = `${size}px`
      ripple.style.height = `${size}px`
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`
      const prevPosition = getComputedStyle(target).position
      if (prevPosition === 'static') target.style.position = 'relative'
      if (getComputedStyle(target).overflow === 'visible' && !target.classList.contains('mobile-nav-item') && !target.classList.contains('nav-item')) {
        target.style.overflow = 'hidden'
      }
      target.appendChild(ripple)
      setTimeout(() => ripple.remove(), 620)

      try { navigator.vibrate?.(6) } catch { /* haptics optional */ }
    }

    // ── Magnetic tilt + spotlight, delegated pointer tracking ──────────
    let activeTilt = null
    const resetTilt = (el) => {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.7,
        ease: 'power3.out',
        overwrite: 'auto',
        transformPerspective: 1000,
      })
      const media = el.querySelector?.('.premium-image-zoom, .premium-media-zoom')
      if (media) gsap.to(media, { scale: 1, x: 0, y: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' })
      el.style.removeProperty('--fx-spot-x')
      el.style.removeProperty('--fx-spot-y')
      el.style.removeProperty('--fx-spot-o')
    }
    const onPointerMove = (e) => {
      if (!isFinePointer()) return
      const target = e.target.closest?.(TILT_SELECTOR)
      if (target !== activeTilt) {
        if (activeTilt) resetTilt(activeTilt)
        activeTilt = target
      }
      if (!target) return
      const rect = target.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const tiltStrength = target.classList.contains('card-hover') ? 10 : 2.5
      const rx = (0.5 - py) * tiltStrength
      const ry = (px - 0.5) * tiltStrength
      gsap.to(target, {
        rotateX: rx,
        rotateY: ry,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
        transformPerspective: 1000,
        transformOrigin: 'center center',
      })
      const media = target.querySelector?.('.premium-image-zoom, .premium-media-zoom')
      if (media) {
        gsap.to(media, {
          scale: 1.08,
          x: (px - 0.5) * -8,
          y: (py - 0.5) * -8,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }
      target.style.setProperty('--fx-spot-x', `${px * 100}%`)
      target.style.setProperty('--fx-spot-y', `${py * 100}%`)
      target.style.setProperty('--fx-spot-o', '1')
    }
    const onPointerLeaveDoc = () => {
      if (activeTilt) { resetTilt(activeTilt); activeTilt = null }
    }

    // ── Ambient cursor glow (desktop only) ──────────────────────────────
    const glow = document.createElement('div')
    glow.className = 'apexfx-cursor-glow'
    let glowVisible = false
    let raf = null
    let targetX = 0
    let targetY = 0
    let curX = 0
    let curY = 0
    const tick = () => {
      curX += (targetX - curX) * 0.18
      curY += (targetY - curY) * 0.18
      glow.style.transform = `translate3d(${curX}px, ${curY}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    const onGlowMove = (e) => {
      if (!isFinePointer()) return
      if (!glowVisible) { layer.appendChild(glow); glowVisible = true; if (!raf) raf = requestAnimationFrame(tick) }
      targetX = e.clientX
      targetY = e.clientY
      glow.style.opacity = '1'
    }
    const onGlowLeave = () => { glow.style.opacity = '0' }

    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointermove', onGlowMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeaveDoc)
    document.addEventListener('mouseleave', onGlowLeave)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointermove', onGlowMove)
      document.removeEventListener('pointerleave', onPointerLeaveDoc)
      document.removeEventListener('mouseleave', onGlowLeave)
      if (raf) cancelAnimationFrame(raf)
      layer?.remove()
    }
  }, [])

  return null
}
