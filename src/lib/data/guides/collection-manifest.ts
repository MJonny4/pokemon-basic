import type { GuideCollectionManifest, GuideCollectionStop } from '../../guide-collection'
import type { GuideRegistration } from './registry'

// This list is a checklist for records already shown in the Red/Blue guide.
// It is not a regional Pokédex, an obtainable-in-one-version inventory, or an
// exhaustive optional-item catalog. IDs derive only from stable source IDs.
export function buildGuideCollectionManifest(entry: GuideRegistration): GuideCollectionManifest | null {
    if (entry.game.id !== 'red-blue') return null
    const chapters = new Map(entry.chapters.flatMap((chapter) => chapter.stops.map((stop) => [stop.id, stop] as const)))
    const locations = new Map(entry.locations.map((location) => [location.stopId, location] as const))
    const optional = new Map(entry.game.stops.map((stop) => [stop.id, entry.optionalLocations.filter((location) => location.stopId === stop.id)] as const))
    const fishing = new Map(entry.fishing.map((section) => [section.stopId, section] as const))
    const allStepIds = new Set<string>()
    const allItemIds = new Set<string>()
    const stops: GuideCollectionStop[] = entry.game.stops.map((stop) => {
        const chapter = chapters.get(stop.id)
        const location = locations.get(stop.id)
        if (Boolean(chapter) === Boolean(location)) throw new Error(`Collection needs exactly one reviewed record for ${stop.id}`)
        const stepIds = (chapter?.steps ?? location!.directions).map((step) => `${stop.id}:${step.id}`)
        if (stepIds.length !== stop.steps.length) throw new Error(`Collection step order does not match ${stop.id}`)
        for (const id of stepIds) {
            if (allStepIds.has(id)) throw new Error(`Duplicate collection step: ${id}`)
            allStepIds.add(id)
        }
        const items = [
            ...(chapter?.items.map((item) => ({ id: `${stop.id}:${item.id}`, name: item.name })) ?? []),
            ...(location?.items.filter((item) => item.name !== 'Prize money (₽)').map((item) => ({ id: `${location.id}:${item.id}`, name: item.name })) ?? []),
            ...(optional.get(stop.id) ?? []).flatMap((section) => section.items.filter((item) => item.name !== 'Prize money (₽)').map((item) => ({ id: `${section.id}:${item.id}`, name: item.name }))),
        ]
        for (const item of items) {
            if (allItemIds.has(item.id)) throw new Error(`Duplicate collection item: ${item.id}`)
            allItemIds.add(item.id)
        }
        const species = new Map<number, string>()
        if (chapter) for (const wild of stop.wildPokemon) species.set(wild.id, wild.name)
        if (stop.id === 'pallet-town') for (const starter of entry.game.starters ?? []) species.set(starter.id, starter.name)
        for (const table of location?.encounters ?? []) for (const slot of table.slots) species.set(slot.dexId, slot.name)
        for (const offer of location?.pokemonOffers ?? []) species.set(offer.dexId, offer.name)
        for (const trade of location?.pokemonTrades ?? []) species.set(trade.receive.dexId, trade.receive.name)
        for (const section of optional.get(stop.id) ?? []) {
            for (const table of section.encounters) for (const slot of table.slots) species.set(slot.dexId, slot.name)
            for (const offer of section.pokemonOffers ?? []) species.set(offer.dexId, offer.name)
            for (const trade of section.pokemonTrades ?? []) species.set(trade.receive.dexId, trade.receive.name)
        }
        for (const spot of fishing.get(stop.id)?.spots ?? []) for (const rod of spot.rods) for (const pokemon of rod.catches) species.set(pokemon.dexId, pokemon.name)
        return { stopId: stop.id, stepIds, items, species: [...species].map(([id, name]) => ({ id, name })) }
    })
    return { guideId: entry.game.id, stops }
}
