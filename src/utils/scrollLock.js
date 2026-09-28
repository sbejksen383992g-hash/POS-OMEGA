// ── Shared body scroll-lock ────────────────────────────────────────
// Multiple overlays (Modal, CommandPalette, mobile nav drawer) can be
// open at once. A plain "set overflow hidden on open, restore on
// close" per-component approach breaks when overlays overlap — the
// first one to close would re-enable scrolling while another is still
// open. This keeps a shared reference count so scrolling is restored
// only once every overlay has closed.

let lockCount = 0
let previousOverflow = ''

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockScroll() {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow
  }
}
