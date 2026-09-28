const KEY = 'nexus-memory-v1'

const safeRead = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const safeWrite = (items) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-40)))
    return true
  } catch {
    return false
  }
}

export const getNexusMemories = () => safeRead()

export const rememberFact = (fact) => {
  const value = String(fact || '').trim()
  if (!value) return { ok: false, message: 'I need something specific to remember.' }
  const current = safeRead()
  const duplicate = current.find((item) => item.text.toLowerCase() === value.toLowerCase())
  if (duplicate) return { ok: true, duplicate: true, message: `I already remember: “${duplicate.text}”.` }
  const next = [...current, { id: `m${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text: value, createdAt: Date.now() }]
  safeWrite(next)
  return { ok: true, memory: next[next.length - 1], message: `Saved to Nexus memory: “${value}”.` }
}

export const forgetFact = (fact) => {
  const value = String(fact || '').trim().toLowerCase()
  const current = safeRead()
  const next = current.filter((item) => item.text.toLowerCase() !== value && !item.text.toLowerCase().includes(value))
  if (next.length === current.length) return { ok: false, message: `I couldn't find that memory.` }
  safeWrite(next)
  return { ok: true, message: `Removed ${current.length - next.length} memory item${current.length - next.length === 1 ? '' : 's'}.` }
}

export const formatMemory = () => {
  const memories = safeRead()
  if (!memories.length) return 'Nexus memory is empty.'
  return memories.map((item, index) => `${index + 1}. ${item.text}`).join('\n')
}
