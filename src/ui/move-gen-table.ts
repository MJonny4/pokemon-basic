import { genLabel } from './move-card'

export interface MovePastChange {
    through_gen: number
    power?: number
    accuracy?: number
    pp?: number
    type?: string
}

export interface MoveGenTableInput {
    gen: number
    type: string
    damage_class: 'physical' | 'special' | 'status'
    power: number | null
    accuracy: number | null
    pp: number
    past?: MovePastChange[]
}

// Gen I–III: no Physical/Special split — category is determined by the move's type
const SPECIAL_TYPES = new Set(['fire', 'water', 'grass', 'electric', 'ice', 'psychic', 'dragon', 'dark'])

interface GenRow {
    gen: number
    power: number | null
    accuracy: number | null
    pp: number
    type: string
    category: string
}

/**
 * Value of a field in generation g: the earliest past entry with
 * through_gen >= g that carries the field wins; otherwise current value.
 * (past entries are sorted ascending by through_gen in moves-meta.json)
 */
function valueAt<K extends 'power' | 'accuracy' | 'pp' | 'type'>(
    m: MoveGenTableInput, g: number, field: K,
): GenRow[K extends 'type' ? 'type' : 'power'] {
    for (const p of m.past ?? []) {
        if (p.through_gen >= g && p[field] !== undefined) return p[field] as any
    }
    return m[field] as any
}

/** A single move's gen-correct values (used by the Pokémon detail learnset table). */
export function moveValuesAt(m: MoveGenTableInput, g: number): { power: number | null; accuracy: number | null; pp: number; type: string; category: string } {
    const type = valueAt(m, g, 'type') as string
    const category =
        m.damage_class === 'status' ? 'status'
        : g <= 3 ? (SPECIAL_TYPES.has(type) ? 'special' : 'physical')
        : m.damage_class
    return {
        power: valueAt(m, g, 'power') as number | null,
        accuracy: valueAt(m, g, 'accuracy') as number | null,
        pp: valueAt(m, g, 'pp') as number,
        type,
        category,
    }
}

export function moveGenRows(m: MoveGenTableInput): GenRow[] {
    const rows: GenRow[] = []
    for (let g = m.gen; g <= 9; g++) {
        const type = valueAt(m, g, 'type') as string
        const category =
            m.damage_class === 'status' ? 'status'
            : g <= 3 ? (SPECIAL_TYPES.has(type) ? 'special' : 'physical')
            : m.damage_class
        rows.push({
            gen: g,
            power: valueAt(m, g, 'power') as number | null,
            accuracy: valueAt(m, g, 'accuracy') as number | null,
            pp: valueAt(m, g, 'pp') as number,
            type,
            category,
        })
    }
    return rows
}

/** Collapse consecutive identical rows into "Gen I–V" spans. */
function collapse(rows: GenRow[]): Array<GenRow & { span: string }> {
    const out: Array<GenRow & { span: string }> = []
    for (const r of rows) {
        const prev = out[out.length - 1]
        const same = prev && prev.power === r.power && prev.accuracy === r.accuracy
            && prev.pp === r.pp && prev.type === r.type && prev.category === r.category
        if (same) {
            prev.span = `${genLabel(prev.gen)}–${genLabel(r.gen)}`
        } else {
            out.push({ ...r, span: genLabel(r.gen) })
        }
    }
    return out
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Cross-gen comparison table. Cells that differ from the modern value get highlighted. */
export function moveGenTable(m: MoveGenTableInput): string {
    const rows = collapse(moveGenRows(m))
    if (rows.length === 1 && m.gen === 9) return '' // nothing historical to show
    const modern = rows[rows.length - 1]
    const cell = (v: string, changed: boolean) =>
        `<td class="px-3 py-2 font-semibold ${changed ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-text-secondary'}">${v}</td>`
    const body = rows.map((r) => `
        <tr class="border-t border-border-subtle">
            <td class="px-3 py-2 font-black text-text-primary whitespace-nowrap">Gen ${r.span}</td>
            ${cell(r.type !== modern.type ? cap(r.type) : cap(r.type), r.type !== modern.type)}
            ${cell(cap(r.category), r.category !== modern.category)}
            ${cell(r.power == null ? '—' : r.power === 1 ? 'Varies' : String(r.power), r.power !== modern.power)}
            ${cell(r.accuracy != null ? r.accuracy + '%' : '—', r.accuracy !== modern.accuracy)}
            ${cell(String(r.pp), r.pp !== modern.pp)}
        </tr>`).join('')
    return `<div class="overflow-x-auto">
    <table class="w-full text-xs text-left">
        <thead>
            <tr class="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                <th class="px-3 py-2">Gens</th><th class="px-3 py-2">Type</th><th class="px-3 py-2">Category</th>
                <th class="px-3 py-2">Power</th><th class="px-3 py-2">Accuracy</th><th class="px-3 py-2">PP</th>
            </tr>
        </thead>
        <tbody>${body}</tbody>
    </table>
</div>`
}
