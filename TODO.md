# PokeBasic — TODO

## Tooling
- PowerShell, Python (curl), `tsc --noEmit`, `gh` / `git`

> **Documentation rule:** after implementing or updating any feature, update its doc in `docs/`.
> `docs/pokedex.md` · `docs/stats-explorer.md` · `docs/team-lab.md`

---

## Pending

### Terastal Mechanic *(deferred — #ignore)*

Full Terastal support requires:

- Add `teraType: string | null` to `TeamSlot` and `CpuSlot` (PokeAPI has no official tera type data — use user-defined or randomised for CPU)
- Track `playerTerastallized` / `cpuTerastallized` flags in `BattleState`
- Add a one-use "Terastallize" button in the player action panel
- On activation, override the Pokémon's type array to `[teraType]` for damage calc (STAB applies if the original typing or tera type matches the move)
- CPU AI: terastallize when HP < 50% or when it converts a resistance into a neutral/super-effective hit
- Visual: crystal/tera icon on the active sprite; type badge changes to tera type colour
