export interface ItemEntry {
    name: string // display name — matches items-catalog.json + battle engine item keys verbatim
    slug: string
    emoji: string
    border: string
    roles: string[]
    desc: string
}

const ICONS = 'https://raw.githubusercontent.com/msikma/pokesprite/master/icons/hold-item'

export const ITEMS: ItemEntry[] = [
    {
        name: 'Choice Band',
        slug: 'choice-band',
        emoji: `${ICONS}/choice-band.png`,
        border: '#fca5a5',
        roles: ['physical_sweeper', 'physical_attacker'],
        desc: 'Locks into one move but boosts Attack by 50%.',
    },
    {
        name: 'Choice Specs',
        slug: 'choice-specs',
        emoji: `${ICONS}/choice-specs.png`,
        border: '#93c5fd',
        roles: ['special_sweeper', 'special_attacker'],
        desc: 'Locks into one move but boosts Sp.Atk by 50%.',
    },
    {
        name: 'Choice Scarf',
        slug: 'choice-scarf',
        emoji: `${ICONS}/choice-scarf.png`,
        border: '#fde047',
        roles: ['fast_attacker', 'physical_sweeper', 'special_sweeper'],
        desc: 'Locks into one move but boosts Speed by 50%. Great for revenge killing.',
    },
    {
        name: 'Life Orb',
        slug: 'life-orb',
        emoji: `${ICONS}/life-orb.png`,
        border: '#fdba74',
        roles: ['mixed_attacker', 'physical_sweeper', 'special_sweeper', 'physical_attacker', 'special_attacker'],
        desc: 'Boosts all moves by 30% at cost of 10% HP per hit. Best all-rounder.',
    },
    {
        name: 'Leftovers',
        slug: 'leftovers',
        emoji: `${ICONS}/leftovers.png`,
        border: '#86efac',
        roles: ['wall', 'physical_wall', 'special_wall', 'tank'],
        desc: 'Restores 1/16 HP each turn. Standard for any defensive Pokémon.',
    },
    {
        name: 'Rocky Helmet',
        slug: 'rocky-helmet',
        emoji: `${ICONS}/rocky-helmet.png`,
        border: '#94a3b8',
        roles: ['physical_wall', 'wall'],
        desc: 'Damages contact attackers by 1/6 HP. Punishes physical attackers hard.',
    },
    {
        name: 'Eviolite',
        slug: 'eviolite',
        emoji: `${ICONS}/eviolite.png`,
        border: '#d8b4fe',
        roles: ['__evolve__'],
        desc: 'Boosts Def and Sp.Def by 50% if holder is not fully evolved.',
    },
    {
        name: 'Focus Sash',
        slug: 'focus-sash',
        emoji: `${ICONS}/focus-sash.png`,
        border: '#fde047',
        roles: ['frail_attacker', 'lead'],
        desc: 'Survives any one-hit KO from full HP with 1 HP remaining.',
    },
    {
        name: 'Assault Vest',
        slug: 'assault-vest',
        emoji: `${ICONS}/assault-vest.png`,
        border: '#e879f9',
        roles: ['mixed_wall', 'special_wall'],
        desc: 'Boosts Sp.Def by 50% but prevents using status moves.',
    },
    {
        name: 'Black Sludge',
        slug: 'black-sludge',
        emoji: `${ICONS}/black-sludge.png`,
        border: '#475569',
        roles: ['poison_type_wall'],
        desc: 'Restores HP for Poison types, damages others. Better Leftovers on Poison Pokémon.',
    },
    {
        name: 'Weakness Policy',
        slug: 'weakness-policy',
        emoji: `${ICONS}/weakness-policy.png`,
        border: '#fed7aa',
        roles: ['tank', 'wall'],
        desc: 'Sharply raises Atk and Sp.Atk when hit by a super-effective move.',
    },
    {
        name: 'Heavy-Duty Boots',
        slug: 'heavy-duty-boots',
        emoji: `${ICONS}/heavy-duty-boots.png`,
        border: '#6ee7b7',
        roles: ['frail_attacker', 'support', 'lead'],
        desc: 'Prevents damage from entry hazards. Essential against Stealth Rock.',
    },
]
