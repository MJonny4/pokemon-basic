import { guideLocationSchema, type GuideLocation } from './location-schema'
import type { GameGuide } from './types'

// Both replacements and optional references use this build-time contract. A
// reference may share a host stop with a replacement, but never creates a stop.
export function validateGuideLocations(guide: GameGuide, inputs: readonly GuideLocation[]): GuideLocation[] {
    const locations = inputs.map((input) => guideLocationSchema.parse(input))
    const stopIds = new Set<string>()
    const ids = new Set<string>()
    for (const location of locations) {
        if (location.guideId !== guide.id || guide.gen !== 1) throw new Error(`Location ${location.id}: guide identity mismatch`)
        if (!guide.stops.some((stop) => stop.id === location.stopId)) throw new Error(`Unknown location stop ID: ${location.stopId}`)
        if (stopIds.has(location.stopId) || ids.has(location.id)) throw new Error(`Duplicate location: ${location.id}`)
        stopIds.add(location.stopId)
        ids.add(location.id)
    }
    return locations
}

// The rich location view is server-rendered. Keep only directions and a marker
// in the browser payload; suppress the pilot's superseded legacy advice/data.
export function applyGuideLocations(guide: GameGuide, inputs: readonly GuideLocation[]): GameGuide {
    const locations = validateGuideLocations(guide, inputs)
    const byStop = new Map(locations.map((location) => [location.stopId, location]))
    return {
        ...guide,
        stops: guide.stops.map((stop) => {
            const location = byStop.get(stop.id)
            if (!location) return stop
            return {
                ...stop, locationPilot: true,
                steps: location.directions.map((step) => step.text),
                items: [], wildPokemon: [], tips: [], gym: undefined,
            }
        }),
    }
}
