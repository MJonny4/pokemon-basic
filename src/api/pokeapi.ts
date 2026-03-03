// Interfaces — model only what the app actually uses
export interface PokemonSprites {
    front_default: string | null
    front_shiny: string | null
    other: {
        'official-artwork': {
            front_default: string | null
            front_shiny: string | null
        }
    }
}

export interface StatEntry {
    base_stat: number
    stat: { name: string }
}

export interface TypeEntry {
    type: { name: string }
}

export interface AbilityEntry {
    ability: { name: string; url: string }
    is_hidden: boolean
}

export interface MoveEntry {
    move: { name: string; url: string }
    version_group_details: Array<{
        level_learned_at: number
        move_learn_method: { name: string }
        version_group: { name: string }
    }>
}

export interface Pokemon {
    id: number
    name: string
    height: number
    weight: number
    base_experience: number
    sprites: PokemonSprites
    stats: StatEntry[]
    types: TypeEntry[]
    abilities: AbilityEntry[]
    moves: MoveEntry[]
}

export interface Species {
    flavor_text_entries: Array<{ flavor_text: string; language: { name: string }; version: { name: string } }>
    genera: Array<{ genus: string; language: { name: string } }>
    evolution_chain: { url: string }
    is_baby: boolean
    generation: { name: string }
}

export interface MoveDetail {
    name: string
    power: number | null
    accuracy: number | null
    pp: number | null
    type: { name: string }
    damage_class: { name: string }
    level_learned_at: number
    learn_method: 'level-up' | 'machine' | 'hm' | 'egg' | 'tutor'
    effect_entries: Array<{ short_effect: string; language: { name: string } }>
}

export interface AbilityDetail {
    effect_entries: Array<{ short_effect: string; language: { name: string } }>
    flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }>
}

export interface EvolutionDetail {
    trigger: { name: string }
    min_level: number | null
    item: { name: string } | null
    held_item: { name: string } | null
    known_move: { name: string } | null
    min_happiness: number | null
    time_of_day: string
}

export interface EvolutionChain {
    chain: EvolutionNode
}

export interface EvolutionNode {
    species: { name: string }
    evolution_details: EvolutionDetail[]
    evolves_to: EvolutionNode[]
}

import { HM_MOVES } from '../data/constants'
import movesDataJson from '../data/moves-data.json'
import { idbGet, idbSet, TTL } from './idb-cache'

interface LocalMoveData {
    power: number | null
    accuracy: number | null
    pp: number | null
    type: string
    damage_class: string
    effect: string
}
const MOVES_DB = movesDataJson as unknown as Record<string, LocalMoveData>

// Pure fetch functions — throw on failure, caller handles errors
const BASE = 'https://pokeapi.co/api/v2'

const cache = {
    pokemon: new Map<string, Pokemon>(),
    species: new Map<string, Species>(),
    evolution: new Map<string, EvolutionChain>(),
    pokemonList: null as Array<{ name: string; id: number }> | null,
}

export async function fetchPokemon(name: string): Promise<Pokemon> {
    const key = name.toLowerCase()
    if (cache.pokemon.has(key)) return cache.pokemon.get(key)!
    const idbKey = `pokemon/${key}`
    const cached = await idbGet<Pokemon>(idbKey)
    if (cached) { cache.pokemon.set(key, cached); return cached }
    const r = await fetch(`${BASE}/pokemon/${key}`)
    if (!r.ok) throw new Error(`Pokemon not found: ${name}`)
    const data: Pokemon = await r.json()
    cache.pokemon.set(key, data)
    idbSet(idbKey, data, TTL.POKEMON)
    return data
}

export async function fetchSpecies(name: string): Promise<Species> {
    const key = name.toLowerCase()
    if (cache.species.has(key)) return cache.species.get(key)!
    const idbKey = `species/${key}`
    const cached = await idbGet<Species>(idbKey)
    if (cached) { cache.species.set(key, cached); return cached }
    const r = await fetch(`${BASE}/pokemon-species/${key}`)
    if (!r.ok) throw new Error(`Species not found: ${name}`)
    const data: Species = await r.json()
    cache.species.set(key, data)
    idbSet(idbKey, data, TTL.SPECIES)
    return data
}

