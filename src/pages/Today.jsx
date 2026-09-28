import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, Clock3, Target, Zap, ArrowRight, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { localDateKey } from '../utils/helpers'
import OperationBadge from '../components/OperationBadge'

const pad = (n) => String(n).padStart(2, '0')
const timeLabel = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export default function Today() {
  const player = useStore((s) => s.player)
  const quests = useStore((s) => s.quests)
  const habits = useStore((s) => s.habits)
  const alarms = useStore((s) => s.alarms || [])
  const completeQuest = useStore((s) => s.completeQuest)

  const now = new Date()
  const todayKey = localDateKey(now)
  const todayQuests = useMemo(() => quests.filter((q) => {
    if (q.scheduledDate) return q.scheduledDate === todayKey
    if (q.type === 'daily') return true
    return new Date(q.createdAt).toDateString() === now.toDateString()
  }), [quests, todayKey, now])
  const activeQuests = todayQuests.filter((q) => !q.completed)
  const completed = todayQuests.filter((q) => q.completed).length
  const progress = todayQuests.length ? Math.round((completed / todayQuests.length) * 100) : 0
  const upcomingAlarms = alarms.filter((a) => a.enabled && new Date(a.time).getTime() > Date.now()).sort((a, b) => new Date(a.time) - new Date(b.time)).slice(0, 4)

  const blocks = useMemo(() => {
    const items = []
    activeQuests.slice().sort((a, b) => {
      if (!a.scheduledTime && !b.scheduledTime) return 0
      if (!a.scheduledTime) return 1
      if (!b.scheduledTime) return -1
      return a.scheduledTime.localeCompare(b.scheduledTime)
    }).slice(0, 6).forEach((q) => {
      items.push({ time: q.scheduledTime || '—', title: q.title, meta: `${q.xp} XP · ${q.difficulty || 'medium'}`, kind: 'quest', quest: q })
    })
    upcomingAlarms.forEach((a) => items.push({ time: timeLabel(new Date(a.time)), title: a.title, meta: a.repeat === 'daily' ? 'Daily alarm' : 'Reminder', kind: 'alarm' }))
    return items.sort((a, b) => {
      if (a.time === '—') return 1
      if (b.time === '—') return -1
      return a.time.localeCompare(b.time)
    }).slice(0, 8)
  }, [activeQuests, upcomingAlarms])

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="section-heading">Execution layer</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold mt-1">Today</h1>
          <p className="text-sm text-text-secondary mt-1">A focused execution plan generated from your real POS state.</p>
        </div>
        <Link to="/ai" className="btn-primary text-sm"><Sparkles size={15} /> Ask Nexus to plan</Link>
      </header>

      <section className="card p-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 85% 10%, var(--accent-soft), transparent 42%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-strong)' }}>
            <span className="text-2xl font-display font-bold accent-text">{progress}%</span>
            <span className="text-[10px] uppercase tracking-wider text-text-tertiary">complete</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Operator state</p>
                <h2 className="text-xl font-display font-bold">{player.name} · Level {player.level}</h2>
              </div>
              <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{completed}/{todayQuests.length} quests</span>
            </div>
            <div className="progress-bar mt-4"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.45 }} /></div>
            <p className="text-xs text-text-tertiary mt-2">Finish the next executable action. Momentum compounds.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Clock3 size={16} className="accent-text" /> Execution timeline</h2>
            <span className="text-[11px] text-text-tertiary">Local time</span>
          </div>
          {blocks.length ? (
            <div className="space-y-2">
              {blocks.map((item, index) => (
                <motion.div key={`${item.kind}-${item.title}-${index}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className="flex items-center gap-3 p-3 rounded-xl bg-bg-700/40 border border-border-subtle">
                  <div className="w-12 shrink-0 text-center font-mono text-xs text-text-secondary">{item.time}</div>
                  <div className="w-px h-8 bg-border-subtle" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.title}</p>{item.quest ? <div className="mt-1 flex items-center gap-2 flex-wrap"><OperationBadge quest={item.quest} /><p className="text-[11px] text-text-tertiary">{item.meta}</p></div> : <p className="text-[11px] text-text-tertiary">{item.meta}</p>}</div>
                  {item.kind === 'quest' && !item.quest.completed ? <button className="btn-ghost text-xs px-2.5" onClick={() => completeQuest(item.quest.id)}><CheckCircle2 size={14} /> Done</button> : <span className="text-text-tertiary"><Clock3 size={15} /></span>}
                </motion.div>
              ))}
            </div>
          ) : <div className="py-10 text-center"><Target size={22} className="mx-auto text-text-tertiary" /><p className="text-sm mt-3">No active execution blocks.</p><p className="text-xs text-text-tertiary mt-1">Create a quest or ask Nexus to plan your day.</p></div>}
        </section>

        <section className="space-y-4">
          <div className="card p-5">
            <p className="section-heading">Next move</p>
            <div className="flex items-center gap-3 mt-3"><div className="w-10 h-10 rounded-xl accent-bg flex items-center justify-center"><Zap size={18} /></div><div><p className="text-sm font-semibold">{activeQuests[0]?.title || 'Review your system'}</p><p className="text-xs text-text-tertiary">{activeQuests[0] ? `+${activeQuests[0].xp} XP · ${activeQuests[0].difficulty}` : 'Keep the operating system clean.'}</p></div></div>
            {activeQuests[0] && <button className="btn-primary w-full mt-4 text-sm" onClick={() => completeQuest(activeQuests[0].id)}>Complete next quest</button>}
          </div>
          <div className="card p-5">
            <p className="section-heading">Habit pulse</p>
            <div className="mt-3 space-y-2">{habits.slice(0, 4).map((h) => { const day = (now.getDay() + 6) % 7; const done = !!h.completed?.[day]; return <div key={h.id} className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${done ? 'accent-bg' : 'bg-bg-600'}`} /><span className={done ? 'text-text-primary' : 'text-text-secondary'}>{h.name}</span><span className="ml-auto text-text-tertiary">{done ? 'Done' : 'Open'}</span></div> })}</div>
          </div>
          <div className="card p-5">
            <p className="section-heading">Upcoming alarms</p>
            <div className="mt-3 space-y-2">{upcomingAlarms.length ? upcomingAlarms.map((a) => <div key={a.id} className="flex items-center gap-2 text-xs"><CalendarDays size={14} className="accent-text" /><span className="truncate">{a.title}</span><span className="ml-auto font-mono text-text-tertiary">{timeLabel(new Date(a.time))}</span></div>) : <p className="text-xs text-text-tertiary">No upcoming alarms.</p>}</div>
            <Link to="/calendar" className="inline-flex items-center gap-1 text-xs accent-text mt-3">Manage alarms <ArrowRight size={13} /></Link>
          </div>
        </section>
      </div>
    </div>
  )
}
