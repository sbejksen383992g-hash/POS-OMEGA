import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore, ATTRIBUTES } from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../components/Modal'
import { QuestCheck } from '../components/Apex'
import { difficultyConfig, localDateKey, playSound } from '../utils/helpers'
import { Plus, Check, Trash2, Sword, Filter, BrainCircuit, Tag, CalendarClock, X } from 'lucide-react'
import { normalizeQuestInput } from '../utils/questIntelligence'
import OperationBadge from '../components/OperationBadge'
import { getQuestOperation } from '../utils/operations'

const emptyQuest = {
  title: '', desc: '', attribute: '', difficulty: 'medium', type: 'daily', scheduledDate: '', scheduledTime: '',
}

const getQuestImage = (quest) => {
  const map = { Health: 'quest-health.webp', Learning: 'quest-learning.webp', College: 'quest-college.webp', Finance: 'quest-finance.webp', Productivity: 'quest-productivity.webp', 'Personal Development': 'quest-personal.webp' }
  return `/assets/images/${map[getQuestOperation(quest).id] || 'quest-productivity.webp'}`
}

export default function Quests() {
  const quests = useStore((s) => s.quests)
  const completeQuest = useStore((s) => s.completeQuest)
  const deleteQuest = useStore((s) => s.deleteQuest)
  const addQuest = useStore((s) => s.addQuest)

  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')
  const [newQuest, setNewQuest] = useState(emptyQuest)
  // Nexus's "show today's health quests" lands here as ?attribute=vitality —
  // a one-time preset from the AI, not a persistent URL-driven filter.
  const [searchParams, setSearchParams] = useSearchParams()
  const [attributeFilter, setAttributeFilter] = useState(searchParams.get('attribute') || '')

  const filtered = quests.filter((q) => {
    if (attributeFilter && q.attribute !== attributeFilter) return false
    if (filter === 'active') return !q.completed
    if (filter === 'done') return q.completed
    return true
  })

  const clearAttributeFilter = () => {
    setAttributeFilter('')
    searchParams.delete('attribute')
    setSearchParams(searchParams, { replace: true })
  }

  const intelligence = useMemo(() => normalizeQuestInput(newQuest.title, newQuest.desc, {
    attribute: newQuest.attribute,
    difficulty: newQuest.difficulty,
  }), [newQuest.title, newQuest.desc, newQuest.attribute, newQuest.difficulty])

  const handleAdd = () => {
    if (!newQuest.title.trim()) return
    const diff = difficultyConfig[newQuest.difficulty]
    const scheduled = !!newQuest.scheduledDate
    addQuest({
      ...newQuest,
      type: scheduled ? 'scheduled' : newQuest.type,
      attribute: newQuest.attribute || intelligence.attribute,
      xp: diff.xp,
      coins: diff.coins,
      scheduledDate: scheduled ? newQuest.scheduledDate : null,
      scheduledTime: scheduled ? newQuest.scheduledTime : '',
    })
    setNewQuest(emptyQuest)
    setShowAdd(false)
    playSound('success')
  }

  return (
    <div className="space-y-6 animate-fade-in page-cinematic">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Quest Log</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Daily Quests</h1>
          <p className="text-sm text-text-secondary mt-1">Create recurring quests or pin a task to a specific day.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm self-stretch sm:self-start">
          <Plus size={16} /> New Quest
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <Filter size={14} className="text-text-tertiary shrink-0" />
        {['all', 'active', 'done'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors shrink-0 ${filter === f ? 'accent-bg' : 'text-text-secondary hover:bg-surface-elevated'}`}>
            {f}
          </button>
        ))}
        {attributeFilter && (
          <button onClick={clearAttributeFilter} className="ml-1 px-3 py-2 rounded-lg text-xs font-medium capitalize shrink-0 accent-bg flex items-center gap-1.5">
            {ATTRIBUTES.find((a) => a.id === attributeFilter)?.name || attributeFilter} <X size={12} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {filtered.map((quest) => {
            const diff = difficultyConfig[quest.difficulty] || difficultyConfig.medium
            const attr = ATTRIBUTES.find((a) => a.id === quest.attribute) || ATTRIBUTES[0]
            return (
              <motion.div key={quest.id} layout initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.985 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }} className={`card p-4 quest-card-premium ${quest.completed ? 'opacity-60' : 'card-hover'}`}>
                <div className="quest-card-art premium-media-zoom" aria-hidden="true">
                  <div className="quest-card-art-glow" />
                  <img src={getQuestImage(quest)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                </div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-0.5 quest-check-wrap"><QuestCheck done={quest.completed} label={quest.completed ? 'Completed quest' : `Complete ${quest.title}`} onComplete={() => { completeQuest(quest.id); playSound('success') }} /></div>
                  <div className="quest-card-content flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold leading-snug break-words ${quest.completed ? 'line-through' : ''}`}>{quest.title}</h3>
                    {quest.desc && <p className="text-xs text-text-secondary mt-1 break-words">{quest.desc}</p>}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="badge" style={{ background: `${diff.color}20`, color: diff.color }}>{diff.label}</span>
                      <span className="badge" style={{ background: `${attr.color}20`, color: attr.color }}>{attr.icon} {attr.name}</span>
                      <span className="text-xs font-mono text-text-tertiary">+{quest.xp} XP · +{quest.coins} coins</span>
                      <OperationBadge quest={quest} />
                      {quest.subsection && <span className="badge bg-bg-600/60 text-text-tertiary">{quest.subsection}</span>}
                      {quest.scheduledDate && (
                        <span className="badge bg-accent-soft text-accent"><CalendarClock size={10} /> {quest.scheduledDate}{quest.scheduledTime ? ` · ${quest.scheduledTime}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <button aria-label={`Delete ${quest.title}`} onClick={() => deleteQuest(quest.id)} className="p-2 rounded-lg hover:bg-surface-elevated transition-colors text-text-tertiary hover:text-error shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && <div className="card p-10 sm:p-12 text-center"><Sword size={32} className="mx-auto text-text-tertiary mb-3" /><p className="text-text-secondary">No quests here. Create one to begin your journey.</p></div>}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create New Quest">
        <div className="space-y-4">
          <div><label className="label-text">Quest title</label><input className="input-field" placeholder="e.g. Complete morning workout" value={newQuest.title} onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} autoFocus /></div>
          <div><label className="label-text">Description</label><textarea className="input-field min-h-[76px] resize-none" placeholder="Optional details..." value={newQuest.desc} onChange={(e) => setNewQuest({ ...newQuest, desc: e.target.value })} /></div>
          {newQuest.title.trim() && <div className="rounded-xl border border-border-subtle bg-bg-700/40 p-3"><div className="flex items-center gap-2 mb-2"><BrainCircuit size={14} className="accent-text" /><span className="text-xs font-semibold">Local Quest Intelligence</span><span className="text-[10px] text-text-tertiary ml-auto">{Math.round(intelligence.confidence * 100)}% confidence</span></div><div className="flex flex-wrap gap-2"><span className="badge bg-bg-600/70 text-text-secondary"><Tag size={10} /> {intelligence.section}</span><span className="badge bg-bg-600/70 text-text-secondary">{intelligence.subsection}</span>{intelligence.target != null && <span className="badge bg-bg-600/70 text-text-secondary">{intelligence.target} {intelligence.unit}</span>}<span className="badge bg-bg-600/70 text-text-secondary">{intelligence.measurementType}</span></div><p className="text-[10px] text-text-tertiary mt-2">Classification runs locally and does not require an AI key.</p></div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label-text">Attribute</label><select className="input-field" value={newQuest.attribute} onChange={(e) => setNewQuest({ ...newQuest, attribute: e.target.value })}><option value="">Auto-detect</option>{ATTRIBUTES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select></div>
            <div><label className="label-text">Difficulty</label><select className="input-field" value={newQuest.difficulty} onChange={(e) => setNewQuest({ ...newQuest, difficulty: e.target.value })}>{Object.entries(difficultyConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label} · {cfg.xp} XP</option>)}</select></div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-bg-700/35 p-3 sm:p-4">
            <div className="flex items-start gap-2"><CalendarClock size={15} className="accent-text mt-0.5 shrink-0" /><div><p className="text-xs font-semibold">Optional schedule</p><p className="text-[10px] text-text-tertiary mt-0.5">Leave the date empty for a normal recurring daily quest.</p></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div><label className="label-text">Date</label><input type="date" className="input-field" min={localDateKey()} value={newQuest.scheduledDate} onChange={(e) => setNewQuest({ ...newQuest, scheduledDate: e.target.value, type: e.target.value ? 'scheduled' : 'daily' })} /></div>
              <div><label className="label-text">Time (optional)</label><input type="time" className="input-field" value={newQuest.scheduledTime} onChange={(e) => setNewQuest({ ...newQuest, scheduledTime: e.target.value })} /></div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2"><button onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Cancel</button><button onClick={handleAdd} className="btn-primary text-sm"><Plus size={14} /> Create Quest</button></div>
        </div>
      </Modal>
    </div>
  )
}
