import Alpine from 'alpinejs'
import type { Pokemon } from '../../lib/api/pokeapi'
import { detectRole } from '../../lib/logic/role-detect'
import { analyzeTeam } from '../../lib/logic/team-coverage'
import type { TeamCoverage } from '../../lib/logic/team-coverage'
import { validateTeamSlots } from '../../lib/logic/team-portability'

export interface TeamSlot {
    pokemonName: string
    pokemonId: number
    types: string[]                 // lowercase, from API
    stats: Record<string, number>   // all 6 base stats keyed by API stat name
    nature: string | null
    item: string | null
    moves: [string | null, string | null, string | null, string | null]
    role: string | null             // RoleKey from detectRole
    evs: Record<string, number>     // 0–252 per stat, max 508 total
    ivs: Record<string, number>     // 0–31 per stat
    level: number
    ability: string | null
    teraType: string | null
}

const DEFAULT_IVS: Record<string, number> = {
    hp: 31, attack: 31, defense: 31,
    'special-attack': 31, 'special-defense': 31, speed: 31,
}

const DEFAULT_EVS: Record<string, number> = {
    hp: 0, attack: 0, defense: 0,
    'special-attack': 0, 'special-defense': 0, speed: 0,
}

export function makeSlot(pokemon: Pokemon): TeamSlot {
    const stats = Object.fromEntries(pokemon.stats.map((s) => [s.stat.name, s.base_stat]))
    const role = detectRole(stats)
    return {
        pokemonName: pokemon.name,
        pokemonId: pokemon.id,
        types: pokemon.types.map((t) => t.type.name),
        stats,
        nature: null,
        item: null,
        moves: [null, null, null, null],
        role: role.key,
        evs: { ...DEFAULT_EVS },
        ivs: { ...DEFAULT_IVS },
        level: 50,
        ability: null,
        teraType: null,
    }
}

interface TeamStore {
    slots: (TeamSlot | null)[]
    activeSlot: number | null
    loading: boolean
    coverage: TeamCoverage | null
    storageError: string
    addToSlot(slot: number, pokemon: Pokemon): void
    removeFromSlot(slot: number): void
    updateSlot(slot: number, updates: Partial<TeamSlot>): void
    swapSlots(a: number, b: number): void
    computeCoverage(): void
    filledSlots(): TeamSlot[]
    saveToLocal(): void
    loadFromLocal(): void
    replaceSlots(slots: (TeamSlot | null)[], allowRecovery?: boolean): void
}

export function registerTeamStore(): void {
    const store: TeamStore = {
        slots: Array(6).fill(null) as (TeamSlot | null)[],
        activeSlot: null,
        loading: false,
        coverage: null,
        storageError: '',

        addToSlot(slot: number, pokemon: Pokemon): void {
            if (this.storageError) return
            const newSlots = [...this.slots]
            newSlots[slot] = makeSlot(pokemon)
            this.slots = newSlots
            this.computeCoverage()
            this.saveToLocal()
        },

        removeFromSlot(slot: number): void {
            if (this.storageError) return
            const newSlots = [...this.slots]
            newSlots[slot] = null
            this.slots = newSlots
            this.computeCoverage()
            this.saveToLocal()
        },

        updateSlot(slot: number, updates: Partial<TeamSlot>): void {
            if (this.storageError) return
            const current = this.slots[slot]
            if (!current) return
            const newSlots = [...this.slots]
            newSlots[slot] = { ...current, ...updates }
            this.slots = newSlots
            this.computeCoverage()
            this.saveToLocal()
        },

        swapSlots(a: number, b: number): void {
            if (this.storageError) return
            const newSlots = [...this.slots]
            ;[newSlots[a], newSlots[b]] = [newSlots[b], newSlots[a]]
            this.slots = newSlots
            if (this.activeSlot === a) this.activeSlot = b
            else if (this.activeSlot === b) this.activeSlot = a
            this.computeCoverage()
            this.saveToLocal()
        },

        computeCoverage(): void {
            this.coverage = analyzeTeam(this.slots)
        },

        filledSlots(): TeamSlot[] {
            return this.slots.filter(Boolean) as TeamSlot[]
        },

        saveToLocal(): void {
            try {
                localStorage.setItem('team_lab', JSON.stringify(this.slots))
                this.storageError = ''
            } catch { this.storageError = 'Team changes could not be saved in this browser.' }
        },

        loadFromLocal(): void {
            try {
                const raw = localStorage.getItem('team_lab')
                if (!raw) return
                const saved: unknown = JSON.parse(raw)
                validateTeamSlots(saved)
                this.slots = saved
                this.computeCoverage()
                this.storageError = ''
            } catch { this.storageError = 'Saved team data needs recovery. Download the raw copy before replacing it.' }
        },

        replaceSlots(slots: (TeamSlot | null)[], allowRecovery = false): void {
            if (this.storageError && !allowRecovery) throw new Error(this.storageError)
            validateTeamSlots(slots)
            localStorage.setItem('team_lab', JSON.stringify(slots))
            this.slots = slots
            this.activeSlot = null
            this.storageError = ''
            this.computeCoverage()
        },
    }

    Alpine.store('team', store)
}
