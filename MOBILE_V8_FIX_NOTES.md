# APEX V8 - Mobile fix pass

## Root causes found
1. **Nexus owner-lock disabled the mic, textbox, send button and quick prompts** on Android until a biometric
   check passed (default was ON, no toggle in Settings). If biometrics/screen-lock failed, everything looked "dead".
   -> Default is now OFF (store + persisted migration). Existing saves are migrated to OFF.
2. Native mic: `startSpeech` resolved `{started:false}` on failure and JS treated it as success (UI "listening", no audio).
   -> JS now falls back to the Capgo recognizer. Java now prefers the standard system recognizer, no forced offline mode,
   clearer language-pack errors.
3. Every tap did `JSON.parse` of the whole saved store (for the sound setting) + played audio synchronously.
   -> Setting cached; sound deferred; light haptic added.
4. Store persisted the full JSON to localStorage on every change. -> Debounced (450ms) + flushed on hide/close.
5. Mobile page transition kept old + new pages mounted at once (AnimatePresence "sync"). -> One page + 180ms CSS fade.
6. Bottom nav used framer-motion pan gestures. -> Passive touch swipe (taps never delayed).
7. Global CommandPalette subscribed to the entire store. -> Lazy read.
8. Wake-word polled the native bridge every 900ms always. -> Only when background wake is enabled (1.5s).
9. `body::before` referenced `/assets/pos-background.svg` which does not exist (404) and the service worker tried to
   pre-cache it. -> Uses `dashboard-atmosphere.webp`; SW no longer references the missing file.
10. Heavy mobile GPU effects: backdrop-filter on topbar/modals, blend modes, infinite shimmer loops.
    -> Replaced with layered gradients + hairline highlights (same premium look, far cheaper).
11. Google Fonts CSS was render-blocking (bad offline in the APK). -> Non-blocking.
12. Modal/Nexus chat used `vh` (jumps on Android). -> `dvh`.

## REBUILD REQUIRED (dist/ was intentionally removed - it was stale)
    npm install
    npm run android:build      (Windows)  or:  npm run build && npx cap sync android
Then uninstall the old APK once (clears the old service-worker cache) and install the new one.

## Not done / needs on-device check
- Could not run a build or a phone in the sandbox (no network). Syntax-checked only.
- If the mic still fails: Android Settings > Apps > (app) > Permissions > Microphone, and make sure the
  "Speech Services by Google" app is installed/enabled.
