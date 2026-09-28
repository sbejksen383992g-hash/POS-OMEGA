# POS 2.4 Voice Fix

## What changed

1. Android voices are normalized into a common structure.
2. `voiceURI`, `name`, and language are preserved.
3. Locale-only entries ending in `-language` are hidden.
4. Android voice IDs are converted to readable labels.
5. Male/female Android voice IDs are recognized when the engine exposes them.
6. Persona selection ranks matching language and gender metadata.
7. The selected raw voice ID is stored rather than a fragile display label.
8. Native speech resolves that ID back to the exact voice index returned by `getSupportedVoices()`.
9. Browser voice selection remains supported separately.
10. Existing leave, notification, speech-recognition, AI, quest, analytics and persistence code is preserved from POS 2.2.

## Verification performed in this environment

- All 37 JS/JSX source files passed TypeScript JSX syntax transpilation checks.
- The source ZIP is intentionally distributed without `node_modules`, `dist`, or a machine-specific Android folder.
- A full `npm install` / Vite production build could not be completed in this build environment because dependency installation timed out. Therefore this ZIP should be treated as source-ready, not as a claim that the new source was production-built here.
