import Alpine from 'alpinejs'
import type { GameGuide, GuideStop, StarterChoice } from '../../../lib/data/guides/types'
import { typeBadge } from '../../../ui/badges'
import { createGuideStorage, type GuideRestoreIssue, type GuideRestorePreview, type GuideSaveIssue, type GuideStorage } from '../../../lib/guide-storage'
import { emptyGuideCollection, type GuideCollectionManifest, type GuideCollectionState, type GuideCollectionStop } from '../../../lib/guide-collection'

function readMessage(issue: GuideSaveIssue | null, subject: string): string {
    if (issue === 'unavailable') return 'Browser storage is unavailable. Changes will only last in this tab.'
    if (issue === 'adjusted') return `Some saved ${subject} needed adjustment. The usable data is shown; your original save has not been changed.`
    if (issue === 'invalid') return `Saved ${subject} could not be read. Your original save is untouched; download a backup before continuing if you need to recover it.`
    return ''
}

function writeMessage(result: ReturnType<GuideStorage['saveProgress']>): string {
    if (result.ok) return result.recovered ? 'Your previous save was kept in a recovery backup. Use Download save backup to keep a copy.' : ''
    if (result.issue === 'conflict') return 'This save changed in another tab. Your edit was not saved; download a backup and reload before continuing.'
    if (result.issue === 'recovery-blocked') return 'The original save could not be backed up safely, so it was not replaced. Changes only last in this tab; download a backup before reloading.'
    return 'This change could not be saved. It only lasts in this tab; download a backup if browser storage is available.'
}

function restoreMessage(issue: GuideRestoreIssue): string {
    if (issue === 'wrong-guide') return 'This backup belongs to another guide. Choose a backup for this game.'
    if (issue === 'unsupported-version') return 'This backup uses an unsupported format version. Nothing was changed.'
    if (issue === 'no-source') return 'Neither saved values nor the session view in this file can be safely restored.'
    if (issue === 'conflict') return 'Your save changed since you selected the file. Nothing was restored. Reload and review the current save before trying again.'
    if (issue === 'recovery-blocked') return 'Existing recovery data could not be safely extended. The active save was not replaced.'
    if (issue === 'partial') return 'The restore could not finish or fully roll back. Use the current-save backup you downloaded and reload before trying again.'
    if (issue === 'unavailable') return 'Browser storage blocked the restore. Your current-save backup is available; check the guide after reloading.'
    return 'This backup file is invalid or too large. Nothing was changed.'
}

const STOP_ICONS: Record<string, string> = {
    'town':       '🏘️',
    'route':      '🌿',
    'gym':        '🏟️',
    'dungeon':    '🕳️',
    'elite-four': '⚔️',
    'champion':   '🏆',
}

