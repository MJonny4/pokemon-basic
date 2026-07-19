# PokeBasic — TODO

## Tooling
- PowerShell, Python (curl), `tsc --noEmit`, `gh` / `git`

> **Documentation rule:** after implementing or updating any feature, update its doc in `docs/`.
> `docs/pokedex.md` · `docs/stats-explorer.md` · `docs/team-lab.md`

---

## Pending

### Homepage Gen Filter + History Rows *(removed 2026-07-17 — #ignore)*

Two rows used to render under the header search bar, **only on `index.astro`** (via a default-slot passthrough on `SiteHeader.astro` gated by `Astro.slots.has('default')`):

- **Gen filter** — "All" + Gen I–IX chips, toggled `selectedGens` on the `searchBar` Alpine component, which narrowed the header autocomplete dropdown to Pokémon from the selected gens.
- **History** — last 6 viewed Pokémon as chips (sprite + name), populated globally via a `history-add` window event fired whenever the Pokédex modal loaded a Pokémon; clicking a chip reopened that Pokémon's modal.

**Why removed:** this predates the current refactor — it existed back when `index.astro` was the interactive root page hosting the type chart/Pokédex. It survived the type-chart extraction to `/types` and the 2026-07-16 news-hub redesign unchanged, but the homepage is now a static news/links hub with no Pokédex grid or type chart left for the gen filter to meaningfully affect (it only ever touched the header autocomplete, identically available on every page), and "recently viewed" is tracked on every page regardless — this row was just the one place that displayed it. Not a homepage-specific feature; removed rather than kept as an unexplained, easy-to-miss stub. See `refactor.md` "Recently Viewed (Home Page)" for the proper planned replacement (`$store.pokemon.recentlyViewed`, covers Pokémon/moves/items, real empty state).

**To restore:** the removed markup + Alpine methods (`toggleGen`, `resetGens`, `isGenActive`, `allGensActive`, `addToHistory`, `clearHistory`, `capitalize`, gen-filter branch in `handleInput()`) are recoverable from git history on `refactor-june` prior to the 2026-07-17 cleanup commit — check `git log -p -- src/alpine/components/pokedex/search-bar.ts`.

```html
<!-- Gen filter row -->
<div class="w-full flex items-center gap-1.5 flex-wrap pb-1">
    <span class="text-[10px] font-black text-text-tertiary uppercase tracking-widest mr-1">Gen</span>
    <button @click="resetGens()" :class="allGensActive() ? 'fchip-active' : ''" class="fchip py-0.5! px-2.5! text-[10px]!">All</button>
    <template x-for="(label, i) in genLabels" :key="i">
        <button @click="toggleGen(gens[i])" :class="isGenActive(gens[i]) ? 'fchip-active' : ''" class="fchip py-0.5! px-2.5! text-[10px]!" x-text="label"></button>
    </template>
</div>

<!-- History row -->
<div class="w-full flex items-center gap-2 flex-wrap pb-1" x-show="history.length > 0">
    <span class="text-[10px] font-black text-text-tertiary uppercase tracking-widest mr-1">Recent</span>
    <template x-for="h in history" :key="h.name">
        <button class="hchip" @click="select(h.name)">
            <img :src="`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${h.id}.png`" :alt="h.name">
            <span x-text="capitalize(h.name)"></span>
        </button>
    </template>
    <button @click="clearHistory()" class="text-[10px] font-black text-text-tertiary hover:text-brand uppercase tracking-wide ml-auto transition">✕ Clear</button>
</div>
```

### Terastal Mechanic *(deferred — #ignore)*

Full Terastal support requires:

- Add `teraType: string | null` to `TeamSlot` and `CpuSlot` (PokeAPI has no official tera type data — use user-defined or randomised for CPU)
- Track `playerTerastallized` / `cpuTerastallized` flags in `BattleState`
- Add a one-use "Terastallize" button in the player action panel
- On activation, override the Pokémon's type array to `[teraType]` for damage calc (STAB applies if the original typing or tera type matches the move)
- CPU AI: terastallize when HP < 50% or when it converts a resistance into a neutral/super-effective hit
- Visual: crystal/tera icon on the active sprite; type badge changes to tera type colour
