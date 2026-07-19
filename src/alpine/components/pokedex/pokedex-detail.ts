import Alpine from 'alpinejs'
import { fetchPokemon, fetchSpecies, fetchAbilities, fetchEvolutionChain, type Pokemon, type Species, type EvolutionChain } from '../../../lib/api/pokeapi'
import { VG_GEN, GEN_RANGES } from '../../../lib/data/constants'
import { typesInGen } from '../../../lib/data/type-history'
import { typeBadge } from '../../../ui/badges'
import movesDataJson from '../../../lib/data/moves-data.json'
import movesMetaJson from '../../../lib/data/moves-meta.json'
import { statBar } from '../../../ui/stat-bar'
import { defenseChart } from '../../../ui/defense-chart'
import { officialArtwork } from '../../../ui/pokemon-card'
import { moveValuesAt, type MovePastChange } from '../../../ui/move-gen-table'
import { learnsetTable, type LearnsetRow } from '../../../ui/learnset-table'
import { titleize } from '../../../ui/move-card'
import { flatEvoNames, evolutionChainHtml, type EvoPokemon } from '../../../ui/evolution-chain'

interface RawMove { power: number | null; accuracy: number | null; pp: number; type: string; damage_class: string; effect: string }
interface MoveMeta { gen: number; effect_chance?: number; past?: MovePastChange[] }
const MOVES = movesDataJson as unknown as Record<string, RawMove>
const META = movesMetaJson as unknown as Record<string, MoveMeta>

const GEN_LABEL = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
const TABS = ['info', 'moves'] as const
const CAT_FILTERS = ['all', 'physical', 'special', 'status', 'egg', 'tutor'] as const

