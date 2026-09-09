import { MACHINE_GAME_BY_SLUG, MACHINE_GAMES } from '../lib/data/machine-games'
import {
    formatMachineCode,
    machineMechanicsLabel,
    type MoveMachineAssignment,
} from '../lib/logic/machines'
import { genLabel } from './move-card'

const KIND_STYLE = {
    tm: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    hm: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    tr: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
} as const

interface DisplayRow {
    assignment: MoveMachineAssignment
    games: string[]
    mechanics: string
    order: number
}

function rowsForGeneration(assignments: MoveMachineAssignment[]): DisplayRow[] {
    const grouped = new Map<string, DisplayRow>()
    for (const assignment of assignments) {
        const game = MACHINE_GAME_BY_SLUG[assignment.game]
        if (!game) continue
        const mechanics = machineMechanicsLabel(assignment)
        const code = formatMachineCode(assignment)
        // Mechanics is part of the key so, for example, reusable SwSh TMs are
        // never merged with identically numbered single-use BDSP TMs.
        const key = `${code}/${mechanics}`
        const current = grouped.get(key)
        if (current) {
            current.games.push(game.label)
        } else {
            grouped.set(key, { assignment, games: [game.label], mechanics, order: game.order })
        }
    }
    return [...grouped.values()].sort((a, b) => a.order - b.order)
}

function machineBadge(assignment: MoveMachineAssignment): string {
    const style = KIND_STYLE[assignment.kind]
    return `<span class="inline-flex items-center justify-center min-w-16 px-2.5 py-1 rounded-full border text-xs font-black tracking-wide ${style}">${formatMachineCode(assignment)}</span>`
}

/** Generation-first, game-aware TM/HM/TR history for a move detail page. */
export function moveMachineHistory(assignments: MoveMachineAssignment[]): string {
    const known = assignments.filter((assignment) => MACHINE_GAME_BY_SLUG[assignment.game])
    if (!known.length) {
        return '<p class="text-sm text-text-tertiary font-semibold py-1">This move has not been available as a TM, HM, or TR in the supported games.</p>'
    }

    const byGeneration = new Map<number, MoveMachineAssignment[]>()
    for (const assignment of known) {
        const gen = MACHINE_GAME_BY_SLUG[assignment.game].gen
        const rows = byGeneration.get(gen) ?? []
        rows.push(assignment)
        byGeneration.set(gen, rows)
    }

    const generations = [...byGeneration.entries()]
        .sort(([a], [b]) => a - b)
        .map(([gen, generationAssignments]) => {
            const displayRows = rowsForGeneration(generationAssignments)
            const generationGameCount = MACHINE_GAMES.filter((game) => game.gen === gen).length
            const showGameSubcategories = displayRows.length > 1
                || displayRows[0].games.length < generationGameCount
            const rows = displayRows.map((row) => `
                <div class="flex items-center justify-between gap-3 rounded-xl bg-bg-elevated px-3.5 py-3">
                    <div class="min-w-0">
                        ${showGameSubcategories ? `<p class="text-sm font-bold text-text-primary">${row.games.join(', ')}</p>` : ''}
                        <p class="${showGameSubcategories ? 'text-[11px] mt-0.5' : 'text-xs'} font-medium text-text-tertiary">${row.mechanics}</p>
                    </div>
                    ${machineBadge(row.assignment)}
                </div>`).join('')

            return `<section class="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[5rem_1fr]">
                <div><span class="fchip inline-flex py-0.5! px-2.5! text-[10px]! pointer-events-none">Gen ${genLabel(gen)}</span></div>
                <div class="space-y-2">${rows}</div>
            </section>`
        }).join('')

    return `<div class="divide-y divide-border-subtle">${generations}</div>
        <p class="text-[11px] text-text-tertiary font-medium mt-3">Generations and games not shown did not offer this move as a TM, HM, or TR.</p>`
}
