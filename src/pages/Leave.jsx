import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { CalendarOff, CheckCircle2, Clock3, ShieldCheck, XCircle, Sparkles, Ban, RotateCcw } from 'lucide-react'
import { localDateKey } from '../utils/leaveEngine'

const addDays = (key, amount) => {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + amount)
  return localDateKey(d)
}

export default function Leave() {
  const quests = useStore((s) => s.quests)
  const leaves = useStore((s) => s.leaveRequests || [])
  const requestQuestLeave = useStore((s) => s.requestQuestLeave)
  const cancelQuestLeave = useStore((s) => s.cancelQuestLeave)
  const [questId, setQuestId] = useState('')
  const [startDate, setStartDate] = useState(localDateKey())
  const [endDate, setEndDate] = useState(localDateKey())
  const [reason, setReason] = useState('')
  const [lastReview, setLastReview] = useState(null)

  const activeQuests = useMemo(() => quests.filter((q) => !q.deleted), [quests])
  const approved = leaves.filter((l) => l.status === 'approved')
  const pending = leaves.filter((l) => l.status === 'pending')
  const decisions = leaves.filter((l) => l.status === 'approved' || l.status === 'disapproved')

  const submit = () => {
    if (!questId || !reason.trim()) return
    const result = requestQuestLeave({ questId, startDate, endDate, reason })
    setLastReview(result)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      <div>
        <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Recovery Protocol</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-3"><CalendarOff size={27} className="accent-text" /> Nexus Leave</h1>
        <p className="text-sm text-text-secondary mt-1 max-w-3xl">Pause specific quests for specific dates without deleting them. Nexus reviews the request before the exemption becomes active.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl accent-bg flex items-center justify-center shrink-0"><ShieldCheck size={19} /></div>
          <div><h2 className="text-sm font-semibold">Request a quest leave</h2><p className="text-xs text-text-tertiary mt-1">Approved leave prevents missed-quest penalties and streak damage for that quest/date. It awards no XP.</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label-text">Quest</label>
            <select className="input-field" value={questId} onChange={(e) => setQuestId(e.target.value)}>
              <option value="">Select a quest…</option>
              {activeQuests.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </div>
          <div><label className="label-text">Start date</label><input type="date" min={localDateKey()} className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className="label-text">End date</label><input type="date" min={startDate || localDateKey()} className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div className="md:col-span-2">
            <label className="label-text">Reason — Nexus will review this</label>
            <textarea className="input-field min-h-[96px] resize-none" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Example: Family wedding and travel from Sep 25 to Sep 28. I will resume the quest on Sep 29." />
            <p className="text-[10px] text-text-tertiary mt-2">A reason must describe an actual operational constraint. Nexus reviews clarity, dates, duration and duplicate coverage; it cannot independently verify whether a real-world claim is truthful.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {['Vacation / travel', 'College / exam', 'Recovery / rest', 'Health / medical', 'Family / personal'].map((x) => <button key={x} onClick={() => setReason(x + ' — ')} className="badge bg-bg-700/70 text-text-secondary hover:text-text-primary">{x}</button>)}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={submit} disabled={!questId || !reason.trim()} className="btn-primary"><Sparkles size={14} /> Submit to Nexus Review</button>
          <button onClick={() => { setStartDate(localDateKey()); setEndDate(addDays(localDateKey(), 1)); setReason('') }} className="btn-ghost text-xs"><RotateCcw size={13} /> Reset</button>
        </div>

        {lastReview && (
          <div className={`mt-5 rounded-xl border p-4 ${lastReview.status === 'approved' ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
            <div className="flex items-start gap-3">
              {lastReview.status === 'approved' ? <CheckCircle2 size={18} className="text-success mt-0.5" /> : <XCircle size={18} className="text-error mt-0.5" />}
              <div className="min-w-0"><p className="text-sm font-semibold">Nexus {lastReview.status === 'approved' ? 'approved' : 'disapproved'} this request</p><p className="text-xs text-text-secondary mt-1">{lastReview.nexusReview?.summary}</p>{lastReview.nexusReview?.reasons?.length > 0 && <ul className="mt-2 space-y-1">{lastReview.nexusReview.reasons.map((r) => <li key={r} className="text-[11px] text-error">• {r}</li>)}</ul>}<p className="text-[10px] text-text-tertiary mt-2">Policy {lastReview.nexusReview?.policyVersion} · {new Date(lastReview.reviewedAt).toLocaleString()}</p></div>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={16} className="text-success" /> Approved leave</h2><span className="badge bg-success/10 text-success">{approved.length}</span></div>
          <div className="space-y-2">
            {approved.length === 0 && <p className="text-xs text-text-tertiary py-4">No approved leave periods.</p>}
            {approved.map((entry) => <div key={entry.id} className="rounded-xl border border-border-subtle bg-bg-700/40 p-3"><div className="flex items-start gap-3"><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{entry.questTitle}</p><p className="text-[11px] text-text-tertiary mt-1">{entry.startDate} → {entry.endDate} · {entry.nexusReview?.category?.label || 'Reviewed'}</p><p className="text-[11px] text-text-secondary mt-2">{entry.reason}</p></div><button onClick={() => cancelQuestLeave(entry.id)} className="btn-ghost text-[10px] shrink-0"><Ban size={12} /> Cancel</button></div></div>)}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold flex items-center gap-2"><Clock3 size={16} className="accent-text" /> Nexus decisions</h2><span className="badge bg-bg-700 text-text-tertiary">{decisions.length}</span></div>
          <div className="space-y-2">
            {decisions.length === 0 && <p className="text-xs text-text-tertiary py-4">No reviewed requests yet.</p>}
            {decisions.slice(0, 12).map((entry) => <div key={entry.id} className="rounded-xl border border-border-subtle bg-bg-700/35 p-3"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${entry.status === 'approved' ? 'bg-success' : 'bg-error'}`} /><p className="text-xs font-semibold flex-1 truncate">{entry.questTitle}</p><span className="text-[9px] uppercase tracking-wider text-text-tertiary">{entry.status}</span></div><p className="text-[10px] text-text-tertiary mt-1">{entry.startDate} → {entry.endDate} · {entry.nexusReview?.category?.label || 'Unclear reason'}</p><p className="text-[10px] text-text-secondary mt-1 line-clamp-2">{entry.nexusReview?.summary}</p></div>)}
          </div>
        </div>
      </section>

      <section className="card p-5 border-accent/20">
        <h2 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck size={16} className="accent-text" /> Integrity rules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {[
            ['No deletion', 'Leave pauses the quest instead of destroying history.'],
            ['No penalty', 'Approved dates are exempt from missed-quest HP penalties.'],
            ['No free XP', 'A paused quest earns nothing while exempt.'],
            ['Automatic resume', 'After the approved end date, the quest returns normally.'],
          ].map(([title, desc]) => <div key={title} className="rounded-xl bg-bg-700/40 border border-border-subtle p-3"><p className="text-xs font-semibold">{title}</p><p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{desc}</p></div>)}
        </div>
        {pending.length > 0 && <p className="text-[10px] text-text-tertiary mt-4">Pending requests: {pending.length}. Current local reviewer resolves requests immediately; future Nexus provider review can be added without changing the leave records.</p>}
      </section>
    </div>
  )
}
