import type { GuideFishingSection } from '../fishing-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideFishingSection['sources'][number] {
    return { id, title, locator, kind: 'game-disassembly', checkedOn: '2026-10-18', versionIds: ['red', 'blue'], url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}

type Rod = GuideFishingSection['spots'][number]['rods'][number]
// Return fresh rows: the two areas share Old/Good Rod rules, not Super Rod pools.
function commonRods(): Rod[] {
    return [
        { id: 'old-rod', obtainedAt: 'Fishing Guru’s house in Vermilion City.', sourceIds: ['rod-use', 'old-rod-gift'], catches: [{ name: 'Magikarp', dexId: 129, level: 5 }] },
        { id: 'good-rod', obtainedAt: 'Fishing Guru’s house in Fuchsia City.', sourceIds: ['rod-use', 'good-rod-catches', 'good-rod-gift'], catches: [{ name: 'Goldeen', dexId: 118, level: 10 }, { name: 'Poliwag', dexId: 60, level: 10 }] },
    ]
}

function group3Rods(): Rod[] {
    return [...commonRods(), {
        id: 'super-rod', obtainedAt: 'Fishing Guru’s house on Route 12.',
        sourceIds: ['rod-use', 'super-rod-catches', 'super-rod-gift'],
        catches: [{ name: 'Psyduck', dexId: 54, level: 15 }, { name: 'Goldeen', dexId: 118, level: 15 }, { name: 'Krabby', dexId: 98, level: 15 }],
    }]
}

function group4Rods(): Rod[] {
    return [...commonRods(), {
        id: 'super-rod', obtainedAt: 'Fishing Guru’s house on Route 12.',
        sourceIds: ['rod-use', 'super-rod-catches', 'super-rod-gift'],
        catches: [{ name: 'Krabby', dexId: 98, level: 15 }, { name: 'Shellder', dexId: 90, level: 15 }],
    }]
}

const rodSources = [
    source('rod-use', 'engine/items/item_effects.asm', 'Fishing requirements and Old Rod catch', 'ItemUseOldRod (level 5 Magikarp); ItemUseGoodRod; FishingInit (shore/water check; cannot fish while Surfing)'),
    source('good-rod-catches', 'data/wild/good_rod.asm', 'Good Rod catch list', 'GoodRodMons: level 10 Goldeen and Poliwag'),
    source('super-rod-catches', 'data/wild/super_rod.asm', 'Map-specific Super Rod catch lists', 'VIRIDIAN_CITY → Group1; ROUTE_22 → Group2; ROUTE_4, CERULEAN_CITY/GYM, ROUTE_24/25 → Group3; VERMILION_CITY/DOCK and ROUTE_6/11 → Group4'),
    source('old-rod-gift', 'scripts/VermilionOldRodHouse.asm', 'Old Rod location', 'VermilionOldRodHouseFishingGuruText gives OLD_ROD'),
    source('good-rod-gift', 'scripts/FuchsiaGoodRodHouse.asm', 'Good Rod location', 'FuchsiaGoodRodHouseFishingGuruText gives GOOD_ROD'),
    source('super-rod-gift', 'scripts/Route12SuperRodHouse.asm', 'Super Rod location', 'Route12SuperRodHouseFishingGuruText gives SUPER_ROD'),
]

export const RED_BLUE_VIRIDIAN_FISHING: GuideFishingSection = {
    schemaVersion: 1, id: 'red-blue-viridian-fishing', guideId: 'red-blue', stopId: 'viridian-city',
    versionIds: ['red', 'blue'],
    releaseScope: 'English international Game Boy Red/Blue. Not Yellow, remakes or other unreviewed releases.',
    notice: 'Planning a return visit? Both water spots below have fishing catches. You need a fishing rod first; none is given during the opening errand. Stand on the bank, face the water and use the rod from your Bag. These are fishing catches, not Surf encounters. Both Red and Blue use these lists.',
    sources: [
        ...rodSources,
        source('route-22-water', 'data/wild/maps/Route22.asm', 'Route 22 grass/water distinction', 'Water encounter rate is 0; fishing uses the separate rod tables, not this Surf table'),
        source('west-exit', 'data/maps/headers/ViridianCity.asm', 'Viridian City west exit', 'West connection to Route 22'),
    ],
    spots: [
        {
            id: 'route-22-water', name: 'Nearby Route 22 · water',
            directions: 'Leave Viridian City through the west exit. At Route 22’s water, face the shoreline from land; this is separate from the tall-grass catches above.',
            sourceIds: ['west-exit', 'rod-use', 'super-rod-catches', 'route-22-water'],
            rods: [...commonRods(), {
                id: 'super-rod', obtainedAt: 'Fishing Guru’s house on Route 12.',
                sourceIds: ['rod-use', 'super-rod-catches', 'super-rod-gift'],
                catches: [{ name: 'Goldeen', dexId: 118, level: 15 }, { name: 'Poliwag', dexId: 60, level: 15 }],
            }],
        },
        {
            id: 'viridian-city-water', name: 'Inside Viridian City · water',
            directions: 'Fish at the water within Viridian City itself. Do not use Route 22’s Super Rod list here: the city has a different pool.',
            sourceIds: ['rod-use', 'super-rod-catches'],
            rods: [...commonRods(), {
                id: 'super-rod', obtainedAt: 'Fishing Guru’s house on Route 12.',
                sourceIds: ['rod-use', 'super-rod-catches', 'super-rod-gift'],
                catches: [{ name: 'Tentacool', dexId: 72, level: 15 }, { name: 'Poliwag', dexId: 60, level: 15 }],
            }],
        },
    ],
}

