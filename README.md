# PokeBasic

A Pokémon reference and planning site for casual story players and completionists. Browse Pokémon, moves, items, and type matchups, follow classic-game guides, and build sets in Team Lab. Astro generates the routes; Alpine.js provides browser interactivity and local progress without accounts.

**Stack:** Astro · TypeScript · Alpine.js (`@astrojs/alpinejs`) · Tailwind CSS v4 · GSAP · PokéAPI · `@vite-pwa/astro`

**Tooling:** Bun 1.4.3 · Node.js ≥22.22.0 (required by the installed Astro version)

---

## Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Franchise news, site updates, and quick-access grid |
| Pokédex | `/pokedex` | All/Shiny selector and game-labelled generation-debut lists |
| Pokédex listing | `/pokedex/[slug]` | Type filter, sort, search, pagination (also serves Pokémon detail pages) |
| Pokémon detail | `/pokedex/[name]` | Information / Moves / Compare, evolution, generation-filtered learnset |
| Moves | `/moves` | Type/generation/category filters and TM/HM/TR search |
| Move detail | `/moves/[move]` | Full move data, cross-gen comparison table, learned-by Pokémon |
| Items | `/items` | Pocket/debut-generation filters, search, and sorting |
| Item detail | `/items/[item]` | Full item data, held-by Pokémon |
| Type Chart | `/types` | Historical type chart and timed matchup quiz |
| Stats Explorer | `/stats` | BST ranking table across all 1,025 Pokémon |
| Games | `/games` → `/games/[game]` | Four classic-game guides; `/games` redirects to Red/Blue |
| Team Lab | `/team` | Six-slot builder, Set Editor, heuristic analysis, experimental CPU battles, Showdown export |

Astro generated 3,766 static pages in the 2026-10-18 baseline build. Content routes have individual titles and metadata; some detailed data loads in the browser after navigation. A shareable page route does not include a user's saved team or progress.

---

## Features

### Home (`/`)
- Franchise news pulled from Bulbanews + PokémonDB RSS feeds at build time (daily cron rebuild)
- Manually maintained site updates changelog
- Quick-access grid to Type Chart, Stats, Team Lab, Games

