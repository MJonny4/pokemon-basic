import { typeBadge } from './badges'
import { categoryBadge } from './category-badge'
import { titleize } from './move-card'

/** One learnset row, already resolved to gen-correct values by the caller. */
export interface LearnsetRow {
    slug: string
    method: string // level-up | machine | egg | tutor | ...
    level: number
    power: number | null
    accuracy: number | null
    pp: number
    type: string
    category: string
}

const METHOD_LABEL: Record<string, string> = {
    'level-up': 'Level up', 'machine': 'TM/HM', 'egg': 'Egg', 'tutor': 'Tutor',
}

export function methodLabel(m: string): string {
    return METHOD_LABEL[m] ?? titleize(m)
}

function howLearned(r: LearnsetRow): string {
    if (r.method === 'level-up') return r.level <= 1 ? 'Start' : `Lv. ${r.level}`
    return methodLabel(r.method)
}

/** Learnset table for the Pokémon detail Moves tab. Move names link to /moves/[slug]. */
export function learnsetTable(rows: LearnsetRow[], base: string): string {
    if (!rows.length) return '<p class="text-sm text-text-tertiary font-semibold py-4">No moves match this filter in the selected generation.</p>'
    const body = rows.map((r) => `
        <tr class="border-t border-border-subtle hover:bg-bg-elevated transition">
            <td class="px-3 py-2 text-xs font-black text-text-tertiary whitespace-nowrap">${howLearned(r)}</td>
            <td class="px-3 py-2"><a href="${base}/moves/${r.slug}" class="text-sm font-bold text-text-primary hover:text-action transition">${titleize(r.slug)}</a></td>
            <td class="px-3 py-2">${typeBadge(r.type)}</td>
            <td class="px-3 py-2">${categoryBadge(r.category, base)}</td>
            <td class="px-3 py-2 text-xs font-semibold text-text-secondary">${r.power ?? '—'}</td>
            <td class="px-3 py-2 text-xs font-semibold text-text-secondary">${r.accuracy != null ? r.accuracy + '%' : '—'}</td>
            <td class="px-3 py-2 text-xs font-semibold text-text-secondary">${r.pp}</td>
        </tr>`).join('')
    return `<div class="overflow-x-auto">
    <table class="w-full text-left">
        <thead>
            <tr class="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                <th class="px-3 py-2">Learned</th><th class="px-3 py-2">Move</th><th class="px-3 py-2">Type</th>
                <th class="px-3 py-2">Cat</th><th class="px-3 py-2">BP</th><th class="px-3 py-2">Acc</th><th class="px-3 py-2">PP</th>
            </tr>
        </thead>
        <tbody>${body}</tbody>
    </table>
</div>`
}
