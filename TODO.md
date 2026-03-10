# PokeBasic — Remaining Work

## Technologies used:
- Powershell
- python.exe with curl to fetch data from PokeAPI and know how to build the app
- tsc --noEmit to typecheck TypeScript files
- gh or git commands to manage branches and pull requests

---

## Pending

### EV Tooltips on hover (battle)
- Hovering over the **enemy active Pokémon sprite** should show a tooltip with its full EV spread (HP / Atk / Def / SpA / SpD / Spe)
- Hovering over **any bench portrait** (both player and CPU rows at the bottom) should show a similar tooltip with name + EV spread
- Tooltip style: dark card, stat labels + values, similar to the existing nature/ability badges already shown under the CPU HP bar

### Terastal mechanic (battle)
- Tera types are **not implemented** in the battle engine or UI
- Required work:
  - Add `teraType: string | null` to `TeamSlot` (store) and `CpuSlot` (battleEngine) — PokeAPI does not expose official tera types so this will be user-defined or randomised for CPU
  - Add a "Terastallize" button in the player action panel (usable once per battle)
  - In `BattleState`, track `playerTerastallized: boolean` and `cpuTerastallized: boolean`
  - When active, override the Pokémon's types array to `[teraType]` for damage calc (STAB applies if original types included teraType, or if teraType is the new mono type)
  - CPU AI: terastallize when HP < 50% or when it would turn a resistance into neutral/super-effective hit
  - Visual: show a crystal/tera icon on the active sprite when terastallized; change the type badge colour to the tera type

---