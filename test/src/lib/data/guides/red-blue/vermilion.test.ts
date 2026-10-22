import { describe, expect, test } from 'bun:test'
import { VERMILION_LOCATION as location } from '../../../../../../src/lib/data/guides/red-blue/vermilion'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { guideEncounterCards, guideItemVisual, guidePokemonVisual } from '../../../../../../src/ui/guide-location'

describe('Vermilion approach and S.S. Anne source fixtures', () => {
    test('keeps the existing stop identity and does not silently skip the southern approach', () => {
        expect(guideLocationSchema.safeParse(location).success).toBeTrue()
        expect(location.stopId).toBe('vermilion-city')
        expect(location.areas?.map((area) => area.id)).toEqual(['route-5', 'underground-ns', 'route-6', 'vermilion-town', 'anne-1f', 'anne-b1f', 'anne-kitchen', 'anne-2f', 'anne-bow', 'anne-captain'])
        expect(location.directions[0].text).toContain('north–south tunnel')
        expect(location.directions[0].text).toContain('Saffron gate')
        expect(location.directions.at(-1)?.text).toContain('next separate stop')
        const projected = GUIDE_REGISTRY[0].game
        expect(projected.stops.find((stop) => stop.id === location.stopId)?.locationPilot).toBeTrue()
        expect(location.areas?.some((area) => area.id === 'vermilion-gym')).toBeFalse()
        const payload = JSON.stringify(projected)
        for (const field of ['vermilion-parties', 'anne-hm01', 'vermilion-weights', 'starterBattles', 'pokemonTrades']) expect(payload).not.toContain(field)
    })

    test('records every bounded pickup/gift and the actual Red/Blue TMs with local map coordinates', () => {
        expect(location.items.map((item) => [item.name, item.areaId, item.kind, item.position ?? null])).toEqual([
            ['Full Restore', 'underground-ns', 'hidden', { x: 3, y: 4 }],
            ['X Special', 'underground-ns', 'hidden', { x: 4, y: 34 }],
            ['Old Rod', 'vermilion-town', 'gift', null],
            ['Bike Voucher', 'vermilion-town', 'gift', null],
            ['TM08 Body Slam', 'anne-1f', 'visible', { x: 12, y: 15 }],
            ['Ether', 'anne-b1f', 'visible', { x: 20, y: 2 }],
            ['TM44 Rest', 'anne-b1f', 'visible', { x: 10, y: 2 }],
            ['Max Potion', 'anne-b1f', 'visible', { x: 12, y: 11 }],
            ['Hyper Potion', 'anne-b1f', 'hidden', { x: 3, y: 1 }],
            ['Great Ball', 'anne-kitchen', 'hidden', { x: 13, y: 9 }],
            ['Max Ether', 'anne-2f', 'visible', { x: 12, y: 1 }],
            ['Rare Candy', 'anne-2f', 'visible', { x: 0, y: 12 }],
            ['HM01 Cut', 'anne-captain', 'gift', null],
        ])
        expect(location.items.every((item) => item.quantity === 1)).toBeTrue()
        expect(location.items.some((item) => /Good Rod|TM32|Double Team/.test(item.name))).toBeFalse()
        expect(location.items.every((item) => guideItemVisual(item).spriteUrl)).toBeTrue()
        expect(guideItemVisual(location.items.find((item) => item.name === 'TM08 Body Slam')!).spriteUrl).toEndWith('/tm-normal.png')
        expect(guideItemVisual(location.items.find((item) => item.name === 'TM44 Rest')!).spriteUrl).toEndWith('/tm-psychic.png')
    })

    test('distinguishes corridor doorways from the cabin-map item square', () => {
        const pickups = location.items.filter((item) => ['anne-tm08', 'anne-ether', 'anne-tm44', 'anne-max-potion', 'anne-max-ether', 'anne-rare-candy'].includes(item.id))
        expect(pickups.map((item) => item.location)).toEqual([
            '1F cabin entered through the corridor door at (11, 8). The item is at cabin-map square (12, 15).',
            'Basement cabin entered at corridor (15, 3); item at cabin-map (20, 2).',
            'Basement cabin entered at corridor (11, 3); item at cabin-map (10, 2).',
            'Basement cabin entered at corridor (23, 3); item at cabin-map (12, 11).',
            '2F cabin entered at corridor (13, 11); item at cabin-map (12, 1).',
            '2F cabin entered at corridor (21, 11); item at cabin-map (0, 12).',
        ])
    })

    test('warns on the actual departure trigger and retryable Bag-full HM gift', () => {
        const departure = location.warnings.find((warning) => warning.id === 'anne-departure-warning')!
        expect(departure.text).toContain('Walking off with HM01 triggers departure')
        expect(departure.text).toContain('does not immediately eject')
        expect(departure.sourceIds).toContain('vermilion-departure')
        const bag = location.warnings.find((warning) => warning.id === 'anne-bag-warning')!
        expect(bag.text).toContain('received HM01, not merely')
        expect(bag.text).toContain('speak to him again')
        expect(location.items.at(-1)?.requirements).toContain('Cascade Badge')
        expect(location.items.find((item) => item.name === 'Bike Voucher')?.requirements).toContain('Cerulean')
    })

    test('keeps all six approach battles and sixteen ship battles with duplicate party slots intact', () => {
        expect(location.trainers).toHaveLength(22)
        expect(location.trainers.map((trainer) => trainer.party.map((member) => `${member.name}:${member.level}`))).toEqual([
            ['Squirtle:20'], ['Rattata:16', 'Pikachu:16'], ['Weedle:16', 'Caterpie:16', 'Weedle:16'], ['Spearow:16', 'Raticate:16'], ['Pidgey:16', 'Pidgey:16', 'Pidgey:16'], ['Butterfree:20'],
            ['Growlithe:18', 'Growlithe:18'], ['Nidoran♂:19', 'Nidoran♀:19'], ['Nidoran♂:21'], ['Pidgey:18', 'Nidoran♀:18'],
            ['Pikachu:23'], ['Goldeen:17', 'Tentacool:17', 'Goldeen:17'], ['Growlithe:17', 'Ponyta:17'], ['Rattata:18', 'Pikachu:18'],
            ['Shellder:21'], ['Horsea:17', 'Shellder:17', 'Tentacool:17'], ['Tentacool:18', 'Staryu:18'], ['Horsea:17', 'Horsea:17', 'Horsea:17'], ['Machop:20'], ['Tentacool:17', 'Staryu:17', 'Shellder:17'],
            ['Machop:18', 'Shellder:18'], ['Machop:17', 'Tentacool:17'],
        ])
        expect(location.trainers.filter((trainer) => trainer.areaId === 'route-6')).toHaveLength(6)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'anne-1f')).toHaveLength(4)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'anne-2f')).toHaveLength(4)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'anne-b1f')).toHaveLength(6)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'anne-bow')).toHaveLength(2)
        expect(location.trainers.every((trainer) => trainer.party.every((member) => member.moves.length === 0))).toBeTrue()
    })

    test('uses the scripted Rival2 teams, not the placeholder map-object or Cerulean team', () => {
        expect(location.starterBattles).toHaveLength(1)
        const battle = location.starterBattles![0]
        expect(battle.sourceIds).toContain('anne-rival')
        expect(battle.variants.map((variant) => [variant.playerStarterDexId, variant.party.map((member) => `${member.name}:${member.level}`)])).toEqual([
            [1, ['Pidgeotto:19', 'Raticate:16', 'Kadabra:18', 'Charmeleon:20']],
            [4, ['Pidgeotto:19', 'Raticate:16', 'Kadabra:18', 'Wartortle:20']],
            [7, ['Pidgeotto:19', 'Raticate:16', 'Kadabra:18', 'Ivysaur:20']],
        ])
        expect(battle.description).toContain('does not change your saved starter')
    })

    test('keeps identical Route 5/6 grass tables separately scoped and exact for each version', () => {
        expect(location.encounters.map((table) => [table.areaId, table.versionId])).toEqual([['route-5', 'red'], ['route-6', 'red'], ['route-5', 'blue'], ['route-6', 'blue']])
        for (const version of ['red', 'blue'] as const) {
            const grass = version === 'red' ? 'Oddish' : 'Bellsprout'
            const exclusive = version === 'red' ? 'Mankey' : 'Meowth'
            for (const table of location.encounters.filter((table) => table.versionId === version)) {
                expect(table.method).toBe('grass')
                expect(table.slots.map((slot) => [slot.name, slot.level])).toEqual([
                    [grass, 13], ['Pidgey', 13], ['Pidgey', 15], [exclusive, 10], [exclusive, 12], [grass, 15], [grass, 16], ['Pidgey', 16], [exclusive, 14], [exclusive, 16],
                ])
                expect(table.slots.map((slot) => slot.weight)).toEqual([51, 51, 39, 25, 25, 25, 13, 13, 11, 3])
                expect(guideEncounterCards(table).find((row) => row.name === exclusive)?.weight).toBe(64)
                expect(guideEncounterCards(table).find((row) => row.name === grass)?.levels).toEqual([13, 15, 16])
            }
        }
    })

    test('labels NPC trades as exchanges rather than wild encounters or fixed-level gifts', () => {
        expect(location.pokemonTrades?.map((trade) => [trade.areaId, trade.give, trade.receive] as const)).toEqual([
            ['route-5', { name: 'Nidoran♂', dexId: 32 }, { name: 'Nidoran♀', dexId: 29, nickname: 'SPOT' }],
            ['vermilion-town', { name: 'Spearow', dexId: 21 }, { name: 'Farfetch’d', dexId: 83, nickname: 'DUX' }],
        ])
        expect(location.pokemonTrades!.every((trade) => !('level' in trade.receive))).toBeTrue()
        expect(guidePokemonVisual(83, 1).apiName).toBe('farfetchd')
        expect(location.encounters.flatMap((table) => table.slots).some((slot) => [29, 32, 83].includes(slot.dexId))).toBeFalse()
    })
})
