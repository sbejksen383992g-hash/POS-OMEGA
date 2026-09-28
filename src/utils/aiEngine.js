// Nexus AI local command intelligence.
import { findCatalogApp } from './nexusAppCatalog'
// Deterministic actions run without an API key. Ambiguous requests can be
// delegated to the configured model through the structured action protocol.

const intentPatterns = [
  { intent: 'show_status', patterns: [/show (?:my )?status/i, /how am i doing/i, /my progress/i, /stats/i, /where am i/i] },
  { intent: 'show_quests', patterns: [/show (?:my )?quests/i, /what.*quests/i, /list quests/i, /daily quests/i, /quest panel/i] },
  { intent: 'show_bosses', patterns: [/show (?:my )?boss/i, /boss.*status/i, /enemies/i, /fight/i] },
  { intent: 'add_journal', patterns: [/journal[:\s]+(.+)/i, /dear diary[:\s]+(.+)/i, /log[:\s]+(.+)/i, /reflect[:\s]+(.+)/i, /write (?:this|an?) journal entry[:\s]+(.+)/i] },
  { intent: 'navigate', patterns: [/go to ([\w -]+)/i, /open ([\w -]+) page/i, /navigate to ([\w -]+)/i, /show ([\w -]+) (?:page|tab|section)/i] },
  { intent: 'set_theme', patterns: [/set theme to ([\w -]+)/i, /change theme to ([\w -]+)/i, /switch to ([\w -]+) theme/i] },
  { intent: 'help', patterns: [/^help$/i, /what can you do/i, /commands/i, /how does this work/i] },
  { intent: 'motivate', patterns: [/motivate me/i, /give me motivation/i, /inspire me/i, /i need a boost/i, /pump me up/i] },
]

const attributeKeywords = {
  strength: ['workout', 'exercise', 'gym', 'lift', 'run', 'fitness', 'train', 'push', 'physical'],
  intelligence: ['read', 'study', 'learn', 'book', 'research', 'code', 'write', 'think', 'analyze', 'java', 'react', 'programming'],
  wisdom: ['meditate', 'reflect', 'journal', 'philosophy', 'contemplate', 'mindful', 'observe'],
  charisma: ['social', 'talk', 'friend', 'network', 'speak', 'present', 'connect', 'party'],
  vitality: ['sleep', 'water', 'eat', 'health', 'walk', 'stretch', 'breathe', 'energy', 'cold', 'protein', 'calorie'],
  discipline: ['focus', 'deep work', 'routine', 'wake', 'early', 'sugar', 'fast', 'resist', 'discipline'],
}

const detectAttribute = (text) => {
  const lower = text.toLowerCase()
  for (const [attr, keywords] of Object.entries(attributeKeywords)) {
    if (keywords.some((k) => lower.includes(k))) return attr
  }
  return 'discipline'
}

// Maps casual/aliased category words ("health", "fitness", "study", "mind",
// "body", "social") onto the six real attribute ids, for filtered-show and
// XP-forecast voice queries. Falls back to the word itself if it's already
// a real attribute id.
const ATTRIBUTE_ALIASES = {
  health: 'vitality', fitness: 'strength', study: 'intelligence', learning: 'intelligence',
  social: 'charisma', mind: 'intelligence', body: 'strength',
}
export const resolveAttributeAlias = (word) => {
  const key = String(word || '').toLowerCase().trim()
  if (!key) return null
  if (ATTRIBUTE_ALIASES[key]) return ATTRIBUTE_ALIASES[key]
  return ['strength', 'intelligence', 'wisdom', 'charisma', 'vitality', 'discipline'].includes(key) ? key : null
}

const detectDifficulty = (text) => {
  const lower = text.toLowerCase()
  if (/epic|massive|huge|major/i.test(lower)) return 'epic'
  if (/hard|difficult|intense|brutal|extreme|2.?h|hour/i.test(lower)) return 'hard'
  if (/easy|simple|quick|5.?min|short/i.test(lower)) return 'easy'
  return 'medium'
}

const cleanTaskText = (text) => text
  .trim()
  .replace(/^[:\-–—]+\s*/, '')
  .replace(/^(?:of|for|to)\s+/i, '')
  .replace(/\s+(?:in|into)\s+(?:my\s+)?(?:daily\s+)?quests?\s*$/i, '')
  .replace(/\s+(?:to|for)\s+(?:my\s+)?(?:daily\s+)?quest\s*$/i, '')
  .trim()

