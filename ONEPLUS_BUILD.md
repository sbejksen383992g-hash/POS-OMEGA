# POS 2.4 — OnePlus Android Build

## Included

This build is based on POS 2.2 and carries forward the latest Nexus voice-input fixes from 2.3, plus a new Android TTS voice layer.

### POS system
- Dashboard / identity / rank / XP / daily execution loop
- Quests with deterministic smart classification and XP
- Habits / Today / Calendar / Journal / Analytics
- Attributes / Skill Tree / Achievements
- Boss Battles and Operations / Projects
- Approved Leave mode and leave-aware penalties/alarms
- Native Android notifications and scheduled alarms
- Nexus AI command center
- Provider abstraction for configured AI providers
- Native Android speech input -> transcript -> Nexus AI -> response
- Browser speech fallback
- Nexus voice personas, rate, pitch, volume
- Local persistence and backup/restore
- Responsive desktop/mobile UI
- PWA support

### Android voice fix
The Device Voice selector no longer treats Android locale-only entries as user-selectable voices.

Android TTS can expose names such as:

- `en-US-language` — locale metadata, not a distinct voice
- `en-us-x-sfg#male_1-local` — selectable Google TTS voice variant
- `en-gb-x-rjs#female_1-local` — selectable Google TTS voice variant

POS 2.4 converts the latter into readable labels such as:

`English (US) · SFG · Male 1 · Local`

The internal raw voice ID is retained so the app can pass the correct numeric index back to the Capacitor TTS plugin.

## Build on Windows / OnePlus

Open Command Prompt in the project folder.

```cmd
npm install
npm run build
npx cap add android
npx cap sync android
```

If Android already exists, skip `npx cap add android`.

Set `android/local.properties` if Gradle cannot find the SDK:

```properties
sdk.dir=C:\\Users\\YOUR_NAME\\AppData\\Local\\Android\\Sdk
```

Then:

```cmd
cd android
gradlew.bat clean
gradlew.bat assembleDebug
```

APK:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Install through ADB:

```cmd
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

## Important voice limitation
The app can only select voices that the Android TTS engine exposes. Windows voices such as Microsoft David are not automatically available on Android. If the OnePlus uses Google TTS, its available voice variants come from that engine and its installed language data.

For male/female selection, Android voice IDs that explicitly contain `#male` or `#female` are preferred. When an engine does not expose gender metadata, POS uses persona pitch/rate as the fallback.
