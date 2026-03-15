# Pokédex & Type Chart — `index.html`

Entry point: `src/main.ts`

---

## Header

The sticky header contains the full search experience and navigation.

- **Brand** — "PokeBasic" logo with tagline "Ultra Moon · Gen I–IX"
- **Search bar** — text input with autocomplete dropdown; results show sprite, name, and Pokédex ID. Pressing Enter or clicking Search opens the Pokémon modal. Includes a clear (✕) button.
- **Nav links** — buttons to Stats Explorer (`stats.html`) and Team Lab (`team.html`)
- **Gen filter** — pill buttons (All, Gen I–IX) that filter which Pokémon appear in autocomplete results. Active gen is highlighted in violet.
- **Recent history bar** — shows chips for the last searched Pokémon (sprite + name). Visible only when history exists. Has a "✕ Clear" button to reset it.

---

## Type Effectiveness Chart

Full 18×18 interactive type matchup table rendered by JavaScript.

- **Row** = Attacking type, **Column** = Defending type
- **Colour legend** — 2× Super Effective (green), ½× Resist (red/muted), 0× Immune (dark), 1× Normal (neutral)
- Built and injected into `<table id="typeChart">` by `src/main.ts`

---

## Pokémon Modal

Opens when a Pokémon is selected from search or the recent history. Full-screen overlay (`z-50`).

### Banner

Gradient background derived from the Pokémon's primary type colour.

| Element | Details |
|---|---|
| Sprite | 112×112, click to toggle shiny |
| Name & ID | Large heading + `#NNN` padded ID |
| Type badges | Coloured pill badges per type |
| Generation | Small pill (e.g. "Generation I") |
| Height / Weight / Base XP | Shown below types |
| Shiny toggle button | Top-right of banner; amber when shiny |
| Speed tier label | Pill showing "Blazing / Fast / Slow" |
| Role label | Competitive role inferred from stats |
| Add to Team button | Adds the Pokémon to `team.html` team store |
| Close button | Top-right ✕, also closeable by clicking overlay |

### Modal Quick Search

Bar below the banner for switching Pokémon without closing the modal. Autocomplete dropdown, Enter selects first result.

### Tabs

Five tabs, horizontally scrollable on small screens:

| Tab | Content |
|---|---|
| **Overview** | Stats grid injected into `#overviewGrid` |
| **Defense** | Type effectiveness for this Pokémon (`#defenseContent`) |
| **Moves** | Moveset with filter chips, name search, and offensive coverage bar |
| **Trainer Tips** | Competitive strategy guidance (`#trainerContent`) |
| **Compare** | Side-by-side comparison with another Pokémon (`#compareContent`) |

#### Moves tab details

- **Filter chips** — filter by move category or learn method (e.g. level-up, TM)
- **Name filter** input — live search within loaded moves
- **Offensive Coverage bar** — shows X/18 types hit super-effectively with coloured type pills
- **Moves grid** — injected into `#movesGrid`

---

## Team Toast

Fixed bottom-centre notification bar (`z-70`). Triggered by the `team-toast` custom event.

- **Success** — green background (e.g. "Added Garchomp to team")
- **Error** — red background (e.g. "Team is full")
- Auto-dismisses after 4 seconds
