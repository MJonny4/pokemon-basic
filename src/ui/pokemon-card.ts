import { typeBadge } from './badges'

/** Slim manifest shape from pokedex-manifest.json (h dm / w hg — PokeAPI raw units). */
export interface PokedexEntry {
    id: number
    name: string
    types: string[]
    h: number
    w: number
    bst: number
}

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export function pokemonSprite(id: number, shiny = false): string {
    return shiny ? `${SPRITES}/shiny/${id}.png` : `${SPRITES}/${id}.png`
}

export function officialArtwork(id: number, shiny = false): string {
    return `${SPRITES}/other/official-artwork${shiny ? '/shiny' : ''}/${id}.png`
}

export function dexNo(id: number): string {
    return '#' + String(id).padStart(4, '0')
}

export function formatHeight(dm: number): string {
    return (dm / 10).toFixed(1) + ' m'
}

export function formatWeight(hg: number): string {
    return (hg / 10).toFixed(1) + ' kg'
}

export function displayName(slug: string): string {
    return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Listing card for /pokedex/[filter] grids. */
export function pokemonCard(p: PokedexEntry, base: string, shiny = false): string {
    return `<a href="${base}/pokedex/${p.name}${shiny ? '?shiny=1' : ''}"
    class="bg-bg-surface rounded-2xl border border-border-subtle p-4 flex flex-col items-center text-center hover:border-action hover:shadow-md transition group">
    <img src="${pokemonSprite(p.id, shiny)}" alt="${p.name}" loading="lazy"
        class="w-20 h-20 group-hover:scale-110 transition-transform" style="image-rendering:pixelated"
        onerror="this.style.visibility='hidden'">
    <div class="text-[10px] font-black text-text-tertiary font-mono">${dexNo(p.id)}</div>
    <div class="font-black text-sm text-text-primary mb-1.5">${displayName(p.name)}</div>
    <div class="flex items-center justify-center gap-1 mb-2">${p.types.map((t) => typeBadge(t)).join('')}</div>
    <div class="flex items-center gap-2.5 text-[10px] font-semibold text-text-tertiary">
        <span>${formatHeight(p.h)}</span><span>${formatWeight(p.w)}</span>
        <span class="font-black text-text-secondary">BST ${p.bst}</span>
    </div>
</a>`
}
