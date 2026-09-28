import { useState } from 'react'
import { useStore } from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/Modal'
import { formatDate, playSound } from '../utils/helpers'
import { Plus, Trash2, BookOpen, Calendar } from 'lucide-react'

const moods = [
  { id: 'reflective', label: 'Reflective', icon: '🦉' },
  { id: 'energized', label: 'Energized', icon: '⚡' },
  { id: 'calm', label: 'Calm', icon: '🌊' },
  { id: 'determined', label: 'Determined', icon: '🔥' },
  { id: 'grateful', label: 'Grateful', icon: '✨' },
  { id: 'challenged', label: 'Challenged', icon: '⚔️' },
]

export default function Journal() {
  const journals = useStore((s) => s.journals)
  const addJournal = useStore((s) => s.addJournal)
  const deleteJournal = useStore((s) => s.deleteJournal)

  const [showAdd, setShowAdd] = useState(false)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('reflective')

  const handleAdd = () => {
    if (!content.trim()) return
    addJournal({ content, mood })
    setContent('')
    setMood('reflective')
    setShowAdd(false)
    playSound('success')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Journal</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Wisdom Journal</h1>
          <p className="text-sm text-text-secondary mt-1">
            Reflect on your journey. Each entry grants XP and Wisdom.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm self-start">
          <Plus size={16} /> New Entry
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {journals.map((entry) => {
            const moodMeta = moods.find((m) => m.id === entry.mood)
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{moodMeta?.icon || '📝'}</span>
                    <div>
                      <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        {moodMeta?.label || entry.mood}
                      </span>
                      <p className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteJournal(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-tertiary hover:text-error transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{entry.content}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {journals.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen size={32} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">Your journal is empty. Begin recording your thoughts.</p>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Journal Entry">
        <div className="space-y-4">
          <div>
            <label className="label-text">Mood</label>
            <div className="flex flex-wrap gap-2">
              {moods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMood(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mood === m.id ? 'accent-bg' : 'bg-bg-700 text-text-secondary hover:bg-bg-600'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label-text">Entry</label>
            <textarea
              className="input-field min-h-[150px] resize-none"
              placeholder="What did you learn today? What challenged you? What are you grateful for?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-primary text-sm">
              <Plus size={14} /> Save Entry (+40 XP)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
