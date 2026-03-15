export const TYPE_COLORS: Record<string, string> = {
    normal: '#9CA3AF', fire: '#F97316', water: '#3B82F6', electric: '#EAB308',
    grass: '#22C55E', ice: '#06B6D4', fighting: '#DC2626', poison: '#A855F7',
    ground: '#CA8A04', flying: '#818CF8', psychic: '#EC4899', bug: '#84CC16',
    rock: '#92400E', ghost: '#6D28D9', dragon: '#7C3AED', dark: '#374151',
    steel: '#94A3B8', fairy: '#F472B6',
}

export function typeColor(type: string): string {
    return TYPE_COLORS[type.toLowerCase()] ?? '#9CA3AF'
}
