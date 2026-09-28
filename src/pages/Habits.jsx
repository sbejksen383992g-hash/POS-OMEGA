import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, ATTRIBUTES } from '../store/useStore'
import { motion } from 'framer-motion'
import Modal from '../components/Modal'
import { getWeekDays, playSound } from '../utils/helpers'
import { Plus, Trash2, Flame, Check, Repeat, Sword } from 'lucide-react'

export default function Habits() {
  const habits = useStore((s) => s.habits)
  const quests = useStore((s) => s.quests)
  const toggleHabit = useStore((s) => s.toggleHabit)
  const addHabit = useStore((s) => s.addHabit)
  const deleteHabit = useStore((s) => s.deleteHabit)
  const navigate = useNavigate()

  const [showAdd, setShowAdd] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', attribute: 'discipline' })

  const weekDays = getWeekDays()

  const handleAdd = () => {
    if (!newHabit.name.trim()) return
    addHabit({ ...newHabit, target: 7 })
    setNewHabit({ name: '', attribute: 'discipline' })
    setShowAdd(false)
    playSound('success')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Habit Tracker</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Weekly Habits</h1>
          <p className="text-sm text-text-secondary mt-1">Consistency sharpens the blade. Complete habits daily.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm self-start">
          <Plus size={16} /> New Habit
        </button>
      </div>

      {/* Week header */}
      <div className="card p-4">
        <div className="overflow-x-auto no-scrollbar">
          <div className="grid grid-cols-[minmax(7rem,1fr)_repeat(7,2.25rem)] sm:grid-cols-[minmax(0,1fr)_repeat(7,3rem)] gap-2 items-center" style={{ minWidth: '30rem' }}>
            <span className="text-xs font-semibold text-text-tertiary uppercase sticky left-0" style={{ background: 'var(--surface)' }}>Habit</span>
            {weekDays.map((d) => (
              <div key={d.name} className={`text-center text-xs font-semibold ${d.isToday ? 'accent-text' : 'text-text-tertiary'}`}>
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Habits list */}
      <div className="space-y-3">
        {habits.map((habit) => {
          const attr = ATTRIBUTES.find((a) => a.id === habit.attribute)
          const weekCount = habit.completed.filter(Boolean).length
          // Only this habit's quests — the exact set Nexus opens for
          // "show my <attribute> quests", reached here by tapping the pill.
          const linkedQuests = quests.filter((q) => q.attribute === habit.attribute)
          const linkedXp = linkedQuests.reduce((sum, q) => sum + (q.xp || 0), 0)
          const linkedCoins = linkedQuests.reduce((sum, q) => sum + (q.coins || 0), 0)
          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4"
            >
              <div className="overflow-x-auto no-scrollbar">
                <div className="grid grid-cols-[minmax(7rem,1fr)_repeat(7,2.25rem)] sm:grid-cols-[minmax(0,1fr)_repeat(7,3rem)] gap-2 items-center" style={{ minWidth: '30rem' }}>
                  <div className="flex items-center gap-3 min-w-0 sticky left-0 pr-2" style={{ background: 'var(--surface)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${attr.color}20` }}>
                      {attr.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{habit.name}</p>
                      <p className="text-xs text-text-tertiary truncate">
                        {weekCount}/{habit.target} this week · +{habit.xp} XP each
                      </p>
                    </div>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-tertiary hover:text-error transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {weekDays.map((day) => {
                    const done = habit.completed[day.index]
                    return (
                      <button
                        key={day.name}
                        onClick={() => { toggleHabit(habit.id, day.index); playSound('click') }}
                        className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all ${
                          done ? 'accent-bg' : 'bg-bg-700 hover:bg-bg-600 border border-border'
                        } ${day.isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                      >
                        {done ? <Check size={16} className="text-bg-900" /> : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
              {weekCount === 7 && (
                <div className="mt-3 flex items-center gap-2 text-xs accent-text">
                  <Flame size={14} /> Perfect week! Bonus XP incoming.
                </div>
              )}
              {linkedQuests.length > 0 && (
                <button
                  onClick={() => navigate(`/quests?attribute=${habit.attribute}`)}
                  className="mt-3 w-full flex items-center justify-between rounded-xl bg-bg-700 hover:bg-bg-600 px-3 py-2.5 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Sword size={13} className="accent-text" /> {linkedQuests.length} {attr?.name || habit.attribute} quest{linkedQuests.length === 1 ? '' : 's'}
                  </span>
                  <span className="text-[11px] text-text-tertiary font-mono">+{linkedXp} XP · +{linkedCoins} 🪙</span>
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {habits.length === 0 && (
        <div className="card p-12 text-center">
          <Repeat size={32} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">No habits yet. Add one to start building consistency.</p>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create New Habit">
        <div className="space-y-4">
          <div>
            <label className="label-text">Habit Name</label>
            <input
              className="input-field"
              placeholder="e.g. Cold shower"
              value={newHabit.name}
              onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
          </div>
          <div>
            <label className="label-text">Attribute</label>
            <select
              className="input-field"
              value={newHabit.attribute}
              onChange={(e) => setNewHabit({ ...newHabit, attribute: e.target.value })}
            >
              {ATTRIBUTES.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleAdd} className="btn-primary text-sm">
              <Plus size={14} /> Create Habit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
