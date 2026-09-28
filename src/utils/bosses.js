export const BOSS_CATALOG = [
  {
    id: 'procrastination', name: 'The Procrastinator', codename: 'LORD OF DELAY',
    description: 'A shadow that feeds on unfinished work and turns small delays into heavy debt.',
    lore: 'It grows strongest when the next action stays undefined.', category: 'Procrastination', difficulty: 'Moderate', tier: 'Weekly Boss',
    baseHP: 500, recommendedAttributes: ['discipline', 'intelligence'], targetHabits: ['deep work', 'morning routine'], targetQuests: ['discipline'],
    xpReward: 300, attributeRewards: { discipline: 45 }, penalty: 'Missed focus work restores a small amount of HP.', victoryMessage: 'The delay loop is broken. Your next action is clear.', failureMessage: 'The unfinished work returned. Reduce the scope and re-engage.', visualTheme: 'ember', icon: '◈', rarity: 'rare',
  },
  {
    id: 'distraction', name: 'The Signal Eater', codename: 'DISTRACTION PRIME',
    description: 'A static-born predator that consumes attention one notification at a time.',
    lore: 'It cannot survive a protected block of uninterrupted focus.', category: 'Distraction', difficulty: 'Moderate', tier: 'Weekly Boss',
    baseHP: 650, recommendedAttributes: ['discipline', 'wisdom'], targetHabits: ['phone-free block'], targetQuests: ['discipline', 'wisdom'],
    xpReward: 380, attributeRewards: { discipline: 35, wisdom: 25 }, penalty: 'Skipped focus blocks restore limited HP.', victoryMessage: 'The signal is quiet. Your attention belongs to you again.', failureMessage: 'The noise returned. Make the next block smaller, not optional.', visualTheme: 'cyber', icon: '⌁', rarity: 'epic',
  },
  {
    id: 'comfort', name: 'The Comfort Warden', codename: 'THE SOFT CAGE',
    description: 'A patient guardian of familiar routines that keeps meaningful risks outside the door.',
    lore: 'It weakens whenever you choose a small deliberate discomfort.', category: 'Comfort Zone', difficulty: 'Hard', tier: 'Elite Boss',
    baseHP: 850, recommendedAttributes: ['strength', 'charisma'], targetHabits: ['cold shower', 'hard conversation'], targetQuests: ['strength', 'charisma'],
    xpReward: 520, attributeRewards: { strength: 35, charisma: 35 }, penalty: 'Avoidance restores a modest amount of HP.', victoryMessage: 'The boundary moved. You are operating beyond the old limit.', failureMessage: 'The cage held today. Find one smaller edge to cross tomorrow.', visualTheme: 'forest', icon: '⬡', rarity: 'epic',
  },
  {
    id: 'overthinking', name: 'The Thought Labyrinth', codename: 'THE LOOPING MIND',
    description: 'A maze of perfect plans that prevents the first imperfect action.',
    lore: 'It collapses when a decision is made with enough information, not infinite information.', category: 'Overthinking', difficulty: 'Hard', tier: 'Elite Boss',
    baseHP: 1000, recommendedAttributes: ['wisdom', 'intelligence'], targetHabits: ['journal entry'], targetQuests: ['wisdom', 'intelligence'],
    xpReward: 650, attributeRewards: { wisdom: 45, intelligence: 30 }, penalty: 'Unresolved decisions restore limited HP.', victoryMessage: 'The path is visible. Motion beats another round of analysis.', failureMessage: 'The loop continues. Name the smallest decision you can finish.', visualTheme: 'arctic', icon: '◇', rarity: 'legendary',
  },
  {
    id: 'neglect', name: 'The Physical Neglect', codename: 'THE HEAVY BODY',
    description: 'A slow-moving giant built from skipped movement, poor recovery, and depleted energy.',
    lore: 'It loses strength whenever vitality becomes a scheduled practice.', category: 'Physical Neglect', difficulty: 'Nightmare', tier: 'Nightmare Boss',
    baseHP: 1400, recommendedAttributes: ['vitality', 'strength'], targetHabits: ['movement', 'sleep routine'], targetQuests: ['vitality', 'strength'],
    xpReward: 900, attributeRewards: { vitality: 50, strength: 50 }, penalty: 'Missed recovery habits restore limited HP.', victoryMessage: 'Your body is no longer an afterthought.', failureMessage: 'Recovery is part of the mission. Return without self-punishment.', visualTheme: 'forest', icon: '⬢', rarity: 'legendary',
  },
  {
    id: 'void', name: 'The Void of Stagnation', codename: 'APEX: UNFULFILLED POTENTIAL',
    description: 'A cosmic enemy that represents every promise left untested.',
    lore: 'It can only be defeated by consistent progress across multiple attributes.', category: 'Avoidance', difficulty: 'Apex', tier: 'APEX Boss',
    baseHP: 2200, recommendedAttributes: ['all'], targetHabits: ['any'], targetQuests: ['all'],
    xpReward: 2000, attributeRewards: { strength: 25, intelligence: 25, wisdom: 25, charisma: 25, vitality: 25, discipline: 25 }, penalty: 'A missed day restores a small amount of HP.', victoryMessage: 'Potential became evidence. The Apex threshold is yours.', failureMessage: 'The void is patient. Build evidence one completed action at a time.', visualTheme: 'solar', icon: '✦', rarity: 'mythic',
  },
]

export function createBoss(config, playerLevel = 1, victories = 0) {
  const scale = 1 + Math.min(0.8, Math.max(0, playerLevel - 1) * 0.06) + Math.min(0.35, victories * 0.025)
  const maxHp = Math.floor(config.baseHP * scale)
  return {
    id: `boss-${config.id}-${Date.now()}`,
    configId: config.id,
    name: config.name,
    title: config.codename,
    hp: maxHp,
    maxHp,
    attribute: config.recommendedAttributes.includes('all') ? 'all' : config.recommendedAttributes[0],
    reward: { xp: Math.floor(config.xpReward * scale), coins: Math.floor(config.xpReward * 0.35), gems: config.rarity === 'mythic' ? 20 : config.rarity === 'legendary' ? 12 : 6 },
    desc: config.description,
    lore: config.lore,
    category: config.category,
    difficulty: config.difficulty,
    tier: config.tier,
    recommendedAttributes: config.recommendedAttributes,
    attributeRewards: config.attributeRewards,
    penalty: config.penalty,
    victoryMessage: config.victoryMessage,
    failureMessage: config.failureMessage,
    visualTheme: config.visualTheme,
    rarity: config.rarity,
    defeated: false,
    icon: config.icon,
    createdAt: Date.now(),
  }
}

export function selectNextBoss(history, playerLevel, victories) {
  const recent = history.slice(-3).map((item) => item.configId)
  const available = BOSS_CATALOG.filter((boss) => !recent.includes(boss.id))
  const pool = available.length ? available : BOSS_CATALOG.filter((boss) => boss.id !== history.at(-1)?.configId)
  const preferred = pool.filter((boss) => playerLevel >= 7 ? boss.tier !== 'Daily Mini-Boss' : boss.tier !== 'APEX Boss')
  const candidates = preferred.length ? preferred : pool
  const choice = candidates[Math.floor(Math.random() * candidates.length)] || BOSS_CATALOG[0]
  return createBoss(choice, playerLevel, victories)
}
