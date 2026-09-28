import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { interpretCommand, generateResponse } from '../utils/aiEngine'
import { playSound } from '../utils/helpers'
import { THEMES, isThemeUnlocked } from '../utils/themes'
import { useScrollLock } from '../utils/useScrollLock'

const commandList = [
  { cmd: 'go to dashboard', desc: 'Navigate to Dashboard', action: 'navigate', target: '/' },
  { cmd: 'go to today', desc: 'Open daily execution plan', action: 'navigate', target: '/today' },
  { cmd: 'go to quests', desc: 'Navigate to Quest Log', action: 'navigate', target: '/quests' },
  { cmd: 'go to habits', desc: 'Navigate to Habits', action: 'navigate', target: '/habits' },
  { cmd: 'go to bosses', desc: 'Navigate to Boss Arena', action: 'navigate', target: '/bosses' },
  { cmd: 'go to attributes', desc: 'Navigate to Attributes', action: 'navigate', target: '/attributes' },
  { cmd: 'go to analytics', desc: 'Navigate to Analytics', action: 'navigate', target: '/analytics' },
  { cmd: 'go to journal', desc: 'Navigate to Journal', action: 'navigate', target: '/journal' },
  { cmd: 'go to skill tree', desc: 'Navigate to Skill Tree', action: 'navigate', target: '/skilltree' },
  { cmd: 'go to ai', desc: 'Navigate to AI Command Center', action: 'navigate', target: '/ai' },
  { cmd: 'go to settings', desc: 'Navigate to Settings', action: 'navigate', target: '/settings' },
  { cmd: 'go to leave', desc: 'Open Nexus Leave / Recovery', action: 'navigate', target: '/leave' },
  { cmd: 'show status', desc: 'View current player status', action: 'status' },
  { cmd: 'motivate me', desc: 'Get an inspirational quote', action: 'motivate' },
  { cmd: 'reset daily quests', desc: 'Reset all daily quests', action: 'resetQuests' },
  { cmd: 'help', desc: 'Show all AI commands', action: 'help' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [aiResponse, setAiResponse] = useState(null)
  const navigate = useNavigate()
  // Read lazily: subscribing to the whole store re-rendered this global overlay on every change.
  const store = useMemo(() => new Proxy({}, { get: (_, key) => useStore.getState()[key] }), [])

  useScrollLock(open)

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setAiResponse(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const executeCommand = (cmd) => {
    const item = commandList.find((c) => c.cmd === cmd)
    if (item) {
      if (item.action === 'navigate') {
        navigate(item.target)
        setOpen(false)
        return
      }
      if (item.action === 'motivate') {
        const result = interpretCommand('motivate me')
        const response = generateResponse('motivate', { player: store.player })
        setAiResponse(response)
        playSound('success')
        return
      }
      if (item.action === 'status') {
        const response = generateResponse('show_status', { player: store.player })
        setAiResponse(response)
        playSound('success')
        return
      }
      if (item.action === 'resetQuests') {
        store.resetDailyQuests()
        setAiResponse('All daily quests have been reset. A fresh day of battle begins.')
        playSound('success')
        return
      }
      if (item.action === 'help') {
        setAiResponse(generateResponse('help'))
        return
      }
    }

    // AI natural language interpretation
    const result = interpretCommand(query)
    if (result.intent === 'navigate') {
      const target = result.match.toLowerCase()
      const routeMap = {
        dashboard: '/', home: '/', today: '/today', plan: '/today', quests: '/quests', quest: '/quests',
        habits: '/habits', habit: '/habits', bosses: '/bosses', boss: '/bosses',
        attributes: '/attributes', attribute: '/attributes', stats: '/analytics',
        analytics: '/analytics', journal: '/journal', skill: '/skilltree',
        skilltree: '/skilltree', ai: '/ai', settings: '/settings', leave: '/leave', recovery: '/leave',
      }
      if (routeMap[target]) {
        navigate(routeMap[target])
        setOpen(false)
        return
      }
    }
    if (result.intent === 'add_quest') {
      store.addQuest({
        title: result.match,
        desc: `Created via AI command`,
        attribute: result.attribute,
        difficulty: result.difficulty,
        xp: { easy: 30, medium: 60, hard: 120, epic: 250 }[result.difficulty],
        coins: { easy: 5, medium: 12, hard: 25, epic: 50 }[result.difficulty],
      })
      setAiResponse(generateResponse('add_quest', result))
      playSound('success')
      return
    }
    if (result.intent === 'add_habit') {
      store.addHabit({
        name: result.match,
        attribute: result.attribute,
        target: 7,
        xp: 20,
        coins: 3,
      })
      setAiResponse(generateResponse('add_habit', result))
      playSound('success')
      return
    }
    if (result.intent === 'add_journal') {
      store.addJournal({ content: result.match, mood: 'reflective' })
      setAiResponse(generateResponse('add_journal', result))
      playSound('success')
      return
    }
    if (result.intent === 'motivate') {
      setAiResponse(generateResponse('motivate'))
      playSound('success')
      return
    }
    if (result.intent === 'set_theme') {
      const themeId = result.match.toLowerCase()
      const themeMeta = THEMES.find((t) => t.id === themeId)
      if (themeMeta) {
        if (!isThemeUnlocked(themeMeta, store.player, store.stats)) {
          setAiResponse(`${themeMeta.name} is locked — ${themeMeta.unlock.label} to unlock it.`)
          playSound('error')
          return
        }
        store.setTheme(themeId)
        setAiResponse(generateResponse('set_theme', { text: themeMeta.name }))
        playSound('success')
        return
      }
    }
    if (result.intent === 'show_status') {
      setAiResponse(generateResponse('show_status', { player: store.player }))
      playSound('success')
      return
    }
    if (result.intent === 'help') {
      setAiResponse(generateResponse('help'))
      return
    }

    setAiResponse(result.response || generateResponse('unknown'))
  }

  const filtered = commandList.filter((c) =>
    c.cmd.toLowerCase().includes(query.toLowerCase()) ||
    c.desc.toLowerCase().includes(query.toLowerCase())
  )

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setOpen(false); setAiResponse(null) }}
        >
          <motion.div
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="glass rounded-2xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
              <Search size={18} className="text-text-tertiary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setAiResponse(null) }}
                onKeyDown={(e) => e.key === 'Enter' && executeCommand(query)}
                placeholder="Type a command or ask AI..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-text-tertiary"
              />
              <kbd className="text-[10px] text-text-tertiary px-1.5 py-0.5 rounded border border-border">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
              {aiResponse ? (
                <div className="p-4">
                  <div className="text-xs font-semibold accent-text mb-2 uppercase tracking-wider">AI Response</div>
                  <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans">{aiResponse}</pre>
                  <button
                    onClick={() => setAiResponse(null)}
                    className="mt-3 text-xs btn-ghost"
                  >
                    Back to commands
                  </button>
                </div>
              ) : (
                <div>
                  {filtered.length > 0 ? (
                    filtered.map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => executeCommand(item.cmd)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors text-left"
                      >
                        <Command size={14} className="text-text-tertiary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.desc}</p>
                          <p className="text-xs text-text-tertiary font-mono">{item.cmd}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4">
                      <p className="text-sm text-text-tertiary mb-2">No matching commands. Press Enter to ask the AI.</p>
                      <button onClick={() => executeCommand(query)} className="btn-primary text-sm">
                        Ask AI: "{query}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
