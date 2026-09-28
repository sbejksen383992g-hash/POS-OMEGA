# POS 2.1 — Mobile Upgrade & APK Build

This package is the updated **web/POS source**. It intentionally does not include the generated `android/` directory. Keep your existing Capacitor Android project.

## What was fixed
- Mobile bottom navigation reserve increased so page content and Danger Zone controls remain reachable.
- Mobile typography/spacing tightened; long labels wrap without overlap.
- Attribute radar now responds to XP progress inside a level instead of moving only when a level changes.
- Mobile attribute breakdown is a stacked card layout rather than a squeezed table.
- Analytics attribute bar chart uses stable short axis labels (STR/INT/WIS/CHA/VIT/DIS) with full names in tooltips/legend.
- Calendar supports selecting a specific day and adding a task with optional time and optional native reminder.
- Quests can also be assigned directly to a specific date/time.
- Today only shows scheduled tasks for the selected calendar day and no longer invents fake execution times.
- Nexus Voice uses native Android text-to-speech first, with browser speech fallback, and the Nexus microphone uses native Android speech recognition on Capacitor 8.
- Settings includes a native voice test and Android notification-permission control.
- Local reminders use Capacitor Local Notifications on Android.
- Backup/export schema moved to v4-compatible source; package-lock is intentionally regenerated on install so the Android project stays compatible with your existing local setup.

## Update your current project
1. Keep your existing `android/` folder.
2. Replace the web-source files in your current POS project with this package contents, but **do not delete the existing `android/` folder**. Do not copy `node_modules` or `dist` from an old build.
3. Open the project terminal and run (this creates/refreshes the lockfile for the native dependencies):

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

4. In Android Studio, **do not run Upgrade Assistant**. Select your OnePlus device and press **Run**.
5. After testing, create a portable APK with **Build → Generate App Bundles or APKs → Generate APKs**. Do not use Android Studio Upgrade Assistant during this process. If Android Studio asks to sync, choose the normal Gradle sync—not an upgrade.
6. The debug APK is normally at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

If Android Studio reports a new Gradle/AGP problem, stop there and use the exact error text rather than upgrading more components.

## Important
The source archive intentionally excludes the generated `android/` project. Use your existing Android project, because it already has the correct `com.soham.pos` application ID and device setup from the previous build.

## Native notification permission
On Android 13+, the app may need notification permission. In POS → Settings → Preferences, enable Notifications and use **Enable device notifications**.

## Voice
In POS → Settings → Preferences → Nexus Voice, enable voice and press **Test Nexus Voice**. The Android device's installed text-to-speech engine handles playback.
