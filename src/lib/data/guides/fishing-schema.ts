import { z } from 'astro/zod'
import { guideSourceSchema } from './schema'
import type { GameGuide } from './types'

const text = z.string().trim().min(1)
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const sourced = { sourceIds: z.array(id).min(1) }

// Bounded English Red/Blue fishing reference, independent of grass encounters
// and user progress. Review scope before extending this to another game family.
export const guideFishingSchema = z.strictObject({
    schemaVersion: z.literal(1), id,
    guideId: z.literal('red-blue'), stopId: id,
    versionIds: z.tuple([z.literal('red'), z.literal('blue')]),
    releaseScope: text,
    title: text.optional(),
    notice: text,
    sources: z.array(guideSourceSchema).min(1),
    spots: z.array(z.strictObject({
        id, name: text, directions: text, ...sourced,
        rods: z.array(z.strictObject({
            id: z.enum(['old-rod', 'good-rod', 'super-rod']),
            obtainedAt: text, ...sourced,
            catches: z.array(z.strictObject({
                dexId: z.number().int().min(1).max(151), name: text,
                level: z.number().int().min(1).max(100),
            })).min(1),
        })).min(1).max(3),
    })).min(1),
}).superRefine((section, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    const sources = new Map(section.sources.map((source) => [source.id, source]))
    if (sources.size !== section.sources.length) issue(['sources'], 'Duplicate fishing source ID')
    section.sources.forEach((source, index) => {
        if (source.versionIds.some((version) => !section.versionIds.some((id) => id === version))) {
            issue(['sources', index], 'Fishing source version is outside section scope')
        }
    })
    const checkSources = (sourceIds: string[], path: (string | number)[]) => {
        for (const sourceId of sourceIds) {
            if (!sources.has(sourceId)) issue(path, `Unknown fishing source ID: ${sourceId}`)
        }
        for (const version of section.versionIds) {
            if (!sourceIds.some((id) => sources.get(id)?.versionIds.includes(version))) {
                issue(path, `No fishing source scoped to ${version}`)
            }
        }
    }
    const spotIds = new Set<string>()
    section.spots.forEach((spot, index) => {
        if (spotIds.has(spot.id)) issue(['spots', index], 'Duplicate fishing spot ID')
        spotIds.add(spot.id)
        checkSources(spot.sourceIds, ['spots', index, 'sourceIds'])
        const rodIds = new Set<string>()
        spot.rods.forEach((rod, rodIndex) => {
            if (rodIds.has(rod.id)) issue(['spots', index, 'rods', rodIndex], 'Duplicate fishing rod')
            rodIds.add(rod.id)
            checkSources(rod.sourceIds, ['spots', index, 'rods', rodIndex, 'sourceIds'])
            if (new Set(rod.catches.map((pokemon) => `${pokemon.dexId}:${pokemon.level}`)).size !== rod.catches.length) {
                issue(['spots', index, 'rods', rodIndex, 'catches'], 'Duplicate fishing catch')
            }
        })
    })
})

export type GuideFishingSection = z.infer<typeof guideFishingSchema>

export function validateGuideFishingSections(guide: GameGuide, inputs: readonly GuideFishingSection[]): GuideFishingSection[] {
    const sections = inputs.map((input) => guideFishingSchema.parse(input))
    const ids = new Set<string>()
    const stops = new Set<string>()
    for (const section of sections) {
        if (guide.id !== section.guideId || guide.gen !== 1) throw new Error('Fishing guide identity mismatch')
        if (!guide.stops.some((stop) => stop.id === section.stopId)) throw new Error(`Unknown fishing stop ID: ${section.stopId}`)
        if (ids.has(section.id) || stops.has(section.stopId)) throw new Error('Duplicate fishing section or stop')
        ids.add(section.id)
        stops.add(section.stopId)
    }
    return sections
}
