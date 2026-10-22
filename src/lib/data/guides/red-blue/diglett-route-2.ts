import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}
function caveEncounters(versionId: 'red' | 'blue'): GuideLocation['encounters'][number] {
    const levels = [18, 19, 17, 20, 16, 15, 21, 22, 29, 31]
    const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
    return {
        versionId, areaId: 'digletts-cave', method: 'cave', denominator: 256,
        sourceIds: ['d2-cave-wild', 'd2-slot-weights'],
        slots: levels.map((level, index) => ({ id: `d2-${versionId}-slot-${index + 1}`, name: index < 8 ? 'Diglett' : 'Dugtrio', dexId: index < 8 ? 50 : 51, level, weight: weights[index] })),
    }
}

// A separate bounded data slice, composed into Vermilion's optional detour by
// the registry. It never creates a progress stop or audits early Route 2 grass.
export const DIGLETT_ROUTE_2_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-diglett-route-2', guideId: 'red-blue', stopId: 'vermilion-city',
    versionIds: ['red', 'blue'], title: 'Diglett’s Cave & the eastern Route 2 return',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Optional detour through both Diglett’s Cave entrance houses and the cave to eastern Route 2: exact cave encounters, the Abra–Mr. Mime trade, HM05 Flash and two visible ground pickups. No cave trainers, visible cave items or hidden cave/Route 2 items are defined in the checked maps/event list.',
    limitations: [
        'Source-checked, not play-through verified. Directions are landmark/connection overviews, not a terrain map or turn-by-turn route. Route 2 Cut-tree navigation additionally uses a secondary reference, identified in sources.',
        'This return visit does not audit western Route 2 grass, Viridian Forest, Pewter/Viridian town activities or the complete opening journey. Route 11 is a separately composed companion slice; Rock Tunnel and the route onwards from Cerulean are outside this detour.',
        'No fixed trade level is claimed. No Gen III or later encounter abilities, remake items or Japanese Blue/Yellow trade are imported.',
    ],
    sources: [
        source('d2-route-11-links', 'data/maps/headers/Route11.asm', 'Route 11 town connection', 'West connection to Vermilion City; east connection to Route 12'),
        source('d2-route-11-objects', 'data/maps/objects/Route11.asm', 'Route 11 cave entrance', 'Warp (4,5) enters DIGLETTS_CAVE_ROUTE_11'),
        source('d2-south-entrance-objects', 'data/maps/objects/DiglettsCaveRoute11.asm', 'Southern cave entrance house', 'Door warps (2/3,7); stair (4,4) to DIGLETTS_CAVE warp 2; one non-battle NPC'),
        source('d2-south-entrance-script', 'scripts/DiglettsCaveRoute11.asm', 'Southern house destination', 'Sets wLastMap to ROUTE_11; NPC only prints text'),
        source('d2-cave-objects', 'data/maps/objects/DiglettsCave.asm', 'Cave connections and empty object list', 'Northwestern stair (5,5) to Route 2 entrance; southeastern stair (37,31) to Route 11 entrance; no object events'),
        source('d2-north-entrance-objects', 'data/maps/objects/DiglettsCaveRoute2.asm', 'Northern cave entrance house', 'Door warps (2/3,7); stair (4,4) to DIGLETTS_CAVE warp 1; one non-battle NPC'),
        source('d2-north-entrance-script', 'scripts/DiglettsCaveRoute2.asm', 'Northern house destination and dialogue', 'Sets wLastMap to ROUTE_2; FishingGuruText only prints text, no rod gift'),
        source('d2-north-entrance-text', 'text/DiglettsCaveRoute2.asm', 'Northern entrance advice', 'NPC talks about Rock Tunnel darkness and Flash; no fishing reward'),
        source('d2-route-2-links', 'data/maps/headers/Route2.asm', 'Route 2 connections', 'North Pewter City; south Viridian City'),
        source('d2-route-2-objects', 'data/maps/objects/Route2.asm', 'Route 2 return buildings and items', 'Cave door (12,9); trade house (15,19); east gate north/south doors (16,35)/(15,39); Moon Stone (13,54), HP Up (13,45); no battle objects'),
        source('d2-trade-house-objects', 'data/maps/objects/Route2TradeHouse.asm', 'Trade house NPC location', 'Game Boy Kid (4,1); scientist (2,4); neither is a battle object'),
        source('d2-trade-house-script', 'scripts/Route2TradeHouse.asm', 'Route 2 trade identity', 'GameboyKidText selects TRADE_FOR_MARCEL'),
        source('d2-trades', 'data/events/trades.asm', 'International Red/Blue trade direction', 'TRADE_FOR_MARCEL: player gives ABRA, receives MR_MIME nicknamed MARCEL'),
        source('d2-gate-objects', 'data/maps/objects/Route2Gate.asm', 'Eastern gate and aide', 'Oak’s aide (1,4); north and south door warps; no battle objects'),
        source('d2-flash-gift', 'scripts/Route2Gate.asm', 'HM05 Flash requirement and retry', 'Requirement 10; reward HM_FLASH; EVENT_GOT_HM05 set only when OaksAideScript returns OAKS_AIDE_GOT_ITEM'),
        source('d2-aide-check', 'engine/events/oaks_aide.asm', 'Distinct owned-species count and Bag handling', 'CountSetBits on wPokedexOwned; count >= requirement; GiveItem 1; separate Bag-full result allows retry'),
        source('d2-field-badges', 'engine/menus/start_sub_menus.asm', 'Field move badge requirements', 'StartMenu_Pokemon .cut checks BIT_CASCADEBADGE; .flash checks BIT_BOULDERBADGE'),
        source('d2-cave-wild', 'data/wild/maps/DiglettsCave.asm', 'Diglett’s Cave exact encounters', 'Shared Red/Blue slots: Diglett 18/19/17/20/16/15/21/22, Dugtrio 29/31; no water encounters'),
        source('d2-slot-weights', 'data/wild/probabilities.asm', 'Exact encounter weights', 'WildMonEncounterSlotChances: 51,51,39,25,25,25,13,13,11,3 out of 256'),
        source('d2-hidden-events', 'data/events/hidden_events.asm', 'Bounded hidden-item absence', 'HiddenEventMaps has no ROUTE_2, DIGLETTS_CAVE, DIGLETTS_CAVE_ROUTE_2, DIGLETTS_CAVE_ROUTE_11, ROUTE_2_TRADE_HOUSE or ROUTE_2_GATE entries'),
        source('d2-route-2-water', 'data/wild/maps/Route2.asm', 'Route 2 water table', 'Water encounter rate 0; this detour does not reproduce the separately scoped western Route 2 grass table'),
        source('d2-super-rod-maps', 'data/wild/super_rod.asm', 'Rod-map scope', 'No Route 2 or Diglett’s Cave Super Rod entry; Route 11 fishing belongs to the companion route slice'),
        {
            id: 'd2-route-2-navigation', title: 'Route 2 eastern-path navigation (secondary reference)',
            url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_2&oldid=4621480',
            locator: 'Route description → Eastern path; Generations I/III comparison; Items Red/Blue rows: Cut south of trade house before aide; HP Up and Moon Stone beyond eastern gate',
            versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'reference',
        },
    ],
    areas: [
        { id: 'diglett-route-11-entrance', name: 'Diglett’s Cave · Route 11 entrance house', description: 'Small entrance near the Vermilion end of Route 11. Its NPC talks but does not battle; take the stair into the tunnel.', sourceIds: ['d2-route-11-links', 'd2-route-11-objects', 'd2-south-entrance-objects', 'd2-south-entrance-script'] },
        { id: 'digletts-cave', name: 'Diglett’s Cave · tunnel', description: 'One long tunnel with Diglett and rarer, much higher-level Dugtrio. There are no trainer battles or item balls inside. Flash is not needed here.', sourceIds: ['d2-cave-objects', 'd2-cave-wild', 'd2-north-entrance-text'] },
        { id: 'diglett-route-2-entrance', name: 'Diglett’s Cave · Route 2 entrance house', description: 'The far stair leads to this house and then eastern Route 2. The NPC mentions Flash for Rock Tunnel; he does not give a fishing rod.', sourceIds: ['d2-cave-objects', 'd2-north-entrance-objects', 'd2-north-entrance-script', 'd2-north-entrance-text'] },
        { id: 'route-2-east', name: 'Route 2 · eastern return path', description: 'The narrow eastern side reached from Diglett’s Cave, not the western grass/Forest route from the opening. Bring a Cut user to continue south toward Flash and the two item balls.', sourceIds: ['d2-route-2-objects', 'd2-route-2-navigation', 'd2-field-badges'] },
        { id: 'route-2-trade-house', name: 'Route 2 · Mr. Mime trade house', description: 'The house south of the cave exit has an optional Abra-for-Mr. Mime trade. It is before the Cut tree on the way to the aide.', sourceIds: ['d2-route-2-objects', 'd2-trade-house-script', 'd2-trades', 'd2-route-2-navigation'] },
        { id: 'route-2-gate', name: 'Route 2 · eastern gate and Flash aide', description: 'Professor Oak’s aide rewards at least ten distinct obtained species with HM05 Flash. The check counts Pokédex ownership, not how many Pokémon you are carrying.', sourceIds: ['d2-gate-objects', 'd2-flash-gift', 'd2-aide-check'] },
    ],
    directions: [
        { id: 'd2-enter-from-vermilion', text: 'For an optional Flash detour, leave Vermilion east onto Route 11 and enter Diglett’s Cave’s small entrance near the western end of that route. Take the stair into the tunnel. You do not need to cross Route 11 to its eastern gate first.', sourceIds: ['d2-route-11-links', 'd2-route-11-objects', 'd2-south-entrance-objects'] },
        { id: 'd2-cross-cave', text: 'Follow the tunnel from its southeastern stair to the northwestern stair and leave through the Route 2 entrance house. Neither Cut nor Flash is needed to cross the cave itself. The wild Dugtrio here are level 29 or 31, well above the local Diglett.', sourceIds: ['d2-cave-objects', 'd2-south-entrance-objects', 'd2-north-entrance-objects', 'd2-cave-wild'] },
        { id: 'd2-check-trade', text: 'On eastern Route 2, the house south of the cave exit offers Mr. Mime in exchange for your Abra. This trade is optional; it is not a wild encounter or a free Pokémon gift. The received Mr. Mime is nicknamed MARCEL.', sourceIds: ['d2-route-2-objects', 'd2-trade-house-script', 'd2-trades', 'd2-route-2-navigation'] },
        { id: 'd2-cut-to-aide', text: 'Bring a Pokémon that knows Cut and Misty’s Cascade Badge. Cut the small tree farther south of the trade house to continue down the eastern path and enter the gate building. Speak to Professor Oak’s aide with at least 10 different species registered as obtained in your Pokédex for HM05 Flash. Free Bag space and speak again if it does not fit.', sourceIds: ['d2-route-2-navigation', 'd2-field-badges', 'd2-route-2-objects', 'd2-gate-objects', 'd2-flash-gift', 'd2-aide-check'] },
        { id: 'd2-ground-items', text: 'Continue south beyond the eastern gate for the two visible item balls: HP Up near the first ledges and a Moon Stone farther south beyond the next ledges. Keep your Cut user with you for the trees on this return path. These are Red/Blue pickups, not the remake’s Ether and Parlyz Heal.', sourceIds: ['d2-route-2-objects', 'd2-route-2-navigation', 'd2-field-badges'] },
        { id: 'd2-return-journey', text: 'Retrace eastern Route 2 and Diglett’s Cave to return to Route 11 and Vermilion. Flash can later light Rock Tunnel after you teach it to a compatible Pokémon; Brock’s Boulder Badge permits its use outside battle. It is helpful for visibility, not a mandatory Rock Tunnel entry requirement.', sourceIds: ['d2-route-2-objects', 'd2-route-2-navigation', 'd2-cave-objects', 'd2-south-entrance-script', 'd2-north-entrance-script', 'd2-north-entrance-text', 'd2-field-badges'] },
    ],
    items: [
        { id: 'd2-hm05-flash', areaId: 'route-2-gate', name: 'HM05 Flash', quantity: 1, kind: 'gift', location: 'Professor Oak’s aide inside the eastern Route 2 gate, south of the Mr. Mime trade house.', requirements: 'Cut user and Cascade Badge for the eastern path; at least 10 distinct species registered as obtained, not merely seen. Agree to the check and keep Bag space; if full, make room and speak again. A compatible Flash user plus Boulder Badge are needed to light dark areas.', sourceIds: ['d2-route-2-navigation', 'd2-flash-gift', 'd2-aide-check', 'd2-field-badges', 'd2-gate-objects'] },
        { id: 'd2-hp-up', areaId: 'route-2-east', name: 'HP Up', quantity: 1, kind: 'visible', position: { x: 13, y: 45 }, location: 'Eastern Route 2, southeast of the first ledges south of the aide’s gate; item-ball square (13, 45).', requirements: 'Bring a Cut user and Cascade Badge to explore the eastern path. Keep Bag space; this is a visible ball, not a hidden item.', sourceIds: ['d2-route-2-objects', 'd2-route-2-navigation', 'd2-field-badges'] },
        { id: 'd2-moon-stone', areaId: 'route-2-east', name: 'Moon Stone', quantity: 1, kind: 'visible', position: { x: 13, y: 54 }, location: 'Eastern Route 2, south of the next ledges farther down from the HP Up; item-ball square (13, 54).', requirements: 'Bring a Cut user and Cascade Badge to explore the eastern path. Keep Bag space; this is a visible ball, not a hidden item.', sourceIds: ['d2-route-2-objects', 'd2-route-2-navigation', 'd2-field-badges'] },
    ],
    encounters: [caveEncounters('red'), caveEncounters('blue')],
    encountersNote: 'Only the Diglett’s Cave tunnel is listed here; the entrance houses and eastern Route 2 path do not share this pool. Both releases have Diglett at levels 15–22 and Dugtrio only at 29 or 31. Weights out of 256 are conditional on a generated encounter, assuming a uniform random byte—not per-step or catch probabilities. Western Route 2 grass and rod catches on Route 11 belong to other places.',
    trainers: [],
    pokemonTrades: [{
        id: 'd2-marcel-trade', areaId: 'route-2-trade-house',
        give: { name: 'Abra', dexId: 63 }, receive: { name: 'Mr. Mime', dexId: 122, nickname: 'MARCEL' },
        details: 'Speak to the Game Boy Kid in the house south of Diglett’s Cave’s Route 2 exit. You give Abra and receive Mr. Mime nicknamed MARCEL. Optional exchange, not a fixed-level gift; bring an Abra you are willing to trade. This is the international Red/Blue trade, not Yellow’s Clefairy or Japanese Blue’s Jigglypuff request.',
        sourceIds: ['d2-route-2-objects', 'd2-trade-house-objects', 'd2-trade-house-script', 'd2-trades'],
    }],
    advice: [
        { id: 'd2-owned-count', text: 'For the aide’s requirement, check the Pokédex’s owned/obtained count. Ten duplicates do not count as ten species, and you do not need all ten in your party: previously obtained species still count.', sourceIds: ['d2-aide-check', 'd2-flash-gift'] },
        { id: 'd2-flash-is-later', text: 'Flash is for dark areas such as Rock Tunnel, not for seeing inside Diglett’s Cave. The cave’s northern entrance NPC only explains this; the HM is a separate reward from the Route 2 gate aide.', sourceIds: ['d2-north-entrance-script', 'd2-north-entrance-text', 'd2-flash-gift'] },
        { id: 'd2-no-fishing-here', text: 'This cave and eastern Route 2 return do not have a fishing stop. For water and rod catches, use the separately named Route 11 or Vermilion fishing spots rather than the cave-entrance NPC.', sourceIds: ['d2-cave-wild', 'd2-route-2-water', 'd2-super-rod-maps', 'd2-north-entrance-script'] },
    ],
    warnings: [
        { id: 'd2-high-level-dugtrio', text: 'Prepare before entering: Dugtrio can appear at level 29 or 31, while Diglett are level 15–22. Heal and bring supplies for both the outward and return crossing.', sourceIds: ['d2-cave-wild', 'd2-cave-objects'] },
        { id: 'd2-cut-before-flash', text: 'Do not walk all the way through expecting an unconditional Flash gift. Bring a Cut user and Cascade Badge to reach the aide from the cave exit, at least ten distinct obtained species, and Bag space. If the reward does not fit, it remains claimable after you make room.', sourceIds: ['d2-route-2-navigation', 'd2-field-badges', 'd2-aide-check', 'd2-flash-gift'] },
    ],
}
