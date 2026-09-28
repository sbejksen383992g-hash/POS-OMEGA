import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { BOSS_CATALOG, createBoss, selectNextBoss } from '../utils/bosses'
import { normalizeQuestInput } from '../utils/questIntelligence'
import { scheduleNativeAlarm, cancelNativeAlarm, syncNativeAlarms } from '../utils/nativeServices'
import { reviewLeaveRequest, isQuestOnApprovedLeave, isDateOnApprovedLeave, localDateKey } from '../utils/leaveEngine'


// Debounced localStorage: the store is large, and writing the whole JSON on every
// state change blocks the main thread on phones. Coalesce writes and flush when the
// app is hidden/closed so nothing is lost.
const debouncedLocalStorage = (() => {
  const pending = new Map()
  let timer = 0
  const flush = () => {
    window.clearTimeout(timer); timer = 0
    pending.forEach((value, key) => { try { localStorage.setItem(key, value) } catch { /* quota */ } })
    pending.clear()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  }
  return {
    getItem: (name) => (pending.has(name) ? pending.get(name) : localStorage.getItem(name)),
    setItem: (name, value) => { pending.set(name, value); window.clearTimeout(timer); timer = window.setTimeout(flush, 450) },
    removeItem: (name) => { pending.delete(name); localStorage.removeItem(name) },
  }
})()

// ── Core game state store ──────────────────────────────────────────
// This is the heart of POS — all player progress, attributes,
// quests, habits, bosses, and journal entries live here.

const ATTRIBUTES = [
  { id: 'strength', name: 'Strength', icon: '💪', color: '#ff4466', desc: 'Physical power & fitness' },
  { id: 'intelligence', name: 'Intelligence', icon: '🧠', color: '#00d4ff', desc: 'Knowledge & mental acuity' },
  { id: 'wisdom', name: 'Wisdom', icon: '🦉', color: '#b366ff', desc: 'Insight & judgment' },
  { id: 'charisma', name: 'Charisma', icon: '✨', color: '#ffaa00', desc: 'Social influence & presence' },
  { id: 'vitality', name: 'Vitality', icon: '❤️', color: '#00ff88', desc: 'Energy & health' },
  { id: 'discipline', name: 'Discipline', icon: '⚡', color: '#ff6b35', desc: 'Willpower & consistency' },
]

const XP_PER_LEVEL = (level) => Math.floor(100 * Math.pow(level, 1.4))

// Pure XP/level math shared by the addXp action and the midnight penalty
// engine below, so a gain and a loss always resolve the same way — no
// duplicated formulas that could drift apart.
const applyXpDelta = (player, amount) => {
  let xp = player.xp + amount
  let level = player.level
  while (xp >= XP_PER_LEVEL(level)) { xp -= XP_PER_LEVEL(level); level++ }
  while (xp < 0 && level > 1) { level--; xp += XP_PER_LEVEL(level) }
  if (xp < 0) xp = 0
  const maxHp = 100 + (level - 1) * 10
  const maxMp = 50 + (level - 1) * 5
  return {
    ...player,
    xp,
    level,
    totalXp: Math.max(0, player.totalXp + amount),
    maxHp,
    maxMp,
    hp: Math.min(player.hp, maxHp),
    mp: Math.min(player.mp, maxMp),
    leveledUp: level > player.level,
    leveledDown: level < player.level,
  }
}

// Auto reset daily quests after midnight without affecting analytics/attributes
const todayDateString = () => new Date().toDateString()

// ── Midnight Penalty Engine ──────────────────────────────────────────
// Runs exactly once per day boundary, before quests are unticked, so it can
// still see which daily quests were left incomplete. Penalty = that quest's
// XP (mirrors the reward it would have paid), applied through the same
// level-aware math as a normal XP gain so level/HP/MP stay in sync. Coin
// penalty is opt-in per quest via `penalizeCoins`. Boss HP needs no
// correction here: quests only damage a boss on completion, so a missed
// quest never touched the boss in the first place.
const applyMidnightPenalties = (state) => {
  if (state.settings?.penaltiesEnabled !== true) return state
  const dayKey = localDateKey(new Date(state.player.lastActiveDate || Date.now()))
  if (state.penaltyLedger?.[dayKey]) return state

  const due = state.quests.filter((q) => q.type === 'daily' && !q.completed)
  let xpLoss = 0
  let coinLoss = 0
  let applied = 0
  let skipped = 0
  const missedTitles = []
  due.forEach((quest) => {
    if (isQuestOnApprovedLeave(state.leaveRequests || [], quest.id, dayKey)) { skipped += 1; return }
    applied += 1
    xpLoss += quest.xp || 0
    if (quest.penalizeCoins) coinLoss += quest.coins || 0
    missedTitles.push(quest.title)
  })

  const penaltyLedger = { ...state.penaltyLedger, [dayKey]: { applied, skipped, xpLoss, coinLoss, at: Date.now() } }
  if (applied === 0) return { ...state, penaltyLedger }

  const player = applyXpDelta(state.player, -xpLoss)
  player.coins = Math.max(0, player.coins - coinLoss)

  const dailyHistory = { ...state.dailyHistory }
  const day = dailyHistory[dayKey] || { xp: 0, quests: 0, habits: 0 }
  dailyHistory[dayKey] = { ...day, xp: day.xp - xpLoss }

  const notification = {
    id: `n${Date.now()}_penalty`,
    createdAt: Date.now(),
    readAt: null,
    type: 'penalty',
    title: `Midnight Penalty — ${dayKey}`,
    desc: `${applied} missed quest${applied === 1 ? '' : 's'} · -${xpLoss} XP${coinLoss ? `, -${coinLoss} coins` : ''}. ${missedTitles.slice(0, 3).join(', ')}${missedTitles.length > 3 ? '…' : ''}`,
  }

  return {
    ...state,
    player,
    penaltyLedger,
    dailyHistory,
    notifications: [notification, ...state.notifications].slice(0, 20),
  }
}

