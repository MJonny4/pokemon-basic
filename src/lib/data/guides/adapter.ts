import { GUIDE_VERSION_GROUPS } from './game-versions'
import { guideChapterSchema, legacyGuideSchema, type GuideChapter } from './schema'
import type { GameGuide } from './types'

// Project only existing renderer fields. Provenance stays in build-time metadata,
// not in the Alpine payload or any persisted user state.
export function applyGuideChapters(legacy: GameGuide, chapters: readonly GuideChapter[]): GameGuide {
    const guide = legacyGuideSchema.parse(legacy)
    const knownStops = new Set(guide.stops.map((stop) => stop.id))
    const stopOrder = new Map(guide.stops.map((stop, index) => [stop.id, index]))
    const replacements = new Map<string, GuideChapter['stops'][number]>()
    const chapterIds = new Set<string>()
    const stepIds = new Set<string>()
    for (const input of chapters) {
        const chapter = guideChapterSchema.parse(input)
        if (chapter.guideId !== guide.id) throw new Error(`Chapter ${chapter.id}: guide ID mismatch`)
        if (chapterIds.has(chapter.id)) throw new Error(`Duplicate chapter ID: ${chapter.id}`)
        chapterIds.add(chapter.id)
        const group = GUIDE_VERSION_GROUPS[chapter.guideId]
        if (guide.gen !== group.gen) throw new Error(`Guide ${guide.id}: generation does not match version group`)
        const sameVersions = (ids: readonly string[]) =>
            ids.length === group.versions.length && group.versions.every((id) => ids.includes(id))
        if (!sameVersions(chapter.versionIds)) {
            throw new Error(`Chapter ${chapter.id}: the paired-game renderer cannot display version-specific content yet`)
        }
        let previousIndex = -1
        for (const stop of chapter.stops) {
            if (!knownStops.has(stop.id)) throw new Error(`Chapter ${chapter.id}: unknown legacy stop ID ${stop.id}`)
            const index = stopOrder.get(stop.id)!
            if (index <= previousIndex) throw new Error(`Chapter ${chapter.id}: stops must follow legacy render order`)
            previousIndex = index
            if (replacements.has(stop.id)) throw new Error(`Multiple chapters replace stop ${stop.id}`)
            for (const record of [...stop.steps, ...stop.items]) {
                if (record.versionIds && !sameVersions(record.versionIds)) {
                    throw new Error(`Stop ${stop.id}: version-specific records need a version-aware renderer`)
                }
            }
            for (const step of stop.steps) {
                if (stepIds.has(step.id)) throw new Error(`Duplicate step ID across chapters: ${step.id}`)
                stepIds.add(step.id)
            }
            replacements.set(stop.id, stop)
        }
    }
    return {
        ...guide,
        stops: guide.stops.map((stop) => {
            const replacement = replacements.get(stop.id)
            if (!replacement) return stop
            return {
                ...stop,
                steps: replacement.steps.map((step) => step.text),
                items: replacement.items.map(({ name, location, icon }) => ({ name, location, ...(icon ? { icon } : {}) })),
            }
        }),
    }
}
