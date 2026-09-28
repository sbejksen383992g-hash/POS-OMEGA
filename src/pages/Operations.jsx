import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BookOpen, BriefcaseBusiness, CalendarDays, Brain, Dumbbell, Wallet, Target, ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'

const sections = [
  { id: 'health', name: 'Health', icon: Activity, keys: ['Health'], description: 'Water, diet, protein, sleep, exercise and recovery.' },
  { id: 'learning', name: 'Learning', icon: Brain, keys: ['Learning'], description: 'Deep work, coding, reading and study.' },
  { id: 'college', name: 'College', icon: BookOpen, keys: ['College'], description: 'Assignments, exams, attendance and projects.' },
  { id: 'finance', name: 'Finance', icon: Wallet, keys: ['Finance'], description: 'Income, saving, spending and business execution.' },
  { id: 'productivity', name: 'Productivity', icon: Target, keys: ['Productivity'], description: 'Planning, routines and reviews.' },
  { id: 'personal', name: 'Personal Development', icon: Dumbbell, keys: ['Personal Development'], description: 'Communication, meditation, discipline and self-management.' },
]

export default function Operations() {
  const quests = useStore((s) => s.quests)
  const stats = useStore((s) => s.stats)
  const activeSections = useMemo(() => sections.map((section) => {
    const list = quests.filter((q) => section.keys.includes(q.section))
    const done = list.filter((q) => q.completed).length
    const total = list.length
    return { ...section, list, done, total, rate: total ? Math.round((done / total) * 100) : 0 }
  }), [quests])

  return (
    <div className="space-y-6 animate-fade-in page-cinematic">
      <header>
        <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Life Systems</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Operations</h1>
        <p className="text-sm text-text-secondary mt-1">One source of truth for the areas that actually move your life forward.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeSections.map(({ id, name, icon: Icon, description, list, done, total, rate }) => (
          <section key={id} className="card card-hover p-5 operation-card-premium overflow-hidden">
            <div className="operation-art premium-media-zoom" aria-hidden="true"><img src={`/assets/images/operation-${id === 'finance' ? 'finance' : id}.webp`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /><div className="operation-art-sheen" /></div>
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10" style={{ background: 'var(--accent-soft)' }}>
                <Icon size={19} className="accent-text" />
              </div>
              <span className="text-xs font-mono text-text-tertiary">{done}/{total}</span>
            </div>
            <h2 className="text-base font-semibold mt-4 relative z-10">{name}</h2>
            <p className="text-xs text-text-tertiary mt-1 min-h-8 relative z-10">{description}</p>
            <div className="mt-4 progress-bar relative z-10"><div className="progress-fill" style={{ width: `${rate}%` }} /></div>
            <div className="flex justify-between items-center mt-2 relative z-10">
              <span className="text-[11px] text-text-tertiary">Completion</span>
              <span className="text-xs font-mono accent-text">{rate}%</span>
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between relative z-10">
              <span className="text-[11px] text-text-tertiary">{list.length ? 'Connected to quest data' : 'No tracked data yet'}</span>
              <Link to="/quests" className="text-xs accent-text inline-flex items-center gap-1">Add quest <ArrowRight size={12} /></Link>
            </div>
          </section>
        ))}
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider">Today</p>
            <h2 className="text-base font-semibold">Execution feed</h2>
          </div>
          <CalendarDays size={18} className="accent-text" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Metric label="Quests completed" value={stats.questsCompleted} />
          <Metric label="Habits completed" value={stats.habitsCompleted} />
          <Metric label="Tracked sections" value={activeSections.filter((s) => s.total > 0).length} />
        </div>
        <p className="text-[11px] text-text-tertiary mt-4">Data is derived from your stored quest/habit activity. No synthetic progress is generated.</p>
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-bg-700/50 p-4 metric-premium"><p className="text-xs text-text-tertiary">{label}</p><p className="text-xl font-mono font-bold mt-1">{value}</p></div>
}
