import { describe, expect, test } from 'bun:test'
import { applyGuideChapters } from '../../../../../src/lib/data/guides/adapter'
import { GUIDE_VERSION_GROUPS } from '../../../../../src/lib/data/guides/game-versions'
import { GUIDE_REGISTRY } from '../../../../../src/lib/data/guides/registry'
import { RED_BLUE_GUIDE } from '../../../../../src/lib/data/guides/red-blue/index'
import { GOLD_SILVER_GUIDE } from '../../../../../src/lib/data/guides/gold-silver'
import { RUBY_SAPPHIRE_GUIDE } from '../../../../../src/lib/data/guides/ruby-sapphire'
import { DIAMOND_PEARL_GUIDE } from '../../../../../src/lib/data/guides/diamond-pearl'
import { RED_BLUE_OPENING } from '../../../../../src/lib/data/guides/red-blue/opening'
import { guideChapterSchema, legacyGuideSchema, type GuideChapter } from '../../../../../src/lib/data/guides/schema'

const legacyGuides = [RED_BLUE_GUIDE, GOLD_SILVER_GUIDE, RUBY_SAPPHIRE_GUIDE, DIAMOND_PEARL_GUIDE]

describe('nearby encounter clarity', () => {
    test('names Route 22 rather than implying grass encounters inside Viridian City', () => {
        const city = GUIDE_REGISTRY[0].game.stops.find((stop) => stop.id === 'viridian-city')!
        expect(city.name).toBe('Viridian City')
        expect(city.encounterTitle).toBe('Pokémon on nearby Route 22')
        expect(city.encounterNote).toContain('west exit')
        expect(city.encounterNote).toContain('not in the city streets')
        expect(city.wildPokemon.every((pokemon) => pokemon.location === 'Route 22 · tall grass')).toBeTrue()
        expect(city.wildPokemon.map((pokemon) => pokemon.name)).toEqual(['rattata', 'spearow', 'nidoran-m', 'nidoran-f'])
    })

    test('retains Route 22’s actual grass levels and Red/Blue differences', () => {
        const city = RED_BLUE_GUIDE.stops.find((stop) => stop.id === 'viridian-city')!
        expect(city.wildPokemon.map(({ name, minLevel, maxLevel, levels }) => ({ name, minLevel, maxLevel, levels }))).toEqual([
            { name: 'rattata', minLevel: 2, maxLevel: 4, levels: undefined },
            { name: 'spearow', minLevel: 3, maxLevel: 5, levels: [3, 5] },
            { name: 'nidoran-m', minLevel: 2, maxLevel: 4, levels: undefined },
            { name: 'nidoran-f', minLevel: 2, maxLevel: 4, levels: undefined },
        ])
        expect(city.wildPokemon[2].versionNote).toBe('Red: Lv. 2–4 · Blue: Lv. 3–4')
        expect(city.wildPokemon[3].versionNote).toBe('Red: Lv. 3–4 · Blue: Lv. 2–4')
    })

    test('rejects misleading exact-level arrays or empty area descriptions', () => {
        for (const levels of [[], [3, 3, 5], [3, 4], [2, 3, 5]]) {
            const invalid = structuredClone(RED_BLUE_GUIDE)
            invalid.stops[2].wildPokemon[1].levels = levels
            expect(legacyGuideSchema.safeParse(invalid).success).toBeFalse()
        }
        const invalid = structuredClone(RED_BLUE_GUIDE)
        invalid.stops[2].wildPokemon[0].location = ' '
        expect(legacyGuideSchema.safeParse(invalid).success).toBeFalse()
        expect(legacyGuideSchema.safeParse(RED_BLUE_GUIDE).success).toBeTrue()
    })
})

