const rules = [
  { section: 'Health', subsection: 'Water', metric: 'Water', measurementType: 'quantity', unit: 'L', attribute: 'vitality', patterns: [/\bwater\b/i, /\bhydrat/i] },
  { section: 'Health', subsection: 'Diet', metric: 'Protein', measurementType: 'quantity', unit: 'g', attribute: 'vitality', patterns: [/protein/i] },
  { section: 'Health', subsection: 'Diet', metric: 'Calories', measurementType: 'quantity', unit: 'kcal', attribute: 'vitality', patterns: [/calorie|kcal/i] },
  { section: 'Health', subsection: 'Exercise', metric: 'Exercise', measurementType: 'duration', unit: 'min', attribute: 'strength', patterns: [/workout|exercise|gym|run|running|training|train/i] },
  { section: 'Health', subsection: 'Sleep', metric: 'Sleep', measurementType: 'duration', unit: 'h', attribute: 'vitality', patterns: [/sleep/i] },
  { section: 'Learning', subsection: 'Coding', metric: 'Coding', measurementType: 'duration', unit: 'h', attribute: 'intelligence', patterns: [/code|coding|javascript|java|react|python|programming|development/i] },
  { section: 'Learning', subsection: 'Reading', metric: 'Reading', measurementType: 'quantity', unit: 'pages', attribute: 'intelligence', patterns: [/read|reading|book|pages/i] },
  { section: 'Learning', subsection: 'Study', metric: 'Study', measurementType: 'duration', unit: 'h', attribute: 'intelligence', patterns: [/study|revision|revise|learn/i] },
  { section: 'Personal Development', subsection: 'Meditation', metric: 'Meditation', measurementType: 'duration', unit: 'min', attribute: 'wisdom', patterns: [/meditat|mindful|breath/i] },
  { section: 'Personal Development', subsection: 'Communication', metric: 'Communication', measurementType: 'duration', unit: 'min', attribute: 'charisma', patterns: [/communicat|storytell|presentation|speak|talk/i] },
  { section: 'College', subsection: 'Assignments', metric: 'College', measurementType: 'binary', unit: '', attribute: 'intelligence', patterns: [/assignment|college|class|lecture|exam|attendance/i] },
  { section: 'Finance', subsection: 'Business', metric: 'Finance', measurementType: 'binary', unit: '', attribute: 'discipline', patterns: [/money|income|saving|finance|business|client|freelance/i] },
  { section: 'Productivity', subsection: 'Deep Work', metric: 'Deep Work', measurementType: 'duration', unit: 'h', attribute: 'discipline', patterns: [/deep work|focus|focused work/i] },
  { section: 'Productivity', subsection: 'Daily Review', metric: 'Review', measurementType: 'binary', unit: '', attribute: 'wisdom', patterns: [/daily review|weekly review|review today/i] },
]

const extractTarget = (text, unit) => {
  const lower = text.toLowerCase()
  const number = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|min(?:ute)?s?|m|lit(?:er|re)s?|l|grams?|g|pages?)/i)
  if (number) {
    const value = Number(number[1])
    const rawUnit = number[0].toLowerCase()
    if (/hour|hr|\bh\b/.test(rawUnit)) return { target: value, unit: 'h' }
    if (/min|\bm\b/.test(rawUnit)) return { target: value, unit: 'min' }
    if (/lit|\bl\b/.test(rawUnit)) return { target: value, unit: 'L' }
    if (/gram|\bg\b/.test(rawUnit)) return { target: value, unit: 'g' }
    if (/page/.test(rawUnit)) return { target: value, unit: 'pages' }
  }
  const generic = lower.match(/\b(\d+(?:\.\d+)?)\b/)
  return generic ? { target: Number(generic[1]), unit } : { target: null, unit }
}

export function classifyQuest(text) {
  const input = text.trim()
  const rule = rules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(input)))
  if (!rule) {
    return { section: 'Productivity', subsection: 'General', metric: 'General', measurementType: 'binary', target: null, unit: '', attribute: 'discipline', confidence: 0.35 }
  }
  const extracted = extractTarget(input, rule.unit)
  const confidence = extracted.target !== null ? 0.96 : 0.82
  return { ...rule, ...extracted, confidence }
}

export function normalizeQuestInput(title, desc = '', overrides = {}) {
  const intelligence = classifyQuest(`${title} ${desc}`)
  const definedOverrides = Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined && value !== null && value !== ''))
  return { ...intelligence, ...definedOverrides }
}

export function metricProgress(quests, section, subsection, metric) {
  const matching = quests.filter((q) => q.section === section && q.subsection === subsection && q.metric === metric)
  return matching.reduce((sum, q) => {
    if (!q.completed) return sum
    if (q.measurementType === 'quantity' || q.measurementType === 'duration') return sum + (Number(q.target) || 0)
    return sum + 1
  }, 0)
}
