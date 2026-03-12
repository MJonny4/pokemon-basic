# PokeBasic — Remaining Work

## Technologies used:
- Powershell
- python.exe with curl to fetch data from PokeAPI and know how to build the app
- tsc --noEmit to typecheck TypeScript files
- gh or git commands to manage branches and pull requests

---

## Pending

### Terastal mechanic (battle)
- Tera types are **not implemented** in the battle engine or UI
- Required work:
  - Add `teraType: string | null` to `TeamSlot` (store) and `CpuSlot` (battleEngine) — PokeAPI does not expose official tera types so this will be user-defined or randomised for CPU
  - Add a "Terastallize" button in the player action panel (usable once per battle)
  - In `BattleState`, track `playerTerastallized: boolean` and `cpuTerastallized: boolean`
  - When active, override the Pokémon's types array to `[teraType]` for damage calc (STAB applies if original types included teraType, or if teraType is the new mono type)
  - CPU AI: terastallize when HP < 50% or when it would turn a resistance into neutral/super-effective hit
  - Visual: show a crystal/tera icon on the active sprite when terastallized; change the type badge colour to the tera type

- Check if theres any api for demage calculation I AM really paranoid about getting the damage right, else i'd like to make tests for the damage on all pokemon avaiable with their evs, items, abailtiies natures all and log inside a logs folder which would be needed to be added in the .gitignore file, and then check if the damage is right by comparing it with other damage calculators online, if not then i would need to check my damage calculation formula and see if theres any mistake in it.
- Change battle.html Synergy Score, Offensive Coverage, Common Weaknesses and Team Immunities to adapt to the new changes (old code)

---

LAST: CHECK CODE, OPTIMIZE CODE, TEST LOGIC WITH API IF NEEDED, CHECK ON HOW TO MAKE IT MORE SUSTAINABLE, CHECK FOR BUGS, CHECK FOR EDGE CASES, CHECK FOR PERFORMANCE ISSUES, CHECK FOR SECURITY ISSUES, CHECK FOR BEST PRACTICES, CHECK FOR CODE STYLE, CHECK FOR MAINTENANCE, CHECK FOR SCALABILITY, CHECK FOR USABILITY.