const resetDailyProgressIfNeeded = (state) => {
  const today = todayDateString()
  if (state.player?.lastActiveDate === today) return state

  // Penalties are computed against yesterday's quest-completion state,
  // strictly before that state is wiped by the reset below.
  const penalized = state.player?.lastActiveDate ? applyMidnightPenalties(state) : state

  return {
    ...penalized,
    player: { ...penalized.player, lastActiveDate: today },
    quests: penalized.quests.map((q) =>
      q.type === 'daily' ? { ...q, completed: false, _lastReward: null } : q
    ),
  }
}

const initialPlayer = {
  name: 'Soham',
  title: 'The Awakening',
  level: 1,
  xp: 0,
  totalXp: 0,
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  coins: 0,
  gems: 0,
  streak: 0,
  lastActiveDate: null,
  createdAt: Date.now(),
}

const initialAttributes = {}
ATTRIBUTES.forEach((a) => {
  initialAttributes[a.id] = { level: 1, xp: 0, totalXp: 0 }
})

const defaultQuests = [
  { id: 'q1', title: 'Morning Hydration', desc: 'Drink 500ml of water upon waking', attribute: 'vitality', difficulty: 'easy', xp: 30, coins: 5, completed: false, createdAt: Date.now(), type: 'daily' },
  { id: 'q2', title: 'Read 20 Pages', desc: 'Read a non-fiction book for at least 20 pages', attribute: 'intelligence', difficulty: 'medium', xp: 60, coins: 12, completed: false, createdAt: Date.now(), type: 'daily' },
  { id: 'q3', title: 'Workout Session', desc: 'Complete a 45-minute training session', attribute: 'strength', difficulty: 'hard', xp: 120, coins: 25, completed: false, createdAt: Date.now(), type: 'daily' },
  { id: 'q4', title: 'Meditate 10 Minutes', desc: 'Sit in stillness and observe the breath', attribute: 'wisdom', difficulty: 'easy', xp: 30, coins: 5, completed: false, createdAt: Date.now(), type: 'daily' },
  { id: 'q5', title: 'Deep Work Block', desc: '2 hours of focused, distraction-free work', attribute: 'discipline', difficulty: 'hard', xp: 120, coins: 25, completed: false, createdAt: Date.now(), type: 'daily' },
  { id: 'q6', title: 'Connect with Someone', desc: 'Have a meaningful conversation with a friend or family member', attribute: 'charisma', difficulty: 'medium', xp: 60, coins: 12, completed: false, createdAt: Date.now(), type: 'daily' },
]

const defaultHabits = [
  { id: 'h1', name: 'Cold Shower', attribute: 'vitality', target: 7, completed: [false, false, false, false, false, false, false], streak: 0, xp: 20, coins: 3 },
  { id: 'h2', name: 'No Sugar', attribute: 'discipline', target: 7, completed: [false, false, false, false, false, false, false], streak: 0, xp: 25, coins: 5 },
  { id: 'h3', name: 'Journal Entry', attribute: 'wisdom', target: 7, completed: [false, false, false, false, false, false, false], streak: 0, xp: 15, coins: 3 },
]

const defaultBosses = [createBoss(BOSS_CATALOG[0])]

const defaultSkillTree = [
  { id: 's1', name: 'Deep Focus', branch: 'mind', tier: 1, unlocked: true, cost: 0, desc: 'Increase XP from intelligence quests by 20%', effect: 'intelligence_xp_boost' },
  { id: 's2', name: 'Iron Body', branch: 'body', tier: 1, unlocked: true, cost: 0, desc: 'Increase XP from strength quests by 20%', effect: 'strength_xp_boost' },
  { id: 's3', name: 'Iron Will', branch: 'spirit', tier: 1, unlocked: false, cost: 3, desc: 'Habits give 50% more XP', effect: 'habit_xp_boost' },
  { id: 's4', name: 'Accelerated Learning', branch: 'mind', tier: 2, unlocked: false, cost: 5, desc: 'All XP gain increased by 15%', effect: 'global_xp_boost', requires: 's1' },
  { id: 's5', name: 'Peak Performance', branch: 'body', tier: 2, unlocked: false, cost: 5, desc: 'HP regen +50%, max HP +20', effect: 'hp_boost', requires: 's2' },
  { id: 's6', name: 'Charismatic Aura', branch: 'spirit', tier: 2, unlocked: false, cost: 5, desc: 'Charisma quests give double coins', effect: 'coin_boost', requires: 's3' },
  { id: 's7', name: 'Time Dilation', branch: 'mind', tier: 3, unlocked: false, cost: 10, desc: 'Quest XP doubled during streaks of 7+', effect: 'streak_double', requires: 's4' },
  { id: 's8', name: 'Unbreakable', branch: 'body', tier: 3, unlocked: false, cost: 10, desc: 'Never lose streak from missing one day', effect: 'streak_protect', requires: 's5' },
  { id: 's9', name: 'Transcendence', branch: 'spirit', tier: 3, unlocked: false, cost: 10, desc: 'All attributes gain 10% more XP', effect: 'attr_boost', requires: 's6' },
]

const initialStore = {
  player: initialPlayer,
  attributes: initialAttributes,
  quests: defaultQuests,
  habits: defaultHabits,
  bosses: defaultBosses,
  bossHistory: [],
  lastBossVictory: null,
  skillTree: defaultSkillTree,
  journals: [],
  achievements: [],
  notifications: [],
  dailyHistory: {},
  theme: 'cyber',
  schemaVersion: 5,
  leaveRequests: [],
  penaltyLedger: {},
  undoStack: [],
  settings: {
    soundEnabled: true,
    animationsEnabled: true,
    pinEnabled: false,
    pinHash: '',
    voiceEnabled: false,
    voiceVolume: 0.7,
    voiceRate: 1,
    voiceName: '',
    voicePitch: 1,
    voiceLanguage: 'en-IN',
    voiceProfile: 'friendly-woman',
    continuousVoiceInput: true,
    wakeWordEnabled: true,
    backgroundWakeEnabled: false,
    nexusOwnerVerification: false,
    nexusSensitiveLock: true,
    nexusPersonality: 'friendly',
    penaltiesEnabled: false,
    missedQuestPenaltyHp: 8,
    notificationsEnabled: true,
    lastBackupAt: null,
    commandPaletteOpen: false,
    aiEnabled: true,
    aiProvider: 'mistral',
    aiModel: 'mistral-small-latest',
    enableFallback: true,
    apiKeys: {
      mistral: '',
      groq: '',
      gemini: '',
      openrouter: '',
      cerebras: '',
      huggingface: '',
      cloudflare: '',
      sambanova: '',
    },
  },
  nexusHistory: [],
  alarms: [],
  aiUsage: {
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    perProvider: {},
    lastRequest: null,
  },
  stats: {
    questsCompleted: 0,
    habitsCompleted: 0,
    bossesDefeated: 0,
    perfectDays: 0,
    totalPlayTime: 0,
  },
}

