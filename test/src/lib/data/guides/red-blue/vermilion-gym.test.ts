import { describe, expect, test } from 'bun:test'
import { VERMILION_GYM_LOCATION as gym } from '../../../../../../src/lib/data/guides/red-blue/vermilion-gym'
import { RED_BLUE_GUIDE } from '../../../../../../src/lib/data/guides/red-blue/index'
import { GUIDE_REGISTRY } from '../../../../../../src/lib/data/guides/registry'
import { guideLocationSchema } from '../../../../../../src/lib/data/guides/location-schema'
import { guideItemVisual, guidePokemonVisual } from '../../../../../../src/ui/guide-location'
import { applyGuideLocations } from '../../../../../../src/lib/data/guides/location-adapter'

describe('Red/Blue Vermilion Gym source fixtures', () => {
    test('replaces only the existing gym stop and leaves storage identities and later stops intact', () => {
        expect(guideLocationSchema.safeParse(gym).success).toBeTrue()
        expect(gym.stopId).toBe('gym-3-vermilion')
        const guide = GUIDE_REGISTRY[0].game
        expect(guide.stops).toHaveLength(24)
        expect(guide.stops.map((stop) => stop.id)).toEqual(RED_BLUE_GUIDE.stops.map((stop) => stop.id))
        expect(guide.starters).toEqual(RED_BLUE_GUIDE.starters)
        const gymOnly = applyGuideLocations(RED_BLUE_GUIDE, [gym])
        expect(gymOnly.stops.filter((stop) => stop.id !== gym.stopId)).toEqual(RED_BLUE_GUIDE.stops.filter((stop) => stop.id !== gym.stopId))
        const projected = guide.stops.find((stop) => stop.id === gym.stopId)!
        expect(projected.name).toBe('Vermilion City Gym — Lt. Surge')
        expect(projected.locationPilot).toBeTrue()
        expect(projected.steps).toEqual(gym.directions.map((step) => step.text))
        expect(projected.gym).toBeUndefined()
        expect(projected.items).toEqual([])
        expect(projected.wildPokemon).toEqual([])
        expect(projected.tips).toEqual([])
        for (const field of ['surge-special-move', 'sourceIds', 'surge-prize-money', 'trainers']) expect(JSON.stringify(projected)).not.toContain(field)
        expect(JSON.stringify(projected)).not.toContain('Raichu at level 28')
    })

    test('keeps the three-Pokémon Red/Blue team and the actual third-slot special move', () => {
        const leader = gym.trainers.find((trainer) => trainer.role === 'leader')!
        expect(leader.position).toEqual({ x: 5, y: 1 })
        expect(leader.party.map(({ name, dexId, level, moves }) => ({ name, dexId, level, moves }))).toEqual([
            { name: 'Voltorb', dexId: 100, level: 21, moves: ['Tackle', 'Screech', 'SonicBoom'] },
            { name: 'Pikachu', dexId: 25, level: 18, moves: ['ThunderShock', 'Growl', 'Thunder Wave', 'Quick Attack'] },
            { name: 'Raichu', dexId: 26, level: 24, moves: ['ThunderShock', 'Growl', 'Thunderbolt'] },
        ])
        expect(leader.sourceIds).toContain('surge-special-move')
        expect(leader.sourceIds).toContain('surge-trainer-engine')
        expect(leader.party[0].moves).not.toContain('Selfdestruct')
        expect(leader.party[2].moves).not.toContain('Thunder Wave')
        expect(leader.party[2].moves).not.toContain('Mega Punch')
    })

    test('resolves the Rocker class instead of trusting the Super Nerd sprite and retains repeated members', () => {
        const ordinary = gym.trainers.filter((trainer) => trainer.role === 'trainer')
        expect(ordinary.map((trainer) => [trainer.name, trainer.position, trainer.party.map((member) => `${member.name}:${member.level}`)])).toEqual([
            ['Gentleman', { x: 9, y: 6 }, ['Pikachu:23']],
            ['Rocker', { x: 3, y: 8 }, ['Voltorb:20', 'Magnemite:20', 'Voltorb:20']],
            ['Sailor', { x: 0, y: 10 }, ['Pikachu:21', 'Pikachu:21']],
        ])
        expect(ordinary[1].party[1].moves).toEqual(['Tackle'])
        expect(guidePokemonVisual(81, 1).types).toEqual(['electric'])
        for (const trainer of ordinary) {
            expect(trainer.requirements).toContain('before defeating Lt. Surge')
            expect(trainer.sourceIds).toContain('surge-events')
            expect(new Set(trainer.party.map((member) => member.id)).size).toBe(trainer.party.length)
        }
        expect(ordinary[2].party[0].moves).toEqual(['ThunderShock', 'Growl', 'Thunder Wave', 'Quick Attack'])
    })

    test('distinguishes badge, retryable TM and actual prize without handing out the Fly HM', () => {
        expect(gym.items.map(({ name, quantity, kind }) => ({ name, quantity, kind }))).toEqual([
            { name: 'Thunder Badge', quantity: 1, kind: 'reward' },
            { name: 'TM24 Thunderbolt', quantity: 1, kind: 'reward' },
            { name: 'Prize money (₽)', quantity: 2376, kind: 'reward' },
        ])
        expect(gym.items[1].location).toContain('talk again if your Bag was full')
        expect(gym.items[1].requirements).toContain('badge is still awarded')
        expect(gym.items[0].requirements).toContain('does not give you its HM')
        expect(gym.directions.at(-1)?.text).toContain('separately obtain HM02')
        expect(guideItemVisual(gym.items[0])).toEqual({ spriteUrl: undefined, symbol: 'badge' })
        expect(guideItemVisual(gym.items[1]).spriteUrl).toEndWith('/tm-electric.png')
        expect(guideItemVisual(gym.items[2])).toEqual({ spriteUrl: undefined, symbol: 'money' })
    })

    test('describes the real reset and upper-left second-lock exception without a guaranteed solver', () => {
        expect(gym.directions.find((step) => step.id === 'surge-first-switch')?.text).toContain('15 trash cans')
        const second = gym.directions.find((step) => step.id === 'surge-second-switch')!
        expect(second.text).toContain('next can check')
        expect(second.text).toContain('not diagonally')
        expect(second.text).toContain('wrong second check resets')
        expect(second.text).toContain('adjacency is not guaranteed')
        const warning = gym.warnings.find((warning) => warning.id === 'surge-puzzle-exception')!
        expect(warning.text).toContain('upper-left')
        expect(warning.text).toContain('(1, 7)')
        expect(warning.text).toContain('not the separate bin by Surge')
        expect(warning.text).toContain('not a guaranteed solution')
        expect(warning.sourceIds).toEqual(['surge-puzzle', 'surge-puzzle-positions'])
    })

    test('warns that victory disables all three ordinary battles and keeps ground advice conditional', () => {
        expect(gym.warnings.find((warning) => warning.id === 'surge-missable-trainers')?.text).toContain('all three ordinary gym trainers')
        const advice = gym.advice.map((tip) => tip.text).join(' ')
        expect(advice).toContain('Diglett learns Dig at level 19')
        expect(advice).toContain('Pikachu’s Quick Attack')
        expect(advice).toContain('SonicBoom')
        expect(advice).toContain('does not prevent every attack')
        expect(gym.starterHints?.map((hint) => hint.starterDexId)).toEqual([1, 4, 7])
        expect(gym.starterHints?.[0].text).toContain('Grass typing resists Electric')
        expect(gym.starterHints?.[1].text).toContain('Charizard')
        expect(gym.starterHints?.[2].text).toContain('Water line is weak')
    })

    test('keeps gym encounters empty and refers back to the town fishing rather than inventing gym catches', () => {
        expect(gym.encounters).toEqual([])
        expect(gym.encountersNote).toContain('no wild encounters or fishing spots inside this gym')
        expect(GUIDE_REGISTRY[0].fishing.some((section) => section.stopId === gym.stopId)).toBeFalse()
        expect(gym.pokemonTrades).toBeUndefined()
        expect(gym.pokemonOffers).toBeUndefined()
        expect(gym.locator).toBeUndefined()
    })
})
