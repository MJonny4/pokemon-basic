# PokeBasic

A Pokémon reference tool. Look up any Pokémon's stats, type matchups, moves, and competitive tips — build and export your team in the Team Lab.

**Stack:** Vite · TypeScript · Alpine.js · Tailwind CSS v4 · GSAP · PokéAPI

---

## Pages

| Page | URL | Description |
|---|---|---|
| Pokédex | `index.html` | 18×18 type chart + full Pokédex modal |
| Stats Explorer | `stats.html` | BST ranking table across all 1,025 Pokémon |
| Team Lab | `team.html` | 6-slot team builder with Set Editor and Showdown export |

---

## Features

### Pokédex (`index.html`)
- **Type Effectiveness Chart** — Full 18×18 grid. Highlights the searched Pokémon's types automatically.
- **Pokédex Search** — Autocomplete across 1,025 Pokémon with gen filter, recent search history chips, and a clear button.
- **Overview Tab** — Base stats with animated bars, Pokédex entry, ability descriptions, and evolution chain.
- **Defense Tab** — Auto-calculated weaknesses, resistances, and immunities based on typing.
- **Moves Tab** — Learnset sorted by method (level-up, TM, egg, tutor), filterable by category, with STAB indicators and type coverage.
- **Trainer Tips Tab** — Role detection (9 roles), scored nature recommendations, held item suggestions, and a live Lv 50 stat calculator.
- **Compare Tab** — Side-by-side stat comparison against all same-type Pokémon. Sortable by any stat. Click any entry to load it.
- **"Add to Team Lab" button** — Sends the current Pokémon directly to the first empty Team Lab slot.

### Stats Explorer (`stats.html`)
- All 1,025 Pokémon ranked by BST (default) or any individual stat.
- Type filter (fetch by type from PokéAPI) and generation filter.
- Lazy sprite loading, paginated 30/page.
- Click any entry to open a quick-view modal with full stat breakdown.

### Team Lab (`team.html`)
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

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite picks).

```bash
npm run build   # production build → dist/
```

---

## Project Structure

```
src/
├── data/
│   ├── constants.ts        # TYPES, TYPE_COLORS, 18×18 EFFECTIVENESS matrix, STAT_COLORS, GEN_RANGES
│   ├── natures.ts          # All 25 natures with stat pairs
│   └── items.ts            # 12 held items with roles, colors, sprites, and descriptions
│
├── api/
│   ├── pokeapi.ts          # TypeScript interfaces + fetch functions (L1 Map + L2 IndexedDB cache)
│   └── idb-cache.ts        # IndexedDB TTL cache (idbGet, idbSet)
│
├── logic/
│   ├── defense.ts          # calcDefenseProfile(types) → weakness/resistance breakdown
│   ├── roleDetect.ts       # detectRole(stats) → 9 role types
│   ├── natures.ts          # recommendNatures(role, stats) → scored nature list
│   ├── items.ts            # recommendItems(role, types, canEvolve) → item list
│   ├── statCalc.ts         # calcStat() — Gen 9 stat formula (HP + other stats)
│   └── teamCoverage.ts     # analyzeTeam(slots) → TeamCoverage (synergy, coverage, speed tiers)
│
├── ui/
│   ├── components.ts       # Pure HTML string builders: typeBadge, typePillLg, statBar, getTypeIcon
│   └── typeChart.ts        # buildTypeChart(), highlightChart(types), clearHighlight()
│
├── store/
│   ├── pokemon.ts          # Alpine.store('pokemon') — shared reactive state for Pokédex
│   └── team.ts             # Alpine.store('team') — TeamSlot interface, slots, coverage, persistence
│
├── components/
│   ├── pokedex/
│   │   ├── SearchBar.ts    # Alpine component: autocomplete + gen filter + history chips
│   │   └── Modal.ts        # Alpine component: tab state + move filter state + GSAP animations
│   ├── stats/
│   │   └── StatsPokemonModal.ts  # Quick-view modal for Stats Explorer
│   ├── team/
│   │   ├── TeamLab.ts      # Alpine component: slot management, drag-and-drop, toast, Copy Team
│   │   └── SetEditor.ts    # Alpine component: nature/item/EV/IV/move editing, Showdown export
│   └── tabs/
│       ├── OverviewTab.ts  # buildOverview() → #overviewGrid, appendEvoChain()
│       ├── DefenseTab.ts   # buildDefense() → #defenseContent
│       ├── MovesTab.ts     # renderMoves() → #movesGrid + #coverageTypes
│       ├── TrainerTab.ts   # buildTrainer() → #trainerContent (role, natures, items, stat calc)
│       └── CompareTab.ts   # buildCompare() → #compareContent (type peer ranking)
│
├── main.ts                 # Pokédex entry: wires Alpine store, components, event handlers
├── stats.ts                # Stats Explorer entry
├── team.ts                 # Team Lab entry
└── style.css               # @import tailwindcss + custom CSS

index.html                  # Pokédex shell
stats.html                  # Stats Explorer shell
team.html                   # Team Lab shell
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
  └── main.ts
        ├── api/pokeapi.ts   (typed, cached fetch functions)
        ├── logic/*          (pure functions — no DOM, no Alpine)
        ├── ui/*             (pure HTML string builders)
        └── tabs/*           (render into named DOM elements)

Alpine.store('pokemon')      (shared reactive state read by index.html templates)
Alpine components            (searchBar, modal — UI-only state)
```

### Key rules

- `fetch()` only lives in `src/api/pokeapi.ts`
- Logic files accept plain data — no DOM access, no Alpine imports
- `main.ts` is the single place that wires data → logic → render for the Pokédex
- HTML building goes through `src/ui/components.ts` helpers

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

## Dependencies

| Package | Purpose |
|---|---|
| `vite` | Build tool and dev server |
| `typescript` | Type checking |
| `alpinejs` | Reactive UI (store + components) |
| `@types/alpinejs` | Alpine type definitions |
| `tailwindcss` | Utility CSS |
| `@tailwindcss/vite` | Tailwind v4 Vite plugin |
| `gsap` | Animations (modal, sprites, slot fill) |

Data is fetched live from [pokeapi.co](https://pokeapi.co) with IndexedDB caching — no local database required.
