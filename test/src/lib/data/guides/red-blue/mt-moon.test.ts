import { describe, expect, test } from 'bun:test'
import { guideLocationSchema, type GuideLocation } from '../../../../../../src/lib/data/guides/location-schema'
import { ROUTE_3_MT_MOON_LOCATION as location } from '../../../../../../src/lib/data/guides/red-blue/mt-moon'
import { guideEncounterCards, guideItemVisual } from '../../../../../../src/ui/guide-location'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'

const encounter = (areaId: string, version = 'red') => location.encounters.find((table) => table.areaId === areaId && table.versionId === version)!
function invalid(change: (input: GuideLocation) => void, message: string) {
    const input = structuredClone(location)
    change(input)
    const result = guideLocationSchema.safeParse(input)
    expect(result.success).toBeFalse()
    if (result.success) throw new Error('Expected invalid multi-area location')
    expect(result.error.issues.some((issue) => issue.message.includes(message))).toBeTrue()
}

describe('Route 3 and Mt. Moon source fixtures', () => {
    test('keeps the existing combined progress identity and distinct map areas', () => {
        expect(location.stopId).toBe('route-3-mt-moon')
        expect(guideLocationSchema.safeParse(location).success).toBeTrue()
        expect(location.areas?.map((area) => area.id)).toEqual(['route-3', 'route-4-west', 'mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f', 'route-4-east'])
        expect(location.encounters).toHaveLength(10)
        for (const area of ['route-3', 'mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f', 'route-4-east']) {
            expect(location.encounters.filter((table) => table.areaId === area).map((table) => table.versionId)).toEqual(['red', 'blue'])
        }
        expect(location.encounters.some((table) => table.areaId === 'route-4-west')).toBeFalse()
        expect(GUIDE_REGISTRY[0].game.stops.find((stop) => stop.id === location.stopId)?.locationPilot).toBeTrue()
    })

    test('records all ground-item entries with the correct map and local coordinates', () => {
        expect(location.items.map((item) => [item.areaId, item.name, item.kind, item.position?.x, item.position?.y])).toEqual([
            ['mt-moon-1f', 'Potion', 'visible', 2, 20],
            ['mt-moon-1f', 'Moon Stone', 'visible', 2, 2],
            ['mt-moon-1f', 'Rare Candy', 'visible', 35, 31],
            ['mt-moon-1f', 'Escape Rope', 'visible', 36, 23],
            ['mt-moon-1f', 'Potion', 'visible', 20, 33],
            ['mt-moon-1f', 'TM12 Water Gun', 'visible', 5, 32],
            ['mt-moon-b2f', 'HP Up', 'visible', 25, 21],
            ['mt-moon-b2f', 'TM01 Mega Punch', 'visible', 29, 5],
            ['mt-moon-b2f', 'Moon Stone', 'hidden', 18, 12],
            ['mt-moon-b2f', 'Ether', 'hidden', 33, 9],
            ['mt-moon-b2f', 'Dome Fossil', 'choice', 12, 6],
            ['mt-moon-b2f', 'Helix Fossil', 'choice', 13, 6],
            ['route-4-east', 'TM04 Whirlwind', 'visible', 57, 3],
            ['route-4-east', 'Great Ball', 'hidden', 40, 3],
        ])
        expect(location.items.every((item) => item.quantity === 1)).toBeTrue()
        expect(location.items.filter((item) => item.kind === 'choice')).toHaveLength(2)
        for (const fossil of location.items.filter((item) => item.kind === 'choice')) {
            expect(fossil.requirements).toContain('you cannot collect both')
            expect(fossil.requirements).toContain('Defeat the Super Nerd')
        }
        expect(location.items.some((item) => ['route-3', 'route-4-west', 'mt-moon-b1f'].includes(item.areaId!))).toBeFalse()
        expect(location.items.every((item) => guideItemVisual(item).spriteUrl)).toBeTrue()
        expect(guideItemVisual(location.items.find((item) => item.name === 'TM12 Water Gun')!).spriteUrl).toEndWith('/tm-water.png')
        expect(guideItemVisual(location.items.find((item) => item.name === 'TM01 Mega Punch')!).spriteUrl).toEndWith('/tm-normal.png')
    })

    test('does not replace sparse exact cave levels with invented ranges', () => {
        const expected: Record<string, (string | number)[][]> = {
            'mt-moon-1f': [['Zubat', 8], ['Zubat', 7], ['Zubat', 9], ['Geodude', 8], ['Zubat', 6], ['Zubat', 10], ['Geodude', 10], ['Paras', 8], ['Zubat', 11], ['Clefairy', 8]],
            'mt-moon-b1f': [['Zubat', 8], ['Zubat', 7], ['Geodude', 7], ['Geodude', 8], ['Zubat', 9], ['Paras', 10], ['Zubat', 10], ['Zubat', 11], ['Clefairy', 9], ['Geodude', 9]],
            'mt-moon-b2f': [['Zubat', 9], ['Geodude', 9], ['Zubat', 10], ['Geodude', 10], ['Zubat', 11], ['Paras', 10], ['Paras', 12], ['Clefairy', 10], ['Zubat', 12], ['Clefairy', 12]],
        }
        for (const [area, slots] of Object.entries(expected)) {
            const red = encounter(area)
            const blue = encounter(area, 'blue')
            expect(red.method).toBe('cave')
            expect(red.slots.map((slot) => [slot.name, slot.level])).toEqual(slots)
            expect(blue.slots.map((slot) => [slot.name, slot.level, slot.weight])).toEqual(red.slots.map((slot) => [slot.name, slot.level, slot.weight]))
            expect(red.slots.map((slot) => slot.weight)).toEqual([51, 51, 39, 25, 25, 25, 13, 13, 11, 3])
        }
        expect(guideEncounterCards(encounter('mt-moon-1f')).find((row) => row.name === 'Geodude')?.levels).toEqual([8, 10])
        expect(guideEncounterCards(encounter('mt-moon-b2f')).find((row) => row.name === 'Clefairy')).toEqual({ name: 'Clefairy', dexId: 35, levels: [10, 12], weight: 16 })
    })

    test('separates Route 3 Jigglypuff from Route 4 version exclusives and the cave', () => {
        expect(encounter('route-3').slots.map((slot) => [slot.name, slot.level])).toEqual([
            ['Pidgey', 6], ['Spearow', 5], ['Pidgey', 7], ['Spearow', 6], ['Spearow', 7], ['Pidgey', 8], ['Spearow', 8], ['Jigglypuff', 3], ['Jigglypuff', 5], ['Jigglypuff', 7],
        ])
        expect(guideEncounterCards(encounter('route-3')).find((row) => row.name === 'Jigglypuff')).toEqual({ name: 'Jigglypuff', dexId: 39, levels: [3, 5, 7], weight: 27 })
        for (const version of ['red', 'blue']) {
            const table = encounter('route-4-east', version)
            const exclusive = version === 'red' ? 'Ekans' : 'Sandshrew'
            expect(table.method).toBe('grass')
            expect(table.slots.map((slot) => [slot.name, slot.level])).toEqual([
                ['Rattata', 10], ['Spearow', 10], ['Rattata', 8], [exclusive, 6], ['Spearow', 8], [exclusive, 10], ['Rattata', 12], ['Spearow', 12], [exclusive, 8], [exclusive, 12],
            ])
            expect(guideEncounterCards(table).find((row) => row.name === exclusive)?.weight).toBe(64)
            expect(table.slots.some((slot) => slot.name === 'Jigglypuff')).toBeFalse()
        }
    })

    test('retains all trainer parties, repeated members and the later Surf-only battle', () => {
        expect(location.trainers.map((trainer) => trainer.party.map((member) => `${member.name}:${member.level}`))).toEqual([
            ['Caterpie:10', 'Weedle:10', 'Caterpie:10'], ['Rattata:11', 'Ekans:11'], ['Pidgey:9', 'Pidgey:9'],
            ['Weedle:9', 'Kakuna:9', 'Caterpie:9', 'Metapod:9'], ['Rattata:10', 'Nidoran♂:10'], ['Spearow:14'], ['Caterpie:11', 'Metapod:11'], ['Jigglypuff:14'],
            ['Geodude:10', 'Geodude:10', 'Onix:10'], ['Rattata:10', 'Rattata:10', 'Zubat:10'], ['Oddish:11', 'Bellsprout:11'], ['Magnemite:11', 'Voltorb:11'], ['Clefairy:14'], ['Weedle:11', 'Kakuna:11'], ['Caterpie:10', 'Metapod:10', 'Caterpie:10'],
            ['Grimer:12', 'Voltorb:12', 'Koffing:12'], ['Rattata:13', 'Zubat:13'], ['Sandshrew:11', 'Rattata:11', 'Zubat:11'], ['Zubat:12', 'Ekans:12'], ['Raticate:16'], ['Paras:31', 'Paras:31', 'Parasect:31'],
        ])
        expect(location.trainers.filter((trainer) => trainer.areaId === 'route-3')).toHaveLength(8)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'mt-moon-1f')).toHaveLength(7)
        expect(location.trainers.filter((trainer) => trainer.areaId === 'mt-moon-b2f')).toHaveLength(5)
        expect(location.trainers.some((trainer) => trainer.areaId === 'mt-moon-b1f')).toBeFalse()
        expect(location.trainers.at(-1)?.requirements).toContain('using Surf')
        expect(location.trainers.every((trainer) => trainer.party.every((member) => member.moves.length === 0))).toBeTrue()
    })

    test('keeps the paid Magikarp separate from wild tables and fossil choices', () => {
        expect(location.pokemonOffers).toHaveLength(1)
        expect(location.pokemonOffers![0]).toMatchObject({ name: 'Magikarp', dexId: 129, level: 5, price: 500, areaId: 'route-4-west' })
        expect(location.pokemonOffers![0].details).toContain('once-only')
        expect(location.encounters.some((table) => table.slots.some((slot) => slot.dexId === 129))).toBeFalse()
        expect(location.warnings.find((warning) => warning.id === 'moon-ledge-warning')?.text).toContain('one-way ledges')
        const payload = JSON.stringify(GUIDE_REGISTRY[0].game)
        for (const field of ['pokemonOffers', 'moon-magikarp-offer', 'moon-trainer-parties', 'moon-1f-wild']) expect(payload).not.toContain(field)
    })
})

