# PokeBasic

A Pokémon type chart and Pokédex reference tool. Search any Pokémon to get its stats, type matchups, moves, and competitive team-building recommendations.

**Stack:** Vite · TypeScript · Alpine.js · Tailwind CSS v4 · PokeAPI

---

## Features

- **Type Effectiveness Chart** — Full 18×18 grid with color-coded cells. Highlights the searched Pokémon's rows/columns.
- **Pokédex Search** — Autocomplete across 807 Pokémon with recent search history.
- **Overview Tab** — Base stats with animated bars, Pokédex entry, ability descriptions, and evolution chain.
- **Defense Tab** — Auto-calculated weaknesses, resistances, and immunities based on the Pokémon's typing.
- **Moves Tab** — Top 50 moves sorted by learning method, filterable by category, with STAB/effective power and type coverage analysis.
- **Trainer Tips Tab** — Role detection, recommended natures (scored by role fit), and recommended held items.

---

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite picks if 5173 is in use).

```bash
npm run build   # production build → dist/
```

---

## Project Structure

```
src/
├── data/
│   ├── constants.ts      # TYPES, TYPE_COLORS, EFFECTIVENESS matrix, STAT_COLORS, STAT_LABELS
│   ├── natures.ts        # All 25 natures with boost/reduce pairs and flavor text
│   └── items.ts          # Held items with roles, colors, and descriptions
│
├── api/
│   └── pokeapi.ts        # TypeScript interfaces + pure fetch functions (no DOM, no Alpine)
│
├── logic/
│   ├── defense.ts        # calcDefenseProfile(types) → weakness/resistance breakdown
│   ├── roleDetect.ts     # detectRole(stats) → role key, label, description
│   ├── natures.ts        # recommendNatures(role, statMap) → scored nature list
│   ├── items.ts          # recommendItems(role, types, canEvolve) → filtered item list
│   └── coverage.ts       # calcCoverage(moves) → type coverage count and percentage
│
├── ui/
│   ├── components.ts     # Pure HTML string builders: typeBadge, typePillLg, statBar, darken
│   └── typeChart.ts      # buildTypeChart(), highlightChart(types), clearHighlight()
│
├── store/
│   └── pokemon.ts        # Alpine.store('pokemon', {...}) — single source of truth
│
├── components/
│   ├── SearchBar.ts      # Alpine component: autocomplete input + history chips
│   ├── Modal.ts          # Alpine component: tab state + move filter state
│   └── tabs/
│       ├── OverviewTab.ts  # buildOverview() → #overviewGrid, appendEvoChain()
│       ├── DefenseTab.ts   # buildDefense() → #defenseContent
│       ├── MovesTab.ts     # renderMoves() → #movesGrid + #coverageTypes
│       └── TrainerTab.ts   # buildTrainer() → #trainerContent
│
├── main.ts               # Entry point: wires Alpine store, components, and event handlers
└── style.css             # @import tailwindcss + all custom CSS (type colors, cards, bars)

index.html                # Alpine-driven HTML shell — no inline JS logic
```

---

## Architecture

### Data flow

```
PokeAPI
  └── api/pokeapi.ts          (typed fetch functions)
        └── main.ts           (orchestrates all fetches on 'pokemon-search' event)
              ├── logic/*     (pure functions — no DOM, no Alpine)
              ├── ui/*        (pure HTML string builders)
              └── tabs/*      (render functions that write into DOM elements)

Alpine store ('pokemon')      (shared reactive state read by index.html templates)
Alpine components             (searchBar, modal — UI-only state)
```

### Key rules

- `fetch()` only lives in `src/api/pokeapi.ts`
- Logic files only accept plain data — no DOM access, no Alpine imports
- `main.ts` is the single place that wires data → logic → render
- All HTML building goes through `src/ui/components.ts` helpers

### Role detection thresholds

Roles are assigned from `detectRole()` in `src/logic/roleDetect.ts` based on base stats:

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

Data is fetched live from [pokeapi.co](https://pokeapi.co) — no local database required.