// Published stop IDs are persisted by existing browsers. Correct labels/prose,
// not these identities; a deliberate ID change needs an explicit migration.
const publishedIds = {
    'red-blue': `pallet-town route-1 viridian-city viridian-forest gym-1-pewter
        route-3-mt-moon gym-2-cerulean vermilion-city gym-3-vermilion rock-tunnel-lavender
        celadon-city gym-4-celadon lavender-tower saffron-city gym-5-fuchsia gym-6-saffron
        gym-7-cinnabar gym-8-viridian victory-road elite-four-lorelei elite-four-bruno
        elite-four-agatha elite-four-lance champion-rival`,
    'gold-silver': `new-bark-town cherrygrove-city violet-city gym-1-violet union-cave-azalea
        gym-2-azalea ilex-forest-goldenrod gym-3-goldenrod ecruteak-city gym-4-ecruteak
        olivine-cianwood gym-5-cianwood gym-6-olivine mahogany-town gym-7-mahogany
        goldenrod-radio-tower blackthorn-city gym-8-blackthorn mt-silver-victory-road
        elite-four-will elite-four-koga elite-four-bruno elite-four-karen champion-lance
        kanto-gyms mt-silver-red`,
    'ruby-sapphire': `littleroot-town oldale-route-103 petalburg-woods-rustboro gym-1-rustboro
        dewford-island gym-2-dewford slateport-mauville gym-3-mauville fallarbor-lavaridge
        gym-4-lavaridge petalburg-return gym-5-petalburg fortree-weather-institute
        gym-6-fortree lilycove-magma-aqua-hideout mossdeep-city gym-7-mossdeep
        seafloor-cavern-sootopolis gym-8-sootopolis victory-road-hoenn elite-four-sidney
        elite-four-phoebe elite-four-glacia elite-four-drake champion-steven`,
    'diamond-pearl': `twinleaf-sandgem jubilife-oreburgh gym-1-oreburgh floaroma-eternateam
        gym-2-eterna hearthome-veilstone gym-3-veilstone pastoria-great-marsh gym-4-pastoria
        celestic-canalave gym-5-canalave snowpoint-lake-acuity gym-6-snowpoint
        galactic-hq-mt-coronet gym-7-sunyshore victory-road-sinnoh elite-four-aaron
        elite-four-bertha elite-four-flint elite-four-lucian champion-cynthia postgame-battle-zone`,
}

function invalidChapter(change: (chapter: GuideChapter) => void, message: string, path?: (string | number)[]) {
    const input = structuredClone(RED_BLUE_OPENING)
    change(input)
    const result = guideChapterSchema.safeParse(input)
    expect(result.success).toBeFalse()
    if (result.success) throw new Error('Expected chapter validation to fail')
    expect(result.error.issues.some((issue) => issue.message.includes(message))).toBeTrue()
    if (path) expect(result.error.issues.some((issue) => JSON.stringify(issue.path) === JSON.stringify(path))).toBeTrue()
}

describe('guide identities and legacy compatibility', () => {
    test('preserves all four routes and every published stop ID in relative order', () => {
        expect(GUIDE_REGISTRY.map((entry) => entry.game.id)).toEqual(Object.keys(publishedIds))
        for (const entry of GUIDE_REGISTRY) {
            const ids = publishedIds[entry.versionGroupId].trim().split(/\s+/)
            const current = entry.game.stops.map((stop) => stop.id)
            expect(current.filter((id) => ids.includes(id))).toEqual(ids)
            expect(new Set(current).size).toBe(current.length)
            expect(entry.game.gen).toBe(GUIDE_VERSION_GROUPS[entry.versionGroupId].gen)
            expect(entry.versionIds).toEqual(GUIDE_VERSION_GROUPS[entry.versionGroupId].versions)
        }
        const sinnoh = GUIDE_REGISTRY.find((entry) => entry.versionGroupId === 'diamond-pearl')!.game.stops.map((stop) => stop.id)
        expect(sinnoh.slice(sinnoh.indexOf('celestic-canalave'), sinnoh.indexOf('gym-5-canalave') + 1)).toEqual([
            'celestic-canalave', 'gym-5-hearthome', 'canalave-approach', 'gym-5-canalave',
        ])
    })

    test('structurally validates existing content without treating it as factually verified', () => {
        for (const guide of legacyGuides) expect(legacyGuideSchema.safeParse(guide).success).toBeTrue()
        expect(GUIDE_REGISTRY.every((entry) => entry.review === 'needs-review')).toBeTrue()
        expect(GUIDE_REGISTRY.map((entry) => entry.coverage)).toEqual([
            'main-story', 'story-outline', 'story-outline', 'story-outline',
        ])
    })

    test('allows repeated trainer species/levels and bosses with no badge or TM', () => {
        const guide = structuredClone(RED_BLUE_GUIDE)
        const boss = guide.stops.find((stop) => stop.kind === 'elite-four')!.gym!
        boss.team.push({ ...boss.team[0] })
        boss.badge = ''
        boss.tmReward = ''
        expect(legacyGuideSchema.safeParse(guide).success).toBeTrue()
    })

    test('rejects duplicate stops and impossible encounter ranges with field paths', () => {
        const guide = structuredClone(RED_BLUE_GUIDE)
        guide.stops[1].id = guide.stops[0].id
        guide.stops[1].wildPokemon[0].minLevel = 50
        const result = legacyGuideSchema.safeParse(guide)
        expect(result.success).toBeFalse()
        if (result.success) throw new Error('Expected legacy validation to fail')
        expect(result.error.issues.map((issue) => issue.path)).toContainEqual(['stops', 1, 'id'])
        expect(result.error.issues.map((issue) => issue.path)).toContainEqual(['stops', 1, 'wildPokemon', 0, 'minLevel'])
    })
})

