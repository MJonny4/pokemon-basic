import Alpine from 'alpinejs'
import { gsap } from 'gsap'
import { fetchPokemon, fetchSpecies, fetchMoves, fetchAbilities, fetchEvolutionChain } from './api/pokeapi'
import { detectRole } from './logic/role-detect'
import { buildOverview, appendEvoChain, flatEvo } from '../alpine/components/pokedex/modal-tabs/overview'
import { buildDefense } from '../alpine/components/pokedex/modal-tabs/defense'
import { renderMoves } from '../alpine/components/pokedex/modal-tabs/moves'
import { buildTrainer } from '../alpine/components/pokedex/modal-tabs/trainer'
import { buildCompare } from '../alpine/components/pokedex/modal-tabs/compare'
import { TYPE_COLORS } from './data/constants'
import { typeBadge } from '../ui/badges'

declare global {
    interface Window {
        rerenderMoves: (filter: string, search: string) => void
    }
}

export function setupPokedexLoader(): void {
    window.rerenderMoves = (filter: string, search: string) => {
        const store = Alpine.store('pokemon') as any
        if (store.pokemon && store.moves) {
            renderMoves(
                store.moves,
                store.pokemon.types.map((t: any) => t.type.name),
                filter,
                search,
            )
        }
    }

    window.addEventListener('pokemon-search', async (e: Event) => {
        const name = (e as CustomEvent).detail.name.toLowerCase()
        const store = Alpine.store('pokemon') as any
        store.loading = true
        store.error = null
        store.isShiny = false

        try {
            const [pokemon, species] = await Promise.all([fetchPokemon(name), fetchSpecies(name).catch(() => null)])

            // Forme variants (e.g. meloetta-aria) have no species endpoint — fall back to base species name
            const resolvedSpecies = species ?? await fetchSpecies(pokemon.species.name).catch(() => null)

            const statMap = Object.fromEntries(pokemon.stats.map((s) => [s.stat.name, s.base_stat]))
            const role = detectRole(statMap)

            const types = pokemon.types.map((t: any) => t.type.name)
            store.bannerColor = TYPE_COLORS[types[0]] ?? '#7c3aed'
            store.spriteUrl = pokemon.sprites.other['official-artwork']?.front_default ?? pokemon.sprites.front_default ?? ''

            const spd = statMap['speed'] ?? 0
            store.speedTierLabel = spd >= 110 ? '⚡ Fast Tier' : spd >= 70 ? '🏃 Mid Tier' : '🐢 Slow Tier'

            const genRaw = resolvedSpecies?.generation?.name ?? ''
            store.generation = genRaw ? 'Gen ' + genRaw.split('-')[1].toUpperCase() : ''

            const [moves, abilities] = await Promise.all([fetchMoves(pokemon.moves), fetchAbilities(pokemon.abilities)])

            store.pokemon = pokemon
            store.species = species
            store.moves = moves
            store.role = role
            store.loading = false

            const bannerTypes = document.getElementById('bannerTypes')
            if (bannerTypes) bannerTypes.innerHTML = types.map((t: string) => typeBadge(t, 'md')).join('')

            requestAnimationFrame(() => {
                const sprite = document.getElementById('modal-sprite')
                if (sprite) {
                    gsap.fromTo(sprite,
                        { scale: 0.4, opacity: 0, rotation: -8 },
                        { scale: 1, opacity: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform,opacity' },
                    )
                }
                gsap.fromTo('#bannerTypes > span',
                    { opacity: 0, y: 6, scale: 0.85 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(1.4)', stagger: 0.07, clearProps: 'transform,opacity' },
                )
            })

            buildOverview(pokemon, species, abilities)
            buildDefense(pokemon)
            renderMoves(moves, types, 'all', '')
            buildTrainer(pokemon, role, species)
            buildCompare(pokemon)

            window.dispatchEvent(new CustomEvent('history-add', { detail: { name: pokemon.name, id: pokemon.id } }))

            if (resolvedSpecies?.evolution_chain?.url) {
                fetchEvolutionChain(resolvedSpecies.evolution_chain.url)
                    .then(async (chain) => {
                        const names = flatEvo(chain.chain)
                        if (names.length <= 1) return
                        const results = await Promise.all(names.map((n) => fetchPokemon(n).catch(() => null)))
                        const valid = results.filter(Boolean) as any[]
                        appendEvoChain(chain, valid)
                    })
                    .catch(() => {})
            }
        } catch {
            const store = Alpine.store('pokemon') as any
            store.loading = false
            store.error = 'Pokémon not found. Check spelling and try again.'
            const grid = document.getElementById('overviewGrid')
            if (grid)
                grid.innerHTML = `
                <div class="col-span-2 text-center py-20">
                    <div class="text-6xl mb-4">😵</div>
                    <h3 class="text-xl font-bold text-red-500 mb-2">Pokémon Not Found</h3>
                    <p class="text-slate-400 text-sm">Check spelling or try a different name.</p>
                </div>`
        }
    })

    window.addEventListener('history-add', (e: Event) => {
        const { name, id } = (e as CustomEvent).detail
        const searchBarEl = document.querySelector('[x-data="searchBar"]')
        if (searchBarEl) {
            const comp = (Alpine as any).$data(searchBarEl)
            comp?.addToHistory?.(name, id)
        }
    })

    window.addEventListener('toggle-shiny', () => {
        const store = Alpine.store('pokemon') as any
        if (!store.pokemon) return
        store.isShiny = !store.isShiny
        const p = store.pokemon
        store.spriteUrl = store.isShiny
            ? (p.sprites.other['official-artwork']?.front_shiny ?? p.sprites.front_shiny ?? p.sprites.front_default)
            : (p.sprites.other['official-artwork']?.front_default ?? p.sprites.front_default)
    })

    window.addEventListener('load', () => {
        const urlName = new URLSearchParams(window.location.search).get('search')
        if (urlName) {
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name: urlName } }))
            return
        }
        const autoSearch = sessionStorage.getItem('autoSearch')
        if (autoSearch) {
            sessionStorage.removeItem('autoSearch')
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name: autoSearch } }))
        }
    })
}