export function registerPokedexDetail(): void {
    Alpine.data('pokedexDetail', () => ({
        name: '',
        id: 0,
        modernTypes: [] as string[],
        tab: 'info' as (typeof TABS)[number],
        loading: true,
        failed: false,

        infoGen: 9,

        pokemon: null as Pokemon | null,
        species: null as Species | null,
        abilities: [] as Array<{ name: string; hidden: boolean; effect: string }>,
        evoChain: null as EvolutionChain | null,
        evoByName: {} as Record<string, EvoPokemon>,

        moveGen: 9,
        moveCat: 'all' as (typeof CAT_FILTERS)[number],
        genLabels: GEN_LABEL,
        catFilters: CAT_FILTERS,

        async init() {
            const el = this.$el as HTMLElement
            this.name = el.dataset.name ?? ''
            this.id = parseInt(el.dataset.id ?? '0')
            this.modernTypes = (el.dataset.types ?? '').split(',').filter(Boolean)

            // ?shiny=1 from the shiny listing swaps the hero artwork
            if (new URLSearchParams(location.search).get('shiny') === '1') {
                const hero = document.getElementById('dexHeroArt') as HTMLImageElement | null
                if (hero) hero.src = officialArtwork(this.id, true)
            }
            if (location.hash === '#moves') this.tab = 'moves'

            try {
                const pokemon = await fetchPokemon(this.name)
                this.pokemon = pokemon
                const [species, abilityDetails] = await Promise.all([
                    fetchSpecies(pokemon.species.name).catch(() => null),
                    fetchAbilities(pokemon.abilities).catch(() => []),
                ])
                this.species = species
                this.abilities = pokemon.abilities.map((a, i) => ({
                    name: titleize(a.ability.name),
                    hidden: a.is_hidden,
                    effect: abilityDetails[i]?.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ?? '',
                }))

                if (species?.evolution_chain?.url) {
                    fetchEvolutionChain(species.evolution_chain.url)
                        .then(async (chain) => {
                            const names = flatEvoNames(chain.chain)
                            if (names.length <= 1) return
                            const results = await Promise.all(names.map((n) => fetchPokemon(n).catch(() => null)))
                            const byName: Record<string, EvoPokemon> = {}
                            for (const p of results) {
                                if (!p) continue
                                byName[p.name] = { id: p.id, name: p.name, type: p.types[0].type.name }
                            }
                            this.evoChain = chain
                            this.evoByName = byName
                        })
                        .catch(() => {})
                }
            } catch {
                this.failed = true
            }
            this.loading = false

            // .stat-bar-fill renders at width 0; setting the inline width one
            // frame later lets the CSS transition animate the fill.
            this.$nextTick(() => {
                const root = this.$el as HTMLElement
                requestAnimationFrame(() => {
                    root.querySelectorAll<HTMLElement>('.stat-bar-fill[data-pct]').forEach((el) => {
                        el.style.width = (el.dataset.pct ?? '0') + '%'
                    })
                })
            })

            // ←/→ navigate the national dex (ignored while typing in a field)
            const el2 = this.$el as HTMLElement
            window.addEventListener('keydown', (e: KeyboardEvent) => {
                const tag = (e.target as HTMLElement | null)?.tagName
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
                const dest = e.key === 'ArrowLeft' ? el2.dataset.prev : e.key === 'ArrowRight' ? el2.dataset.next : ''
                if (dest) location.href = `${import.meta.env.BASE_URL}/pokedex/${dest}`
            })
        },

        setTab(t: (typeof TABS)[number]) {
            this.tab = t
            history.replaceState(null, '', t === 'moves' ? '#moves' : location.pathname + location.search)
        },

        // ── Generation (shared by info + moves selectors) ────────────────

        allGens: [1, 2, 3, 4, 5, 6, 7, 8, 9],

        /** First generation this Pokémon exists in — earlier gens are disabled. */
        get debutGen(): number {
            for (const [g, [lo, hi]] of Object.entries(GEN_RANGES)) {
                if (this.id >= lo && this.id <= hi) return Number(g)
            }
            return 1
        },

        /** This Pokémon's typing as of the selected info gen. */
        get genTypes(): string[] {
            return typesInGen(this.id, this.modernTypes, this.infoGen)
        },

        genChipClass(g: number, active: boolean): string {
            if (g < this.debutGen) return 'opacity-30 cursor-not-allowed'
            return active ? 'fchip-active' : ''
        },

        setInfoGen(g: number) { if (g >= this.debutGen) this.infoGen = g },

        // ── Information tab ──────────────────────────────────────────────

        get heroTypesHtml(): string {
            return this.genTypes.map((t) => typeBadge(t, 'md')).join('')
        },

        get statBarsHtml(): string {
            if (!this.pokemon) return ''
            const bars = (this.pokemon as Pokemon).stats.map((s) => statBar(s.stat.name, s.base_stat)).join('')
            const total = (this.pokemon as Pokemon).stats.reduce((sum, s) => sum + s.base_stat, 0)
            return bars + `<div class="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                <span class="text-xs font-black text-text-tertiary uppercase tracking-widest">Total</span>
                <span class="text-sm font-black text-text-primary">${total}</span>
            </div>`
        },

        get defenseChartHtml(): string {
            return defenseChart(this.genTypes, this.infoGen)
        },

        get evoChainHtml(): string {
            if (!this.evoChain) return ''
            return evolutionChainHtml(this.evoChain, this.evoByName, import.meta.env.BASE_URL, this.infoGen)
        },

        get dexEntry(): string {
            const s = this.species as Species | null
            if (!s) return ''
            const en = s.flavor_text_entries.filter((f) => f.language.name === 'en')
            return (en[en.length - 1]?.flavor_text ?? '').replace(/[\n\f\r]/g, ' ')
        },

        get genus(): string {
            const s = this.species as Species | null
            return s?.genera.find((g) => g.language.name === 'en')?.genus ?? ''
        },

        get speciesRows(): Array<{ label: string; value: string }> {
            const s = this.species as Species | null
            const p = this.pokemon as Pokemon | null
            if (!s) return []
            const rows: Array<{ label: string; value: string }> = []
            if (s.capture_rate != null) rows.push({ label: 'Catch rate', value: String(s.capture_rate) })
            if (s.gender_rate != null) rows.push({
                label: 'Gender',
                value: s.gender_rate === -1 ? 'Genderless' : `${100 - s.gender_rate * 12.5}% ♂ / ${s.gender_rate * 12.5}% ♀`,
            })
            if (s.egg_groups?.length) rows.push({ label: 'Egg groups', value: s.egg_groups.map((g) => titleize(g.name)).join(', ') })
            if (s.base_happiness != null) rows.push({ label: 'Base friendship', value: String(s.base_happiness) })
            if (p?.base_experience) rows.push({ label: 'Base exp', value: String(p.base_experience) })
            if (s.growth_rate) rows.push({ label: 'Growth rate', value: titleize(s.growth_rate.name) })
            return rows
        },

        // ── Moves tab ────────────────────────────────────────────────────

        setMoveGen(g: number) { if (g >= this.debutGen) this.moveGen = g },
        setMoveCat(c: (typeof CAT_FILTERS)[number]) { this.moveCat = c },

        get learnsetRows(): LearnsetRow[] {
            const p = this.pokemon as Pokemon | null
            if (!p) return []
            const g = this.moveGen
            const rows: LearnsetRow[] = []
            const seen = new Set<string>()
            for (const entry of p.moves) {
                const slug = entry.move.name
                const local = MOVES[slug]
                if (!local || local.type === 'shadow') continue
                for (const vgd of entry.version_group_details) {
                    if (VG_GEN[vgd.version_group.name] !== g) continue
                    const method = vgd.move_learn_method.name
                    const key = `${slug}/${method}`
                    if (seen.has(key)) continue
                    seen.add(key)
                    const v = moveValuesAt({
                        gen: META[slug]?.gen ?? 1,
                        type: local.type,
                        damage_class: local.damage_class as 'physical' | 'special' | 'status',
                        power: local.power,
                        accuracy: local.accuracy,
                        pp: local.pp,
                        past: META[slug]?.past,
                    }, g)
                    rows.push({ slug, method, level: vgd.level_learned_at, ...v })
                }
            }
            const cat = this.moveCat
            const filtered = rows.filter((r) => {
                if (cat === 'all') return true
                if (cat === 'egg' || cat === 'tutor') return r.method === cat
                return r.category === cat
            })
            const methodOrder: Record<string, number> = { 'level-up': 0, 'machine': 1, 'egg': 2, 'tutor': 3 }
            return filtered.sort((a, b) =>
                (methodOrder[a.method] ?? 9) - (methodOrder[b.method] ?? 9)
                || a.level - b.level
                || a.slug.localeCompare(b.slug))
        },

        get learnsetTableHtml(): string {
            return learnsetTable(this.learnsetRows, import.meta.env.BASE_URL)
        },

        openCompare() {
            window.dispatchEvent(new CustomEvent('pokemon-search', { detail: { name: this.name } }))
        },

        capitalize: (s: string) => titleize(s),
    }))
}
