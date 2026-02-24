import { ITEMS } from '../data/items'
import type { ItemEntry } from '../data/items'

export function recommendItems(role: string, pokemonTypes: string[], canEvolve: boolean): ItemEntry[] {
    let matched = ITEMS.filter((item) => {
        if (item.roles.includes('__evolve__')) return canEvolve
        if (item.roles.includes('poison_type_wall')) return pokemonTypes.includes('poison') && role.includes('wall')
        return item.roles.includes(role)
    })

    // Always ensure at least 3 items
    if (matched.length < 3) {
        const fallbacks = ['Life Orb', 'Leftovers', 'Focus Sash']
        fallbacks.forEach((name) => {
            if (!matched.find((i) => i.name === name)) {
                const found = ITEMS.find((i) => i.name === name)
                if (found) matched.push(found)
            }
        })
    }

    return matched.slice(0, 6)
}
