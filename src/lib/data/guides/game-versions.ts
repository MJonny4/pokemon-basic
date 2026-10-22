// Guide release identities only. These are not regional Pokédex memberships,
// generation-wide rules, or a claim that enhanced editions/remakes are covered.
export const GUIDE_VERSION_IDS = [
    'red', 'blue', 'gold', 'silver', 'ruby', 'sapphire', 'diamond', 'pearl',
] as const

export type GuideVersionId = typeof GUIDE_VERSION_IDS[number]

export const GUIDE_VERSION_GROUPS = {
    'red-blue': { gen: 1, versions: ['red', 'blue'] },
    'gold-silver': { gen: 2, versions: ['gold', 'silver'] },
    'ruby-sapphire': { gen: 3, versions: ['ruby', 'sapphire'] },
    'diamond-pearl': { gen: 4, versions: ['diamond', 'pearl'] },
} as const satisfies Record<string, { gen: number; versions: readonly GuideVersionId[] }>

export type GuideVersionGroupId = keyof typeof GUIDE_VERSION_GROUPS
