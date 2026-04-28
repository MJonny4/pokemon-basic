import type { MoveDetail } from '../../../../lib/api/pokeapi'
import { TYPES, EFFECTIVENESS, TYPE_COLORS } from '../../../../lib/data/constants'
import { typeBadge, getTypeIcon } from '../../../../ui/badges'

export function renderMoves(moves: MoveDetail[], pokemonTypes: string[], filter: string, search: string): void {
    const grid = document.getElementById('movesGrid')
    if (!grid) return

    // Update coverage section (from all moves)
    updateCoverage(moves)

    // Filter
    let filtered = [...moves]
    const ms = search.toLowerCase()
    if (filter === 'physical') filtered = filtered.filter((m) => m.damage_class.name === 'physical')
    else if (filter === 'special') filtered = filtered.filter((m) => m.damage_class.name === 'special')
    else if (filter === 'status') filtered = filtered.filter((m) => m.damage_class.name === 'status')
    else if (filter === 'damaging') filtered = filtered.filter((m) => m.damage_class.name !== 'status' && m.power)
    else if (filter === 'egg') filtered = filtered.filter((m) => m.learn_method === 'egg')
    else if (filter === 'tutor') filtered = filtered.filter((m) => m.learn_method === 'tutor')
    if (ms) filtered = filtered.filter((m) => m.name.includes(ms))

    const methodOrder: Record<string, number> = { 'level-up': 0, machine: 1, hm: 2, egg: 3, tutor: 4 }
    const byMethod = (a: MoveDetail, b: MoveDetail) => {
        const diff = (methodOrder[a.learn_method] ?? 9) - (methodOrder[b.learn_method] ?? 9)
        if (diff !== 0) return diff
        return a.level_learned_at - b.level_learned_at
    }
    const damage = filtered.filter((m) => m.damage_class.name !== 'status' && m.power).sort(byMethod)
    const status = filtered.filter((m) => m.damage_class.name === 'status').sort(byMethod)

    const catBg: Record<string, string> = {
        physical: 'move-card-physical',
        special: 'move-card-special',
        status: 'move-card-status',
    }
    const catIcon: Record<string, string> = { physical: '💥', special: '✨', status: '🔄' }
    const catColor: Record<string, string> = {
        physical: 'text-orange-500',
        special: 'text-indigo-500',
        status: 'text-slate-400',
    }

    const card = (m: MoveDetail): string => {
        const mt = m.type.name.charAt(0).toUpperCase() + m.type.name.slice(1)
        const mc = TYPE_COLORS[m.type.name] ?? '#999'
        const isSTAB = pokemonTypes.includes(m.type.name)
        const row = EFFECTIVENESS[mt]
        const se: string[] = [],
            nve: string[] = [],
            imm: string[] = []
        if (row)
            TYPES.forEach((dt, i) => {
                if (row[i] === 2) se.push(dt)
                else if (row[i] === 0.5) nve.push(dt)
                else if (row[i] === 0) imm.push(dt)
            })
        const effPow = isSTAB && m.power ? Math.round(m.power * 1.5) : null
        const cat = m.damage_class.name

        return `<div class="move-card ${catBg[cat]} rounded-xl p-3.5 border border-slate-200 hover:border-violet-300" style="border-left-color:${mc}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-black text-sm text-slate-800 capitalize">${m.name.replace(/-/g, ' ')}</span>
          ${m.learn_method === 'machine'
            ? '<span class="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">TM</span>'
            : m.learn_method === 'hm'
            ? '<span class="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">HM</span>'
            : m.learn_method === 'egg'
            ? '<span class="text-[10px] font-semibold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">🥚 Egg</span>'
            : m.learn_method === 'tutor'
            ? '<span class="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">📚 Tutor</span>'
            : `<span class="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Lv. ${m.level_learned_at}</span>`
          }
          ${isSTAB ? '<span class="stab-badge">STAB</span>' : ''}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-bold" style="background:${mc}">
            <img src="${getTypeIcon(mt)}" style="width:10px;height:10px;filter:brightness(0) invert(1)"> ${mt}
          </span>
          <span class="${catColor[cat]} text-xs font-semibold">${catIcon[cat]} ${cat}</span>
        </div>
        <div class="flex gap-2.5 text-xs font-bold text-slate-500 shrink-0 flex-wrap justify-end">
          ${m.power ? `<span class="text-violet-700" title="${isSTAB ? `STAB: ${effPow} effective power` : 'Power'}">💪 ${m.power}${isSTAB ? `<span class="text-emerald-500 text-[10px] ml-0.5">→${effPow}</span>` : ''}</span>` : ''}
          <span title="Accuracy">🎯 ${m.accuracy ?? '—'}</span>
          <span title="PP">PP ${m.pp ?? '—'}</span>
        </div>
      </div>
      ${
          cat === 'status'
              ? (() => {
                  const effect = m.effect_entries?.find((e) => e.language.name === 'en')?.short_effect ?? ''
                  return effect
                      ? `<p class="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200/70 italic">${effect}</p>`
                      : ''
              })()
              : se.length || nve.length || imm.length
              ? `
      <div class="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
        ${se.length ? `<span class="text-emerald-600 font-black text-[10px] self-center mr-0.5">✓ hits hard:</span>${se.map((t) => typeBadge(t, 'sm')).join('')}` : ''}
        ${nve.length ? `<span class="text-red-500 font-black text-[10px] self-center ml-2 mr-0.5">↓ resisted:</span>${nve.map((t) => typeBadge(t, 'sm')).join('')}` : ''}
        ${imm.length ? `<span class="text-slate-400 font-black text-[10px] self-center ml-2 mr-0.5">✗ no effect:</span>${imm.map((t) => typeBadge(t, 'sm')).join('')}` : ''}
      </div>`
              : ''
      }
    </div>`
    }

    grid.innerHTML = `
    ${
        damage.length
            ? `<h3 class="font-black text-slate-700 text-sm mb-3">⚔️ Damaging <span class="text-slate-400 font-normal">(${damage.length})</span></h3>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-5">${damage.map(card).join('')}</div>`
            : ''
    }
    ${
        status.length
            ? `<h3 class="font-black text-slate-700 text-sm mb-3">🔄 Status <span class="text-slate-400 font-normal">(${status.length})</span></h3>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-2.5">${status.map(card).join('')}</div>`
            : ''
    }
    ${!damage.length && !status.length ? `<div class="text-center py-16 text-slate-400 font-semibold">No moves match your filter.</div>` : ''}`
}

function updateCoverage(moves: MoveDetail[]): void {
    const covered = new Set<string>()
    moves
        .filter((m) => m.power && m.damage_class.name !== 'status')
        .forEach((m) => {
            const mt = m.type.name.charAt(0).toUpperCase() + m.type.name.slice(1)
            const row = EFFECTIVENESS[mt]
            if (row)
                TYPES.forEach((dt, i) => {
                    if (row[i] === 2) covered.add(dt)
                })
        })
    const count = covered.size
    const pct = Math.round((count / 18) * 100)

    // Update Alpine store if available
    const Alpine = (window as any).Alpine
    if (Alpine) {
        const store = Alpine.store('pokemon') as any
        if (store) {
            store.coverageCount = count
            store.coveragePct = pct
        }
    }

    // Update coverage type badges
    const covEl = document.getElementById('coverageTypes')
    if (covEl) covEl.innerHTML = [...covered].map((t) => typeBadge(t, 'sm')).join('')
}
