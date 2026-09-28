# POS — Nexus Control Upgrade Handoff

## What changed
- Persistent Nexus conversation history in Zustand/localStorage.
- Deterministic natural-language app commands that work without an API key.
- Validated Nexus action protocol for model-driven app control.
- Quest creation/completion/deletion, habits, journal, navigation, settings and alarms can be executed through Nexus.
- Quest intelligence remains local and automatically classifies section/subsection/metric/target/attribute.
- Calendar now includes persistent local alarms, notification permission and optional sound.
- Alarm scheduler runs globally while the POS web app is open.
- Settings Mic2 import is fixed.
- Existing mobile navigation fix is preserved.

## Important limitation
Browser alarms are best-effort while the POS web app/PWA runtime is active. Web browsers do not provide a general-purpose exact alarm guarantee after a tab is fully terminated. For guaranteed OS-level alarms while the app is completely closed, a native wrapper or a server push/scheduling backend is required.

## Run
npm install
npm run dev

## Build
npm run build

## Main control path
AICommand.jsx -> aiEngine.js -> local deterministic action OR aiProviders.js -> parseActionEnvelope() -> validated action registry -> Zustand store.

## Persistence
Zustand persist storage key: arise-save
New persistent fields:
- nexusHistory
- alarms

The store uses persistence version 3 with safe defaults/migration.

## API keys
Provider API keys remain local to the browser. JSON exports blank the provider key fields.


## POS 2.1 mobile hardening
The updated source uses Capacitor 8-compatible Text-to-Speech and Local Notifications for native Android voice/reminders. Mobile navigation reserves a dedicated bottom-safe area; charts use mobile-safe labels; Calendar/Quests support scheduled dates; Attributes radar uses intra-level XP. The generated Android folder is intentionally excluded from the source ZIP; keep the already-created `android/` directory and run `npx cap sync android` after `npm install` and `npm run build`.

## POS 2.2 — Elite Recovery + Nexus AI Upgrade

- Added **Nexus Leave** at `/leave` for per-quest, per-date leave requests.
- Every request receives an explainable local Nexus review: date validity, duration cap, reason quality, and duplicate coverage.
- Approved leave pauses the selected quest without deleting it, awards no XP, suppresses linked reminders, and exempts the quest/date from the missed-quest penalty engine.
- Disapproved requests remain in the Nexus decision history with the reason for disapproval.
- Added configurable missed-quest HP penalty engine. It is disabled by default for safety on upgrades and can be enabled in Settings.
- Added Nexus commands for leave: `request leave for <quest> from YYYY-MM-DD to YYYY-MM-DD because <reason>` and `open leave`.
- Added AI providers: Groq, Mistral, Gemini, OpenRouter, Cerebras, Hugging Face, Cloudflare Workers AI, and SambaNova, with automatic fallback.
- Gemini integration updated to current Gemini 3.8 Flash / stable v1 GenerateContent conventions and `x-goog-api-key` authentication.
- Nexus voice now supports automatic speech-to-text submission, spoken Nexus replies, voice personas, and actual device/browser TTS voice selection.
- Voice personas: Friendly Woman, Girl, Woman, Friendly Man, Boy, Man, CEO, Commander. Exact gender/voice availability depends on the installed TTS engine.

## V4.1 reference-motion upgrade
- Drift-style Lenis profile: duration 1, Expo easing, wheelMultiplier 1.15, touchMultiplier 1.4.
- GSAP ScrollTrigger reveals use the reference 3D flip-in values (y:50, rotateX:-40, perspective:1000, power3.out, 0.8s) with masked heading reveals.
- Profile route added at /profile; sidebar player card navigates there.
- Optional video slots: public/assets/video/dashboard-loop.mp4 and public/assets/video/nexus-loop.mp4. Replace the small placeholders with final clips using the same names.
- Global hover/click audio delegation wired to the existing MP3 sound assets.

