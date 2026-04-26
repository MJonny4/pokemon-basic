import { TYPES, EFFECTIVENESS } from '../lib/data/constants'
import { getTypeIcon } from './components'

export function buildTypeChart(): void {
    const table = document.getElementById('typeChart')
    if (!table) return
    let html = '<thead><tr><th class="p-1 min-w-4"></th>'
    TYPES.forEach((t) => {
        html += `<th class="p-1" data-col-type="${t.toLowerCase()}">
      <div class="type-header type-${t.toLowerCase()}">
        <img src="${getTypeIcon(t)}" alt="${t}" class="type-icon">
        <span>${t}</span>
      </div></th>`
    })
    html += '</tr></thead><tbody>'
    TYPES.forEach((atk) => {
        html += `<tr data-row-type="${atk.toLowerCase()}"><td class="p-1.5">
      <div class="type-row-label type-${atk.toLowerCase()}">
        <img src="${getTypeIcon(atk)}" alt="${atk}" class="type-icon">
        <span>${atk}</span>
      </div></td>`
        EFFECTIVENESS[atk].forEach((eff) => {
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