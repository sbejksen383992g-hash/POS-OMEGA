/* ─────────────────────────────────────────────────────────────────────
   src/utils/operations.js

   Single source of truth for the "Operation" a quest belongs to.
   Reuses the taxonomy already defined on the Operations page (Health,
   Learning, College, Finance, Productivity, Personal Development) —
   the same six sections quest.section is classified into by the local
   quest-intelligence engine.

   Not every quest has .section set (the six seed daily quests, and
   anything added before classification existed, only carry
   .attribute). ATTRIBUTE_FALLBACK maps those to a sensible Operation
   so the badge is never blank — "every quest card shows its
   Operation" holds for old data too, not just newly-classified quests.
   ────────────────────────────────────────────────────────────────────── */

import { Activity, Brain, BookOpen, Wallet, Target, Dumbbell } from 'lucide-react'

export const OPERATIONS = [
  { id: 'Health', name: 'Health', icon: Activity, color: '#ff4466' },
  { id: 'Learning', name: 'Learning', icon: Brain, color: '#00d4ff' },
  { id: 'College', name: 'College', icon: BookOpen, color: '#b366ff' },
  { id: 'Finance', name: 'Finance', icon: Wallet, color: '#ffaa00' },
  { id: 'Productivity', name: 'Productivity', icon: Target, color: '#00ff88' },
  { id: 'Personal Development', name: 'Personal Development', icon: Dumbbell, color: '#ff6b35' },
]

const ATTRIBUTE_FALLBACK = {
  strength: 'Health',
  vitality: 'Health',
  intelligence: 'Learning',
  wisdom: 'Personal Development',
  charisma: 'Personal Development',
  discipline: 'Productivity',
}

const byId = Object.fromEntries(OPERATIONS.map((o) => [o.id, o]))

/** Resolves any quest object to one Operation, with a safe fallback chain. */
export function getQuestOperation(quest) {
  if (quest?.section && byId[quest.section]) return byId[quest.section]
  const fallbackId = ATTRIBUTE_FALLBACK[quest?.attribute]
  if (fallbackId) return byId[fallbackId]
  return OPERATIONS[4] // Productivity — neutral default
}
