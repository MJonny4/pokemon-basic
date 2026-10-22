import { describe, expect, test } from 'bun:test'
import { CERULEAN_LOCATION as location } from '../../../../../../src/lib/data/guides/red-blue/cerulean'
import { guideLocationSchema, type GuideLocation } from '../../../../../../src/lib/data/guides/location-schema'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { guideEncounterCards, guideItemVisual } from '../../../../../../src/ui/guide-location'

function invalid(change: (input: GuideLocation) => void, message?: string) {
    const input = structuredClone(location)
    change(input)
    const result = guideLocationSchema.safeParse(input)
    expect(result.success).toBeFalse()
    if (result.success) throw new Error('Expected invalid Cerulean location')
    if (message) expect(result.error.issues.some((issue) => issue.message.includes(message))).toBeTrue()
}
const encounter = (areaId: string, version: 'red' | 'blue' = 'red') => location.encounters.find((table) => table.areaId === areaId && table.versionId === version)!

describe('Cerulean and northern-route source fixtures', () => {
    test('preserves the existing stop and separates town/gym from two nearby grass areas', () => {
        expect(guideLocationSchema.safeParse(location).success).toBeTrue()
        expect(location.stopId).toBe('gym-2-cerulean')
        expect(location.areas?.map((area) => area.id)).toEqual(['cerulean-city', 'cerulean-gym', 'route-24', 'route-25', 'bills-house'])
        expect(location.encounters.map((table) => [table.areaId, table.versionId, table.method])).toEqual([
            ['route-24', 'red', 'grass'], ['route-25', 'red', 'grass'], ['route-24', 'blue', 'grass'], ['route-25', 'blue', 'grass'],
        ])
        expect(GUIDE_REGISTRY[0].game.stops.find((stop) => stop.id === location.stopId)?.locationPilot).toBeTrue()
        const payload = JSON.stringify(GUIDE_REGISTRY[0].game)
        for (const field of ['starterBattles', 'pokemonTrades', 'route-25-tm-access', 'cerulean-jynx-trade', 'playerStarterDexId']) expect(payload).not.toContain(field)
        const steps = location.directions.map((step) => step.id)
        expect(steps.indexOf('cerulean-rival-first')).toBeLessThan(steps.indexOf('cerulean-bridge'))
        expect(location.directions.at(-1)?.text).toContain('S.S. Ticket')
    })

    test('uses Red/Blue Misty moves, types and prize rather than Yellow/remake moves', () => {
        const misty = location.trainers.find((trainer) => trainer.role === 'leader')!
        expect(misty.party.map(({ name, dexId, level, moves }) => ({ name, dexId, level, moves }))).toEqual([
            { name: 'Staryu', dexId: 120, level: 18, moves: ['Tackle', 'Water Gun'] },
            { name: 'Starmie', dexId: 121, level: 21, moves: ['Tackle', 'Water Gun', 'BubbleBeam'] },
        ])
        expect(misty.party.flatMap((member) => member.moves)).not.toContain('Harden')
        expect(misty.party.flatMap((member) => member.moves)).not.toContain('Recover')
        expect(location.items.find((item) => item.id === 'misty-prize-money')?.quantity).toBe(2079)
        expect(location.items.find((item) => item.id === 'misty-tm11')?.requirements).toContain('Bag space')
        expect(location.starterHints!.find((hint) => hint.starterDexId === 7)?.text).toContain('reduced damage')
        expect(location.warnings.find((warning) => warning.id === 'misty-missable-trainers')?.text).toContain('disables their battles')
    })

    test('keeps NPC gifts and later exchanges distinct from pickups and battle rewards', () => {
        expect(location.items.map((item) => [item.name, item.areaId, item.kind, item.quantity, item.position ?? null])).toEqual([
            ['Cascade Badge', 'cerulean-gym', 'reward', 1, null],
            ['TM11 BubbleBeam', 'cerulean-gym', 'reward', 1, null],
            ['Prize money (₽)', 'cerulean-gym', 'reward', 2079, null],
            ['Rare Candy', 'cerulean-city', 'hidden', 1, { x: 15, y: 8 }],
            ['TM28 Dig', 'cerulean-city', 'reward', 1, null],
            ['Bicycle', 'cerulean-city', 'exchange', 1, null],
            ['Nugget', 'route-24', 'gift', 1, null],
            ['TM45 Thunder Wave', 'route-24', 'visible', 1, { x: 10, y: 5 }],
            ['TM19 Seismic Toss', 'route-25', 'visible', 1, { x: 22, y: 2 }],
            ['Ether', 'route-25', 'hidden', 1, { x: 38, y: 3 }],
            ['Elixir', 'route-25', 'hidden', 1, { x: 10, y: 1 }],
            ['S.S. Ticket', 'bills-house', 'gift', 1, null],
        ])
        expect(location.items.find((item) => item.name === 'Nugget')?.location).toContain('BEFORE his battle')
        expect(location.items.find((item) => item.name === 'Bicycle')?.requirements).toContain('Vermilion')
        expect(location.items.find((item) => item.name === 'TM19 Seismic Toss')?.requirements).toContain('walks out')
        expect(location.items.find((item) => item.name === 'S.S. Ticket')?.requirements).toContain('house guard')
        expect(guideItemVisual(location.items[0]).symbol).toBe('badge')
        expect(guideItemVisual(location.items[2])).toEqual({ spriteUrl: undefined, symbol: 'money' })
        const sprites = location.items.filter((item) => guideItemVisual(item).spriteUrl).map((item) => guideItemVisual(item).spriteUrl!.split('/').at(-1))
        expect(sprites).toEqual(['tm-water.png', 'rare-candy.png', 'tm-ground.png', 'bicycle.png', 'nugget.png', 'tm-electric.png', 'tm-fighting.png', 'ether.png', 'elixir.png', 'ss-ticket.png'])
    })

    test('retains every fixed trainer party, bridge order and repeated members', () => {
        expect(location.trainers).toHaveLength(20)
        expect(location.trainers.slice(1).map((trainer) => trainer.party.map((member) => `${member.name}:${member.level}`))).toEqual([
            ['Goldeen:19'], ['Horsea:16', 'Shellder:16'], ['Machop:17', 'Drowzee:17'],
            ['Caterpie:14', 'Weedle:14'], ['Pidgey:14', 'Nidoran♀:14'], ['Rattata:14', 'Ekans:14', 'Zubat:14'], ['Pidgey:16', 'Nidoran♀:16'], ['Mankey:18'], ['Ekans:15', 'Zubat:15'], ['Rattata:14', 'Ekans:14'],
            ['Rattata:15', 'Spearow:15'], ['Slowpoke:17'], ['Rattata:14', 'Ekans:14'], ['Nidoran♂:15', 'Nidoran♀:15'], ['Ekans:14', 'Sandshrew:14'], ['Oddish:13', 'Pidgey:13', 'Oddish:13'], ['Machop:15', 'Geodude:15'], ['Geodude:13', 'Geodude:13', 'Machop:13', 'Geodude:13'], ['Onix:17'],
        ])
        expect(location.trainers.filter((trainer) => trainer.areaId === 'route-24')).toHaveLength(7)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'route-25')).toHaveLength(9)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'cerulean-gym')).toHaveLength(3)
        expect(location.trainers.slice(1).every((trainer) => trainer.party.every((member) => member.moves.length === 0))).toBeTrue()
    })

    test('maps the PLAYER starter to complete rival parties without evolved starters', () => {
        expect(location.starterBattles).toHaveLength(1)
        const battle = location.starterBattles![0]
        expect(battle.areaId).toBe('cerulean-city')
        expect(battle.description).toContain('BEFORE Route 24')
        expect(battle.variants.map((variant) => [variant.playerStarterDexId, variant.party.map((member) => `${member.name}:${member.level}`)])).toEqual([
            [1, ['Pidgeotto:18', 'Abra:15', 'Rattata:15', 'Charmander:17']],
            [4, ['Pidgeotto:18', 'Abra:15', 'Rattata:15', 'Squirtle:17']],
            [7, ['Pidgeotto:18', 'Abra:15', 'Rattata:15', 'Bulbasaur:17']],
        ])
        expect(battle.description).toContain('does not change your saved starter')
    })

    test('records exact nearby-route slots for both releases, not a merged town pool', () => {
        const expected = {
            'route-24': {
                red: [['Weedle', 7], ['Kakuna', 8], ['Pidgey', 12], ['Oddish', 12], ['Oddish', 13], ['Abra', 10], ['Oddish', 14], ['Pidgey', 13], ['Abra', 8], ['Abra', 12]],
                blue: [['Caterpie', 7], ['Metapod', 8], ['Pidgey', 12], ['Bellsprout', 12], ['Bellsprout', 13], ['Abra', 10], ['Bellsprout', 14], ['Pidgey', 13], ['Abra', 8], ['Abra', 12]],
            },
            'route-25': {
                red: [['Weedle', 8], ['Kakuna', 9], ['Pidgey', 13], ['Oddish', 12], ['Oddish', 13], ['Abra', 12], ['Oddish', 14], ['Abra', 10], ['Metapod', 7], ['Caterpie', 8]],
                blue: [['Caterpie', 8], ['Metapod', 9], ['Pidgey', 13], ['Bellsprout', 12], ['Bellsprout', 13], ['Abra', 12], ['Bellsprout', 14], ['Abra', 10], ['Kakuna', 7], ['Weedle', 8]],
            },
        }
        for (const [areaId, versions] of Object.entries(expected)) {
            for (const version of ['red', 'blue'] as const) {
                expect(encounter(areaId, version).slots.map((slot) => [slot.name, slot.level])).toEqual(versions[version])
                expect(encounter(areaId, version).slots.map((slot) => slot.weight)).toEqual([51, 51, 39, 25, 25, 25, 13, 13, 11, 3])
            }
        }
        expect(guideEncounterCards(encounter('route-24')).find((row) => row.dexId === 63)).toEqual({ name: 'Abra', dexId: 63, levels: [8, 10, 12], weight: 39 })
        expect(guideEncounterCards(encounter('route-25')).find((row) => row.dexId === 63)).toEqual({ name: 'Abra', dexId: 63, levels: [10, 12], weight: 38 })
        expect(guideEncounterCards(encounter('route-25', 'blue')).find((row) => row.dexId === 13)?.weight).toBe(3)
    })

    test('keeps the international Jynx exchange separate and does not invent a fixed level', () => {
        expect(location.pokemonTrades).toHaveLength(1)
        const trade = location.pokemonTrades![0]
        expect(trade.give).toEqual({ name: 'Poliwhirl', dexId: 61 })
        expect(trade.receive).toEqual({ name: 'Jynx', dexId: 124, nickname: 'LOLA' })
        expect(trade.areaId).toBe('cerulean-city')
        expect(trade.details).toContain('not a wild encounter or a free gift')
        expect(trade.receive).not.toHaveProperty('level')
        expect(location.encounters.flatMap((table) => table.slots).some((slot) => slot.dexId === 124)).toBeFalse()
        expect(location.advice.find((advice) => advice.id === 'cerulean-abra-help')?.text).toContain('Alakazam requires a trade')
        expect(location.advice.find((advice) => advice.id === 'cerulean-bill-pokedex')?.text).toContain('not Pokémon gifts')
    })
})

