import { Generations, toID } from '@smogon/calc'
import type { GuideRegistration } from '../registry'
import pokemonManifest from '../../pokedex-manifest.json'

export interface RedBlueOpponentMember { id: string; name: string; dexId: number; level: number }
export interface RedBlueOpponent {
    id: string
    stopId: string
    name: string
    party?: RedBlueOpponentMember[]
    variants?: { playerStarterDexId: 1 | 4 | 7; party: RedBlueOpponentMember[] }[]
}
export interface RedBlueOpponentManifest {
    schemaVersion: 1
    guideId: 'red-blue'
    generation: 1
    opponents: RedBlueOpponent[]
    species: Record<number, { name: string; types: string[] }>
    moves: Record<string, { name: string; type: string }>
    typeChart: Record<string, Record<string, number>>
}

/** Build-only projection: exact audited rosters and the provider's Gen I type data. */
export function buildRedBlueOpponentManifest(entry: GuideRegistration): RedBlueOpponentManifest {
    if (entry.game.id !== 'red-blue') throw new Error('Opponent projection requires Red/Blue')
    const gen = Generations.get(1)
    const opponents: RedBlueOpponent[] = []
    const ids = new Set<string>()
    const add = (opponent: RedBlueOpponent) => {
        if (ids.has(opponent.id)) throw new Error(`Duplicate opponent ${opponent.id}`)
        ids.add(opponent.id)
        opponents.push(opponent)
    }
    const member = (pokemon: { id: string; name: string; dexId: number; level: number }): RedBlueOpponentMember =>
        ({ id: pokemon.id, name: pokemon.name, dexId: pokemon.dexId, level: pokemon.level })
    for (const location of entry.locations) {
        for (const trainer of location.trainers.filter((trainer) => trainer.role !== 'trainer')) {
            add({ id: `${location.stopId}:${trainer.id}`, stopId: location.stopId, name: trainer.name, party: trainer.party.map(member) })
        }
        for (const battle of location.starterBattles ?? []) {
            add({ id: `${location.stopId}:${battle.id}`, stopId: location.stopId, name: battle.name,
                variants: battle.variants.map((variant) => ({ playerStarterDexId: variant.playerStarterDexId, party: variant.party.map(member) })) })
        }
    }
    const species: RedBlueOpponentManifest['species'] = {}
    for (const entry of pokemonManifest.slice(0, 151)) {
        const pokemon = gen.species.get(toID(entry.name))
        if (!pokemon) throw new Error(`Missing Gen I species ${entry.name}`)
        species[entry.id] = { name: pokemon.name, types: pokemon.types.map((type) => type.toLowerCase()) }
    }
    const moves: RedBlueOpponentManifest['moves'] = {}
    for (const move of gen.moves) {
        if (move.basePower > 0 && move.name !== 'Struggle') moves[toID(move.name)] = { name: move.name, type: move.type.toLowerCase() }
    }
    const typeChart: RedBlueOpponentManifest['typeChart'] = {}
    for (const attack of gen.types) {
        if (attack.name === '???') continue
        const row: Record<string, number> = {}
        for (const defense of gen.types) {
            if (defense.name === '???') continue
            row[defense.name.toLowerCase()] = attack.effectiveness[defense.name] ?? 1
        }
        typeChart[attack.name.toLowerCase()] = row
    }
    return { schemaVersion: 1, guideId: 'red-blue', generation: 1, opponents, species, moves, typeChart }
}
