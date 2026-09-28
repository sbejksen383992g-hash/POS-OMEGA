import { APP_QUERY_HINTS } from './nexusAppCatalog'

// ── Nexus AI Multi-Provider System ─────────────────────────────────
// Supports Mistral, Groq, Google Gemini, and OpenRouter with automatic
// fallback, retry with exponential backoff, and usage tracking.

export const AI_PROVIDERS = [
  {
    id: 'groq', name: 'Groq', desc: 'Ultra-fast inference + speech-to-text',
    models: [
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', default: true },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
      { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    ],
    defaultModel: 'openai/gpt-oss-120b', getKeyUrl: 'https://console.groq.com/keys', freeTier: true,
    freeTierNote: 'Free developer access is rate-limited; Groq also provides Whisper speech-to-text.',
    rateLimits: 'Limits vary by model and current Groq free-tier policy.',
  },
  {
    id: 'mistral', name: 'Mistral', desc: 'Fast general-purpose models',
    models: [
      { id: 'mistral-small-latest', label: 'Mistral Small (latest)', default: true },
      { id: 'mistral-large-latest', label: 'Mistral Large (latest)' },
      { id: 'ministral-3-14b-latest', label: 'Ministral 3 14B' },
    ],
    defaultModel: 'mistral-small-latest', getKeyUrl: 'https://console.mistral.ai/api-keys/', freeTier: true,
    freeTierNote: 'Experiment/developer access is rate-limited and can change.',
    rateLimits: 'Limits vary by model and account tier.',
  },
  {
    id: 'gemini', name: 'Google Gemini', desc: 'Latest Google reasoning + multimodal stack',
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', default: true },
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
    ],
    defaultModel: 'gemini-3.8-flash', getKeyUrl: 'https://aistudio.google.com/apikey', freeTier: true,
    freeTierNote: 'Google AI Studio has a free tier for eligible models. New September 2026 keys use the newer auth-key flow.',
    rateLimits: 'Free-tier RPM/TPM/RPD limits vary by model and project.',
  },
  {
    id: 'openrouter', name: 'OpenRouter', desc: 'Free model router + multi-provider fallback',
    models: [
      { id: 'openrouter/free', label: 'Auto Free Router', default: true },
      { id: 'nvidia/nemotron-3-ultra:free', label: 'NVIDIA Nemotron 3 Ultra (free)' },
      { id: 'inclusionai/ling-3.0-flash-fin:free', label: 'Ling 3.0 Flash Fin (free)' },
      { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)' },
      { id: 'dots/3-note-preview:free', label: 'Dots3 Note Preview (free)' },
    ],
    defaultModel: 'openrouter/free', getKeyUrl: 'https://openrouter.ai/keys', freeTier: true,
    freeTierNote: 'OpenRouter currently lists 25+ free models; the free plan has a request/day limit.',
    rateLimits: 'Free plan currently lists 50 requests/day.',
  },
  {
    id: 'cerebras', name: 'Cerebras', desc: 'Extremely fast inference',
    models: [
      { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', default: true },
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B' },
      { id: 'zai-glm-4.7', label: 'GLM 4.7' },
    ],
    defaultModel: 'gpt-oss-120b', getKeyUrl: 'https://cloud.cerebras.ai/', freeTier: true,
    freeTierNote: 'Cerebras offers a free trial with $5 credit; current free-tier limits can be temporarily reduced for high-demand models.',
    rateLimits: 'Free-trial limits vary by model and current capacity.',
  },
  {
    id: 'huggingface', name: 'Hugging Face', desc: 'Multi-provider open-model router',
    models: [
      { id: 'openai/gpt-oss-120b:fastest', label: 'GPT-OSS 120B · fastest', default: true },
      { id: 'deepseek-ai/DeepSeek-R1:fastest', label: 'DeepSeek R1 · fastest' },
      { id: 'moonshotai/Kimi-K2-Instruct-0905:fastest', label: 'Kimi K2 · fastest' },
    ],
    defaultModel: 'openai/gpt-oss-120b:fastest', getKeyUrl: 'https://huggingface.co/settings/tokens', freeTier: true,
    freeTierNote: 'Free users currently receive a small monthly Inference Providers credit; usage beyond it is paid.',
    rateLimits: 'Free credit is limited and provider/model dependent.',
  },
  {
    id: 'cloudflare', name: 'Cloudflare Workers AI', desc: 'Daily free allocation + global inference',
    models: [
      { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B Fast', default: true },
      { id: '@cf/openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: '@cf/zai-org/glm-4.7-flash', label: 'GLM 4.7 Flash' },
      { id: '@cf/google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B' },
    ],
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', getKeyUrl: 'https://dash.cloudflare.com/', freeTier: true,
    freeTierNote: 'Workers AI currently includes a 10,000-neuron/day free allocation. Key format in POS: ACCOUNT_ID:API_TOKEN.',
    rateLimits: 'Free allocation resets daily; model pricing/limits vary.',
  },
  {
    id: 'sambanova', name: 'SambaNova', desc: 'Fast enterprise-grade open models',
    models: [
      { id: 'Meta-Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', default: true },
      { id: 'DeepSeek-R1', label: 'DeepSeek R1' },
      { id: 'Llama-4-Maverick-17B-128E-Instruct', label: 'Llama 4 Maverick' },
    ],
    defaultModel: 'Meta-Llama-3.3-70B-Instruct', getKeyUrl: 'https://cloud.sambanova.ai/', freeTier: true,
    freeTierNote: 'SambaNova offers introductory free credits on its developer tier; a payment method may be required under current plans.',
    rateLimits: 'Current developer limits and credits are account dependent.',
  },
]

export const getProvider = (id) => AI_PROVIDERS.find((p) => p.id === id)

// ── System prompt ──────────────────────────────────────────────────

const buildSystemPrompt = (player, attributes, quests, habits, alarms = [], memories = [], deviceCapabilities = {}) => {
  const attrSummary = Object.entries(attributes)
    .map(([id, val]) => `${id}: Lv.${val.level}`)
    .join(', ')

  const activeQuests = quests.filter((q) => !q.completed)
    .map((q) => `${q.id} | ${q.title} | ${q.section || 'General'} | ${q.subsection || ''}`)
    .join('\n') || 'none'
  const habitNames = habits.map((h) => `${h.id} | ${h.name}`).join('\n') || 'none'
  const alarmSummary = alarms.filter((a) => a.enabled).map((a) => `${a.id} | ${a.title} | ${a.time} | ${a.repeat}`).join('\n') || 'none'
  const memorySummary = (Array.isArray(memories) ? memories : []).slice(-12).map((m, i) => `${i + 1}. ${m.text || m}`).join('\n') || 'none'
  const deviceSummary = Object.entries(deviceCapabilities || {}).map(([k, v]) => `${k}: ${v ? 'yes' : 'no'}`).join(', ') || 'unknown'

  return `You are Nexus AI, the intelligent operating assistant inside POS (Personal Operating System).

You have two responsibilities:
1. Answer the user's normal questions intelligently and use the conversation context naturally.
2. When the user asks you to change POS state, emit a validated action envelope so the application can execute the action.

The user's current state:
- Name: ${player.name}, Level ${player.level}, Title: ${player.title}
- XP: ${player.xp}, Coins: ${player.coins}, Gems: ${player.gems}
- Streak: ${player.streak} days
- Attributes: ${attrSummary}

ACTIVE QUESTS (IDs are authoritative):
${activeQuests}

HABITS:
${habitNames}

ACTIVE ALARMS:
${alarmSummary}

IMPORTANT ACTION RULES:
- Never claim that an app action happened unless an action envelope is emitted.
- Use the exact IDs supplied above when completing or deleting existing items.
- For creating quests, provide a concise title and optional description. The application will classify section, metric, target and attribute locally.
- For leave, never invent a reason. Require a concrete reason and exact YYYY-MM-DD dates. The app's Nexus Leave Review will approve/disapprove the request.
- For alarms, use an ISO timestamp in the user's local timezone converted to ISO only if you can determine it. If the requested time is ambiguous, ask a clarification question instead of guessing.
- Only use the supported action names below.
- Prefer a short sequence of validated actions over pretending to do work in prose.
- For external device actions, be explicit about what the OS surface actually did.
- ChatGPT, YouTube, WhatsApp, Telegram, Gmail, Chrome, Maps, Messages, Spotify, Instagram, Facebook, Calculator, Camera, Photos, Clock, Phone, Contacts, Calendar, Files, Drive, Keep, Meet, Play Store, Recorder, LinkedIn, Reddit, X, Snapchat, Discord, Amazon and Flipkart are recognized launcher targets when available on the device. If the user refers to an app indirectly (e.g. 'my clock', 'the camera', 'my photos', 'the browser', 'music', 'messages'), map it to the correct launcher target instead of claiming you do not know it. If an app is not in the built-in catalog, still emit open_app with the user's app phrase; the native launcher discovery layer can resolve installed launcher apps by their visible label.
- Never claim that an SMS was sent or a call was placed: this build only opens the user-visible composer/dialer.
- Never ask the app to install software, execute shell commands, access private files, or bypass Android permissions.
- For external-app requests, treat the app name as intent data, not arbitrary code. The native layer validates the target against installed launcher apps and known aliases.
- Never output JavaScript, HTML, shell commands, raw URLs to execute, or arbitrary code as an action.

AGENT BEHAVIOR:
- Treat every request as either conversation, information retrieval, navigation, or an executable action.
- Prefer deterministic local actions when they are clearly supported; do not waste an AI request for simple app launches or POS navigation.
- For app references, resolve both literal and indirect language. Examples: “my clock”, “alarm app”, “the browser”, “my gallery”, “social photos”, “messaging”, “video app”, “music”, “email”, “my files”, “camera”. When the wording is still ambiguous, ask one short clarification question rather than opening the wrong app.
- For unknown third-party app names, emit open_app with the spoken app phrase. The Android layer can resolve it against the user's visible launcher apps.
- For multi-step requests, emit multiple ordered actions only when each step is safe and deterministic.
- After an action, the application verifies the resulting state. Your response should report the verified result, not assume success.
- Do not fabricate access to the phone, private files, notifications, contacts, messages, or sensors.
- Do not claim microphone, camera, GPS, Bluetooth, or background access unless the device capability context says it is available.
- For destructive or externally consequential actions, prefer confirmation.
- When the user interrupts or says stop, stop speaking immediately and do not continue the previous response.

APP RESOLUTION HINTS:
${APP_QUERY_HINTS}

SUPPORTED ACTIONS:
create_quest { title, desc?, type?: 'daily'|'weekly'|'one-time', difficulty?: 'easy'|'medium'|'hard'|'epic' }
create_habit { name, attribute? }
complete_quest { questId }
delete_quest { questId }
request_leave { questId | title | name, startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', reason }
create_journal { content }
schedule_alarm { title, note?, time, repeat?: 'once'|'daily' }
toggle_setting { key: 'voiceEnabled'|'soundEnabled'|'animationsEnabled'|'aiEnabled', value: boolean }
toggle_habit { habitId | name, dayIndex? }
delete_habit { habitId | name }
navigate { page }
set_theme { theme }
open_app { app: string }
open_maps { query }
compose_sms { to, body }
compose_whatsapp { to, body }
dial_number { number }
open_device_settings {}
share_text { title?, text }

ACTION FORMAT:
<NEXUS_ACTION>{"actions":[{"action":"create_quest","title":"Drink 4L water","type":"daily"}]}</NEXUS_ACTION>

You may include a concise natural-language response before or after the action envelope.
For multiple requested changes, include multiple actions in one envelope in execution order.
If no app change is requested, do not emit an action envelope.

CONVERSATION:
The messages supplied after this system instruction are the user's real recent conversation. Use them as short-term memory. Do not repeatedly ask for information that is already present there.

STYLE:
Be calm, precise, concise and useful. Use the user's POS context when relevant. Do not invent metrics or completed actions. Never mention that you are an AI model; you are Nexus AI.`
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Provider-specific API callers ──────────────────────────────────

class AIError extends Error {
  constructor(message, opts = {}) {
    super(message)
    this.retryable = opts.retryable || false
    this.status = opts.status
    this.provider = opts.provider
    this.isInvalidKey = opts.isInvalidKey || false
    this.isRateLimit = opts.isRateLimit || false
    this.isModelUnavailable = opts.isModelUnavailable || false
  }
}

function classifyError(status, providerId, body) {
  if (status === 401 || status === 403) {
    if (providerId === 'gemini' && /standard key|auth key|unrestricted|rejected/i.test(String(body || ''))) {
      return new AIError('Gemini rejected this key. In September 2026 Google requires the newer auth-key flow; create a fresh key in Google AI Studio and replace the old key in POS.', { retryable: false, status, provider: providerId, isInvalidKey: true })
    }
    return new AIError(`Invalid API key for ${providerId}. Check your key in Settings.`, {
      retryable: false, status, provider: providerId, isInvalidKey: true,
    })
  }
  if (status === 404) {
    return new AIError(`Model not available on ${providerId}. Try a different model.`, {
      retryable: false, status, provider: providerId, isModelUnavailable: true,
    })
  }
  if (status === 429) {
    return new AIError(`Rate limit hit on ${providerId}. Will retry or fall back.`, {
      retryable: true, status, provider: providerId, isRateLimit: true,
    })
  }
  if (status === 503 || status === 502 || status >= 500) {
    return new AIError(`${providerId} server error (${status}). Will retry or fall back.`, {
      retryable: true, status, provider: providerId,
    })
  }
  return new AIError(`${providerId} error: ${status}`, {
    retryable: false, status, provider: providerId,
  })
}

async function callOpenAICompatible(url, apiKey, model, messages, systemPrompt, providerId) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
  ]

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  if (providerId === 'openrouter') {
    headers['X-Title'] = 'POS Nexus AI'
    headers['HTTP-Referer'] = 'https://pos.app'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw classifyError(res.status, providerId, errBody)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new AIError(`No response from ${providerId}`, { provider: providerId })

  const usage = data?.usage
  return { text: text.trim(), usage }
}

async function callMistral(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible(
    'https://api.mistral.ai/v1/chat/completions',
    apiKey, model, messages, systemPrompt, 'mistral'
  )
}

async function callGroq(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    apiKey, model, messages, systemPrompt, 'groq'
  )
}

async function callOpenRouter(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    apiKey, model, messages, systemPrompt, 'openrouter'
  )
}

async function callGemini(apiKey, model, messages, systemPrompt) {
  const prompt = `${systemPrompt}\n\nCONVERSATION:\n${messages.map((m) => `${m.role === 'ai' ? 'Nexus' : 'User'}: ${m.text}`).join('\n')}`
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: 'medium' } },
      }),
    }
  )
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw classifyError(res.status, 'gemini', errBody)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('').trim()
  if (!text) throw new AIError('No response from Gemini', { provider: 'gemini' })
  const usage = data?.usageMetadata ? {
    prompt_tokens: data.usageMetadata.promptTokenCount,
    completion_tokens: data.usageMetadata.candidatesTokenCount,
    total_tokens: data.usageMetadata.totalTokenCount,
  } : undefined
  return { text, usage }
}

