// Server/build imports only. The browser receives the legacy renderer projection.
import { RED_BLUE_GUIDE } from './red-blue'
import { GOLD_SILVER_GUIDE } from './gold-silver'
import { RUBY_SAPPHIRE_GUIDE } from './ruby-sapphire'
import { DIAMOND_PEARL_GUIDE } from './diamond-pearl'
import { RED_BLUE_OPENING } from './red-blue-opening'
import { GUIDE_VERSION_GROUPS, type GuideVersionGroupId } from './game-versions'
import { applyGuideChapters } from './adapter'
import { guideChapterSchema, type GuideChapter } from './schema'
import type { GameGuide } from './types'
import { RED_BLUE_LOCATIONS } from './red-blue-locations'
import { guideLocationSchema, type GuideLocation } from './location-schema'
import { applyGuideLocations } from './location-adapter'
import { validateGuideFishingSections, type GuideFishingSection } from './fishing-schema'
import { RED_BLUE_CERULEAN_FISHING, RED_BLUE_ROUTE_4_FISHING, RED_BLUE_VERMILION_FISHING, RED_BLUE_VIRIDIAN_FISHING } from './red-blue-fishing'

export interface GuideRegistration {
    game: GameGuide
    versionGroupId: GuideVersionGroupId
    versionIds: readonly string[]
    coverage: 'partial' | 'story-outline'
    review: 'needs-review'
    chapters: GuideChapter[]
    locations: GuideLocation[]
    fishing: GuideFishingSection[]
}

function register(
    versionGroupId: GuideVersionGroupId,
    legacy: GameGuide,
    coverage: GuideRegistration['coverage'],
    inputs: GuideChapter[] = [],
    locationInputs: GuideLocation[] = [],
    fishingInputs: GuideFishingSection[] = [],
): GuideRegistration {
    const group = GUIDE_VERSION_GROUPS[versionGroupId]
    if (legacy.id !== versionGroupId || legacy.gen !== group.gen) {
        throw new Error(`Guide ${legacy.id}: version group identity mismatch`)
    }
    const chapters = inputs.map((input) => guideChapterSchema.parse(input))
    const locations = locationInputs.map((input) => guideLocationSchema.parse(input))
    const fishing = validateGuideFishingSections(legacy, fishingInputs)
    const chapterStops = new Set(chapters.flatMap((chapter) => chapter.stops.map((stop) => stop.id)))
    if (locations.some((location) => chapterStops.has(location.stopId))) {
        throw new Error(`Guide ${legacy.id}: chapter and location replacements must not overlap`)
    }
    return {
        game: applyGuideLocations(applyGuideChapters(legacy, chapters), locations),
        versionGroupId, versionIds: group.versions,
        coverage, review: 'needs-review', chapters, locations, fishing,
    }
}

export const GUIDE_REGISTRY: readonly GuideRegistration[] = [
    register('red-blue', RED_BLUE_GUIDE, 'partial', [RED_BLUE_OPENING], RED_BLUE_LOCATIONS, [RED_BLUE_VIRIDIAN_FISHING, RED_BLUE_ROUTE_4_FISHING, RED_BLUE_CERULEAN_FISHING, RED_BLUE_VERMILION_FISHING]),
    register('gold-silver', GOLD_SILVER_GUIDE, 'story-outline'),
    register('ruby-sapphire', RUBY_SAPPHIRE_GUIDE, 'story-outline'),
    register('diamond-pearl', DIAMOND_PEARL_GUIDE, 'story-outline'),
]
