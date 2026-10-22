import type { GameGuide, StarterChoice } from './data/guides/types'
import { emptyGuideCollection, mergeGuideCollection, parseGuideCollection, type GuideCollectionManifest, type GuideCollectionState } from './guide-collection'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type GuideSaveIssue = 'adjusted' | 'invalid' | 'unavailable' | 'conflict' | 'recovery-blocked' | 'invalid-input'
interface ReadResult<T> { value: T; issue: GuideSaveIssue | null }
interface Snapshot { raw: string | null | undefined; needsRecovery: boolean }
type WriteResult = { ok: true; recovered: boolean } | { ok: false; issue: GuideSaveIssue }
type RestoreSource = 'saved' | 'session'
type RestoreMode = 'replace' | 'merge'
type RestoreView = { completedStops: string[]; selectedStarter: StarterChoice | null; collection?: GuideCollectionState }
type RawEntries = { progress: string | null; starter: string | null; progressRecovery: string | null; starterRecovery: string | null; collection?: string | null; collectionRecovery?: string | null }
type PreparedRestore = { saved: RestoreView | null; session: RestoreView | null; entries: RawEntries; before: RawEntries; includesCollection: boolean }
export type GuideRestorePreview = { saved: RestoreView | null; session: RestoreView | null; exportedAt: string }
export type GuideRestoreIssue = 'invalid-file' | 'wrong-guide' | 'unsupported-version' | 'no-source' | 'conflict' | 'recovery-blocked' | 'unavailable' | 'partial'
type RestoreResult = { ok: true; view: RestoreView } | { ok: false; issue: GuideRestoreIssue }

const MAX_BACKUP_LENGTH = 5_000_000

