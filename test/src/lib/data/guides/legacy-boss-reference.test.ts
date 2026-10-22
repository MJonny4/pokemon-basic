import { describe, expect, test } from 'bun:test'
import { GOLD_SILVER_GUIDE } from '../../../../../src/lib/data/guides/gold-silver'
import { RUBY_SAPPHIRE_GUIDE } from '../../../../../src/lib/data/guides/ruby-sapphire'
import { DIAMOND_PEARL_GUIDE } from '../../../../../src/lib/data/guides/diamond-pearl'
import source from '../../../../../src/lib/data/guides/legacy-boss-reference.json'

const guides = {
    'gold-silver': GOLD_SILVER_GUIDE,
    'ruby-sapphire': RUBY_SAPPHIRE_GUIDE,
    'diamond-pearl': DIAMOND_PEARL_GUIDE,
}
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

describe('original-version trainer parties from pinned game sources', () => {
    test('every listed major battle matches the original species, level and order', () => {
        expect(source.schemaVersion).toBe(1)
        let checked = 0
        for (const [gameId, reference] of Object.entries(source.references)) {
            const guide = guides[gameId as keyof typeof guides]
            expect(reference.url).toContain(reference.commit)
            expect(reference.url).toContain(reference.path)
            for (const [stopId, party] of Object.entries(reference.parties)) {
                const stop = guide.stops.find((entry) => entry.id === stopId)
                expect(stop?.gym?.team.map((member) => [key(member.name), member.level])).toEqual(
                    party.map(([name, level]) => [key(String(name)), level]),
                )
                checked++
            }
        }
        expect(checked).toBe(40)
    })

    test('known cross-version story mistakes stay corrected', () => {
        const red = GOLD_SILVER_GUIDE.stops.find((stop) => stop.id === 'mt-silver-red')!
        expect(red.gym!.team.map((member) => member.name)).toContain('Espeon')
        expect(red.gym!.team.map((member) => member.name)).not.toContain('Lapras')
        const kanto = GOLD_SILVER_GUIDE.stops.find((stop) => stop.id === 'kanto-gyms')!
        expect(kanto.steps.join(' ')).toContain('S.S. Ticket')
        expect(kanto.steps.join(' ')).toContain('Poké Doll')
        const blackthorn = GOLD_SILVER_GUIDE.stops.find((stop) => stop.id === 'gym-8-blackthorn')!
        expect(blackthorn.steps.join(' ')).toContain('Dragon Fang')
        expect(blackthorn.steps.join(' ')).not.toContain('quiz')
        const wattson = RUBY_SAPPHIRE_GUIDE.stops.find((stop) => stop.id === 'gym-3-mauville')!
        expect(wattson.steps.join(' ')).toContain('floor switches')
        const fantina = DIAMOND_PEARL_GUIDE.stops.find((stop) => stop.id === 'gym-5-hearthome')!
        expect(fantina.gym?.badge).toBe('Relic Badge')
    })
})
