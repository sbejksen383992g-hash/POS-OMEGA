import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CARD_SELECTORS = '.app-main .card:not([data-no-cinematic])'
const HEADING_SELECTORS = '.app-main h1:not([data-no-cinematic]), .app-main h2:not([data-no-cinematic]), .app-main h3:not([data-no-cinematic]), .app-main .section-heading:not([data-no-cinematic])'
const REVEAL_SELECTOR = '.app-main [data-apex-reveal]:not([data-apex-reveal-ready])'
const PARALLAX_SELECTOR = '.app-main [data-apex-parallax]:not([data-apex-parallax-ready])'

const isTouchDevice = () => Number(navigator?.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches
const isLowPower = () => {
  const touch = isTouchDevice()
  if (!touch) return false
  const memory = Number(navigator?.deviceMemory || 8)
  const cpu = Number(navigator?.hardwareConcurrency || 8)
  return memory <= 6 || cpu <= 6 || window.innerWidth <= 900
}

function markVisible(el) {
  el.classList.add('apex-scroll-visible')
}

function setupLightweightMobileReveals(root) {
  const elements = root.querySelectorAll(`${CARD_SELECTORS}, ${HEADING_SELECTORS}, ${REVEAL_SELECTOR}`)
  if (!elements.length || !('IntersectionObserver' in window)) {
    elements.forEach(markVisible)
    return () => {}
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      markVisible(entry.target)
      io.unobserve(entry.target)
    })
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })
  elements.forEach((el) => io.observe(el))
  return () => io.disconnect()
}

function setupDesktopScroll(root) {
  const context = gsap.context(() => {
    const cards = Array.from(root.querySelectorAll(CARD_SELECTORS))
      .filter((el) => !el.closest('[data-no-cinematic]'))
    cards.forEach((el, i) => {
      if (el.dataset.apexScrollReady) return
      el.dataset.apexScrollReady = '1'
      gsap.fromTo(el,
        { opacity: 0, y: 50, rotateX: -40, transformPerspective: 1000, filter: 'blur(8px)', transformOrigin: '50% 100%', willChange: 'transform, opacity, filter' },
        { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: 0.78, delay: (i % 6) * 0.055, ease: 'power3.out', overwrite: 'auto', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
      )
    })

    const headings = Array.from(root.querySelectorAll(HEADING_SELECTORS))
      .filter((el) => !el.closest('[data-no-cinematic]'))
    headings.forEach((el) => {
      if (el.dataset.apexScrollTextReady) return
      el.dataset.apexScrollTextReady = '1'
      gsap.fromTo(el,
        { opacity: 0, y: 24, filter: 'blur(10px)', clipPath: 'inset(0 0 100% 0 round 4px)', willChange: 'transform, opacity, filter, clip-path' },
        { opacity: 1, y: 0, filter: 'blur(0px)', clipPath: 'inset(0 0 0 0 round 0px)', duration: 0.74, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
      )
    })

    root.querySelectorAll(REVEAL_SELECTOR).forEach((el, i) => {
      el.dataset.apexRevealReady = '1'
      gsap.fromTo(el,
        { opacity: 0, y: 50, rotateX: -40, transformPerspective: 1000, filter: 'blur(8px)', transformOrigin: '50% 100%' },
        { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: Number(el.dataset.apexRevealDuration || 0.78), delay: i * 0.045, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
      )
    })

    root.querySelectorAll(PARALLAX_SELECTOR).forEach((el) => {
      el.dataset.apexParallaxReady = '1'
      const speed = Number(el.dataset.apexParallax || 0.12)
      gsap.to(el, {
        yPercent: speed * -24,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: 0.9 },
      })
    })
  }, root)
  window.setTimeout(() => ScrollTrigger.refresh(), 140)
  return () => {
    context.revert()
    root.querySelectorAll('[data-apex-scroll-ready], [data-apex-scroll-text-ready], [data-apex-reveal-ready], [data-apex-parallax-ready]').forEach((el) => {
      delete el.dataset.apexScrollReady
      delete el.dataset.apexScrollTextReady
      delete el.dataset.apexRevealReady
      delete el.dataset.apexParallaxReady
    })
  }
}

export default function ScrollDirector() {
  useEffect(() => {
    const root = document.querySelector('.app-main') || document.body
    const touch = isTouchDevice()
    // Touch devices: native scrolling only. Reveal observers add work for no visible benefit.
    if (touch) return undefined
    let cleanupMotion = () => {}
    let refreshTimer = 0
    let mutationTimer = 0
    const schedule = () => {
      window.clearTimeout(mutationTimer)
      mutationTimer = window.setTimeout(() => {
        cleanupMotion()
        cleanupMotion = touch ? setupLightweightMobileReveals(root) : setupDesktopScroll(root)
      }, 90)
    }

    schedule()

    // On touch devices avoid watching the entire app DOM. React state changes
    // such as timers/counters can fire many mutations per second; repeatedly
    // tearing down/rebuilding IntersectionObservers creates unnecessary work.
    // A single delayed rescan catches route content that mounts just after the
    // first paint without creating a permanent MutationObserver.
    let mo = null
    let mobileRescan = 0
    if (!touch) {
      mo = new MutationObserver(() => schedule())
      mo.observe(root, { childList: true, subtree: true })
    } else {
      mobileRescan = window.setTimeout(() => {
        cleanupMotion()
        cleanupMotion = setupLightweightMobileReveals(root)
      }, 650)
    }

    return () => {
      window.clearTimeout(mutationTimer)
      window.clearTimeout(refreshTimer)
      window.clearTimeout(mobileRescan)
      mo?.disconnect()
      cleanupMotion()
    }
  }, [])

  return null
}
