// Nexus Leave / Recovery Review Engine
// Local-first, deterministic and explainable. It evaluates the request's
// reason, duration, date validity and duplicate coverage. It cannot verify
// whether a real-world excuse is truthful; it only reviews the request.

const pad = (n) => String(n).padStart(2, '0')
export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const parseDateKey = (value) => {
  const raw = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const daysInclusive = (start, end) => {
  const a = parseDateKey(start)
  const b = parseDateKey(end)
  if (!a || !b || b < a) return 0
  return Math.floor((b - a) / 86400000) + 1
}

export const overlaps = (aStart, aEnd, bStart, bEnd) => {
  const a = parseDateKey(aStart)?.getTime()
  const b = parseDateKey(aEnd)?.getTime()
  const c = parseDateKey(bStart)?.getTime()
  const d = parseDateKey(bEnd)?.getTime()
  if (![a, b, c, d].every(Number.isFinite)) return false
  return a <= d && c <= b
}

const reasonPatterns = [
  { id: 'vacation', words: ['vacation', 'holiday', 'trip', 'travel', 'travelling', 'traveling', 'tour'], label: 'Vacation / travel' },
  { id: 'college', words: ['college', 'exam', 'semester', 'assignment', 'project', 'lab', 'internship', 'event'], label: 'College / academic load' },
  { id: 'recovery', words: ['recovery', 'rest', 'burnout', 'exhausted', 'fatigue', 'recharge', 'break'], label: 'Recovery / rest' },
  { id: 'health', words: ['sick', 'ill', 'fever', 'medical', 'doctor', 'health', 'injury', 'hospital'], label: 'Health / medical' },
  { id: 'family', words: ['family', 'wedding', 'function', 'relative', 'emergency', 'bereavement'], label: 'Family / personal' },
  { id: 'work', words: ['work', 'job', 'shift', 'deadline', 'client', 'business'], label: 'Work / business' },
]

export const classifyLeaveReason = (reason) => {
  const text = String(reason || '').trim().toLowerCase()
  if (!text) return { valid: false, category: 'unknown', label: 'Missing reason', confidence: 0 }
  const match = reasonPatterns.find((entry) => entry.words.some((word) => text.includes(word)))
  return match
    ? { valid: true, category: match.id, label: match.label, confidence: 0.9 }
    : { valid: false, category: 'unknown', label: 'Unclear reason', confidence: 0.25 }
}

export const reviewLeaveRequest = ({ quest, startDate, endDate, reason, existingLeaves = [] }) => {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  const duration = daysInclusive(startDate, endDate)
  const category = classifyLeaveReason(reason)
  const today = parseDateKey(localDateKey())
  const reasons = []
  const checks = []

  if (!quest) reasons.push('Select a real quest before requesting leave.')
  if (!start || !end) reasons.push('Start and end dates must be valid calendar dates.')
  if (start && end && end < start) reasons.push('End date cannot be before the start date.')
  if (duration > 30) reasons.push('A single leave request is limited to 30 days. Split longer breaks into separate reviewed periods.')
  if (start && start < today && localDateKey(start) !== localDateKey(today)) reasons.push('Leave cannot be backdated.')
  if (!category.valid) reasons.push('Reason is too vague. Explain a genuine operational reason such as vacation, college work, health, family, work, or recovery.')

  const duplicate = existingLeaves.find((entry) =>
    entry.questId === quest?.id && entry.status === 'approved' && overlaps(startDate, endDate, entry.startDate, entry.endDate)
  )
  if (duplicate) reasons.push('This quest already has approved leave covering part of that period.')

  checks.push({ label: 'Valid dates', passed: !!start && !!end && duration > 0 && duration <= 30 })
  checks.push({ label: 'Reason quality', passed: category.valid })
  checks.push({ label: 'No duplicate coverage', passed: !duplicate })
  checks.push({ label: 'Operationally bounded', passed: duration > 0 && duration <= 30 })

  const approved = reasons.length === 0
  const summary = approved
    ? `Approved: ${quest?.title || 'quest'} is exempt from missed-quest penalties from ${startDate} through ${endDate}.` 
    : `Disapproved: ${reasons[0]}`

  return {
    approved,
    category,
    duration,
    reasons,
    checks,
    summary,
    reviewedBy: 'Nexus Leave Review',
    reviewedAt: Date.now(),
    policyVersion: '1.0',
  }
}

export const isQuestOnApprovedLeave = (leaves, questId, dateKey) =>
  (leaves || []).some((entry) => entry.questId === questId && entry.status === 'approved' && dateKey >= entry.startDate && dateKey <= entry.endDate)

export const isDateOnApprovedLeave = (leaves, dateKey) =>
  (leaves || []).some((entry) => entry.status === 'approved' && dateKey >= entry.startDate && dateKey <= entry.endDate)
