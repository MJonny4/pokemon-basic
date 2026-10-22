import type { GuideLocation } from '../location-schema'

// Story-first pass: required transitions, key pickups, encounters and major
// battles. Ordinary trainer inventories/maps remain a separate completion pass.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
const releaseScope = 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.'
const limitations = ['Source-checked, not play-through verified. Main-story directions and listed pickups only; no exhaustive hidden-item or ordinary-trainer inventory, fishing audit or terrain map.', 'Boss/rival parties are listed without move-set or AI audits. Directions use landmarks rather than every individual tile.']
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-20', kind: 'game-disassembly' }
}
function navigation(id: string, part: number, oldid: number): GuideLocation['sources'][number] {
    return { id, title: `Red/Blue walkthrough, part ${part} — navigation cross-check`, locator: 'Floor/landmark sequence only; parties, encounter slots and item events use pinned game data.', url: `https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Red_and_Blue/Part_${part}&oldid=${oldid}`, versionIds: [...versions], checkedOn: '2026-10-20', kind: 'reference' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
const area = (id: string, name: string, description: string, ...sourceIds: string[]) => ({ id, name, description, sourceIds })
function item(id: string, name: string, areaId: string, kind: GuideLocation['items'][number]['kind'], location: string, requirements: string, ...sourceIds: string[]): GuideLocation['items'][number] {
    return { id, name, areaId, kind, quantity: 1, location, requirements, sourceIds }
}
const names: Record<number, string> = {
    2: 'Ivysaur', 5: 'Charmeleon', 8: 'Wartortle', 16: 'Pidgey', 17: 'Pidgeotto',
    19: 'Rattata', 21: 'Spearow', 23: 'Ekans', 27: 'Sandshrew', 37: 'Vulpix',
    41: 'Zubat', 43: 'Oddish', 45: 'Vileplume', 52: 'Meowth', 56: 'Mankey',
    58: 'Growlithe', 64: 'Kadabra', 66: 'Machop', 69: 'Bellsprout', 71: 'Victreebel',
    74: 'Geodude', 92: 'Gastly', 93: 'Haunter', 95: 'Onix', 100: 'Voltorb',
    102: 'Exeggcute', 104: 'Cubone', 111: 'Rhyhorn', 114: 'Tangela',
    115: 'Kangaskhan', 130: 'Gyarados',
}
type Slot = readonly [dexId: number, level: number]
const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
function encounters(areaId: string, versionId: 'red' | 'blue', method: 'grass' | 'cave', slots: Slot[]): GuideLocation['encounters'][number] {
    return { areaId, versionId, method, denominator: 256, sourceIds: [`${areaId}-wild`, 'weights'],
        slots: slots.map(([dexId, level], index) => ({ id: `${areaId}-${versionId}-${index + 1}`, dexId, level, name: names[dexId], weight: weights[index] })) }
}
function party(slots: Slot[]): GuideLocation['trainers'][number]['party'] {
    return slots.map(([dexId, level], index) => ({ id: `slot-${index + 1}`, dexId, level, name: names[dexId], moves: [] }))
}
const weightSource = source('weights', 'data/wild/probabilities.asm', 'Ten encounter-slot weights, total 256; not per-step encounter chances.')
const fieldSource = source('field-moves', 'engine/menus/start_sub_menus.asm', 'Cut requires Cascade Badge; Flash Boulder Badge; Strength Rainbow Badge.')
const typeSource = source('matchups', 'data/types/type_matchups.asm', 'Gen I type effectiveness; account for both defending types.')

export const ROCK_TUNNEL_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-rock-tunnel', guideId: 'red-blue', stopId: 'rock-tunnel-lavender',
    versionIds: [...versions], title: 'Routes 9/10, Rock Tunnel & Lavender',
    releaseScope, limitations, coverage: 'Main-story approach and four-ladder crossing; Route 9 TM30; separate route/floor encounters; first Lavender visit.',
    sources: [
        source('cerulean-links', 'data/maps/headers/CeruleanCity.asm', 'East connection to Route 9.'),
        source('route-9-links', 'data/maps/headers/Route9.asm', 'West Cerulean, east Route 10.'),
        source('route-10-objects', 'data/maps/objects/Route10.asm', 'Northern Center (11,19), north cave entrance (8,17), south exit (8,53), Power Plant (6,39).'),
        source('lavender-links', 'data/maps/headers/LavenderTown.asm', 'North Route 10, west Route 8, south Route 12.'),
        source('route-9-items', 'data/maps/objects/Route9.asm', 'TM_TELEPORT at (10,15).'),
        source('rock-1f', 'data/maps/objects/RockTunnel1F.asm', 'Entrance/exit and four ladder links; no item-ball objects.'),
        source('rock-b1f', 'data/maps/objects/RockTunnelB1F.asm', 'Four return ladders, paired to 1F warps 5–8.'),
        source('flash-gift', 'scripts/Route2Gate.asm', 'Oak aide: ten obtained species and HM_FLASH.'),
        source('scope', 'engine/battle/common_text.asm', 'Silph Scope check for Tower ghosts.'),
        ...(['Route9', 'Route10', 'RockTunnel1F', 'RockTunnelB1F'] as const).map((file, index) => source(`${['route-9', 'route-10', 'rock-1f', 'rock-b1f'][index]}-wild`, `data/wild/maps/${file}.asm`, 'All ten grass/cave slots; version branches where present.')),
        navigation('rock-navigation', 8, 4423436), fieldSource, weightSource,
    ],
    areas: [
        area('route-9', 'Route 9', 'The eastward approach from Cerulean; Cut opens access.', 'cerulean-links', 'route-9-links', 'field-moves'),
        area('route-10', 'Route 10 · northern approach', 'Grass and a Pokémon Center outside the north cave entrance. The southern stretch is reached after crossing the cave.', 'route-10-objects'),
        area('rock-1f', 'Rock Tunnel · 1F', 'You visit three separated sections of this floor during the crossing.', 'rock-1f'),
        area('rock-b1f', 'Rock Tunnel · B1F', 'Two underground sections connect the upper-floor passages.', 'rock-b1f'),
        area('lavender', 'Lavender Town', 'Heal here, then continue west for the Silph Scope before finishing the Tower.', 'lavender-links', 'scope'),
    ],
    directions: [
        note('prepare-cut-flash', 'Return to Cerulean with a Pokémon that knows Cut and the Cascade Badge. Flash is strongly recommended for the dark cave: Oak’s aide in eastern Route 2 gives HM05 after you have obtained 10 different species. Teach it to a compatible Pokémon; the Boulder Badge allows its field use. See Vermilion’s optional Diglett’s Cave detour for that return trip.', 'field-moves', 'flash-gift', 'rock-navigation'),
        note('cross-route-9', 'Leave Cerulean to the east, cut the small tree and follow Route 9 east. At Route 10, turn south toward the Pokémon Center beside Rock Tunnel’s northern entrance. Heal before entering.', 'cerulean-links', 'route-9-links', 'route-10-objects'),
        note('rock-first-ladder', 'Inside, use Flash from the Pokémon menu. On 1F, follow the passage toward the north-east ladder and descend to B1F. The cave crossing alternates 1F → B1F → 1F → B1F → 1F.', 'field-moves', 'rock-1f', 'rock-b1f', 'rock-navigation'),
        note('rock-second-ladder', 'B1F, first visit: you arrive in the south-east. Follow the corridor west and then around toward the north-east; take the upper ladder back to 1F. You emerge in the western part of 1F.', 'rock-1f', 'rock-b1f', 'rock-navigation'),
        note('rock-third-ladder', '1F, second visit: work south-east through the Hikers’ passages, then bend north-east to the next ladder. Descend to the other section of B1F.', 'rock-1f', 'rock-b1f', 'rock-navigation'),
        note('rock-fourth-ladder', 'B1F, second visit: follow the passage south-west, then north-west to the final ladder. Back on 1F, head south and work west toward the bottom exit.', 'rock-1f', 'rock-b1f', 'rock-navigation'),
        note('reach-lavender', 'The exit puts you on southern Route 10. Continue south to Lavender Town and heal. You can visit Pokémon Tower now, but the normal story route finishes it after getting the Silph Scope in Celadon. Continue with the Celadon City stop for the Route 8/7 connection.', 'route-10-objects', 'lavender-links', 'scope'),
    ],
    items: [item('route-9-teleport', 'TM30 Teleport', 'route-9', 'visible', 'Route 9: item ball in the south-western section, at map square (10,15).', 'Optional pickup on the approach; keep Bag space.', 'route-9-items')],
    encounters: versions.flatMap((version) => {
        const exclusive = version === 'red' ? 23 : 27
        return [
            encounters('route-9', version, 'grass', [[19,16],[21,16],[19,14],[exclusive,11],[21,13],[exclusive,15],[19,17],[21,17],[exclusive,13],[exclusive,17]]),
            encounters('route-10', version, 'grass', [[100,16],[21,16],[100,14],[exclusive,11],[21,13],[exclusive,15],[100,17],[21,17],[exclusive,13],[exclusive,17]]),
            encounters('rock-1f', version, 'cave', [[41,16],[41,17],[74,17],[66,15],[74,16],[41,18],[41,15],[66,17],[95,13],[95,15]]),
            encounters('rock-b1f', version, 'cave', [[41,16],[41,17],[74,17],[66,15],[74,16],[41,18],[66,17],[95,17],[95,13],[74,18]]),
        ]
    }),
    encountersNote: 'Choose the actual route or cave floor. Route 9/10 have Ekans in Red and Sandshrew in Blue; the cave tables are shared. Weights describe generated encounters, not catches or steps. These are grass/cave encounters, not Lavender town-local Pokémon or fishing.',
    trainers: [], advice: [],
    warnings: [note('flash-preparation', 'Flash makes the cave readable but does not unlock its exit. Get it before this trip if you want a lit route; the gift is on Route 2, not inside Rock Tunnel.', 'flash-gift', 'field-moves', 'rock-navigation')],
}

export const CELADON_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-celadon-story', guideId: 'red-blue', stopId: 'celadon-city',
    versionIds: [...versions], title: 'Celadon approach & Rocket Hideout',
    releaseScope, limitations, coverage: 'Route 8/7 connection, supplies, Lift Key/Silph Scope sequence, Giovanni party and nearby grass.',
    sources: [
        source('route-8-links', 'data/maps/headers/Route8.asm', 'Lavender to Saffron approach.'),
        source('underground', 'data/maps/objects/UndergroundPathWestEast.asm', 'West Route 7 building, east Route 8 building.'),
        source('route-7-links', 'data/maps/headers/Route7.asm', 'West connection to Celadon.'),
        source('corner', 'scripts/GameCorner.asm', 'Rocket battle and poster switch reveal hideout stairs.'),
        source('hideout-b1', 'data/maps/objects/RocketHideoutB1F.asm', 'B2F southern stairs lead to the B1F lift-side area.'),
        source('hideout-b2', 'data/maps/objects/RocketHideoutB2F.asm', 'Stairs to B1F/B3F; lift connection.'),
        source('hideout-b3', 'data/maps/objects/RocketHideoutB3F.asm', 'Stairs from B2F and down to B4F west section.'),
        source('hideout-b4-objects', 'data/maps/objects/RocketHideoutB4F.asm', 'Lift Key (10,2), Silph Scope (25,2), Giovanni party 1.'),
        source('hideout-b4-events', 'scripts/RocketHideoutB4F.asm', 'Rocket3AfterBattleText reveals Lift Key; two door guards; Giovanni reveals Scope pickup.'),
        source('lift', 'scripts/RocketHideoutElevator.asm', 'Lift Key check before floor selection.'),
        source('parties', 'data/trainers/parties.asm', 'GiovanniData first party: Onix 25, Rhyhorn 24, Kangaskhan 29.'),
        source('drinks', 'scripts/CeladonMartRoof.asm', 'Vending-machine drink choices.'),
        source('guard-drinks', 'data/items/guard_drink_items.asm', 'Fresh Water, Soda Pop and Lemonade; no Tea in Red/Blue.'),
        source('eevee', 'scripts/CeladonMansionRoofHouse.asm', 'Eevee gift, level 25.'),
        source('route-7-wild', 'data/wild/maps/Route7.asm', 'Ten slots for each version.'),
        source('route-8-wild', 'data/wild/maps/Route8.asm', 'Ten slots for each version.'),
        navigation('hideout-navigation', 9, 4608030), weightSource, typeSource,
    ],
    areas: [
        area('route-8', 'Route 8 · west of Lavender', 'Take the Underground Path to bypass Saffron’s guarded entrances.', 'route-8-links', 'underground'),
        area('route-7', 'Route 7 · east of Celadon', 'The other end of the east–west Underground Path.', 'underground', 'route-7-links'),
        area('celadon', 'Celadon City', 'Department Store, Game Corner, Mansion and gym.', 'corner', 'drinks', 'eevee'),
        area('hideout', 'Rocket Hideout · B1F–B4F', 'Stairs first reach the western B4F rooms. The lift reaches Giovanni’s separate room.', 'hideout-b2', 'hideout-b3', 'hideout-b4-objects'),
    ],
    directions: [
        note('reach-celadon', 'From Lavender, take Route 8 west. Use the small Underground Path entrance on Route 8 rather than Saffron’s guarded gate. Cross the east–west tunnel, emerge on Route 7, then continue west into Celadon.', 'route-8-links', 'underground', 'route-7-links'),
        note('celadon-supplies', 'Heal and restock before the hideout. Buy one spare Fresh Water, Soda Pop or Lemonade from the Department Store roof and keep it for Saffron’s thirsty guards later. Red/Blue use these drinks, not Tea.', 'drinks', 'guard-drinks'),
        note('open-hideout', 'In the Game Corner, defeat the Rocket standing in front of the back-wall poster. Inspect the poster and press its switch to reveal the hideout stairs. A Coin Case or casino coins are not needed to enter.', 'corner'),
        note('reach-lift-key', 'Descend from B1F to B2F, then use the north-eastern stairs to B3F. On B3F, cross the arrow-tile maze toward the southern stairs to B4F. This first B4F entrance reaches only the western rooms.', 'hideout-b2', 'hideout-b3', 'hideout-b4-objects', 'hideout-navigation'),
        note('talk-again', 'In B4F’s north-west room, beat the Rocket, then speak to him AGAIN. He drops the Lift Key as an item ball beside him; pick it up. Winning the battle alone does not put the key in your Bag.', 'hideout-b4-events', 'hideout-b4-objects'),
        note('take-lift', 'Return to B2F. Cross the large spinner maze to its southern exit, then use the stairs on its east side to reach the lift-side area of B1F. Enter the lift and choose B4F. The Lift Key is checked automatically.', 'hideout-b1', 'hideout-b2', 'hideout-b3', 'hideout-b4-objects', 'lift', 'hideout-navigation'),
        note('giovanni-scope', 'Defeat both Rockets guarding the door, then face Giovanni. After he leaves, pick up the Silph Scope item ball behind his former position. Keep it in your Bag for Pokémon Tower; it is not automatically awarded after the battle.', 'hideout-b4-events', 'hideout-b4-objects', 'parties'),
        note('celadon-next', 'You can challenge Erika while you are in Celadon, then return to Lavender for Pokémon Tower. Optional: the Mansion’s rear entrance leads to the rooftop room with a level-25 Eevee gift.', 'eevee', 'hideout-navigation'),
    ],
    items: [
        item('lift-key', 'Lift Key', 'hideout', 'visible', 'B4F north-west: item ball beside the Rocket after you speak to him following his defeat.', 'Reach B4F by the B3F stairs first; leave room in the Bag.', 'hideout-b4-events', 'hideout-b4-objects'),
        item('silph-scope', 'Silph Scope', 'hideout', 'visible', 'B4F: item ball behind Giovanni’s position after his defeat.', 'Use the lift, beat both door guards, defeat Giovanni and pick it up yourself.', 'hideout-b4-events', 'hideout-b4-objects'),
    ],
    encounters: versions.flatMap((version) => {
        const red = version === 'red'
        const common = red ? 56 : 52
        const grass = red ? 43 : 69
        const fire = red ? 58 : 37
        const exclusive = red ? 23 : 27
        return [
            encounters('route-8', version, 'grass', [[16,18],[common,18],[exclusive,17],[fire,16],[16,20],[common,20],[exclusive,19],[fire,17],[fire,15],[fire,18]]),
            encounters('route-7', version, 'grass', [[16,19],[grass,19],[common,17],[grass,22],[16,22],[common,18],[fire,18],[fire,20],[common,19],[common,20]]),
        ]
    }),
    encountersNote: 'These Pokémon are in the grass on Routes 8 and 7, not in Celadon’s streets or the Rocket Hideout. Select your version for the different species. Fishing and the separate Eevee gift are not grass encounters.',
    trainers: [{ id: 'hideout-giovanni', name: 'Giovanni · Rocket Hideout', role: 'boss', areaId: 'hideout', party: party([[95,25],[111,24],[115,29]]), sourceIds: ['parties', 'hideout-b4-objects'] }],
    advice: [note('giovanni-preparation', 'Water or Grass attacks are 4× effective against Onix and Rhyhorn. Kangaskhan is Normal, so those same attacks are neutral against it; prepare for a different matchup in the last slot.', 'parties', 'matchups')],
    warnings: [note('key-check', 'Before leaving the hideout, check that the Silph Scope is actually in your Bag. If your Bag is full, make room and collect the item ball.', 'hideout-b4-events', 'hideout-b4-objects')],
}