describe('multi-area location validation', () => {
    test('requires every map-local entry to reference a known area', () => {
        invalid((input) => { input.items[0].areaId = 'missing' }, 'Unknown location area')
        invalid((input) => { delete input.trainers[0].areaId }, 'Choose an area')
        invalid((input) => { input.encounters[0].areaId = 'missing' }, 'Unknown location area')
        invalid((input) => { delete input.pokemonOffers![0].areaId }, 'Choose an area')
        invalid((input) => { input.areas![1].id = input.areas![0].id }, 'Duplicate location record ID')
        invalid((input) => { input.areas![0].sourceIds = ['missing'] }, 'Unknown source ID')
        invalid((input) => { input.pokemonOffers![0].sourceIds = ['missing'] }, 'Unknown source ID')
    })

    test('validates releases independently per area and method', () => {
        invalid((input) => { input.encounters.pop() }, 'Provide encounter tables for both releases in each area/method')
        invalid((input) => { input.encounters[1].areaId = 'route-3'; input.encounters[1].method = 'grass' }, 'Duplicate encounter version')
        invalid((input) => { input.encounters[5].method = 'cave' }, 'Provide encounter tables for both releases in each area/method')
        invalid((input) => { input.encounters[0].slots[0].weight = 50 }, 'Encounter weights must total')
        invalid((input) => { input.trainers[0].party[1].id = input.trainers[0].party[0].id }, 'Duplicate party slot ID')
    })
})
