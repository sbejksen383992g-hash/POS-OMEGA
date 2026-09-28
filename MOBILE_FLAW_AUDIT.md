# POS 2.1 — Mobile Flaw Audit

This release is based on the existing POS source of truth and focuses on the mobile issues visible in the supplied screenshots plus adjacent layout/logic risks found during the source audit.

## Screenshot-confirmed issues fixed
1. **Bottom navigation hiding content** — increased the mobile content reserve and kept the fixed navigation inside the safe-area model. Danger Zone and final controls remain reachable.
2. **Attributes detailed table typography** — mobile now uses stacked attribute cards; desktop keeps the full table. Long words/labels wrap safely.
3. **Radar not changing after XP** — radar power now combines attribute level and current in-level XP, so completion visibly changes the polygon before a level-up.
4. **Radar labels clipped on small screens** — compact STR/INT/WIS/CHA/VIT/DIS labels plus a full-name legend are used on mobile.
5. **Analytics bar chart names missing** — stable short axis labels and a guaranteed full-name legend are rendered below the chart.
6. **Calendar could not add to a particular day** — 14-day selectable planner creates scheduled quests with date, optional time, and optional reminder.
7. **Nexus voice unavailable** — Android uses native Text-to-Speech through a Capacitor-native service, with browser speech synthesis fallback. Settings includes a direct voice test.

## Additional issues found and hardened
- Android System Health previously checked browser-only Notification/Speech APIs; it now checks native service health when installed as an Android app.
- Notification preference now cancels native alarms when notifications are disabled and resynchronizes them when re-enabled.
- Calendar and Settings can explicitly request Android notification permission.
- Today no longer invents fake evening times for unscheduled quests; it shows a real scheduled time when supplied or a neutral dash.
- Today filters scheduled quests by the selected local day instead of showing every non-daily quest created on the same day.
- Analytics date buckets use local calendar dates instead of UTC conversion, avoiding off-by-one-day behavior in Indian time zones near midnight.
- Boss statistic cards no longer force three columns on very narrow screens.
- Settings AI usage cards stack on narrow screens; provider key rows stack cleanly instead of squeezing labels, inputs, and buttons into one line.
- Mobile quest creation stacks controls to avoid 2-column squeeze and can assign a specific date/time directly.
- Fixed notification bubble is lifted above the mobile navigation reserve.
- Voice input failure messaging is explicit for Android WebView; phone keyboard dictation remains a practical fallback because a Capacitor-8-compatible speech-recognition plugin was not added.

## Native runtime requirements
- `@capacitor-community/text-to-speech` 8.x
- `@capacitor/local-notifications` 8.x
- Capacitor 8 core/android/CLI dependencies
- Android 13+ notification permission must be granted for device notifications.

## QA pass to run on the user's Android build
- Launch/relaunch POS.
- Complete a Strength quest and confirm Strength XP, the radar polygon, attribute card, analytics bar, dashboard XP, and notification all update.
- Open Calendar, pick a future day, create a timed task, then verify it appears on Today on that date.
- Enable Nexus Voice and press **Test Nexus Voice**.
- Enable device notifications and schedule a future reminder; close POS and verify the notification arrives.
- Scroll to the bottom of Settings and confirm Danger Zone buttons remain fully visible above the navigation bar.
- Test 360px-ish and 430px-ish widths; rotate/restore orientation if supported.
- Export and import a backup and confirm API keys are not included in the exported JSON.

- Native Nexus microphone input added for Capacitor Android using a Capacitor-8-compatible speech recognition plugin; browser fallback remains.
- Native TTS voice selection corrected from browser-style voice name to the native plugin's numeric voice index, with language fallback.
- Mobile main-content bottom padding now uses !important so Tailwind p-* utilities cannot override the reserved space for the fixed bottom nav.
- Calendar now supports any date, not just the initial 14-day strip.
