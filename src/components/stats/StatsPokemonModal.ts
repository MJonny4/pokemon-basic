import Alpine from 'alpinejs'
import { fetchPokemon, fetchSpecies } from '../../api/pokeapi'
import type { Pokemon } from '../../api/pokeapi'
import { TYPE_COLORS, STAT_COLORS, STAT_LABELS } from '../../data/constants'
import { typeBadge } from '../../ui/components'

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const

function speedTier(spd: number): { label: string; color: string } {
    if (spd >= 120) return { label: '⚡ Blazing', color: '#8b5cf6' }
    if (spd >= 100) return { label: '🏃 Fast', color: '#3b82f6' }
    if (spd >= 80) return { label: '🟡 Above Avg', color: '#f59e0b' }
    if (spd >= 60) return { label: '⚪ Average', color: '#64748b' }
    return { label: '🐢 Slow', color: '#ef4444' }
}

const MODAL_HTML = `
<div x-show="open" style="display:none"
     class="fixed inset-0 z-50 flex items-center justify-center p-4"
     @keydown.escape.window="closeModal()">
  <!-- Backdrop -->
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal()"></div>

  <!-- Card -->
  <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto z-10">

    <!-- Loading -->
    <div x-show="loading" class="p-12 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-3"></div>
      <p class="text-slate-400 text-sm font-semibold">Loading…</p>
    </div>

    <!-- Content -->
    <div x-show="!loading && pokemon">

      <!-- Banner -->
      <div class="rounded-t-2xl p-5 relative" :style="{ background: bannerColor }">
        <button @click="closeModal()"
                class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white font-bold transition text-sm">✕</button>
        <div class="flex items-end gap-3">
          <img :src="pokemon?.sprites?.other?.['official-artwork']?.front_default ?? pokemon?.sprites?.front_default ?? ''"
               :alt="pokemon?.name"
               class="w-28 h-28 object-contain shrink-0"
               style="filter:drop-shadow(0 4px 12px rgba(0,0,0,0.35))">
          <div class="pb-1">
            <p class="text-white/60 text-[11px] font-bold mb-0.5">#<span x-text="String(pokemon?.id ?? '').padStart(4, '0')"></span></p>
            <h2 class="font-black text-lg text-white leading-tight capitalize"
                x-text="pokemon?.name?.replace(/-/g, ' ')"></h2>
            <div class="flex gap-1 flex-wrap mt-1.5" x-html="typeBadgesHtml"></div>
            <span x-show="generation"
                  class="mt-1.5 inline-block text-[10px] font-black tracking-widest text-white/80 bg-white/20 px-2 py-0.5 rounded-full uppercase"
                  x-text="generation"></span>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="p-5">

        <!-- Speed tier + BST -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-xs font-black px-2.5 py-1 rounded-full"
                :style="{ background: speedTier(speed).color + '22', color: speedTier(speed).color }"
                x-text="speedTier(speed).label"></span>
          <span class="text-xs text-slate-400 font-semibold">BST <strong class="text-slate-700" x-text="bst"></strong></span>
        </div>

        <!-- Stats -->
        <div class="space-y-2 mb-4">
          <template x-for="stat in stats" :key="stat.label">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black w-8 shrink-0"
                    :style="{ color: stat.color }"
                    x-text="stat.label"></span>
              <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500"
                     :style="{ width: stat.pct + '%', background: stat.color }"></div>
              </div>
              <span class="text-xs font-bold text-slate-700 w-7 text-right shrink-0"
                    x-text="stat.value"></span>
            </div>
          </template>
        </div>

        <!-- Flavor text -->
        <p x-show="flavorText"
           class="text-xs text-slate-400 italic leading-relaxed mb-4"
           x-text="flavorText"></p>

        <!-- Open in Pokédex -->
        <button @click="goToPokedex(pokemon?.name ?? '')"
                class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition">
          Open full Pokédex →
        </button>
      </div>
    </div>
  </div>
</div>
`

export function registerStatsPokemonModal(): void {
    Alpine.data('statsPokemonModal', () => ({
        open: false,
        loading: false,
        pokemon: null as Pokemon | null,
        bannerColor: '#7c3aed',
        speed: 0,
        bst: 0,
        stats: [] as Array<{ label: string; color: string; value: number; pct: number }>,
        typeBadgesHtml: '',
        generation: '',
        flavorText: '',

        init() {
            // Expose globally so any page can call window.openPokemonQuickView(name)
            ;(window as any).openPokemonQuickView = (name: string) => this.openModal(name)
        },

        speedTier,

        async openModal(name: string) {
            this.open = true
            this.loading = true
            this.pokemon = null
            try {
                const [pokemon, species] = await Promise.all([
                    fetchPokemon(name),
                    fetchSpecies(name).catch(() => null),
                ])
                const types = pokemon.types.map((t) => t.type.name)
                this.pokemon = pokemon
                this.bannerColor = TYPE_COLORS[types[0]] ?? '#7c3aed'
                this.speed = pokemon.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 0
                this.bst = pokemon.stats.reduce((s, x) => s + x.base_stat, 0)
                this.stats = STAT_KEYS.map((key) => {
                    const val = pokemon.stats.find((s) => s.stat.name === key)?.base_stat ?? 0
                    return {
                        label: STAT_LABELS[key] ?? key.toUpperCase(),
                        color: STAT_COLORS[key] ?? '#8b5cf6',
                        value: val,
                        pct: Math.min(100, Math.round((val / 255) * 100)),
                    }
                })
                this.typeBadgesHtml = types.map((t) => typeBadge(t, 'sm')).join('')
                const genRaw = species?.generation?.name ?? ''
                this.generation = genRaw ? 'Gen ' + genRaw.split('-')[1].toUpperCase() : ''
                const ft = species?.flavor_text_entries?.find((e) => e.language.name === 'en')
                this.flavorText = ft?.flavor_text?.replace(/\f/g, ' ').replace(/\n/g, ' ') ?? ''
            } catch {
                this.open = false
            } finally {
                this.loading = false
            }
        },

        closeModal() {
            this.open = false
        },

        goToPokedex(name: string) {
            window.open('./index.html?search=' + encodeURIComponent(name), '_blank')
        },
    }))

    // Inject modal into the page
    const wrapper = document.createElement('div')
    wrapper.setAttribute('x-data', 'statsPokemonModal')
    wrapper.innerHTML = MODAL_HTML
    document.body.appendChild(wrapper)
}
