# PokeBasic

A Pokémon reference tool. Look up any Pokémon's stats, type matchups, moves, and competitive tips — build and export your team in the Team Lab.

**Stack:** Astro · TypeScript · Alpine.js (`@astrojs/alpinejs`) · Tailwind CSS v4 · GSAP · PokéAPI

**Package manager:** bun

---

## Pages

| Page | Route | Description |
|---|---|---|
| Pokédex | `/` | 18×18 type chart + full Pokédex modal |
| Stats Explorer | `/stats` | BST ranking table across all 1,025 Pokémon |
| Team Lab | `/team` | 6-slot team builder with Set Editor and Showdown export |

---

## Features

### Pokédex (`/`)
- **Type Effectiveness Chart** — Full 18×18 grid. Highlights the searched Pokémon's types automatically.
- **Pokédex Search** — Autocomplete across 1,025 Pokémon with gen filter, recent search history chips, and a clear button.
- **Overview Tab** — Base stats with animated bars, Pokédex entry, ability descriptions, and evolution chain.
- **Defense Tab** — Auto-calculated weaknesses, resistances, and immunities based on typing.
- **Moves Tab** — Learnset sorted by method (level-up, TM, egg, tutor), filterable by category, with STAB indicators and type coverage.
- **Trainer Tips Tab** — Role detection (9 roles), scored nature recommendations, held item suggestions, and a live Lv 50 stat calculator.
- **Compare Tab** — Side-by-side stat comparison against all same-type Pokémon. Sortable by any stat. Click any entry to load it.
- **"Add to Team Lab" button** — Sends the current Pokémon directly to the first empty Team Lab slot.

### Stats Explorer (`/stats`)
- All 1,025 Pokémon ranked by BST (default) or any individual stat.
- Type filter (fetch by type from PokéAPI) and generation filter.
- Lazy sprite loading, paginated 30/page.
- Click any entry to open a quick-view modal with full stat breakdown.

### Team Lab (`/team`)
- **6-slot builder** — Click an empty slot to search and add a Pokémon (GSAP pop-in). Drag slots to reorder.
- **Set Editor** — Click any filled slot to open the editor:
  - Nature picker — top-5 recommended pills + expandable all-25 grid.
  - Held item picker — all 12 items shown; ⭐ marks role-recommended ones.
  - EV sliders — per-stat accent color, 508-total enforced, live stat formula display.
  - IV sliders — collapsible, 0–31 per stat, reset to 31.
  - Move selector — 4 slots, searchable from real learnset, type badge + category + power. STAB badge on matching moves.
  - Showdown export — "📋 Showdown" copies the single-slot Pokepaste.
- **Copy Team** — "📋 Copy Team" button exports all filled slots as a complete Showdown paste.
- **Team analysis** — Synergy score, offensive coverage %, common weaknesses, speed tiers.
- **⚔️ Battle Mode** — Full turn-based battle simulator against a random CPU team:
  - Gen 9 damage formula with STAB, type effectiveness, critical hits, burn, stat stages, weather, and held item modifiers.
  - CPU AI: switches on bad matchups, uses setup moves when tanky opponent, inflicts status when outclassed, else picks highest-damage move.
  - Showdown-style turn log with colour-coded lines (critical hit, super effective, status, stat changes).
  - GSAP animations: attack lunge, damage flash, HP bar drain, faint drop.
  - Switch panel: voluntary (CPU moves) and forced (free, after faint).
  - Battle gated: all 6 slots must be filled, each with a nature, item, and all 4 moves set. Missing slots or incomplete sets are reported by name/slot number.

---

## Getting Started

```bash
bun install
bun run dev
```

Open `http://localhost:4321`.

```bash
bun run build    # production build → dist/
bun run preview  # preview production build
```

---

## Project Structure

