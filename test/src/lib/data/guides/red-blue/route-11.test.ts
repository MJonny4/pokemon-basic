import { describe, expect, test } from 'bun:test'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { ROUTE_11_LOCATION as route } from '../../../../../../src/lib/data/guides/red-blue/route-11'

describe('Red/Blue Route 11 source fixtures', () => {
    test('keeps a standalone composable reference on the existing Vermilion identity', () => {
        expect(guideLocationSchema.safeParse(route).success).toBeTrue()
        expect(route.id).toBe('red-blue-route-11')
        expect(route.stopId).toBe('vermilion-city')
        expect(route.versionIds).toEqual(['red', 'blue'])
        expect(route.areas?.map((area) => area.id)).toEqual(['route-11', 'route-11-gate'])
        expect(route.releaseScope).toContain('English international Game Boy Red/Blue (UE)')
        expect(route.coverage).toContain('Route 12 is a later onward boundary')
        expect(route.limitations.join(' ')).toContain('Trainer moves, AI, item use and prize money are outside')
        expect(route.locator).toBeUndefined()
    })

    test('namespaces sources and records for composition without silently pooling areas', () => {
        for (const source of route.sources) {
            expect(source.id).toStartWith('r11-')
            expect(source.url).toStartWith('https://github.com/pret/pokered/blob/af519899719f0754965776faac0e836a3b906e6d/')
            expect(source.checkedOn).toBe('2026-10-19')
            expect(source.versionIds).toEqual(['red', 'blue'])
        }
        for (const record of [...route.directions, ...route.items, ...route.trainers, ...route.pokemonTrades!, ...route.advice, ...route.warnings]) expect(record.id).toStartWith('r11-')
        for (const table of route.encounters) {
            expect(table.areaId).toBe('route-11')
            for (const slot of table.slots) expect(slot.id).toStartWith('r11-')
        }
        for (const trainer of route.trainers) {
            expect(trainer.areaId).toBe('route-11')
            for (const member of trainer.party) expect(member.id).toStartWith('r11-')
        }
    })

    test('retains all exact Red/Blue grass slots, discrete levels and integer weights', () => {
        expect(route.encounters).toHaveLength(2)
        const common = [[21, 15], [96, 9], [21, 13], [96, 13], [21, 17], [96, 11], [96, 15]]
        for (const [index, exclusiveDexId] of [[0, 23], [1, 27]]) {
            const table = route.encounters[index]
            expect(table.versionId).toBe(index === 0 ? 'red' : 'blue')
            expect(table.method).toBe('grass')
            expect(table.denominator).toBe(256)
            expect(table.slots.map((slot) => slot.weight)).toEqual([51, 51, 39, 25, 25, 25, 13, 13, 11, 3])
            expect(table.slots.map((slot) => [slot.dexId, slot.level])).toEqual([
                [exclusiveDexId, 14], common[0], [exclusiveDexId, 12], common[1], common[2], common[3], [exclusiveDexId, 15], common[4], common[5], common[6],
            ])
            expect(table.slots.filter((slot) => slot.dexId === exclusiveDexId).reduce((sum, slot) => sum + slot.weight, 0)).toBe(103)
            expect(table.slots.filter((slot) => slot.dexId === 21).reduce((sum, slot) => sum + slot.weight, 0)).toBe(89)
            expect(table.slots.filter((slot) => slot.dexId === 96).reduce((sum, slot) => sum + slot.weight, 0)).toBe(64)
            expect(table.slots.reduce((sum, slot) => sum + slot.weight, 0)).toBe(256)
        }
        expect(route.encountersNote).toContain('outside Vermilion')
        expect(route.encountersNote).toContain('no random Surf encounters')
        expect(route.encountersNote).toContain('not Pokémon inside the gate or Diglett’s Cave')
    })

    test('keeps all ten trainer identities, coordinates and complete parties including repeated members', () => {
        expect(route.trainers.map(({ id, name, position, party }) => [id, name, position, party.map((member) => `${member.dexId}:${member.level}`)])).toEqual([
            ['r11-gambler-1', 'Gambler 1', { x: 10, y: 14 }, ['60:18', '116:18']],
            ['r11-gambler-2', 'Gambler 2', { x: 26, y: 9 }, ['69:18', '43:18']],
            ['r11-youngster-1', 'Youngster 1', { x: 13, y: 5 }, ['23:21']],
            ['r11-engineer-1', 'Engineer 1', { x: 36, y: 11 }, ['81:21']],
            ['r11-youngster-2', 'Youngster 2', { x: 22, y: 4 }, ['27:19', '41:19']],
            ['r11-gambler-3', 'Gambler 3', { x: 45, y: 7 }, ['100:18', '81:18']],
            ['r11-gambler-4', 'Gambler 4', { x: 33, y: 3 }, ['58:18', '37:18']],
            ['r11-youngster-3', 'Youngster 3', { x: 43, y: 5 }, ['19:17', '19:17', '20:17']],
            ['r11-engineer-2', 'Engineer 2', { x: 45, y: 16 }, ['81:18', '81:18', '82:18']],
            ['r11-youngster-4', 'Youngster 4', { x: 22, y: 12 }, ['32:18', '33:18']],
        ])
        for (const trainer of route.trainers) {
            expect(trainer.role).toBe('trainer')
            expect(new Set(trainer.party.map((member) => member.id)).size).toBe(trainer.party.length)
            expect(trainer.party.every((member) => member.moves.length === 0)).toBeTrue()
            expect(trainer.sourceIds).toEqual(['r11-objects', 'r11-parties', 'r11-trainer-events'])
        }
        expect(route.trainers.map((trainer) => trainer.name).join(' ')).not.toContain('Super Nerd')
        expect(route.trainers.at(-1)?.party[0].name).toBe('Nidoran♂')
    })

    test('includes only the hidden Escape Rope and upstairs gift, not remake item balls', () => {
        expect(route.items.map(({ id, name, kind, quantity, areaId, position }) => ({ id, name, kind, quantity, areaId, position }))).toEqual([
            { id: 'r11-escape-rope', name: 'Escape Rope', kind: 'hidden', quantity: 1, areaId: 'route-11', position: { x: 48, y: 5 } },
            { id: 'r11-itemfinder', name: 'Itemfinder', kind: 'gift', quantity: 1, areaId: 'route-11-gate', position: { x: 2, y: 6 } },
        ])
        const rope = route.items[0]
        expect(rope.requirements).toContain('Itemfinder is not required')
        expect(rope.requirements).toContain('make space and try again')
        expect(rope.sourceIds).toContain('r11-hidden-item-retry')
        for (const item of ['Awakening', 'X Defend', 'Great Ball']) expect(route.items.some((record) => record.name === item)).toBeFalse()
    })

    test('makes the Itemfinder count distinct owned species and preserves all retry paths', () => {
        const finder = route.items[1]
        expect(finder.requirements).toContain('at least 30 distinct owned/caught species')
        expect(finder.requirements).toContain('Seen-only entries do not count')
        expect(finder.requirements).toContain('return after catching more species or clearing Bag space')
        expect(finder.requirements).toContain('refusing the gift does not lose it')
        expect(finder.sourceIds).toContain('r11-aide-engine')
        expect(route.advice.find((tip) => tip.id === 'r11-owned-not-seen')?.text).toContain('Duplicates do not increase the count')
        expect(route.advice.find((tip) => tip.id === 'r11-itemfinder-use')?.text).toContain('does not point to the exact tile')
    })

    test('uses the English Red/Blue Nidorino-to-Nidorina trade without a fixed level', () => {
        expect(route.pokemonTrades).toHaveLength(1)
        const trade = route.pokemonTrades![0]
        expect(trade.id).toBe('r11-terry-trade')
        expect(trade.areaId).toBe('route-11-gate')
        expect(trade.give).toEqual({ name: 'Nidorino', dexId: 33 })
        expect(trade.receive).toEqual({ name: 'Nidorina', dexId: 30, nickname: 'TERRY' })
        expect(trade.receive).not.toHaveProperty('level')
        expect(trade.details).toContain('same level as the Pokémon you trade away')
        expect(trade.details).toContain('in both Red and Blue')
        expect(trade.details).toContain('Bring Nidorino in your party')
        expect(trade.details).toContain('one-time trade')
        expect(trade.sourceIds).toContain('r11-trade-engine')
    })

    test('allows the early gate visit while keeping Snorlax and future Route 12 content outside the table', () => {
        expect(route.directions[0].text).toContain('Neither Cut nor Surf is required')
        expect(route.areas?.[1].description).toContain('before the sleeping Snorlax is moved')
        const warning = route.warnings.find((record) => record.id === 'r11-snorlax-boundary')!
        expect(warning.text).toContain('Snorlax is beyond it on Route 12')
        expect(warning.text).toContain('Poké Flute later')
        expect(warning.sourceIds).toContain('r11-snorlax-position')
        expect(warning.sourceIds).toContain('r11-gate-1f-events')
        expect(route.directions.at(-1)?.text).toContain('upstairs rewards do not require moving Snorlax')
        expect(route.encounters.flatMap((table) => table.slots).some((slot) => slot.dexId === 143)).toBeFalse()
        expect(route.starterBattles).toBeUndefined()
        expect(route.pokemonOffers).toBeUndefined()
    })
})