export const ERIKA_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-erika-story', guideId: 'red-blue', stopId: 'gym-4-celadon',
    versionIds: [...versions], title: 'Celadon Gym — Erika',
    releaseScope, limitations, coverage: 'Gym access, Erika party, practical type advice, badge/TM and missable-trainer warning.',
    sources: [
        source('erika-events', 'scripts/CeladonGym.asm', 'TM21 with Bag-full retry; Rainbow Badge; all seven ordinary trainer flags set on victory.'),
        source('erika-text', 'text/CeladonGym.asm', 'Rainbow Badge obedience to level 50 and Strength permission.'),
        source('parties', 'data/trainers/parties.asm', 'ErikaData: Victreebel 29, Tangela 24, Vileplume 29.'),
        source('victreebel', 'data/pokemon/base_stats/victreebel.asm', 'Grass/Poison.'),
        source('tangela', 'data/pokemon/base_stats/tangela.asm', 'Pure Grass.'),
        source('vileplume', 'data/pokemon/base_stats/vileplume.asm', 'Grass/Poison.'),
        navigation('gym-navigation', 9, 4608030), fieldSource, typeSource,
    ],
    directions: [
        note('erika-access', 'Heal in Celadon, bring a Pokémon that knows Cut, and cut the small tree on the way to the gym in the city’s south-west. The Cascade Badge enables Cut.', 'gym-navigation', 'field-moves'),
        note('erika-battles', 'Battle any ordinary gym trainers you want before Erika. Her team is Victreebel Lv. 29, Tangela Lv. 24 and Vileplume Lv. 29. Fire or Flying attacks are useful across all three.', 'parties', 'erika-events', 'matchups', 'victreebel', 'tangela', 'vileplume'),
        note('erika-rewards', 'Defeat Erika for the Rainbow Badge and TM21 Mega Drain. If your Bag is full, make room and speak to her again for the TM. The Rainbow Badge enables field Strength once you obtain HM04 later; it also raises the obedience limit for traded Pokémon to level 50.', 'erika-events', 'erika-text', 'field-moves'),
        note('erika-next', 'If you have not collected the Silph Scope yet, finish the Rocket Hideout. Then return east through Route 7, the Underground Path and Route 8 to Lavender’s Pokémon Tower.', 'gym-navigation'),
    ],
    items: [
        { id: 'rainbow-badge', name: 'Rainbow Badge', quantity: 1, kind: 'reward', location: 'Erika in Celadon Gym.', requirements: 'Defeat Erika; field Strength still needs HM04 and a compatible Pokémon.', sourceIds: ['erika-events', 'field-moves'] },
        { id: 'mega-drain', name: 'TM21 Mega Drain', quantity: 1, kind: 'reward', location: 'Erika after winning the badge battle.', requirements: 'Leave Bag space, or speak to Erika again after making room.', sourceIds: ['erika-events'] },
    ],
    encounters: [], encountersNote: 'There are no wild encounters inside the gym. Nearby Route 7/8 grass appears under the Celadon City stop.',
    trainers: [{ id: 'erika', name: 'Erika', role: 'leader', party: party([[71,29],[114,24],[45,29]]), sourceIds: ['parties'] }],
    advice: [
        note('erika-matchups', 'Grass attacks are resisted: ¼ damage against Victreebel/Vileplume and ½ against Tangela. Fire, Flying and Ice attacks are super effective against all three. Psychic attacks are super effective against the two Poison-containing Pokémon, but neutral against Tangela.', 'matchups', 'victreebel', 'tangela', 'vileplume'),
    ],
    warnings: [note('erika-missable', 'If you want every gym trainer battle, finish them before beating Erika. Her defeat disables the seven ordinary trainers, including any you skipped.', 'erika-events')],
}

