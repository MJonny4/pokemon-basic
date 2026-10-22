import { describe, expect, test } from 'bun:test'
import type { TeamSlot } from '../../../../src/alpine/stores/team'
import { exportShowdownSet, exportShowdownTeam, parseShowdownTeam, validateTeamSlots } from '../../../../src/lib/logic/team-portability'
import { cloneSlots, makeTeamBackup, mergeTeamLibraries, parseTeamBackup, parseTeamLibrary } from '../../../../src/lib/logic/team-library'

const stats = { hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 }
const evs = { hp: 0, attack: 252, defense: 0, 'special-attack': 0, 'special-defense': 4, speed: 252 }
const ivs = { hp: 31, attack: 31, defense: 31, 'special-attack': 0, 'special-defense': 31, speed: 31 }
const pikachu: TeamSlot = {
    pokemonName: 'pikachu', pokemonId: 25, types: ['electric'], stats, role: 'physical_sweeper',
    item: 'Light Ball', nature: 'Jolly', ability: 'static', teraType: 'flying', level: 50,
    moves: ['volt-tackle', 'quick-attack', null, null], evs, ivs,
}
const slots: (TeamSlot | null)[] = [pikachu, null, null, null, null, null]

describe('Team Lab Showdown portability', () => {
    test('one set and a six-slot team use identical export and parse all supported fields', () => {
        expect(exportShowdownTeam(slots)).toBe(exportShowdownSet(pikachu))
        const [imported] = parseShowdownTeam(exportShowdownTeam(slots))
        expect(imported).toMatchObject({
            species: 'pikachu', item: 'Light Ball', nature: 'Jolly', ability: 'static', teraType: 'flying',
            level: 50, moves: ['volt-tackle', 'quick-attack', null, null], evs, ivs,
        })
        expect(parseShowdownTeam('Mr. Mime\nLevel: 73\n- Psychic')[0].species).toBe('mr-mime')
        expect(parseShowdownTeam('Farfetch’d\n- Slash')[0].species).toBe('farfetchd')
    })

    test('rejects fields that would be lost and invalid limits before any team write', () => {
        for (const value of [
            '', 'Pikachu\nShiny: Yes', 'Spark (Pikachu)\n- Thunderbolt',
            'Pikachu\nEVs: 252 Atk / 252 Spe / 8 HP', 'Pikachu\nIVs: 32 Spe',
            'Pikachu\nLevel: 0', 'Pikachu\n- A\n- B\n- C\n- D\n- E',
            'Pikachu\nTera Type: Cosmic', 'Pikachu\nLevel: 50\nLevel: 60',
            Array(7).fill('Pikachu\n- Thunderbolt').join('\n\n'),
        ]) expect(() => parseShowdownTeam(value)).toThrow()
    })

    test('validates legacy six-slot snapshots without changing serialized bytes', () => {
        const raw = JSON.stringify(slots)
        const parsed: unknown = JSON.parse(raw)
        validateTeamSlots(parsed)
        expect(JSON.stringify(parsed)).toBe(raw)
        expect(() => validateTeamSlots([pikachu])).toThrow()
        expect(() => validateTeamSlots([{ ...pikachu, evs: { ...evs, hp: 252 } }, null, null, null, null, null])).toThrow()
        expect(() => validateTeamSlots([{ ...pikachu, moves: ['volt-tackle'] }, null, null, null, null, null])).toThrow()
    })
})

describe('Team Lab backup and named snapshots', () => {
    test('backup round trips and snapshots do not alias the current team', () => {
        const library = { schemaVersion: 1, teams: [{ id: 'test-1', name: 'Favorites', slots: cloneSlots(slots), updatedAt: '2026-10-22T10:00:00.000Z' }] }
        const activeRaw = JSON.stringify(slots)
        const backup = makeTeamBackup(activeRaw, JSON.stringify(library), '2026-10-22T11:00:00.000Z')
        expect(parseTeamBackup(JSON.stringify(backup))).toEqual(backup)
        expect(JSON.stringify(slots)).toBe(activeRaw)
        let counter = 0
        const merged = mergeTeamLibraries(library as any, backup, () => `new-${++counter}`)
        expect(merged.teams).toHaveLength(3)
        expect(merged.teams[0]).toEqual(library.teams[0])
        merged.teams[1].slots[0]!.item = 'Changed'
        expect(slots[0]!.item).toBe('Light Ball')
        expect(() => mergeTeamLibraries(library as any, backup, () => 'test-1')).toThrow()
    })

    test('rejects malformed and unsupported JSON backups without granting partial data', () => {
        const valid = makeTeamBackup(JSON.stringify(slots), null)
        for (const value of [
            '{', '{}', JSON.stringify({ ...valid, schemaVersion: 2 }),
            JSON.stringify({ ...valid, active: [pikachu] }),
            JSON.stringify({ ...valid, namedTeams: [{ id: 'x', name: '', slots, updatedAt: valid.exportedAt }] }),
            JSON.stringify({ ...valid, namedTeams: [{ id: 'x', name: 'OK', slots: [pikachu], updatedAt: valid.exportedAt }] }),
        ]) expect(() => parseTeamBackup(value)).toThrow()
        expect(() => makeTeamBackup('broken', null)).toThrow()
        expect(() => parseTeamLibrary('{')).toThrow()
    })
})
