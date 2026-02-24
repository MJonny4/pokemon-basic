import { TYPE_COLORS, STAT_COLORS, STAT_LABELS } from '../data/constants'

export function darken(hex: string, amt: number): string {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.min(255, (n >> 16) + amt))
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt))
    const b = Math.max(0, Math.min(255, (n & 255) + amt))
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)
}

export function getTypeIcon(type: string): string {
    return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${type.toLowerCase()}.svg`
}

export function typeBadge(t: string, size: 'sm' | 'md' = 'sm'): string {
    const c = TYPE_COLORS[t.toLowerCase()] ?? '#999'
    const px = size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5'
    const fs = size === 'md' ? 'text-sm' : 'text-xs'
    const iconSize = size === 'md' ? '13' : '10'
    return `<span class="inline-flex items-center gap-1 ${px} rounded-full text-white ${fs} font-bold shadow-sm" style="background:${c}">
    <img src="${getTypeIcon(t)}" style="width:${iconSize}px;height:${iconSize}px;filter:brightness(0) invert(1)"> ${t.charAt(0).toUpperCase() + t.slice(1)}
  </span>`
}

export function typePillLg(t: string, mult: string): string {
    const c = TYPE_COLORS[t.toLowerCase()] ?? '#999'
    return `<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-white font-bold shadow-sm" style="background:linear-gradient(135deg,${c},${darken(c, -25)})">
    <img src="${getTypeIcon(t)}" style="width:15px;height:15px;filter:brightness(0) invert(1)">
    <span class="text-sm">${t}</span>
    ${mult ? `<span class="text-yellow-300 font-black text-xs">${mult}</span>` : ''}
  </div>`
}

export function statBar(statName: string, value: number): string {
    const pct = Math.round((value / 255) * 100)
    const col = STAT_COLORS[statName] ?? '#8b5cf6'
    const label = STAT_LABELS[statName] ?? statName
    const grade = value >= 100 ? '🔥' : value >= 75 ? '✅' : value >= 50 ? '⚠️' : '❌'
    return `<div class="flex items-center gap-2.5">
    <span class="text-xs font-bold text-slate-400 w-14 text-right shrink-0">${label}</span>
    <span class="text-sm font-black w-8 text-right shrink-0 text-slate-700">${value}</span>
    <div class="stat-bar-track flex-1">
      <div class="stat-bar-fill" style="background:${col}" data-pct="${pct}"></div>
    </div>
    <span class="text-xs w-4 shrink-0">${grade}</span>
  </div>`
}
