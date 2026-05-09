import { STAT_COLORS, STAT_LABELS } from '../lib/data/constants'

export function statBar(statName: string, value: number): string {
    const pct = Math.min(100, Math.round((value / 255) * 100))
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