import Alpine from 'alpinejs'
import { fetchPokemon } from '../../../lib/api/pokeapi'
import { makeSlot, type TeamSlot } from '../../stores/team'
import { cloneSlots, emptyTeamLibrary, makeTeamBackup, mergeTeamLibraries, parseTeamBackup, parseTeamLibrary, TEAM_LIBRARY_KEY, TEAM_LIBRARY_LIMIT, validateTeamName, type TeamBackup, type TeamLibrary } from '../../../lib/logic/team-library'
import { parseShowdownTeam, validateTeamSlots } from '../../../lib/logic/team-portability'

function downloadJson(filename: string, value: unknown): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'This operation could not be completed.'
}

export function registerTeamPortability(): void {
    Alpine.data('teamPortability', () => ({
        library: emptyTeamLibrary() as TeamLibrary,
        libraryError: '',
        status: '',
        teamName: '',
        showdownText: '',
        importing: false,
        pendingSlots: null as (TeamSlot | null)[] | null,
        pendingBackup: null as TeamBackup | null,
        backupFilename: '',

        init() { this.refreshLibrary() },

        refreshLibrary() {
            try {
                this.library = parseTeamLibrary(localStorage.getItem(TEAM_LIBRARY_KEY))
                this.libraryError = ''
            } catch (error) { this.libraryError = errorMessage(error) }
        },

        saveNamed() {
            try {
                if (this.libraryError) throw new Error(this.libraryError)
                if (this.library.teams.length >= TEAM_LIBRARY_LIMIT) throw new Error('The named-team library is full.')
                const name = validateTeamName(this.teamName)
                const slots = (Alpine.store('team') as any).slots as (TeamSlot | null)[]
                validateTeamSlots(slots)
                if (!slots.some(Boolean)) throw new Error('Add a Pokémon before saving a named team.')
                const next: TeamLibrary = { schemaVersion: 1, teams: [...this.library.teams, {
                    id: crypto.randomUUID(), name, slots: cloneSlots(slots), updatedAt: new Date().toISOString(),
                }] }
                localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(next))
                this.library = next
                this.teamName = ''
                this.status = `Saved “${name}” as a named snapshot.`
            } catch (error) { this.status = errorMessage(error) }
        },

        loadNamed(id: string) {
            try {
                const found = this.library.teams.find((team) => team.id === id)
                if (!found) throw new Error('Named team was not found.')
                this.downloadRawRecovery()
                ;(Alpine.store('team') as any).replaceSlots(cloneSlots(found.slots))
                this.status = `Loaded “${found.name}” into the current team.`
            } catch (error) { this.status = errorMessage(error) }
        },

        deleteNamed(id: string) {
            try {
                if (this.libraryError) throw new Error(this.libraryError)
                const found = this.library.teams.find((team) => team.id === id)
                if (!found || !window.confirm(`Delete the named snapshot “${found.name}”? Your current team will stay as it is.`)) return
                const next = { schemaVersion: 1 as const, teams: this.library.teams.filter((team) => team.id !== id) }
                localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(next))
                this.library = next
                this.status = `Deleted “${found.name}”.`
            } catch (error) { this.status = errorMessage(error) }
        },

        async reviewShowdown() {
            this.pendingSlots = null
            this.importing = true
            this.status = 'Checking sets and loading Pokémon data…'
            try {
                const sets = parseShowdownTeam(this.showdownText)
                const hydrated = await Promise.all(sets.map(async (set) => {
                    const pokemon = await fetchPokemon(set.species)
                    const slot = makeSlot(pokemon)
                    return { ...slot, nature: set.nature, item: set.item, moves: set.moves, evs: set.evs,
                        ivs: set.ivs, level: set.level, ability: set.ability, teraType: set.teraType }
                }))
                const slots: (TeamSlot | null)[] = [...hydrated, ...Array(6 - hydrated.length).fill(null)]
                validateTeamSlots(slots)
                this.pendingSlots = slots
                this.status = `${hydrated.length} set${hydrated.length === 1 ? '' : 's'} checked. Review the species below, then import into the current team.`
            } catch (error) { this.status = `${errorMessage(error)} No team data was changed.` }
            finally { this.importing = false }
        },

        applyShowdown() {
            if (!this.pendingSlots) return
            try {
                this.downloadRawRecovery()
                ;(Alpine.store('team') as any).replaceSlots(cloneSlots(this.pendingSlots))
                this.pendingSlots = null
                this.status = 'Imported into the current team. Your named snapshots were kept.'
            } catch (error) { this.status = errorMessage(error) }
        },

        downloadBackup() {
            try {
                const backup = makeTeamBackup(localStorage.getItem('team_lab'), localStorage.getItem(TEAM_LIBRARY_KEY))
                downloadJson(`pokebasic-teams-${new Date().toISOString().slice(0, 10)}.json`, backup)
                this.status = 'Team backup downloaded.'
            } catch (error) { this.status = `${errorMessage(error)} Use raw recovery download before restoring.` }
        },

        downloadRawRecovery() {
            downloadJson(`pokebasic-team-raw-recovery-${new Date().toISOString().slice(0, 10)}.json`, {
                kind: 'pokebasic-team-raw-recovery', exportedAt: new Date().toISOString(),
                team_lab: localStorage.getItem('team_lab'), [TEAM_LIBRARY_KEY]: localStorage.getItem(TEAM_LIBRARY_KEY),
            })
            this.status = 'Raw saved bytes downloaded for recovery. This file is not a validated import.'
        },

        async reviewBackup(event: Event) {
            this.pendingBackup = null
            const input = event.target as HTMLInputElement
            const file = input.files?.[0]
            if (!file) return
            this.backupFilename = file.name
            try {
                if (file.size > 1_000_000) throw new Error('Backup is larger than 1 MB.')
                this.pendingBackup = parseTeamBackup(await file.text())
                this.status = `Backup checked: ${this.pendingBackup.namedTeams.length} named team${this.pendingBackup.namedTeams.length === 1 ? '' : 's'}${this.pendingBackup.active?.some(Boolean) ? ' and a current team' : ''}. Choose merge or replace.`
            } catch (error) { this.status = `${errorMessage(error)} No team data was changed.` }
            input.value = ''
        },

        applyBackup(mode: 'merge' | 'replace') {
            if (!this.pendingBackup) return
            const activeRaw = localStorage.getItem('team_lab')
            const libraryRaw = localStorage.getItem(TEAM_LIBRARY_KEY)
            try {
                // Always put a recovery copy in the player's downloads before any restore writes.
                this.downloadRawRecovery()
                const backup = this.pendingBackup
                const current = mode === 'merge' ? parseTeamLibrary(libraryRaw) : emptyTeamLibrary()
                const next = mode === 'merge' ? mergeTeamLibraries(current, backup, () => crypto.randomUUID()) :
                    { schemaVersion: 1 as const, teams: backup.namedTeams }
                localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(next))
                if (mode === 'replace') {
                    if (backup.active === null) localStorage.removeItem('team_lab')
                    else localStorage.setItem('team_lab', JSON.stringify(backup.active))
                }
                this.library = next
                this.libraryError = ''
                if (mode === 'replace') {
                    const store = Alpine.store('team') as any
                    store.slots = backup.active ? cloneSlots(backup.active) : Array(6).fill(null)
                    store.activeSlot = null
                    store.storageError = ''
                    store.computeCoverage()
                }
                this.pendingBackup = null
                this.status = mode === 'merge' ? 'Backup merged as named snapshots. The current team was kept.' : 'Backup replaced the current team and named snapshots.'
            } catch (error) {
                try {
                    if (libraryRaw === null) localStorage.removeItem(TEAM_LIBRARY_KEY)
                    else localStorage.setItem(TEAM_LIBRARY_KEY, libraryRaw)
                    if (activeRaw === null) localStorage.removeItem('team_lab')
                    else localStorage.setItem('team_lab', activeRaw)
                } catch {}
                this.status = `${errorMessage(error)} The previous save was restored where browser storage allowed.`
            }
        },
    }))
}
