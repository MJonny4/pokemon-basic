import Alpine from 'alpinejs'
import './style.css'
import { registerStore } from './store/pokemon'
import { registerSearchBar } from './components/SearchBar'
import { registerModal } from './components/Modal'
import { buildTypeChart } from './ui/typeChart'
import { fetchPokemon, fetchSpecies, fetchMoves, fetchAbilities, fetchEvolutionChain } from './api/pokeapi'
import { detectRole } from './logic/roleDetect'
import { buildOverview, appendEvoChain, flatEvo } from './components/tabs/OverviewTab'
import { buildDefense } from './components/tabs/DefenseTab'
import { renderMoves } from './components/tabs/MovesTab'
import { buildTrainer } from './components/tabs/TrainerTab'
import { buildCompare } from './components/tabs/CompareTab'
import { TYPE_COLORS } from './data/constants'
import { typeBadge } from './ui/components'

declare global {
    interface Window {
        Alpine: typeof Alpine
        rerenderMoves: (filter: string, search: string) => void
    }
}

// Register Alpine store and components before start
registerStore()
registerSearchBar()
registerModal()

// Main search handler — orchestrates everything
window.addEventListener('pokemon-search', async (e: Event) => {
    const name = (e as CustomEvent).detail.name.toLowerCase()
    const store = Alpine.store('pokemon') as any
    store.loading = true
    store.error = null
    store.isShiny = false

    try {
        const [pokemon, species] = await Promise.all([fetchPokemon(name), fetchSpecies(name).catch(() => null)])

        const statMap = Object.fromEntries(pokemon.stats.map((s) => [s.stat.name, s.base_stat]))
        const role = detectRole(statMap)

        // Update banner color in store (for Alpine template use)
        const types = pokemon.types.map((t) => t.type.name)
        store.bannerColor = TYPE_COLORS[types[0]] ?? '#7c3aed'
        store.spriteUrl =
            pokemon.sprites.other['official-artwork']?.front_default ?? pokemon.sprites.front_default ?? ''

        const spd = statMap['speed'] ?? 0
        store.speedTierLabel = spd >= 110 ? '⚡ Fast Tier' : spd >= 70 ? '🏃 Mid Tier' : '🐢 Slow Tier'

        const genRaw = species?.generation?.name ?? ''
        store.generation = genRaw ? 'Gen ' + genRaw.split('-')[1].toUpperCase() : ''

        const [moves, abilities] = await Promise.all([fetchMoves(pokemon.moves), fetchAbilities(pokemon.abilities)])

        store.pokemon = pokemon
        store.species = species
        store.moves = moves
        store.role = role
        store.loading = false

        // Update banner type badges
        const bannerTypes = document.getElementById('bannerTypes')
        if (bannerTypes) bannerTypes.innerHTML = types.map((t) => typeBadge(t, 'md')).join('')

        // Render all panels
        buildOverview(pokemon, species, abilities)
        buildDefense(pokemon)
        renderMoves(moves, types, 'all', '')
        buildTrainer(pokemon, role, species)
        buildCompare(pokemon)

        // Add to search history
        window.dispatchEvent(new CustomEvent('history-add', { detail: { name: pokemon.name, id: pokemon.id } }))

        // Load evo chain async (non-blocking)
        if (species?.evolution_chain?.url) {
            fetchEvolutionChain(species.evolution_chain.url)
                .then(async (chain) => {
                    const names = flatEvo(chain.chain)
                    if (names.length <= 1) return
                    const results = await Promise.all(names.map((n) => fetchPokemon(n).catch(() => null)))
                    const valid = results.filter(Boolean) as Awaited<ReturnType<typeof fetchPokemon>>[]
                    appendEvoChain(chain, valid)
                })
                .catch(() => {})
        }
    } catch {
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

// Listen for history-add and forward to SearchBar component
window.addEventListener('history-add', (e: Event) => {
    const { name, id } = (e as CustomEvent).detail
    // SearchBar exposes addToHistory via Alpine component
    const searchBarEl = document.querySelector('[x-data="searchBar"]')
    if (searchBarEl) {
        const comp = (window.Alpine as any).$data(searchBarEl)
        comp?.addToHistory?.(name, id)
    }
})

// Shiny toggle via store
window.addEventListener('toggle-shiny', () => {
    const store = Alpine.store('pokemon') as any
    if (!store.pokemon) return
    store.isShiny = !store.isShiny
    const p = store.pokemon
    store.spriteUrl = store.isShiny
        ? (p.sprites.other['official-artwork']?.front_shiny ?? p.sprites.front_shiny ?? p.sprites.front_default)
        : (p.sprites.other['official-artwork']?.front_default ?? p.sprites.front_default)
})

// Expose rerenderMoves for Modal filter chips
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

// Auto-search: URL param (?search=charizard) takes priority, then sessionStorage fallback
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

// Boot Alpine and chart
window.Alpine = Alpine
Alpine.start()
buildTypeChart()
