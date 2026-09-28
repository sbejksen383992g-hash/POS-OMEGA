// Nexus planning + local intelligence.
// This module gives Nexus a deterministic planning layer even when no LLM key
// is configured. It deliberately uses application state rather than inventing data.

const sectionWeight = {
  Health: 1,
  Learning: 1,
  College: 1,
  Finance: 1,
  Productivity: 1,
  'Personal Development': 1,
}

const titleKeywords = [
  ['deadline', 30], ['exam', 28], ['assignment', 26], ['submission', 24],
  ['today', 18], ['urgent', 18], ['important', 14], ['overdue', 35],
]

export const questUrgencyScore = (quest = {}) => {
  let score = Number(quest.xp || 0) * 0.3
  const title = String(quest.title || '').toLowerCase()
  titleKeywords.forEach(([word, points]) => { if (title.includes(word)) score += points })
  if (quest.type === 'daily') score += 8
  if (quest.scheduledDate) {
    const due = new Date(`${quest.scheduledDate}T23:59:59`)
    if (!Number.isNaN(due.getTime())) {
      const days = (due.getTime() - Date.now()) / 86400000
      if (days < 0) score += 45
      else if (days < 1) score += 24
      else if (days < 3) score += 12
    }
  }
  if (quest.difficulty === 'epic') score += 8
  if (quest.difficulty === 'hard') score += 5
  return score
}

export const getNextBestAction = ({ quests = [], habits = [], player = {}, attributes = {} } = {}) => {
  const openQuests = quests.filter((q) => !q.completed)
  if (!openQuests.length) {
    const openHabits = habits.filter((h) => {
      const dayIndex = (new Date().getDay() + 6) % 7
      return !h.completed?.[dayIndex]
    })
    if (openHabits.length) {
      const habit = openHabits.slice().sort((a, b) => (b.xp || 0) - (a.xp || 0))[0]
      return {
        kind: 'habit',
        id: habit.id,
        title: habit.name,
        reason: 'No open quests remain, so the next executable item is your highest-reward incomplete habit.',
      }
    }
    return { kind: 'none', title: 'No pending action', reason: 'Your current queue is clear.' }
  }

  const sectionCounts = openQuests.reduce((acc, q) => {
    acc[q.section || 'General'] = (acc[q.section || 'General'] || 0) + 1
    return acc
  }, {})
  const candidates = openQuests.map((q) => {
    const score = questUrgencyScore(q) + ((sectionWeight[q.section] || 1) / Math.max(1, sectionCounts[q.section] || 1)) * 12
    return { q, score }
  }).sort((a, b) => b.score - a.score)

  const best = candidates[0]?.q
  if (!best) return { kind: 'none', title: 'No pending action', reason: 'Your queue is clear.' }

  return {
    kind: 'quest',
    id: best.id,
    title: best.title,
    operation: best.section || 'General',
    xp: best.xp || 0,
    reason: `It currently has the strongest urgency/reward signal in your open queue.`,
    alternatives: candidates.slice(1, 4).map(({ q }) => q.title),
  }
}

export const buildDailyBrief = ({ player = {}, quests = [], habits = [] } = {}) => {
  const openQuests = quests.filter((q) => !q.completed)
  const completedQuests = quests.filter((q) => q.completed)
  const dayIndex = (new Date().getDay() + 6) % 7
  const pendingHabits = habits.filter((h) => !h.completed?.[dayIndex])
  const xpAvailable = openQuests.reduce((sum, q) => sum + (q.xp || 0), 0) +
    pendingHabits.reduce((sum, h) => sum + (h.xp || 0), 0)

  const byOperation = openQuests.reduce((acc, q) => {
    const key = q.section || 'General'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const next = getNextBestAction({ quests, habits, player })
  return {
    level: player.level,
    streak: player.streak,
    completedQuests: completedQuests.length,
    openQuests: openQuests.length,
    pendingHabits: pendingHabits.length,
    xpAvailable,
    byOperation,
    next,
  }
}

export const formatDailyBrief = (brief) => {
  const ops = Object.entries(brief.byOperation || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'none'
  const next = brief.next?.title
    ? `Next: ${brief.next.title}${brief.next.operation ? ` [${brief.next.operation}]` : ''}${brief.next.xp ? ` · +${brief.next.xp} XP` : ''}.`
    : brief.next?.reason || 'No next action.'
  return `Level ${brief.level} · Streak ${brief.streak} days · ${brief.openQuests} open quests · ${brief.pendingHabits} pending habits · up to +${brief.xpAvailable} XP available.\nOperations: ${ops}.\n${next}`
}
