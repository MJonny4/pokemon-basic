import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}
type Species = readonly [name: string, dexId: number, level: number]
function party(species: Species[]): GuideLocation['trainers'][number]['party'] {
    return species.map(([name, dexId, level], i) => ({ id: `slot-${i + 1}`, name, dexId, level, moves: [] }))
}
function trainer(id: string, name: string, areaId: string, x: number, y: number, species: Species[], objectSource: string, requirements?: string, requirementSources: string[] = []): GuideLocation['trainers'][number] {
    return { id, name, areaId, role: 'trainer', position: { x, y }, party: party(species), requirements, sourceIds: [objectSource, 'cerulean-parties', ...requirementSources] }
}
function encounters(versionId: 'red' | 'blue', areaId: 'route-24' | 'route-25'): GuideLocation['encounters'][number] {
    const red = versionId === 'red'
    const bug = red ? ['Weedle', 13] as const : ['Caterpie', 10] as const
    const cocoon = red ? ['Kakuna', 14] as const : ['Metapod', 11] as const
    const grass = red ? ['Oddish', 43] as const : ['Bellsprout', 69] as const
    const route24 = areaId === 'route-24'
    const slots: Species[] = [
        [...bug, route24 ? 7 : 8], [...cocoon, route24 ? 8 : 9], ['Pidgey', 16, route24 ? 12 : 13],
        [...grass, 12], [...grass, 13], ['Abra', 63, route24 ? 10 : 12], [...grass, 14],
        ...(route24 ? [['Pidgey', 16, 13], ['Abra', 63, 8], ['Abra', 63, 12]] as Species[]
            : [['Abra', 63, 10], red ? ['Metapod', 11, 7] : ['Kakuna', 14, 7], red ? ['Caterpie', 10, 8] : ['Weedle', 13, 8]] as Species[]),
    ]
    const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
    return { versionId, areaId, method: 'grass', denominator: 256, sourceIds: [`${areaId}-wild`, 'cerulean-weights'], slots: slots.map(([name, dexId, level], i) => ({ id: `${areaId}-${versionId}-slot-${i}`, name, dexId, level, weight: weights[i] })) }
}
const bag = 'No field move required; keep room in your Bag.'
const hidden = 'Face the named square from beside it and press A. No Itemfinder required; keep Bag space.'

