/** Small browser payload derived from guide-listed records at build time. */
export interface GuideCollectionStop {
    stopId: string
    stepIds: string[]
    items: { id: string; name: string }[]
    species: { id: number; name: string }[]
}

export interface GuideCollectionManifest {
    guideId: string
    stops: GuideCollectionStop[]
}

/** Story completion remains in the legacy progress key, never in this record. */
export interface GuideCollectionState {
    schemaVersion: 1
    completedSteps: string[]
    collectedItems: string[]
    seenSpecies: number[]
    caughtSpecies: number[]
}

export function emptyGuideCollection(): GuideCollectionState {
    return { schemaVersion: 1, completedSteps: [], collectedItems: [], seenSpecies: [], caughtSpecies: [] }
}

export function parseGuideCollection(value: unknown, manifest: GuideCollectionManifest): GuideCollectionState | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    const data = value as Record<string, unknown>
    if (data.schemaVersion !== 1 || Object.keys(data).some((key) => !['schemaVersion', 'completedSteps', 'collectedItems', 'seenSpecies', 'caughtSpecies'].includes(key))) return null
    const stepIds = new Set(manifest.stops.flatMap((stop) => stop.stepIds))
    const itemIds = new Set(manifest.stops.flatMap((stop) => stop.items.map((item) => item.id)))
    const speciesIds = new Set(manifest.stops.flatMap((stop) => stop.species.map((pokemon) => pokemon.id)))
    const check = <T extends string | number>(field: unknown, known: Set<T>): field is T[] =>
        Array.isArray(field) && field.every((id) => known.has(id)) && new Set(field).size === field.length
    if (!check(data.completedSteps, stepIds) || !check(data.collectedItems, itemIds) ||
        !check(data.seenSpecies, speciesIds) || !check(data.caughtSpecies, speciesIds)) return null
    const seen = data.seenSpecies as number[]
    if ((data.caughtSpecies as number[]).some((id) => !seen.includes(id))) return null
    return {
        schemaVersion: 1,
        completedSteps: [...data.completedSteps], collectedItems: [...data.collectedItems],
        seenSpecies: [...data.seenSpecies], caughtSpecies: [...data.caughtSpecies],
    }
}

export function mergeGuideCollection(current: GuideCollectionState, imported: GuideCollectionState): GuideCollectionState {
    const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])]
    return {
        schemaVersion: 1,
        completedSteps: union(current.completedSteps, imported.completedSteps),
        collectedItems: union(current.collectedItems, imported.collectedItems),
        seenSpecies: union(current.seenSpecies, imported.seenSpecies),
        caughtSpecies: union(current.caughtSpecies, imported.caughtSpecies),
    }
}
