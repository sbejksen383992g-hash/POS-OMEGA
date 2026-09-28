import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Bell, BellRing, Trash2, Clock3, Plus, Target, X, ChevronLeft, ChevronRight } from 'lucide-react'
import OperationBadge from '../components/OperationBadge'
import { useStore, ATTRIBUTES } from '../store/useStore'
import { difficultyConfig } from '../utils/helpers'
import { normalizeQuestInput } from '../utils/questIntelligence'
import { ensureNativeNotificationPermission, getNotificationHealth, isNativeApp } from '../utils/nativeServices'
import { useEffect } from 'react'

const pad = (n) => String(n).padStart(2, '0')
const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const toInputValue = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
const formatDay = (date) => date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const dayLabel = (date) => date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3).toUpperCase()

export default function Calendar() {
  const quests = useStore((s) => s.quests)
  const alarms = useStore((s) => s.alarms || [])
  const addQuest = useStore((s) => s.addQuest)
  const completeQuest = useStore((s) => s.completeQuest)
  const addAlarm = useStore((s) => s.addAlarm)
  const toggleAlarm = useStore((s) => s.toggleAlarm)
  const deleteAlarm = useStore((s) => s.deleteAlarm)
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [nativeNotificationReady, setNativeNotificationReady] = useState(false)
  const [permissionBusy, setPermissionBusy] = useState(false)
  const [selectedDay, setSelectedDay] = useState(() => localDateKey(new Date()))
  const [task, setTask] = useState({ title: '', desc: '', attribute: '', difficulty: 'medium', time: '', reminder: false })
  const [alarm, setAlarm] = useState({ title: '', note: '', time: toInputValue(new Date(Date.now() + 60 * 60 * 1000)), repeat: 'once' })

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  }), [])

  const selectedDate = useMemo(() => {
    const fromStrip = days.find((d) => localDateKey(d) === selectedDay)
    if (fromStrip) return fromStrip
    const parsed = new Date(`${selectedDay}T00:00:00`)
    return Number.isFinite(parsed.getTime()) ? parsed : days[0]
  }, [days, selectedDay])
  const intelligentTask = normalizeQuestInput(task.title, task.desc, { attribute: task.attribute, difficulty: task.difficulty })

  const shiftSelectedDay = (offset) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    setSelectedDay(localDateKey(next))
  }

  useEffect(() => {
    getNotificationHealth().then((health) => {
      setNativeNotificationReady(!!health.available)
      if (!health.native && health.detail) setPermission(health.detail)
    })
  }, [])

  const getDayQuests = (key) => quests.filter((q) => q.scheduledDate === key)
  const selectedQuests = getDayQuests(selectedDay)

  const requestNotifications = async () => {
    setPermissionBusy(true)
    if (isNativeApp()) {
      const ok = await ensureNativeNotificationPermission()
      setNativeNotificationReady(ok)
    } else if (typeof Notification !== 'undefined') {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
    setPermissionBusy(false)
  }

  const createTask = () => {
    if (!task.title.trim()) return
    const diff = difficultyConfig[task.difficulty]
    const createdQuest = addQuest({
      title: task.title.trim(),
      desc: task.desc.trim(),
      attribute: task.attribute || intelligentTask.attribute,
      difficulty: task.difficulty,
      xp: diff.xp,
      coins: diff.coins,
      type: 'scheduled',
      scheduledDate: selectedDay,
      scheduledTime: task.time || '',
    })

    if (task.reminder && task.time) {
      const reminderAt = new Date(`${selectedDay}T${task.time}`)
      if (Number.isFinite(reminderAt.getTime()) && reminderAt.getTime() > Date.now()) {
        addAlarm({ title: task.title.trim(), note: task.desc.trim() || 'Scheduled quest reminder.', time: reminderAt.toISOString(), repeat: 'once', linkedQuestId: createdQuest?.id || null })
      }
    }
    setTask({ title: '', desc: '', attribute: '', difficulty: 'medium', time: '', reminder: false })
  }

  const createAlarm = () => {
    if (!alarm.title.trim() || !alarm.time) return
    const date = new Date(alarm.time)
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return
    addAlarm({ title: alarm.title.trim(), note: alarm.note.trim(), time: date.toISOString(), repeat: alarm.repeat })
    setAlarm({ title: '', note: '', time: toInputValue(new Date(Date.now() + 60 * 60 * 1000)), repeat: 'once' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="section-heading">Timeline</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold mt-1">Calendar</h1>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">Plan quests for a specific day and attach reminders without duplicating task data.</p>
      </header>

      <section className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><Target size={16} className="accent-text" /> Plan a task</h2>
            <p className="text-xs text-text-tertiary mt-1">Select a date, create one scheduled quest, and optionally add a reminder.</p>
          </div>
          <span className="badge bg-accent-soft text-accent">Day planner</span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="label-text">Jump to any date</label>
            <input type="date" className="input-field" value={selectedDay} onChange={(e) => e.target.value && setSelectedDay(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => shiftSelectedDay(-1)} className="btn-ghost px-3" aria-label="Previous day"><ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span></button>
            <button type="button" onClick={() => setSelectedDay(localDateKey(new Date()))} className="btn-ghost px-3 text-xs">Today</button>
            <button type="button" onClick={() => shiftSelectedDay(1)} className="btn-ghost px-3" aria-label="Next day"><span className="hidden sm:inline">Next</span> <ChevronRight size={16} /></button>
          </div>
        </div>

        <div className="mt-4 -mx-1 overflow-x-auto no-scrollbar pb-1">
          <div className="flex gap-2 px-1 min-w-max">
            {days.map((day) => {
              const key = localDateKey(day)
              const dayQuests = getDayQuests(key)
              const done = dayQuests.filter((q) => q.completed).length
              const active = key === selectedDay
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`w-[74px] shrink-0 rounded-xl border p-2.5 text-center transition-all ${active ? 'border-accent bg-accent-soft' : 'border-border-subtle bg-bg-700/40 hover:border-border-strong'}`}
                >
                  <p className={`text-[10px] font-semibold tracking-wider ${active ? 'accent-text' : 'text-text-tertiary'}`}>{dayLabel(day)}</p>
                  <p className="text-xl font-display font-bold mt-0.5">{day.getDate()}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{done}/{dayQuests.length || 0}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-700/35 p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Selected day</p>
              <p className="text-base font-display font-semibold">{formatDay(selectedDate)}</p>
            </div>
            <span className="text-xs text-text-tertiary">Daily quests remain separate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label-text">Task title</label>
              <input className="input-field" value={task.title} onChange={(e) => setTask((v) => ({ ...v, title: e.target.value }))} placeholder="e.g. Finish Java OOP assignment" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-text">Notes</label>
              <textarea className="input-field min-h-[76px] resize-none" value={task.desc} onChange={(e) => setTask((v) => ({ ...v, desc: e.target.value }))} placeholder="Optional details or definition of done" />
            </div>
            <div>
              <label className="label-text">Attribute</label>
              <select className="input-field" value={task.attribute} onChange={(e) => setTask((v) => ({ ...v, attribute: e.target.value }))}>
                <option value="">Auto-detect</option>
                {ATTRIBUTES.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Difficulty</label>
              <select className="input-field" value={task.difficulty} onChange={(e) => setTask((v) => ({ ...v, difficulty: e.target.value }))}>
                {Object.entries(difficultyConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label} · {cfg.xp} XP</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Time (optional)</label>
              <input type="time" className="input-field" value={task.time} onChange={(e) => setTask((v) => ({ ...v, time: e.target.value }))} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-800/35 p-3 cursor-pointer min-h-[44px]">
              <input type="checkbox" checked={task.reminder} onChange={(e) => setTask((v) => ({ ...v, reminder: e.target.checked }))} className="h-4 w-4 accent-[var(--accent)]" />
              <span><span className="block text-xs font-semibold">Also create reminder</span><span className="block text-[10px] text-text-tertiary">Uses native notification when installed as Android app.</span></span>
            </label>
          </div>

          {task.title.trim() && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="badge bg-bg-600/70 text-text-secondary">{intelligentTask.section} · {intelligentTask.subsection}</span>
              <span className="badge bg-bg-600/70 text-text-secondary">{task.attribute ? ATTRIBUTES.find((a) => a.id === task.attribute)?.name : intelligentTask.attribute}</span>
              {intelligentTask.target != null && <span className="badge bg-bg-600/70 text-text-secondary">{intelligentTask.target} {intelligentTask.unit}</span>}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button onClick={createTask} disabled={!task.title.trim()} className="btn-primary text-sm"><Plus size={14} /> Add to {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold">Scheduled quests</h3><span className="text-[10px] text-text-tertiary">{selectedQuests.length} scheduled</span></div>
          {selectedQuests.length ? selectedQuests.map((q) => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-700/40 border border-border-subtle">
              <button onClick={() => completeQuest(q.id)} disabled={q.completed} className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center ${q.completed ? 'accent-bg border-transparent' : 'border-border-strong hover:border-accent'}`}>
                {q.completed && <CheckCircle2 size={14} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${q.completed ? 'line-through text-text-tertiary' : ''}`}>{q.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap"><OperationBadge quest={q} /><p className="text-[11px] text-text-tertiary truncate">{q.scheduledTime ? q.scheduledTime : 'No time set'} · +{q.xp} XP</p></div>
              </div>
              {q.completed && <span className="badge bg-success/10 text-success">Done</span>}
            </div>
          )) : <p className="text-xs text-text-tertiary py-3">No scheduled quests on this day yet.</p>}
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2"><BellRing size={16} className="accent-text" /> Reminders</h2>
            <p className="text-xs text-text-tertiary mt-1">Android builds use device-level local notifications; browser builds use the browser notification fallback.</p>
          </div>
          <div className="flex items-center gap-2">
            {isNativeApp() ? (nativeNotificationReady ? <span className="badge bg-success/10 text-success">Device notifications on</span> : <button onClick={requestNotifications} disabled={permissionBusy} className="btn-ghost text-xs"><Bell size={14} /> {permissionBusy ? 'Enabling…' : 'Enable device notifications'}</button>) : (permission !== 'granted' && permission !== 'unsupported' ? <button onClick={requestNotifications} className="btn-ghost text-xs"><Bell size={14} /> Allow browser notifications</button> : permission === 'granted' ? <span className="badge bg-success/10 text-success">Browser notifications on</span> : null)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto] gap-3 mt-5">
          <input className="input-field" value={alarm.title} onChange={(e) => setAlarm((a) => ({ ...a, title: e.target.value }))} placeholder="Reminder title — e.g. Java revision" />
          <input className="input-field" value={alarm.note} onChange={(e) => setAlarm((a) => ({ ...a, note: e.target.value }))} placeholder="Optional note" />
          <button onClick={createAlarm} disabled={!alarm.title.trim()} className="btn-primary text-sm">Schedule</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 max-w-xl">
          <div><label className="label-text">Date & time</label><input type="datetime-local" className="input-field" value={alarm.time} onChange={(e) => setAlarm((a) => ({ ...a, time: e.target.value }))} /></div>
          <div><label className="label-text">Repeat</label><select className="input-field" value={alarm.repeat} onChange={(e) => setAlarm((a) => ({ ...a, repeat: e.target.value }))}><option value="once">Once</option><option value="daily">Every day</option></select></div>
        </div>

        <div className="mt-5 space-y-2">
          {alarms.length === 0 && <p className="text-xs text-text-tertiary py-3">No reminders scheduled.</p>}
          {alarms.slice().sort((a, b) => new Date(a.time) - new Date(b.time)).map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-700/50 border border-border-subtle">
              <Clock3 size={16} className={a.enabled ? 'accent-text shrink-0' : 'text-text-tertiary shrink-0'} />
              <div className="flex-1 min-w-0"><p className={`text-sm font-semibold truncate ${!a.enabled ? 'text-text-tertiary' : ''}`}>{a.title}</p><p className="text-[11px] text-text-tertiary truncate">{new Date(a.time).toLocaleString()} · {a.repeat === 'daily' ? 'Daily' : 'Once'}{a.note ? ` · ${a.note}` : ''}</p></div>
              <button onClick={() => toggleAlarm(a.id)} className={`text-xs px-2.5 py-1.5 rounded-lg shrink-0 ${a.enabled ? 'accent-bg' : 'bg-bg-600 text-text-tertiary'}`}>{a.enabled ? 'On' : 'Off'}</button>
              <button aria-label={`Delete reminder ${a.title}`} onClick={() => deleteAlarm(a.id)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-tertiary hover:text-error shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="text-xs text-text-tertiary flex items-center gap-2"><CalendarDays size={14} /> Calendar tasks, reminders and completion state are stored in the same POS data source.</div>
    </div>
  )
}