## V4.2 — App Lock (PIN gate)
- New `src/components/AppLock.jsx` wraps the whole app in `main.jsx`, above `MotionProvider`/`App`.
- Off by default. Toggle in Settings → App Lock. First enable prompts "create a PIN" (enter twice); after that it's "enter PIN" every launch.
- PIN is 4 digits, obfuscated with a local, non-cryptographic hash (`hashPin` in `src/utils/helpers.js`) stored in `settings.pinHash` — this is a screen-lock deterrent, not real account security, and is documented as such in the Settings copy.
- Unlock state is in-memory only (per launch) — a full reload re-locks, matching normal phone-lock behavior.
- "Forgot PIN?" on the lock screen disables the lock (with a confirm dialog) as the recovery path, since there is no server to reset against.
- `settings.pinEnabled`/`pinHash` are blanked on `exportData()` so a shared backup file never carries lock state.
- Uses `ASSETS.video.dashboardLoop` as a dim looping background behind the lock card, and the existing `playSound` cues for keypress/success/error — no new audio assets needed.
- Not yet done: no biometric/WebAuthn option, no cross-device PIN recovery. Both are reasonable follow-ups if wanted.

## V4.2.1 — App Lock hardening + asset gap closure
- App Lock only gates when a valid PIN was already configured at session start; enabling App Lock from Settings no longer overlays a second setup flow during the current session.
- Global hover sound is mouse/fine-pointer only; click sound remains available for touch, and sound feedback is independent of prefers-reduced-motion.
- Added `public/assets/images/quest-learning.webp` (1024×1024) as an original neon learning/coding visual matching the existing quest-art language.
- Added `public/assets/images/operation-productivity.webp` (1024×1024) because the asset registry referenced it and the previous archive did not contain it.

## Known asset gaps (as of this pass)
- `public/assets/video/dashboard-loop.mp4` and `nexus-loop.mp4` are still tiny placeholder clips (~3KB each), not real footage. Replace with real clips using the exact same filenames — nothing else needs to change.
- Per-page hero/atmosphere art only exists for Dashboard, Profile, Quests and Operations. Bosses/SkillTree/Habits/Attributes/Calendar/Journal/Achievements/Leave/Today have no dedicated background image slot yet — only the global app background. Adding one would mean: (1) drop a new webp under `public/assets/images/`, (2) add its path to `ASSETS` in `src/config/assets.js`, (3) add an `<img>` with the existing `cinematic-hero-art`/`quest-card-art` CSS pattern to that page. No copyrighted/AI-sourced imagery was fetched or bundled in this pass — recommend free sources like Pexels/Pixabay (dark, futuristic, neon search terms) matching the direction already noted in ASSET_GUIDE.md.


## V5 — Nexus Agent + Device Bridge
- Added `src/utils/nexusAgent.js` for deterministic daily briefing and next-best-action planning from live APEX state.
- Added `src/utils/nexusMemory.js` for small, local-only, user-requested Nexus memories.
- Added `src/utils/nexusDevice.js` for safe, user-visible device intents: supported app launch, Maps, SMS/WhatsApp compose, dialer, device settings (best effort), and Web Share.
- Extended local and model-driven Nexus actions with `open_app`, `open_maps`, `compose_sms`, `compose_whatsapp`, `dial_number`, `open_device_settings`, and `share_text`.
- AI actions are still parsed locally and validated before execution. App-state actions verify their result after mutation where practical.
- External messaging/calling is intentionally user-visible only: Nexus prepares the composer/dialer and never silently sends a message or places a call.
- Added local planning commands: `what should I do next`, `daily brief`, `remember that ...`, `what do you remember about me`, and `forget that ...`.
- Provider system prompt now receives user-saved Nexus memory and device capability state and is instructed to behave as a plan -> execute -> verify assistant.
- A normal Android/Web app still cannot arbitrarily control third-party apps or run a background hotword service. Full global assistant control requires deeper native integration (for example a selected Android `VoiceInteractionService`) and additional OS-level permissions/roles.
