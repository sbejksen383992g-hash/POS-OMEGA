/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — springs.js
   Single source of truth for easing curves and durations so every
   subsystem (transitions, micro, particles) feels like one language
   instead of every component inventing its own timing.
   ────────────────────────────────────────────────────────────────────── */

// GSAP-flavoured eases (strings GSAP understands natively).
export const EASE = {
  settle: 'power4.out',       // big, deliberate motion coming to rest
  quick: 'power2.out',        // fast UI feedback
  inOut: 'power3.inOut',      // section-to-section
  elastic: 'elastic.out(1, 0.55)', // rebound / bounce-back
  back: 'back.out(1.7)',      // pop-in
}

// Physical spring configs, shared by any GSAP-plugin-free spring math
// (e.g. framer-motion pieces that stay in the app) so both animation
// engines agree on "what a spring feels like" here.
export const SPRING = {
  button: { stiffness: 420, damping: 28, mass: 0.9 },
  card: { stiffness: 320, damping: 26, mass: 1 },
  cinematic: { stiffness: 180, damping: 24, mass: 1.4 },
}

// Durations in seconds (GSAP unit), named by what they're for rather
// than a number, so changing the "feel" of the whole app is a one-line
// edit here instead of a search-and-replace.
export const DURATION = {
  microHover: 0.22,
  microTap: 0.16,
  pageTransition: 0.65,
  questBurst: 0.7,
  levelUp: 2.6,
}

export const COLOR = {
  cyan: '#22D3EE',
  violet: '#7C3AED',
  bgDeep: '#070B14',
  bgPanel: '#0F172A',
}