// ── Store ──────────────────────────────────────────────────────────

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialStore,

      // ── Player ────────────────────────────────────────────────────
      addXp: (amount) => {
        const state = get()
        const player = { ...state.player }
        let xp = player.xp + amount
        let level = player.level
        while (xp >= XP_PER_LEVEL(level)) {
          xp -= XP_PER_LEVEL(level)
          level++
          get().pushNotification({
            type: 'levelup',
            title: `Level Up! — Lv.${level}`,
            desc: 'Your power grows. New horizons open.',
          })
        }
        // Symmetric case: an untick or correction can pass a negative amount.
        // Borrow XP back from the previous level(s) instead of letting xp go
        // negative, so repeated tick/untick cycles never drift the total.
        while (xp < 0 && level > 1) {
          level--
          xp += XP_PER_LEVEL(level)
        }
        if (xp < 0) xp = 0
        player.xp = xp
        player.level = level
        player.totalXp = Math.max(0, player.totalXp + amount)
        player.maxHp = 100 + (level - 1) * 10
        player.maxMp = 50 + (level - 1) * 5
        if (amount > 0) {
          player.hp = Math.min(player.hp + 10, player.maxHp)
          player.mp = Math.min(player.mp + 5, player.maxMp)
        } else {
          player.hp = Math.min(player.hp, player.maxHp)
          player.mp = Math.min(player.mp, player.maxMp)
        }
        set({ player })
        if (amount !== 0) get()._logDaily({ xp: amount })
      },

      addCoins: (amount) =>
        set((s) => ({ player: { ...s.player, coins: Math.max(0, s.player.coins + amount) } })),

      spendCoins: (amount) => {
        const coins = get().player.coins
        if (coins < amount) return false
        set((s) => ({ player: { ...s.player, coins: s.player.coins - amount } }))
        return true
      },

      addGems: (amount) =>
        set((s) => ({ player: { ...s.player, gems: s.player.gems + amount } })),

      spendGems: (amount) => {
        const gems = get().player.gems
        if (gems < amount) return false
        set((s) => ({ player: { ...s.player, gems: s.player.gems - amount } }))
        return true
      },

      updatePlayer: (updates) =>
        set((s) => ({ player: { ...s.player, ...updates } })),

      // ── Attributes ────────────────────────────────────────────────
      addAttributeXp: (attrId, amount) => {
        const state = get()
        const attr = state.attributes[attrId]
        if (!attr) return
        let xp = attr.xp + amount
        let level = attr.level
        while (xp >= XP_PER_LEVEL(level)) {
          xp -= XP_PER_LEVEL(level)
          level++
          get().pushNotification({
            type: 'attr-levelup',
            title: `${attrId} Lv.${level}`,
            desc: `${ATTRIBUTES.find((a) => a.id === attrId)?.name} increased!`,
          })
        }
        // Symmetric case: reversing a completion (e.g. an untick) passes a
        // negative amount — borrow back from the previous level rather than
        // letting xp go negative, so re-toggling never inflates the total.
        while (xp < 0 && level > 1) {
          level--
          xp += XP_PER_LEVEL(level)
        }
        if (xp < 0) xp = 0
        set({
          attributes: {
            ...state.attributes,
            [attrId]: { level, xp, totalXp: Math.max(0, attr.totalXp + amount) },
          },
        })
      },

      // ── Nexus Leave / Recovery ───────────────────────────────────
      requestQuestLeave: (request) => {
        const state = get()
        const quest = state.quests.find((q) => q.id === request.questId)
        const review = reviewLeaveRequest({
          quest,
          startDate: request.startDate,
          endDate: request.endDate,
          reason: request.reason,
          existingLeaves: state.leaveRequests || [],
        })
        const entry = {
          id: `leave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          questId: request.questId,
          questTitle: quest?.title || 'Unknown quest',
          startDate: String(request.startDate || '').slice(0, 10),
          endDate: String(request.endDate || '').slice(0, 10),
          reason: String(request.reason || '').trim(),
          status: review.approved ? 'approved' : 'disapproved',
          nexusReview: review,
          createdAt: Date.now(),
          reviewedAt: review.reviewedAt,
        }
        set((s) => ({ leaveRequests: [entry, ...(s.leaveRequests || [])].slice(0, 200), alarms: review.approved
          ? (s.alarms || []).map((alarm) => {
              if (alarm.linkedQuestId !== entry.questId) return alarm
              const alarmDate = new Date(alarm.time)
              const alarmKey = Number.isNaN(alarmDate.getTime()) ? '' : localDateKey(alarmDate)
              return alarmKey >= entry.startDate && alarmKey <= entry.endDate ? { ...alarm, enabled: false, leaveSuppressed: true } : alarm
            })
          : s.alarms }))
        if (review.approved) {
          for (const alarm of get().alarms || []) if (alarm.linkedQuestId === entry.questId && alarm.leaveSuppressed) void cancelNativeAlarm(alarm.id)
        }
        get().pushNotification({
          type: review.approved ? 'leave-approved' : 'leave-disapproved',
          title: `Nexus Leave ${review.approved ? 'Approved' : 'Disapproved'}`,
          desc: `${entry.questTitle} · ${review.approved ? `${entry.startDate} → ${entry.endDate}` : review.reasons[0]}`,
        })
        return entry
      },

      cancelQuestLeave: (leaveId) => {
        const entry = (get().leaveRequests || []).find((item) => item.id === leaveId)
        if (!entry) return false
        set((s) => ({ leaveRequests: s.leaveRequests.map((item) => item.id === leaveId ? { ...item, status: 'cancelled', cancelledAt: Date.now() } : item) }))
        get().pushNotification({ type: 'system', title: 'Leave Cancelled', desc: entry.questTitle })
        return true
      },

      isQuestOnLeave: (questId, dateKey = localDateKey()) => isQuestOnApprovedLeave(get().leaveRequests || [], questId, dateKey),
      isDateOnLeave: (dateKey = localDateKey()) => isDateOnApprovedLeave(get().leaveRequests || [], dateKey),

      // ── Quests ────────────────────────────────────────────────────
      completeQuest: (questId) => {
        const state = get()
        const quest = state.quests.find((q) => q.id === questId)
        if (!quest || quest.completed) return
        if (get().isQuestOnLeave(quest.id, localDateKey())) {
          get().pushNotification({ type: 'system', title: 'Quest Paused', desc: `${quest.title} is on approved Nexus leave today. No XP is awarded.` })
          return
        }

        const skillEffects = get()._skillEffects()
        let xpReward = quest.xp
        if (skillEffects[`${quest.attribute}_xp_boost`]) xpReward *= 1.2
        if (skillEffects.global_xp_boost) xpReward *= 1.15
        if (skillEffects.streak_double && state.player.streak >= 7) xpReward *= 2

        let coinReward = quest.coins
        if (skillEffects.coin_boost && quest.attribute === 'charisma') coinReward *= 2

        xpReward = Math.floor(xpReward)

        const attrXp = Math.floor(xpReward * 0.5)

        set({
          // _lastReward pins the exact awarded amounts to this completion so
          // uncompleteQuest can reverse precisely, even if skill effects or
          // streak change in between.
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, completed: true, _lastReward: { xp: xpReward, coins: coinReward, attrXp } } : q
          ),
          stats: { ...state.stats, questsCompleted: state.stats.questsCompleted + 1 },
        })
        get()._logDaily({ quests: 1 })

        get().addXp(xpReward)
        get().addCoins(coinReward)
        get().addAttributeXp(quest.attribute, attrXp)

        // Damage boss
        get().damageBoss(quest.attribute, xpReward)

        get().pushNotification({
          type: 'quest',
          title: 'Quest Complete',
          desc: `${quest.title} — +${xpReward} XP, +${coinReward} coins`,
        })

        get().pushUndo({ type: 'complete_quest', payload: { id: quest.id, title: quest.title } })

        // Check achievements
        get()._checkAchievements()
      },

      // Reverses completeQuest exactly, using the reward pinned at
      // completion time — coordinates XP, coins, attribute XP, boss HP,
      // stats and the daily log so re-toggling a quest never drifts totals.
      uncompleteQuest: (questId) => {
        const state = get()
        const quest = state.quests.find((q) => q.id === questId)
        if (!quest || !quest.completed) return
        const reward = quest._lastReward || { xp: quest.xp, coins: quest.coins, attrXp: Math.floor(quest.xp * 0.5) }

        set({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, completed: false, _lastReward: null } : q
          ),
          stats: { ...state.stats, questsCompleted: Math.max(0, state.stats.questsCompleted - 1) },
        })
        get()._logDaily({ quests: -1 })
        get().addXp(-reward.xp)
        get().addCoins(-reward.coins)
        get().addAttributeXp(quest.attribute, -reward.attrXp)
        get().healBoss(quest.attribute, reward.xp)
        get().pushNotification({ type: 'system', title: 'Quest Reopened', desc: `${quest.title} — reward reversed.` })
      },

      addQuest: (quest) => {
        const intelligence = normalizeQuestInput(quest.title || '', quest.desc || '', {
          attribute: quest.attribute,
          difficulty: quest.difficulty,
        })
        const normalizedScheduledDate = quest.scheduledDate ? String(quest.scheduledDate).slice(0, 10) : null
        const newQuest = {
          id: `q${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          completed: false,
          createdAt: Date.now(),
          scheduledDate: normalizedScheduledDate,
          scheduledTime: quest.scheduledTime || '',
          type: 'daily',
          ...quest,
          ...intelligence,
          scheduledDate: normalizedScheduledDate,
          scheduledTime: quest.scheduledTime || '',
          type: quest.type || 'daily',
        }
        set((s) => ({ quests: [...s.quests, newQuest] }))
        get().pushNotification({ type: 'system', title: 'Quest Registered', desc: `${newQuest.section} · ${newQuest.subsection}` })
        get().pushUndo({ type: 'add_quest', payload: { id: newQuest.id, title: newQuest.title } })
        return newQuest
      },

      updateQuest: (questId, updates) => {
        const prevQuest = get().quests.find((q) => q.id === questId)
        set((s) => ({ quests: s.quests.map((q) => q.id === questId ? { ...q, ...updates } : q) }))
        if (prevQuest) {
          const prevSnapshot = {}
          Object.keys(updates).forEach((k) => { prevSnapshot[k] = prevQuest[k] })
          get().pushUndo({ type: 'update_quest', payload: { id: questId, prev: prevSnapshot } })
        }
      },

      deleteQuest: (questId) => {
        const quest = get().quests.find((q) => q.id === questId)
        set((s) => ({ quests: s.quests.filter((q) => q.id !== questId) }))
        if (quest) get().pushUndo({ type: 'delete_quest', payload: quest })
      },

      resetDailyQuests: () =>
        set((s) => ({
          quests: s.quests.map((q) =>
            q.type === 'daily' ? { ...q, completed: false } : q
          ),
        })),

      // ── Habits ────────────────────────────────────────────────────
      toggleHabit: (habitId, dayIndex) => {
        const state = get()
        const habit = state.habits.find((h) => h.id === habitId)
        if (!habit) return
        const newCompleted = [...habit.completed]
        newCompleted[dayIndex] = !newCompleted[dayIndex]
        const wasCompleted = habit.completed[dayIndex]

        set({
          habits: state.habits.map((h) =>
            h.id === habitId ? { ...h, completed: newCompleted } : h
          ),
        })

        // Recompute the same reward the original completion would have used,
        // so ticking always awards it and unticking always removes exactly
        // that amount — no drift no matter how many times it's toggled.
        const skillEffects = get()._skillEffects()
        let xpReward = habit.xp
        if (skillEffects.habit_xp_boost) xpReward *= 1.5
        xpReward = Math.floor(xpReward)
        const attrXp = Math.floor(xpReward * 0.3)

        if (!wasCompleted) {
          // Tick: award.
          get().addXp(xpReward)
          get().addCoins(habit.coins)
          get().addAttributeXp(habit.attribute, attrXp)
          get().damageBoss(habit.attribute, xpReward)
          get()._logDaily({ habits: 1 })
          set((s) => ({
            stats: { ...s.stats, habitsCompleted: s.stats.habitsCompleted + 1 },
          }))
        } else {
          // Untick: reverse the exact same award.
          get().addXp(-xpReward)
          get().addCoins(-habit.coins)
          get().addAttributeXp(habit.attribute, -attrXp)
          get().healBoss(habit.attribute, xpReward)
          get()._logDaily({ habits: -1 })
          set((s) => ({
            stats: { ...s.stats, habitsCompleted: Math.max(0, s.stats.habitsCompleted - 1) },
          }))
        }
        get().pushUndo({ type: 'toggle_habit', payload: { habitId, dayIndex, name: habit.name } })
      },

      addHabit: (habit) => {
        const newHabit = {
          id: `h${Date.now()}`,
          completed: [false, false, false, false, false, false, false],
          streak: 0,
          xp: 20,
          coins: 3,
          ...habit,
        }
        set((s) => ({ habits: [...s.habits, newHabit] }))
        get().pushUndo({ type: 'add_habit', payload: { id: newHabit.id, name: newHabit.name } })
        return newHabit
      },

      updateHabit: (habitId, updates) => {
        const prevHabit = get().habits.find((h) => h.id === habitId)
        set((s) => ({ habits: s.habits.map((h) => h.id === habitId ? { ...h, ...updates } : h) }))
        if (prevHabit) {
          const prevSnapshot = {}
          Object.keys(updates).forEach((k) => { prevSnapshot[k] = prevHabit[k] })
          get().pushUndo({ type: 'update_habit', payload: { id: habitId, prev: prevSnapshot } })
        }
      },

      deleteHabit: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId)
        set((s) => ({ habits: s.habits.filter((h) => h.id !== habitId) }))
        if (habit) get().pushUndo({ type: 'delete_habit', payload: habit })
      },

      // ── Bosses ────────────────────────────────────────────────────
      damageBoss: (attribute, damage) => {
        const state = get()
        const boss = state.bosses.find((entry) => !entry.defeated)
        if (!boss || (boss.attribute !== attribute && boss.attribute !== 'all')) return
        const newHp = Math.max(0, boss.hp - damage)
        if (newHp > 0) {
          set({ bosses: state.bosses.map((entry) => entry.id === boss.id ? { ...entry, hp: newHp } : entry) })
          return
        }

        const victories = state.stats.bossesDefeated + 1
        const historyEntry = {
          configId: boss.configId,
          name: boss.name,
          defeatedAt: Date.now(),
          difficulty: boss.difficulty,
          rewards: boss.reward,
          damageDealt: boss.maxHp,
          streak: state.player.streak,
        }
        const nextBoss = selectNextBoss([...state.bossHistory, historyEntry], state.player.level, victories)
        get().addXp(boss.reward.xp)
        get().addCoins(boss.reward.coins)
        get().addGems(boss.reward.gems)
        Object.entries(boss.attributeRewards || {}).forEach(([id, amount]) => get().addAttributeXp(id, amount))
        set((s) => ({
          bosses: [nextBoss],
          bossHistory: [...s.bossHistory, historyEntry].slice(-12),
          lastBossVictory: { ...historyEntry, victoryMessage: boss.victoryMessage, nextBoss: nextBoss.name },
          stats: { ...s.stats, bossesDefeated: victories },
        }))
        get().pushNotification({
          type: 'boss',
          title: `Boss Defeated — ${boss.name}`,
          desc: `+${boss.reward.xp} XP, +${boss.reward.coins} coins, +${boss.reward.gems} gems. Next: ${nextBoss.name}`,
        })
        get()._checkAchievements()
      },

      // Reverses a prior damageBoss call (used when a habit/quest is
      // un-ticked). Only heals the same boss instance if it's still the
      // active, undefeated boss — if it was already defeated in the
      // meantime, healing it back would be incoherent, so this is a no-op.
      healBoss: (attribute, amount) => {
        const state = get()
        const boss = state.bosses.find((entry) => !entry.defeated)
        if (!boss || (boss.attribute !== attribute && boss.attribute !== 'all')) return
        const newHp = Math.min(boss.maxHp, boss.hp + amount)
        set({ bosses: state.bosses.map((entry) => entry.id === boss.id ? { ...entry, hp: newHp } : entry) })
      },

      // ── Skill Tree ────────────────────────────────────────────────
      unlockSkill: (skillId) => {
        const state = get()
        const skill = state.skillTree.find((s) => s.id === skillId)
        if (!skill || skill.unlocked) return
        if (skill.requires) {
          const req = state.skillTree.find((s) => s.id === skill.requires)
          if (!req || !req.unlocked) return
        }
        if (state.player.gems < skill.cost) return
        get().spendGems(skill.cost)
        set({
          skillTree: state.skillTree.map((s) =>
            s.id === skillId ? { ...s, unlocked: true } : s
          ),
        })
        get().pushNotification({
          type: 'skill',
          title: `Skill Unlocked — ${skill.name}`,
          desc: skill.desc,
        })
      },

      _skillEffects: () => {
        const skills = get().skillTree
        const effects = {}
        skills.forEach((s) => {
          if (s.unlocked) effects[s.effect] = true
        })
        return effects
      },

      // ── Journal ───────────────────────────────────────────────────
      addJournal: (entry) => {
        const newEntry = {
          id: `j${Date.now()}`,
          createdAt: Date.now(),
          ...entry,
        }
        set((s) => ({ journals: [newEntry, ...s.journals] }))
        get().addXp(40)
        get().addAttributeXp('wisdom', 30)
        get().pushNotification({
          type: 'journal',
          title: 'Journal Entry Saved',
          desc: '+40 XP, +30 Wisdom',
        })
      },

      deleteJournal: (journalId) =>
        set((s) => ({ journals: s.journals.filter((j) => j.id !== journalId) })),

      // ── Nexus conversation / command state ───────────────────────
      appendNexusMessage: (message) =>
        set((s) => ({
          nexusHistory: [...s.nexusHistory, { ...message, ts: message.ts || Date.now() }].slice(-80),
        })),

      clearNexusHistory: () => set({ nexusHistory: [] }),

      // ── Alarms / reminders ───────────────────────────────────────
      addAlarm: (alarm) => {
        const newAlarm = {
          id: `a${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: 'POS Alarm',
          note: '',
          time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          repeat: 'once',
          enabled: true,
          createdAt: Date.now(),
          lastTriggeredAt: null,
          ...alarm,
        }
        set((s) => ({ alarms: [...s.alarms, newAlarm] }))
        get().pushNotification({ type: 'alarm', title: 'Alarm scheduled', desc: newAlarm.title })
        get().pushUndo({ type: 'schedule_alarm', payload: { id: newAlarm.id, title: newAlarm.title } })
        if (get().settings.notificationsEnabled !== false) void scheduleNativeAlarm(newAlarm, get().leaveRequests || [])
        return newAlarm
      },

      updateAlarm: (alarmId, updates) => {
        const next = { ...get().alarms.find((a) => a.id === alarmId), ...updates }
        set((s) => ({ alarms: s.alarms.map((a) => a.id === alarmId ? { ...a, ...updates } : a) }))
        if (next?.enabled && get().settings.notificationsEnabled !== false) void scheduleNativeAlarm(next, get().leaveRequests || [])
        else void cancelNativeAlarm(alarmId)
      },

      deleteAlarm: (alarmId) => {
        set((s) => ({ alarms: s.alarms.filter((a) => a.id !== alarmId) }))
        void cancelNativeAlarm(alarmId)
      },

      toggleAlarm: (alarmId) => {
        const alarm = get().alarms.find((a) => a.id === alarmId)
        if (!alarm) return
        const enabled = !alarm.enabled
        set((s) => ({ alarms: s.alarms.map((a) => a.id === alarmId ? { ...a, enabled } : a) }))
        if (enabled && get().settings.notificationsEnabled !== false) void scheduleNativeAlarm({ ...alarm, enabled }, get().leaveRequests || [])
        else void cancelNativeAlarm(alarmId)
      },

      // ── Notifications ─────────────────────────────────────────────
      pushNotification: (notification) => {
        const n = {
          id: `n${Date.now()}_${Math.random()}`,
          createdAt: Date.now(),
          readAt: null,
          ...notification,
        }
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 20) }))
      },

      clearNotifications: () => set({ notifications: [] }),

      markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => n.readAt ? n : { ...n, readAt: Date.now() }) })),

      dismissNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

      // ── Smart Undo ────────────────────────────────────────────────
      // A short, coordinated undo stack for Nexus AI ("undo that") and the
      // in-app Undo toasts. Entries hold plain, JSON-safe snapshots (never
      // functions), reversed by undoLast() via the matching store action.
      pushUndo: (entry) =>
        set((s) => ({ undoStack: [{ id: `u${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), ...entry }, ...s.undoStack].slice(0, 8) })),

      undoLast: () => {
        const state = get()
        const entry = state.undoStack[0]
        if (!entry) return { ok: false, message: 'Nothing to undo.' }
        set((s) => ({ undoStack: s.undoStack.slice(1) }))
        switch (entry.type) {
          case 'delete_quest':
            set((s) => ({ quests: [...s.quests, entry.payload] }))
            return { ok: true, message: `Restored quest "${entry.payload.title}".` }
          case 'delete_habit':
            set((s) => ({ habits: [...s.habits, entry.payload] }))
            return { ok: true, message: `Restored habit "${entry.payload.name}".` }
          case 'add_quest':
            get().deleteQuest(entry.payload.id)
            return { ok: true, message: `Removed quest "${entry.payload.title}".` }
          case 'add_habit':
            get().deleteHabit(entry.payload.id)
            return { ok: true, message: `Removed habit "${entry.payload.name}".` }
          case 'toggle_habit':
            get().toggleHabit(entry.payload.habitId, entry.payload.dayIndex)
            return { ok: true, message: `Undid the tick on "${entry.payload.name}".` }
          case 'complete_quest':
            get().uncompleteQuest(entry.payload.id)
            return { ok: true, message: `Unmarked "${entry.payload.title}".` }
          case 'update_quest':
            get().updateQuest(entry.payload.id, entry.payload.prev)
            return { ok: true, message: 'Quest change undone.' }
          case 'update_habit':
            get().updateHabit(entry.payload.id, entry.payload.prev)
            return { ok: true, message: 'Habit change undone.' }
          case 'schedule_alarm':
            get().deleteAlarm(entry.payload.id)
            return { ok: true, message: 'Alarm cancelled.' }
          default:
            return { ok: false, message: 'That action cannot be undone.' }
        }
      },

      // What Nexus reports for "what penalty will I get today?" — a
      // read-only preview, not an application, of the XP at risk from
      // today's not-yet-completed daily quests.
      getPendingPenaltyPreview: () => {
        const state = get()
        const due = state.quests.filter((q) => q.type === 'daily' && !q.completed && !get().isQuestOnLeave(q.id, localDateKey()))
        const xpAtRisk = due.reduce((sum, q) => sum + (q.xp || 0), 0)
        return { enabled: state.settings?.penaltiesEnabled === true, count: due.length, xpAtRisk, quests: due.map((q) => q.title) }
      },

      // ── Daily history (for real, non-synthetic analytics) ──────────
      _logDaily: (patch) => {
        const key = new Date().toISOString().slice(0, 10)
        set((s) => {
          const day = s.dailyHistory[key] || { xp: 0, quests: 0, habits: 0 }
          const merged = {
            ...s.dailyHistory,
            [key]: {
              xp: day.xp + (patch.xp || 0),
              quests: day.quests + (patch.quests || 0),
              habits: day.habits + (patch.habits || 0),
            },
          }
          const keys = Object.keys(merged).sort()
          if (keys.length > 90) {
            keys.slice(0, keys.length - 90).forEach((k) => delete merged[k])
          }
          return { dailyHistory: merged }
        })
      },

      // ── Streak ────────────────────────────────────────────────────
      updateStreak: () => {
        const state = get()
        const today = new Date().toDateString()
        const todayKey = localDateKey()
        const player = state.player
        if (player.lastActiveDate === today) return
        if (state.isDateOnLeave(todayKey)) {
          set({ player: { ...player, lastActiveDate: today } })
          return
        }
        let cursor = new Date()
        cursor.setHours(0, 0, 0, 0)
        cursor.setDate(cursor.getDate() - 1)
        let previousActiveDate = null
        for (let i = 0; i < 31; i += 1) {
          const key = localDateKey(cursor)
          if (!state.isDateOnLeave(key)) { previousActiveDate = cursor.toDateString(); break }
          cursor.setDate(cursor.getDate() - 1)
        }
        const newStreak = player.lastActiveDate === previousActiveDate ? player.streak + 1 : 1
        set({
          player: { ...player, streak: newStreak, lastActiveDate: today },
        })
        if (newStreak === 7) {
          get().addGems(3)
          get().pushNotification({
            type: 'streak',
            title: '7-Day Streak!',
            desc: '+3 gems awarded. Keep the fire burning.',
          })
        }
        if (newStreak === 30) {
          get().addGems(15)
          get().pushNotification({
            type: 'streak',
            title: '30-Day Streak!',
            desc: '+15 gems. You are unstoppable.',
          })
        }
      },

      // ── Missed-quest penalty engine ───────────────────────────────
      // The actual penalty now runs automatically at the midnight quest
      // reset (applyMidnightPenalties, above — XP-based, coordinated with
      // level/coins/boss/analytics). This is kept as a read-only status
      // check for the UI/Nexus: it reports what the ledger already
      // recorded for a given day rather than applying anything itself, so
      // calling it repeatedly (e.g. on every app open) can never
      // double-penalize.
      applyDailyPenalties: () => {
        const state = get()
        const yesterday = new Date()
        yesterday.setHours(0, 0, 0, 0)
        yesterday.setDate(yesterday.getDate() - 1)
        const dayKey = localDateKey(yesterday)
        const entry = state.penaltyLedger?.[dayKey]
        if (!entry) return { applied: 0, skipped: 0 }
        return { applied: entry.applied || 0, skipped: entry.skipped || 0, xpLoss: entry.xpLoss || 0, coinLoss: entry.coinLoss || 0 }
      },

      // ── Theme ─────────────────────────────────────────────────────
      setTheme: (theme) => set({ theme }),

      // ── Settings ──────────────────────────────────────────────────
      updateSettings: (updates) => {
        const previous = get().settings
        set((s) => ({ settings: { ...s.settings, ...updates } }))
        if (updates?.notificationsEnabled === false) {
          for (const alarm of get().alarms || []) void cancelNativeAlarm(alarm.id)
        } else if (updates?.notificationsEnabled === true && previous.notificationsEnabled === false) {
          void syncNativeAlarms(get().alarms || [])
        }
      },

      // ── AI Usage Tracking ─────────────────────────────────────────
      trackAIUsage: (provider, usage) => {
        if (!usage) return
        const state = get()
        const current = state.aiUsage
        const perProvider = { ...current.perProvider }
        const existing = perProvider[provider] || { requests: 0, tokens: 0 }
        perProvider[provider] = {
          requests: existing.requests + 1,
          tokens: existing.tokens + (usage.total_tokens || 0),
        }
        set({
          aiUsage: {
            totalRequests: current.totalRequests + 1,
            totalTokens: current.totalTokens + (usage.total_tokens || 0),
            promptTokens: current.promptTokens + (usage.prompt_tokens || 0),
            completionTokens: current.completionTokens + (usage.completion_tokens || 0),
            perProvider,
            lastRequest: Date.now(),
          },
        })
      },

      resetAIUsage: () =>
        set({
          aiUsage: {
            totalRequests: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0,
            perProvider: {},
            lastRequest: null,
          },
        }),

      // ── Achievements ──────────────────────────────────────────────
      _checkAchievements: () => {
        const state = get()
        const newAchievements = []
        const have = (id) => state.achievements.some((a) => a.id === id)

        if (state.stats.questsCompleted >= 1 && !have('first_quest')) {
          newAchievements.push({ id: 'first_quest', name: 'First Steps', desc: 'Complete your first quest', icon: '🎯', date: Date.now() })
        }
        if (state.stats.questsCompleted >= 50 && !have('quest_master')) {
          newAchievements.push({ id: 'quest_master', name: 'Quest Master', desc: 'Complete 50 quests', icon: '🏆', date: Date.now() })
        }
        if (state.stats.bossesDefeated >= 1 && !have('boss_slayer')) {
          newAchievements.push({ id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat your first boss', icon: '⚔️', date: Date.now() })
        }
        if (state.player.streak >= 7 && !have('week_warrior')) {
          newAchievements.push({ id: 'week_warrior', name: 'Week Warrior', desc: '7-day streak', icon: '🔥', date: Date.now() })
        }
        if (state.player.level >= 10 && !have('ascendant')) {
          newAchievements.push({ id: 'ascendant', name: 'Ascendant', desc: 'Reach level 10', icon: '🌟', date: Date.now() })
        }
        if (state.journals.length >= 10 && !have('scribe')) {
          newAchievements.push({ id: 'scribe', name: 'Scribe', desc: 'Write 10 journal entries', icon: '✍️', date: Date.now() })
        }
        if (state.skillTree.filter((s) => s.unlocked && s.cost > 0).length >= 3 && !have('skill_master')) {
          newAchievements.push({ id: 'skill_master', name: 'Skill Master', desc: 'Unlock 3 skills', icon: '🧬', date: Date.now() })
        }

        if (newAchievements.length > 0) {
          set((s) => ({ achievements: [...s.achievements, ...newAchievements] }))
          newAchievements.forEach((a) => {
            get().pushNotification({
              type: 'achievement',
              title: `Achievement — ${a.name}`,
              desc: a.desc,
            })
          })
          get().addGems(2)
        }
      },

      exportData: () => {
        const exportedAt = new Date().toISOString()
        set((s) => ({ settings: { ...s.settings, lastBackupAt: exportedAt } }))
        const state = get()
        const { commandPaletteOpen, ...safeSettings } = state.settings || {}
        return JSON.stringify({
          version: 5,
          exportedAt,
          data: {
            ...state,
            settings: {
              ...safeSettings,
              apiKeys: { mistral: '', groq: '', gemini: '', openrouter: '', cerebras: '', huggingface: '', cloudflare: '', sambanova: '' },
              // A PIN hash is device-lock state, not something a shared backup file should carry.
              pinEnabled: false,
              pinHash: '',
            },
          },
        }, null, 2)
      },

      importData: (payload) => {
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
          const data = parsed?.data || parsed
          if (!data?.player || !Array.isArray(data?.quests)) return false
          set((s) => ({ ...s, ...data, settings: { ...s.settings, ...(data.settings || {}), apiKeys: { ...s.settings.apiKeys, ...(data.settings?.apiKeys || {}) } }, schemaVersion: 5 }))
          void syncNativeAlarms(data.alarms || [], data.leaveRequests || [])
          return true
        } catch {
          return false
        }
      },

      // ── Full reset ────────────────────────────────────────────────
      hardReset: () => {
        set({ ...initialStore, nexusHistory: [], alarms: [], player: { ...initialPlayer, lastActiveDate: new Date().toDateString() } })
      },
    }),
    {
      name: 'arise-save',
      version: 5,
      storage: createJSONStorage(() => debouncedLocalStorage),
      migrate: (persistedState) => ({
        ...persistedState,
        nexusHistory: persistedState?.nexusHistory || [],
        leaveRequests: persistedState?.leaveRequests || [],
        penaltyLedger: persistedState?.penaltyLedger || {},
        alarms: persistedState?.alarms || [],
        undoStack: persistedState?.undoStack || [],
        settings: {
          ...initialStore.settings,
          ...(persistedState?.settings || {}),
          apiKeys: { ...initialStore.settings.apiKeys, ...(persistedState?.settings?.apiKeys || {}) },
          voiceLanguage: persistedState?.settings?.voiceLanguage || 'en-IN',
          voiceProfile: persistedState?.settings?.voiceProfile || 'friendly-woman',
          voicePitch: Number(persistedState?.settings?.voicePitch ?? 1),
          continuousVoiceInput: persistedState?.settings?.continuousVoiceInput !== false,
          wakeWordEnabled: persistedState?.settings?.wakeWordEnabled !== false,
          backgroundWakeEnabled: persistedState?.settings?.backgroundWakeEnabled === true,
          nexusOwnerVerification: persistedState?.settings?.nexusOwnerVerificationOptIn === true && persistedState?.settings?.nexusOwnerVerification === true,
          nexusPersonality: persistedState?.settings?.nexusPersonality || 'friendly',
          penaltiesEnabled: persistedState?.settings?.penaltiesEnabled === true,
          missedQuestPenaltyHp: Number(persistedState?.settings?.missedQuestPenaltyHp || 8),
          notificationsEnabled: persistedState?.settings?.notificationsEnabled !== false,
        },
        schemaVersion: 5,
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState || {}),
          settings: {
            ...currentState.settings,
            ...(persistedState?.settings || {}),
            apiKeys: { ...currentState.settings.apiKeys, ...(persistedState?.settings?.apiKeys || {}) },
            voiceLanguage: persistedState?.settings?.voiceLanguage || currentState.settings.voiceLanguage,
            voiceProfile: persistedState?.settings?.voiceProfile || currentState.settings.voiceProfile,
            voicePitch: Number(persistedState?.settings?.voicePitch ?? currentState.settings.voicePitch ?? 1),
            continuousVoiceInput: persistedState?.settings?.continuousVoiceInput !== undefined ? persistedState.settings.continuousVoiceInput !== false : currentState.settings.continuousVoiceInput,
            wakeWordEnabled: persistedState?.settings?.wakeWordEnabled !== undefined ? persistedState.settings.wakeWordEnabled !== false : currentState.settings.wakeWordEnabled,
            backgroundWakeEnabled: persistedState?.settings?.backgroundWakeEnabled === true,
            nexusOwnerVerification: persistedState?.settings?.nexusOwnerVerificationOptIn === true && persistedState?.settings?.nexusOwnerVerification === true,
            nexusPersonality: persistedState?.settings?.nexusPersonality || currentState.settings.nexusPersonality,
            penaltiesEnabled: persistedState?.settings?.penaltiesEnabled === true,
            missedQuestPenaltyHp: Number(persistedState?.settings?.missedQuestPenaltyHp || currentState.settings.missedQuestPenaltyHp || 8),
            notificationsEnabled: persistedState?.settings?.notificationsEnabled !== false,
          },
          nexusHistory: persistedState?.nexusHistory || currentState.nexusHistory,
          leaveRequests: persistedState?.leaveRequests || currentState.leaveRequests,
          penaltyLedger: persistedState?.penaltyLedger || currentState.penaltyLedger,
          alarms: persistedState?.alarms || currentState.alarms,
          undoStack: persistedState?.undoStack || currentState.undoStack,
        }
        return resetDailyProgressIfNeeded(merged)
      },    }
  )
)

export { ATTRIBUTES, XP_PER_LEVEL }
