# Ship Notes

**Build:** Potato Horde Phases 0–22 (juice → harden → retention → QA smoke)  
**Date:** 2026-09-19  

## Playable checklist

- [x] Boot → Intro (first) → Menu → Hub / Chapters / Endless
- [x] In-run: WASD, auto fire, draft 1/2/3, P pause menu, Esc
- [x] Settings persist (mute, shake, damage numbers, performance, UI scale, colorblind, debug HUD)
- [x] Tutorial skippable; no draft soft-lock
- [x] Meta: upgrades, gear, heroes, daily board, achievements, pity
- [x] Vitest unit suite green
- [x] Production `npm run build` smoke expected after this session

## How to verify quickly

```powershell
npm run test
npm run build
npm run preview
```

Browser: `http://localhost:5173` → Endless → P for pause menu → Hub SETTINGS toggles → refresh (S09).

## Known issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md). No open P0.
