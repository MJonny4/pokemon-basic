/**
 * Curated pool of 35 recognizable competitive Pokémon for CPU teams.
 * Chosen to cover all 18 types and a mix of roles (sweepers, walls, support).
 */
export const CPU_POOL: string[] = [
    'charizard',
    'blastoise',
    'venusaur',
    'mewtwo',
    'gengar',
    'alakazam',
    'dragonite',
    'tyranitar',
    'metagross',
    'garchomp',
    'lucario',
    'weavile',
    'scizor',
    'rotom-wash',
    'toxapex',
    'ferrothorn',
    'landorus-therian',
    'blaziken',
    'gardevoir',
    'clefable',
    'corviknight',
    'dragapult',
    'incineroar',
    'mimikyu',
    'hatterene',
    'kommo-o',
    'magnezone',
    'excadrill',
    'urshifu-single-strike',
    'spectrier',
    'volcarona',
    'mew',
    'jirachi',
    'gliscor',
    'breloom',
]

/**
 * Default EV spread for CPU Pokemon based on their role key.
 * Keys match RoleKey from detectRole().
 */
export const CPU_EVS: Record<string, Record<string, number>> = {
    physical_sweeper:  { hp: 4,   attack: 252, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 252 },
    special_sweeper:   { hp: 4,   attack: 0,   defense: 0, 'special-attack': 252, 'special-defense': 0, speed: 252 },
    mixed_sweeper:     { hp: 4,   attack: 126, defense: 0, 'special-attack': 126, 'special-defense': 0, speed: 252 },
    physical_wall:     { hp: 252, attack: 0,   defense: 252, 'special-attack': 0, 'special-defense': 4, speed: 0 },
    special_wall:      { hp: 252, attack: 0,   defense: 4,   'special-attack': 0, 'special-defense': 252, speed: 0 },
    bulky_wall:        { hp: 252, attack: 0,   defense: 128, 'special-attack': 0, 'special-defense': 128, speed: 0 },
    support:           { hp: 252, attack: 0,   defense: 128, 'special-attack': 0, 'special-defense': 128, speed: 0 },
    pivot:             { hp: 252, attack: 0,   defense: 0,   'special-attack': 0, 'special-defense': 0,  speed: 252 },
    revenge_killer:    { hp: 4,   attack: 252, defense: 0,   'special-attack': 0, 'special-defense': 0,  speed: 252 },
}

export const CPU_EVS_DEFAULT: Record<string, number> = {
    hp: 4, attack: 252, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 252,
}
