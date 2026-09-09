import {
    MACHINE_GAME_BY_SLUG,
    type MachineGame,
    type MachineKind,
    type MachineUse,
} from '../data/machine-games'

export interface MoveMachineAssignment {
    kind: MachineKind
    number: number
    game: string
}

export interface MoveMachineSearchEntry {
    kind: MachineKind
    number: number
    gen: number
}

export interface MachineQuery {
    kind: MachineKind
    number: number
}

/** Accept TM24, tm 24, TM-024, HM03, and TR08 as equivalent machine queries. */
export function parseMachineQuery(query: string): MachineQuery | null {
    const match = query.trim().match(/^(tm|hm|tr)\s*[-#]?\s*0*(\d{1,3})$/i)
    if (!match) return null
    return { kind: match[1].toLowerCase() as MachineKind, number: Number(match[2]) }
}

export function machineGame(assignment: MoveMachineAssignment): MachineGame | null {
    return MACHINE_GAME_BY_SLUG[assignment.game] ?? null
}

export function machineUse(assignment: MoveMachineAssignment): MachineUse | null {
    return machineGame(assignment)?.uses[assignment.kind] ?? null
}

export function machineMechanicsLabel(assignment: MoveMachineAssignment): string {
    const game = machineGame(assignment)
    if (!game) return ''
    const use = game.uses[assignment.kind]
    const parts = [use === 'reusable' ? 'Reusable' : use === 'single' ? 'Single use' : '']
    const note = game.notes?.[assignment.kind]
    if (note) parts.push(note)
    return parts.filter(Boolean).join(' · ')
}

export function formatMachineCode(assignment: MoveMachineAssignment): string {
    const digits = machineGame(assignment)?.digits[assignment.kind] ?? 2
    return `${assignment.kind.toUpperCase()}${String(assignment.number).padStart(digits, '0')}`
}

/** Compact full game mappings into the generation-aware data needed by /moves search. */
export function machineSearchEntries(assignments: MoveMachineAssignment[]): MoveMachineSearchEntry[] {
    const seen = new Set<string>()
    const entries: MoveMachineSearchEntry[] = []
    for (const assignment of assignments) {
        const gen = machineGame(assignment)?.gen
        if (!gen) continue
        const key = `${assignment.kind}/${assignment.number}/${gen}`
        if (seen.has(key)) continue
        seen.add(key)
        entries.push({ kind: assignment.kind, number: assignment.number, gen })
    }
    return entries.sort((a, b) => a.gen - b.gen || a.kind.localeCompare(b.kind) || a.number - b.number)
}

export function matchesMachineQuery(
    entries: MoveMachineSearchEntry[],
    query: MachineQuery,
    generations?: number[],
): boolean {
    return entries.some((entry) =>
        entry.kind === query.kind
        && entry.number === query.number
        && (!generations || generations.includes(entry.gen)),
    )
}