```
src/
├── lib/
│   ├── data/
│   │   ├── constants.ts        # TYPES, TYPE_COLORS, 18×18 EFFECTIVENESS matrix, STAT_COLORS, GEN_RANGES
│   │   ├── natures.ts          # All 25 natures with stat pairs
│   │   ├── items.ts            # 12 held items with roles, colors, sprites, and descriptions
│   │   ├── type-colors.ts      # Modern type color palette (used by SetEditor)
│   │   ├── cpu-pool.ts         # CPU_POOL names + CPU_EVS spreads per role
│   │   ├── items-full.json     # Extended item data for Set Editor picker
│   │   └── moves-data.json     # Static move metadata
│   │
│   ├── api/
│   │   ├── pokeapi.ts          # TypeScript interfaces + fetch functions (L1 Map + L2 IndexedDB cache)
│   │   └── idb-cache.ts        # IndexedDB TTL cache (idbGet, idbSet)
│   │
│   └── logic/
│       ├── defense.ts          # calcDefenseProfile(types) → weakness/resistance breakdown
│       ├── role-detect.ts      # detectRole(stats) → 9 role types
│       ├── natures.ts          # recommendNatures(role, stats) → scored nature list
│       ├── items.ts            # recommendItems(role, types, canEvolve) → item list
│       ├── stat-calc.ts        # calcStat() — Gen 9 stat formula (HP + other stats)
│       ├── team-coverage.ts    # analyzeTeam(slots) → TeamCoverage (synergy, coverage, speed tiers)
│       ├── move-effects.ts     # MOVE_EFFECTS record (93 moves) + getMovePriority()
│       ├── damage-calc.ts      # Gen 9 exact 10-step damage pipeline
│       ├── battle-ai.ts        # Multi-tier CPU decision tree
│       └── battle-engine.ts    # Immutable BattleState machine (~570 lines)
│
├── ui/
│   ├── badges.ts               # typeBadge, typePillLg, getTypeIcon, darken
│   ├── stat-bar.ts             # statBar HTML builder
│   └── type-chart.ts           # buildTypeChart()
│
├── tabs/
│   ├── overview.ts             # buildOverview(), appendEvoChain(), flatEvo()
│   ├── defense.ts              # buildDefense()
│   ├── moves.ts                # renderMoves()
│   ├── trainer.ts              # buildTrainer()
│   └── compare.ts              # buildCompare()
│
├── alpine/
│   ├── stores/
│   │   ├── pokemon.ts          # Alpine.store('pokemon') — shared reactive state for Pokédex
│   │   └── team.ts             # Alpine.store('team') — TeamSlot interface, slots, coverage, persistence
│   └── components/
│       ├── pokedex/
│       │   ├── search-bar.ts   # Alpine component: autocomplete + gen filter + history chips
│       │   └── modal.ts        # Alpine component: tab state + move filter state + GSAP animations
│       ├── stats/
│       │   ├── stats-ranking.ts        # Alpine component: type/gen filter, sort, pagination
│       │   └── stats-pokemon-modal.ts  # Quick-view modal for Stats Explorer
│       └── team/
│           ├── team-lab.ts     # Alpine component: slot management, drag-and-drop, toast, Copy Team
│           ├── set-editor.ts   # Alpine component: nature/item/EV/IV/move editing, Showdown export
│           └── battle-sim.ts   # Alpine component: full turn-based battle simulator
│
├── entrypoint.ts               # Registers all Alpine stores + components (loaded by @astrojs/alpinejs)
├── layouts/
│   └── Layout.astro            # Base HTML shell (Inter font, meta, CSS import)
├── pages/
│   ├── index.astro             # Pokédex: type chart + modal + event wiring
│   ├── stats.astro             # Stats Explorer: ranking table + quick-view modal
│   └── team.astro              # Team Lab: slots + Set Editor + Battle Simulator
└── styles/
    └── global.css              # @import tailwindcss + custom CSS (type chart, stat bars, tooltips…)
```

---

## Architecture

### Cache (L1 + L2)

```
fetch() call
  └── L1: in-memory Map (same session, instant)
        └── L2: IndexedDB via idb-cache.ts (TTL 7 days for Pokémon data, 3 days for type lists)
              └── PokéAPI network request (fallback)
```

### Pokédex data flow

```
'pokemon-search' event
  └── <script> in index.astro
        ├── lib/api/pokeapi.ts   (typed, cached fetch functions)
        ├── lib/logic/*          (pure functions — no DOM, no Alpine)
        ├── ui/*                 (pure HTML string builders)
        └── tabs/*               (render into named DOM elements)

Alpine.store('pokemon')          (shared reactive state read by index.astro templates)
Alpine components                (searchBar, modal — UI-only state)
```

### Key rules

- `fetch()` only lives in `src/lib/api/pokeapi.ts`
- Logic files accept plain data — no DOM access, no Alpine imports
- `src/entrypoint.ts` is the single place that registers all Alpine stores and components
- HTML building goes through `src/ui/` helpers

### Role detection thresholds

| Role | Condition |
|---|---|
| Physical Sweeper | Speed ≥ 95, Atk ≥ 95, Atk > SpA |
| Special Sweeper | Speed ≥ 95, SpA ≥ 100, SpA ≥ Atk |
| Physical Attacker | Atk ≥ 100, Atk > SpA, Speed < 95 |
| Special Attacker | SpA ≥ 100, SpA > Atk, Speed < 95 |
| Physical Wall | Bulk avg ≥ 100, Def ≥ SpDef |
| Special Wall | Bulk avg ≥ 100, SpDef > Def |
| Tank | Bulk avg ≥ 85, Atk+SpA avg ≥ 85 |
| Fast Attacker | Speed ≥ 95 (fallback) |
| All-rounder | Everything else |

---

## Deployment

Deployed to GitHub Pages via `withastro/action`. The workflow lives at `.github/workflows/deploy.yml` and triggers on every push to `main`.

---

## Dependencies

| Package | Purpose |
|---|---|
| `astro` | MPA framework + build tool |
| `@astrojs/alpinejs` | Alpine.js integration (handles start + entrypoint) |
| `typescript` | Type checking |
| `alpinejs` | Reactive UI (store + components) |
| `tailwindcss` | Utility CSS |
| `@tailwindcss/vite` | Tailwind v4 Vite plugin |
| `gsap` | Animations (modal, sprites, slot fill) |

Data is fetched live from [pokeapi.co](https://pokeapi.co) with IndexedDB caching — no local database required.