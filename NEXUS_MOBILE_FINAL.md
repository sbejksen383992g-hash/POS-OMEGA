# APEX V5 — Mobile/Nexus Final Patch

## What this patch fixes

- Native Android app launching uses the bundled `@apex/nexus-native` Capacitor plugin rather than browser-only deep links.
- App aliases cover ChatGPT, YouTube, WhatsApp, Instagram, Clock, Calculator, Camera, Photos, Gmail, Chrome, Maps, Messages, Spotify, Calendar, Files, Drive, Keep and more.
- Unknown installed launcher apps can be resolved by visible app label through Android launcher discovery.
- Native Android speech recognition is preferred, with microphone permission handling and listener cleanup.
- Nexus supports speech interruption/barge-in and a local stop-speaking command.
- Nexus owner access can be protected with Android biometric/device credential verification.
- Optional `Hey Nexus` wake uses an Android microphone foreground service after the user explicitly enables it and verifies the owner.
- Mobile scrolling uses the browser/Android native scroll path instead of Lenis on touch/low-power devices.
- Mobile cinematic reveals use lightweight IntersectionObserver rather than permanent GSAP/DOM-observer churn.
- Mobile pages use fewer expensive backdrop filters.
- Optional background videos become poster-first on touch/low-power devices to reduce video decoding and frame drops.
- The random phone-number example was removed from the Nexus App Control suggestions.

## Important Android limitation

A normal app cannot guarantee unrestricted, always-on microphone listening after force-stop. Android restricts background microphone foreground-service starts on modern versions. The selected system `VoiceInteractionService` is the official mechanism designed for global assistant/hotword behavior. This build provides an explicit, user-enabled foreground wake path rather than pretending to bypass Android.

## User setup

1. `npm install`
2. `npm run build`
3. `npm run android:build`
4. Install the generated debug APK.
5. Open Settings → Nexus/Voice → grant microphone permission.
6. Verify the Nexus owner with Android biometrics/device credentials.
7. Enable Background wake word.
8. Test: `Hey Nexus, open Instagram` or `Hey Nexus, open my clock`.

## Security note

Speech-to-text is not speaker identity. Owner verification uses Android biometric/device credentials. No biometric template is stored in JavaScript.
