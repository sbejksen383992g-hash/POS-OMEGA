/* ─────────────────────────────────────────────────────────────────────
   APEX motion engine — audio.js

   The app already has a procedural Web Audio sound engine in
   src/utils/helpers.js (playSound) — oscillator tones, no audio files
   to ship or go missing. This module just gives the motion engine a
   vocabulary that matches the rest of the system (hover/open/close/
   success/levelup) instead of every caller importing helpers.js
   directly and guessing which key exists.
   ────────────────────────────────────────────────────────────────────── */

import { playSound } from '../utils/helpers'

// Maps motion-engine event names -> existing playSound() tone keys.
// 'hover' and 'open'/'close' are new vocabulary; they fall back to the
// closest existing tone so nothing throws if a sound key is missing.
const FX_MAP = {
  hover: 'click',
  click: 'click',
  open: 'click',
  close: 'click',
  success: 'success',
  levelup: 'levelup',
  error: 'error',
  boss: 'boss',
}

export function playFx(name) {
  const key = FX_MAP[name] || 'click'
  try {
    playSound(key)
  } catch {
    // Audio is ambient, never critical — a failure here must never
    // interrupt the interaction it was decorating.
  }
}
