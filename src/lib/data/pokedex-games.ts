// The /pokedex selector entries. Each mainline game pair shows ONLY its newly
// introduced Pokémon (dex ranges from GEN_RANGES); "all" and "shiny" span the
// full 1025. Shared by the selector page, getStaticPaths, and listing pages.
import { GEN_RANGES } from './constants'

export interface PokedexGame {
    slug: string
    title: string
    /** 0 = not gen-specific (all / shiny) */
    gen: number
    range: [number, number]
    shiny: boolean
    accent: string
}

const game = (slug: string, title: string, gen: number, accent: string): PokedexGame => ({
    slug, title, gen, range: GEN_RANGES[gen], shiny: false, accent,
})

// Accents are Apple system colors — the closest vivid match to each game's hue.
export const POKEDEX_GAMES: PokedexGame[] = [
    { slug: 'all', title: 'All Pokémon', gen: 0, range: [1, 1025], shiny: false, accent: '#007AFF' }, // systemBlue
    game('red-blue', 'Red / Blue', 1, '#FF3B30'),           // systemRed
    game('gold-silver', 'Gold / Silver', 2, '#FFCC00'),     // systemYellow (gold)
    game('ruby-sapphire', 'Ruby / Sapphire', 3, '#FF2D55'), // systemPink (vivid ruby)
    game('diamond-pearl', 'Diamond / Pearl', 4, '#30B0C7'), // systemTeal (icy diamond)
    game('black-white', 'Black / White', 5, '#8E8E93'),     // systemGray
    game('x-y', 'X / Y', 6, '#5856D6'),                     // systemIndigo
    game('sun-moon', 'Sun / Moon', 7, '#FF9500'),           // systemOrange (sun)
    game('sword-shield', 'Sword / Shield', 8, '#32ADE6'),   // systemCyan
    game('scarlet-violet', 'Scarlet / Violet', 9, '#AF52DE'), // systemPurple (violet)
    { slug: 'shiny', title: 'Shiny Pokédex', gen: 0, range: [1, 1025], shiny: true, accent: '#FFD60A' }, // systemYellow (dark variant — sparkle gold)
]