describe('starter-battle and NPC exchange validation', () => {
    test('requires all three supported player choices and valid full party slots', () => {
        invalid((input) => { input.starterBattles![0].variants[1].playerStarterDexId = 1 }, 'one complete party for each player starter')
        invalid((input) => { input.starterBattles![0].variants.pop() })
        invalid((input) => { input.starterBattles![0].variants[0].party = [] })
        invalid((input) => { input.starterBattles![0].variants[0].party[0].level = 101 })
        invalid((input) => { input.starterBattles![0].variants[0].party[1].id = 'slot-1' }, 'Duplicate party slot ID')
        expect(guideLocationSchema.safeParse({ ...location, starterBattles: [{ ...location.starterBattles![0], variants: [{ ...location.starterBattles![0].variants[0], playerStarterDexId: 25 }] }] }).success).toBeFalse()
    })

    test('checks exchange/battle references, areas and identities like existing sections', () => {
        invalid((input) => { input.starterBattles![0].sourceIds = ['missing'] }, 'Unknown source ID')
        invalid((input) => { input.starterBattles![0].areaId = 'missing' }, 'Unknown location area')
        invalid((input) => { input.starterBattles![0].id = input.trainers[0].id }, 'Duplicate location record ID')
        invalid((input) => { input.pokemonTrades![0].sourceIds = ['missing'] }, 'Unknown source ID')
        invalid((input) => { delete input.pokemonTrades![0].areaId }, 'Choose an area')
        invalid((input) => { input.pokemonTrades![0].receive.dexId = 152 })
        invalid((input) => { input.pokemonTrades![0].receive.nickname = '' })
    })
})
