# PokeBasic — Refactor June Brainstorm

## Root / Home Page Redesign

### Header (unchanged)
- Brand/title on the left
- Pokémon search in the middle
- Nav links on the right (Stats, Team, Guide)

### Body — Two-column layout

**Left column**
- Franchise news cards — fetched from RSS (Serebii or Bulbagarden) at build time
  - Card per item: title, source tag, date
  - GitHub Action rebuilds daily to keep news fresh
- Site updates section — local markdown/JSON file maintained manually
  - Card per entry: label (e.g. "Added Gen IX data"), date

**Right column**
- 2×2 quick-access shortcut grid: Type Chart · Stats · Team Builder · Game Guides
- Pokédex search card that opens the existing modal

### RSS source (TBD)
- Serebii — more frequent, game/event focused
- Bulbagarden — wiki-adjacent, broader coverage
- Could show both

---

## Nav Restructure

### Current nav
`← Pokédex` · `📊 Stats` · `🧪 Team Lab` · `📖 Guide`

### New nav
- **Brand logo (left)** → clickable, links to `/` (the new news hub root)
- **Middle** → Pokédex search (unchanged)
- **Right nav links:**
  - `Data ▾` — dropdown with: Stats · Moves · Type Chart · Pokédex
  - `Team Lab`
  - `Guide`

---

## Data Section (was "Stats")

The "Stats" nav item becomes **"Data"** with a dropdown menu:

| Item | Route | Description |
|---|---|---|
| Stats | `/stats` | Existing stat ranking/explorer page (unchanged) |
| Moves | `/moves` | New moves listing page (see below) |
| Type Chart | `/types` | Moved from root, gets its own route |
| Pokédex | `/pokedex` | Moved from root modal, gets its own route |

---

## New: Moves Page (`/moves`)

### Listing view (`/moves`)
- Grid of move cards
- Each card shows: name, type badge, category (Physical/Special/Status), power, accuracy
- **Filters:**
  - By type (Fire, Water, etc.)
  - By generation (Gen I–IX)
  - By category (Physical / Special / Status)
  - By TM / HM / TR
  - By game

### Detail view (`/moves/[name]`)
- Each move gets its own URL (e.g. `/moves/thunderbolt`)
- Shows: full move data, which Pokémon learn it, which games it appears in, TM/HM number if applicable
- URL updates when you navigate to a move (proper routing, not a modal)

### Data source
- PokéAPI — move data already accessible via the existing PokeAPI pattern in the project

---

## Moved: Type Chart → `/types`

- Extracted from root page
- Accessible via Data dropdown
- Same chart, new dedicated route

---

## Moved: Pokédex → `/pokedex`

- Extracted from root modal
- Accessible via Data dropdown
- Full page instead of modal overlay

---

## Renamed: Guide → Games (`/games`)

### Nav change
- `📖 Guide` becomes `🎮 Games ▾` with a dropdown listing each game directly
- Dropdown items: Red/Blue · Gold/Silver · Ruby/Sapphire · Diamond/Pearl · (+ future games)
- Clicking a game from the dropdown navigates to `/games?game=ruby-sapphire`

### Page behavior
- One page (`/games`) — no separate route per game
- Alpine.js reads `?game=` query param on load and pre-selects the right game
- URLs are shareable — linking to `/games?game=gold-silver` opens that guide directly
- Game selector tabs inside the page are **removed** (replaced by the nav dropdown)
- Progress bar, stops, completion tracking all stay as-is

### What changes
- Rename `guide.astro` → `games.astro`
- Remove in-page game selector button row
- Alpine `guide` component reads `window.location.search` on init to set `activeGameId`
- SiteHeader gets a new `Games` dropdown nav item listing each game by id

---

## New: Items Page (`/items`) — under Data dropdown

Same pattern as Moves — listing + detail view.

### Listing view (`/items`)
- Grid of item cards
- Each card shows: name, category (Held Item, Berry, TM, Key Item…), effect summary, sprite icon
- **Filters:**
  - By category (Held Item / Berry / Pokéball / TM-HM / Key Item / Medicine / etc.)
  - By generation
  - By game
  - By effect type (stat boost, healing, evolution, etc.)

### Detail view (`/items/[name]`)
- Each item gets its own URL (e.g. `/items/leftovers`)
- Shows: full description, effect, where to find it per game, held by wild Pokémon (if any)

### Data source
- PokéAPI `/item` and `/item-category` endpoints — same pattern as moves

---

## Updated: Data Dropdown Contents

| Item | Route |
|---|---|
| Pokédex | `/pokedex` |
| Type Chart | `/types` |
| Stats | `/stats` |
| Moves | `/moves` |
| Items | `/items` |

---

## Redesigned: Pokédex (`/pokedex`)

### Selector / landing (`/pokedex`)
Big clickable entry points to choose which Pokédex to browse:

