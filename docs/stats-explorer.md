# Stats Explorer — `stats.html`

Entry point: `src/stats.ts` · Alpine component: `statsRanking`

---

## Header

Sticky header with navigation back to Pokédex and to Team Lab.

- **Brand** — "PokeBasic" logo with subtitle "Stats Explorer"
- **Nav links** — "← Pokédex" (slate) and "🧪 Team Lab" (dark)

---

## Type Filter

Card with all 18 type buttons + an "All" gradient button.

- Selecting a type fetches that type's Pokémon from the PokeAPI and populates the results list
- Selecting **All** progressively loads all 1025 Pokémon with a progress bar
- Active type is highlighted with a ring and full opacity; inactive types are dimmed

---

## Generation Filter

Card below the type filter with Gen I–IX toggle buttons and an "All" reset.

- Can be combined with the type filter (e.g. Fire-type Gen I only)
- Active gens highlighted in violet

---

## Controls Bar

Shown only when data is loaded. Sits above the results list.

- **Sort chips** — BST, HP, Attack, Defense, Sp. Atk, Sp. Def, Speed. Active chip is violet. Switching re-ranks the list instantly.
- **Name filter input** — live text search within the loaded set; resets pagination to page 0 on each keystroke

---

## States

| State | Trigger | UI |
|---|---|---|
| **Loading** | Type selected, fetch in progress | Spinner + `loadingText` + progress bar (All-mode only) |
| **Empty** | No type selected yet | 📊 icon + "Select a type to begin" prompt |
| **No results** | Name filter matches nothing | "No Pokémon match '…'" message |
| **Results** | Data loaded and filter has matches | Ranked list + pagination |

---

## Results Grid

Paginated list of Pokémon rows. Each row contains:

| Element | Details |
|---|---|
| **Rank** | Numeric rank within the filtered + sorted set |
| **Sprite** | 48×48 pixelated image from PokeAPI sprites |
| **Name** | Clickable — opens the Pokédex modal via `window.openPokemonQuickView` |
| **Type badges** | Coloured pill badges |
| **Primary stat bar** | Horizontal fill bar for the currently sorted stat; colour matches stat; value shown right of bar |
| **Speed tier pill** | Shown when sorting by Speed: Blazing / Fast / Slow label |
| **Secondary stats** | Compact row of all other stats (label + value) below the primary bar |

---

## Pagination

Top and bottom pagination controls. Shown only when `totalPages > 1`.

- **← Prev** / **Next →** buttons, disabled at boundaries
- "Page X of Y" counter
- Page size is fixed in `statsRanking` component
