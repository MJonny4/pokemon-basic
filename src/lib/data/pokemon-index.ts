import manifest from './pokedex-manifest.json'

export interface PokemonSummary {
    name: string
    id: number
}

/** Existing national/default-form catalog, not a game's regional availability. */
export const LOCAL_POKEMON_COUNT = manifest.length

/** Return independent summaries so a selector cannot mutate the shared catalog. */
export function localPokemonList(limit = LOCAL_POKEMON_COUNT): PokemonSummary[] {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > LOCAL_POKEMON_COUNT) {
        throw new RangeError('Requested list is outside the local Pokémon catalog')
    }
    return manifest.slice(0, limit).map(({ name, id }) => ({ name, id }))
}
