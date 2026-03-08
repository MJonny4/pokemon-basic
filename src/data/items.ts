export interface ItemEntry {
    name: string
    emoji: string
    color: string
    border: string
    roles: string[]
    desc: string
    textLight?: boolean
}

export const ITEMS: ItemEntry[] = [
    {
        name: 'Choice Band',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/choice-band.png',
        color: '#fef2f2',
        border: '#fca5a5',
        roles: ['physical_sweeper', 'physical_attacker'],
        desc: 'Locks into one move but boosts Attack by 50%.',
    },
    {
        name: 'Choice Specs',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/choice-specs.png',
        color: '#eff6ff',
        border: '#93c5fd',
        roles: ['special_sweeper', 'special_attacker'],
        desc: 'Locks into one move but boosts Sp.Atk by 50%.',
    },
    {
        name: 'Choice Scarf',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/choice-scarf.png',
        color: '#fefce8',
        border: '#fde047',
        roles: ['fast_attacker', 'physical_sweeper', 'special_sweeper'],
        desc: 'Locks into one move but boosts Speed by 50%. Great for revenge killing.',
    },
    {
        name: 'Life Orb',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/life-orb.png',
        color: '#fff7ed',
        border: '#fdba74',
        roles: ['mixed_attacker', 'physical_sweeper', 'special_sweeper', 'physical_attacker', 'special_attacker'],
        desc: 'Boosts all moves by 30% at cost of 10% HP per hit. Best all-rounder.',
    },
    {
        name: 'Leftovers',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/leftovers.png',
        color: '#f0fdf4',
        border: '#86efac',
        roles: ['wall', 'physical_wall', 'special_wall', 'tank'],
        desc: 'Restores 1/16 HP each turn. Standard for any defensive Pokémon.',
    },
    {
        name: 'Rocky Helmet',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/rocky-helmet.png',
        color: '#f1f5f9',
        border: '#94a3b8',
        roles: ['physical_wall', 'wall'],
        desc: 'Damages contact attackers by 1/6 HP. Punishes physical attackers hard.',
    },
    {
        name: 'Eviolite',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/eviolite.png',
        color: '#faf5ff',
        border: '#d8b4fe',
        roles: ['__evolve__'],
        desc: 'Boosts Def and Sp.Def by 50% if holder is not fully evolved.',
    },
    {
        name: 'Focus Sash',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/focus-sash.png',
        color: '#fef9c3',
        border: '#fde047',
        roles: ['frail_attacker', 'lead'],
        desc: 'Survives any one-hit KO from full HP with 1 HP remaining.',
    },
    {
        name: 'Assault Vest',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/assault-vest.png',
        color: '#fdf4ff',
        border: '#e879f9',
        roles: ['mixed_wall', 'special_wall'],
        desc: 'Boosts Sp.Def by 50% but prevents using status moves.',
    },
    {
        name: 'Black Sludge',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/black-sludge.png',
        color: '#1e293b',
        border: '#475569',
        roles: ['poison_type_wall'],
        textLight: true,
        desc: 'Restores HP for Poison types, damages others. Better Leftovers on Poison Pokémon.',
    },
    {
        name: 'Weakness Policy',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/weakness-policy.png',
        color: '#fff7ed',
        border: '#fed7aa',
        roles: ['tank', 'wall'],
        desc: 'Sharply raises Atk and Sp.Atk when hit by a super-effective move.',
    },
    {
        name: 'Heavy-Duty Boots',
        emoji: 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item/heavy-duty-boots.png',
        color: '#f0fdf4',
        border: '#6ee7b7',
        roles: ['frail_attacker', 'support', 'lead'],
        desc: 'Prevents damage from entry hazards. Essential against Stealth Rock.',
    },
]
