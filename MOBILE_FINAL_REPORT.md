# APEX MOBILE FINAL — repair report

## IMPORTANT: what was and was NOT verified
The sandbox used for this repair has no network access, so `npm install`, `vite build`, `cap sync`
and Gradle could NOT be run. Verified here: JS/JSX syntax (TypeScript parser, 62 files), CSS brace
balance, Java bracket balance, `node --check` on scripts. NOT verified: Java compilation, the APK
build, on-device behaviour (touch, scroll, mic, TTS, wake). Test on the phone and send back any log.

## Root causes found
- Scroll: Nexus chat = fixed-height card with its own overflow-y scroller filling most of the screen;
  swipes there scrolled the chat, not the page. Also `overflow-x:hidden` on body (second scroller)
  and Lenis active on some touch devices.
- Clicks: a V9 rule forced `position:relative; z-index:2` on every button/link in `.app-main`
  (broke absolute/sticky controls); notification bell (z-120, fixed) sat on Nexus Send button;
  mic + textarea were `disabled` until owner verification, so taps did nothing.
- Mic: voice logic spread over React refs + JS retry timers + Java; no single owner; wake service
  only checked a SharedPreferences flag every 1.2s (recognizer could still hold the mic), never
  resumed after launching the app; recognizers released 100ms late after error/result.
- TTS: Android voice indices were re-read every utterance; persona → voice used loose scoring
  and stored a raw voice name that broke when engine voices changed; UI could imply a voice that
  does not exist.
- Blank screen: any render throw outside the page boundary (Layout/announcer/alarms/AppLock)
  unmounted the whole tree; service worker cache in the APK could serve a stale shell.
- Build: plugin build.gradle used wrong property check, old compileSdk/Java level; bootstrap script
  did not detect a half-generated `android/` folder.

## Files changed
src/utils/voiceController.js (NEW), src/utils/nativeServices.js, src/pages/AICommand.jsx,
src/pages/Settings.jsx, src/App.jsx, src/main.jsx, src/components/Layout.jsx,
src/components/ErrorBoundary.jsx, src/motion/MotionProvider.jsx, src/index.css, index.html,
scripts/ensure-android.mjs, package.json,
plugins/nexus-native/android/build.gradle,
plugins/nexus-native/android/src/main/java/com/apex/nexusnative/NexusNativePlugin.java,
plugins/nexus-native/android/src/main/java/com/apex/nexusnative/NexusWakeService.java,
plugins/nexus-native/dist/esm/index.d.ts

## Build (Windows)
    npm install
    npm run build
    npx cap sync android        (or: node scripts/ensure-android.mjs — validates/repairs android/)
    cd android
    gradlew.bat assembleDebug
APK: android\app\build\outputs\apk\debug\app-debug.apk
Install: %LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe install -r android\app\build\outputs\apk\debug\app-debug.apk
Requires JDK 21 and Android SDK Platform 36. No `android/` folder ships in the zip; it is generated.

## Android permissions / settings
RECORD_AUDIO, FOREGROUND_SERVICE(_MICROPHONE), POST_NOTIFICATIONS (declared in plugin manifest).
OnePlus: Microphone = Allow; Notifications = Allow; Battery = Unrestricted; allow auto-launch.

## Limits that cannot be bypassed
- Hey Nexus while closed uses a microphone foreground service + SpeechRecognizer. Force-stop,
  OEM battery kills, or revoked mic permission stop it. Android 14+ blocks starting an activity
  from the background without the overlay/full-screen-intent permission; the service falls back to
  a notification. True hotword behaviour needs the system assistant role (VoiceInteractionService).
- SpeechRecognizer needs the Google speech service; some devices beep or use network.
- "Microsoft David" is not an Android voice; it is used only if an installed engine exposes it.