describe('source-checked chapter contract', () => {
    test('accepts the small English Red/Blue chapter with pinned evidence', () => {
        const chapter = guideChapterSchema.parse(RED_BLUE_OPENING)
        expect(chapter.versionIds).toEqual(['red', 'blue'])
        expect(chapter.stops.map((stop) => stop.id)).toEqual(['pallet-town', 'route-1', 'viridian-city'])
        expect(chapter.sources.every((source) => /\/blob\/[a-f0-9]{40}\//.test(source.url))).toBeTrue()
    })

    test('rejects a future schema and unrecognized fields instead of discarding them', () => {
        expect(guideChapterSchema.safeParse({ ...RED_BLUE_OPENING, schemaVersion: 2 }).success).toBeFalse()
        expect(guideChapterSchema.safeParse({ ...RED_BLUE_OPENING, verified: true }).success).toBeFalse()
    })

    test('distinguishes releases within generations and excludes unsupported editions', () => {
        invalidChapter((chapter) => { chapter.versionIds = ['gold'] }, 'Version does not belong', ['versionIds', 0])
        for (const version of ['yellow', 'green', 'firered', 'emerald', 'platinum']) {
            expect(guideChapterSchema.safeParse({ ...RED_BLUE_OPENING, versionIds: [version] }).success).toBeFalse()
        }
        invalidChapter((chapter) => { chapter.versionIds = ['red', 'red'] }, 'Duplicate version ID')
    })

    test('rejects duplicate stop, step and source identities', () => {
        invalidChapter((chapter) => { chapter.stops[1].id = chapter.stops[0].id }, 'Duplicate stop ID')
        invalidChapter((chapter) => { chapter.stops[1].steps[0].id = chapter.stops[0].steps[0].id }, 'Duplicate step ID')
        invalidChapter((chapter) => { chapter.sources.push({ ...chapter.sources[0] }) }, 'Duplicate source ID')
    })

    test('requires actual source references for both steps and items', () => {
        invalidChapter((chapter) => { chapter.stops[0].steps[0].sourceIds = ['missing'] }, 'Unknown source ID', ['stops', 0, 'steps', 0, 'sourceIds', 0])
        invalidChapter((chapter) => { chapter.stops[1].items[0].sourceIds = ['missing'] }, 'Unknown source ID')
        expect(guideChapterSchema.safeParse({ ...RED_BLUE_OPENING, sources: [] }).success).toBeFalse()
    })

    test('does not let Red-only evidence cover Blue, or unrelated versions enter a record', () => {
        invalidChapter((chapter) => { chapter.sources[0].versionIds = ['red'] }, 'No supporting source scoped to blue')
        invalidChapter((chapter) => { chapter.stops[0].steps[0].versionIds = ['gold'] }, 'Record version is outside chapter scope')
        invalidChapter((chapter) => { chapter.sources[0].versionIds = ['gold'] }, 'Source version is outside chapter scope')
    })

    test('rejects unknown, forward, cyclic and self prerequisites', () => {
        for (const dependency of ['missing', 'viridian-deliver-parcel', 'pallet-meet-oak']) {
            invalidChapter((chapter) => { chapter.stops[0].steps[0].requires = [dependency] }, 'Prerequisite must be an earlier step')
        }
    })

    test('requires safe source URLs and real ISO dates', () => {
        invalidChapter((chapter) => { chapter.sources[0].url = 'javascript:alert(1)' }, 'Use an HTTPS source URL')
        const input = structuredClone(RED_BLUE_OPENING)
        input.sources[0].checkedOn = '2026-02-30'
        expect(guideChapterSchema.safeParse(input).success).toBeFalse()
    })
})

describe('legacy renderer projection', () => {
    test('does not mutate source content or change saved-progress/starter identities', () => {
        const original = structuredClone(RED_BLUE_GUIDE)
        const projected = applyGuideChapters(RED_BLUE_GUIDE, [RED_BLUE_OPENING])
        expect(RED_BLUE_GUIDE).toEqual(original)
        expect(projected.id).toBe(original.id)
        expect(projected.starters).toEqual(original.starters)
        expect(projected.stops.slice(3)).toEqual(original.stops.slice(3))
        for (let i = 0; i < 3; i++) {
            expect(projected.stops[i].wildPokemon).toEqual(original.stops[i].wildPokemon)
            expect(projected.stops[i].tips).toEqual(original.stops[i].tips)
        }
    })

    test('projects directions/items only and excludes schema/provenance from browser payload', () => {
        const projected = applyGuideChapters(RED_BLUE_GUIDE, [RED_BLUE_OPENING])
        for (const chapterStop of RED_BLUE_OPENING.stops) {
            const stop = projected.stops.find((entry) => entry.id === chapterStop.id)!
            expect(stop.steps).toEqual(chapterStop.steps.map((step) => step.text))
        }
        expect(projected.stops[0].items).toEqual([])
        expect(projected.stops[2].items.map((item) => item.name)).toEqual(['Oak’s Parcel', 'Pokédex'])
        const payload = JSON.stringify(projected)
        for (const field of ['schemaVersion', 'sourceIds', 'checkedOn', 'pallet-meet-oak']) {
            expect(payload).not.toContain(field)
        }
    })

    test('leaves legacy-only guides unchanged', () => {
        for (const guide of legacyGuides) expect(applyGuideChapters(guide, [])).toEqual(guide)
    })

    test('rejects wrong-guide content, unknown legacy stops and overlapping replacements', () => {
        expect(() => applyGuideChapters(GOLD_SILVER_GUIDE, [RED_BLUE_OPENING])).toThrow('guide ID mismatch')
        const unknown = structuredClone(RED_BLUE_OPENING)
        unknown.stops[0].id = 'new-stop'
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [unknown])).toThrow('unknown legacy stop ID')
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [RED_BLUE_OPENING, RED_BLUE_OPENING])).toThrow('Duplicate chapter ID')
        const overlap = { ...RED_BLUE_OPENING, id: 'another-chapter' }
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [RED_BLUE_OPENING, overlap])).toThrow('Multiple chapters replace stop')
    })

    test('refuses to flatten version-specific steps into a paired-game guide', () => {
        const subset = structuredClone(RED_BLUE_OPENING)
        subset.stops[1].steps[1].versionIds = ['red']
        expect(guideChapterSchema.safeParse(subset).success).toBeTrue()
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [subset])).toThrow('version-aware renderer')
        const redOnly = structuredClone(RED_BLUE_OPENING)
        redOnly.versionIds = ['red']
        for (const source of redOnly.sources) source.versionIds = ['red']
        expect(guideChapterSchema.safeParse(redOnly).success).toBeTrue()
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [redOnly])).toThrow('paired-game renderer')
    })

    test('rejects chapter ordering that contradicts the renderer and prerequisite ordering', () => {
        const reversed = structuredClone(RED_BLUE_OPENING)
        reversed.stops.reverse()
        for (const stop of reversed.stops) {
            for (const step of stop.steps) delete step.requires
        }
        reversed.stops[2].steps[0].requires = [reversed.stops[0].steps[0].id]
        expect(guideChapterSchema.safeParse(reversed).success).toBeTrue()
        expect(() => applyGuideChapters(RED_BLUE_GUIDE, [reversed])).toThrow('stops must follow legacy render order')
    })
})