async function callCerebras(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible('https://api.cerebras.ai/v1/chat/completions', apiKey, model, messages, systemPrompt, 'cerebras')
}

async function callHuggingFace(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible('https://router.huggingface.co/v1/chat/completions', apiKey, model, messages, systemPrompt, 'huggingface')
}

async function callCloudflare(apiKey, model, messages, systemPrompt) {
  const separator = apiKey.includes(':') ? ':' : '|'
  const [accountId, token] = apiKey.split(separator)
  if (!accountId || !token) throw new AIError('Cloudflare key format must be ACCOUNT_ID:API_TOKEN.', { provider: 'cloudflare', isInvalidKey: true })
  const formattedMessages = [{ role: 'system', content: systemPrompt }, ...messages.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))]
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: formattedMessages, max_tokens: 2048 }),
  })
  if (!res.ok) throw classifyError(res.status, 'cloudflare', await res.text().catch(() => ''))
  const data = await res.json()
  const text = data?.result?.response || data?.result?.text || data?.result?.output || data?.result?.content
  if (!text) throw new AIError('No response from Cloudflare Workers AI', { provider: 'cloudflare' })
  return { text: String(text).trim(), usage: data?.result?.usage }
}

async function callSambaNova(apiKey, model, messages, systemPrompt) {
  return callOpenAICompatible('https://api.sambanova.ai/v1/chat/completions', apiKey, model, messages, systemPrompt, 'sambanova')
}

