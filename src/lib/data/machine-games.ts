export type MachineKind = 'tm' | 'hm' | 'tr'
export type MachineUse = 'single' | 'reusable'

export interface MachineGame {
    slug: string
    label: string
    gen: number
    order: number
    digits: Partial<Record<MachineKind, number>>
    uses: Partial<Record<MachineKind, MachineUse>>
    notes?: Partial<Record<MachineKind, string>>
}

const HM_NOTE = 'Field move; normally cannot be forgotten'

// Mainline machine sets supported by the site's current Red/Blue → Scarlet/Violet scope.
// A generation is not precise enough on its own: XY/ORAS, SMUSUM/LGPE, and
// SwSh/BDSP all differ within the same generation.
export const MACHINE_GAMES: MachineGame[] = [
    { slug: 'red-blue', label: 'Red / Blue', gen: 1, order: 1, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'yellow', label: 'Yellow', gen: 1, order: 2, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'gold-silver', label: 'Gold / Silver', gen: 2, order: 3, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'crystal', label: 'Crystal', gen: 2, order: 4, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'ruby-sapphire', label: 'Ruby / Sapphire', gen: 3, order: 5, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'emerald', label: 'Emerald', gen: 3, order: 6, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'firered-leafgreen', label: 'FireRed / LeafGreen', gen: 3, order: 7, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'diamond-pearl', label: 'Diamond / Pearl', gen: 4, order: 8, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'platinum', label: 'Platinum', gen: 4, order: 9, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'heartgold-soulsilver', label: 'HeartGold / SoulSilver', gen: 4, order: 10, digits: { tm: 2, hm: 2 }, uses: { tm: 'single', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'black-white', label: 'Black / White', gen: 5, order: 11, digits: { tm: 2, hm: 2 }, uses: { tm: 'reusable', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'black-2-white-2', label: 'Black 2 / White 2', gen: 5, order: 12, digits: { tm: 2, hm: 2 }, uses: { tm: 'reusable', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'x-y', label: 'X / Y', gen: 6, order: 13, digits: { tm: 2, hm: 2 }, uses: { tm: 'reusable', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'omega-ruby-alpha-sapphire', label: 'Omega Ruby / Alpha Sapphire', gen: 6, order: 14, digits: { tm: 2, hm: 2 }, uses: { tm: 'reusable', hm: 'reusable' }, notes: { hm: HM_NOTE } },
    { slug: 'sun-moon', label: 'Sun / Moon', gen: 7, order: 15, digits: { tm: 2 }, uses: { tm: 'reusable' }, notes: { tm: 'HMs replaced by Poké Ride' } },
    { slug: 'ultra-sun-ultra-moon', label: 'Ultra Sun / Ultra Moon', gen: 7, order: 16, digits: { tm: 2 }, uses: { tm: 'reusable' }, notes: { tm: 'HMs replaced by Poké Ride' } },
    { slug: 'lets-go-pikachu-lets-go-eevee', label: "Let's Go Pikachu / Eevee", gen: 7, order: 17, digits: { tm: 2 }, uses: { tm: 'reusable' }, notes: { tm: 'HMs replaced by Secret Techniques' } },
    { slug: 'sword-shield', label: 'Sword / Shield', gen: 8, order: 18, digits: { tm: 2, tr: 2 }, uses: { tm: 'reusable', tr: 'single' } },
    { slug: 'brilliant-diamond-shining-pearl', label: 'Brilliant Diamond / Shining Pearl', gen: 8, order: 19, digits: { tm: 2 }, uses: { tm: 'single' }, notes: { tm: 'Multiple copies available; field moves use the Pokétch' } },
    { slug: 'scarlet-violet', label: 'Scarlet / Violet', gen: 9, order: 20, digits: { tm: 3 }, uses: { tm: 'single' }, notes: { tm: 'Craftable at a TM Machine after the recipe is unlocked' } },
]

export const MACHINE_GAME_BY_SLUG = Object.fromEntries(
    MACHINE_GAMES.map((game) => [game.slug, game]),
) as Record<string, MachineGame>
