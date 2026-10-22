import { z } from 'astro/zod'
import { guideSourceSchema } from './schema'

const text = z.string().trim().min(1)
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const position = z.strictObject({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() })
const sourced = { sourceIds: z.array(id).min(1) }
const located = { areaId: id.optional() }
const starterDexId = z.union([z.literal(1), z.literal(4), z.literal(7)])
const species = z.strictObject({ name: text, dexId: z.number().int().min(1).max(151) })
const partyMember = z.strictObject({
    id, name: text, dexId: z.number().int().positive(), level: z.number().int().min(1).max(100),
    moves: z.array(text).max(4),
})

// A deliberately bounded Red/Blue location pilot, separate from the v1 opening
// chapter contract. Expansion to other releases needs explicit schema review.
export const guideLocationSchema = z.strictObject({
    schemaVersion: z.literal(1), id,
    guideId: z.literal('red-blue'),
    stopId: id,
    versionIds: z.tuple([z.literal('red'), z.literal('blue')]),
    title: text,
    releaseScope: text,
    coverage: text,
    limitations: z.array(text).min(1),
    sources: z.array(guideSourceSchema).min(1),
    // Optional subareas keep a combined legacy stop without pooling cave floors.
    areas: z.array(z.strictObject({ id, name: text, description: text, ...sourced })).min(1).optional(),
    directions: z.array(z.strictObject({ id, text, ...sourced })).min(1),
    items: z.array(z.strictObject({
        id, name: text, quantity: z.number().int().positive(),
        kind: z.enum(['visible', 'hidden', 'reward', 'choice', 'gift', 'exchange']),
        location: text, requirements: text, position: position.optional(), ...located, ...sourced,
    })),
    encounters: z.array(z.strictObject({
        versionId: z.enum(['red', 'blue']), method: z.enum(['grass', 'cave']), ...located,
        denominator: z.literal(256),
        slots: z.array(z.strictObject({
            id, name: text, dexId: z.number().int().positive(),
            level: z.number().int().min(1).max(100), weight: z.number().int().min(1).max(256),
        })).length(10),
        ...sourced,
    })),
    encountersNote: text,
    encountersHeading: text.optional(),
    trainers: z.array(z.strictObject({
        id, name: text, role: z.enum(['trainer', 'leader', 'boss']),
        position: position.optional(), party: z.array(partyMember).min(1).max(6),
        requirements: text.optional(), ...located, ...sourced,
    })),
    pokemonOffers: z.array(z.strictObject({
        id, name: text, dexId: z.number().int().min(1).max(151), level: z.number().int().min(1).max(100),
        price: z.number().int().positive(), details: text, ...located, ...sourced,
    })).optional(),
    pokemonTrades: z.array(z.strictObject({
        id, give: species, receive: species.extend({ nickname: text }), details: text, ...located, ...sourced,
    })).optional(),
    // Full alternative parties, never a partial/common team passed off as complete.
    starterBattles: z.array(z.strictObject({
        id, name: text, description: text, ...located, ...sourced,
        variants: z.array(z.strictObject({
            playerStarterDexId: starterDexId, party: z.array(partyMember).min(1).max(6),
        })).length(3),
    })).optional(),
    advice: z.array(z.strictObject({ id, text, ...sourced })),
    starterHints: z.array(z.strictObject({
        id, starterDexId, text, ...sourced,
    })).max(3).optional(),
    warnings: z.array(z.strictObject({ id, text, ...sourced })),
    locator: z.strictObject({
        kind: z.literal('coordinate-plot'),
        width: z.number().int().positive(), height: z.number().int().positive(),
        description: text,
        gates: z.array(z.strictObject({ id, label: text, position })), ...sourced,
    }).optional(),
}).superRefine((location, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    const sourceMap = new Map(location.sources.map((source) => [source.id, source]))
    if (sourceMap.size !== location.sources.length) issue(['sources'], 'Duplicate source ID')
    location.sources.forEach((source, i) => {
        if (source.versionIds.some((version) => !location.versionIds.includes(version as 'red' | 'blue'))) {
            issue(['sources', i, 'versionIds'], 'Source version is outside location scope')
        }
    })
    const ids = new Set<string>()
    function checkRecord(record: { id: string; sourceIds: string[]; position?: { x: number; y: number } }, path: (string | number)[], versions: string[]) {
        if (ids.has(record.id)) issue([...path, 'id'], 'Duplicate location record ID')
        ids.add(record.id)
        for (const sourceId of record.sourceIds) {
            if (!sourceMap.has(sourceId)) issue([...path, 'sourceIds'], `Unknown source ID: ${sourceId}`)
        }
        for (const version of versions) {
            if (!record.sourceIds.some((sourceId) => sourceMap.get(sourceId)?.versionIds.some((id) => id === version))) {
                issue([...path, 'sourceIds'], `No supporting source scoped to ${version}`)
            }
        }
        if (record.position && location.locator && (record.position.x >= location.locator.width || record.position.y >= location.locator.height)) {
            issue([...path, 'position'], 'Position is outside locator bounds')
        }
    }
    for (const field of ['directions', 'items', 'trainers', 'advice', 'warnings'] as const) {
        location[field].forEach((record, i) => checkRecord(record, [field, i], location.versionIds))
    }
    const areas = new Set<string>()
    location.areas?.forEach((area, i) => {
        checkRecord(area, ['areas', i], location.versionIds)
        areas.add(area.id)
    })
    function checkArea(record: { areaId?: string }, path: (string | number)[]) {
        if (record.areaId && !areas.has(record.areaId)) issue([...path, 'areaId'], 'Unknown location area')
        if (location.areas && !record.areaId) issue([...path, 'areaId'], 'Choose an area for this location record')
    }
    for (const field of ['items', 'trainers'] as const) {
        location[field].forEach((record, i) => checkArea(record, [field, i]))
    }
    location.pokemonOffers?.forEach((offer, i) => {
        checkRecord(offer, ['pokemonOffers', i], location.versionIds)
        checkArea(offer, ['pokemonOffers', i])
    })
    location.pokemonTrades?.forEach((trade, i) => {
        checkRecord(trade, ['pokemonTrades', i], location.versionIds)
        checkArea(trade, ['pokemonTrades', i])
    })
    location.starterBattles?.forEach((battle, i) => {
        checkRecord(battle, ['starterBattles', i], location.versionIds)
        checkArea(battle, ['starterBattles', i])
        if (new Set(battle.variants.map((variant) => variant.playerStarterDexId)).size !== 3) {
            issue(['starterBattles', i, 'variants'], 'Provide one complete party for each player starter')
        }
        battle.variants.forEach((variant, j) => {
            if (new Set(variant.party.map((member) => member.id)).size !== variant.party.length) {
                issue(['starterBattles', i, 'variants', j, 'party'], 'Duplicate party slot ID')
            }
        })
    })
    location.starterHints?.forEach((hint, i) => checkRecord(hint, ['starterHints', i], location.versionIds))
    if (new Set(location.starterHints?.map((hint) => hint.starterDexId)).size !== (location.starterHints?.length ?? 0)) {
        issue(['starterHints'], 'Duplicate starter hint')
    }
    const encounteredVersions = new Map<string, Set<string>>()
    location.encounters.forEach((table, i) => {
        const key = `${table.areaId ?? 'main'}-${table.method}`
        const versions = encounteredVersions.get(key) ?? new Set<string>()
        if (versions.has(table.versionId)) issue(['encounters', i, 'versionId'], 'Duplicate encounter version for area/method')
        versions.add(table.versionId)
        encounteredVersions.set(key, versions)
        checkArea(table, ['encounters', i])
        checkRecord({ ...table, id: `encounters-${key}-${table.versionId}` }, ['encounters', i], [table.versionId])
        if (table.slots.reduce((sum, slot) => sum + slot.weight, 0) !== table.denominator) {
            issue(['encounters', i, 'slots'], 'Encounter weights must total the denominator')
        }
        const slotIds = new Set(table.slots.map((slot) => slot.id))
        if (slotIds.size !== table.slots.length) issue(['encounters', i, 'slots'], 'Duplicate encounter slot ID')
    })
    for (const versions of encounteredVersions.values()) {
        if (versions.size !== location.versionIds.length) issue(['encounters'], 'Provide encounter tables for both releases in each area/method')
    }
    location.trainers.forEach((trainer, i) => {
        if (new Set(trainer.party.map((member) => member.id)).size !== trainer.party.length) {
            issue(['trainers', i, 'party'], 'Duplicate party slot ID')
        }
    })
    if (location.locator) {
        checkRecord({ ...location.locator, id: 'locator' }, ['locator'], location.versionIds)
        for (const gate of location.locator.gates) {
            checkRecord({ ...gate, sourceIds: location.locator.sourceIds }, ['locator', 'gates', gate.id], location.versionIds)
        }
    }
})

export type GuideLocation = z.infer<typeof guideLocationSchema>
