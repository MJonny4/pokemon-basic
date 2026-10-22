import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}
type Species = readonly [name: string, dexId: number, level: number]
function party(species: Species[]): GuideLocation['trainers'][number]['party'] {
    return species.map(([name, dexId, level], i) => ({ id: `slot-${i + 1}`, name, dexId, level, moves: [] }))
}
function trainer(id: string, name: string, areaId: string, x: number, y: number, species: Species[], objectSource: string): GuideLocation['trainers'][number] {
    return { id, name, areaId, role: 'trainer', position: { x, y }, party: party(species), sourceIds: [objectSource, 'vermilion-parties'] }
}
function encounters(versionId: 'red' | 'blue', areaId: 'route-5' | 'route-6'): GuideLocation['encounters'][number] {
    const grass = versionId === 'red' ? ['Oddish', 43] as const : ['Bellsprout', 69] as const
    const exclusive = versionId === 'red' ? ['Mankey', 56] as const : ['Meowth', 52] as const
    const species: Species[] = [[...grass, 13], ['Pidgey', 16, 13], ['Pidgey', 16, 15], [...exclusive, 10], [...exclusive, 12], [...grass, 15], [...grass, 16], ['Pidgey', 16, 16], [...exclusive, 14], [...exclusive, 16]]
    const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
    return { versionId, areaId, method: 'grass', denominator: 256, sourceIds: [`${areaId}-wild`, 'vermilion-weights'], slots: species.map(([name, dexId, level], i) => ({ id: `${areaId}-${versionId}-slot-${i}`, name, dexId, level, weight: weights[i] })) }
}
const hidden = 'Face this square from an adjacent square and press A; no Itemfinder required. Keep Bag space.'
const shipBag = 'Collect before leaving the ship after receiving HM01 Cut. Keep Bag space.'

