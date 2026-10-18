# PokeBasic — TODO

## Tooling
- PowerShell, Python (curl), `tsc --noEmit`, `gh` / `git`

---

## Pending

### Terastal Mechanic *(deferred — #ignore)*

Tera Type selection, local persistence, and Showdown export are already implemented. Full battle support still requires:

- Add `teraType: string | null` to `CpuSlot` and assign it without relying on PokéAPI
- Track `playerTerastallized` / `cpuTerastallized` flags in `BattleState`
- Add a one-use "Terastallize" button in the player action panel
- On activation, override the Pokémon's type array to `[teraType]` for damage calc (STAB applies if the original typing or tera type matches the move)
- CPU AI: terastallize when HP < 50% or when it converts a resistance into a neutral/super-effective hit
- Visual: crystal/tera icon on the active sprite; type badge changes to tera type colour