const PROVIDER_CALLERS = {
  mistral: callMistral,
  groq: callGroq,
  gemini: callGemini,
  openrouter: callOpenRouter,
  cerebras: callCerebras,
  huggingface: callHuggingFace,
  cloudflare: callCloudflare,
  sambanova: callSambaNova,
}

// ── Main call with retry + fallback ────────────────────────────────

export const callAI = async (
  providerId, apiKey, model, messages,
  player, attributes, quests, habits,
  options = {}
) => {
  const systemPrompt = buildSystemPrompt(player, attributes, quests, habits, options.alarms || [], options.memories || [], options.deviceCapabilities || {})
  const maxRetries = options.maxRetries ?? 3
  const enableFallback = options.enableFallback ?? true
  const apiKeys = options.apiKeys || {}

  // Build fallback chain: all providers with keys, excluding the primary
  const fallbackChain = enableFallback
    ? AI_PROVIDERS
        .filter((p) => p.id !== providerId && apiKeys[p.id])
        .map((p) => ({ providerId: p.id, apiKey: apiKeys[p.id], model: p.defaultModel }))
    : []

  const allAttempts = [{ providerId, apiKey, model }, ...fallbackChain]
  const errors = []

  for (const attempt of allAttempts) {
    const caller = PROVIDER_CALLERS[attempt.providerId]
    if (!caller) continue

    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const result = await caller(attempt.apiKey, attempt.model, messages, systemPrompt)
        return {
          text: result.text,
          usage: result.usage,
          provider: attempt.providerId,
          model: attempt.model,
          fellBack: attempt.providerId !== providerId,
        }
      } catch (err) {
        errors.push({ provider: attempt.providerId, retry, error: err.message })

        if (err.isInvalidKey || err.isModelUnavailable || !err.retryable) {
          break
        }

        if (retry < maxRetries - 1) {
          await sleep(1000 * Math.pow(2, retry))
        }
      }
    }
  }

  const lastError = errors[errors.length - 1]
  if (lastError) {
    const provider = getProvider(lastError.provider)
    if (errors.some((e) => e.error.includes('Rate limit'))) {
      throw new AIError(
        `All providers hit rate limits. Wait a moment and try again. Providers tried: ${errors.map((e) => e.provider).join(', ')}.`,
        { retryable: true }
      )
    }
    if (errors.some((e) => e.error.includes('Invalid API key'))) {
      throw new AIError(
        `API key issue. Check your keys in Settings. Providers tried: ${errors.map((e) => e.provider).join(', ')}.`,
        { isInvalidKey: true }
      )
    }
    throw new AIError(
      `All providers failed. Last error from ${provider?.name || lastError.provider}: ${lastError.error}`,
      { retryable: false }
    )
  }

  throw new AIError('No providers available. Add an API key in Settings.', { retryable: false })
}

// ── Test connection ────────────────────────────────────────────────

export const testConnection = async (providerId, apiKey, model) => {
  try {
    const result = await callAI(
      providerId, apiKey, model,
      [{ role: 'user', text: 'Reply with exactly: Connection successful.' }],
      { name: 'Operator', level: 1, title: 'Initiate', xp: 0, coins: 0, gems: 0, streak: 0 },
      { strength: { level: 1 }, intelligence: { level: 1 }, wisdom: { level: 1 }, charisma: { level: 1 }, vitality: { level: 1 }, discipline: { level: 1 } },
      [], [],
      { enableFallback: false, maxRetries: 1 }
    )
    return {
      success: true,
      message: result.text,
      provider: result.provider,
      usage: result.usage,
    }
  } catch (err) {
    return { success: false, message: err.message }
  }
}