export const VERMILION_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-vermilion', guideId: 'red-blue', stopId: 'vermilion-city',
    versionIds: ['red', 'blue'], title: 'Vermilion City, the southern approach & S.S. Anne',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Route 5, the north–south Underground Path, Route 6, town activities and S.S. Anne: 13 item entries, 22 fixed trainer parties, all three rival parties, two grass areas per release and two NPC trades. Water/rod access has a separate reference.',
    limitations: ['Source-checked, not play-through verified. Directions are landmark/connection overviews, not a terrain map or turn-by-turn route.', 'Trainer/rival moves and prize money, shop stock, Day Care service mechanics, Route 11, Diglett’s Cave interior and Lt. Surge’s separate gym stop are outside this audit. No departure bypasses or glitches are walkthrough steps.'],
    sources: [
        source('route-5-links', 'data/maps/headers/Route5.asm', 'Route 5 connections', 'North Cerulean; south Saffron'),
        source('route-5-objects', 'data/maps/objects/Route5.asm', 'Route 5 buildings', 'Underground entrance (17,27); Day Care (10,21); Saffron gate warps'),
        source('route-5-gate', 'scripts/Route5Gate.asm', 'Saffron gate restriction', 'DefaultScript checks guard drink flag and otherwise turns the player back'),
        source('route-5-entrance', 'data/maps/objects/UndergroundPathRoute5.asm', 'Northern Underground Path entrance', 'Door from Route 5; stair to north–south path warp 1'),
        source('underground-ns-objects', 'data/maps/objects/UndergroundPathNorthSouth.asm', 'Tunnel connections', 'North stair (5,4) to Route 5 entrance; south stair (2,41) to Route 6 entrance'),
        source('route-6-entrance', 'data/maps/objects/UndergroundPathRoute6.asm', 'Southern Underground Path entrance', 'Stair to tunnel warp 2; door back to Route 6'),
        source('route-6-links', 'data/maps/headers/Route6.asm', 'Route 6 connections', 'South Vermilion City'),
        source('route-6-objects', 'data/maps/objects/Route6.asm', 'Route 6 trainers', 'Six trainer objects and Underground Path entrance at (17,13)'),
        source('vermilion-town', 'data/maps/objects/VermilionCity.asm', 'Town buildings and dock entrance', 'Old Rod house (7,3), Fan Club (9,13), trade house (15,13), dock warps'),
        source('vermilion-town-links', 'data/maps/headers/VermilionCity.asm', 'Town exits', 'North Route 6; east Route 11'),
        source('vermilion-boarding', 'scripts/VermilionCity.asm', 'Ticket and departure restrictions', 'Sailor1Text checks S_S_TICKET; DefaultScript blocks dock access after EVENT_SS_ANNE_LEFT'),
        source('vermilion-dock-objects', 'data/maps/objects/VermilionDock.asm', 'Dock and ship connection', 'Dock entrance (14,0); boarding warp (14,2) to S.S. Anne 1F'),
        source('vermilion-departure', 'scripts/VermilionDock.asm', 'Exact departure trigger', 'EVENT_GOT_HM01 plus destination warp 1 triggers SSAnneLeavesScript, sets EVENT_SS_ANNE_LEFT and removes ship warp'),
        source('anne-1f-links', 'data/maps/objects/SSAnne1F.asm', 'Ship entrance floor connections', 'Six cabin doors; 2F stair (2,6), B1F stair (37,15), kitchen (3,16)'),
        source('anne-1f-rooms', 'data/maps/objects/SSAnne1FRooms.asm', '1F cabin battles and item', 'Four battle objects; TM_BODY_SLAM at (12,15); cabin warps'),
        source('anne-2f-links', 'data/maps/objects/SSAnne2F.asm', '2F corridors', 'Six cabin entrances; Captain’s Room (36,4); 3F connecting stair (2,12). Rival object’s placeholder party is overridden by script.'),
        source('anne-2f-rooms', 'data/maps/objects/SSAnne2FRooms.asm', '2F cabin battles and items', 'Four battles, Max Ether (12,1), Rare Candy (0,12); cabin warps'),
        source('anne-b1f-links', 'data/maps/objects/SSAnneB1F.asm', 'Basement cabin entrances', 'Five cabin doors along the corridor'),
        source('anne-b1f-rooms', 'data/maps/objects/SSAnneB1FRooms.asm', 'B1F cabin battles and items', 'Six battles; Ether (20,2), TM_REST (10,2), Max Potion (12,11)'),
        source('anne-kitchen', 'data/maps/objects/SSAnneKitchen.asm', 'Kitchen access', 'Warp to 1F; no visible item balls'),
        source('anne-3f-links', 'data/maps/objects/SSAnne3F.asm', 'Outdoor deck access', 'Short 3F corridor connects 2F and SS_ANNE_BOW'),
        source('anne-bow', 'data/maps/objects/SSAnneBow.asm', 'Outdoor deck battles', 'Sailor parties 1 and 2 at (4,4)/(10,8)'),
        source('anne-rival', 'scripts/SSAnne2F.asm', 'Rival location and actual parties', 'Coordinates (36/37,8) near captain; uses OPP_RIVAL2 parties 1–3 selected by rival starter'),
        source('anne-captain', 'scripts/SSAnneCaptainsRoom.asm', 'HM01 Cut gift', 'RubCaptainsBackText; GiveItem HM_CUT; EVENT_GOT_HM01 set only on success; Bag-full retry'),
        source('vermilion-hidden', 'data/events/hidden_events.asm', 'Tunnel and ship hidden items', 'UNDERGROUND_PATH_NORTH_SOUTH Full Restore (3,4)/X Special (4,34); SS_ANNE_KITCHEN Great Ball (13,9); SS_ANNE_B1F_ROOMS Hyper Potion (3,1)'),
        source('vermilion-hidden-use', 'engine/overworld/hidden_events.asm', 'Hidden interaction', 'CheckIfCoordsInFrontOfPlayerMatch'),
        source('vermilion-parties', 'data/trainers/parties.asm', 'Approach/ship trainer parties', 'Route 6 class parties; Gentleman 1/2/3/5, Youngster 8, Lass 11/12, Fisher 1/2, Sailor 1–7; Rival2 1–3'),
        source('route-5-wild', 'data/wild/maps/Route5.asm', 'Route 5 grass tables', 'Red Oddish/Mankey versus Blue Bellsprout/Meowth'),
        source('route-6-wild', 'data/wild/maps/Route6.asm', 'Route 6 grass tables', 'Same ten slots as Route 5 in each release, retained as a distinct location'),
        source('vermilion-weights', 'data/wild/probabilities.asm', 'Exact encounter weights', 'WildMonEncounterSlotChances; total 256'),
        source('vermilion-old-rod', 'scripts/VermilionOldRodHouse.asm', 'Old Rod gift', 'FishingGuruText: accept offer, GiveItem OLD_ROD, Bag-full retry'),
        source('vermilion-voucher', 'scripts/PokemonFanClub.asm', 'Bike Voucher gift', 'ChairmanText gives BIKE_VOUCHER after listening to the story'),
        source('vermilion-bike-exchange', 'scripts/BikeShop.asm', 'Voucher destination', 'Cerulean Bike Shop gives BICYCLE in exchange for voucher'),
        source('vermilion-trade', 'scripts/VermilionTradeHouse.asm', 'Town trade identity', 'LittleGirlText uses TRADE_FOR_DUX'),
        source('route-5-trade', 'scripts/UndergroundPathRoute5.asm', 'Entrance-house trade identity', 'LittleGirlText uses TRADE_FOR_SPOT'),
        source('vermilion-trades', 'data/events/trades.asm', 'International Red/Blue trades', 'DUX: Spearow → Farfetch’d; SPOT: Nidoran♂ → Nidoran♀'),
        source('vermilion-cut-badge', 'text/CeruleanGym.asm', 'Cut badge requirement', 'MistyCascadeBadgeInfoText: Cascade Badge permits Cut outside battle'),
    ],
    areas: [
        { id: 'route-5', name: 'Route 5 · south of Cerulean', description: 'Grass, the Day Care and the small Underground Path entrance house. Use the tunnel for this journey rather than the initially blocked Saffron gate.', sourceIds: ['route-5-links', 'route-5-objects', 'route-5-gate', 'route-5-wild'] },
        { id: 'underground-ns', name: 'Underground Path · north–south tunnel', description: 'Connects Route 5 and Route 6. Two hidden items are in this tunnel; do not confuse it with the east–west Underground Path.', sourceIds: ['underground-ns-objects', 'route-5-entrance', 'route-6-entrance', 'vermilion-hidden'] },
        { id: 'route-6', name: 'Route 6 · north of Vermilion', description: 'Six trainers, grass and fishing water before town. Its grass list matches Route 5 in each release, but the places are separate.', sourceIds: ['route-6-objects', 'route-6-links', 'route-6-wild', 'route-5-wild'] },
        { id: 'vermilion-town', name: 'Inside Vermilion City', description: 'Heal, collect the Old Rod and Bike Voucher, check the Farfetch’d trade and board with Bill’s ticket. Lt. Surge is the next separate guide stop.', sourceIds: ['vermilion-town', 'vermilion-old-rod', 'vermilion-voucher', 'vermilion-trade', 'vermilion-boarding'] },
        { id: 'anne-1f', name: 'S.S. Anne · 1F cabins', description: 'Four trainer battles and TM08 Body Slam. The main entrance corridor also connects the kitchen, basement and 2F.', sourceIds: ['anne-1f-links', 'anne-1f-rooms'] },
        { id: 'anne-b1f', name: 'S.S. Anne · B1F cabins', description: 'Six trainer battles, three visible items and a hidden Hyper Potion. Coordinates below refer to the cabin map, not the connecting corridor.', sourceIds: ['anne-b1f-rooms', 'vermilion-hidden', 'anne-b1f-links'] },
        { id: 'anne-kitchen', name: 'S.S. Anne · kitchen', description: 'No visible item ball here: inspect the southernmost trash-bin square for a hidden Great Ball.', sourceIds: ['anne-kitchen', 'vermilion-hidden'] },
        { id: 'anne-2f', name: 'S.S. Anne · 2F cabins & rival corridor', description: 'Four cabin battles, Max Ether and Rare Candy. The rival waits in the corridor before the Captain’s Room; his team has changed since Cerulean.', sourceIds: ['anne-2f-rooms', 'anne-2f-links', 'anne-rival', 'vermilion-parties'] },
        { id: 'anne-bow', name: 'S.S. Anne · outdoor deck', description: 'Two Sailor battles, reached through the short 3F connecting corridor. This is an optional detour before departure.', sourceIds: ['anne-bow', 'anne-3f-links', 'anne-2f-links'] },
        { id: 'anne-captain', name: 'S.S. Anne · Captain’s Room', description: 'Help the seasick captain for HM01 Cut. Receiving it does not immediately eject you, but the ship leaves when you walk off afterwards.', sourceIds: ['anne-captain', 'vermilion-departure'] },
    ],
    directions: [
        { id: 'vermilion-approach', text: 'From Cerulean, go south to Route 5. Enter the small Underground Path house at (17, 27), take its stairs and walk through the north–south tunnel to the Route 6 exit. This bypasses the Saffron gate; you do not need Cut or Surf for this approach.', sourceIds: ['route-5-links', 'route-5-objects', 'route-5-gate', 'route-5-entrance', 'underground-ns-objects', 'route-6-entrance'] },
        { id: 'vermilion-arrive', text: 'Continue south through Route 6 to Vermilion City and heal. In town, the house west of the Pokémon Center gives the OLD Rod. Listen to the Pokémon Fan Club chairman for a Bike Voucher to exchange later in Cerulean.', sourceIds: ['route-6-links', 'route-6-objects', 'vermilion-town', 'vermilion-old-rod', 'vermilion-voucher', 'vermilion-bike-exchange'] },
        { id: 'vermilion-board', text: 'Bring the S.S. Ticket received from Bill, keep Bag space and speak to the sailor at the southern harbor entrance. Board the S.S. Anne from the dock. Finish the optional ship content before your final exit after receiving Cut.', sourceIds: ['vermilion-boarding', 'vermilion-town', 'vermilion-dock-objects', 'vermilion-departure'] },
        { id: 'anne-explore', text: 'Explore the 1F cabins, basement cabins, kitchen, 2F cabins and outdoor deck for the items and trainers below. From 1F, the kitchen is at the southwest end, the basement stairs are to the east and the 2F stairs are to the west. Reach the deck through the short 3F corridor from 2F.', sourceIds: ['anne-1f-links', 'anne-1f-rooms', 'anne-b1f-links', 'anne-b1f-rooms', 'anne-kitchen', 'anne-2f-links', 'anne-2f-rooms', 'anne-3f-links', 'anne-bow'] },
        { id: 'anne-rival-step', text: 'Heal and prepare before approaching the Captain’s Room at the eastern end of 2F. Your rival has Pidgeotto 19, Raticate 16, Kadabra 18 and a level-20 evolved starter. Use the preview below for the team matching your original starter.', sourceIds: ['anne-rival', 'anne-2f-links', 'vermilion-parties'] },
        { id: 'anne-cut', text: 'Speak to the captain and help his seasickness to receive HM01 Cut. If your Bag is full, make room and speak again. Before leaving the ship, finish any remaining items and battles: walking off after receiving HM01 triggers its departure.', sourceIds: ['anne-captain', 'vermilion-departure'] },
        { id: 'vermilion-next-gym', text: 'Back in town, teach Cut to a compatible Pokémon. You also need Misty’s Cascade Badge to use it outside battle. Lt. Surge’s gym entrance is the next separate stop; its teams and puzzle are not part of this ship reference.', sourceIds: ['anne-captain', 'vermilion-cut-badge', 'vermilion-town'] },
    ],
    items: [
        { id: 'underground-full-restore', areaId: 'underground-ns', name: 'Full Restore', quantity: 1, kind: 'hidden', position: { x: 3, y: 4 }, location: 'Northern part of the north–south tunnel, square (3, 4).', requirements: hidden, sourceIds: ['vermilion-hidden', 'vermilion-hidden-use'] },
        { id: 'underground-x-special', areaId: 'underground-ns', name: 'X Special', quantity: 1, kind: 'hidden', position: { x: 4, y: 34 }, location: 'Southern part of the same tunnel, square (4, 34).', requirements: hidden, sourceIds: ['vermilion-hidden', 'vermilion-hidden-use'] },
        { id: 'vermilion-old-rod-gift', areaId: 'vermilion-town', name: 'Old Rod', quantity: 1, kind: 'gift', location: 'Fishing Guru’s house at (7, 3), west of the town Pokémon Center.', requirements: 'Accept his fishing offer and have Bag space. This is the Old Rod, not the Good Rod.', sourceIds: ['vermilion-old-rod', 'vermilion-town'] },
        { id: 'vermilion-bike-voucher', areaId: 'vermilion-town', name: 'Bike Voucher', quantity: 1, kind: 'gift', location: 'Pokémon Fan Club at (9, 13): listen to the chairman’s story.', requirements: 'Agree to listen and keep Bag space. Exchange the voucher for a Bicycle at Cerulean’s Bike Shop; the Bicycle is not handed out here.', sourceIds: ['vermilion-voucher', 'vermilion-town', 'vermilion-bike-exchange'] },
        { id: 'anne-tm08', areaId: 'anne-1f', name: 'TM08 Body Slam', quantity: 1, kind: 'visible', position: { x: 12, y: 15 }, location: '1F cabin entered through the corridor door at (11, 8). The item is at cabin-map square (12, 15).', requirements: shipBag, sourceIds: ['anne-1f-links', 'anne-1f-rooms', 'vermilion-departure'] },
        { id: 'anne-ether', areaId: 'anne-b1f', name: 'Ether', quantity: 1, kind: 'visible', position: { x: 20, y: 2 }, location: 'Basement cabin entered at corridor (15, 3); item at cabin-map (20, 2).', requirements: shipBag, sourceIds: ['anne-b1f-links', 'anne-b1f-rooms', 'vermilion-departure'] },
        { id: 'anne-tm44', areaId: 'anne-b1f', name: 'TM44 Rest', quantity: 1, kind: 'visible', position: { x: 10, y: 2 }, location: 'Basement cabin entered at corridor (11, 3); item at cabin-map (10, 2).', requirements: shipBag, sourceIds: ['anne-b1f-links', 'anne-b1f-rooms', 'vermilion-departure'] },
        { id: 'anne-max-potion', areaId: 'anne-b1f', name: 'Max Potion', quantity: 1, kind: 'visible', position: { x: 12, y: 11 }, location: 'Basement cabin entered at corridor (23, 3); item at cabin-map (12, 11).', requirements: shipBag, sourceIds: ['anne-b1f-links', 'anne-b1f-rooms', 'vermilion-departure'] },
        { id: 'anne-hyper-potion', areaId: 'anne-b1f', name: 'Hyper Potion', quantity: 1, kind: 'hidden', position: { x: 3, y: 1 }, location: 'Basement cabin entered at corridor (7, 3); inspect cabin-map square (3, 1).', requirements: `${hidden} Collect before the ship departs.`, sourceIds: ['anne-b1f-links', 'anne-b1f-rooms', 'vermilion-hidden', 'vermilion-hidden-use', 'vermilion-departure'] },
        { id: 'anne-great-ball', areaId: 'anne-kitchen', name: 'Great Ball', quantity: 1, kind: 'hidden', position: { x: 13, y: 9 }, location: 'Kitchen: inspect the southernmost trash-bin square, (13, 9). The other two bins do not contain this item.', requirements: `${hidden} Collect before the ship departs.`, sourceIds: ['vermilion-hidden', 'vermilion-hidden-use', 'vermilion-departure'] },
        { id: 'anne-max-ether', areaId: 'anne-2f', name: 'Max Ether', quantity: 1, kind: 'visible', position: { x: 12, y: 1 }, location: '2F cabin entered at corridor (13, 11); item at cabin-map (12, 1).', requirements: shipBag, sourceIds: ['anne-2f-links', 'anne-2f-rooms', 'vermilion-departure'] },
        { id: 'anne-rare-candy', areaId: 'anne-2f', name: 'Rare Candy', quantity: 1, kind: 'visible', position: { x: 0, y: 12 }, location: '2F cabin entered at corridor (21, 11); item at cabin-map (0, 12).', requirements: shipBag, sourceIds: ['anne-2f-links', 'anne-2f-rooms', 'vermilion-departure'] },
        { id: 'anne-hm01', areaId: 'anne-captain', name: 'HM01 Cut', quantity: 1, kind: 'gift', location: 'Captain’s Room, beyond the 2F rival encounter. Speak to the captain and help him.', requirements: 'Keep Bag space; speak again if it did not fit. Finish ship content before walking off afterwards. Cascade Badge is needed to use Cut in the field.', sourceIds: ['anne-captain', 'anne-rival', 'vermilion-departure', 'vermilion-cut-badge'] },
    ],
    encounters: (['red', 'blue'] as const).flatMap((version) => [encounters(version, 'route-5'), encounters(version, 'route-6')]),
    encountersNote: 'These grass tables belong to Route 5/6, not Vermilion town or the ship. The two routes share the same ten-slot table in each release, but remain distinct places. Red has Oddish/Mankey; Blue has Bellsprout/Meowth. Exact fractions out of 256 are conditional on an encounter being generated, assuming a uniform random byte; percentages are rounded, not chances per step or catch. Trades and rod catches are separate below.',
    trainers: [
        trainer('route-6-jr-m-1', 'Jr. Trainer♂ · northern pair', 'route-6', 10, 21, [['Squirtle', 7, 20]], 'route-6-objects'),
        trainer('route-6-jr-f-1', 'Jr. Trainer♀ · northern pair', 'route-6', 11, 21, [['Rattata', 19, 16], ['Pikachu', 25, 16]], 'route-6-objects'),
        trainer('route-6-bug-1', 'Bug Catcher · west', 'route-6', 0, 15, [['Weedle', 13, 16], ['Caterpie', 10, 16], ['Weedle', 13, 16]], 'route-6-objects'),
        trainer('route-6-jr-m-2', 'Jr. Trainer♂ · south', 'route-6', 11, 31, [['Spearow', 21, 16], ['Raticate', 20, 16]], 'route-6-objects'),
        trainer('route-6-jr-f-2', 'Jr. Trainer♀ · south', 'route-6', 11, 30, [['Pidgey', 16, 16], ['Pidgey', 16, 16], ['Pidgey', 16, 16]], 'route-6-objects'),
        trainer('route-6-bug-2', 'Bug Catcher · east', 'route-6', 19, 26, [['Butterfree', 12, 20]], 'route-6-objects'),
        trainer('anne-1f-gentleman-1', 'Gentleman 1', 'anne-1f', 2, 3, [['Growlithe', 58, 18], ['Growlithe', 58, 18]], 'anne-1f-rooms'),
        trainer('anne-1f-gentleman-2', 'Gentleman 2', 'anne-1f', 11, 4, [['Nidoran♂', 32, 19], ['Nidoran♀', 29, 19]], 'anne-1f-rooms'),
        trainer('anne-1f-youngster', 'Youngster', 'anne-1f', 11, 14, [['Nidoran♂', 32, 21]], 'anne-1f-rooms'),
        trainer('anne-1f-lass', 'Lass', 'anne-1f', 13, 11, [['Pidgey', 16, 18], ['Nidoran♀', 29, 18]], 'anne-1f-rooms'),
        trainer('anne-2f-gentleman-1', 'Gentleman · Pikachu', 'anne-2f', 10, 2, [['Pikachu', 25, 23]], 'anne-2f-rooms'),
        trainer('anne-2f-fisher', 'Fisher', 'anne-2f', 13, 4, [['Goldeen', 118, 17], ['Tentacool', 72, 17], ['Goldeen', 118, 17]], 'anne-2f-rooms'),
        trainer('anne-2f-gentleman-2', 'Gentleman · Growlithe/Ponyta', 'anne-2f', 0, 14, [['Growlithe', 58, 17], ['Ponyta', 77, 17]], 'anne-2f-rooms'),
        trainer('anne-2f-lass', 'Lass', 'anne-2f', 2, 11, [['Rattata', 19, 18], ['Pikachu', 25, 18]], 'anne-2f-rooms'),
        trainer('anne-b1f-sailor-1', 'Sailor 1', 'anne-b1f', 0, 13, [['Shellder', 90, 21]], 'anne-b1f-rooms'),
        trainer('anne-b1f-sailor-2', 'Sailor 2', 'anne-b1f', 2, 11, [['Horsea', 116, 17], ['Shellder', 90, 17], ['Tentacool', 72, 17]], 'anne-b1f-rooms'),
        trainer('anne-b1f-sailor-3', 'Sailor 3', 'anne-b1f', 12, 3, [['Tentacool', 72, 18], ['Staryu', 120, 18]], 'anne-b1f-rooms'),
        trainer('anne-b1f-sailor-4', 'Sailor 4', 'anne-b1f', 22, 2, [['Horsea', 116, 17], ['Horsea', 116, 17], ['Horsea', 116, 17]], 'anne-b1f-rooms'),
        trainer('anne-b1f-sailor-5', 'Sailor 5', 'anne-b1f', 0, 2, [['Machop', 66, 20]], 'anne-b1f-rooms'),
        trainer('anne-b1f-fisher', 'Fisher', 'anne-b1f', 0, 4, [['Tentacool', 72, 17], ['Staryu', 120, 17], ['Shellder', 90, 17]], 'anne-b1f-rooms'),
        trainer('anne-bow-sailor-1', 'Sailor 1', 'anne-bow', 4, 4, [['Machop', 66, 18], ['Shellder', 90, 18]], 'anne-bow'),
        trainer('anne-bow-sailor-2', 'Sailor 2', 'anne-bow', 10, 8, [['Machop', 66, 17], ['Tentacool', 72, 17]], 'anne-bow'),
    ],
    starterBattles: [{ id: 'anne-rival', name: 'Rival · S.S. Anne 2F', areaId: 'anne-2f', description: 'This is the ship battle near the Captain’s Room, not the earlier Cerulean fight. The last Pokémon is now evolved. Preview your original starter choice; this does not change your saved starter.', sourceIds: ['anne-rival', 'vermilion-parties'], variants: [
        { playerStarterDexId: 1, party: party([['Pidgeotto', 17, 19], ['Raticate', 20, 16], ['Kadabra', 64, 18], ['Charmeleon', 5, 20]]) },
        { playerStarterDexId: 4, party: party([['Pidgeotto', 17, 19], ['Raticate', 20, 16], ['Kadabra', 64, 18], ['Wartortle', 8, 20]]) },
        { playerStarterDexId: 7, party: party([['Pidgeotto', 17, 19], ['Raticate', 20, 16], ['Kadabra', 64, 18], ['Ivysaur', 2, 20]]) },
    ] }],
    pokemonTrades: [
        { id: 'route-5-spot-trade', areaId: 'route-5', give: { name: 'Nidoran♂', dexId: 32 }, receive: { name: 'Nidoran♀', dexId: 29, nickname: 'SPOT' }, details: 'Optional trade inside Route 5’s small Underground Path entrance house: give the girl a Nidoran♂ to receive Nidoran♀, nicknamed SPOT. This is an NPC exchange, not a Route 5 grass encounter.', sourceIds: ['route-5-trade', 'vermilion-trades', 'route-5-entrance'] },
        { id: 'vermilion-dux-trade', areaId: 'vermilion-town', give: { name: 'Spearow', dexId: 21 }, receive: { name: 'Farfetch’d', dexId: 83, nickname: 'DUX' }, details: 'Optional trade in Vermilion’s trade house at (15, 13): give the girl a Spearow for Farfetch’d, nicknamed DUX. It is not a wild town or ship encounter.', sourceIds: ['vermilion-trade', 'vermilion-trades', 'vermilion-town'] },
    ],
    advice: [
        { id: 'anne-heal-plan', text: 'Heal and buy supplies before boarding. You may leave and reboard while the ship is still present and you have not received HM01; after receiving it, your normal exit triggers departure. Explore optional cabins before that final trip off the ship.', sourceIds: ['vermilion-boarding', 'vermilion-departure', 'anne-captain'] },
        { id: 'vermilion-approach-wild', text: 'For these approach routes, Red has Mankey and Oddish; Blue has Meowth and Bellsprout. The Route 5/6 tables really are identical within each version. Their Pokémon are not roaming the town or the ship.', sourceIds: ['route-5-wild', 'route-6-wild'] },
        { id: 'anne-coordinates', text: 'Cabin and corridor maps use different local coordinates. Item descriptions name both the corridor doorway and the pickup’s cabin-map square where useful. These reference coordinates do not show walls or a walkable map.', sourceIds: ['anne-1f-links', 'anne-1f-rooms', 'anne-2f-links', 'anne-2f-rooms', 'anne-b1f-links', 'anne-b1f-rooms'] },
        { id: 'vermilion-future-exits', text: 'Finish your town errands, then continue to Lt. Surge’s separate gym section. For further exploring, Route 6 is north of town and Route 11 is east.', sourceIds: ['vermilion-town-links', 'vermilion-town'] },
    ],
    warnings: [
        { id: 'anne-departure-warning', text: 'Finish ship pickups and optional trainer battles before your final exit after receiving HM01 Cut. Walking off with HM01 triggers departure; the normal harbor entrance then blocks reboarding. Taking the HM does not immediately eject you.', sourceIds: ['anne-captain', 'vermilion-departure', 'vermilion-boarding'] },
        { id: 'anne-bag-warning', text: 'Keep Bag space for the captain’s HM and ship items. If HM01 did not fit, make room and speak to him again. Departure checks that you received HM01, not merely that you spoke to or helped the captain.', sourceIds: ['anne-captain', 'vermilion-departure'] },
    ],
}
