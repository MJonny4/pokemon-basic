# Team Lab — `team.html`

Entry point: `src/team.ts` · Alpine components: `teamLab`, `setEditor`

---

## Header

Sticky header with navigation back to Pokédex and Stats Explorer.

---

## Team Slots Grid

6-slot grid (2 cols mobile → 3 cols sm → 6 cols lg).

### Filled slot card

Clicking opens the Set Editor panel for that slot.

| Element | Details |
|---|---|
| Sprite | 56×56 pixelated |
| Name | Hyphen-normalised, capitalised |
| Role | Competitive role inferred from base stats |
| Nature / Item badges | Shown if set |
| Move count | "X/4 moves" shown on hover |
| ✕ Remove button | Appears on hover (top-right corner) |
| Drag to reorder | `draggable="true"`, supports drop onto other slots |

### Empty slot card

Clicking opens an inline search input. Typing triggers autocomplete. Pressing Enter or clicking a result adds the Pokémon to that slot and immediately triggers a full data fetch.

---

## Team Action Bar

Visible when at least one slot is filled.

- **📋 Copy Team** — copies a Showdown-formatted team string to clipboard; button turns green on success
- **⚔️ Battle Mode** — validates the team (shows error if incomplete) then opens the Battle Simulator modal

---

## Set Editor Panel

Opens below the team grid when a slot is active. Closes with the ✕ button or `closeEditor()`.

### Panel Header

Sprite, name, type badges, role, level input (1–100), Showdown export button, close button.

### Nature

- **Recommended natures** — shown as pill buttons with stat boost/penalty labels (e.g. `+Atk −SpA`)
- **All natures** — expandable `<details>` section; recommended natures are highlighted in green within the full list

### Ability

Pill buttons for each of the Pokémon's available abilities (fetched from PokeAPI). Loading state shown while fetching.

### Tera Type

18 type buttons styled with each type's colour. Selecting a type sets `slot.teraType`.

### Held Item

2-column grid with 6 slots:

- **5 recommended item cards** — each shows icon, name, description, and a ⭐ badge. Clicking selects the item.
- **Custom item picker** — search input (activates dropdown at 2+ characters). Selecting an item from the dropdown populates a custom item card in slot 6. Card shows item icon and description pulled from PokeAPI.

### EVs

- Total EV tracker (X / 508); bar turns red at cap
- Per-stat sliders (0–252, step 4) and numeric inputs; stat colour-coded
- Nature effect indicator (▲ blue = boosted, ▼ rose = reduced) next to final calculated stat
- **↺ Reset** button zeros all EVs

### Final Stat Display

Calculated stat value shown right of each EV row, updating live with EV/IV/nature changes.

### IVs (collapsible)

Expandable `<details>` section below EVs.

- Per-stat sliders (0–31, step 1) and numeric inputs
- Values < 31 shown in amber
- **↺ Reset 31** button restores all IVs to 31

---

## Inline Damage Calculator

Collapsible section (▾) within the Set Editor, below the stat grid.

- **Defender search** — autocomplete Pokémon picker; shows defender's types inline
- **Move selector** — pick from the active slot's moves
- **Results** — damage range output for the selected matchup

---

## Analysis Panel

Shown when the team has at least one Pokémon. 4-card grid.

| Card | Description |
|---|---|
| **Synergy Score** | 0–100 composite score. Starts at 100, -8 per common weakness, +4 per type immunity (capped +12), +2–3 for offensive coverage, +2–4 for defensive spread. Colour: green ≥ 80, amber 50–79, red < 50. |
| **Offensive Coverage** | % of 18 types the team can hit super-effectively via STAB. Shows count and type badges. |
| **Common Weaknesses** | Types where 2+ team members share a weakness (weighted: 4× counts as 2). Sorted by severity. |
| **Team Immunities** | Types at least one member is fully immune to — from both type chart and ability-based immunities (Levitate → Ground, Flash Fire → Fire, Water Absorb → Water, etc.). |

### Ability-based immunities

`src/logic/teamCoverage.ts` maintains `ABILITY_IMMUNITIES` — a map of lowercase API ability name → immune type. When a slot has a matching ability the type is added to immunities and its weakness count is decremented for that slot.

---

## Speed Tiers Section

3-column breakdown below the analysis panel.

| Tier | Threshold |
|---|---|
| **Blazing** | Base speed ≥ 110 |
| **Fast** | Base speed 80–109 |
| **Slow** | Base speed < 80 |

---

## Battle Simulator Modal

Full-screen overlay opened by "⚔️ Battle Mode".

### Mode Selection

Choose between:
- **Random Team** — CPU gets a randomly generated team
- **Pick Enemy Team** — opens the custom enemy picker

### Custom Enemy Picker

Search and select up to 6 specific Pokémon for the CPU opponent.

### Battle Interface

Turn-based battle simulator.

- Player action panel — move buttons (PP shown), switch option
- Damage is calculated via `src/logic/damageCalc.ts` (`calcDamageRange`)
- CPU AI selects moves based on type effectiveness and HP thresholds
- Field state tracked: weather, Reflect, Light Screen
- Status conditions: burn, poison, toxic, paralysis, sleep, freeze
- End-of-turn effects: Leftovers, Black Sludge, status damage, Life Orb recoil
