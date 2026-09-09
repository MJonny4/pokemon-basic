import { typeBadge } from './badges'
import { categoryBadge } from './category-badge'
import { TYPE_COLORS } from '../lib/data/constants'
import type { MoveMachineSearchEntry } from '../lib/logic/machines'

/** Compact move shape used by the /moves listing payload and card renderer. */
export interface MoveListEntry {
    slug: string
    type: string
    cls: 'physical' | 'special' | 'status'
    power: number | null
    acc: number | null
    pp: number
    gen: number
    /** Search-only metadata; intentionally not rendered on listing cards. */
    machines: MoveMachineSearchEntry[]
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

export function genLabel(gen: number): string {
    return ROMAN[gen] ?? String(gen)
}

export function titleize(slug: string): string {
    return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Matches the category-badge colors so the fade and the pill read as one system
const CAT_COLORS: Record<string, string> = { physical: '#f97316', special: '#6366f1', status: '#64748b' }

/**
 * Shared card skin: type-colored left border, background fading from a light
 * tint of the type into a tint of the damage category. Low-alpha layers over
 * var(--bg-surface) keep it correct in both light and dark mode.
 */
export function moveCardStyle(type: string, cls: string): string {
    const t = TYPE_COLORS[type] ?? '#999'
    const c = CAT_COLORS[cls] ?? CAT_COLORS.status
    return `border-left:4px solid ${t};background:linear-gradient(90deg,${t}26,${c}26),var(--bg-surface)`
}

/** Small "Gen V" pill for a card's top-right corner. */
export function genChip(gen: number): string {
    return `<span class="shrink-0 px-2 py-0.5 rounded-full bg-bg-surface/60 border border-border-subtle text-[10px] font-black text-text-secondary">Gen ${genLabel(gen)}</span>`
}

/** Full listing card — badges on top, gen chip top-right, name, divider, spread stats. */
export function moveCard(m: MoveListEntry, base: string): string {
    return `<a href="${base}/moves/${m.slug}"
    class="move-card block rounded-xl border border-border-subtle p-3.5 hover:border-action transition"
    style="${moveCardStyle(m.type, m.cls)}">
    <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">${typeBadge(m.type)}${categoryBadge(m.cls, base)}</div>
        ${genChip(m.gen)}
    </div>
    <div class="font-black text-sm text-text-primary mt-2">${titleize(m.slug)}</div>
    <hr class="border-border-subtle my-2.5">
    <div class="flex items-center justify-between text-xs font-semibold text-text-secondary">
        <span><span class="text-text-tertiary font-bold">BP</span> ${m.power ?? '—'}</span>
        <span><span class="text-text-tertiary font-bold">Acc</span> ${m.acc != null ? m.acc + '%' : '—'}</span>
        <span><span class="text-text-tertiary font-bold">PP</span> ${m.pp}</span>
    </div>
</a>`
}