| Option | URL | Badge | Pokémon shown |
|---|---|---|---|
| All Pokémon | `/pokedex/all` | — | All 1025 |
| Red / Blue | `/pokedex/red-blue` | Gen I | 151 |
| Gold / Silver | `/pokedex/gold-silver` | Gen II | 100 (Gen II new only, #152–251) |
| Ruby / Sapphire | `/pokedex/ruby-sapphire` | Gen III | … |
| Diamond / Pearl | `/pokedex/diamond-pearl` | Gen IV | … |
| … (one card per main series game) | | | |
| Shiny Pokédex | `/pokedex/shiny` | — | All 1025, shiny sprites |

- Each game shows **only its new Pokémon** (e.g. Gold/Silver → 100 new, not cumulative 251)
- "All Pokémon" is the only way to see the full 1025
- Game name is the label, Gen badge sits next to it for context
- Shiny is a separate entry that works across the full dex

### Listing view (`/pokedex/[filter]`)
- **Header label:** e.g. "Red / Blue Pokédex · Gen I · 151 Pokémon"
- **Filters above cards:** type filter · sort by (# / Name / BST / Height / Weight)
- **Cards show:** sprite (or shiny sprite), name, type badge(s), height, weight, BST
- Default order: National Dex number
- Shiny variant: identical layout, sprites swapped to shiny

### Individual Pokémon view (`/pokedex/[name]`)

Inspired by pokemondb.net/pokedex/ivysaur but merged with the current modal experience.

**Always-visible section (top, static):**
- Sprite (normal or shiny depending on context), name, national #, type badges
- Height, weight, BST, abilities, hidden ability

**Mini navbar (tabs below):** `Information` · `Moves` · `Compare`

#### Information tab (merged: overview + defense)
- Overview: species, catch rate, gender ratio, egg groups, base friendship, base exp
- Type defense chart: how this Pokémon is affected by each type (2× / ½× / 0× / 1×)
- All in one scrollable section, no sub-tabs

#### Moves tab
- **Gen filter** (main series only, no spin-offs): Gen I → Gen IX
  - Filters the move list to what was available/learnable in that gen
  - Shows correct BP/type/accuracy for that gen (moves changed between gens)
  - Greyed out or hidden if a move was removed in a later gen
- **Category tabs:** All · Physical · Special · Status · Egg · Tutor
- **Format:** Table, not cards — columns: Level / Name / Type / Cat / BP / Acc / How learned
  - "How learned" = Level Up, TM, HM, Egg, Tutor
  - Move name is a link → `/moves/[name]`
- **Egg moves:** show which parent Pokémon can pass each egg move
- **Coverage bar:** collapsible section — shows which types this Pokémon's moves cover
  - Collapsed by default, expandable — power-user feature

#### Compare tab
- Existing modal compare feature, brought into the tab

**URL:** `/pokedex/ivysaur` — mini navbar tab state reflected in hash: `/pokedex/ivysaur#moves`

---

### What this replaces
- The current root-page Pokédex modal is retired
- Pokédex becomes a proper multi-page experience under `/pokedex`
- Accessible via the Data dropdown in the nav

---

## Dark Mode

Cross-cutting change — touches every component and page.

- Tailwind v4 `dark:` variants for all color classes
- Alpine.js store toggles `dark` class on `<html>` and persists to `localStorage`
- Toggle button in the site header (sun/moon icon)
- All pages: bg-slate-50 → dark bg, white cards → dark cards, text-slate-800 → light text

## Gen Filter — Core Cross-Cutting Concern

The generation filter is not a UI detail — it's a fundamental data versioning problem that touches every section of the site. A single Alpine.js global store holds the active gen, persisted to `localStorage`, and every data-heavy page reads from it.

```ts
// Alpine store
$store.gen.current  // 'gen1' | 'gen2to5' | 'gen6plus'
$store.gen.set(g)   // updates + persists
```

The filter selector is a shared component rendered above the relevant content on `/types`, `/moves`, `/items`, and inside the Pokémon detail moves tab and information tab.

---

### Type Chart — 3 Breakpoints

The type matchup table changed exactly twice. Three static matrices cover the full history:

**Gen I (RB/Y) — 15 types**
No Steel, Dark, or Fairy. Several documented bugs in the game code (not "intended design"):
- Ghost deals 0× damage to Psychic (should be 2×) — programmed inverse of the intended immunity
- Poison is super-effective vs Bug (swapped in Gen II)
- Bug is super-effective vs Poison (swapped in Gen II)
- Ice is not very effective vs Water (fixed in Gen II)
- Fire not very effective vs Fire was correct in Gen I, changed in Gen II (Fire now resists Fire)

**Gen II–V (GSC → BW2) — 17 types**
Dark and Steel added. All Gen I chart bugs fixed.
- **Steel**: immune to Poison; resists Normal, Flying, Rock, Bug, Steel, Grass, Psychic, Ice, Dragon, Dark, Ghost; weak to Fire, Fighting, Ground
- **Dark**: immune to Psychic; resists Ghost, Dark; weak to Fighting, Bug (Fairy later in Gen VI)
- Ghost now properly 2× vs Psychic

**Gen VI+ (XY → present) — 18 types**
Fairy added. Steel nerfed (loses two resistances).
- **Fairy**: immune to Dragon; resists Fighting, Bug, Dark; weak to Poison, Steel
- **Steel**: no longer resists Ghost or Dark (neutral vs both now)

Implementation: three hardcoded 15×15 / 17×17 / 18×18 arrays. No API needed. Selector above the chart on `/types`; same selector reused in the Pokémon detail Information tab.

---

### Moves — What Changes by Gen

**Physical/Special split in Gen IV** — this is the biggest move-data shift in the franchise:
- Gen I–III: damage category determined by move **type** (Fire/Water/Grass/Electric/Ice/Psychic/Dragon/Dark = Special; everything else = Physical)
- Gen IV+: each move has its own explicit category (Physical / Special / Status) regardless of type

This means a move like Bite (Dark, Physical in Gen IV+) was a *Special* move in Gen I–III because Dark = Special. The moves tab on the Pokémon detail page and the `/moves` listing must display the correct category per gen.

**Stat/accuracy changes between gens** — many moves were rebalanced. Examples:
- Surf: 95 BP (Gen I–V) → 90 BP (Gen VI+)
- Thunderbolt: 95 BP (Gen I–V) → 90 BP (Gen VI+)
- Flamethrower: 95 BP (Gen I–V) → 90 BP (Gen VI+)
- Blizzard: 120→110 BP, Thunder: 120→110 BP (Gen VI)
- Many accuracy values changed across gens too

**Type reassignments** — some moves changed type:
- Charm: Normal (Gen II–V) → Fairy (Gen VI+)
- Moonblast: new in Gen VI (Fairy)
- Several "formerly Normal" moves reclassified as Fairy in Gen VI

**TM/HM numbers** — TM sets are completely different per gen. The moves tab "How learned" column needs to show the correct TM number for the selected gen.

**Data modeling**: `moves-data.json` needs a `gen_overrides` map per move entry, or separate gen-keyed files. The per-gen fields are: `power`, `accuracy`, `pp`, `type`, `category`, `tm_number`.

---

### Items — What Changes by Gen

Gen I has no held item mechanic at all — no items section applies to Gen I filtering.

| Gen | Major changes |
|---|---|
| Gen I | No held items. Bag items only (Potions, Balls, etc.) |
| Gen II | Held items introduced: Leftovers, Berries (Gen II berries), evolutionary items (Metal Coat, Dragon Scale…), type-boosting items (Charcoal, Mystic Water…) |
| Gen III | Expanded items, new berries (flavor/EV-reducing Berries), Pokéblock/Poffin ingredients |
| Gen IV | More competitive items (Choice Scarf, Choice Specs, Life Orb, Focus Sash introduced) |
| Gen V | TMs become **infinite-use** (previously single-use). More held items. |
| Gen VI | Mega Stones introduced. Some items renamed or removed. |
| Gen VII | Z-Crystals introduced. Ride Pager replaces HMs. |
| Gen VIII | TR system introduced (single-use "TMs"). Dynamax Band. |
| Gen IX | Tera Orb. Various new held items. |

Each item in `/items` listing and detail gets an `introduced_gen` field. The gen filter hides items not yet available in the selected gen.

---

### Pokémon — Base Stat Changes by Gen

Several Pokémon received base stat changes in Gen VI when Mega Evolutions were introduced (base forms were buffed to create more distance from their Megas). Notable changes:

- Butterfree: Sp.Atk 80 → 90
- Beedrill: Attack 80 → 90
- Pidgeot: Speed 91 → 101
- Raticate: HP 55 → 55, Speed 97 → 97 (minor changes)
- Nidoqueen / Nidoking: Attack raised, Sp.Atk raised
- Clefable: Sp.Atk 85 → 95
- Vileplume: Sp.Atk 75 → 110 (massive jump)
- Poliwrath: Attack raised
- Alakazam: Sp.Def 65 → 95
- Gengar: — (no base stat change, Mega handles it)
- Tentacruel: Sp.Def raised
- Golem: Attack raised
- Farfetch'd: Attack raised (minor)

The Pokémon detail stat display and the `/stats` ranking page should note when a stat differs from the currently selected gen. A subtle "(Gen I–V: 80)" annotation under the stat bar is enough.

---

### Learnsets — What Changes by Gen

A Pokémon's learnset (level-up, TM, HM, Egg, Tutor) is entirely gen-specific. The moves tab on the Pokémon detail page already plans a gen filter — this is its data source:
- Level-up moves: level thresholds change, moves get added/removed
- TM compatibility: a Pokémon may learn Earthquake by TM in Gen III but not in Gen I
- HM moves: HMs changed between gens (e.g., HM06 is Whirlpool in Gen II, Rock Smash in Gen III)
- Egg moves: new egg moves added in later gens, some removed
- Move tutors: entirely game-specific, not just gen-specific

**Data source**: PokéAPI `pokemon-species/{id}/` and `move/{id}/learned-by-pokemon` endpoints carry per-version-group learnset data. This is runtime-fetched, not from the local JSON.

---

## Graphical Priority

Goal across all pages: show information visually wherever possible.
- Stat bars (already exist) — keep
- Type badges — keep
- Evolution chain diagram in Pokémon detail view (see below)
- Coverage bar in moves tab (collapsible)
- Pokédex card sprites prominent
- Skeleton/shimmer loaders while PokéAPI data loads
- Radar/hexagon chart for stat distribution on Stats page (see below)

---

## Global Search Evolution

The header search currently only finds Pokémon. With Moves, Items, and proper routes all added, this becomes a natural **omnibox** — one input, results grouped by type:

```
Thunderbolt   → /moves/thunderbolt       (Electric · Special · 90 BP)
Pikachu       → /pokedex/pikachu         (Electric · #025)
Leftovers     → /items/leftovers         (Held Item · restores 1/16 HP)
Fire          → /types#fire              (Type)
```

- Keyboard shortcut `/` from anywhere to focus
- Results from local JSON (moves, items) are instant; Pokémon names from the existing preloaded list
- This replaces the "Pokédex search card" slot on the home page — the header already does it

---

## Cross-Page State (Alpine Store Persistence)

Astro pages are full page loads — Alpine stores reset on every navigation. Any store that needs to survive navigation must be backed by `localStorage`. This applies to:

| Store | What to persist |
|---|---|
| `$store.gen.current` | Active gen filter (new) |
| `$store.theme.dark` | Dark mode on/off (already implied) |
| `$store.team` | Team Lab slots (already works?) |
| `$store.pokemon.recentlyViewed` | Last N Pokémon/moves/items viewed (new) |

Make this explicit and consistent across stores — not ad-hoc per feature.

---

## SEO Payoff

The modal approach gave zero SEO. Real routes enable it for free with Astro static generation:

- `<title>Pikachu — Pokédex | PokeBasic</title>`
- `<meta name="description" content="Pikachu is an Electric-type Pokémon. BST 320, ability Static or Lightning Rod.">`
- `<link rel="canonical" href="https://pokebasic.dev/pokedex/pikachu">`
- Open Graph tags for sharing individual pages

Wire these into each `[name].astro` layout's `<head>` using data already fetched for the page. Zero extra work once the routes exist.

---

## Reusable Type Defense Component

The type defense chart appears in two places: the `/types` page and the Pokémon detail Information tab. Extract it as one Alpine component that accepts:
- `typeA: string` — primary type
- `typeB: string | null` — secondary type (null for mono-types)
- `gen: 'gen1' | 'gen2to5' | 'gen6plus'` — reads from `$store.gen.current`

The gen selector sits outside this component (shared at page level). The component just renders the correct matchup table.

---

## Stats Page — Radar Chart

Stats is marked "unchanged" but fits the graphical priority goal. Add a **radar/spider chart** showing the six base stats as a hexagonal polygon — makes offensive/defensive/speed profiles obvious at a glance. Alongside the existing bars, not replacing them.

Pure SVG, no extra dependency. Scale: center = 0, outer edge = 255 (max possible stat). Pre-compute the 6 polygon points from the stat values.

---

## Games Page: Query Params vs Path Segments

The brainstorm currently mixes routing patterns — resolve this before implementation:

| Page | Planned | Alternative |
|---|---|---|
| Pokédex filter | `/pokedex/red-blue` (path segment) | — |
| Games guide | `/games?game=red-blue` (query param) | `/games/red-blue` (path) |

**Recommendation: use path segments everywhere.** Query params on a static site require the client to read `window.location.search` on mount, which causes a flash where the wrong game shows briefly. Path segments (`/games/red-blue`) let Astro pre-render the correct content per game. The trade-off is a separate `.astro` file or `getStaticPaths()` call — worth it for consistency and no flash.

---

## Recently Viewed (Home Page)

The home page right column has the quick-access grid and Pokédex search card. A third slot — **Recently Viewed** (last 6 Pokémon/moves/items, from `localStorage`) — adds personalization with zero API cost. Each entry is a small chip: sprite thumbnail + name + route type badge.

Appended to `$store.pokemon.recentlyViewed` on every `/pokedex/[name]`, `/moves/[name]`, `/items/[name]` page load.

---

## Breadcrumb Nav

New nested routes need wayfinding. A simple shared breadcrumb component:

```
Data › Pokédex › Red / Blue › Pikachu
Data › Moves › Thunderbolt
Games › Gold / Silver
```

Rendered below the site header on listing/detail pages. Doubles as the back link — no need to rely on browser history.

---

## Forms / Variants — Decision

Three options:

1. **Separate cards in listing** — simple but clutters (Pikachu + Pikachu-Original + Pikachu-Partner + Pikachu-Alola)
2. **Base card + form switcher in detail** — listing shows base only, detail page has a form toggle; URL reflects form via hash (`/pokedex/rotom#heat`)
3. **Base card with form count badge** — "6 forms" badge on Rotom's listing card, detail has switcher

**Recommendation: option 2.** Keeps the listing clean, makes the detail page richer, and the hash-based URL is shareable. Megas are a special case — show them as a separate "Mega" tab in the detail view alongside the form switcher since they have distinct stat lines.

---

## Build vs Runtime Data Strategy

Explicit decision matrix — avoid discovering this late:

| Data | Strategy | Reason |
|---|---|---|
| Moves listing | **Build-time** (local JSON) | `moves-data.json` already exists, 7500 lines, zero runtime cost |
| Items listing | **Build-time** (local JSON) | `items-full.json` already exists |
| Pokémon listing (thumbnail manifest) | **Build-time** (slim JSON) | Pre-generate name/id/types/sprite for all 1025 |
| Pokémon detail | **Runtime + IDB cache** | Full payload too large to bundle |
| Learnsets | **Runtime + IDB cache** | Per-version data, PokéAPI only |
| RSS news | **Build-time** (GitHub Action) | Already planned |

The moves and items pages can be 100% static — no PokéAPI calls at runtime, instant page loads, fully offline-capable.

---

## PWA / Offline

`idb-cache.ts` is already in the project. With build-time static data for moves/items and IDB-cached Pokémon details after first view, adding a service worker would make most of the site functional offline. Workbox via the `@astrojs/service-worker` integration (or a custom `public/sw.js`) is the path. Low-effort add given the existing infrastructure.

---

## Open Questions (TBD before implementation)

1. **Evolution chains** — visual chain (Bulbasaur → Ivysaur → Venusaur) in the Information tab of the Pokémon detail view? Fits the graphical goal well. Branching chains (Eevee) need a tree layout.
2. **Header search scope** — just Pokémon, or full omnibox (Pokémon + moves + items + types)?
3. **Pokédex listing pagination** — 1025 cards is heavy. Infinite scroll or paginated (50–100/page)?
4. **Games page routing** — query params (`?game=`) or path segments (`/games/red-blue`)? Recommendation above is path segments.
5. **moves-data.json gen coverage** — does it already have per-gen BP/accuracy/category fields? Needs audit before the gen filter can work on moves.

## Feature Ideas from Pokemon Expert Review

Prioritized by value-to-effort ratio. Top 3 picks marked ⭐.

---

### ⭐ 1. Weaknesses / Resistances Panel with Gen Toggle

On each Pokémon detail page, show the full type matchup table (4× / 2× / 1× / 0.5× / 0.25× / 0×) for that Pokémon's type combination. Updates when the gen store changes — correctly reflects the Gen I Ghost→Psychic bug (0× instead of intended 2×), Steel losing Ghost/Dark resist in Gen VI, etc.

**Why:** Most sites have this but none handle Gen I bugs correctly. **Data:** Static local 18×18 matrix (two historical versions). No API needed. **Complexity:** Low.

---

### ⭐ 2. Type Coverage Advisor (offensive)

Given up to 6 Pokémon and their move types, show which of the 18 types they cover super-effectively and which they can't hit SE at all. Color-coded 18-cell grid + suggestions for gap-filling types.

**Why:** Complements Team Lab directly. "My team can't hit Ground super-effectively" is the most common reason playthroughs fail. **Data:** Same type chart matrix as above, pure client-side logic. **Complexity:** Low.

---

### ⭐ 3. Move Cross-Gen Comparison Table

On each move's detail page, show a row-per-generation table: BP / accuracy / PP / type / category (Physical or Special), with changed cells highlighted. E.g., Surf: 95 BP (Gen I-V) → 90 BP (Gen VI+). Gust: Normal (Gen I) → Flying (Gen II+).

**Why:** The single most annoying thing to look up across gens. No site shows this at a glance. **Data:** `moves-data.json` needs a `gen_history` array added for the ~50-60 moves that changed — one-time manual curation. **Complexity:** Low (UI) + Medium (data).

---

### 4. Inline Damage Calculator (gen-aware)

Attacker + defender + move + optional nature/EVs → min/max damage range and OHKO/2HKO verdict. Embedded on Pokémon detail pages and in Team Lab. Gen store switches the damage formula (Gen I formula differs structurally from Gen II+) and the Physical/Special split.

**Why:** Smogon's calc exists but is a separate site with steep UI. Inline and gen-aware is the differentiator. **Data:** PokéAPI stats + type chart + local move data. **Complexity:** Medium.

---

### 5. "Can I catch this?" — Version & Obtainability Grid

For each Pokémon, a grid of every game with colored cells: wild catch / version exclusive / trade-only / event-only / not available. Filter to games the user cares about.

**Why:** "Can I get Scyther in Gold without trading?" is asked constantly. Bulbapedia buries this in prose. **Data:** PokéAPI `/pokemon/{id}/encounters` + version-group logic + supplementary local JSON for exclusives. **Complexity:** Medium.

---

### 6. HM Slave Finder

For a selected game, show which Pokémon can learn all the HMs needed to complete it, which single Pokémon covers the most HMs, and filter by catchable before a given badge count.

**Why:** Every playthrough player struggles with this. No tool answers it in one place. **Data:** HM lists per game (local JSON). Learnsets from PokéAPI filtered by version-group. **Complexity:** Medium.

---

### 7. Pokémon Comparison Mode (side-by-side)

Select 2–4 Pokémon, see base stats, types, abilities, and tier side-by-side. Radar chart from the stats page plan shows them overlaid. Gen store shows pre-Gen VI stats for Pokémon that were buffed (Alakazam Sp.Def 65 vs 95).

**Why:** Players constantly open multiple tabs. Radar overlay makes tradeoffs visual instantly. **Data:** PokéAPI (already fetched for detail pages). **Complexity:** Low–Medium.

---

### 8. Nuzlocke Route Planner

For a selected game, route/area list in order with: available Pokémon, types, and a "caught" checkbox. Flags type overlap with already-checked Pokémon.

**Why:** Nuzlocke is the dominant replaying format and has no dedicated tooling beyond spreadsheets. **Data:** Route order + available Pokémon per game — needs manual curation (PokéAPI `/location-area/` gives encounters but not route ordering). **Complexity:** High (data curation).

---

### 9. BST Filter with Tier Overlay

On the Pokédex listing, add a BST range slider and an optional tier label overlay (Uber/OU/UU/NU for a given gen). Lets players find "bulky Water types, 480–540 BST, that were OU in Gen III" in seconds.

**Why:** BST alone is misleading; BST + tier + type filter together gives actionable team-building context. **Data:** BST from PokéAPI. Tier data per gen from a curated local JSON (Smogon historical tier lists). **Complexity:** Medium.

---

### 10. Held Item Mechanics Explainer

On each item's detail page, show exactly which battle mechanics it interacts with — actual damage multipliers, whether it stacks with STAB, generation availability, and edge cases (e.g., Eviolite scales with base form BST, Assault Vest blocks status moves).

**Why:** PokéAPI's item flavor text is inconsistent and incomplete. Concise mechanics annotations next to item data are more educational than any wiki prose. **Data:** `items-full.json` + manual annotations for battle mechanics. **Complexity:** Low (UI) + Medium (curation).

---

### 11. EV Spot Finder per Game

For a selected game and a stat (Attack, Speed, etc.), show the best grinding routes: Pokémon that give that EV, how many per KO, and where to find them. Flags Power Items (Gen IV+) and Pokérus multiplier. Gen I/II shows Stat Experience equivalent.

**Why:** EV routes are buried in wiki prose. A filterable "which route gives the most Speed EVs in Platinum pre-Elite Four" table saves hours. **Data:** PokéAPI EV yields (`pokemon.stats[].effort`) + location data + local constants for Power Items. **Complexity:** Medium.

---

### 12. Nature + EV Spread Advisor

Given a Pokémon and a selected role (physical sweeper / special wall / revenge killer), suggest the canonical nature and EV spread with a plain-language explanation of why. Show how the spread changes actual final stats on the stat bars. Gen III+ only.

**Why:** New players don't understand why Timid vs. Modest matters on a specific Pokémon. Seeing "Timid: 299 Speed vs. Modest: 272 Speed — outspeeds Gengar at +0" is instantly educational. **Data:** Base stats from PokéAPI. Role presets are curated for ~20-30 common Pokémon to start. **Complexity:** Medium.

---

## Out of Scope (for now)
- Team Lab — no changes
- Spin-off games — not included in any gen filter
- Version exclusives — game Pokédex shows all Pokémon of that gen, no version filtering
- Z-Moves, Max Moves, Tera moves — too game-specific for the initial moves page

---

## ✅ Already Done (June 2026 — Design Phase)

Before starting the structural refactor above, a full **design system overhaul** was completed across all existing pages. Build is clean after every change.

### Design Tokens & Global CSS (`src/styles/global.css`)
- Fonts switched from Inter (Google Fonts) to **Geist Variable + Geist Mono Variable** (`@fontsource-variable/geist` + `@fontsource-variable/geist-mono`)
- Apple-inspired color palette with OLED true-black dark mode (`#000000`)
- CSS custom properties in `:root` (light) and `.dark` (dark), registered via `@theme inline` so Tailwind utilities work (`bg-bg-surface`, `text-text-primary`, `border-action`, etc.)
- Brand color: Pokemon Red `#FF3B30`. Interactive accent: Apple Blue `#007AFF` (replaced all violet/purple)
- Dark variants added for all custom CSS classes: `.ac-dropdown`, `.ac-item`, `.fchip`, `.tab-active`, `.move-card-*`, `.stat-bar-track`, `.nature-card`, `.item-card`, etc.
- `@custom-variant dark (&:where(.dark, .dark *))` — Tailwind v4 class-based dark mode

### Dark Mode Infrastructure
- `src/alpine/stores/theme.ts` — Alpine store; reads `pb_dark` from localStorage on init, applies `.dark` to `<html>`, persists on toggle
- FOUC prevention — inline `<script is:inline>` in `Layout.astro` `<head>` applies `.dark` before Alpine hydrates
- `src/components/DarkModeToggle.astro` — sun/moon icon button wired to `$store.theme.toggle()`

### Global Layout (`src/layouts/Layout.astro`)
- PokedexModal moved here (available on every page, was duplicated per-page before)
- `bg-bg-base` on body with `transition-colors duration-200`
- Google Fonts `<link>` removed (now using local fontsource packages)

### Global Navbar (`src/components/SiteHeader.astro`)
- Same header on every page: Logo (P + PokeBasic) left | Search bar **truly centered** (middle) | Nav links right
- Uses `grid-cols-[1fr_auto_1fr]` — equal wings guarantee visual center regardless of brand/nav widths
- Search column: `w-72 sm:w-96 lg:w-110` (explicit width for true centering)
- `x-data="searchBar"` on `<header>` — makes search state available to both the search bar and slot content (gen filter, history rows from index.astro)
- DarkModeToggle integrated in nav

### Dark Mode — All Pages Tokenized
Every hardcoded color replaced with design tokens on all 4 pages:

| Page | Key replacements |
|---|---|
| `index.astro` | All slate colors → tokens; gen filter uses Tailwind v4 suffix `!` for important |
| `stats.astro` | All slate/violet → tokens; stat modal spinner uses `border-action` |
| `guide.astro` | All slate/violet → tokens; sidebar active uses `bg-action-subtle border-action` |
| `team.astro` | All slate/violet → tokens; battle sim kept as intentional `bg-slate-900` dark canvas |
| `PokedexModal.astro` | All slate/violet → tokens; banner default changed from `#7c3aed` to `#007AFF` |

### Component Extraction — team.astro
`team.astro` reduced from ~1400 lines → **42 lines** by extracting into:
- `src/components/team/TeamSlots.astro` — 6-slot grid with drag/drop, search dropdown
- `src/components/team/SetEditorPanel.astro` — nature, ability, tera type, held item, EVs/IVs, damage calculator, moves (4 slots with learnset search)
- `src/components/team/TeamAnalysis.astro` — synergy score, coverage %, weakness cards, immunities, speed tiers
- `src/components/team/BattleSimulator.astro` — full-screen battle modal + toast

### Alpine Registration (`src/entrypoint.ts`)
- `registerThemeStore()` added
- `registerSearchBar()` and `registerModal()` always registered (they live in the global Layout)

---

## 🔜 Next Steps (current as of 2026-07-18 — Phases A, B, C, and most of D ✅ DONE, see "Also Done" sections below)

### 0. COMMIT THE BRANCH FIRST
Everything (Phase A + news hub + B + C + moves/items redesign + Phase D) is still uncommitted on `refactor-june`. The daily news cron only activates once merged to `main`. Split into logical commits.

### Phase D — Cross-Cutting (mostly done — see "Also Done (2026-07-18)" below)
13. ~~Gen filter Alpine store~~ — **deliberately descoped, not built.** The three existing gen mechanisms (types.astro era-bucket, Pokédex detail single-value + debut-gen clamp, moves/stats multi-select arrays) answer genuinely different questions ("what did the chart look like then" vs "view this Pokémon as of gen X" vs "which gens to include in a list"). Unifying them would add real complexity (reconciling value domains, persistence, clamping) for a UX benefit nobody asked for — a user picking Gen III on `/types` probably doesn't want every Pokémon page to silently jump to Gen III. Each filter works and is scoped correctly to its own page; leave them independent.
14. ✅ Global search → omnibox (Pokémon + moves + items + types)
15. ✅ Evolution chain diagram in Pokémon detail
16. ✅ PWA / service worker (`@vite-pwa/astro`)

### Phase B/C deferrals (smaller, self-contained tasks)
- **Modal retirement** — quick-view modal still serves stats/team/guide/move-learner flows; migrate those to `/pokedex/[name]` links, then delete PokedexModal + modal-tabs (big cleanup win)
- In-page Compare tab on `/pokedex/[name]` (currently a button to the quick-view modal)
- Forms/variants switcher on detail pages (spec option 2: hash-based, `/pokedex/rotom#heat`)
- Per-gen TM/HM numbers (needs PokeAPI machine data — many extra fetches, extend enrich script)
- Egg-move parents, coverage bar (moves tab power-user features)
- Item find-locations per game, held-by-wild-Pokémon (needs curation — use pokemon-expert agent)

### Component extraction (still valid, lower priority)
`Spinner.astro` / `EmptyState.astro` are still duplicated inline across pages. (TypeBadge/StatBar ended up as `src/ui/` string helpers instead — badges.ts, stat-bar.ts — reuse those, don't create .astro duplicates.)

---

## ✅ Also Done (2026-07-18 — Moves/Items Redesign + Phase D subset)

**Moves & Items redesign (listing + detail, hand-specced by the user after an external AI design tool's output wasn't good enough):**
- Cards on `/moves` and `/items` now use a shared "colored left border + gradient fade over the theme surface" skin (`moveCardStyle()`/`itemCardStyle()` in `src/ui/move-card.ts`/`item-card.ts`) — type/pocket color fading into the category color, dark-mode safe (low-alpha layered over CSS vars, never hardcoded pastel hex).
- Filter islands merged on both listings: Category/Pocket + Generation chips in one island, Sort + Search in a second, equal height via CSS grid's default row-stretch. Filters persist across navigating into a detail page and back via `sessionStorage` (`pb_moves_filters`/`pb_items_filters`, validated on restore).
- Detail pages (`/moves/[move]`, `/items/[item]`) restructured 70/30: hero (same card skin) + stat/info islands + Effect island (round ℹ icon, short + nested "Technical" sub-island when available) on the left; a sticky "Learned by"/"Held by" Pokémon column on the right (`fetchMoveInfo`/`fetchItemInfo` in `pokeapi.ts`, IDB-cached).
- **Item icon coverage**: `EXCLUDED_ITEM_CATEGORIES` (dynamax-crystals, unused ★-named junk) dropped 2221→1799 items. `itemSpriteFallback()` in `item-card.ts` maps PokeAPI-404 items to pokesprite's `items/` sprite tree (data-verified against the real file trees of both repos, not guessed — several early guesses were wrong: mints are filed by nature-stat not slug, z-crystals need a `--bag` suffix, loot splits into partner-gift/shard/valuable-item). A one-off offline script (kept **local-only, gitignored** — not committed, for Bulbagarden ToS reasons) resolved the remaining ~92 gap items (picnic cosmetics, TM materials, species candies, a few event/plot items) via the Bulbagarden Archives API; those PNGs live in `public/items/*.png` as `itemSpriteImg()`'s third fallback tier before the 🎒 emoji.

**Evolution chain diagram** (`/pokedex/[slug]` Information tab): new `src/ui/evolution-chain.ts` (`evolutionChainHtml()`, `flatEvoNames()`) ports the old modal's BFS chain-rendering logic (linear vs branching/Eevee-style layouts) but with real `<a href="/pokedex/[name]">` links instead of the modal's `pokemon-search` event dispatch. Wired into `pokedex-detail.ts` as a reactive getter (`evoChainHtml`, depends on `infoGen`) fed by `fetchEvolutionChain()` (already existed, IDB-cached) + a batch `fetchPokemon` per chain node. **Gen-aware evolution triggers**: `EvolutionDetail` was missing several PokeAPI fields (`location`, `known_move_type`, `min_affection`, `near_special_rock`, `is_default`, `version_group`) — without them Leafeon/Glaceon/Sylveon all showed a generic "level up" label, and even after adding the fields, naively preferring `is_default` showed the *newest* method (Leaf Stone/Ice Stone, Gen VIII+) regardless of the selected gen. Fixed with `pickDetail()`: picks the **oldest method still valid at the selected gen**, so Gen IV–IX all correctly show "near Mossy/Icy Rock" (the original method, never superseded, just supplemented).

**Move category icons**: `categoryBadge()` (`src/ui/category-badge.ts`) gained pokemondb's physical/special/status icons, downloaded locally to `public/icons/` (no hotlinking a third-party CDN). The status icon is plain dark-grey art on a grey badge background — invisible until wrapped in a small white backdrop chip inside the pill.

**Omnibox search** (`src/alpine/components/pokedex/search-bar.ts`, still named `searchBar` for now): extended from Pokémon-only to a 4-kind search (Pokémon/Move/Item/Type) against already-local JSON (`moves-data.json`, `items-catalog.json`, `TYPES`) — no new fetches. Each result row shows a kind tag on the right (`Pokémon`/`Move`/`Item`/`Type`). Pokémon results still dispatch `pokemon-search` (modal not retired yet); moves/items/types navigate via real `href`s since Phase B/C gave them real routes. Global `/` keyboard shortcut focuses the header input (reuses the ignore-if-typing guard pattern from `pokedex-detail.ts`'s arrow-key nav).

**PWA** (`@vite-pwa/astro` + `vite-plugin-pwa`, added as new deps): `astro.config.mjs` registers `AstroPWA` as an integration (not a raw `vite.plugins` entry — the Astro wrapper auto-respects `base: '/pokemon-basic'` for `start_url`/`scope`/icon paths, verified correct in the built `manifest.webmanifest`). `registerType: 'autoUpdate'`, default `generateSW` mode (no custom SW logic needed — `idb-cache.ts` already handles API payload caching independently). One `runtimeCaching` rule: `CacheFirst` for `raw.githubusercontent.com` sprite URLs (content-addressed, never change once fetched). Icon set (`pwa-64/192/512`, maskable, apple-touch, favicon.ico) generated from the existing `public/icon.png` via `bunx @vite-pwa/assets-generator` — no image-editing tool was available locally, this was the only viable path. Verified via `bun run build` + `astro preview`: `sw.js`/`manifest.webmanifest` both serve `200` under the base path with correctly-prefixed URLs.

---

## ✅ Also Done (2026-07-16 — News Hub Homepage)

- **RSS reality check:** Serebii has **no RSS feed** (deliberate — ad revenue funds their servers; do not scrape). Bulbanews wiki is wound down, but the Bulbagarden forum feed carries its coverage. Verified working sources:
  - Bulbanews — `https://bulbagarden.net/forums/news/index.rss` (several posts/day)
  - PokémonDB — `https://pokemondb.net/news/feed` (~monthly, major announcements)
- **Decision: both sources**, with a source tag per card.
- `src/lib/news.ts` — build-time fetch + hand-rolled RSS parse (CDATA-aware, no deps). Reserves 2 slots per source before filling to 12 by date, so PokémonDB's quiet feed isn't drowned out. Feed failure never breaks the build — warns and renders a fallback card.
- `src/lib/data/site-updates.ts` — manual changelog; add entries at the top when features ship.
- `index.astro` — two-column hub: left = Franchise News grid + Site Updates list; right (22rem, lg+) = 2×2 quick-access grid (Type Chart / Stats / Team Lab / Game Guides). Pokédex search card intentionally omitted — the header search already does it. Gen filter + history header rows unchanged.
- `deploy.yml` — daily `cron: "0 6 * * *"` rebuild keeps news fresh.

---

## ✅ Also Done (2026-07-17 — Phase B: Move & Item Dex)

**Routes shipped:** `/moves` (listing), `/moves/[move]` (919 detail pages), `/items` (listing), `/items/[item]` (2,221 detail pages). Both added to the nav `Data ▾` dropdown. Build now emits ~3,150 static pages.

**Data enrichment (`scripts/enrich-pokeapi-data.ts`)** — one-time bun script, never wired into CI:
- `src/lib/data/moves-meta.json` — per-move `gen` introduced, `effect_chance`, and compact `past` change history translated from PokeAPI `past_values`. Semantics verified empirically: a past entry's `version_group` is where the NEW value took effect, so old values apply through `gen(version_group) − 1`. Shadow moves (Colosseum/XD) excluded — meta keys are the canonical page move list.
- `src/lib/data/items-catalog.json` — full 2,221-item catalog (name, slug, category, pocket, gen, cost, effect). **PokeAPI item `game_indices` start at Gen 3** — Gen 1/2 introductions were curated via the pokemon-expert agent into `GEN_OVERRIDES` in the script (plus category-level defaults for Gen 9 SV data gaps: tm-materials/picnic/sandwich/tera-shard → 9, mega-stones → 6). Watch out: PokeAPI also misdates Kurt's apricorn balls (HGSS indices → Gen 4; really Gen 2).
- `moves-data.json` / `items-full.json` untouched — existing consumers (fetchMoves, team lab, battle sim) unaffected.

**New reusable pieces (src/ui/ convention — pure `(data) => string` helpers):**
- `category-badge.ts` — Physical/Special/Status pill
- `move-card.ts` — listing card + `titleize`/`genLabel` text helpers + `MoveListEntry` type
- `move-gen-table.ts` — ⭐ cross-gen comparison table (feature idea #3): reconstructs per-gen values from `past`, computes pre-Gen-IV category from type (Physical/Special split rule), collapses identical gen spans, highlights changed cells
- `item-card.ts` — listing card + `itemSprite`/`pocketLabel`/`categoryLabel` + `ItemListEntry` type

**Other plumbing:**
- `fetchMoveLearners()` in `pokeapi.ts` + `TTL.MOVE` in `idb-cache.ts` — move detail pages lazy-load "learned by" chips (runtime + IDB, per the build-vs-runtime matrix); chips open the global Pokédex modal via the `pokemon-search` event
- `Layout.astro` gained optional `canonicalPath` prop → `<link rel="canonical">` + `og:url` (used by all detail pages)
- Alpine: `movesIndex`, `moveDetail`, `itemsIndex` components registered behind `uses()` gates
- The `~/.claude/agents/pokemon-expert.md` agent gained a game-world knowledge section (item/TM locations per game, encounters, version exclusives, regional dexes)

**Deferred from the Phase B spec** (need per-version-group machine data / location curation — revisit in Phase C/D with pokemon-expert):
- TM/HM numbers per gen ("How learned" column data)
- Per-game filters on listings
- "Where to find it per game" on item details
- "Held by wild Pokémon" on item details

---

## ✅ Also Done (2026-07-17 — Phase C: Pokédex Routes)

**Routes shipped:** `/pokedex` (selector: 9 game cards + All + Shiny), `/pokedex/[slug]` — ONE dynamic segment serving both page kinds (11 game listings AND 1025 Pokémon detail pages; no slug collisions). Build now emits ~4,190 pages in ~6s. Pokédex added to the nav `Data ▾` dropdown.

**Data:** `scripts/build-pokedex-manifest.ts` (one-time bun script) generated `src/lib/data/pokedex-manifest.json` — slim 80KB manifest (id/name/types/height/weight/BST for all 1025), per the build-vs-runtime matrix.

**Listings (`/pokedex/red-blue` etc.):** each game shows only its newly introduced Pokémon (`GEN_RANGES` slice); shiny listing swaps sprite URLs. Type filter + sort (#/Name/BST/Height/Weight with direction toggle) + search + pagination (60/page). Card grid links to detail pages; shiny listing links carry `?shiny=1` so the detail hero swaps artwork.

**Detail (`/pokedex/[name]`):** static hero baked from manifest (official artwork w/ sprite fallback, dex no, types, h/w/BST) + runtime-loaded content via existing IDB-cached fetchers. Tabs (hash-synced, `#moves`):
- **Information** — stat bars + total, abilities w/ effects + hidden badge, species panel (dex entry, genus, catch rate, gender split, egg groups, friendship, base exp, growth rate), type-defense panel (new `src/ui/defense-chart.ts` — computes 4×/2×/½/¼/0× buckets from `EFFECTIVENESS`)
- **Moves** — ⭐ gen-filtered learnset table: picks the Pokémon's moves per selected gen via `version_group_details` + new `VG_GEN` map in `constants.ts`, shows **gen-correct** BP/Acc/PP/type via `moveValuesAt()` (new export in `move-gen-table.ts`) and gen-correct Physical/Special category (pre-Gen-IV type rule). Category/method filter chips (All/Physical/Special/Status/Egg/Tutor). Move names link to `/moves/[slug]`. Rendered by new `src/ui/learnset-table.ts`.
- **Compare** — deferred to the existing quick-view modal (tab button dispatches `pokemon-search`); full in-page compare is future work.

**Note:** `pokedex-detail.ts` imports `moves-data.json` + `moves-meta.json` client-side (~300KB chunk, shared/cached across all detail pages) to compute gen-correct learnsets with zero extra API calls beyond the usual `fetchPokemon`.

**Deferred from the Phase C spec:** in-page Compare tab, egg-move parents, coverage bar, forms/variants switcher (spec option 2), per-gen TM numbers (blocked on machine data — same as Phase B deferral). Evolution chain diagram shipped 2026-07-18, see "Also Done" below. **Modal retirement is NOT done** — the quick-view modal still serves stats/team/guide/move-learner flows; migrating those to `/pokedex/[name]` links is a candidate next step.

---

## ✅ Also Done (July 2026 — Dark Mode Bug Fixes)

### Alpine Runtime Errors Fixed (`src/components/PokedexModal.astro`)
- **Error 1: `renderMoves is not defined`** — `movesGrid` div had `x-data x-effect="renderMoves($store.pokemon.moves, ...)"`. `renderMoves` is a module-scoped import in `pokedex-loader.ts`, never exposed on `window`, so Alpine couldn't resolve it.
- **Error 2: `Cannot read properties of undefined (reading 'toLowerCase')` at moves.ts:14** — The `x-effect` referenced `$store.pokemon.filter`, `$store.pokemon.search`, `$store.pokemon.types` — none of which exist on the pokemon Alpine store. Alpine evaluated them as `undefined` on mount and crashed `search.toLowerCase()`. Also the empty `x-data` on that div created an isolated scope losing the parent modal context.
- **Fix:** Removed `x-data` and `x-effect` from `movesGrid` entirely. The imperative rendering in `pokedex-loader.ts` line 85 (`renderMoves(moves, types, 'all', '')`) and `window.rerenderMoves` already handled all rendering correctly.

### Pokédex Modal Tabs — Dark Mode Tokenization
All five modal tab files generate HTML via `innerHTML` in TypeScript — they bypass the CSS variable system entirely, so dark mode had zero effect on them.

**Files changed:**
- `src/ui/stat-bar.ts` — `text-slate-400` → `text-text-tertiary`, `text-slate-700` → `text-text-primary`
- `src/alpine/components/pokedex/modal-tabs/overview.ts` — all cards, dex entry, abilities card, evo chain card
- `src/alpine/components/pokedex/modal-tabs/defense.ts` — semantic section backgrounds changed from fixed `bg-red-50 / bg-emerald-50 / bg-purple-50` to opacity-based `bg-red-500/10 / bg-emerald-500/10 / bg-purple-500/10` (work transparently on any surface in light or dark mode); border-200 variants → `/30` opacity
- `src/alpine/components/pokedex/modal-tabs/moves.ts` — move cards, section headers, status effect text, filter type labels
- `src/alpine/components/pokedex/modal-tabs/trainer.ts` — role card (gradient replaced with `bg-bg-elevated`), stat calculator, nature cards, item cards; item card inline `background: '#fff'` fallback → `background: var(--bg-surface)`
- `src/alpine/components/pokedex/modal-tabs/compare.ts` — peer list rows (selection states use `bg-violet-500/15` / `bg-emerald-500/15`), sort bar, stat comparison panel

**Token mapping used throughout:**
| Old | New |
|---|---|
| `bg-white` | `bg-bg-surface` |
| `bg-slate-50 / bg-slate-100` | `bg-bg-elevated` |
| `bg-slate-200` | `bg-bg-raised` |
| `border-slate-200` | `border-border-subtle` |
| `text-slate-800 / text-slate-700` | `text-text-primary` |
| `text-slate-600 / text-slate-500` | `text-text-secondary` |
| `text-slate-400 / text-slate-300 / text-slate-200` | `text-text-tertiary` |
| `bg-red-50 / bg-emerald-50 / bg-purple-50` | `bg-red-500/10 / bg-emerald-500/10 / bg-purple-500/10` |
