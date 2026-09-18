# Potato Horde

Single-player Zombie.io-style survivors game (colored-box art). Phaser 4 + TypeScript + Vite.

## Install

```powershell
cd "e:\Project\Shooting game"
npm install
```

## Dev

```powershell
npm run dev
```

Open http://localhost:5173

Optional: `http://localhost:5173/?debug=1` for hitbox overlays.

## Controls

Short sheet: [docs/CONTROLS.md](docs/CONTROLS.md) · full playtest + console helpers: [docs/PLAYTEST.md](docs/PLAYTEST.md)

| Input | Action |
|-------|--------|
| WASD / Arrows | Move |
| P | Pause / unpause |
| Esc | Back to Menu (not during draft) |
| 1 / 2 / 3 | Spawn enemies · or pick draft cards |
| X | Grant XP |
| B | Force boss |
| R | Draft reroll · or outside draft: respawn |
| Touch | Virtual joystick (bottom-left) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/PLAYTEST.md](docs/PLAYTEST.md) | How to run, smokes, `__TEST__` / `__GAME__` |
| [docs/CONTROLS.md](docs/CONTROLS.md) | Controls cheat sheet |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folders, scenes, systems |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Phases 0–11 shipped summary |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Next task / session log |
| [docs/TASKS.md](docs/TASKS.md) | Full checkbox plan |
| [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) | Plan + test gates |
| [docs/REGRESSION_MATRIX.md](docs/REGRESSION_MATRIX.md) | Don’t break finished work |
| [docs/gdd.md](docs/gdd.md) | Game design document |
| [AGENTS.md](AGENTS.md) | Agent entrypoint |