// Detects natural requests such as:
// "Nexus, add a daily quest of 4L water"
// "please put a quest to study Java for 2 hours"
// "create a quest: read 20 pages"
export const detectLocalAction = (input) => {
  const text = input.trim()
  if (!text) return null
  const lower = text.toLowerCase()

  const leaveMatch = text.match(/\b(?:request|take|apply for|put)\s+(?:leave|vacation)\s+(?:for\s+)?(?:the\s+)?(.+?)\s+(?:from|between)\s+(\d{4}-\d{2}-\d{2})\s+(?:to|and)\s+(\d{4}-\d{2}-\d{2})\s+(?:because|reason)\s+(.+)$/i)
  if (leaveMatch) {
    return { intent: 'request_leave', quest: cleanTaskText(leaveMatch[1]), startDate: leaveMatch[2], endDate: leaveMatch[3], reason: leaveMatch[4].trim(), text }
  }


  // ── Device-control intents ───────────────────────────────────────
  // These actions are deliberately conservative: they open user-visible
  // Android/system surfaces and never silently send a message or place a call.
  const mapsOpen = text.match(/\b(?:open|show|take me to)\s+(?:google\s+)?maps?\s+(?:for|to|near)\s+(.+)$/i)
  if (mapsOpen?.[1]) return { intent: 'open_maps', query: mapsOpen[1].trim(), text }

  // ── Contact-name WhatsApp + delete + weather (resolved natively / by Nexus dialog) ──
  const delMatch = text.match(/\b(?:delete|unsend|remove|revoke)\s+(?:the\s+|my\s+)?(?:last\s+|latest\s+|that\s+)?(?:whatsapp\s+)?(?:message|msg|text)(?:\s+(?:that\s+)?(?:i\s+|was\s+)?(?:just\s+)?(?:sent|send))?(?:\s+(?:to|for)\s+(.+?))?\s*(?:on whatsapp)?$/i)
  if (delMatch && /\bwhatsapp\b|\bsent\b|\blast\b|\bunsend\b|\bthat\b/i.test(text)) return { intent: 'delete_whatsapp_message', name: (delMatch[1] || '').trim(), text }

  const waSend = text.match(/\b(?:send|write|drop)\s+(?:a\s+)?(?:whatsapp\s+)?(?:message|msg|text)\s+(?:on\s+whatsapp\s+)?to\s+(.+?)(?:\s+on\s+whatsapp)?\s*(?:(?:saying|that says|that|with message|message|:)\s+(.+))?$/i)
    || text.match(/\b(?:whatsapp|message|msg|text)\s+(?!me\b)(.+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that says|:)\s+(.+)$/i)
  if (waSend?.[1] && !/^\+?\d[\d\s().-]{5,}$/.test(waSend[1].trim())) {
    return { intent: 'send_whatsapp_contact', name: waSend[1].replace(/\s+on\s+whatsapp$/i, '').trim(), body: (waSend[2] || '').trim(), text }
  }

  const weatherMatch = text.match(/\b(?:weather|temperature|forecast)\b(?:\s+(?:like\s+)?(?:in|at|for|of)\s+(.+?))?\s*(?:today|now|right now)?\s*$/i)
    || (/\b(?:is it|will it|going to)\s+(?:be\s+)?(?:rain|raining|hot|cold)/i.test(text) ? [text, ''] : null)
  if (weatherMatch) return { intent: 'get_weather', city: (weatherMatch[1] || '').replace(/\b(today|now|tomorrow)$/i, '').trim(), text }

  // Natural app-launch language. Resolve known aliases even when the user says
  // things like "open my clock", "launch the camera app", "take me to Instagram",
  // or "I want to use WhatsApp". Unknown installed apps are resolved later by
  // the native launcher discovery layer.
  const appTrigger = /\b(?:open|launch|start|run|switch to|switch over to|take me to|take me into|bring up|pull up|get me into|get me to|go into|show me|let me use|i want to use|i want to open|i want to check|i need to use|i need to check|check|use)\b/i
  const trigger = text.match(appTrigger)
  if (trigger) {
    const after = text.slice((trigger.index || 0) + trigger[0].length)
      .replace(/^(?:the|my)\s+/i, '')
      .replace(/\s+(?:app|application|program)\s*$/i, '')
      .trim()
    if (/^(?:device )?settings$/i.test(after)) return { intent: 'open_device_settings', text }

    const INTERNAL_PAGES = new Set([
      'home','dashboard','quests','quest','habits','bosses','boss','attributes','today','plan','analytics','journal',
      'skill','skill tree','nexus','ai','profile','operations','achievements','calendar','leave','recovery'
    ])
    const internalKey = after.toLowerCase().replace(/\s+/g, ' ').trim()
    if (INTERNAL_PAGES.has(internalKey)) return { intent: 'navigate', match: internalKey, text }

    const catalog = findCatalogApp(after)
    if (catalog) return { intent: 'open_app', app: catalog.key, text }

    // When offline, allow short natural app names such as “Open Notion” or
    // “Launch my banking app”. The Android bridge will resolve them against
    // the device's real launcher list rather than hallucinating a package name.
    const genericTarget = after.replace(/^the\s+/i, '').trim()
    const looksLikeApp = genericTarget && genericTarget.split(/\s+/).length <= 5 && !/\b(?:page|tab|section)\b/i.test(genericTarget)
    if (looksLikeApp) return { intent: 'open_app', app: genericTarget, text }
  }

  const smsMatch = text.match(/\b(?:send|text|message)\s+(?:an?\s+)?(?:sms|text|message)?\s*(?:to\s+)?(\+?\d[\d\s().-]{5,})\s+(?:saying|that says|with|:)\s+(.+)$/i)
  if (smsMatch?.[1] && smsMatch?.[2]) {
    return { intent: 'compose_sms', to: smsMatch[1], body: smsMatch[2].trim(), text }
  }

  const whatsappMatch = text.match(/\b(?:send|message|text)\s+(?:a\s+)?whatsapp\s+(?:to\s+)?(\+?\d[\d\s().-]{5,})\s+(?:saying|that says|with|:)\s+(.+)$/i)
  if (whatsappMatch?.[1] && whatsappMatch?.[2]) {
    return { intent: 'compose_whatsapp', to: whatsappMatch[1], body: whatsappMatch[2].trim(), text }
  }

  const callMatch = text.match(/\b(?:call|phone|dial)\s+(\+?\d[\d\s().-]{5,})\b/i)
  if (callMatch?.[1]) return { intent: 'dial_number', number: callMatch[1], text }

  if (/\b(?:open|show)\s+(?:android\s+)?settings\b|\bdevice settings\b/i.test(text)) {
    return { intent: 'open_device_settings', text }
  }

  // Local hard-stop voice command. Never send this to a model.
  if (/^(?:stop|cancel)\s*(?:speaking|talking|speech)?$|\b(?:stop talking|stop speaking|cancel speech|be quiet|mute yourself)\b/i.test(text)) {
    return { intent: 'stop_speaking', text }
  }

  // Explicit reminder/alarm intent is checked before generic quest creation.
  if (/\b(?:alarm|remind|reminder)\b/i.test(text)) {
    return { intent: 'schedule_alarm', text, title: extractReminderTitle(text), alarm: parseAlarmRequest(text) }
  }

  const questPatterns = [
    /\b(?:add|create|make|register|put|set up)\s+(?:a|an|the)?\s*(?:daily|weekly)?\s*quest\s*(?:of|for|to|:|-)?\s*(.+)$/i,
    /\b(?:i want|i need|please)\s+(?:to\s+)?(?:add|create|make)\s+(?:a|an)?\s*(?:daily|weekly)?\s*quest\s*(?:of|for|to|:|-)?\s*(.+)$/i,
    /\b(?:add|create|put|track)\s+(?:a|an)?\s*(?:daily|weekly)?\s*(?:task|goal)\s*(?:of|for|to|:|-)?\s*(.+?)\s+(?:to|in|into)\s+(?:my\s+)?quests?$/i,
  ]
  for (const pattern of questPatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const task = cleanTaskText(match[1])
      return {
        intent: 'add_quest',
        match: task,
        text,
        attribute: detectAttribute(task),
        difficulty: detectDifficulty(task),
        type: /\bweekly\b/i.test(text) ? 'weekly' : 'daily',
      }
    }
  }

  // Natural imperative task requests are intentionally conservative.
  if (/\b(?:add|create)\b/i.test(lower) && /\b(?:to my quests|as a quest)\b/i.test(lower)) {
    const task = text
      .replace(/^.*?\b(?:to my quests|as a quest)\b/i, '')
      .trim()
    if (task) return { intent: 'add_quest', match: cleanTaskText(task), text, attribute: detectAttribute(task), difficulty: detectDifficulty(task), type: 'daily' }
  }

  const habitPatterns = [
    /\b(?:add|create|track|start)\s+(?:a|an)?\s*habit\s*(?:of|for|to|:|-)?\s*(.+)$/i,
    /\b(?:i want to|please)\s+(?:build|start)\s+(?:a|an)?\s*habit\s*(?:of|to)?\s*(.+)$/i,
  ]
  for (const pattern of habitPatterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      const habit = cleanTaskText(match[1])
      return { intent: 'add_habit', match: habit, text, attribute: detectAttribute(habit) }
    }
  }

  const complete = text.match(/\b(?:complete|finish|mark|done with)\s+(?:the\s+)?(?:quest\s+)?[:\-]?\s*(.+?)(?:\s+(?:as|now))?$/i)
  if (complete?.[1]) return { intent: 'complete_quest', match: cleanTaskText(complete[1]), text }

  const remove = text.match(/\b(?:delete|remove|cancel)\s+(?:the\s+)?(?:quest\s+)?[:\-]?\s*(.+)$/i)
  if (remove?.[1]) return { intent: 'delete_quest', match: cleanTaskText(remove[1]), text }

  // "delete/remove habit X" — checked before the generic delete_quest match
  // above would otherwise swallow it.
  const removeHabit = text.match(/\b(?:delete|remove|cancel|stop)\s+(?:the\s+)?habit\s*[:\-]?\s*(.+)$/i)
  if (removeHabit?.[1]) return { intent: 'delete_habit', match: cleanTaskText(removeHabit[1]), text }

  // "rename X to Y" / "rename habit X to Y" / "call X Y instead"
  const renameQuest = text.match(/\brename\s+(?:the\s+)?(?:quest\s+)?[:\-]?\s*(.+?)\s+(?:to|as)\s+(.+)$/i)
  if (renameQuest?.[1] && renameQuest?.[2] && !/\bhabit\b/i.test(text)) {
    return { intent: 'rename_quest', match: cleanTaskText(renameQuest[1]), newName: cleanTaskText(renameQuest[2]), text }
  }
  const renameHabit = text.match(/\brename\s+(?:the\s+)?habit\s*[:\-]?\s*(.+?)\s+(?:to|as)\s+(.+)$/i)
  if (renameHabit?.[1] && renameHabit?.[2]) {
    return { intent: 'rename_habit', match: cleanTaskText(renameHabit[1]), newName: cleanTaskText(renameHabit[2]), text }
  }

  // "increase reward of X to 40 XP" / "set XP for X to 40" / "make X worth 40 xp"
  const rewardChange = text.match(/\b(?:increase|change|set|make)\s+(?:the\s+)?(?:reward|xp)\s+(?:of|for)\s+(.+?)\s+to\s+(\d+)(?:\s*xp)?\b/i)
    || text.match(/\bmake\s+(.+?)\s+worth\s+(\d+)\s*xp\b/i)
  if (rewardChange?.[1] && rewardChange?.[2]) {
    return { intent: 'update_reward', match: cleanTaskText(rewardChange[1]), xp: Number(rewardChange[2]), text }
  }

  // "undo that" / "undo" / "undo last action"
  if (/\bundo\b/i.test(text) && !/\bhabit\b|\bquest\b/i.test(text.replace(/\bundo\b/i, ''))) {
    return { intent: 'undo', text }
  }

  // "show today's health quests" / "show my strength quests"
  const filteredShow = text.match(/\bshow\s+(?:me\s+)?(?:today'?s?\s+)?(?:my\s+)?(strength|intelligence|wisdom|charisma|vitality|discipline|health|fitness|study|learning|social|mind|body)\s+(?:daily\s+)?quests?\b/i)
  if (filteredShow?.[1]) return { intent: 'show_quests_filtered', attribute: filteredShow[1].toLowerCase(), text }

  // "how much XP if I finish all health tasks?" / "how much xp will I get if I complete everything today"
  if (/\bhow much xp\b/i.test(text) && /\b(?:if|finish|complete)\b/i.test(text)) {
    const attrWord = text.match(/\b(strength|intelligence|wisdom|charisma|vitality|discipline|health|fitness|study|learning|social|mind|body)\b/i)
    return { intent: 'xp_forecast', attribute: attrWord ? attrWord[1].toLowerCase() : null, text }
  }

  // "what penalty will I get today?"
  if (/\bwhat penalty\b|\bpenalty (?:will i get|today)\b|\bhow much (?:will i lose|xp will i lose)\b/i.test(text)) {
    return { intent: 'penalty_forecast', text }
  }

  const journal = text.match(/\b(?:journal|diary|reflect|log)\s*[:\-]?\s*(.+)$/i)
  if (journal?.[1]) return { intent: 'add_journal', match: journal[1].trim(), text }

  if (/\b(?:what should i do next|what do i do next|next action|next best action|what's next)\b/i.test(text)) return { intent: 'next_action', text }
  if (/\b(?:daily brief|give me a briefing|summarize today|today's briefing|what is my day looking like)\b/i.test(text)) return { intent: 'daily_brief', text }
  if (/\b(?:what do you remember about me|show memory|my memories|what have you remembered)\b/i.test(text)) return { intent: 'show_memory', text }
  const rememberMatch = text.match(/\b(?:remember|memorize|save this)\s+(?:that\s+)?(.+)$/i)
  if (rememberMatch?.[1]) return { intent: 'remember', fact: rememberMatch[1].trim(), text }
  const forgetMatch = text.match(/\b(?:forget|remove from memory)\s+(?:that\s+)?(.+)$/i)
  if (forgetMatch?.[1]) return { intent: 'forget', fact: forgetMatch[1].trim(), text }

  if (/\b(?:show|open|go to)\s+(?:my\s+)?(?:leave|recovery)\b/i.test(text)) return { intent: 'show_leave', text }

  if (/\b(?:turn|switch|enable)\s+(?:nexus\s+)?voice\s+on\b/i.test(text)) return { intent: 'set_setting', key: 'voiceEnabled', value: true, text }
  if (/\b(?:turn|switch|disable)\s+(?:nexus\s+)?voice\s+off\b/i.test(text)) return { intent: 'set_setting', key: 'voiceEnabled', value: false, text }
  if (/\b(?:turn|switch|enable)\s+(?:sound|sounds)\s+on\b/i.test(text)) return { intent: 'set_setting', key: 'soundEnabled', value: true, text }
  if (/\b(?:turn|switch|disable)\s+(?:sound|sounds)\s+off\b/i.test(text)) return { intent: 'set_setting', key: 'soundEnabled', value: false, text }

  const nav = text.match(/\b(?:go to|open|navigate to|show me)\s+(?:the\s+)?([a-z][a-z -]+?)(?:\s+page|\s+section|\s+tab)?$/i)
  if (nav?.[1]) return { intent: 'navigate', match: nav[1].trim(), text }

  return null
}

const extractReminderTitle = (text) => {
  const patterns = [
    /\bremind me(?: at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\s+to\s+(.+?)(?=\s+(?:at|on)\s+\d|\s+daily$|\s+every day$|$)/i,
    /\b(?:reminder|alarm)\s+(?:for|to)\s+(.+?)(?=\s+(?:at|on)\s+\d|\s+daily$|\s+every day$|$)/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return 'POS Alarm'
}

const parseTimeParts = (raw) => {
  const m = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)
  if (!m) return null
  let hour = Number(m[1])
  const minute = Number(m[2] || 0)
  const meridiem = m[3]?.toLowerCase()
  if (minute > 59 || hour > 23 || (meridiem && hour > 12)) return null
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return { hour, minute }
}

export const parseAlarmRequest = (text) => {
  const timeMatch = text.match(/\b(?:at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
  const parts = timeMatch ? parseTimeParts(timeMatch[1]) : null
  if (!parts) return { valid: false, reason: 'I need a time, for example 8:00 AM.' }
  const date = new Date()
  date.setSeconds(0, 0)
  date.setHours(parts.hour, parts.minute, 0, 0)
  if (date.getTime() <= Date.now() + 5000) date.setDate(date.getDate() + 1)
  return {
    valid: true,
    time: date.toISOString(),
    repeat: /\bdaily\b|\bevery day\b/i.test(text) ? 'daily' : 'once',
    title: extractReminderTitle(text),
  }
}

export const interpretCommand = (input) => {
  const text = input.trim()
  if (!text) return { intent: 'unknown', response: 'I did not catch that.' }

  const local = detectLocalAction(text)
  if (local) return local

  for (const { intent, patterns } of intentPatterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return { intent, text, match: match[1] || '', attribute: detectAttribute(text), difficulty: detectDifficulty(text) }
      }
    }
  }

  return { intent: 'unknown', text, response: 'I could not understand that yet.' }
}

// Models are instructed to emit this envelope when an app action is needed.
// Keeping parsing local means malformed model output can never execute arbitrary JS.
export const parseActionEnvelope = (text) => {
  if (!text) return { actions: [], cleanText: '' }
  const match = text.match(/<NEXUS_ACTION>([\s\S]*?)<\/NEXUS_ACTION>/i)
  if (!match) {
    // Also accept a raw JSON object/array for providers that strip custom tags.
    const candidates = [text.trim(), text.match(/\{[\s\S]*\}/)?.[0]]
    for (const candidate of candidates) {
      if (!candidate) continue
      try {
        const parsed = JSON.parse(candidate)
        if (parsed && (parsed.action || Array.isArray(parsed.actions))) {
          const actions = Array.isArray(parsed.actions) ? parsed.actions : [parsed]
          return { actions, cleanText: text.replace(candidate, '').trim() }
        }
      } catch { /* normal prose */ }
    }
    return { actions: [], cleanText: text.trim() }
  }
  try {
    const parsed = JSON.parse(match[1])
    const actions = Array.isArray(parsed) ? parsed : Array.isArray(parsed.actions) ? parsed.actions : [parsed]
    return { actions, cleanText: text.replace(match[0], '').trim() }
  } catch {
    return { actions: [], cleanText: text.replace(match[0], '').trim() }
  }
}

export const generateResponse = (intent, context = {}) => {
  const responses = {
    add_quest: (ctx) => `Quest registered: "${ctx.match || ctx.text}". It is now in your quest panel.`,
    add_habit: (ctx) => `Habit registered: "${ctx.match || ctx.text}".`,
    complete_quest: (ctx) => `Quest completed: "${ctx.match}". Experience gained.`,
    delete_quest: (ctx) => `Quest removed: "${ctx.match}".`,
    delete_habit: (ctx) => `Habit removed: "${ctx.match}".`,
    rename_quest: (ctx) => `Quest renamed: "${ctx.match}" → "${ctx.newName}".`,
    rename_habit: (ctx) => `Habit renamed: "${ctx.match}" → "${ctx.newName}".`,
    update_reward: (ctx) => `Reward updated for "${ctx.match}": now worth ${ctx.xp} XP.`,
    undo: () => 'Undone.',
    schedule_alarm: (ctx) => ctx.alarm?.valid ? `Alarm scheduled for ${new Date(ctx.alarm.time).toLocaleString()}.` : (ctx.alarm?.reason || 'I need a valid alarm time.'),
    open_app: (ctx) => `Opening ${ctx.app}.`,
    open_maps: (ctx) => `Opening Maps for “${ctx.query}”.`,
    compose_sms: (ctx) => `Preparing an SMS to ${ctx.to}. You will press Send yourself.`,
    send_whatsapp_contact: (ctx) => `Preparing a WhatsApp message to ${ctx.name}.`,
    delete_whatsapp_message: () => 'Deleting your last WhatsApp message.',
    get_weather: () => 'Checking the weather.',
    compose_whatsapp: (ctx) => `Preparing WhatsApp for ${ctx.to}. You will press Send yourself.`,
    dial_number: (ctx) => `Opening the dialer for ${ctx.number}. I did not place the call.`,
    open_device_settings: () => 'Opening device settings.',

    add_journal: (ctx) => `Journal entry recorded.`,
    set_setting: (ctx) => `${ctx.key === 'voiceEnabled' ? 'Nexus Voice' : 'Sound effects'} ${ctx.value ? 'enabled' : 'disabled'}.`,
    show_status: () => {
      const p = context.player
      if (!p) return 'Unable to read your status.'
      return `Operator ${p.name} — Level ${p.level} | XP: ${p.xp} | Streak: ${p.streak} days | Coins: ${p.coins} | Gems: ${p.gems}.`
    },
    show_quests: () => 'Opening your quest log.',
    show_quests_filtered: (ctx) => `Showing your ${ctx.attribute} quests.`,
    xp_forecast: (ctx) => {
      if (!Number.isFinite(ctx.xpTotal)) return 'I could not calculate that.'
      if (ctx.count === 0) return ctx.attribute ? `You have no open ${ctx.attribute} quests left today.` : 'You have no open quests left today.'
      return `Finishing ${ctx.count} remaining ${ctx.attribute ? `${ctx.attribute} ` : ''}quest${ctx.count === 1 ? '' : 's'} today would earn you +${ctx.xpTotal} XP.`
    },
    penalty_forecast: (ctx) => {
      if (!ctx.enabled) return 'Missed-quest penalties are currently off. Turn them on in Settings if you want Nexus to enforce them.'
      if (!ctx.count) return 'No penalty risk right now — every daily quest is either done or on approved leave.'
      return `If ${ctx.count} quest${ctx.count === 1 ? '' : 's'} stay${ctx.count === 1 ? 's' : ''} incomplete at midnight, you will lose ${ctx.xpAtRisk} XP: ${ctx.quests.slice(0, 4).join(', ')}${ctx.quests.length > 4 ? '…' : ''}.`
    },
    show_bosses: () => 'Opening the boss arena.',
    show_leave: () => 'Opening Nexus Leave.',
    next_action: (ctx) => ctx.resultText || 'I could not determine the next action yet.',
    daily_brief: (ctx) => ctx.resultText || 'Your briefing is not available yet.',
    remember: (ctx) => `Saved to Nexus memory: “${ctx.fact}”.`,
    show_memory: (ctx) => ctx.resultText || 'Nexus memory is empty.',
    forget: (ctx) => `Removed from Nexus memory: “${ctx.fact}”.`,

    request_leave: (ctx) => `Leave review requested for "${ctx.quest}" from ${ctx.startDate} to ${ctx.endDate}.`,
    navigate: (ctx) => `Opening ${ctx.match}.`,
    set_theme: (ctx) => `Theme set to ${ctx.match}.`,
    help: () => 'You can ask me to create, complete, rename and delete quests or habits, adjust rewards, request reviewed leave, schedule alarms, change settings, navigate the app, plan your day, remember notes, check XP or penalty forecasts, undo actions, and use safe device controls such as opening supported apps, Maps, the dialer, or message composers.',
    motivate: () => 'Focus on the next executable action. Momentum comes from completion, not intention.',
    unknown: (ctx) => ctx.response || 'I could not understand that yet.',
  }
  const fn = responses[intent]
  const base = fn ? fn(context) : responses.unknown(context)
  return applyPersonality(base, context.personality)
}

// Personality modes reshape the tone of Nexus's canned/local responses —
// every command still executes identically underneath. Kept deliberately
// simple (prefix/suffix + light rewrite) so it stays fully offline.
export const applyPersonality = (text, personality = 'friendly') => {
  if (!text) return text
  switch (personality) {
    case 'ceo':
      return text.replace(/\.$/, '').concat('. Next.')
    case 'commander':
      return `Confirmed. ${text}`
    case 'mentor':
      return `${text} Keep going — consistency compounds.`
    case 'chill':
      return `${text.replace(/\.$/, '')} — no rush though.`
    case 'friendly':
    default:
      return text
  }
}

export const generateQuestSuggestions = (player, attributes) => {
  const suggestions = []
  const sortedAttrs = Object.entries(attributes).sort((a, b) => a[1].level - b[1].level)
  const weakest = sortedAttrs[0]
  if (weakest) suggestions.push({ title: `Train ${weakest[0].charAt(0).toUpperCase() + weakest[0].slice(1)}`, desc: 'Your weakest attribute. Focus here for balanced growth.', attribute: weakest[0], difficulty: 'medium' })
  if (player.streak >= 3) suggestions.push({ title: 'Double Down', desc: 'Your streak is building. Add a hard quest today to compound momentum.', attribute: 'discipline', difficulty: 'hard' })
  if (player.level < 5) suggestions.push({ title: 'Foundation Builder', desc: 'Complete 3 easy quests to build a solid early-game base.', attribute: 'vitality', difficulty: 'easy' })
  return suggestions
}
