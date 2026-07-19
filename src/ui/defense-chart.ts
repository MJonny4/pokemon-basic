import { effectivenessAt, typeListForGen } from '../lib/data/type-history'
import { typePillLg } from './badges'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Combined defensive multiplier per attacking type for a mono/dual typing under `gen`'s chart (0 = modern). */
export function defenseMultipliers(types: string[], gen = 0): Record<string, number> {
    const defenders = types.map(cap)
    const result: Record<string, number> = {}
    for (const atk of typeListForGen(gen).map(cap)) {
        let mult = 1
        for (const def of defenders) {
            mult *= effectivenessAt(atk, def, gen)
        }
        result[atk] = mult
    }
    return result
}

const BUCKETS: Array<{ mult: number; label: string; tint: string }> = [
    { mult: 4, label: 'Weak ×4', tint: 'bg-red-500/10 border-red-500/30' },
    { mult: 2, label: 'Weak ×2', tint: 'bg-red-500/10 border-red-500/30' },
    { mult: 0.5, label: 'Resists ×½', tint: 'bg-emerald-500/10 border-emerald-500/30' },
    { mult: 0.25, label: 'Resists ×¼', tint: 'bg-emerald-500/10 border-emerald-500/30' },
    { mult: 0, label: 'Immune ×0', tint: 'bg-purple-500/10 border-purple-500/30' },
]

/** Grouped type-defense panel (weaknesses / resistances / immunities). */
export function defenseChart(types: string[], gen = 0): string {
    const mults = defenseMultipliers(types, gen)
    const sections = BUCKETS.map((b) => {
        const hits = Object.entries(mults).filter(([, m]) => m === b.mult).map(([t]) => t)
        if (!hits.length) return ''
        return `<div class="rounded-xl border p-3 ${b.tint}">
            <div class="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">${b.label}</div>
            <div class="flex flex-wrap gap-1.5">${hits.map((t) => typePillLg(t, '')).join('')}</div>
        </div>`
    }).filter(Boolean).join('')
    return sections || '<p class="text-sm text-text-tertiary font-semibold">Takes neutral damage from every type.</p>'
}