function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Legacy save boundary. No writes on construction or reads; no format migration. */
export function createGuideStorage(guide: GameGuide, getStore: () => Store = () => localStorage, collectionManifest: GuideCollectionManifest | null = null) {
    const progressKey = `pokebasic-guide-${guide.id}-progress`
    const starterKey = `pokebasic-guide-${guide.id}-starter`
    const collectionKey = `pokebasic-guide-${guide.id}-collection`
    if (collectionManifest && collectionManifest.guideId !== guide.id) throw new Error('Collection guide identity mismatch')
    const stopIds = new Set(guide.stops.map((stop) => stop.id))
    let progress: Snapshot = { raw: undefined, needsRecovery: false }
    let starter: Snapshot = { raw: undefined, needsRecovery: false }
    let collection: Snapshot = { raw: undefined, needsRecovery: false }
    let preparedRestore: PreparedRestore | null = null

    const read = (key: string): Snapshot => {
        try { return { raw: getStore().getItem(key), needsRecovery: false } }
        catch { return { raw: undefined, needsRecovery: false } }
    }

    const canonicalStarter = (value: unknown): StarterChoice | null => {
        if (!record(value) || 'schemaVersion' in value || !Number.isSafeInteger(value.id)) return null
        const choice = guide.starters?.find((choice) => choice.id === value.id)
        return choice ? { ...choice } : null
    }

    const parseProgress = (raw: string | null): string[] | null => {
        if (raw === null) return []
        try {
            const parsed: unknown = JSON.parse(raw)
            if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== 'string' || !stopIds.has(id)) || new Set(parsed).size !== parsed.length) return null
            return parsed
        } catch { return null }
    }

    const parseStarter = (raw: string | null): { valid: true; value: StarterChoice | null } | { valid: false } => {
        if (raw === null) return { valid: true, value: null }
        try {
            const parsed: unknown = JSON.parse(raw)
            if (parsed === null) return { valid: true, value: null }
            const value = canonicalStarter(parsed)
            return value ? { valid: true, value } : { valid: false }
        } catch { return { valid: false } }
    }

    const parseRecovery = (raw: string | null): string[] | null => {
        if (raw === null) return []
        try {
            const parsed: unknown = JSON.parse(raw)
            if (!record(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.snapshots) ||
                !parsed.snapshots.every((value) => typeof value === 'string') ||
                Object.keys(parsed).some((key) => key !== 'schemaVersion' && key !== 'snapshots')) return null
            return parsed.snapshots
        } catch { return null }
    }

    const parseCollectionRaw = (raw: string | null): GuideCollectionState | null => {
        if (!collectionManifest) return null
        if (raw === null) return emptyGuideCollection()
        try { return parseGuideCollection(JSON.parse(raw), collectionManifest) }
        catch { return null }
    }

    const readEntries = (store: Store): RawEntries => ({
        progress: store.getItem(progressKey), starter: store.getItem(starterKey),
        progressRecovery: store.getItem(`${progressKey}-recovery`),
        starterRecovery: store.getItem(`${starterKey}-recovery`),
        ...(collectionManifest ? { collection: store.getItem(collectionKey), collectionRecovery: store.getItem(`${collectionKey}-recovery`) } : {}),
    })

    const sameEntries = (a: RawEntries, b: RawEntries) =>
        a.progress === b.progress && a.starter === b.starter &&
        a.progressRecovery === b.progressRecovery && a.starterRecovery === b.starterRecovery &&
        a.collection === b.collection && a.collectionRecovery === b.collectionRecovery

    const parseBackup = (text: string): ({ ok: true; value: PreparedRestore; preview: GuideRestorePreview } | { ok: false; issue: GuideRestoreIssue }) => {
        if (typeof text !== 'string' || text.length > MAX_BACKUP_LENGTH) return { ok: false, issue: 'invalid-file' }
        let data: unknown
        try { data = JSON.parse(text) } catch { return { ok: false, issue: 'invalid-file' } }
        if (!record(data) || data.format !== 'pokebasic-guide-save-backup') return { ok: false, issue: 'invalid-file' }
        const includesCollection = data.schemaVersion === 2
        if (data.schemaVersion !== 1 && !(includesCollection && collectionManifest)) return { ok: false, issue: 'unsupported-version' }
        if (data.guideId !== guide.id) return { ok: false, issue: 'wrong-guide' }
        const expected = [progressKey, starterKey, `${progressKey}-recovery`, `${starterKey}-recovery`, ...(includesCollection ? [collectionKey, `${collectionKey}-recovery`] : [])]
        if (typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt)) || !Array.isArray(data.entries) || data.entries.length !== expected.length ||
            Object.keys(data).some((key) => !['format', 'schemaVersion', 'guideId', 'exportedAt', 'entries', 'sessionView'].includes(key))) return { ok: false, issue: 'invalid-file' }
        const mapped = new Map<string, string | null>()
        for (const entry of data.entries) {
            if (!record(entry) || typeof entry.key !== 'string' || !expected.includes(entry.key) ||
                (entry.rawValue !== null && typeof entry.rawValue !== 'string') || mapped.has(entry.key) ||
                Object.keys(entry).some((key) => key !== 'key' && key !== 'rawValue')) return { ok: false, issue: 'invalid-file' }
            mapped.set(entry.key, entry.rawValue as string | null)
        }
        if (mapped.size !== expected.length) return { ok: false, issue: 'invalid-file' }
        const entries: RawEntries = {
            progress: mapped.get(progressKey)!, starter: mapped.get(starterKey)!,
            progressRecovery: mapped.get(`${progressKey}-recovery`)!, starterRecovery: mapped.get(`${starterKey}-recovery`)!,
            ...(includesCollection ? { collection: mapped.get(collectionKey)!, collectionRecovery: mapped.get(`${collectionKey}-recovery`)! } : {}),
        }
        if (parseRecovery(entries.progressRecovery) === null || parseRecovery(entries.starterRecovery) === null ||
            (includesCollection && parseRecovery(entries.collectionRecovery!) === null)) return { ok: false, issue: 'invalid-file' }
        const savedProgress = parseProgress(entries.progress)
        const savedStarter = parseStarter(entries.starter)
        const savedCollection = includesCollection ? parseCollectionRaw(entries.collection!) : undefined
        const saved: RestoreView | null = savedProgress !== null && savedStarter.valid && (!includesCollection || savedCollection !== null)
            ? { completedStops: savedProgress, selectedStarter: savedStarter.value, ...(includesCollection ? { collection: savedCollection! } : {}) } : null
        let session: RestoreView | null = null
        if (data.sessionView !== undefined) {
            if (!record(data.sessionView) || !Array.isArray(data.sessionView.completedStops) ||
                data.sessionView.completedStops.some((id) => typeof id !== 'string' || !stopIds.has(id)) ||
                new Set(data.sessionView.completedStops).size !== data.sessionView.completedStops.length ||
                !('selectedStarter' in data.sessionView) ||
                Object.keys(data.sessionView).some((key) => !['completedStops', 'selectedStarter', ...(includesCollection ? ['collection'] : [])].includes(key))) return { ok: false, issue: 'invalid-file' }
            const choice = data.sessionView.selectedStarter === null ? null : canonicalStarter(data.sessionView.selectedStarter)
            if (data.sessionView.selectedStarter !== null && !choice) return { ok: false, issue: 'invalid-file' }
            const sessionCollection = includesCollection ? parseGuideCollection(data.sessionView.collection, collectionManifest!) : undefined
            if (includesCollection && !sessionCollection) return { ok: false, issue: 'invalid-file' }
            session = { completedStops: [...data.sessionView.completedStops], selectedStarter: choice, ...(includesCollection ? { collection: sessionCollection! } : {}) }
        }
        if (!saved && !session) return { ok: false, issue: 'no-source' }
        return { ok: true, value: { saved, session, entries, before: { progress: null, starter: null, progressRecovery: null, starterRecovery: null }, includesCollection }, preview: { saved, session, exportedAt: data.exportedAt } }
    }

    /** Backups are append-only snapshots of the exact previous localStorage string. */
    const preserve = (store: Store, key: string, raw: string): boolean => {
        const recoveryKey = `${key}-recovery`
        const original = store.getItem(recoveryKey)
        let snapshots: string[] = []
        if (original !== null) {
            let parsed: unknown
            try { parsed = JSON.parse(original) } catch { return false }
            if (!record(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.snapshots) ||
                !parsed.snapshots.every((snapshot) => typeof snapshot === 'string') ||
                Object.keys(parsed).some((key) => key !== 'schemaVersion' && key !== 'snapshots')) return false
            snapshots = parsed.snapshots
        }
        if (!snapshots.includes(raw)) {
            store.setItem(recoveryKey, JSON.stringify({ schemaVersion: 1, snapshots: [...snapshots, raw] }))
        }
        return true
    }

    const write = (key: string, snapshot: Snapshot, serialized: string, forceRecovery = false): WriteResult => {
        let store: Store
        try {
            store = getStore()
            // Best-effort conflict guard; localStorage is not an atomic cross-tab transaction.
            if (snapshot.raw === undefined) return { ok: false, issue: 'unavailable' }
            if (store.getItem(key) !== snapshot.raw) return { ok: false, issue: 'conflict' }
            if (snapshot.raw === serialized) return { ok: true, recovered: false }
            const recover = snapshot.raw !== null && (snapshot.needsRecovery || forceRecovery)
            if (recover) {
                try {
                    if (!preserve(store, key, snapshot.raw!)) return { ok: false, issue: 'recovery-blocked' }
                } catch { return { ok: false, issue: 'recovery-blocked' } }
            }
            if (store.getItem(key) !== snapshot.raw) return { ok: false, issue: 'conflict' }
            store.setItem(key, serialized)
            snapshot.raw = serialized
            snapshot.needsRecovery = false
            return { ok: true, recovered: recover }
        } catch { return { ok: false, issue: 'unavailable' } }
    }

    return {
        loadProgress(): ReadResult<string[]> {
            progress = read(progressKey)
            if (progress.raw === undefined) return { value: [], issue: 'unavailable' }
            if (progress.raw === null) return { value: [], issue: null }
            try {
                const parsed: unknown = JSON.parse(progress.raw)
                if (!Array.isArray(parsed)) throw new Error('Invalid progress shape')
                const seen = new Set<string>()
                const value = parsed.filter((id): id is string => {
                    if (typeof id !== 'string' || !stopIds.has(id) || seen.has(id)) return false
                    seen.add(id)
                    return true
                })
                progress.needsRecovery = value.length !== parsed.length
                return { value, issue: progress.needsRecovery ? 'adjusted' : null }
            } catch {
                progress.needsRecovery = true
                return { value: [], issue: 'invalid' }
            }
        },

        loadStarter(): ReadResult<StarterChoice | null> {
            starter = read(starterKey)
            if (starter.raw === undefined) return { value: null, issue: 'unavailable' }
            if (starter.raw === null) return { value: null, issue: null }
            try {
                const parsed: unknown = JSON.parse(starter.raw)
                if (parsed === null) return { value: null, issue: null }
                const value = canonicalStarter(parsed)
                if (!value) throw new Error('Unknown starter')
                starter.needsRecovery = !record(parsed) || Object.keys(parsed).length !== 4 ||
                    parsed.name !== value.name || parsed.type !== value.type || parsed.description !== value.description
                // Ordinary guide-copy updates need not warn like damaged data.
                // Still preserve those original bytes before any explicit edit.
                const malformed = !record(parsed) || Object.keys(parsed).length !== 4 ||
                    parsed.name !== value.name || parsed.type !== value.type || typeof parsed.description !== 'string'
                return { value, issue: malformed ? 'adjusted' : null }
            } catch {
                starter.needsRecovery = true
                return { value: null, issue: 'invalid' }
            }
        },

        saveProgress(value: readonly string[], preservePrevious = false): WriteResult {
            if (!Array.isArray(value) || new Set(value).size !== value.length || value.some((id) => !stopIds.has(id))) {
                return { ok: false, issue: 'invalid-input' }
            }
            return write(progressKey, progress, JSON.stringify(value), preservePrevious)
        },

        saveStarter(value: StarterChoice | null): WriteResult {
            const canonical = value === null ? null : canonicalStarter(value)
            if (value !== null && !canonical) return { ok: false, issue: 'invalid-input' }
            return write(starterKey, starter, JSON.stringify(canonical))
        },

        loadCollection(): ReadResult<GuideCollectionState> {
            if (!collectionManifest) return { value: emptyGuideCollection(), issue: 'invalid-input' }
            collection = read(collectionKey)
            if (collection.raw === undefined) return { value: emptyGuideCollection(), issue: 'unavailable' }
            if (collection.raw === null) return { value: emptyGuideCollection(), issue: null }
            const value = parseCollectionRaw(collection.raw)
            if (value) return { value, issue: null }
            collection.needsRecovery = true
            return { value: emptyGuideCollection(), issue: 'invalid' }
        },

        saveCollection(value: GuideCollectionState): WriteResult {
            if (!collectionManifest) return { ok: false, issue: 'invalid-input' }
            const canonical = parseGuideCollection(value, collectionManifest)
            if (!canonical) return { ok: false, issue: 'invalid-input' }
            return write(collectionKey, collection, JSON.stringify(canonical))
        },

        exportBackup(view?: { completedStops: readonly string[]; selectedStarter: StarterChoice | null; collection?: GuideCollectionState }): { ok: true; json: string } | { ok: false; issue: 'unavailable' } {
            try {
                const store = getStore()
                const keys = [progressKey, starterKey, `${progressKey}-recovery`, `${starterKey}-recovery`, ...(collectionManifest ? [collectionKey, `${collectionKey}-recovery`] : [])]
                const entries = keys.map((key) => ({ key, rawValue: store.getItem(key) }))
                const sessionCollection = collectionManifest && view ? parseGuideCollection(view.collection, collectionManifest) : undefined
                if (collectionManifest && view && !sessionCollection) return { ok: false, issue: 'unavailable' }
                const sessionView = view ? {
                    completedStops: [...view.completedStops], selectedStarter: view.selectedStarter === null ? null : canonicalStarter(view.selectedStarter),
                    ...(collectionManifest ? { collection: sessionCollection } : {}),
                } : undefined
                return { ok: true, json: JSON.stringify({ format: 'pokebasic-guide-save-backup', schemaVersion: collectionManifest ? 2 : 1, guideId: guide.id, exportedAt: new Date().toISOString(), entries, sessionView }, null, 2) }
            } catch { return { ok: false, issue: 'unavailable' } }
        },

        prepareRestore(text: string): { ok: true; preview: GuideRestorePreview } | { ok: false; issue: GuideRestoreIssue } {
            preparedRestore = null
            const parsed = parseBackup(text)
            if (!parsed.ok) return parsed
            try {
                const before = readEntries(getStore())
                if (parseRecovery(before.progressRecovery) === null || parseRecovery(before.starterRecovery) === null ||
                    (collectionManifest && parseRecovery(before.collectionRecovery!) === null)) {
                    return { ok: false, issue: 'recovery-blocked' }
                }
                preparedRestore = { ...parsed.value, before }
                return { ok: true, preview: parsed.preview }
            } catch { return { ok: false, issue: 'unavailable' } }
        },

        discardPreparedRestore(): void { preparedRestore = null },

        restorePrepared(source: RestoreSource, mode: RestoreMode): RestoreResult {
            const pending = preparedRestore
            if (!pending || !['saved', 'session'].includes(source) || !['replace', 'merge'].includes(mode)) return { ok: false, issue: 'invalid-file' }
            const imported = pending[source]
            if (!imported) return { ok: false, issue: 'no-source' }
            let store: Store
            let current: RawEntries
            try {
                store = getStore()
                current = readEntries(store)
            } catch { return { ok: false, issue: 'unavailable' } }
            if (!sameEntries(current, pending.before)) return { ok: false, issue: 'conflict' }

            const currentProgress = parseProgress(current.progress) ?? []
            const currentStarter = parseStarter(current.starter)
            const importedProgress = source === 'saved' ? pending.entries.progress : JSON.stringify(imported.completedStops)
            const importedStarter = source === 'saved' ? pending.entries.starter : JSON.stringify(imported.selectedStarter)
            const nextProgress = mode === 'replace' ? importedProgress : JSON.stringify([...new Set([...currentProgress, ...imported.completedStops])])
            const nextStarter = mode === 'replace' || !currentStarter.valid || currentStarter.value === null ? importedStarter : current.starter
            const nextCollection = pending.includesCollection
                ? mode === 'replace' && source === 'saved'
                    ? pending.entries.collection!
                    : JSON.stringify(mode === 'merge'
                        ? mergeGuideCollection(parseCollectionRaw(current.collection!) ?? emptyGuideCollection(), imported.collection!)
                        : imported.collection!)
                : current.collection
            const parsedNextStarter = parseStarter(nextStarter)
            const nextView: RestoreView = {
                completedStops: parseProgress(nextProgress)!,
                selectedStarter: parsedNextStarter.valid ? parsedNextStarter.value : null,
                ...(collectionManifest ? { collection: parseCollectionRaw(nextCollection!) ?? emptyGuideCollection() } : {}),
            }

            const recoveryValue = (currentRaw: string | null, importedRaw: string | null, oldActive: string | null, changed: boolean, unusedImported: string | null): string | null => {
                const prior = parseRecovery(currentRaw)!
                const incoming = parseRecovery(importedRaw)!
                const combined = [...new Set([...prior, ...incoming, ...(changed && oldActive !== null ? [oldActive] : []), ...(unusedImported === null ? [] : [unusedImported])])]
                if (combined.length === prior.length) return currentRaw ?? importedRaw
                if (currentRaw === null && combined.length === incoming.length) return importedRaw
                return JSON.stringify({ schemaVersion: 1, snapshots: combined })
            }
            const nextProgressRecovery = recoveryValue(current.progressRecovery, pending.entries.progressRecovery, current.progress, nextProgress !== current.progress, source === 'session' || mode === 'merge' ? pending.entries.progress : null)
            const nextStarterRecovery = recoveryValue(current.starterRecovery, pending.entries.starterRecovery, current.starter, nextStarter !== current.starter, source === 'session' || mode === 'merge' ? pending.entries.starter : null)
            const nextCollectionRecovery = pending.includesCollection
                ? recoveryValue(current.collectionRecovery!, pending.entries.collectionRecovery!, current.collection!, nextCollection !== current.collection, source === 'session' || mode === 'merge' ? pending.entries.collection! : null)
                : current.collectionRecovery

            const setExact = (key: string, value: string | null): void => {
                if (value === null) store.removeItem(key)
                else store.setItem(key, value)
            }
            const recoveries = [
                { key: recoveryKeyFor(progressKey), old: current.progressRecovery, next: nextProgressRecovery },
                { key: recoveryKeyFor(starterKey), old: current.starterRecovery, next: nextStarterRecovery },
                ...(pending.includesCollection ? [{ key: recoveryKeyFor(collectionKey), old: current.collectionRecovery!, next: nextCollectionRecovery! }] : []),
            ]
            try {
                for (const entry of recoveries) {
                    if (store.getItem(entry.key) !== entry.old) return { ok: false, issue: 'conflict' }
                    if (entry.next !== entry.old) setExact(entry.key, entry.next)
                }
            } catch { return { ok: false, issue: 'recovery-blocked' } }

            const active = [
                { key: progressKey, old: current.progress, next: nextProgress },
                { key: starterKey, old: current.starter, next: nextStarter },
                ...(pending.includesCollection ? [{ key: collectionKey, old: current.collection!, next: nextCollection! }] : []),
            ]
            const written: typeof active = []
            let failure: 'conflict' | 'unavailable' = 'unavailable'
            try {
                for (const entry of active) {
                    if (store.getItem(entry.key) !== entry.old) {
                        failure = 'conflict'
                        throw new Error('Save changed during restore')
                    }
                    if (entry.next !== entry.old) {
                        setExact(entry.key, entry.next)
                        written.push(entry)
                    }
                }
            } catch (error) {
                for (const entry of written.reverse()) {
                    try {
                        if (store.getItem(entry.key) !== entry.next) return { ok: false, issue: 'partial' }
                        setExact(entry.key, entry.old)
                    } catch { return { ok: false, issue: 'partial' } }
                }
                return { ok: false, issue: failure }
            }
            progress = { raw: nextProgress, needsRecovery: false }
            starter = { raw: nextStarter, needsRecovery: false }
            if (pending.includesCollection) collection = { raw: nextCollection, needsRecovery: false }
            preparedRestore = null
            return { ok: true, view: nextView }
        },
    }
}

function recoveryKeyFor(key: string): string { return `${key}-recovery` }

export type GuideStorage = ReturnType<typeof createGuideStorage>
