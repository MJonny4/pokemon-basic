# Moves

The moves catalog is statically generated from `moves-data.json`, `moves-meta.json`, and `move-machines.json`.

## Machine search

The existing `/moves` search input accepts an exact TM, HM, or TR code without displaying machine metadata on the listing cards. Queries are case-insensitive and ignore spacing, an optional separator, and leading zero differences. For example, `TM24`, `tm 24`, and `TM024` search for the same machine number.

With all generation chips enabled, a machine query returns every move assigned to that code in any supported game. When generation chips are narrowed, they apply to the generation of the machine assignment. For normal move-name searches, the chips continue to mean the generation in which the move debuted.

## Move detail history

Every `/moves/[move]` page has a generation-first TM/HM/TR History island after Across Generations. Games are shown as subcategories only when assignments or mechanics differ within that generation. Each assignment explains whether the machine is single-use or reusable and includes relevant field-mechanic notes.

Machine assignments are generated from PokéAPI's official CSV data:

```bash
bun scripts/build-move-machines.ts
```

The generator validates the expected number of machines per supported game. It also applies known bag-accuracy corrections: FireRed/LeafGreen's unavailable HM08 and Black/White's unreleased TM95 are excluded, while Brilliant Diamond/Shining Pearl is reconstructed as TM01–TM100 with its former HMs represented as TM93–TM100.

The committed dataset currently follows the site's Red/Blue through Scarlet/Violet scope. Legends: Arceus has no machine system, and Legends: Z-A is outside the current dataset.

References: [PokéAPI machine resources](https://pokeapi.co/docs/v2#machines) and [cross-generation TM/HM mechanics](https://bulbapedia.bulbagarden.net/wiki/TM).
