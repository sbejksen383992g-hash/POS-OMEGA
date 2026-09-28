import { createContext, useContext, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import ScrollDirector from './ScrollDirector'
import { playSound } from '../utils/helpers'

gsap.registerPlugin(ScrollTrigger)

const MotionContext = createContext({ lenis: null, reducedMotion: false })
export const useMotion = () => useContext(MotionContext)

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))
const INTERACTIVE_SELECTOR = 'button, a, [role="button"], .card-hover, .nav-item, .mobile-nav-item, [data-sound-hover]'

export default function MotionProvider({ children }) {
  const lenisRef = useRef(null)
  const [lenisInstance, setLenisInstance] = useState(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const isReduced = !!query?.matches
    const coarse = !!window.matchMedia?.('(pointer: coarse)')?.matches
    const lowPower = Number(navigator?.deviceMemory || 8) <= 6 || Number(navigator?.hardwareConcurrency || 8) <= 6 || window.innerWidth <= 900
    setReducedMotion(isReduced || (coarse && lowPower))
    // Mobile/touch uses native scrolling. Lenis is intentionally desktop-first here:
    // it avoids an extra animation loop competing with Android touch scrolling.
    const touch = coarse || Number(navigator?.maxTouchPoints || 0) > 0
    // Touch devices always use native WebView scrolling; Lenis would fight the native scroller.
    if (isReduced || touch || (coarse && lowPower)) return undefined

    // Mirrors the reference Drift interaction profile:
    // duration 1, Expo ease, stronger wheel + touch momentum.
    const lenis = new Lenis({
      duration: 1,
      easing: easeOutExpo,
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.4,
    })

    lenisRef.current = lenis
    setLenisInstance(lenis)
    lenis.on('scroll', ScrollTrigger.update)

    const tickerCallback = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenis.destroy()
      lenisRef.current = null
      setLenisInstance(null)
    }
  }, [])

  useEffect(() => {
    // Global audio feedback is independent from motion-reduction preferences.
    // Delegation keeps the sound system coherent
    // without adding handlers to every component.
    const onPointerOver = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      const target = event.target?.closest?.(INTERACTIVE_SELECTOR)
      if (!target || target.disabled) return
      if (event.relatedTarget && target.contains?.(event.relatedTarget)) return
      if (target.dataset.soundHover === 'false') return
      playSound('hover')
    }

    const onPointerDown = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      if (event.button !== undefined && event.button !== 0) return
      const target = event.target?.closest?.(INTERACTIVE_SELECTOR)
      if (!target || target.disabled) return
      if (target.dataset.soundClick === 'false') return
      const kind = target.dataset.soundClick || 'click'
      window.setTimeout(() => playSound(kind), 0)
    }

    document.addEventListener('pointerover', onPointerOver, { passive: true })
    document.addEventListener('pointerdown', onPointerDown, { passive: true })

    return () => {
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return (
    <MotionContext.Provider value={{ lenis: lenisInstance, reducedMotion }}>
      {children}
      <ScrollDirector />
    </MotionContext.Provider>
  )
}
