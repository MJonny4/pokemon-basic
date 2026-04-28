import Alpine from 'alpinejs'
import type { GameGuide, GuideStop, StarterChoice } from '../../../lib/data/guides/types'
import { RED_BLUE_GUIDE } from '../../../lib/data/guides/red-blue'
import { GOLD_SILVER_GUIDE } from '../../../lib/data/guides/gold-silver'
import { typeBadge } from '../../../ui/badges'

const GAMES: GameGuide[] = [RED_BLUE_GUIDE, GOLD_SILVER_GUIDE]

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
        games: GAMES,
        activeGameId: 'red-blue' as string,
        activeStopId: '' as string,
        completedStops: [] as string[],
        selectedStarter: null as StarterChoice | null,

        get currentGame(): GameGuide {
            return this.games.find((g: GameGuide) => g.id === this.activeGameId) ?? this.games[0]
        },

        get currentStop(): GuideStop | null {
            const stops = (this.currentGame as GameGuide).stops
            if (!this.activeStopId) return stops[0] ?? null
            return stops.find((s: GuideStop) => s.id === this.activeStopId) ?? null
        },

        get progressPct(): number {
            const total = (this.currentGame as GameGuide).stops.length
            if (!total) return 0
            return Math.round(((this.completedStops as string[]).length / total) * 100)
        },

        init() {
            this.loadProgress()
            this.loadStarter()
            const stops = (this.currentGame as GameGuide).stops
            if (stops.length) this.activeStopId = stops[0].id
        },

        selectGame(id: string) {
            this.activeGameId = id
            this.loadProgress()
            this.loadStarter()
            const stops = (this.currentGame as GameGuide).stops
            this.activeStopId = stops[0]?.id ?? ''
        },

        selectStop(id: string) {
            this.activeStopId = id
            window.scrollTo({ top: 0, behavior: 'smooth' })
        },

        storageKey(): string {
            return `pokebasic-guide-${this.activeGameId}-progress`
        },

        loadProgress() {
            try {
                const raw = localStorage.getItem(this.storageKey())
                this.completedStops = raw ? JSON.parse(raw) : []
            } catch {
                this.completedStops = []
            }
        },

        saveProgress() {
            try {
                localStorage.setItem(this.storageKey(), JSON.stringify(this.completedStops))
            } catch {}
        },

        toggleStop(stopId: string) {
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
            this.saveProgress()
        },

        currentStopIndex(): number {
            const stops = (this.currentGame as GameGuide).stops
            const stop = this.currentStop as GuideStop | null
            if (!stop) return -1
            return stops.findIndex((s: GuideStop) => s.id === stop.id)
        },

        hasNextStop(): boolean {
            const idx = this.currentStopIndex()
            return idx >= 0 && idx < (this.currentGame as GameGuide).stops.length - 1
        },

        isLastStop(): boolean {
            return !this.hasNextStop()
        },

        goNext() {
            const idx = this.currentStopIndex()
            const next = (this.currentGame as GameGuide).stops[idx + 1]
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
            return `pokebasic-guide-${this.activeGameId}-starter`
        },

        loadStarter(): void {
            try {
                const raw = localStorage.getItem(this.starterStorageKey())
                this.selectedStarter = raw ? (JSON.parse(raw) as StarterChoice) : null
            } catch {
                this.selectedStarter = null
            }
        },

        saveStarter(): void {
            try {
                localStorage.setItem(this.starterStorageKey(), JSON.stringify(this.selectedStarter))
            } catch {}
        },

        selectStarter(starter: StarterChoice): void {
            this.selectedStarter = starter
            this.saveStarter()
        },

        clearStarter(): void {
            this.selectedStarter = null
            this.saveStarter()
        },

        // --- Utility ---

        typeBadgeHtml(type: string): string {
            return typeBadge(type, 'sm')
        },

        openPokedex(pokemonName: string): void {
            window.open(`${import.meta.env.BASE_URL}?search=${pokemonName}`, '_blank')
        },

        // --- Navigation ---

        hasPreviousStop(): boolean {
            return this.currentStopIndex() > 0
        },

        goPrevious(): void {
            const idx = this.currentStopIndex()
            const prev = (this.currentGame as GameGuide).stops[idx - 1]
            if (prev) this.selectStop(prev.id)
        },
    }))
}
