# APEX V4 Cinematic Pass

This build preserves the existing POS/APEX application and adds a visual experience layer.

## Added

- Global Lenis + GSAP motion foundation remains mounted through MotionProvider.
- Automatic scroll-reveal director for cards and headings in `.app-main`.
- Masked/blurred text reveals on scroll.
- Staggered card entrances based on DOM order.
- Scroll-linked parallax for marked visual layers.
- Stronger route transitions: blur + scale + clip-path settle.
- Quest completion burst particles plus XP-flight feedback toward the visible resource bar.
- Global click burst receives an additional halo layer and more particles.
- Level-up / boss defeat / achievement cinematic overlays driven from existing notifications.
- Bundled audio playback is preferred when the user has supplied the local audio assets; procedural fallback remains for unavailable cues.
- Dashboard and quest cards now use the supplied artwork as atmospheric visual layers.
- Operations cards use operation-specific artwork.
- Operation badges remain driven by the existing quest `section` classification and existing fallback mapping.
- All quest surfaces checked in this pass include Operation context where the quest itself is rendered (Quests, Dashboard, Today timeline, Calendar).
- Added `src/config/assets.js` as the centralized asset registry.
- Added `ASSET_MANIFEST.md`.
- Added `MOTION_SYSTEM.md`.

## Compatibility

The existing Vite + React application is preserved. No framework migration was performed. No new mandatory dependency was added in this pass.

## Verification

- Local import-path scan: passed with 0 missing relative imports.
- Asset inventory: expected supplied assets are present, including both the original `operation-finanance.webp` and a compatibility alias `operation-finance.webp`.
- `npm run build` was not executed successfully in this environment because the uploaded archive does not include a populated `node_modules` tree and network-based `npm install` could not complete within the execution environment. Run `npm install` and `npm run build` on the development machine before shipping.
