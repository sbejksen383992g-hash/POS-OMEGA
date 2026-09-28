# Nexus V9 - hands-free automation

## What you can say
- "Nexus" (or "Hey Nexus") anywhere -> wakes the phone/app and listens. "Nexus open Instagram" runs in one breath.
- "open <any installed app>", "what's the weather" / "weather in Mumbai" (Open-Meteo, no key, uses device location)
- "send WhatsApp message to Rohan saying I'll be late" -> if 2+ Rohans: "Sir, which Rohan? 1) Rohan Uppin 2) Rohan 2".
  Answer "Uppin", "second one", "Rohan 2" -> it sends. If no text was said, it asks "What should I say?".
- "delete the WhatsApp message that was sent" / "delete my last message to Rohan" -> asks yes/cancel, then deletes for everyone.

## One-time setup (Settings -> Nexus automation)
1. Background wake word ON (asks mic permission)
2. WhatsApp automation -> Accessibility -> "Nexus WhatsApp automation" ON
3. Contacts -> Allow
4. Display over other apps -> Allow (needed to open the app from background / screen off)
5. Also: battery -> unrestricted for the app, and notifications allowed.

## Security model (be aware)
- Android speech recognition cannot tell WHO is speaking. True voice-print lock is NOT implemented.
- Protection instead: risky actions (send message, delete message, SMS, calls) require fingerprint/screen-lock
  (10 min session). Toggle: Settings -> Nexus automation -> Lock risky actions (default ON).
- App shows over the lock screen only for ~30s after a wake, and risky actions still need unlock.
- Full lock of everything (mic/typing) stays available via nexusOwnerVerification (default OFF).

## Limits
- WhatsApp automation reads on-screen labels (English UI). WhatsApp updates can break delete; send is more robust.
- Delete-for-everyone only works within WhatsApp's time limit; otherwise nothing is deleted and Nexus says so.
- Not compiled/tested here (no Android SDK / device). Expect to fix small compile or label issues on first build.
