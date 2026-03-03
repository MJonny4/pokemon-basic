# PokeBasic — Remaining Work

## Technologies used:
- Powershell
- python.exe with curl to fetch data from PokeAPI and know how to build the app
- tsc --noEmit to typecheck TypeScript files
- gh or git commands to manage branches and pull requests

---

## Items DB — Full Item Picker

### Goal

The Set Editor currently shows the top role-recommended items as cards. The user must also be able to freely pick **any** equippable item from the full game pool (~80 items), even if it doesn't match the role — and the stat calculator must use that choice exactly like a recommended one.

### Target UX

The "Held Item" section becomes two zones:

1. **Recommended cards (top 5)** — same as today: role-based cards with sprite, name, desc, ⭐ badge. Clicking one selects it.
2. **Custom picker row** — a single card-sized slot below the recommended grid. It contains a searchable `<input>` (type to filter by item name). Selecting an item from the dropdown populates the slot with the item's sprite, name, and description — visually identical to a recommended card. Clicking the populated slot again deselects it (same toggle logic as `setItem()`). If the user picks an item that is also in the recommended list, the recommended card also lights up as selected (they share the same `slot.item` value).

Both zones call `setItem(name)` identically. The stat calculator reads `slot.item` the same way regardless of how it was set.

### Step 1 — Generate `src/data/items-full.json`

One-time script `scripts/generate-items.ts`, run with `npx tsx scripts/generate-items.ts`.

**What it does:**
- Fetches these holdable item categories from PokéAPI: `held-items`, `choice`, `type-enhancement`, `plates`, `drives`, `berries`, `jewels`, `mega-stones`, `z-crystals`, `terrain-enhancer`, `specific-purpose`
- For each item: fetches `name`, `short_effect` (English, from `flavor_text_entries`), and sprite slug
- Outputs `{ name: string, slug: string, desc: string }[]` as JSON (~80–100 items, ~15 KB)
- Sprite URL at runtime: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{slug}.png`

**Rules:** Commit the JSON to the repo — never fetch item data at runtime.

### Step 2 — Wire into item picker

**TS changes (`src/components/team/SetEditor.ts`):**
- Add `itemQuery: ''` and `itemDropdownOpen: false` state
- Add `filteredAllItems` getter: filters `items-full.json` by `itemQuery`, excludes items already in `recommendedItems` (to avoid duplicates in the custom picker), returns first 20 matches
- Add `selectCustomItem(name)`: calls `setItem(name)`, closes dropdown, clears query
- The `recommendedItems` getter stays unchanged (still uses `src/logic/items.ts`)

**HTML changes (`team.html`):**
- Recommended grid: unchanged, still 2-col, top 5 only (trim `slice` in `recommendItems` from 6 → 5)
- Below the grid: a custom picker card — dashed border when empty, populated card (sprite + name + desc) when `slot.item` is set to something not in the recommended list; contains `<input>` for search and a dropdown list styled like the move selector dropdown

---

## Damage Calculator

**Where:** new panel inside `team.html` (below Set Editor) or a card inside the Trainer Tips tab in `index.html`.

**What it calculates:**
Given an attacker's full stat spread (base + EVs + IVs + nature + level + item) and a selected move (BP, type, category), compute the damage range against a user-defined defender using the Gen 9 formula:

```
damage = ⌊(⌊(2×Lv/5 + 2) × BP × A/D⌋ / 50 + 2) × modifier⌋
```

**Modifier chain (in order):**
1. STAB: ×1.5 (×2.0 with Adaptability ability)
2. Type effectiveness: from `EFFECTIVENESS` matrix in `src/data/constants.ts`
3. Weather: ×1.5 / ×0.5 for sun/rain boosts
4. Burn: ×0.5 on physical Atk if attacker is burned
5. Screens (Reflect/Light Screen): ×0.5 on the relevant category

**Output:** min roll (85% modifier) and max roll (100% modifier), plus a label — "guaranteed OHKO", "guaranteed 2HKO", "possible OHKO (X%)", etc.

**Inputs needed from user:**
- Attacker: already fully described by the active `TeamSlot` (stats, EVs, IVs, nature, level, item)
- Move: pick one of the 4 selected moves (or any move from the learnset)
- Defender: base stats + optional EV/IV/nature/level (can default to 252 HP / 0 Def / 0 SpD / Lv 50 for quick calcs)

**Files to create/modify:**
- `src/logic/damageCalc.ts` — pure function `calcDamageRange(attacker, move, defender, options)` → `{ min, max, rolls: number[] }`
- `team.html` or `index.html` — UI panel wired to SetEditor's active slot

---

## Battle Simulator

Full planning required before any code. Will consume existing `TeamSlot` data (moves, EVs, IVs, nature, level, item) from `src/store/team.ts`.

### Engine requirements

- **1v1 battle core** — Gen 9 damage formula (same as Damage Calculator above), STAB, type effectiveness, crit (1/24 chance, ×1.5), item effects (Choice Band/Specs ×1.5, Life Orb ×1.3 −10% HP/turn, etc.)
- **Turn order** — resolved by final Speed stat; priority moves (Quick Attack +1, Protect +4, Trick Room −7, etc.) override speed
- **Status conditions:**
  - Burn: ×0.5 on physical damage dealt, lose 1/16 max HP per turn
  - Paralysis: ×0.5 Speed, 25% chance to skip turn
  - Sleep: skip turns (1–3 turns), cured on wake
  - Poison / Toxic: 1/16 HP per turn (toxic stacks +1/16 each turn)
  - Freeze: skip turns, 20% thaw chance per turn
- **Win probability** — after each turn, estimate remaining rolls needed to KO; display as percentage bar

### UI requirements (GSAP-animated)

- Health bar drains smoothly on damage taken (`gsap.to`)
- Pokémon sprite shakes on hit, fades on faint
- Turn log panel scrolls with each action
- Speed/priority indicator shows who moves first each turn

### Entry point

New button in `team.html` ("⚔️ Battle Sim") that opens the simulator modal; reads both teams from `Alpine.store('team')`. Requires at least 1 filled slot on each side.

### Other
- Team Lab missing ability selection and TERA role tags, which are needed for accurate battle sim inputs — add these to the Set Editor as well