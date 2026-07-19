import { typeListForGen, effectivenessAt } from '../../../lib/data/type-history'
import { getTypeIcon } from '../../../ui/badges'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Render the full matchup table for `gen`'s chart (0 = modern / Gen VI+). */
export function buildTypeChart(gen = 0): void {
    const table = document.getElementById('typeChart')
    if (!table) return
    const types = typeListForGen(gen).map(cap)
    let html = '<thead><tr><th class="p-1 min-w-4"></th>'
    types.forEach((t) => {
        html += `<th class="p-1" data-col-type="${t.toLowerCase()}">
      <div class="type-header type-${t.toLowerCase()}">
        <img src="${getTypeIcon(t)}" alt="${t}" class="type-icon">
        <span>${t}</span>
      </div></th>`
    })
    html += '</tr></thead><tbody>'
    types.forEach((atk) => {
        html += `<tr data-row-type="${atk.toLowerCase()}"><td class="p-1.5">
      <div class="type-row-label type-${atk.toLowerCase()}">
        <img src="${getTypeIcon(atk)}" alt="${atk}" class="type-icon">
        <span>${atk}</span>
      </div></td>`
        types.forEach((def) => {
            const eff = effectivenessAt(atk, def, gen)
            let cls = 'normal-damage',
                disp = '1×'
            if (eff === 2) {
                cls = 'super-effective'
                disp = '2×'
            } else if (eff === 0.5) {
                cls = 'not-very-effective'
                disp = '½×'
            } else if (eff === 0) {
                cls = 'no-effect'
                disp = '0×'
            }
            html += `<td class="type-cell ${cls} border border-white/20 text-center">${disp}</td>`
        })
        html += '</tr>'
    })
    table.innerHTML = html + '</tbody>'
}
