# NEXUS V5 — Agent + Device Bridge

## What this build can do

### Inside APEX
- Read live APEX player, quest, habit, alarm and attribute state.
- Create, complete, delete and update supported app objects through validated actions.
- Navigate the app.
- Plan the day and identify a next-best action.
- Keep a small set of explicit user-requested local memories.
- Verify important state-changing actions after execution.

### Device controls
These are deliberately visible and bounded:
- Open supported apps such as WhatsApp, Telegram, YouTube, Gmail, Chrome, Maps and Messages.
- Open Google Maps for a query.
- Prepare an SMS with recipient and message text.
- Prepare a WhatsApp message.
- Open the phone dialer for a number.
- Open device Settings on Android as a best-effort deep link.
- Open the system share sheet where supported.

## Deliberate limits
- Nexus does not silently send SMS or WhatsApp messages.
- Nexus does not place calls.
- Nexus does not execute arbitrary shell commands or hidden automation.
- Nexus does not silently read contacts or private application data.
- Background hotword activation is not implemented.
- Arbitrary control of third-party apps is not available from a normal web app.

## Android path to a deeper assistant
Android exposes a `VoiceInteractionService` mechanism and an Assistant role. A true global assistant implementation would need a native service selected by the user as the device assistant, plus a proper voice-interaction session. Android also provides `AccessibilityService` global actions, but the platform documentation states that accessibility services are intended to assist users with disabilities; this build therefore does not use accessibility as a general-purpose automation bypass.

## Test commands
- "Open WhatsApp"
- "Open Maps for Bangalore Airport"
- "Open Instagram"
- "Open Clock"
- "What should I do next?"
- "Give me a daily brief"
- "Remember that I prefer 90 minute deep work blocks"
- "What do you remember about me?"
- "Forget that I prefer 90 minute deep work blocks"