export const RED_BLUE_ROUTE_4_FISHING: GuideFishingSection = {
    schemaVersion: 1, id: 'red-blue-route-4-fishing', guideId: 'red-blue', stopId: 'route-3-mt-moon',
    versionIds: ['red', 'blue'],
    releaseScope: 'English international Game Boy Red/Blue. Not Yellow, remakes or other unreviewed releases.',
    notice: 'Route 4 has fishing water, but it is not beside the western Pokémon Center or on your first walking route through Mt. Moon. Plan a later visit via the waterway from Route 24 using Surf. You also need a fishing rod. Once on land, face the water and use the rod from your Bag; you cannot fish while Surfing. These catches are the same in Red and Blue.',
    sources: [
        ...rodSources,
        source('route-4-water', 'data/wild/maps/Route4.asm', 'Route 4 water encounter distinction', 'Water encounter rate 0 does not disable the separate fishing tables'),
        { id: 'route-4-access', title: 'Route 4 later waterway access', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_4&oldid=4618036', locator: 'Generation I route description: Surf down from Route 24 to the northern hill; fishing table is only corroboration, not the source for rod species/levels.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
    ],
    spots: [{
        id: 'route-4-water', name: 'Route 4 east · northern waterway · later visit',
        directions: 'Reach the northern part of Route 4 by Surfing down the western Route 24 waterway toward Cerulean Cave. Land on Route 4’s bank to fish. This is separate from Route 4’s grass and from the Pokémon Center’s purchased Magikarp.',
        sourceIds: ['route-4-access', 'rod-use', 'route-4-water', 'super-rod-catches'],
        rods: group3Rods(),
    }],
}

export const RED_BLUE_CERULEAN_FISHING: GuideFishingSection = {
    schemaVersion: 1, id: 'red-blue-cerulean-fishing', guideId: 'red-blue', stopId: 'gym-2-cerulean',
    versionIds: ['red', 'blue'],
    releaseScope: 'English international Game Boy Red/Blue. Not Yellow, remakes or other unreviewed releases.',
    notice: 'Plan a return after obtaining a rod: these water spots have the same Red/Blue fishing lists, including the pool INSIDE Cerulean Gym. Routes 24/25 and the gym have banks you can fish from without Surf. The city’s northwestern channel is a later Surf approach from Route 24. Fish from land, not while Surfing. These are separate from the nearby-route grass encounters above.',
    sources: [
        ...rodSources,
        source('cerulean-gym-water', 'data/maps/headers/CeruleanGym.asm', 'Gym water context', 'CERULEAN_GYM uses GYM tileset; FishingInit uses shoreline/water tiles, SuperRodData explicitly maps this gym'),
        source('cerulean-route-24-water', 'data/wild/maps/Route24.asm', 'Route 24 water distinction', 'Water encounter rate 0; separate rod tables still apply'),
        source('cerulean-route-25-water', 'data/wild/maps/Route25.asm', 'Route 25 water distinction', 'Water encounter rate 0; separate rod tables still apply'),
        { id: 'cerulean-water-access', title: 'Cerulean water locations', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Cerulean_City&oldid=4607702', locator: 'Generation I wild Pokémon in the northwest water channel and gym pool; cave/channel approach via Route 24 and Surf. Secondary access reference.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
        { id: 'cerulean-route-24-access', title: 'Route 24 shoreline access', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_24&oldid=4618421', locator: 'Generation I route layout and west-of-bridge riverbank; secondary navigation reference.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
        { id: 'cerulean-route-25-access', title: 'Route 25 shoreline access', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_25&oldid=4618423', locator: 'Generation I route layout and southern water; secondary navigation reference.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
    ],
    spots: [
        { id: 'cerulean-gym-pool', name: 'Inside Cerulean Gym · pool', directions: 'Stand on a walkway facing the pool and use a rod. In these Red/Blue releases the gym pool really can produce fishing catches; no Surf needed. You still need to obtain a rod elsewhere first.', sourceIds: ['rod-use', 'super-rod-catches', 'cerulean-gym-water', 'cerulean-water-access'], rods: group3Rods() },
        { id: 'route-24-bank', name: 'Nearby Route 24 · western riverbank', directions: 'On Route 24, go west of Nugget Bridge to the riverbank by the grass. Face the water from land and use a rod; Surf is not needed just to fish from this bank.', sourceIds: ['rod-use', 'super-rod-catches', 'cerulean-route-24-water', 'cerulean-route-24-access'], rods: group3Rods() },
        { id: 'route-25-bank', name: 'Nearby Route 25 · southern shoreline', directions: 'Use a reachable bank along the water on Route 25’s southern edge. Face the water and use a rod from land; these are not Pokémon found in Bill’s House.', sourceIds: ['rod-use', 'super-rod-catches', 'cerulean-route-25-water', 'cerulean-route-25-access'], rods: group3Rods() },
        { id: 'cerulean-city-channel', name: 'Inside Cerulean City · northwest channel · later visit', directions: 'Later, use Surf down the western Route 24 waterway toward Cerulean Cave, then land on a bank to fish in the city’s channel. Use the city water here, not the separate Route 24/25 grass tables. The cave interior is not covered by this stop.', sourceIds: ['rod-use', 'super-rod-catches', 'cerulean-water-access', 'cerulean-route-24-access'], rods: group3Rods() },
    ],
}

export const RED_BLUE_VERMILION_FISHING: GuideFishingSection = {
    schemaVersion: 1, id: 'red-blue-vermilion-fishing', guideId: 'red-blue', stopId: 'vermilion-city',
    versionIds: ['red', 'blue'],
    releaseScope: 'English international Game Boy Red/Blue. Not Yellow, remakes or other unreviewed releases.',
    title: 'Fishing spots · get the Old Rod in town',
    notice: 'You can get the Old Rod in Vermilion now and fish from land immediately; no Surf required. Good/Super Rods are later equipment from elsewhere. Route 6, nearby Route 11 and the town shoreline remain useful return spots. The boarding dock normally becomes inaccessible after the ship departs, so its first-visit reference below uses only the Old Rod. These are rod catches, not grass or Surf encounters; Red and Blue use the same lists.',
    sources: [
        ...rodSources,
        source('vermilion-water-route', 'data/wild/maps/Route6.asm', 'Route 6 fishing versus Surf', 'Water encounter rate 0 does not disable rod catches'),
        source('vermilion-water-boarding', 'scripts/VermilionCity.asm', 'Dock access restriction', 'DefaultScript and Sailor1Text: ticket required before departure; EVENT_SS_ANNE_LEFT blocks normal entry'),
        source('vermilion-water-departure', 'scripts/VermilionDock.asm', 'Departure state', 'After receiving HM01, walking out from the ship triggers departure'),
        { ...source('vermilion-water-route-11', 'data/wild/maps/Route11.asm', 'Route 11 fishing versus Surf', 'Water encounter rate 0 does not disable the separate rod tables'), checkedOn: '2026-10-19' },
        { id: 'vermilion-water-route-access', title: 'Route 6 pond location', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_6&oldid=4618419', locator: 'Route description: central pond with eastern/southern walking banks; secondary navigation reference, not source of catch levels.', versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'reference' },
        { id: 'vermilion-water-town-access', title: 'Vermilion coastal water', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Vermilion_City&oldid=4580932', locator: 'Generation I town and port water/fishing areas; secondary location reference. Rod data comes from disassembly.', versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'reference' },
        { id: 'vermilion-water-route-11-access', title: 'Route 11 western channel bank', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_11&oldid=4618687', locator: 'Route description: follows the north bank of the narrow channel near Diglett’s Cave/Vermilion; secondary access reference only, not source of catch levels.', versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'reference' },
    ],
    spots: [
        { id: 'vermilion-town-water', name: 'Inside Vermilion · town shoreline', directions: 'After collecting the Old Rod from the house west of the Pokémon Center, use a reachable town bank facing the sea. This town water is outside the guarded boarding dock and remains a place to return with later rods.', sourceIds: ['rod-use', 'old-rod-gift', 'super-rod-catches', 'vermilion-water-town-access'], rods: group4Rods() },
        { id: 'route-6-pond', name: 'Nearby Route 6 · central pond', directions: 'North of town on Route 6, stand on a walking bank beside the central pond and face the water. This is separate from Route 6’s grass; fishing from its bank does not need Surf.', sourceIds: ['rod-use', 'super-rod-catches', 'vermilion-water-route', 'vermilion-water-route-access'], rods: group4Rods() },
        { id: 'vermilion-dock-first-visit', name: 'Boarding dock · Old Rod before departure', directions: 'Bring the Old Rod and S.S. Ticket before boarding. Fish from an accessible edge of the pier before the ship departs. Do not plan a normal later dock return for Good/Super Rod fishing: once the ship leaves, the guard blocks entry. The town shoreline and Route 6 provide those later catches instead.', sourceIds: ['rod-use', 'old-rod-gift', 'vermilion-water-boarding', 'vermilion-water-departure'], rods: [commonRods()[0]] },
        { id: 'route-11-western-bank', name: 'Nearby Route 11 · western channel', directions: 'At Route 11’s western end near Diglett’s Cave, use a reachable bank facing the channel. Bring the Old Rod from Vermilion; no Surf is needed merely to fish from land. This is Route 11 water, not the different fishing pool on Route 12 beyond the eastern gate.', sourceIds: ['rod-use', 'old-rod-gift', 'super-rod-catches', 'vermilion-water-route-11', 'vermilion-water-route-11-access'], rods: group4Rods() },
    ],
}
