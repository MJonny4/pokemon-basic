import Alpine from 'alpinejs'
import type { GameGuide, GuideStop, StarterChoice } from '../../../lib/data/guides/types'
import { typeBadge } from '../../../ui/badges'
import { createGuideStorage, type GuideSaveIssue, type GuideStorage } from '../../../lib/guide-storage'

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
        saveRepository: null as GuideStorage | null,
        progressMessage: '',
        starterMessage: '',
        backupMessage: '',

        get storageMessages(): string[] {
            return [...new Set([this.progressMessage, this.starterMessage, this.backupMessage].filter(Boolean))]
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

        init() {
            const raw = (this.$el as HTMLElement).dataset.game
            try {
                if (raw) this.game = JSON.parse(raw) as GameGuide
            } catch {
                // build-time-guaranteed valid JSON; defensive only
            }
            this.saveRepository = createGuideStorage(this.game)
            this.loadProgress()
            this.loadStarter()
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

        downloadBackup(): void {
            const result = this.saveRepository!.exportBackup({ completedStops: this.completedStops, selectedStarter: this.selectedStarter })
            if (!result.ok) {
                this.backupMessage = 'Saved data could not be accessed, so no backup file was downloaded.'
                return
            }
            let url: string | undefined
            try {
                url = URL.createObjectURL(new Blob([result.json], { type: 'application/json' }))
                const link = document.createElement('a')
                link.href = url
                link.download = `pokebasic-${this.game.id}-save-backup.json`
                document.body.appendChild(link)
                link.click()
                link.remove()
                this.backupMessage = ''
            } catch {
                this.backupMessage = 'The backup could not be downloaded. Your saved data has not been changed.'
            } finally {
                if (url) { const downloadUrl = url; window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000) }
            }
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
