/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — transitions.js

   The cinematic page-transition sequence from the v4 spec:
     1. current page scales down slightly
     2. background blurs
     3. new page fades in from blur
     4. a glass highlight sweeps across
     5. everything settles on a spring
   Implemented as a single reversible GSAP timeline over two DOM nodes
   (outgoing/incoming route containers) so it can be dropped in without
   restructuring how routes are rendered.

   NOTE: App.jsx currently drives route transitions with
   framer-motion's <AnimatePresence>, which already works. This module
   is available infrastructure for swapping that in deliberately once
   it's been checked against the real dev server — it is not wired in
   automatically, to avoid touching a working transition blind.
   ────────────────────────────────────────────────────────────────────── */

import gsap from 'gsap'
import { DURATION, EASE } from './springs'

/**
 * @param {HTMLElement} outgoingEl - the page currently on screen (may be null on first mount)
 * @param {HTMLElement} incomingEl - the page being routed to
 * @param {HTMLElement} [sweepEl] - optional element to run the glass-highlight sweep across
 */
export function runPageTransition(outgoingEl, incomingEl, sweepEl) {
  const tl = gsap.timeline({ defaults: { ease: EASE.settle } })
  const total = DURATION.pageTransition

  if (outgoingEl) {
    tl.to(outgoingEl, { scale: 0.98, filter: 'blur(20px)', opacity: 0, duration: total * 0.42 }, 0)
  }

  gsap.set(incomingEl, { opacity: 0, filter: 'blur(16px)', scale: 1.01 })
  tl.to(
    incomingEl,
    { opacity: 1, filter: 'blur(0px)', scale: 1, duration: total * 0.58, ease: EASE.settle },
    outgoingEl ? total * 0.3 : 0
  )

  if (sweepEl) {
    gsap.set(sweepEl, { xPercent: -120, opacity: 0.6 })
    tl.to(sweepEl, { xPercent: 120, opacity: 0, duration: total * 0.5, ease: 'power1.inOut' }, `-=${total * 0.4}`)
  }

  return tl
}
