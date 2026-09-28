# Nexus V5 Ultra — Current Mobile Patch

This archive is the current APEX/Nexus source used for the mobile hardening pass.

## Included
- Native Android Nexus plugin at `plugins/nexus-native`.
- Native Android app launching by package/intent with launcher discovery.
- Natural/direct and indirect app aliases (ChatGPT, YouTube, WhatsApp, Instagram, Clock, etc.).
- Native Android speech recognition bridge with microphone permission handling.
- Voice barge-in: partial speech cancels active Nexus TTS.
- Android biometric/device-credential owner verification for Nexus voice/device commands.
- Optional `Hey Nexus` foreground wake service, explicitly enabled by the user.
- Mobile-native scrolling path and lighter IntersectionObserver reveals.
- Mobile low-power video fallback (poster-first) and reduced backdrop-filter usage.
- Random sample phone number removed from the App Control suggestions.

## Android build
Use:

```text
npm install
npm run android:prepare
npm run android:build
```

For first-time Android project creation, `scripts/ensure-android.mjs` runs `npx cap add android` when needed, then `npx cap sync android`.

## Security reality
Speech recognition transcribes speech; it does not prove who is speaking. Owner gating uses Android biometric/device credentials. Background hotword capability remains subject to Android's assistant/foreground-service rules.
