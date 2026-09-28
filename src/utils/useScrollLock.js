import { useEffect } from 'react'
import { lockScroll, unlockScroll } from './scrollLock'

// Locks background scroll while `active` is true. Safe to use from
// several overlays simultaneously (see scrollLock.js).
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    lockScroll()
    return () => unlockScroll()
  }, [active])
}
