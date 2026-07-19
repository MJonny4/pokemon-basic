import Alpine from 'alpinejs'
import { fetchPokemonList } from '../../../lib/api/pokeapi'
import { TYPE_COLORS, TYPES } from '../../../lib/data/constants'
import { titleize } from '../../../ui/move-card'
import { EXCLUDED_ITEM_CATEGORIES, itemSprite } from '../../../ui/item-card'
import movesDataJson from '../../../lib/data/moves-data.json'
import itemsCatalogJson from '../../../lib/data/items-catalog.json'

interface RawMove { power: number | null; accuracy: number | null; type: string; damage_class: string }
const MOVES = movesDataJson as unknown as Record<string, RawMove>
interface CatalogItem { name: string; slug: string; category: string; pocket: string }
const ITEMS = itemsCatalogJson as unknown as CatalogItem[]

type Kind = 'pokemon' | 'move' | 'item' | 'type'
interface Result { kind: Kind; key: string; label: string; sub: string; href: string; iconHtml: string }

const KIND_LABEL: Record<Kind, string> = { pokemon: 'Pokémon', move: 'Move', item: 'Item', type: 'Type' }

function pokemonIcon(id: number): string {
    return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" alt="" loading="lazy" style="image-rendering:pixelated">`
}
function moveIcon(type: string): string {
    const c = TYPE_COLORS[type] ?? '#999'
    return `<span class="w-4 h-4 rounded-full shrink-0" style="background:${c}"></span>`
}
function itemIcon(slug: string): string {
    return `<img src="${itemSprite(slug)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
}
function typeIcon(type: string): string {
    const c = TYPE_COLORS[type.toLowerCase()] ?? '#999'
    return `<span class="w-4 h-4 rounded-full shrink-0" style="background:${c}"></span>`
}

export function registerSearchBar(): void {
    Alpine.data('searchBar', () => ({
        query: '',
        acResults: [] as Result[],
        acOpen: false,
        allPokemon: [] as Array<{ name: string; id: number }>,
        acTimer: 0,
        base: import.meta.env.BASE_URL,

        async init() {
            this.allPokemon = await fetchPokemonList()

            // Global "/" focuses the search input, unless already typing somewhere else.
            window.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key !== '/') return
                const tag = (e.target as HTMLElement | null)?.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
                e.preventDefault()
                const input = this.$refs.searchInput as HTMLInputElement | undefined
                input?.focus()
            })
        },

        handleInput() {
            clearTimeout(this.acTimer)
            if (!this.query || this.query.length < 2) { this.acOpen = false; return }
            this.acTimer = window.setTimeout(() => {
                const q = this.query.toLowerCase()
                const base = this.base

                const pokemon: Result[] = this.allPokemon
                    .filter((p) => p.name.includes(q))
                    .slice(0, 4)
                    .map((p) => ({
                        kind: 'pokemon', key: `p/${p.name}`, label: titleize(p.name),
                        sub: '#' + String(p.id).padStart(3, '0'),
                        href: `${base}/pokedex/${p.name}`, iconHtml: pokemonIcon(p.id),
                    }))

                const moves: Result[] = Object.entries(MOVES)
                    .filter(([slug, m]) => m.type !== 'shadow' && slug.includes(q.replace(/\s+/g, '-')))
                    .slice(0, 3)
                    .map(([slug, m]) => ({
                        kind: 'move', key: `m/${slug}`, label: titleize(slug),
                        sub: `${titleize(m.type)} · ${m.power ?? '—'} BP`,
                        href: `${base}/moves/${slug}`, iconHtml: moveIcon(m.type),
                    }))

                const items: Result[] = ITEMS
                    .filter((i) => !EXCLUDED_ITEM_CATEGORIES.has(i.category) && i.name.toLowerCase().includes(q))
                    .slice(0, 3)
                    .map((i) => ({
                        kind: 'item', key: `i/${i.slug}`, label: i.name,
                        sub: titleize(i.category),
                        href: `${base}/items/${i.slug}`, iconHtml: itemIcon(i.slug),
                    }))

                const types: Result[] = TYPES
                    .filter((t) => t.toLowerCase().includes(q))
                    .slice(0, 2)
                    .map((t) => ({
                        kind: 'type', key: `t/${t}`, label: t, sub: '',
                        href: `${base}/types`, iconHtml: typeIcon(t),
                    }))

                this.acResults = [...pokemon, ...moves, ...items, ...types].slice(0, 10)
                this.acOpen = this.acResults.length > 0
            }, 150)
        },

        kindLabel: (k: Kind) => KIND_LABEL[k],

        select(r: Result) {
            this.acOpen = false
            if (r.kind === 'pokemon') {
                this.query = r.label
                window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name: r.label.toLowerCase() } }))
                return
            }
            location.href = r.href
        },

        /** Enter with no dropdown open falls back to the old "treat query as a Pokémon name" behavior. */
        selectFirst() {
            if (this.acOpen && this.acResults.length) { this.select(this.acResults[0]); return }
            const name = this.query.trim().toLowerCase()
            if (name) window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name } }))
        },
    }))
}