export const CERULEAN_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-cerulean', guideId: 'red-blue', stopId: 'gym-2-cerulean',
    versionIds: ['red', 'blue'], title: 'Cerulean City, Misty & the northern routes',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Cerulean town activities and gym, Route 24/Nugget Bridge, Route 25 and Bill: 12 item/reward entries, 20 fixed trainer parties plus all three rival parties, both nearby-route grass tables, Jynx trade and later Bicycle exchange. Fishing is a separate reference.',
    limitations: ['Source-checked, not play-through verified. Landmark directions are not a terrain map or turn-by-turn walkthrough.', 'Ordinary trainer/rival moves and prize money, shop stock, full NPC dialogue and Cerulean Cave are not audited. Only Misty’s moves and prize are covered.'],
    sources: [
        source('cerulean-objects', 'data/maps/objects/CeruleanCity.asm', 'Town buildings and Rocket', 'City warps; Rocket party 5 at (30,8); rival event object'),
        source('cerulean-links', 'data/maps/headers/CeruleanCity.asm', 'Town connections', 'North Route 24; south Route 5'),
        source('cerulean-events', 'scripts/CeruleanCity.asm', 'Rival sequence and TM28', 'CeruleanCityCoords2 (20/21,6); Rival1 parties 7–9; RocketText gives TM_DIG with Bag-full retry'),
        source('cerulean-gym-objects', 'data/maps/objects/CeruleanGym.asm', 'Gym trainer identities', 'Misty, Jr. Trainer♀ party 1, Swimmer party 1'),
        source('cerulean-gym-events', 'scripts/CeruleanGym.asm', 'Misty rewards and missable gym battles', 'ReceiveTM11; .gymVictory deactivates both ordinary gym trainers; MistyText retries TM11'),
        source('cerulean-gym-text', 'text/CeruleanGym.asm', 'Cascade Badge and Cut', 'MistyCascadeBadgeInfoText and TM11ExplanationText'),
        source('cerulean-parties', 'data/trainers/parties.asm', 'Trainer parties and levels', 'Misty; JrTrainerF 1; Swimmer 1; Rival1 7–9; Rocket 5–6; Route 24/25 class party indices'),
        source('cerulean-staryu', 'data/pokemon/base_stats/staryu.asm', 'Staryu starting moves/type', 'Tackle; pure Water'),
        source('cerulean-starmie', 'data/pokemon/base_stats/starmie.asm', 'Starmie starting moves/type', 'Tackle, Water Gun, Harden; Water/Psychic'),
        source('cerulean-level-moves', 'data/pokemon/evos_moves.asm', 'Move levels and Abra evolutions', 'Staryu learns Water Gun 17/Harden 22; Starmie no level moves; Abra → Kadabra 16; Kadabra → Alakazam by trade; Bulbasaur Vine Whip 13'),
        source('cerulean-special-move', 'data/trainers/special_moves.asm', 'Misty’s special move', 'LoneMoves entry 2: party index 1, BubbleBeam'),
        source('cerulean-trainer-engine', 'engine/battle/read_trainer_party.asm', 'Special move slot and prize calculation', '.AddLoneMove replaces the selected Pokémon’s third move; .FinishUp/.LastLoop uses final party level'),
        source('cerulean-prize-base', 'data/trainers/pic_pointers_money.asm', 'Misty prize base', 'MistyPic 9900; base ₽99 × last member level 21 = ₽2079'),
        source('cerulean-matchups', 'data/types/type_matchups.asm', 'Gen I effectiveness', 'Grass/Electric against Water; Water against Water; Fighting against Psychic'),
        source('cerulean-hidden', 'data/events/hidden_events.asm', 'Hidden town and Route 25 items', 'CERULEAN_CITY Rare Candy (15,8); ROUTE_25 Ether (38,3), Elixer (10,1)'),
        source('cerulean-hidden-use', 'engine/overworld/hidden_events.asm', 'Hidden item interaction', 'CheckIfCoordsInFrontOfPlayerMatch'),
        source('cerulean-badge-house', 'data/maps/objects/CeruleanBadgeHouse.asm', 'Backyard access', 'Rear warp (2,0) to Cerulean City warp 10 at (9,9)'),
        source('route-24-objects', 'data/maps/objects/Route24.asm', 'Bridge trainers and TM45', 'Seven trainer objects; TM_THUNDER_WAVE at (10,5)'),
        source('route-24-events', 'scripts/Route24.asm', 'Nugget and recruiter order', 'CooltrainerM1Text gives Nugget before initiating Rocket battle; Bag-full retry'),
        source('route-24-links', 'data/maps/headers/Route24.asm', 'Route 24 connections', 'South Cerulean City, east Route 25'),
        source('route-25-objects', 'data/maps/objects/Route25.asm', 'Route 25 trainers, TM19 and Bill', 'Nine trainers; TM_SEISMIC_TOSS (22,2); Bill’s House warp (45,3)'),
        source('route-25-events', 'scripts/Route25.asm', 'Bill return state', 'Route25ToggleBillsScript sets EVENT_LEFT_BILLS_HOUSE_AFTER_HELPING after ticket and hides recruiter'),
        source('cerulean-toggle-ids', 'constants/toggle_constants.asm', 'Recruiter toggle identity', 'ROUTE_24: TOGGLE_NUGGET_BRIDGE_GUY is the first toggleable object'),
        source('cerulean-toggle-objects', 'data/maps/toggleable_objects.asm', 'Recruiter toggle mapping', 'ROUTE_24 first toggleable object is ROUTE24_COOLTRAINER_M1, the recruiter'),
        source('route-24-wild', 'data/wild/maps/Route24.asm', 'Route 24 grass encounters', 'Red/Blue ten-slot tables'),
        source('route-25-wild', 'data/wild/maps/Route25.asm', 'Route 25 grass encounters', 'Red/Blue ten-slot tables, including less-common opposite bug line'),
        source('cerulean-weights', 'data/wild/probabilities.asm', 'Exact slot weights', 'WildMonEncounterSlotChances; total 256'),
        source('cerulean-bill', 'scripts/BillsHouse.asm', 'Bill help and S.S. Ticket', 'BillPokemonText, BillExitsMachineScript and BillSSTicketText; ticket changes Cerulean guard objects'),
        source('cerulean-bill-pc', 'engine/events/hidden_events/bills_house_pc.asm', 'Bill’s PC interactions', 'Cell separator sequence; later list displays Eevee/Flareon/Jolteon/Vaporeon Pokédex entries'),
        source('cerulean-trade-house', 'scripts/CeruleanTradeHouse.asm', 'Town trade identity', 'GamblerText uses TRADE_FOR_LOLA'),
        source('cerulean-trade', 'data/events/trades.asm', 'Poliwhirl/Jynx exchange', 'TRADE_FOR_LOLA: give POLIWHIRL, receive JYNX named LOLA; international Red/Blue mapping'),
        source('cerulean-bike', 'scripts/BikeShop.asm', 'Voucher exchange', 'ClerkText checks BIKE_VOUCHER, gives BICYCLE, removes voucher; Bag-full retry'),
        source('cerulean-voucher', 'scripts/PokemonFanClub.asm', 'Voucher origin', 'ChairmanText gives BIKE_VOUCHER after listening to story in Vermilion'),
        source('cerulean-abra', 'data/pokemon/base_stats/abra.asm', 'Abra starts with Teleport', 'Only starting move TELEPORT'),
        source('cerulean-teleport', 'engine/battle/effects.asm', 'Teleport behavior', 'SwitchAndTeleportEffect; wild escape can fail, trainer battle fails'),
        { id: 'route-25-tm-access', title: 'Route 25 item access', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_25&oldid=4618423', locator: 'Generation I TM19 behind cuttable tree: move Jr. Trainer out of passage before fighting, or use Cut later. Secondary topology reference.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
    ],
    areas: [
        { id: 'cerulean-city', name: 'Inside Cerulean City', description: 'Heal, check the backyard item and town trade, and deal with the rival before going north. Grass encounters below belong to Routes 24/25, not the town.', sourceIds: ['cerulean-objects', 'cerulean-events', 'cerulean-hidden', 'route-24-wild', 'route-25-wild'] },
        { id: 'cerulean-gym', name: 'Cerulean Gym · Misty', description: 'Two ordinary trainers and Misty. You can challenge the gym before or after the northern detour; beating Misty does not give you HM01 Cut.', sourceIds: ['cerulean-gym-objects', 'cerulean-gym-events', 'cerulean-gym-text'] },
        { id: 'route-24', name: 'Nearby Route 24 · Nugget Bridge', description: 'North of town: five bridge trainers, a Rocket recruiter, one off-bridge trainer and grass. Heal after the rival if needed before starting the bridge.', sourceIds: ['cerulean-links', 'route-24-objects', 'cerulean-events', 'route-24-events', 'route-24-wild'] },
        { id: 'route-25', name: 'Nearby Route 25 · toward Bill', description: 'East of Route 24: trainer paths, a TM, two hidden items and different grass encounter levels. Bill lives at the far eastern end.', sourceIds: ['route-24-links', 'route-25-objects', 'cerulean-hidden', 'route-25-wild'] },
        { id: 'bills-house', name: 'Bill’s House · Route 25', description: 'Help Bill with the PC, then speak to him for the S.S. Ticket. This is a story activity, not a wild Pokémon or gift-starter encounter.', sourceIds: ['cerulean-bill', 'cerulean-bill-pc'] },
    ],
    directions: [
        { id: 'cerulean-arrive', text: 'Heal in Cerulean City. You may challenge Misty now or explore the northern routes first. Town activities and nearby-route encounters are separated below; no Cut or Surf is needed for the main northern detour.', sourceIds: ['cerulean-objects', 'cerulean-gym-events', 'route-24-objects', 'route-25-objects'] },
        { id: 'cerulean-rival-first', text: 'Before crossing Nugget Bridge, your rival challenges you at Cerulean’s north approach. Prepare for Pidgeotto level 18, Abra level 15, Rattata level 15 and his level-17 starter. His starter depends on YOUR original choice; preview the full party below.', sourceIds: ['cerulean-events', 'cerulean-parties'] },
        { id: 'cerulean-bridge', text: 'Continue north onto Route 24 and defeat the five bridge trainers. Keep a free Bag slot for the Nugget: the man at the north end gives it to you, then reveals himself as a Rocket and battles you. There is also an optional trainer west of the bridge.', sourceIds: ['route-24-objects', 'route-24-events', 'cerulean-parties'] },
        { id: 'cerulean-bill-detour', text: 'From Route 24, go east along Route 25 to Bill’s House. Speak to Bill in Pokémon form, let him enter the machine, use his PC to start the separation, then talk to him again for the S.S. Ticket. If your Bag is full, make space and ask again.', sourceIds: ['route-24-links', 'route-25-objects', 'cerulean-bill', 'cerulean-bill-pc'] },
        { id: 'cerulean-misty', text: 'Back in town, heal and challenge Misty if you have not already. For every gym battle, fight both ordinary trainers BEFORE beating her: victory disables their battles. Collect the Cascade Badge and TM11 BubbleBeam; speak to Misty again if the TM did not fit.', sourceIds: ['cerulean-gym-objects', 'cerulean-gym-events'] },
        { id: 'cerulean-leave-south', text: 'After receiving Bill’s S.S. Ticket, return to the robbed house in northeastern Cerulean. The guard has moved. Go through the house’s rear opening, defeat the Rocket and collect TM28 Dig. Continue south toward Route 5 and Vermilion; keep the ticket for the S.S. Anne.', sourceIds: ['cerulean-bill', 'cerulean-objects', 'cerulean-events', 'cerulean-links'] },
    ],
    items: [
        { id: 'misty-cascade-badge', areaId: 'cerulean-gym', name: 'Cascade Badge', quantity: 1, kind: 'reward', location: 'Received for defeating Misty.', requirements: 'Win the gym leader battle. The badge permits using Cut outside battle, but does not give you the HM.', sourceIds: ['cerulean-gym-events', 'cerulean-gym-text'] },
        { id: 'misty-tm11', areaId: 'cerulean-gym', name: 'TM11 BubbleBeam', quantity: 1, kind: 'reward', location: 'Misty after victory. If your Bag was full, make space and talk to her again.', requirements: 'Defeat Misty and have Bag space.', sourceIds: ['cerulean-gym-events'] },
        { id: 'misty-prize-money', areaId: 'cerulean-gym', name: 'Prize money (₽)', quantity: 2079, kind: 'reward', location: 'Received for defeating Misty.', requirements: 'Win the gym leader battle.', sourceIds: ['cerulean-parties', 'cerulean-prize-base', 'cerulean-trainer-engine'] },
        { id: 'cerulean-rare-candy', areaId: 'cerulean-city', name: 'Rare Candy', quantity: 1, kind: 'hidden', position: { x: 15, y: 8 }, location: 'Backyard of the northwestern badge-explanation house. Go through its rear door and inspect the town square at (15, 8).', requirements: hidden, sourceIds: ['cerulean-hidden', 'cerulean-hidden-use', 'cerulean-badge-house', 'cerulean-objects'] },
        { id: 'cerulean-tm28', areaId: 'cerulean-city', name: 'TM28 Dig', quantity: 1, kind: 'reward', location: 'From the Rocket behind the robbed house, at (30, 8). Talk again after making Bag space if necessary.', requirements: 'Receive Bill’s S.S. Ticket to move the house guard, then defeat the Rocket. Keep Bag space.', sourceIds: ['cerulean-objects', 'cerulean-bill', 'cerulean-events'] },
        { id: 'cerulean-bicycle', areaId: 'cerulean-city', name: 'Bicycle', quantity: 1, kind: 'exchange', location: 'Later return to the Bike Shop in southwestern town with the Bike Voucher.', requirements: 'First obtain the Bike Voucher from the Pokémon Fan Club chairman in Vermilion. Bring it back here with a free Bag slot; the voucher is exchanged, not purchased with cash.', sourceIds: ['cerulean-bike', 'cerulean-voucher'] },
        { id: 'route-24-nugget', areaId: 'route-24', name: 'Nugget', quantity: 1, kind: 'gift', location: 'North end of Nugget Bridge: talk to the recruiter after the five bridge trainers. The item is given BEFORE his battle.', requirements: 'Keep a free Bag slot; make space and try again if full.', sourceIds: ['route-24-events', 'route-24-objects'] },
        { id: 'route-24-tm45', areaId: 'route-24', name: 'TM45 Thunder Wave', quantity: 1, kind: 'visible', position: { x: 10, y: 5 }, location: 'Northern Route 24, item ball at (10, 5).', requirements: bag, sourceIds: ['route-24-objects'] },
        { id: 'route-25-tm19', areaId: 'route-25', name: 'TM19 Seismic Toss', quantity: 1, kind: 'visible', position: { x: 22, y: 2 }, location: 'Item ball at (22, 2), behind the narrow passage near the Jr. Trainer♂ at (24, 4).', requirements: 'Before his battle, approach from the south so he walks out of the passage. If he is already defeated while blocking it, return later with Cut. Keep Bag space.', sourceIds: ['route-25-objects', 'route-25-tm-access'] },
        { id: 'route-25-ether', areaId: 'route-25', name: 'Ether', quantity: 1, kind: 'hidden', position: { x: 38, y: 3 }, location: 'Eastern Route 25 near the last Lass, square (38, 3).', requirements: hidden, sourceIds: ['cerulean-hidden', 'cerulean-hidden-use', 'route-25-objects'] },
        { id: 'route-25-elixir', areaId: 'route-25', name: 'Elixir', quantity: 1, kind: 'hidden', position: { x: 10, y: 1 }, location: 'Northwestern Route 25, square (10, 1), northeast of the westernmost Hiker.', requirements: hidden, sourceIds: ['cerulean-hidden', 'cerulean-hidden-use', 'route-25-objects'] },
        { id: 'bill-ss-ticket', areaId: 'bills-house', name: 'S.S. Ticket', quantity: 1, kind: 'gift', location: 'Talk to Bill after using his PC to return him to human form.', requirements: 'Help Bill, then talk again with Bag space. Needed to board the S.S. Anne later; receiving it also moves the Cerulean house guard.', sourceIds: ['cerulean-bill', 'cerulean-bill-pc'] },
    ],
    encounters: (['red', 'blue'] as const).flatMap((version) => [encounters(version, 'route-24'), encounters(version, 'route-25')]),
    encountersNote: 'These grass tables belong to nearby Routes 24/25, not Cerulean town or its gym. The city and gym have separate fishing references below. Fractions are exact encounter-slot weights out of 256 after an encounter is generated, assuming a uniform random byte. Percentages are rounded, not chances per step or catch. The routes have different levels and slots; Red has Oddish, Blue has Bellsprout. The Jynx trade is separate too.',
    trainers: [
        { id: 'misty', name: 'Misty', role: 'leader', areaId: 'cerulean-gym', position: { x: 4, y: 2 }, party: [
            { id: 'slot-1', name: 'Staryu', dexId: 120, level: 18, moves: ['Tackle', 'Water Gun'] },
            { id: 'slot-2', name: 'Starmie', dexId: 121, level: 21, moves: ['Tackle', 'Water Gun', 'BubbleBeam'] },
        ], sourceIds: ['cerulean-gym-objects', 'cerulean-parties', 'cerulean-staryu', 'cerulean-starmie', 'cerulean-level-moves', 'cerulean-special-move', 'cerulean-trainer-engine'] },
        trainer('cerulean-jr-trainer', 'Jr. Trainer♀ · gym', 'cerulean-gym', 2, 3, [['Goldeen', 118, 19]], 'cerulean-gym-objects', 'Fight before defeating Misty; her victory disables this battle.', ['cerulean-gym-events']),
        trainer('cerulean-swimmer', 'Swimmer · gym', 'cerulean-gym', 8, 7, [['Horsea', 116, 16], ['Shellder', 90, 16]], 'cerulean-gym-objects', 'Fight before defeating Misty; her victory disables this battle.', ['cerulean-gym-events']),
        trainer('cerulean-rocket', 'Rocket · robbed house', 'cerulean-city', 30, 8, [['Machop', 66, 17], ['Drowzee', 96, 17]], 'cerulean-objects', 'After receiving Bill’s S.S. Ticket, go through the robbed house to reach him.', ['cerulean-bill']),
        trainer('bridge-1', 'Bridge 1 · Bug Catcher', 'route-24', 11, 31, [['Caterpie', 10, 14], ['Weedle', 13, 14]], 'route-24-objects'),
        trainer('bridge-2', 'Bridge 2 · Lass', 'route-24', 10, 28, [['Pidgey', 16, 14], ['Nidoran♀', 29, 14]], 'route-24-objects'),
        trainer('bridge-3', 'Bridge 3 · Youngster', 'route-24', 11, 25, [['Rattata', 19, 14], ['Ekans', 23, 14], ['Zubat', 41, 14]], 'route-24-objects'),
        trainer('bridge-4', 'Bridge 4 · Lass', 'route-24', 10, 22, [['Pidgey', 16, 16], ['Nidoran♀', 29, 16]], 'route-24-objects'),
        trainer('bridge-5', 'Bridge 5 · Jr. Trainer♂', 'route-24', 11, 19, [['Mankey', 56, 18]], 'route-24-objects'),
        trainer('bridge-recruiter', 'Rocket · Nugget recruiter', 'route-24', 11, 15, [['Ekans', 23, 15], ['Zubat', 41, 15]], 'route-24-objects', 'Receive the Nugget first; his battle follows. Do this before leaving Bill’s House after receiving the ticket.', ['route-24-events', 'route-25-events', 'cerulean-toggle-ids', 'cerulean-toggle-objects']),
        trainer('route-24-optional', 'Jr. Trainer♂ · west of bridge', 'route-24', 5, 20, [['Rattata', 19, 14], ['Ekans', 23, 14]], 'route-24-objects'),
        trainer('route-25-youngster-1', 'Youngster 1', 'route-25', 14, 2, [['Rattata', 19, 15], ['Spearow', 21, 15]], 'route-25-objects'),
        trainer('route-25-youngster-2', 'Youngster 2', 'route-25', 18, 5, [['Slowpoke', 79, 17]], 'route-25-objects'),
        trainer('route-25-jr-trainer', 'Jr. Trainer♂ · TM19 passage', 'route-25', 24, 4, [['Rattata', 19, 14], ['Ekans', 23, 14]], 'route-25-objects', 'If you want TM19 now, let him walk south out of the passage before battling.', ['route-25-tm-access']),
        trainer('route-25-lass-1', 'Lass 1', 'route-25', 18, 8, [['Nidoran♂', 32, 15], ['Nidoran♀', 29, 15]], 'route-25-objects'),
        trainer('route-25-youngster-3', 'Youngster 3', 'route-25', 32, 3, [['Ekans', 23, 14], ['Sandshrew', 27, 14]], 'route-25-objects'),
        trainer('route-25-lass-2', 'Lass 2', 'route-25', 37, 4, [['Oddish', 43, 13], ['Pidgey', 16, 13], ['Oddish', 43, 13]], 'route-25-objects'),
        trainer('route-25-hiker-1', 'Hiker 1 · west', 'route-25', 8, 4, [['Machop', 66, 15], ['Geodude', 74, 15]], 'route-25-objects'),
        trainer('route-25-hiker-2', 'Hiker 2 · south', 'route-25', 23, 9, [['Geodude', 74, 13], ['Geodude', 74, 13], ['Machop', 66, 13], ['Geodude', 74, 13]], 'route-25-objects'),
        trainer('route-25-hiker-3', 'Hiker 3', 'route-25', 13, 7, [['Onix', 95, 17]], 'route-25-objects'),
    ],
    starterBattles: [{
        id: 'cerulean-rival', name: 'Rival · before Nugget Bridge', areaId: 'cerulean-city',
        description: 'This battle happens at the north end of Cerulean City BEFORE Route 24’s five bridge trainers. His fourth Pokémon counters your original starter choice. Previewing a team here does not change your saved starter.',
        sourceIds: ['cerulean-events', 'cerulean-parties'],
        variants: [
            { playerStarterDexId: 1, party: party([['Pidgeotto', 17, 18], ['Abra', 63, 15], ['Rattata', 19, 15], ['Charmander', 4, 17]]) },
            { playerStarterDexId: 4, party: party([['Pidgeotto', 17, 18], ['Abra', 63, 15], ['Rattata', 19, 15], ['Squirtle', 7, 17]]) },
            { playerStarterDexId: 7, party: party([['Pidgeotto', 17, 18], ['Abra', 63, 15], ['Rattata', 19, 15], ['Bulbasaur', 1, 17]]) },
        ],
    }],
    pokemonTrades: [{ id: 'cerulean-jynx-trade', areaId: 'cerulean-city', give: { name: 'Poliwhirl', dexId: 61 }, receive: { name: 'Jynx', dexId: 124, nickname: 'LOLA' }, details: 'Later option: the man in the northwestern trade house wants your Poliwhirl for his Jynx, nicknamed LOLA. Bring a Poliwhirl; Jynx is not a wild encounter or a free gift here. This is the international Red/Blue trade.', sourceIds: ['cerulean-trade-house', 'cerulean-trade', 'cerulean-objects'] }],
    advice: [
        { id: 'misty-grass-help', text: 'Need another option for Misty? Route 24 and Route 25 have Oddish in Red or Bellsprout in Blue. Grass and Electric attacks are super effective against both Staryu and Starmie. Consider the actual moves your team knows, not just its types.', sourceIds: ['route-24-wild', 'route-25-wild', 'cerulean-matchups', 'cerulean-staryu', 'cerulean-starmie'] },
        { id: 'cerulean-abra-help', text: 'Wild Abra starts with Teleport and can escape, so throwing a Poké Ball immediately is one option—not a guaranteed catch. It evolves into Kadabra at level 16; Alakazam requires a trade, not more levels.', sourceIds: ['cerulean-abra', 'cerulean-teleport', 'cerulean-level-moves'] },
        { id: 'cerulean-bill-pokedex', text: 'Optional: after helping Bill, receiving the ticket and leaving his house, re-enter and check his PC. You can view Pokédex entries for Eevee, Flareon, Jolteon and Vaporeon. These are not Pokémon gifts or catches.', sourceIds: ['cerulean-bill', 'cerulean-bill-pc', 'route-25-events'] },
        { id: 'cerulean-coordinate-note', text: 'Pickup/trainer coordinates are movement squares east (x) and south (y) from the named map’s northwest corner. Route 24 coordinates are not town coordinates, and this reference does not show terrain or walkable paths.', sourceIds: ['cerulean-objects', 'route-24-objects', 'route-25-objects', 'cerulean-hidden'] },
    ],
    starterHints: [
        { id: 'misty-bulbasaur', starterDexId: 1, text: 'Bulbasaur learns Vine Whip at level 13. Grass attacks are super effective against both opponents, but still heal and prepare for Misty’s level-21 Starmie.', sourceIds: ['cerulean-level-moves', 'cerulean-parties', 'cerulean-matchups'] },
        { id: 'misty-charmander', starterDexId: 4, text: 'Fire attacks are resisted here. Catch Oddish in Red or Bellsprout in Blue on the northern routes, or use an Electric teammate if you already have one. There is no need to return through Mt. Moon for a new option.', sourceIds: ['cerulean-matchups', 'route-24-wild', 'route-25-wild'] },
        { id: 'misty-squirtle', starterDexId: 7, text: 'Water attacks deal reduced damage to Misty’s team; they are not completely ineffective. Consider your Normal attacks or a Grass/Electric teammate instead of relying only on Water.', sourceIds: ['cerulean-matchups', 'cerulean-staryu', 'cerulean-starmie'] },
    ],
    warnings: [
        { id: 'misty-missable-trainers', text: 'Completionists: fight both ordinary gym trainers before beating Misty. Her victory disables their battles even if you skipped them.', sourceIds: ['cerulean-gym-events'] },
        { id: 'route-25-tm-warning', text: 'Want TM19 without waiting for Cut? Before fighting the Jr. Trainer♂ on Route 25, let him walk south out of the narrow passage. If he remains in the way after his battle, plan a later Cut return.', sourceIds: ['route-25-objects', 'route-25-tm-access'] },
        { id: 'bridge-recruiter-warning', text: 'Finish the Nugget recruiter’s battle before leaving Bill’s House with the S.S. Ticket. The recruiter disappears after that story step.', sourceIds: ['route-24-events', 'route-25-events', 'cerulean-toggle-ids', 'cerulean-toggle-objects'] },
    ],
}
