# APEX — Mobile Final Setup

## OnePlus Nord CE 2 Lite

The mobile pass removes route transitions, hover/tilt effects, decorative click FX, Lenis/desktop scroll effects, heavy mobile backdrop blur, mobile video playback and other non-essential compositor work. The visual hierarchy, artwork, gradients and core POS/Nexus features remain.

## Build and install

From the project folder, double-click `BUILD_ONEPLUS.bat` or run:

```cmd
BUILD_ONEPLUS.bat
```

The script installs dependencies when necessary, builds the web app, creates/syncs Android, auto-detects the standard Android SDK path, builds the debug APK and installs it through adb when a phone is connected.

## Nexus voice input

The foreground Android recognizer is serialized. Before a foreground Nexus session starts, the Hey Nexus background recognizer is paused so the two Android SpeechRecognizer instances cannot compete for the same recognition service. Native errors are handled with a single controlled retry instead of multiple JavaScript/Java retry loops.

## Hey Nexus

Enable **Settings → Nexus Voice → Background wake word** after granting microphone access. This arms the microphone foreground service. When the main Nexus screen owns the microphone, Hey Nexus is temporarily paused and automatically becomes eligible again after the foreground session ends.

Android places restrictions on microphone foreground services and background activity starts. A normal application cannot guarantee Google-Assistant-style hotword behavior after a force-stop or every possible OEM kill. A true system assistant uses Android's assistant/VoiceInteractionService path.

## OnePlus settings

Check:

- **Settings → Apps → APEX → Permissions → Microphone:** Allow.
- **Notifications:** Allow for Nexus wake-service status.
- **Battery/background:** choose **Unrestricted / Allow background activity / Don't optimize** when OxygenOS exposes those options.
- **Auto-launch / background start:** allow it when the device exposes that control.
- Do not use **Force stop** for APEX when you expect Hey Nexus to remain armed.

Menu names can vary by OxygenOS version.

## Voice personas

APEX keeps the personas **Friendly Woman, Girl, Woman, Friendly Man, Boy, Man, CEO, Commander, and Microsoft David**. The app chooses from voices actually exposed by the installed Android TTS engine. Microsoft David is not bundled into Android by APEX; it works on a device only when an installed TTS engine exposes a matching David voice. Otherwise the app falls back to the closest installed English voice while preserving the selected persona's rate/pitch behavior.
