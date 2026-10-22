import type { TeamSlot } from '../../alpine/stores/team'
import type { RedBlueOpponentManifest, RedBlueOpponentMember } from '../data/guides/red-blue/opponents'

export interface Gen1MatchupChoice {
    slotIndex: number
    pokemonName: string
    moveName: string | null
    multiplier: number | null
    ignoredMoves: number
    reason: string | null
}

export interface Gen1MatchupRow {
    opponent: RedBlueOpponentMember
    types: string[]
    choices: Gen1MatchupChoice[]
}

function moveId(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, '') }

/** Gen I type-only matchup; modern team stat fields never enter this calculation. */
export function compareGen1Team(slots: (TeamSlot | null)[], party: RedBlueOpponentMember[], data: RedBlueOpponentManifest): Gen1MatchupRow[] {
    return party.map((opponent) => {
        const types = data.species[opponent.dexId]?.types ?? []
        const choices = slots.flatMap((slot, slotIndex): Gen1MatchupChoice[] => {
            if (!slot) return []
            const base = { slotIndex, pokemonName: slot.pokemonName }
            if (!data.species[slot.pokemonId]) return [{ ...base, moveName: null, multiplier: null, ignoredMoves: 0, reason: 'Species unavailable in Red/Blue.' }]
            const selected = slot.moves.filter((name): name is string => typeof name === 'string' && name.length > 0)
            const supported = selected.map((name) => data.moves[moveId(name)]).filter((move) => Boolean(move))
            const ignoredMoves = selected.length - supported.length
            if (!types.length) return [{ ...base, moveName: null, multiplier: null, ignoredMoves, reason: 'Opponent type data unavailable.' }]
            if (!supported.length) return [{ ...base, moveName: null, multiplier: null, ignoredMoves, reason: 'No selected damaging Red/Blue move.' }]
            const ranked = supported.map((move) => ({
                moveName: move.name,
                multiplier: types.reduce((value, type) => value * (data.typeChart[move.type]?.[type] ?? 1), 1),
            })).sort((a, b) => b.multiplier - a.multiplier)
            return [{ ...base, ...ranked[0], ignoredMoves, reason: null }]
        })
        return { opponent, types, choices }
    })
}
