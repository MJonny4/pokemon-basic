import type { TeamSlot } from '../../alpine/stores/team'
import { validateTeamSlots } from './team-portability'

export const TEAM_LIBRARY_KEY = 'team_lab_library_v1'
export const TEAM_LIBRARY_LIMIT = 24
export interface NamedTeam {
    id: string
    name: string
    slots: (TeamSlot | null)[]
    updatedAt: string
}
export interface TeamLibrary {
    schemaVersion: 1
    teams: NamedTeam[]
}
export interface TeamBackup {
    kind: 'pokebasic-team-backup'
    schemaVersion: 1
    exportedAt: string
    active: (TeamSlot | null)[] | null
    namedTeams: NamedTeam[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value))
export const emptyTeamLibrary = (): TeamLibrary => ({ schemaVersion: 1, teams: [] })
// Alpine wraps live slots in proxies, which structuredClone cannot copy.
export const cloneSlots = (slots: (TeamSlot | null)[]): (TeamSlot | null)[] => JSON.parse(JSON.stringify(slots))

export function validateTeamName(name: string): string {
    const value = name.trim().replace(/\s+/g, ' ')
    if (!value || value.length > 50 || /[<>\r\n]/.test(value)) throw new Error('Team name must be 1–50 plain-text characters.')
    return value
}

export function parseTeamLibrary(raw: string | null): TeamLibrary {
    if (raw === null) return emptyTeamLibrary()
    if (raw.length > 1_000_000) throw new Error('Named-team storage is too large.')
    let value: unknown
    try { value = JSON.parse(raw) } catch { throw new Error('Named-team storage contains invalid JSON.') }
    if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.teams) || value.teams.length > TEAM_LIBRARY_LIMIT) {
        throw new Error('Named-team storage has an unsupported format.')
    }
    const ids = new Set<string>()
    for (const team of value.teams) {
        if (!isRecord(team) || typeof team.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(team.id) || ids.has(team.id) ||
            typeof team.name !== 'string' || validateTeamName(team.name) !== team.name || !validDate(team.updatedAt)) {
            throw new Error('Named-team storage contains an invalid entry.')
        }
        validateTeamSlots(team.slots)
        ids.add(team.id)
    }
    return value as unknown as TeamLibrary
}

export function makeTeamBackup(activeRaw: string | null, libraryRaw: string | null, exportedAt = new Date().toISOString()): TeamBackup {
    let active: (TeamSlot | null)[] | null = null
    if (activeRaw !== null) {
        try { active = JSON.parse(activeRaw) } catch { throw new Error('The current team contains invalid JSON. Download its raw recovery copy first.') }
        validateTeamSlots(active)
    }
    return { kind: 'pokebasic-team-backup', schemaVersion: 1, exportedAt, active, namedTeams: parseTeamLibrary(libraryRaw).teams }
}

export function parseTeamBackup(text: string): TeamBackup {
    if (text.length > 1_000_000) throw new Error('Backup is larger than 1 MB.')
    let value: unknown
    try { value = JSON.parse(text) } catch { throw new Error('Backup is not valid JSON.') }
    if (!isRecord(value) || value.kind !== 'pokebasic-team-backup' || value.schemaVersion !== 1 || !validDate(value.exportedAt) ||
        (value.active !== null && !Array.isArray(value.active)) || !Array.isArray(value.namedTeams)) {
        throw new Error('Backup has an unsupported format or version.')
    }
    if (value.active !== null) validateTeamSlots(value.active)
    const library = parseTeamLibrary(JSON.stringify({ schemaVersion: 1, teams: value.namedTeams }))
    return { kind: 'pokebasic-team-backup', schemaVersion: 1, exportedAt: value.exportedAt, active: value.active, namedTeams: library.teams }
}

/** Merge appends copies, retaining existing snapshots and names. Replace is handled by the caller. */
export function mergeTeamLibraries(existing: TeamLibrary, incoming: TeamBackup, newId: () => string): TeamLibrary {
    const additions = [...incoming.namedTeams]
    if (incoming.active?.some(Boolean)) additions.unshift({ id: 'imported-active', name: 'Imported active team', slots: incoming.active, updatedAt: incoming.exportedAt })
    if (existing.teams.length + additions.length > TEAM_LIBRARY_LIMIT) throw new Error(`A library can hold at most ${TEAM_LIBRARY_LIMIT} named teams.`)
    const ids = new Set(existing.teams.map((team) => team.id))
    const copies = additions.map((team) => {
        const id = newId()
        if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || ids.has(id)) throw new Error('Could not assign a unique named-team ID.')
        ids.add(id)
        return { ...team, id, slots: cloneSlots(team.slots) }
    })
    return {
        schemaVersion: 1,
        teams: [...existing.teams, ...copies],
    }
}