export async function fetchPokemonList(limit = 1025): Promise<Array<{ name: string; id: number }>> {
    if (cache.pokemonList) return cache.pokemonList
    const idbKey = `pokemon-list/${limit}`
    const cached = await idbGet<Array<{ name: string; id: number }>>(idbKey)
    if (cached) { cache.pokemonList = cached; return cached }
    const r = await fetch(`${BASE}/pokemon?limit=${limit}`)
    const d = await r.json()
    const result = d.results.map((p: { name: string; url: string }) => ({
        name: p.name,
        id: parseInt(p.url.split('/').filter(Boolean).pop()!),
    }))
    cache.pokemonList = result
    idbSet(idbKey, result, TTL.POKEMON_LIST)
    return result
}

// Ordered newest-to-oldest; used to pick the canonical level for a move
const VERSION_GROUP_PRIORITY = [
    'scarlet-violet',
    'sword-shield',
    'brilliant-diamond-shining-pearl',
    'legends-arceus',
    'ultra-sun-ultra-moon',
    'sun-moon',
    'omega-ruby-alpha-sapphire',
    'x-y',
    'black-2-white-2',
    'black-white',
    'heartgold-soulsilver',
    'platinum',
    'diamond-pearl',
    'firered-leafgreen',
    'emerald',
    'ruby-sapphire',
    'crystal',
    'gold-silver',
    'red-blue',
]

export async function fetchMoves(moveEntries: MoveEntry[], limit = 80): Promise<MoveDetail[]> {
    const queue: Array<{ entry: MoveEntry; level: number; learn_method: 'level-up' | 'machine' | 'hm' }> = []
    const seen = new Set<string>()

    // Level-up moves first — pick level from the highest-priority version group
    for (const e of moveEntries) {
        const luEntries = e.version_group_details.filter((d) => d.move_learn_method.name === 'level-up')
        if (luEntries.length === 0) continue

        // Walk priority list newest→oldest. A version group can have multiple entries for the
        // same move (e.g. level 0 reminder + level 10 actual). Take the max within that group.
        // Skip groups where max level is ≤ 1 (reminder/pre-evo only) and keep looking for a
        // game that actually teaches it at a real level.
        let bestLevel: number | undefined
        let foundAnyPriority = false
        for (const vg of VERSION_GROUP_PRIORITY) {
            const vgEntries = luEntries.filter((d) => d.version_group.name === vg)
            if (vgEntries.length === 0) continue
            foundAnyPriority = true
            const maxLevel = Math.max(...vgEntries.map((d) => d.level_learned_at))
            if (maxLevel > 1) { bestLevel = maxLevel; break }
            if (bestLevel === undefined) bestLevel = maxLevel // level 0/1 fallback
        }

        // No priority version group found — require >= 3 cross-version appearances to filter noise
        if (!foundAnyPriority) {
            if (luEntries.length < 3) continue
            const progression = luEntries.filter((d) => d.level_learned_at > 1)
            bestLevel = progression.length > 0 ? Math.min(...progression.map((d) => d.level_learned_at)) : 1
        }

        queue.push({ entry: e, level: bestLevel ?? 1, learn_method: 'level-up' })
        seen.add(e.move.name)
    }

    // TM/HM moves — skip anything already covered by level-up
    for (const e of moveEntries) {
        if (seen.has(e.move.name)) continue
        if (e.version_group_details.some((d) => d.move_learn_method.name === 'machine')) {
            const method = HM_MOVES.has(e.move.name) ? 'hm' : 'machine'
            queue.push({ entry: e, level: 0, learn_method: method })
        }
    }

    // Level-up moves sorted by level, TMs after
    queue.sort((a, b) => {
        if (a.learn_method !== b.learn_method) return a.learn_method === 'level-up' ? -1 : 1
        return a.level - b.level
    })

    const results: MoveDetail[] = []
    for (const { entry, level, learn_method } of queue.slice(0, limit)) {
        const local = MOVES_DB[entry.move.name]
        if (!local) continue
        results.push({
            name: entry.move.name,
            power: local.power,
            accuracy: local.accuracy,
            pp: local.pp,
            type: { name: local.type },
            damage_class: { name: local.damage_class },
            level_learned_at: level,
            learn_method,
            effect_entries: [{ short_effect: local.effect, language: { name: 'en' } }],
        })
    }

    // Egg moves — skips anything already in level-up/machine
    for (const e of moveEntries) {
        if (seen.has(e.move.name)) continue
        if (!e.version_group_details.some((d) => d.move_learn_method.name === 'egg')) continue
        const local = MOVES_DB[e.move.name]
        if (!local) continue
        results.push({
            name: e.move.name,
            power: local.power,
            accuracy: local.accuracy,
            pp: local.pp,
            type: { name: local.type },
            damage_class: { name: local.damage_class },
            level_learned_at: 0,
            learn_method: 'egg',
            effect_entries: [{ short_effect: local.effect, language: { name: 'en' } }],
        })
        seen.add(e.move.name)
    }

    // Tutor moves — skips anything already in level-up/machine/egg
    for (const e of moveEntries) {
        if (seen.has(e.move.name)) continue
        if (!e.version_group_details.some((d) => d.move_learn_method.name === 'tutor')) continue
        const local = MOVES_DB[e.move.name]
        if (!local) continue
        results.push({
            name: e.move.name,
            power: local.power,
            accuracy: local.accuracy,
            pp: local.pp,
            type: { name: local.type },
            damage_class: { name: local.damage_class },
            level_learned_at: 0,
            learn_method: 'tutor',
            effect_entries: [{ short_effect: local.effect, language: { name: 'en' } }],
        })
        seen.add(e.move.name)
    }

    return results
}

