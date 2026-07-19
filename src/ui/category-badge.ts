// Damage-category pill (Physical / Special / Status) — colors match the
// .move-card-* accent tints in global.css so cards and badges read as one system.
// Icons are pokemondb's, downloaded locally to public/icons/ (see scripts/ — no hotlinking a third-party CDN).
const CATEGORY_STYLE: Record<string, { bg: string; label: string; icon: string }> = {
    physical: { bg: '#f97316', label: 'Physical', icon: 'move-physical.png' },
    special: { bg: '#6366f1', label: 'Special', icon: 'move-special.png' },
    status: { bg: '#64748b', label: 'Status', icon: 'move-status.png' },
}

export function categoryBadge(damageClass: string, base: string, size: 'sm' | 'md' = 'sm'): string {
    const s = CATEGORY_STYLE[damageClass] ?? CATEGORY_STYLE.status
    const px = size === 'md' ? 'pl-1 pr-3 py-1 text-sm' : 'pl-0.5 pr-2 py-0.5 text-xs'
    const chipSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
    const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
    // Icons are dark/grey line art (pokemondb's own style) — a white backdrop
    // chip keeps them visible on every badge color, including the grey status pill.
    return `<span class="inline-flex items-center gap-1.5 ${px} rounded-full text-white font-bold shadow-sm" style="background:${s.bg}">
        <span class="inline-flex items-center justify-center ${chipSize} rounded-full bg-white shrink-0">
            <img src="${base}/icons/${s.icon}" alt="" class="${iconSize} object-contain">
        </span>${s.label}</span>`
}
