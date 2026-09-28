# POS 2.0 Asset Pack

The project now includes a complete local visual asset pack under `public/assets/`.

## Included

- `pos-background.webp` — main Obsidian Neural background
- `pos-splash.webp` — mobile/PWA splash visual
- `nexus-avatar.webp` — Nexus primary avatar
- `rank/` — E, D, C, B, A, S rank badges
- `achievements/` — six milestone badges
- `bosses/` — four shadow-boss visuals
- `themes/` — four theme preview cards
- `nexus/` — idle, thinking and speaking Nexus states

The assets are deliberately local so the APK/PWA does not depend on third-party image hosts at runtime.

## Web research references

Visual direction was checked against free-to-use technology imagery on Pexels and Pixabay. The final bundled visuals were made as a consistent POS-specific asset system rather than mixing unrelated stock artwork.

- Pexels neon technology reference: https://www.pexels.com/photo/close-up-shot-of-neon-lights-8344064/
- Pexels futuristic blue arc reference: https://www.pexels.com/photo/illuminated-arc-reactor-on-black-background-9962891/
- Pixabay neon portal reference: https://pixabay.com/illustrations/ai-generated-neon-portal-glowing-9408424/
- Pixabay AI assistant reference: https://pixabay.com/illustrations/robot-assistant-voice-icon-wave-9685694/

## Runtime behavior

POS handles image sizing, cropping, borders, blur/glow treatment, responsive layout and reduced-motion behavior in the UI. Do not add external image URLs to the app unless there is a deliberate reason to make that screen network-dependent.