### Pokédex (`/pokedex`)
- All and Shiny listings, plus nine game-labelled lists of Pokémon introduced in each generation. These are not complete regional Pokédexes or game-availability lists.
- Listing: type filter, sort (#/Name/BST/Height/Weight), search, pagination
- Detail page tabs:
  - **Information** — stat bars, abilities, species data, historical typing/defense views, evolution chain diagram
  - **Moves** — generation-filtered learnset with historical move values and Physical/Special/Status/Egg/Tutor filters. Same-generation version groups are combined; the result does not establish exact-game legality or exact-game level-up levels.
  - **Compare** — opens the quick-view modal for side-by-side stat comparison
- The quick-view modal also includes Trainer Tips with heuristic role, nature, held-item, and EV suggestions.

### Moves (`/moves`)
- Listing filterable by type, generation, and category (Physical/Special/Status); its existing search also resolves hidden, generation-aware TM/HM/TR queries such as `TM24` without changing the cards
- Detail page: full move data, cross-gen comparison table (BP/accuracy/PP/type/category changes highlighted), game-aware TM/HM/TR history, and which Pokémon learn it
- Listing filters and pagination persist per browser tab.

### Items (`/items`)
- Pocket and debut-generation filters, name/slug search, name/generation/cost sorting, pagination, and per-tab saved filters
- Detail page: full description/effect, which Pokémon hold it in the wild

### Type Chart (`/types`)
- Type-effectiveness grid across three historical eras (Gen I / Gen II–V / Gen VI+), including the Gen I Ghost/Psychic interaction
- Timed single/dual-type matchup quiz with era selection, configurable run length, and browser-local top-ten records per era

### Stats Explorer (`/stats`)
- All 1,025 Pokémon ranked by BST or any individual stat
- Type and generation filters, lazy sprite loading, pagination
- Quick-view modal with full stat breakdown

### Games (`/games`)
- Red/Blue, Gold/Silver, Ruby/Sapphire, and Diamond/Pearl guides with location stops, starter hints, wild Pokémon, items, and bosses
- Stop completion and starter choice persist locally. Coverage and content require verification; these guides are not yet a verified or exhaustive walkthrough set.
- Guide saves are read defensively without rewriting data on load. Damaged originals are preserved before explicit replacement; reset also keeps a recovery snapshot. Red/Blue has an independent checklist for 128 guide-listed steps, 76 item/reward entries and 47 distinct Pokémon species across Red and Blue. These are not full-game completion totals. **Download save backup** exports this guide's exact saved strings, recovery snapshots and current tab's view as JSON. **Restore a guide backup** previews saved versus tab-view values, offers merge or replace, and requires a download of the current save before applying the file. Red/Blue version-2 backups include the collection checklist; older version-1 backups remain importable and leave collection data intact. Other guides still use version-1 backups. Teams are separate.
- A shared registry validates the legacy structure and versioned, sourced content at build time. All 24 published Red/Blue main-story stops now have a source-checked chapter or location within its stated scope, from Pallet Town through the Hall of Fame. This is a complete story route, not a play-through-verified or exhaustive item/trainer/encounter inventory. Sources and review metadata stay in project data rather than player-facing panels; the UI keeps a brief scope/version note and gameplay warnings.
- The forest pilot combines item-image cards, Pokémon sprites and Gen I type badges with five visible/hidden pickups, exact encounter weights and a Red/Blue view toggle. Secondary trainer details, raw encounter slots and the coordinate-only item locator remain expandable; the locator is not a terrain map. Brock’s team is visible by default with sprites, types, moves, missable-battle warnings and advice for the selected starter. A licensed screenshot-map treatment remains future work.
- Encounter lists can name their actual area instead of implying that everything belongs to the stop's town. Viridian City's optional Route 22 detour labels the route on every card, includes Spearow, and shows exact/discrete levels and relevant Red/Blue differences. Optional and legacy encounter details beyond the story scope still need review.
- Route 3/Mt. Moon preserves the existing combined progress stop while separating routes, the entrance Pokémon Center and cave floors. Its visual reference includes a five-area encounter selector, 14 item entries (including the two alternative fossils), 21 trainer parties, an optional paid Magikarp and later Surf-only activities. Trainer moves and a terrain map are not included in this slice.
- Cerulean/Misty keeps its existing progress stop and separates town, gym, Routes 24/25 and Bill. It includes Misty’s exact team/moves, full starter-dependent rival previews (without changing your saved starter), 12 item/reward entries, 20 fixed trainer parties, Bill’s ticket sequence, the later Bicycle/Jynx exchanges and completionist warnings. Nearby-route grass is not presented as town-local encounters.
- Vermilion/S.S. Anne keeps its combined progress stop and includes the Route 5/6 and north–south Underground Path approach. Ten named areas contain 13 item/gift entries, 22 fixed trainer parties, all three evolved-starter rival teams, two NPC trades and separate route grass lists. Departure warnings distinguish receiving Cut from walking off afterwards.
- Lt. Surge’s separate gym stop has his actual three-Pokémon Red/Blue team and moves, all three regular trainer parties/moves, Cut access, rewards and missable-battle warnings. The trash-can explanation includes Red/Blue’s non-adjacent upper-left-can bug rather than promising a fixed solution.
- The Red/Blue story route covers the Rock Tunnel–Pokémon Tower sequence, Saffron/Silph Co., both remaining gym routes, Victory Road, the Elite Four and the Champion. It includes corrected Lift Key → Silph Scope → Fuji-house Poké Flute instructions and all three complete Champion party previews. These slices do not inventory every ordinary trainer, optional pickup or fishing area; in-game play-through validation comes later.
- Vermilion also has an expandable optional Route 11 / Diglett’s Cave / eastern Route 2 detour: ten Route 11 parties, five items, two NPC trades, exact route/cave encounters and the distinct 30-species Itemfinder / 10-species Flash requirements. It does not add a saved stop or claim Route 12/western Route 2 coverage. Cut and Flash requirements are separated; high-level Dugtrio warnings appear before directions.
- Guide Pokémon cards use a neutral background with a type-colored left border and canonical Pokédex lookup names. Viridian/Route 22, Route 4, Cerulean town/gym, Routes 24/25, Vermilion and Routes 6/11 have named fishing references, exact levels and rod acquisition locations. Later Surf access is distinguished from banks that only need a rod. Vermilion’s Old Rod works on arrival; town/Routes 6/11 also show later rods, while the guarded dock reference is bounded to Old Rod before departure. Other cities/routes still need this audit.
- Rich location/fishing and collection sections mount only for the selected stop. Their markup remains bundled in the static page; changing stops does not fetch a separate content file. Local preview/disclosure choices reset on remount, while saved starter, story progress and collection progress remain unchanged.
- Optional detour contents and ordinary trainer cards mount only when their disclosures are open. Gym navigation/headings use the user-selected Commons icon with creator/source/CC BY-SA 4.0 credits in the guide footer; it is not a badge reward image.

### Team Lab (`/team`)
- **6-slot builder** with drag-to-reorder and GSAP pop-in animations
- **Set Editor** — nature, held item, ability, level, EV/IV controls (508-total EV cap), move selection, and STAB indicators
- **Tera Type** — selection is saved and included in Showdown export only; it does not affect calculations or battles
- **Damage panel** — a panel-loaded `@smogon/calc` Gen 9 singles range for selected moves, with defender search, level/Defense/SpD inputs and weather/screen/critical controls. Assumptions and unsupported sets are shown in the panel; move legality, Tera effects and full battle state are outside this calculation. The MIT notice is available at `/licenses/smogon-calc-mit.txt` under the site's base path.
- **Team analysis** — heuristic synergy score, selected damaging-move type coverage, shared defensive weaknesses, and calculated set Speed. This general rail uses modern type matchups and the Gen 3+ stat formula; game-specific move legality is not checked. The linked Red/Blue view below has a separate Gen I type-only scope.
- **Red/Blue opponent comparison** — links from 20 source-checked major guide battles, including starter-dependent rivals, compare your selected Red/Blue damaging moves against the opponent party’s original Gen I types. Modern-only species and moves are marked unsupported. This is a type matchup view, not damage, move-legality or full battle prediction; existing team saves are read without migration.
- **Battle Simulator** — experimental CPU battles with random or species-selected opponents, generated enemy sets, switching, selected status/stat effects, turn logs, and animations. It does not implement the full game rules.
- **Team portability** — the current six-slot team keeps its existing `team_lab` browser save. Per-set and whole-team Showdown export share one formatter. Paste and review supported Showdown fields before replacing the current team; unsupported fields are rejected, and Pokémon details require cache or PokéAPI. Save, load and delete up to 24 named local snapshots. Versioned JSON backup exports the current team and snapshots; restore offers merge or replace, validates the file and downloads a raw recovery copy before writing. Sharing by URL is not included; team links could be long and expose private set details.

### Cross-cutting
- **Dark mode** — Tailwind v4 `dark:` variants everywhere, Alpine store persisted to `localStorage`, OLED true-black theme
- **Omnibox search** — header search spans Pokémon, moves, items, and types; `/` keyboard shortcut to focus. Pokémon suggestions use the committed 1,025-entry catalog without a startup API request; opening uncached details still needs connectivity.
- **PWA/caching** — after a successful online installation, the app caches its entry pages, four guides, bundled scripts/styles/fonts and local icons. Detail pages and item/sprite images are cached after visits, within bounded caches. Updates offer **Reload to update** or **Later**. Uncached runtime data needs connectivity; expired API entries are not served as an offline fallback.

## Current accuracy and offline scope

The current implementation needs the accuracy work recorded in the project plan. In particular:

| Area | Current scope | Do not assume |
| --- | --- | --- |
| Game-labelled Pokédex | Generation-debut ranges | Regional membership or catchability in that game |
| Pokémon learnsets | Combined version groups within a generation | Exact release-level legality or acquisition level |
| Type/move history | Historical reference views using local metadata | Every other tool uses the selected historical rules |
| Guide content | Four guides with local stop progress | Version-complete directions, verified trainer teams, or full completion coverage |
| Team analysis | Modern selected-move type heuristics and calculated Speed | Exact game availability, move legality, or complete battle prediction |
| Damage/battles | Partial modern mechanics with selected items, abilities, and effects | An authoritative Gen 9 simulator, historical rules, PP tracking, or complete move effects |
| Offline use | Installed entry pages/four guides, visited cached details/images and non-expired API data | Offline first use, all Pokémon details, or permanent browser storage |

For example, simulator moves currently do not establish weather/screens, Protect does not enforce protection, and null/zero-power damaging moves lack complete handling. Picking an enemy species does not recreate a verified story trainer's set. These limitations remain queued for later phases.

New accuracy claims must identify the exact game/version or rules context, supported inputs, and unsupported behavior, and be backed by appropriate known-result fixtures. Passing type checks and a build alone does not verify Pokémon facts or battle mechanics.

---

## Getting Started

```bash
bun install --frozen-lockfile
bun run dev
```

Open the address shown by Astro, normally `http://localhost:4321/pokemon-basic/` with the configured deployment base path.

```bash
bun run check    # Astro + TypeScript diagnostics, including .astro templates
bun run test     # Bun tests from the mirrored test/ tree
bun run build    # production build → dist/
bun run verify   # check, test, then production build
bun run preview  # preview production build
```

Use `bun run verify` before handing off a change. `build` alone does not run type checks. Generator scripts in `scripts/` are manual network operations; checks and tests do not regenerate committed datasets. The production build fetches the home-page RSS feeds and tolerates unavailable feeds.

Optional production-browser checks live in `test/scripts/` and run through the `check:*` package scripts. Build and start a production preview first. They use optional Playwright/Chromium tooling through `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and `CHROMIUM_LD_LIBRARY_PATH` when needed.

---

## Project Structure

```
src/
├── lib/
│   ├── data/
│   │   ├── constants.ts        # TYPES, TYPE colors, EFFECTIVENESS matrices, STAT_COLORS, GEN_RANGES, VG_GEN
│   │   ├── moves-data.json     # Static move metadata
│   │   ├── moves-meta.json     # Per-move gen introduced, effect chance, cross-gen change history
│   │   ├── move-machines.json  # Generated per-game TM/HM/TR assignments for each move
│   │   ├── machine-games.ts    # Game labels, display widths, and machine-use mechanics
│   │   ├── items.ts            # Held item roles/colors/descriptions (Team Lab)
│   │   ├── items-catalog.json  # Full item catalog for /items (category, pocket, gen, cost, effect)
│   │   ├── pokedex-manifest.json  # Slim per-Pokémon manifest (id/name/types/height/weight/BST)
│   │   ├── pokedex-games.ts    # Game → gen range metadata for Pokédex listings
│   │   ├── site-updates.ts     # Manually maintained changelog for the home page
│   │   ├── type-history.ts     # Historical type-chart breakpoints
│   │   └── guides/             # Shared guide modules and other game guides
│   │       └── red-blue/       # Red/Blue main-story guide modules
│   │
│   ├── api/
│   │   ├── pokeapi.ts          # TypeScript interfaces + fetch functions (L1 Map + L2 IndexedDB cache)
│   │   └── idb-cache.ts        # IndexedDB TTL cache (idbGet, idbSet)
│   │
│   ├── logic/
│   │   ├── battle-ai.ts, battle-engine.ts  # Experimental CPU battles
│   │   ├── damage-calc.ts, stat-calc.ts    # Calculation helpers
│   │   ├── defense.ts, team-coverage.ts    # Matchup and team heuristics
│   │   └── machines.ts          # Machine queries/history
│   │
│   ├── news.ts                 # Build-time RSS fetch + parse for the home page news feed
│   ├── quiz-records.ts
│   └── pokedex-loader.ts
│
├── ui/                         # Pure (data) => string HTML builders
│   ├── badges.ts, category-badge.ts, stat-bar.ts
│   ├── move-card.ts, move-gen-table.ts, item-card.ts
│   ├── learnset-table.ts, evolution-chain.ts, defense-chart.ts, pokemon-card.ts
│
├── alpine/
│   ├── stores/
│   │   └── pokemon.ts, team.ts, theme.ts  # Shared state; team/theme persisted locally
│   └── components/
│       ├── pokedex/             # search-bar (omnibox), pokedex-index, pokedex-detail, modal-tabs/*
│       ├── moves/, items/, types/, layout/, guide/
│       └── team/                # team-lab, set-editor, battle-sim
│
├── components/
│   ├── SiteHeader.astro         # Omnibox, Data dropdown, Team Lab/Games links, mobile menu
│   ├── DarkModeToggle.astro
│   ├── PokedexModal.astro       # Quick-view modal (still used by Stats/Team/Compare flows)
│   ├── pokedex/, team/          # Extracted page sections (TeamSlots, SetEditorPanel, BattleSimulator, …)
│
├── entrypoint.ts                # Registers all Alpine stores + components
├── layouts/
│   └── Layout.astro             # Base HTML shell, FOUC-safe dark mode, canonical/OG meta
├── pages/
│   ├── index.astro, stats.astro, team.astro, types.astro
│   ├── pokedex/, moves/, items/, games/
└── styles/
    └── global.css                # Design tokens (light/dark), Tailwind v4 @theme, Geist fonts
```

Tests mirror the source layout under `test/src/`; browser checks and their helper mirror `scripts/` under `test/scripts/`.

---

## Architecture

### Cache (L1 + L2)

```
Runtime API detail call
  └── L1: in-memory Map (same session, instant)
        └── L2: IndexedDB via idb-cache.ts (TTL varies by data type)
              └── PokéAPI network request (fallback)
```

### Build vs. runtime data

| Data | Strategy |
|---|---|
| Moves / Items listings | Build-time, local JSON |
| Pokémon listing manifest | Build-time, slim JSON |
| Pokémon detail, learnsets | Runtime + IndexedDB cache |
| Pokémon name selectors (header, modal, Team Lab, Stats) | Shared local manifest projection; no API/IndexedDB dependency for the default list |
| Stats ranking records | Runtime detail fetches; the local manifest lacks individual stats |
| Franchise news | Build-time, daily GitHub Action rebuild |

### Key rules

- Browser PokéAPI requests go through `src/lib/api/pokeapi.ts`; build-time news and manual data generators have separate network requests
- Logic files accept plain data — no DOM access, no Alpine imports
- `src/entrypoint.ts` is the single place that registers all Alpine stores and components
- HTML building goes through `src/ui/` helpers

---

## Deployment

Deployed to GitHub Pages via `withastro/action`. `.github/workflows/deploy.yml` checks types and tests before building/deploying on pushes to `main`, a daily news rebuild (`0 6 * * *`), or manual runs. Pull requests run `bun run verify` in `.github/workflows/checks.yml` with read-only repository permissions and no deployment.

Bun is pinned by `packageManager` in `package.json`, and CI installs with the frozen lockfile. Workflow execution on GitHub is separate from local verification.

---

## Dependencies

| Package | Purpose |
|---|---|
| `astro` | Framework + static site build tool |
| `@astrojs/alpinejs` | Alpine.js integration |
| `alpinejs` | Reactive UI (stores + components) |
| `tailwindcss` / `@tailwindcss/vite` | Utility CSS (v4) |
| `gsap` | Animations |
| `@vite-pwa/astro` / `vite-plugin-pwa` | PWA/offline support |
| `@fontsource-variable/geist(-mono)` | Local Geist font files |
| `@astrojs/check` / `typescript` | Astro template and TypeScript checking |
| `@types/node` / `@types/bun` | Types for manual data scripts and the Bun test runner |

Runtime Pokémon data comes from [PokéAPI](https://pokeapi.co) with IndexedDB caching. Move/item catalogs and the Pokémon listing manifest are committed local datasets. User progress stays in the browser; no account or server database is required.
