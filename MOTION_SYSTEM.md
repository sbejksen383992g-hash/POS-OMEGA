# APEX V4 Motion System

## Global layers

1. Framer Motion — route transitions, state changes and component springs.
2. GSAP + ScrollTrigger — cinematic timelines and scroll-linked parallax.
3. Lenis — weighted global scrolling on devices that support full motion.
4. PremiumFX — delegated pointer spotlight, tilt and click burst without React re-renders.
5. Procedural particles — quest / level-up VFX with DOM + GSAP.
6. Web Audio / bundled MP3 — interaction feedback with safe fallback tones.

## Scroll reveal

The global ScrollDirector watches `.app-main` and automatically upgrades cards and headings. Cards rise from a light blur/scale state; headings use a clipped masked reveal and then settle. Elements are observed once, so scrolling back up does not constantly replay the entrance.

## Cinematic events

Store notifications of type `levelup`, `boss`, or `achievement` trigger a centered cinematic overlay with rotating rings, artwork, copy reveal and particle burst.

## Mobile behavior

Fine-pointer tilt is disabled on touch devices. Heavy effects are reduced by CSS and `prefers-reduced-motion` disables non-essential choreography.
