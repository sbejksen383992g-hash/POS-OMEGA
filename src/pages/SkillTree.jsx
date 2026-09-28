import { useStore } from '../store/useStore'
import { motion } from 'framer-motion'
import { Lock, Check, Gem, GitBranch } from 'lucide-react'
import { cx } from '../utils/helpers'

const branchConfig = {
  mind: { color: '#00d4ff', icon: '🧠', label: 'Mind' },
  body: { color: '#ff4466', icon: '💪', label: 'Body' },
  spirit: { color: '#b366ff', icon: '✨', label: 'Spirit' },
}

export default function SkillTree() {
  const skillTree = useStore((s) => s.skillTree)
  const unlockSkill = useStore((s) => s.unlockSkill)
  const gems = useStore((s) => s.player.gems)

  const branches = ['mind', 'body', 'spirit']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs accent-text font-semibold uppercase tracking-widest mb-1">Skill Tree</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Skill Tree</h1>
          <p className="text-sm text-text-secondary mt-1">
            Spend gems to unlock permanent passive bonuses.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass">
          <Gem size={16} className="accent-text" />
          <span className="font-mono font-bold">{gems}</span>
        </div>
      </div>

      {/* Skill branches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {branches.map((branch) => {
          const config = branchConfig[branch]
          const skills = skillTree.filter((s) => s.branch === branch).sort((a, b) => a.tier - b.tier)
          return (
            <div key={branch} className="card p-5">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border-subtle">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${config.color}20` }}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">{config.label}</h3>
                  <p className="text-xs text-text-tertiary">{skills.filter((s) => s.unlocked).length}/{skills.length} unlocked</p>
                </div>
              </div>

              {/* Tier tree */}
              <div className="space-y-1">
                {skills.map((skill, idx) => {
                  const reqSkill = skill.requires ? skillTree.find((s) => s.id === skill.requires) : null
                  const canUnlock = !skill.unlocked && (!reqSkill || reqSkill.unlocked) && gems >= skill.cost
                  return (
                    <div key={skill.id}>
                      {idx > 0 && (
                        <div className="ml-6 w-px h-4 bg-border" />
                      )}
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => canUnlock && unlockSkill(skill.id)}
                        disabled={skill.unlocked || !canUnlock}
                        className={cx(
                          'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all',
                          skill.unlocked && 'border-2',
                          !skill.unlocked && canUnlock && 'border border-border-strong hover:border-accent cursor-pointer',
                          !skill.unlocked && !canUnlock && 'border border-border opacity-50 cursor-not-allowed',
                        )}
                        style={skill.unlocked ? { borderColor: config.color, background: `${config.color}10` } : {}}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: skill.unlocked ? config.color : 'var(--bg-600)' }}
                        >
                          {skill.unlocked ? (
                            <Check size={16} className="text-bg-900" />
                          ) : (
                            <Lock size={14} className="text-text-tertiary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{skill.name}</p>
                          <p className="text-xs text-text-tertiary">{skill.desc}</p>
                          {!skill.unlocked && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Gem size={10} className="accent-text" />
                              <span className="text-xs font-mono">{skill.cost}</span>
                              {reqSkill && !reqSkill.unlocked && (
                                <span className="text-xs text-error ml-2">Requires {reqSkill.name}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <GitBranch size={20} className="accent-text mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold mb-1">How Skills Work</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Skills are permanent passive bonuses. Unlock them with gems earned from defeating bosses and maintaining streaks.
              Each branch has three tiers — you must unlock the previous tier before proceeding to the next.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
