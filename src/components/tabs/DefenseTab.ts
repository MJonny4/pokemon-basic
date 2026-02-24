import type { Pokemon } from '../../api/pokeapi'
import { calcDefenseProfile } from '../../logic/defense'
import { typePillLg } from '../../ui/components'

export function buildDefense(pokemon: Pokemon): void {
    const el = document.getElementById('defenseContent')
    if (!el) return

    const pokemonTypes = pokemon.types.map((t) => t.type.name)
    const { quad, double: dbl, half, quarter, immune } = calcDefenseProfile(pokemonTypes)

    const sect = (bg: string, bdr: string, title: string, rows: Array<[string[], string, string]>): string => {
        const parts = rows
            .map(([arr, mult, lbl]) =>
                !arr.length
                    ? ''
                    : `<div class="mb-3 last:mb-0">
        <p class="text-xs font-black opacity-60 mb-2">${mult} — ${lbl}</p>
        <div class="flex flex-wrap gap-2">${arr.map((t) => typePillLg(t, mult)).join('')}</div>
      </div>`,
            )
            .join('')
        if (!parts.trim()) return ''
        return `<div class="${bg} ${bdr} border-2 rounded-2xl p-5"><h4 class="font-black text-sm mb-3">${title}</h4>${parts}</div>`
    }

    el.innerHTML = `<div class="space-y-4">
    ${sect('bg-red-50', 'border-red-200', '⚠️ Weaknesses', [
        [quad, '4×', 'Quad (dual weakness)'],
        [dbl, '2×', 'Super Effective'],
    ])}
    ${sect('bg-emerald-50', 'border-emerald-200', '🛡️ Resistances', [
        [quarter, '¼×', 'Double Resistance'],
        [half, '½×', 'Not Very Effective'],
    ])}
    ${
        immune.length
            ? `<div class="bg-purple-50 border-purple-200 border-2 rounded-2xl p-5">
      <h4 class="font-black text-sm mb-3">🚫 Immunities</h4>
      <div class="flex flex-wrap gap-2">${immune.map((t) => typePillLg(t, '0×')).join('')}</div>
    </div>`
            : ''
    }
    ${
        !quad.length && !dbl.length && !half.length && !quarter.length && !immune.length
            ? `<div class="text-center py-16 text-slate-400 font-semibold">No special type interactions.</div>`
            : ''
    }
  </div>`
}
