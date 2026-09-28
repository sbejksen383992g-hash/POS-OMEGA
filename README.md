# POS — Personal Operating System 2.0

A local-first personal execution system with Nexus AI, persistent state, a daily execution layer, backup/restore, responsive mobile UI, and a controlled action registry.

## What was upgraded

- Instant local interactions through the centralized Zustand store.
- Single source of truth for quests, habits, XP, attributes, journal, alarms, analytics and notifications.
- Nexus action execution for quests, habits, journal, alarms, navigation, settings and themes.
- `Ctrl/Cmd + K` command palette.
- Subtle route transitions and reduced-motion support.
- New **Today** execution view with priority quest, timeline, habit pulse and upcoming alarms.
- Global notification center.
- Offline indicator and local-first behavior.
- PWA manifest + service worker shell caching.
- Mobile safe-area navigation and the fixed `isActive` navigation bug.
- Backup/restore preview UI. Exports intentionally exclude saved API keys.
- System Health panel.
- Human-readable AI/provider failure states.
- Browser notification support for alarms while the app/browser can execute the scheduler.

## Data model

POS persists its state in browser local storage through Zustand persist. Export creates a versioned JSON snapshot. Import validates the snapshot, previews its contents, and restores the application state while preserving API keys already stored on the device.

## Alarm limitation

The current browser alarm scheduler is local. It can trigger notifications while the browser/PWA is active or background-capable, but a pure browser app cannot guarantee a true OS-level alarm after the browser process is completely terminated. The service worker is prepared for persistent notification handling; guaranteed closed-app mobile reminders require a native Android/iOS layer or a push backend.

## Nexus safety model

Nexus does not receive arbitrary JavaScript, shell or DOM access. AI responses can request only whitelisted actions. The application validates action names and arguments before changing POS state. Destructive operations should be confirmed before execution.

## Development

```bash
npm install
npm run dev
npm run build
```

Do not commit `node_modules`, `.env`, API keys, or build output.

## Final QA checklist

### Core
- Refresh and reopen persistence
- Quest/habit creation and completion
- XP and attribute updates
- Journal and achievements
- Analytics consistency

### Nexus
- Create/complete/delete quest
- Create/complete/delete habit
- Journal entry
- Navigation
- Status/progress reads
- Settings/theme controls
- Alarm creation/deletion
- Conversation persistence
- Provider failure/fallback
- Local command fallback without API key

### Mobile
- 360 / 390 / 430 px
- Safe-area bottom navigation
- Keyboard/forms/modals/charts
- Nexus and Settings
- No horizontal overflow

### Data
- Export backup
- Import preview and restore
- Invalid/corrupt JSON handling
- Reset flow

### Production
- `npm run build`
- No runtime exceptions
- No broken routes
- No application-caused console errors


## Asset Pack

The complete local POS visual asset pack is in `public/assets/`. See `ASSET_GUIDE.md` for the asset map and web research references.

## POS 2.2 Elite Systems

### Nexus Leave
Use **Nexus Leave** when a specific quest should be exempt for a specific date range. Do not delete the quest just because you are travelling, overloaded with college work, recovering, or otherwise unavailable. Nexus reviews the request and records an approved/disapproved decision.

### AI providers
The Settings provider stack now includes Groq, Mistral, Gemini, OpenRouter, Cerebras, Hugging Face, Cloudflare Workers AI and SambaNova. Free/trial limits vary by provider and can change; POS does not claim unlimited free inference.

### Nexus Voice
Voice input is converted to text and automatically submitted to Nexus on supported Android/browser speech engines. Spoken Nexus responses use the selected persona and actual device voice where available.
