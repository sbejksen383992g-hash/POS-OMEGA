import { useStore, ATTRIBUTES } from '../store/useStore'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Activity, Award, Target } from 'lucide-react'
import { getDailySeries } from '../utils/helpers'
import { RadialProgress, WeeklyHeatmap, PageSkeleton, useSkeleton } from '../components/Apex'

export default function Analytics() {
  const player = useStore((s) => s.player)
  const attributes = useStore((s) => s.attributes)
  const quests = useStore((s) => s.quests)
  const habits = useStore((s) => s.habits)
  const stats = useStore((s) => s.stats)
  const journals = useStore((s) => s.journals)
  const dailyHistory = useStore((s) => s.dailyHistory)
  const achievements = useStore((s) => s.achievements) || []
  const loadingSkeleton = useSkeleton(320)

  // Real last-14-day series, built from actual logged activity —
  // days with no activity show as zero rather than invented values.
  const progressData = getDailySeries(dailyHistory, 14)
  const hasHistory = Object.keys(dailyHistory || {}).length > 0

  const attrData = ATTRIBUTES.map((a) => ({
    name: a.name,
    shortName: ({ strength: 'STR', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA', vitality: 'VIT', discipline: 'DIS' })[a.id] || a.name,
    xp: attributes[a.id]?.totalXp || 0,
    color: a.color,
  }))

  const questDifficulties = ['easy', 'medium', 'hard', 'epic'].map((d) => ({
    name: d,
    value: quests.filter((q) => q.difficulty === d).length,
  }))
  const diffColors = ['#00ff88', '#ffaa00', '#ff4466', '#b366ff']

  const completedQuests = quests.filter((q) => q.completed).length
  const completionRate = quests.length > 0 ? Math.round((completedQuests / quests.length) * 100) : 0
  const habitCompletion = habits.reduce((acc, h) => acc + h.completed.filter(Boolean).length, 0)
  const totalHabitSlots = habits.length * 7
  const habitRate = totalHabitSlots > 0 ? Math.round((habitCompletion / totalHabitSlots) * 100) : 0

  const heatSeries = getDailySeries(dailyHistory, 35)
  const timeline = [...achievements].sort((a, b) => new Date(b.date) - new Date(a.date))

  if (loadingSkeleton) return <PageSkeleton cards={4} />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Analytics</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold">Progress Analytics</h1>
        <p className="text-sm text-text-secondary mt-1">Track your evolution over time.</p>
      </div>

      {/* Animated radial progress */}
      <div className="card p-5 grid grid-cols-3 gap-2 justify-items-center">
        <div className="flex flex-col items-center gap-2"><RadialProgress value={completionRate} sub="quests" /><span className="text-[10px] text-text-tertiary uppercase tracking-wider">Completion</span></div>
        <div className="flex flex-col items-center gap-2"><RadialProgress value={habitRate} sub="habits" /><span className="text-[10px] text-text-tertiary uppercase tracking-wider">Adherence</span></div>
        <div className="flex flex-col items-center gap-2"><RadialProgress value={Math.min(100, (player.xp / Math.max(1, Math.floor(100 * Math.pow(player.level, 1.4)))) * 100)} label={`Lv ${player.level}`} sub="level" /><span className="text-[10px] text-text-tertiary uppercase tracking-wider">Next level</span></div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Target} label="Quest Completion" value={`${completionRate}%`} sub={`${completedQuests}/${quests.length} quests`} />
        <KpiCard icon={Activity} label="Habit Adherence" value={`${habitRate}%`} sub={`${habitCompletion}/${totalHabitSlots} checks`} />
        <KpiCard icon={Award} label="Achievements" value={stats.questsCompleted} sub="quests completed" />
        <KpiCard icon={TrendingUp} label="Total XP" value={player.totalXp.toLocaleString()} sub="all time" />
      </div>

      {/* XP over time */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">XP Gained (14 days)</h3>
        {!hasHistory && (
          <p className="text-xs text-text-tertiary mb-3">
            No activity logged yet — complete a quest or habit to start building this chart.
          </p>
        )}
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={progressData}>
              <defs><linearGradient id="apexXp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="xp" stroke="var(--accent)" strokeWidth={2.5} fill="url(#apexXp)" dot={false} activeDot={{ r: 4 }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attribute XP bar chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-sm font-semibold">XP by Attribute</h3><span className="text-[10px] text-text-tertiary uppercase tracking-wider">STR · INT · WIS · CHA · VIT · DIS</span></div>
          <div className="chart-container" style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attrData} margin={{ top: 8, right: 8, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="shortName" interval={0} tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} height={30} />
                <YAxis allowDecimals={false} width={32} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={false}
                  formatter={(value, _name, props) => [value, props?.payload?.name || 'XP']}
                  contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '0.65rem', fontSize: '12px' }}
                />
                <Bar dataKey="xp" minPointSize={2} radius={[4, 4, 0, 0]}>
                  {attrData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {attrData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 rounded-lg bg-bg-700/40 border border-border-subtle px-2.5 py-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                <span className="text-[10px] text-text-secondary truncate"><strong className="text-text-primary">{entry.shortName}</strong> · {entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quest difficulty pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4">Quest Difficulty Distribution</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={questDifficulties} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {questDifficulties.map((_, idx) => (
                    <Cell key={idx} fill={diffColors[idx]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold">Weekly Heatmap</h3><span className="text-[10px] text-text-tertiary uppercase tracking-wider">Last 5 weeks · XP</span></div>
        <WeeklyHeatmap series={heatSeries} />
      </div>

      {/* Achievement timeline */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Achievement Timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-xs text-text-tertiary">No achievements unlocked yet.</p>
        ) : (
          <ol className="relative ml-2 border-l border-border-strong space-y-4">
            {timeline.map((a, i) => (
              <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.22 }} className="pl-5 relative">
                <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)' }} />
                <p className="text-sm font-medium">{a.name || String(a.id).replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-text-tertiary">{a.date ? new Date(a.date).toLocaleDateString() : ''}</p>
              </motion.li>
            ))}
          </ol>
        )}
      </div>

      {/* Daily quest completions */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Quests Completed (14 days)</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="quests" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="accent-text" />
        <span className="text-xs text-text-tertiary uppercase font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-text-tertiary mt-1">{sub}</p>
    </motion.div>
  )
}