const towerSlots: Record<number, Slot[]> = {
    3: [[92,20],[92,21],[92,22],[92,23],[92,19],[92,18],[92,24],[104,20],[104,22],[93,25]],
    4: [[92,20],[92,21],[92,22],[92,23],[92,19],[92,18],[93,25],[104,20],[104,22],[92,24]],
    5: [[92,20],[92,21],[92,22],[92,23],[92,19],[92,18],[93,25],[104,20],[104,22],[92,24]],
    6: [[92,21],[92,22],[92,23],[92,24],[92,20],[92,19],[93,26],[104,22],[104,24],[93,28]],
    7: [[92,21],[92,22],[92,23],[92,24],[92,20],[93,28],[104,22],[104,24],[93,28],[93,30]],
}
export const POKEMON_TOWER_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-tower-story', guideId: 'red-blue', stopId: 'lavender-tower',
    versionIds: [...versions], title: 'Pokémon Tower & the Poké Flute',
    releaseScope, limitations, coverage: 'Tower return, all three rival parties, five floor-specific encounter tables, purified zone, Marowak event, Fuji rescue and Flute.',
    sources: [
        source('tower-rival', 'scripts/PokemonTower2F.asm', 'Starter-dependent rival party selection; battle flag prevents repeats.'),
        source('parties', 'data/trainers/parties.asm', 'Rival2Data parties 4–6: full five-member Tower teams.'),
        source('tower-heal', 'scripts/PokemonTower5F.asm', 'Four purified-zone tiles call HealParty.'),
        source('marowak', 'scripts/PokemonTower6F.asm', 'Level-30 RESTLESS_SOUL; defeat flag opens the staircase.'),
        source('scope', 'engine/battle/common_text.asm', 'Silph Scope in Bag identifies ghosts.'),
        source('uncatchable', 'engine/items/item_effects.asm', 'Tower 6F RESTLESS_SOUL bypasses capture calculation.'),
        source('tower-fuji', 'scripts/PokemonTower7F.asm', 'Three Rocket battles and Fuji warp to his house.'),
        source('flute', 'scripts/MrFujisHouse.asm', 'Speak to Fuji in his house for POKE_FLUTE; Bag-full retry.'),
        source('snorlax-12', 'scripts/Route12.asm', 'Level-30 Snorlax encounter and persistent removal.'),
        source('snorlax-16', 'scripts/Route16.asm', 'Level-30 Snorlax encounter and persistent removal.'),
        ...[3,4,5,6,7].map((floor) => source(`tower-${floor}f-wild`, `data/wild/maps/PokemonTower${floor}F.asm`, 'Ten floor-specific slots, same in Red and Blue.')),
        source('ghost-types', 'data/pokemon/base_stats/gastly.asm', 'Gastly is Ghost/Poison.'),
        source('haunter-types', 'data/pokemon/base_stats/haunter.asm', 'Haunter is Ghost/Poison.'),
        source('saffron-drinks', 'engine/events/saffron_guards.asm', 'A drink from the accepted list opens Saffron gates.'),
        weightSource, typeSource,
    ],
    areas: [
        area('tower-2f', 'Pokémon Tower · 2F', 'Your rival waits here if you have not already beaten him on an earlier visit.', 'tower-rival'),
        ...[3,4,5,6,7].map((floor) => area(`tower-${floor}f`, `Pokémon Tower · ${floor}F`, floor === 5 ? 'The purified zone heals your party.' : floor === 6 ? 'Marowak’s special event blocks the stairs; it is separate from the wild encounter table.' : floor === 7 ? 'Three Rockets stand between you and Mr. Fuji.' : 'Wild encounters and Channelers on the climb.', `tower-${floor}f-wild`, ...(floor === 5 ? ['tower-heal'] : floor === 6 ? ['marowak'] : floor === 7 ? ['tower-fuji'] : []))),
        area('fuji-house', 'Lavender · Mr. Fuji’s house', 'Receive the Poké Flute here after returning with Mr. Fuji.', 'flute'),
    ],
    directions: [
        note('tower-return', 'Return to Lavender with the Silph Scope in your Bag. It works automatically in Pokémon Tower; there is no equip action. Heal before climbing.', 'scope'),
        note('tower-rival-battle', 'On 2F, prepare for your rival if you have not already defeated him here. The preview below changes with your chosen starter; his whole party varies, not just the final Pokémon.', 'tower-rival', 'parties'),
        note('tower-climb', 'Continue upstairs through the Channelers and wild encounters. On 5F, step into the purified square in the central area to heal your party before the upper floors.', 'tower-heal', 'tower-3f-wild', 'tower-4f-wild', 'tower-5f-wild'),
        note('tower-marowak', 'At the stairs from 6F to 7F, the Silph Scope reveals the level-30 Marowak ghost. Defeat it to put it to rest. This special Marowak cannot be caught; do not spend Poké Balls on it.', 'scope', 'marowak', 'uncatchable'),
        note('tower-rescue', 'On 7F, defeat the three Rockets and speak to Mr. Fuji at the far end. You return together to his house in Lavender.', 'tower-fuji'),
        note('tower-flute', 'Inside his house, speak to Mr. Fuji again to receive the Poké Flute. If your Bag is full, make room and talk again. Check that you have the flute before leaving town.', 'flute'),
        note('tower-onward', 'The flute wakes the Snorlax blocking Route 12 south of Lavender or Route 16 west of Celadon. Save before waking one if you want to catch it. You can continue with Saffron next using a Celadon rooftop drink, or clear a Snorlax route toward Fuchsia.', 'snorlax-12', 'snorlax-16', 'saffron-drinks'),
    ],
    items: [item('poke-flute', 'Poké Flute', 'fuji-house', 'gift', 'Speak to Mr. Fuji in his Lavender house after rescuing him.', 'Collect it after the return from 7F; keep Bag space and retry if full.', 'flute', 'tower-fuji')],
    encounters: [3,4,5,6,7].flatMap((floor) => versions.map((version) => encounters(`tower-${floor}f`, version, 'cave', towerSlots[floor]))),
    encountersNote: 'The Silph Scope identifies these normal wild encounters. Each floor has its own levels/weights; these are not Lavender street encounters. The uncatchable staircase Marowak is a separate story event, not an entry in these tables.',
    trainers: [],
    starterBattles: [{
        id: 'tower-rival', name: 'Rival · Pokémon Tower 2F', areaId: 'tower-2f',
        description: 'Only if you have not already won this Tower battle. Previewing another starter does not replace your saved choice.',
        sourceIds: ['tower-rival', 'parties'],
        variants: [
            { playerStarterDexId: 1, party: party([[17,25],[102,23],[130,22],[64,20],[5,25]]) },
            { playerStarterDexId: 4, party: party([[17,25],[58,23],[102,22],[64,20],[8,25]]) },
            { playerStarterDexId: 7, party: party([[17,25],[130,23],[58,22],[64,20],[2,25]]) },
        ],
    }],
    advice: [note('tower-matchups', 'Normal and Fighting attacks cannot damage Gastly or Haunter. Psychic attacks are super effective against their Poison typing. In Gen I there are no abilities granting them Ground immunity.', 'matchups', 'ghost-types', 'haunter-types')],
    warnings: [note('tower-snorlax', 'The two road-blocking Snorlax are limited encounters. Save before waking one and bring Poké Balls if you want it; do not assume a defeated or fled-from Snorlax will be waiting there again.', 'snorlax-12', 'snorlax-16')],
}

export const RED_BLUE_MIDGAME_LOCATIONS = [ROCK_TUNNEL_LOCATION, CELADON_STORY_LOCATION, ERIKA_STORY_LOCATION, POKEMON_TOWER_STORY_LOCATION]
