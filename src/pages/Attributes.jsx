import { useEffect, useMemo, useState } from 'react'
import { useStore, ATTRIBUTES } from '../store/useStore'
import { xpForLevel, formatNumber } from '../utils/helpers'
import { AttributeCard, StatBar } from '../components/StatComponents'
import { motion } from 'framer-motion'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'

const radarLabels = {
  strength: 'STR',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
  vitality: 'VIT',
  discipline: 'DIS',
}

export default function Attributes() {
  const attributes = useStore((s) => s.attributes)
  const [compactLabels, setCompactLabels] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const handler = () => setCompactLabels(media.matches)
    media.addEventListener?.('change', handler)
    return () => media.removeEventListener?.('change', handler)
  }, [])

  const radarData = useMemo(() => {
    const scores = ATTRIBUTES.map((a) => {
      const value = attributes[a.id] || { level: 1, xp: 0 }
      const levelProgress = (value.xp || 0) / Math.max(1, xpForLevel(value.level || 1))
      return { raw: (value.level || 1) * 100 + (value.xp || 0), level: value.level || 1, progress: levelProgress, name: a.name, id: a.id }
    })
    const fullMark = Math.max(...scores.map((a) => a.raw), 100) + 50
    return scores.map((a) => ({
      attribute: compactLabels ? radarLabels[a.id] : a.name,
      score: a.raw,
      fullMark,
      level: a.level,
      progress: a.progress,
      detail: a.name,
    }))
  }, [attributes, compactLabels])

  const sorted = [...ATTRIBUTES].sort((a, b) => (attributes[b.id]?.totalXp || 0) - (attributes[a.id]?.totalXp || 0))
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-heading">Attributes</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold mt-1">Attribute Matrix</h1>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          Six core attributes evolve from real quest and habit XP. The radar reflects both level and progress inside the current level.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 sm:p-6 lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="accent-text" /> Attribute Radar
            </h3>
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Live XP power</span>
          </div>
          <div className="h-[270px] sm:h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={compactLabels ? "62%" : "68%"} margin={{ top: 18, right: compactLabels ? 22 : 44, bottom: compactLabels ? 32 : 18, left: compactLabels ? 22 : 44 }}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={{ fill: 'var(--text-secondary)', fontSize: compactLabels ? 9 : 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 'dataMax']} />
                <Radar name="Power" dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.23} strokeWidth={2.2} />
                <Tooltip
                  formatter={(value, _name, props) => {
                    const item = props?.payload
                    return [`${item?.level || 1} · ${Math.round((item?.progress || 0) * 100)}%`, item?.detail || 'Power']
                  }}
                  contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', fontSize: '12px' }}
                  cursor={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-tertiary sm:hidden">
            {ATTRIBUTES.map((a) => <span key={a.id}><strong className="text-text-secondary">{radarLabels[a.id]}</strong> {a.name}</span>)}
          </div>
        </div>

        <div className="space-y-4">
          <InsightCard label="Strongest" attr={strongest} state={attributes[strongest.id]} />
          <InsightCard label="Needs Focus" attr={weakest} state={attributes[weakest.id]} />
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-3">All Attributes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ATTRIBUTES.map((attr) => (
            <motion.div key={attr.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <AttributeCard attrId={attr.id} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Detailed Breakdown</h3>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-[11px] text-text-tertiary uppercase tracking-wide border-b border-border-subtle">
                <th className="pb-3 pr-4 font-semibold">Attribute</th>
                <th className="pb-3 px-3 font-semibold">Level</th>
                <th className="pb-3 px-3 font-semibold">Current XP</th>
                <th className="pb-3 px-3 font-semibold">Total XP</th>
                <th className="pb-3 pl-3 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTES.map((attr) => {
                const a = attributes[attr.id] || { level: 1, xp: 0, totalXp: 0 }
                const xpNeeded = xpForLevel(a.level)
                return (
                  <tr key={attr.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap"><span className="mr-2">{attr.icon}</span><span className="font-medium">{attr.name}</span></td>
                    <td className="py-3 px-3 font-mono font-bold accent-text">{a.level}</td>
                    <td className="py-3 px-3 font-mono text-text-secondary">{a.xp}/{xpNeeded}</td>
                    <td className="py-3 px-3 font-mono text-text-secondary">{formatNumber(a.totalXp || 0)}</td>
                    <td className="py-3 pl-3 min-w-[160px]"><StatBar value={a.xp} max={xpNeeded} color={attr.color} showNumbers={false} size="sm" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden space-y-2">
          {ATTRIBUTES.map((attr) => {
            const a = attributes[attr.id] || { level: 1, xp: 0, totalXp: 0 }
            const xpNeeded = xpForLevel(a.level)
            const progress = Math.min(100, Math.round((a.xp / Math.max(1, xpNeeded)) * 100))
            return (
              <div key={attr.id} className="rounded-xl border border-border-subtle bg-bg-700/35 p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{attr.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{attr.name}</p>
                      <span className="text-xs font-mono accent-text">Lv.{a.level}</span>
                    </div>
                    <div className="mt-2"><StatBar value={a.xp} max={xpNeeded} color={attr.color} showNumbers={false} size="sm" /></div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-tertiary">
                      <span>{a.xp}/{xpNeeded} XP · {progress}%</span>
                      <span>{formatNumber(a.totalXp || 0)} total</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function InsightCard({ label, attr, state }) {
  const current = state || { level: 1, xp: 0, totalXp: 0 }
  const max = xpForLevel(current.level)
  return (
    <div className="card p-5">
      <p className="section-heading mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{attr.icon}</span>
        <div className="min-w-0">
          <p className="text-lg font-display font-bold truncate">{attr.name}</p>
          <p className="text-xs text-text-tertiary">Level {current.level} · {formatNumber(current.totalXp || 0)} total XP</p>
        </div>
      </div>
      <div className="mt-3"><StatBar value={current.xp || 0} max={max} color={attr.color} showNumbers={false} size="sm" /></div>
    </div>
  )
}
