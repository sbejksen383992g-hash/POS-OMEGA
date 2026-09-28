import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cx } from '../utils/helpers'
import { useScrollLock } from '../utils/useScrollLock'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cx('glass rounded-2xl w-full max-h-[85dvh] overflow-y-auto no-scrollbar', maxWidth)}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between p-5 border-b border-border-subtle sticky top-0 glass z-10">
                <h2 className="text-lg font-display font-semibold">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors">
                  <X size={18} className="text-text-tertiary" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
