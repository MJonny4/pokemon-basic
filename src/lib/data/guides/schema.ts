// Build/test boundary only: do not import schemas or the registry into Alpine.
import { z } from 'astro/zod'
import { GUIDE_VERSION_GROUPS, GUIDE_VERSION_IDS } from './game-versions'
import type { GameGuide } from './types'

const text = z.string().trim().min(1)
const stableId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a stable lowercase slug')
const level = z.number().int().min(1).max(100)
const speciesId = z.number().int().positive()
const versions = z.array(z.enum(GUIDE_VERSION_IDS)).min(1).refine(
    (ids) => new Set(ids).size === ids.length, 'Duplicate version ID',
)

const itemSchema = z.strictObject({ name: text, location: text, icon: text.optional() })
const wildSchema = z.strictObject({
    name: text, id: speciesId, minLevel: level, maxLevel: level,
    method: z.enum(['grass', 'surf', 'fishing', 'cave', 'gift', 'trade']),
    rarity: z.enum(['common', 'uncommon', 'rare']).optional(),
    levels: z.array(level).min(1).optional(),
    location: text.optional(), versionNote: text.optional(),
}).refine((entry) => entry.minLevel <= entry.maxLevel, {
    message: 'Minimum encounter level must not exceed maximum level', path: ['minLevel'],
}).refine((entry) => !entry.levels || (
    new Set(entry.levels).size === entry.levels.length &&
    Math.min(...entry.levels) === entry.minLevel && Math.max(...entry.levels) === entry.maxLevel
), { message: 'Exact encounter levels must be unique and match the range bounds', path: ['levels'] })

// Structural validation is not a factual audit of the legacy content.
export const legacyGuideSchema: z.ZodType<GameGuide> = z.strictObject({
    id: stableId, title: text, gen: z.number().int().min(1).max(9),
    completeness: z.enum(['early-access', 'full', 'verified']).optional(),
    starters: z.array(z.strictObject({
        name: text, id: speciesId, type: text, description: text,
    })).optional(),
    stops: z.array(z.strictObject({
        id: stableId, name: text,
        kind: z.enum(['town', 'route', 'gym', 'dungeon', 'elite-four', 'champion']),
        icon: text.optional(), steps: z.array(text), items: z.array(itemSchema),
        wildPokemon: z.array(wildSchema), tips: z.array(text).optional(),
        encounterTitle: text.optional(), encounterNote: text.optional(),
        gym: z.strictObject({
            leader: text, type: text,
            // The legacy renderer also uses this shape for Elite Four/Champion
            // battles, whose badge and TM reward strings are intentionally empty.
            badge: z.string(), tmReward: z.string(), strategy: text,
            weaknesses: z.array(text),
            // Repeated species and levels are legitimate trainer party slots.
            team: z.array(z.strictObject({ name: text, id: speciesId, level })),
            starterHints: z.record(z.string(), text).optional(),
            recommendedLevel: level.optional(),
        }).optional(),
    })).min(1),
}).superRefine((guide, ctx) => {
    const seen = new Set<string>()
    guide.stops.forEach((stop, index) => {
        if (seen.has(stop.id)) ctx.addIssue({
            code: 'custom', path: ['stops', index, 'id'], message: 'Duplicate stop ID',
        })
        seen.add(stop.id)
    })
})

export const guideSourceSchema = z.strictObject({
    id: stableId, title: text,
    url: z.url().refine((url) => url.startsWith('https://'), 'Use an HTTPS source URL'),
    locator: text,
    versionIds: versions,
    checkedOn: z.iso.date(),
    kind: z.enum(['official', 'game-disassembly', 'reference']),
})
const sourcedFields = {
    sourceIds: z.array(stableId).min(1),
    // Omitted means all chapter versions; a subset needs version-aware rendering.
    versionIds: versions.optional(),
}

export const guideChapterSchema = z.strictObject({
    schemaVersion: z.literal(1),
    id: stableId,
    guideId: z.enum(['red-blue', 'gold-silver', 'ruby-sapphire', 'diamond-pearl']),
    versionIds: versions,
    language: z.literal('en'),
    releaseScope: text,
    title: text,
    // Source checking does not assert play-through verification or full coverage.
    review: z.literal('source-checked'),
    scope: z.literal('directions-and-listed-items'),
    sources: z.array(guideSourceSchema).min(1),
    stops: z.array(z.strictObject({
        id: stableId,
        steps: z.array(z.strictObject({
            id: stableId, text,
            importance: z.enum(['required', 'optional']),
            requires: z.array(stableId).optional(),
            ...sourcedFields,
        })).min(1),
        // Replaces, rather than merges, the stop's listed items; [] clears them.
        items: z.array(itemSchema.extend({ id: stableId, ...sourcedFields })),
    })).min(1),
}).superRefine((chapter, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path, message })
    const groupVersions: readonly string[] = GUIDE_VERSION_GROUPS[chapter.guideId].versions
    chapter.versionIds.forEach((id, i) => {
        if (!groupVersions.includes(id)) issue(['versionIds', i], 'Version does not belong to this guide group')
    })
    const sources = new Map<string, typeof chapter.sources[number]>()
    chapter.sources.forEach((source, i) => {
        if (sources.has(source.id)) issue(['sources', i, 'id'], 'Duplicate source ID')
        sources.set(source.id, source)
        source.versionIds.forEach((id, j) => {
            if (!chapter.versionIds.includes(id)) issue(['sources', i, 'versionIds', j], 'Source version is outside chapter scope')
        })
    })
    const stopIds = new Set<string>()
    const stepVersions = new Map<string, readonly string[]>()
    chapter.stops.forEach((stop, i) => {
        if (stopIds.has(stop.id)) issue(['stops', i, 'id'], 'Duplicate stop ID')
        stopIds.add(stop.id)
        const itemIds = new Set<string>()
        stop.items.forEach((item, j) => {
            if (itemIds.has(item.id)) issue(['stops', i, 'items', j, 'id'], 'Duplicate item ID within stop')
            itemIds.add(item.id)
        })
        for (const [field, records] of [['steps', stop.steps], ['items', stop.items]] as const) {
            records.forEach((record, j) => {
                const path = ['stops', i, field, j]
                const applicable = record.versionIds ?? chapter.versionIds
                applicable.forEach((id) => {
                    if (!chapter.versionIds.includes(id)) issue([...path, 'versionIds'], 'Record version is outside chapter scope')
                })
                record.sourceIds.forEach((id, k) => {
                    if (!sources.has(id)) issue([...path, 'sourceIds', k], `Unknown source ID: ${id}`)
                })
                for (const version of applicable) {
                    if (!record.sourceIds.some((id) => sources.get(id)?.versionIds.includes(version))) {
                        issue([...path, 'sourceIds'], `No supporting source scoped to ${version}`)
                    }
                }
            })
        }
        stop.steps.forEach((step, j) => {
            const path = ['stops', i, 'steps', j]
            if (stepVersions.has(step.id)) issue([...path, 'id'], 'Duplicate step ID')
            const applicable = step.versionIds ?? chapter.versionIds
            for (const dependency of step.requires ?? []) {
                const prerequisiteVersions = stepVersions.get(dependency)
                if (!prerequisiteVersions || applicable.some((id) => !prerequisiteVersions.includes(id))) {
                    issue([...path, 'requires'], `Prerequisite must be an earlier step available in the same versions: ${dependency}`)
                }
            }
            stepVersions.set(step.id, applicable)
        })
    })
})

export type GuideChapter = z.infer<typeof guideChapterSchema>
