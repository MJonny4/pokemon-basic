// Server/build imports only. The browser receives the legacy renderer projection.
import { RED_BLUE_GUIDE } from './red-blue/index'
import { GOLD_SILVER_GUIDE } from './gold-silver'
import { RUBY_SAPPHIRE_GUIDE } from './ruby-sapphire'
import { DIAMOND_PEARL_GUIDE } from './diamond-pearl'
import { RED_BLUE_OPENING } from './red-blue/opening'
import { GUIDE_VERSION_GROUPS, type GuideVersionGroupId } from './game-versions'
import { applyGuideChapters } from './adapter'
import { guideChapterSchema, type GuideChapter } from './schema'
import type { GameGuide } from './types'
import { RED_BLUE_LOCATIONS } from './red-blue/locations'
import type { GuideLocation } from './location-schema'
import { applyGuideLocations, validateGuideLocations } from './location-adapter'
import { validateGuideFishingSections, type GuideFishingSection } from './fishing-schema'
import { RED_BLUE_CERULEAN_FISHING, RED_BLUE_ROUTE_4_FISHING, RED_BLUE_VERMILION_FISHING, RED_BLUE_VIRIDIAN_FISHING } from './red-blue/fishing'
import { VERMILION_DETOURS } from './red-blue/vermilion-detours'

export interface GuideRegistration {
    game: GameGuide
    versionGroupId: GuideVersionGroupId
    versionIds: readonly string[]
    coverage: 'main-story' | 'partial' | 'story-outline'
    review: 'needs-review'
    chapters: GuideChapter[]
    locations: GuideLocation[]
    fishing: GuideFishingSection[]
    /** Optional references attach to an existing stop without replacing it. */
    optionalLocations: GuideLocation[]
}

export function registerGuide(
    versionGroupId: GuideVersionGroupId,
    legacy: GameGuide,
    coverage: GuideRegistration['coverage'],
    inputs: GuideChapter[] = [],
    locationInputs: GuideLocation[] = [],
    fishingInputs: GuideFishingSection[] = [],
    optionalInputs: GuideLocation[] = [],
): GuideRegistration {
    const group = GUIDE_VERSION_GROUPS[versionGroupId]
    if (legacy.id !== versionGroupId || legacy.gen !== group.gen) {
        throw new Error(`Guide ${legacy.id}: version group identity mismatch`)
    }
    const chapters = inputs.map((input) => guideChapterSchema.parse(input))
    const locations = validateGuideLocations(legacy, locationInputs)
    const optionalLocations = validateGuideLocations(legacy, optionalInputs)
    const fishing = validateGuideFishingSections(legacy, fishingInputs)
    const locationIds = new Set(locations.map((location) => location.id))
    if (optionalLocations.some((location) => locationIds.has(location.id))) {
        throw new Error(`Guide ${legacy.id}: replacement and optional location IDs must not overlap`)
    }
    const chapterStops = new Set(chapters.flatMap((chapter) => chapter.stops.map((stop) => stop.id)))
    if (locations.some((location) => chapterStops.has(location.stopId))) {
        throw new Error(`Guide ${legacy.id}: chapter and location replacements must not overlap`)
    }
    return {
        game: applyGuideLocations(applyGuideChapters(legacy, chapters), locations),
        versionGroupId, versionIds: group.versions,
        coverage, review: 'needs-review', chapters, locations, fishing, optionalLocations,
    }
}

export const GUIDE_REGISTRY: readonly GuideRegistration[] = [
    registerGuide('red-blue', RED_BLUE_GUIDE, 'main-story', [RED_BLUE_OPENING], RED_BLUE_LOCATIONS, [RED_BLUE_VIRIDIAN_FISHING, RED_BLUE_ROUTE_4_FISHING, RED_BLUE_CERULEAN_FISHING, RED_BLUE_VERMILION_FISHING], [VERMILION_DETOURS]),
    registerGuide('gold-silver', GOLD_SILVER_GUIDE, 'story-outline'),
    registerGuide('ruby-sapphire', RUBY_SAPPHIRE_GUIDE, 'story-outline'),
    registerGuide('diamond-pearl', DIAMOND_PEARL_GUIDE, 'story-outline'),
]