export function registerGuide(): void {
    Alpine.data('guide', () => ({
        game: null as unknown as GameGuide,
        activeStopId: '' as string,
        completedStops: [] as string[],
        selectedStarter: null as StarterChoice | null,
        collectionManifest: null as GuideCollectionManifest | null,
        collectionState: emptyGuideCollection() as GuideCollectionState,
        saveRepository: null as GuideStorage | null,
        progressMessage: '',
        starterMessage: '',
        collectionMessage: '',
        backupMessage: '',
        restorePreview: null as GuideRestorePreview | null,
        restoreSource: 'saved' as 'saved' | 'session',
        restoreMode: 'replace' as 'replace' | 'merge',
        restoreCurrentBackupDownloaded: false,
        restoreRequestId: 0,

        get storageMessages(): string[] {
            return [...new Set([this.progressMessage, this.starterMessage, this.collectionMessage, this.backupMessage].filter(Boolean))]
        },

        get currentStop(): GuideStop | null {
            const stops = this.game.stops
            if (!this.activeStopId) return stops[0] ?? null
            return stops.find((s: GuideStop) => s.id === this.activeStopId) ?? null
        },

        get progressPct(): number {
            const total = this.game.stops.length
            if (!total) return 0
            return Math.round(((this.completedStops as string[]).length / total) * 100)
        },

        get currentCollectionStop(): GuideCollectionStop | null {
            return this.collectionManifest?.stops.find((stop) => stop.stopId === this.activeStopId) ?? null
        },

        get collectionTotals(): { steps: number; items: number; species: number } {
            const stops = this.collectionManifest?.stops ?? []
            return {
                steps: stops.reduce((count, stop) => count + stop.stepIds.length, 0),
                items: stops.reduce((count, stop) => count + stop.items.length, 0),
                species: new Set(stops.flatMap((stop) => stop.species.map((pokemon) => pokemon.id))).size,
            }
        },

        init() {
            const raw = (this.$el as HTMLElement).dataset.game
            try {
                if (raw) this.game = JSON.parse(raw) as GameGuide
            } catch {
                // build-time-guaranteed valid JSON; defensive only
            }
            try {
                const rawCollection = (this.$el as HTMLElement).dataset.collection
                if (rawCollection) this.collectionManifest = JSON.parse(rawCollection) as GuideCollectionManifest
            } catch {
                // build-time-guaranteed valid JSON; defensive only
            }
            this.saveRepository = createGuideStorage(this.game, () => localStorage, this.collectionManifest)
            this.loadProgress()
            this.loadStarter()
            if (this.collectionManifest) this.loadCollection()
            const stops = this.game.stops
            if (stops.length) this.activeStopId = stops[0].id
        },

        selectStop(id: string) {
            if (!this.game.stops.some((stop) => stop.id === id)) return
            this.activeStopId = id
            window.scrollTo({ top: 0, behavior: 'smooth' })
        },

        storageKey(): string {
            return `pokebasic-guide-${this.game.id}-progress`
        },

        loadProgress() {
            const result = this.saveRepository!.loadProgress()
            this.completedStops = result.value
            this.progressMessage = readMessage(result.issue, 'progress')
        },

        saveProgress(preservePrevious = false) {
            this.progressMessage = writeMessage(this.saveRepository!.saveProgress(this.completedStops, preservePrevious))
        },

        toggleStop(stopId: string) {
            if (!this.game.stops.some((stop) => stop.id === stopId)) return
            const list = this.completedStops as string[]
            const idx = list.indexOf(stopId)
            this.completedStops = idx === -1 ? [...list, stopId] : list.filter((s) => s !== stopId)
            this.saveProgress()
        },

        isCompleted(stopId: string): boolean {
            return (this.completedStops as string[]).includes(stopId)
        },

        resetProgress() {
            this.completedStops = []
            this.saveProgress(true)
        },

        loadCollection(): void {
            const result = this.saveRepository!.loadCollection()
            this.collectionState = result.value
            this.collectionMessage = readMessage(result.issue, 'collection progress')
        },

        saveCollection(): void {
            this.collectionMessage = writeMessage(this.saveRepository!.saveCollection(this.collectionState))
        },

        toggleCollectionStep(id: string | undefined): void {
            if (!id || !this.collectionManifest?.stops.some((stop) => stop.stepIds.includes(id))) return
            const previous = this.collectionState.completedSteps
            this.collectionState = { ...this.collectionState, completedSteps: previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id] }
            this.saveCollection()
        },

        toggleCollectedItem(id: string): void {
            if (!this.collectionManifest?.stops.some((stop) => stop.items.some((item) => item.id === id))) return
            const previous = this.collectionState.collectedItems
            this.collectionState = { ...this.collectionState, collectedItems: previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id] }
            this.saveCollection()
        },

        toggleSeenSpecies(id: number): void {
            if (!this.collectionManifest?.stops.some((stop) => stop.species.some((pokemon) => pokemon.id === id))) return
            const seen = this.collectionState.seenSpecies
            this.collectionState = seen.includes(id)
                ? { ...this.collectionState, seenSpecies: seen.filter((entry) => entry !== id), caughtSpecies: this.collectionState.caughtSpecies.filter((entry) => entry !== id) }
                : { ...this.collectionState, seenSpecies: [...seen, id] }
            this.saveCollection()
        },

        toggleCaughtSpecies(id: number): void {
            if (!this.collectionManifest?.stops.some((stop) => stop.species.some((pokemon) => pokemon.id === id))) return
            const caught = this.collectionState.caughtSpecies
            this.collectionState = caught.includes(id)
                ? { ...this.collectionState, caughtSpecies: caught.filter((entry) => entry !== id) }
                : { ...this.collectionState, caughtSpecies: [...caught, id], seenSpecies: [...new Set([...this.collectionState.seenSpecies, id])] }
            this.saveCollection()
        },

        currentStopIndex(): number {
            const stops = this.game.stops
            const stop = this.currentStop as GuideStop | null
            if (!stop) return -1
            return stops.findIndex((s: GuideStop) => s.id === stop.id)
        },

        get isFirstStop(): boolean {
            const stops = this.game.stops
            return stops.length > 0 && this.activeStopId === stops[0].id
        },

        hasNextStop(): boolean {
            const idx = this.currentStopIndex()
            return idx >= 0 && idx < this.game.stops.length - 1
        },

        isLastStop(): boolean {
            return !this.hasNextStop()
        },

        goNext() {
            const idx = this.currentStopIndex()
            const next = this.game.stops[idx + 1]
            if (next) this.selectStop(next.id)
        },

        stopIcon(kind: string): string {
            return STOP_ICONS[kind] ?? '📍'
        },

        spriteUrl(id: number): string {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
        },

        // --- Starter selection ---

        starterStorageKey(): string {
            return `pokebasic-guide-${this.game.id}-starter`
        },

        loadStarter(): void {
            const result = this.saveRepository!.loadStarter()
            this.selectedStarter = result.value
            this.starterMessage = readMessage(result.issue, 'starter details')
        },

        saveStarter(): void {
            this.starterMessage = writeMessage(this.saveRepository!.saveStarter(this.selectedStarter))
        },

        selectStarter(starter: StarterChoice): void {
            const choice = this.game.starters?.find((choice) => choice.id === starter.id)
            if (!choice) return
            this.selectedStarter = { ...choice }
            this.saveStarter()
        },

        clearStarter(): void {
            this.selectedStarter = null
            this.saveStarter()
        },

        downloadBackup(nameSuffix = 'save-backup'): boolean {
            const result = this.saveRepository!.exportBackup({ completedStops: this.completedStops, selectedStarter: this.selectedStarter, ...(this.collectionManifest ? { collection: this.collectionState } : {}) })
            if (!result.ok) {
                this.backupMessage = 'Saved data could not be accessed, so no backup file was downloaded.'
                return false
            }
            let url: string | undefined
            try {
                url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }))
                const link = document.createElement('a')
                link.href = url
                link.download = `pokebasic-${this.game.id}-${nameSuffix}.json`
                document.body.appendChild(link)
                link.click()
                link.remove()
                this.backupMessage = ''
                return true
            } catch {
                this.backupMessage = 'The backup could not be downloaded. Your saved data has not been changed.'
                return false
            } finally {
                if (url) { const downloadUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000) }
            }
        },

        async prepareRestoreFile(event: Event): Promise<void> {
            const requestId = ++this.restoreRequestId
            this.restorePreview = null
            this.restoreCurrentBackupDownloaded = false
            this.saveRepository!.discardPreparedRestore()
            const file = (event.target as HTMLInputElement).files?.[0]
            if (!file) return
            if (file.size > 5_000_000) {
                this.backupMessage = restoreMessage('invalid-file')
                return
            }
            try {
                const text = await file.text()
                if (requestId !== this.restoreRequestId) return
                const result = this.saveRepository!.prepareRestore(text)
                if (!result.ok) {
                    this.backupMessage = restoreMessage(result.issue)
                    return
                }
                this.restorePreview = result.preview
                this.restoreSource = result.preview.saved ? 'saved' : 'session'
                this.restoreMode = 'replace'
                this.backupMessage = 'Backup checked. Review the values and download your current save before restoring.'
            } catch {
                this.backupMessage = restoreMessage('invalid-file')
            }
        },

        downloadCurrentBeforeRestore(): void {
            this.restoreCurrentBackupDownloaded = this.downloadBackup('before-restore')
            if (this.restoreCurrentBackupDownloaded) this.backupMessage = 'Current save backup downloaded. Review your choices, then select Restore.'
        },

        restoreBackup(): void {
            if (!this.restorePreview || !this.restoreCurrentBackupDownloaded) return
            const result = this.saveRepository!.restorePrepared(this.restoreSource, this.restoreMode)
            if (!result.ok) {
                this.backupMessage = restoreMessage(result.issue)
                this.restoreCurrentBackupDownloaded = false
                if (result.issue === 'conflict' || result.issue === 'partial') this.restorePreview = null
                return
            }
            this.loadProgress()
            this.loadStarter()
            if (this.collectionManifest) this.loadCollection()
            this.restorePreview = null
            this.restoreCurrentBackupDownloaded = false
            this.backupMessage = `Backup restored. ${result.view.completedStops.length} story stops are marked complete.`
        },

        // --- Utility ---

        typeBadgeHtml(type: string): string {
            return typeBadge(type, 'sm')
        },

        openPokedex(pokemonName: string): void {
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name: pokemonName } }))
        },

        // --- Navigation ---

        hasPreviousStop(): boolean {
            return this.currentStopIndex() > 0
        },

        goPrevious(): void {
            const idx = this.currentStopIndex()
            const prev = this.game.stops[idx - 1]
            if (prev) this.selectStop(prev.id)
        },
    }))
}