const typeListCache = new Map<string, Array<{ name: string; id: number }>>()

export async function fetchPokemonsByType(type: string): Promise<Array<{ name: string; id: number }>> {
    const key = type.toLowerCase()
    if (typeListCache.has(key)) return typeListCache.get(key)!
    const idbKey = `type/${key}`
    const cached = await idbGet<Array<{ name: string; id: number }>>(idbKey)
    if (cached) { typeListCache.set(key, cached); return cached }
    const r = await fetch(`${BASE}/type/${key}`)
    if (!r.ok) return []
    const d = await r.json()
    const result = (d.pokemon as Array<{ pokemon: { name: string; url: string } }>)
        .map((p) => ({
            name: p.pokemon.name,
            id: parseInt(p.pokemon.url.split('/').filter(Boolean).pop() ?? '9999'),
        }))
        .filter((p) => !isNaN(p.id) && p.id <= 1025)
        .sort((a, b) => a.id - b.id)
    typeListCache.set(key, result)
    idbSet(idbKey, result, TTL.TYPE_LIST)
    return result
}

export async function fetchAbilities(abilityEntries: AbilityEntry[]): Promise<AbilityDetail[]> {
    return Promise.all(abilityEntries.map(async (a) => {
        const idbKey = `ability/${a.ability.url}`
        const cached = await idbGet<AbilityDetail>(idbKey)
        if (cached) return cached
        const data: AbilityDetail = await fetch(a.ability.url).then((r) => r.json())
        idbSet(idbKey, data, TTL.ABILITY)
        return data
    }))
}

export async function fetchEvolutionChain(url: string): Promise<EvolutionChain> {
    if (cache.evolution.has(url)) return cache.evolution.get(url)!
    const idbKey = `evolution/${url}`
    const cached = await idbGet<EvolutionChain>(idbKey)
    if (cached) { cache.evolution.set(url, cached); return cached }
    const r = await fetch(url)
    const data: EvolutionChain = await r.json()
    cache.evolution.set(url, data)
    idbSet(idbKey, data, TTL.EVOLUTION)
    return data
}
