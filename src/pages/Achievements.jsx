import { Trophy, Lock } from 'lucide-react'

const ACHIEVEMENT_ASSETS = {
  first_quest: '/assets/achievements/first-quest.webp',
  ten_quests: '/assets/achievements/level-10.webp',
  week_warrior: '/assets/achievements/seven-day-streak.webp',
  ascendant: '/assets/achievements/level-10.webp',
  scribe: '/assets/achievements/discipline-master.webp',
  skill_master: '/assets/achievements/level-25.webp',
}
import { useStore } from '../store/useStore'

const catalog = [
  ['first_quest', 'First Blood', 'Complete your first quest'],
  ['ten_quests', 'Quest Hunter', 'Complete 10 quests'],
  ['week_warrior', 'Week Warrior', 'Build a 7-day streak'],
  ['ascendant', 'Ascendant', 'Reach level 10'],
  ['scribe', 'Scribe', 'Write 10 journal entries'],
  ['skill_master', 'Skill Master', 'Unlock 3 skills'],
]

export default function Achievements() {
  const unlocked = useStore((s) => s.achievements)
  return <div className="space-y-6 animate-fade-in">
    <header><p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Milestones</p><h1 className="text-2xl sm:text-3xl font-display font-bold">Achievements</h1><p className="text-sm text-text-secondary mt-1">Permanent records of meaningful progress.</p></header>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {catalog.map(([id, name, desc]) => {
        const item = unlocked.find((a) => a.id === id)
        return <div key={id} className={`card p-5 ${!item ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between"><div className="w-14 h-14 rounded-xl overflow-hidden border border-border-subtle bg-bg-700 flex items-center justify-center">{item ? <img src={ACHIEVEMENT_ASSETS[id]} alt="" className="w-full h-full object-cover" /> : <Lock size={17} className="text-text-tertiary" />}</div><span className="text-[10px] uppercase tracking-wider text-text-tertiary">{item ? 'Unlocked' : 'Locked'}</span></div>
          <h2 className="text-sm font-semibold mt-4">{name}</h2><p className="text-xs text-text-tertiary mt-1">{desc}</p>
          {item && <p className="text-[10px] accent-text mt-3">Recorded {new Date(item.date).toLocaleDateString()}</p>}
        </div>
      })}
    </div>
  </div>
}
