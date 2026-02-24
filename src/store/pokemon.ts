import Alpine from 'alpinejs'
import type { Pokemon, Species, MoveDetail } from '../api/pokeapi'
import type { RoleResult } from '../logic/roleDetect'

export interface PokemonStore {
    pokemon: Pokemon | null
    species: Species | null
    moves: MoveDetail[]
    role: RoleResult | null
    isShiny: boolean
    loading: boolean
    error: string | null
    coverageCount: number
    coveragePct: number
    bannerColor: string
    spriteUrl: string
    speedTierLabel: string
    chartHighlighted: boolean
}

export function registerStore(): void {
    // Alpine.store<T> expects T to be a key of the Stores map;
    // using overload that accepts a value object directly
    Alpine.store('pokemon', {
        pokemon: null as PokemonStore['pokemon'],
        species: null as PokemonStore['species'],
        moves: [] as PokemonStore['moves'],
        role: null as PokemonStore['role'],
        isShiny: false,
        loading: false,
        error: null as string | null,
        coverageCount: 0,
        coveragePct: 0,
        bannerColor: '#7c3aed',
        spriteUrl: '',
        speedTierLabel: '',
        chartHighlighted: false,
    })
}
