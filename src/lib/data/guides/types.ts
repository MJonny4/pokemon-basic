export type EncounterMethod = 'grass' | 'surf' | 'fishing' | 'cave' | 'gift' | 'trade'
export type StopKind = 'town' | 'route' | 'gym' | 'dungeon' | 'elite-four' | 'champion'

export interface StarterChoice {
    name: string        // 'Bulbasaur', 'Charmander', 'Squirtle'
    id: number          // Pokemon dex ID for sprite
    type: string        // 'grass', 'fire', 'water'
    description: string // Short beginner-friendly tip
}

export interface WildEntry {
    name: string
    id: number
    minLevel: number
    maxLevel: number
    method: EncounterMethod
    rarity?: 'common' | 'uncommon' | 'rare'
}

export interface GuideItem {
    name: string
    location: string
    icon?: string
}

export interface GymTrainerPokemon {
    name: string
    id: number
    level: number
}

export interface GymInfo {
    leader: string
    type: string
    team: GymTrainerPokemon[]
    badge: string
    tmReward: string
    strategy: string
    weaknesses: string[]
    starterHints?: Record<string, string>  // Key: starter name lowercase (e.g. 'bulbasaur')
    recommendedLevel?: number              // Minimum recommended team level
}

export interface GuideStop {
    id: string
    name: string
    kind: StopKind
    icon?: string  // Emoji that overrides the default stop-kind icon
    steps: string[]
    items: GuideItem[]
    wildPokemon: WildEntry[]
    gym?: GymInfo
    tips?: string[]
}

export interface GameGuide {
    id: string
    title: string
    gen: number
    starters?: StarterChoice[]
    stops: GuideStop[]
}
