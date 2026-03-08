# PokeBasic — Remaining Work

## Technologies used:
- Powershell
- python.exe with curl to fetch data from PokeAPI and know how to build the app
- tsc --noEmit to typecheck TypeScript files
- gh or git commands to manage branches and pull requests

---

## Battle Mode: Select Enemy Team

Instead of (or alongside) the current random CPU team, let the player choose the enemy team before battling.

**Two modes to support:**
- **Random** (current behaviour) — CPU team is built automatically from `CPU_POOL`
- **Custom** — player picks up to 6 Pokemon for the enemy team via a pre-battle selection screen

**Pre-battle screen flow:**
1. Click "Battle Mode" (passes validation)
2. A prompt asks: "Random team" or "Pick enemy team"
3. If "Pick enemy team": show a 6-slot search grid; CPU moves are auto-assigned by `buildCpuTeam` logic (role-based EVs + top damaging moves + useful status moves from `MOVE_EFFECTS`)
4. Confirm -> battle starts as normal

**Files:**
- `src/components/team/BattleSim.ts` — add `battleMode: 'random' | 'custom'` state; expose `buildCpuTeam` so it accepts a pre-set name list instead of shuffling `CPU_POOL`
- `team.html` — add pre-battle mode selection step between the "Battle Mode" button and the arena

---

## Ability Selection + TERA Type in Set Editor

Add two fields to `TeamSlot` and the Set Editor UI:

- **Ability** — dropdown showing the Pokemon's available abilities (from `pokemon.abilities`). Store as `ability: string | null` in `TeamSlot`. Used by battle sim (e.g. Adaptability STAB x2, Guts ignores burn Atk drop, Intimidate on switch-in).
- **Tera Type** — 18-type selector (any type). Store as `teraType: string | null` in `TeamSlot`. Replaces the Pokemon's typing for STAB and effectiveness when active in battle.

**Files:**
- `src/store/team.ts` — add `ability`, `teraType` to `TeamSlot` interface + defaults
- `src/components/team/SetEditor.ts` — load abilities from already-fetched `fetchPokemon()` result; add `setAbility()`, `setTeraType()` methods
- `team.html` — add ability dropdown + tera type grid below Nature section in Set Editor
- `src/components/team/BattleSim.ts` — gate battle validation on ability being set once this field exists

---

## Gen Filter (Pokedex)

Filter the Pokedex autocomplete and search results by generation.

**Where:** Navbar or filter bar in `index.html`, above the search input.

**What it does:** Limits autocomplete suggestions and search results to Pokemon IDs within the selected generation range (from `GEN_RANGES` in `src/data/constants.ts` — add if missing).

```
Gen I:   #1-151     Gen V:   #494-649
Gen II:  #152-251   Gen VI:  #650-721
Gen III: #252-386   Gen VII: #722-809
Gen IV:  #387-493   Gen VIII:#810-905   Gen IX: #906-1025
```

**Files:**
- `src/data/constants.ts` — add `GEN_RANGES` constant
- `src/components/pokedex/SearchBar.ts` — add `genFilter` state, filter `allPokemon` list before autocomplete
- `index.html` — add gen filter pill buttons above search

---

## Pokedex EV/IV Calculator (Trainer Tips tab)

Add a lightweight calculator inside the existing Trainer Tips tab (`src/components/tabs/TrainerTab.ts`).

**What it shows:** Given a target final stat value and level, back-calculate the required EVs (assuming max IVs and a neutral nature, or user-adjustable).

**Files:**
- `src/logic/evCalc.ts` — inverse of `calcStat()`: `calcRequiredEv(key, base, iv, level, nature, targetStat) -> ev`
- `src/components/tabs/TrainerTab.ts` — add EV calc section at bottom of tab
