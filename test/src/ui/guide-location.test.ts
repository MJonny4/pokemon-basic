import { describe, expect, test } from 'bun:test'
import { guideEncounterCards, guideItemVisual, guidePokemonCardStyle, guidePokemonVisual } from '../../../src/ui/guide-location'
import { PEWTER_GYM_LOCATION, RED_BLUE_LOCATIONS, VIRIDIAN_FOREST_LOCATION } from '../../../src/lib/data/guides/red-blue/locations'
import { guideLocationSchema } from '../../../src/lib/data/guides/location-schema'

describe('guide Pokémon visuals', () => {
    test('keeps a neutral background and only a type-colored left border', () => {
        const style = guidePokemonCardStyle('water')
        expect(style).toContain('border-left:4px solid #')
        expect(style).toContain('background:var(--bg-surface)')
        expect(style).not.toContain('gradient')
        expect(guidePokemonCardStyle('Water')).toBe(style)
        expect(guidePokemonCardStyle('unknown')).toBe('border-left:4px solid #999;background:var(--bg-surface)')
    })
    test('supplies existing sprites and generation-correct types for every pilot Pokémon', () => {
        for (const location of RED_BLUE_LOCATIONS) {
            const pokemon = [
                ...location.encounters.flatMap((table) => table.slots),
                ...location.trainers.flatMap((trainer) => trainer.party),
                ...(location.pokemonOffers ?? []),
                ...(location.pokemonTrades ?? []).flatMap((trade) => [trade.give, trade.receive]),
                ...(location.starterBattles ?? []).flatMap((battle) => battle.variants.flatMap((variant) => variant.party)),
            ]
            for (const member of pokemon) {
                const visual = guidePokemonVisual(member.dexId, 1)
                expect(visual.spriteUrl).toEndWith(`/pokemon/${member.dexId}.png`)
                expect(visual.types.length).toBeGreaterThan(0)
                expect(visual.types).not.toContain('fairy')
                expect(visual.types).not.toContain('steel')
            }
        }
        expect(guidePokemonVisual(74, 1).types).toEqual(['rock', 'ground'])
        expect(guidePokemonVisual(95, 1).types).toEqual(['rock', 'ground'])
        expect(guidePokemonVisual(13, 1).types).toEqual(['bug', 'poison'])
        expect(guidePokemonVisual(25, 1).types).toEqual(['electric'])
    })

    test('reuses historical typing rather than silently applying modern retcons', () => {
        expect(guidePokemonVisual(35, 1).types).toEqual(['normal'])
        expect(guidePokemonVisual(81, 1).types).toEqual(['electric'])
        expect(guidePokemonVisual(81, 2).types).toEqual(['electric', 'steel'])
        const visual = guidePokemonVisual(13, 1)
        visual.types.pop()
        expect(guidePokemonVisual(13, 1).types).toEqual(['bug', 'poison'])
        expect(() => guidePokemonVisual(999999, 1)).toThrow('Missing guide Pokémon visual')
    })

    test('uses canonical catalog names for Pokédex actions, not display labels', () => {
        expect(guidePokemonVisual(29, 1).apiName).toBe('nidoran-f')
        expect(guidePokemonVisual(32, 1).apiName).toBe('nidoran-m')
        expect(guidePokemonVisual(122, 1).apiName).toBe('mr-mime')
        expect(guidePokemonVisual(124, 1).apiName).toBe('jynx')
    })
})

describe('visual encounter cards', () => {
    test('preserves exact weights and distinct levels when grouping repeated slots', () => {
        const before = structuredClone(VIRIDIAN_FOREST_LOCATION.encounters)
        const [red, blue] = VIRIDIAN_FOREST_LOCATION.encounters.map(guideEncounterCards)
        expect(red).toHaveLength(5)
        expect(blue).toHaveLength(5)
        expect(red.find((pokemon) => pokemon.name === 'Weedle')).toEqual({ name: 'Weedle', dexId: 13, weight: 115, levels: [3, 4, 5] })
        expect(blue.find((pokemon) => pokemon.name === 'Weedle')).toEqual({ name: 'Weedle', dexId: 13, weight: 13, levels: [3] })
        for (const cards of [red, blue]) {
            expect(cards.reduce((total, pokemon) => total + pokemon.weight, 0)).toBe(256)
            expect(cards.find((pokemon) => pokemon.name === 'Pikachu')?.weight).toBe(14)
        }
        expect(VIRIDIAN_FOREST_LOCATION.encounters).toEqual(before)
    })
})

describe('visual item identity', () => {
    test('uses pickup sprites without mixing modern TM34 content into Bide', () => {
        expect(VIRIDIAN_FOREST_LOCATION.items.map((item) => guideItemVisual(item).spriteUrl?.split('/').at(-1))).toEqual([
            'antidote.png', 'potion.png', 'poke-ball.png', 'potion.png', 'antidote.png',
        ])
        expect(guideItemVisual(PEWTER_GYM_LOCATION.items[0]).symbol).toBe('badge')
        expect(guideItemVisual(PEWTER_GYM_LOCATION.items[1]).spriteUrl).toEndWith('/tm-normal.png')
        expect(guideItemVisual(PEWTER_GYM_LOCATION.items[2])).toEqual({ spriteUrl: undefined, symbol: 'money' })
        expect(PEWTER_GYM_LOCATION.items[2].quantity).toBe(1386)
    })
})

describe('sourced starter preparation', () => {
    test('covers the three starters without changing their saved identities or hint levels', () => {
        expect(guideLocationSchema.safeParse(PEWTER_GYM_LOCATION).success).toBeTrue()
        const hints = PEWTER_GYM_LOCATION.starterHints!
        expect(hints.map((hint) => hint.starterDexId)).toEqual([1, 4, 7])
        expect(hints[0].text).toContain('level 13')
        expect(hints[1].text).toContain('level 12')
        expect(hints[2].text).toContain('level 8')
        expect(hints.every((hint) => hint.sourceIds.every((id) => PEWTER_GYM_LOCATION.sources.some((source) => source.id === id)))).toBeTrue()
    })

    test('rejects unsupported starters, duplicate starter hints and unknown references', () => {
        const unsupported = structuredClone(PEWTER_GYM_LOCATION)
        expect(guideLocationSchema.safeParse({ ...unsupported, starterHints: [{ ...unsupported.starterHints![0], starterDexId: 25 }] }).success).toBeFalse()
        const duplicate = structuredClone(PEWTER_GYM_LOCATION)
        duplicate.starterHints![1].starterDexId = 1
        expect(guideLocationSchema.safeParse(duplicate).success).toBeFalse()
        const unreferenced = structuredClone(PEWTER_GYM_LOCATION)
        unreferenced.starterHints![0].sourceIds = ['not-a-source']
        expect(guideLocationSchema.safeParse(unreferenced).success).toBeFalse()
        const repeatedId = structuredClone(PEWTER_GYM_LOCATION)
        repeatedId.starterHints![0].id = repeatedId.advice[0].id
        expect(guideLocationSchema.safeParse(repeatedId).success).toBeFalse()
    })
})
