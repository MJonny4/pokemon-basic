import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}
const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
type Species = readonly [name: string, dexId: number, level: number]
const route3: Species[] = [['Pidgey', 16, 6], ['Spearow', 21, 5], ['Pidgey', 16, 7], ['Spearow', 21, 6], ['Spearow', 21, 7], ['Pidgey', 16, 8], ['Spearow', 21, 8], ['Jigglypuff', 39, 3], ['Jigglypuff', 39, 5], ['Jigglypuff', 39, 7]]
const floor1: Species[] = [['Zubat', 41, 8], ['Zubat', 41, 7], ['Zubat', 41, 9], ['Geodude', 74, 8], ['Zubat', 41, 6], ['Zubat', 41, 10], ['Geodude', 74, 10], ['Paras', 46, 8], ['Zubat', 41, 11], ['Clefairy', 35, 8]]
const basement1: Species[] = [['Zubat', 41, 8], ['Zubat', 41, 7], ['Geodude', 74, 7], ['Geodude', 74, 8], ['Zubat', 41, 9], ['Paras', 46, 10], ['Zubat', 41, 10], ['Zubat', 41, 11], ['Clefairy', 35, 9], ['Geodude', 74, 9]]
const basement2: Species[] = [['Zubat', 41, 9], ['Geodude', 74, 9], ['Zubat', 41, 10], ['Geodude', 74, 10], ['Zubat', 41, 11], ['Paras', 46, 10], ['Paras', 46, 12], ['Clefairy', 35, 10], ['Zubat', 41, 12], ['Clefairy', 35, 12]]
function encounters(versionId: 'red' | 'blue', areaId: string, method: 'grass' | 'cave', species: Species[], sourceId: string): GuideLocation['encounters'][number] {
    return { versionId, areaId, method, denominator: 256, sourceIds: [sourceId, 'moon-encounter-weights'], slots: species.map(([name, dexId, level], i) => ({ id: `${areaId}-${versionId}-slot-${i}`, name, dexId, level, weight: weights[i] })) }
}
function route4(version: 'red' | 'blue'): Species[] {
    const exclusive = version === 'red' ? ['Ekans', 23] as const : ['Sandshrew', 27] as const
    return [['Rattata', 19, 10], ['Spearow', 21, 10], ['Rattata', 19, 8], [...exclusive, 6], ['Spearow', 21, 8], [...exclusive, 10], ['Rattata', 19, 12], ['Spearow', 21, 12], [...exclusive, 8], [...exclusive, 12]]
}
function trainer(id: string, name: string, areaId: string, x: number, y: number, species: Species[], objectSource: string, requirements?: string): GuideLocation['trainers'][number] {
    return { id, name, areaId, role: 'trainer', position: { x, y }, requirements, sourceIds: [objectSource, 'moon-trainer-parties', ...(requirements ? ['route-4-topology'] : [])], party: species.map(([name, dexId, level], i) => ({ id: `slot-${i + 1}`, name, dexId, level, moves: [] })) }
}
const bag = 'No field move required; keep room in your Bag.'
const hidden = 'Face this square from an adjacent square and press A. No Itemfinder required; keep Bag space.'

/** One existing progress stop, distinct map-local areas. Never flatten the floors. */
export const ROUTE_3_MT_MOON_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-route-3-mt-moon', guideId: 'red-blue', stopId: 'route-3-mt-moon',
    versionIds: ['red', 'blue'], title: 'Route 3 & Mt. Moon',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Route 3, Route 4 west Pokémon Center, Mt. Moon 1F/B1F/B2F and Route 4 east: all source-listed ground items, the mutually exclusive fossils, five area encounter tables per version, 21 trainer parties and the optional Magikarp purchase. Route 4 fishing has its own return-visit reference.',
    limitations: ['Source-checked, not play-through verified. Navigation is a landmark/ladder overview, not a terrain map or turn-by-turn route.', 'Trainer moves, ordinary battle prize money, shops and non-battling NPC dialogue are not exhaustively audited. Coordinates are local to the named map, not shared between areas.'],
    sources: [
        source('route-3-links', 'data/maps/headers/Route3.asm', 'Route 3 connections', 'West: Pewter City; north: Route 4'),
        source('route-4-links', 'data/maps/headers/Route4.asm', 'Route 4 connections', 'South: Route 3; east: Cerulean City'),
        source('route-3-objects', 'data/maps/objects/Route3.asm', 'Route 3 trainers', 'Eight battle objects with party indices; no item-ball events'),
        source('route-4-objects', 'data/maps/objects/Route4.asm', 'Route 4 entrances, item and trainer', 'Center/1F/B1F warps; TM_WHIRLWIND (57,3); Lass party 4 (63,3)'),
        source('moon-1f-objects', 'data/maps/objects/MtMoon1F.asm', 'Mt. Moon 1F items, ladders and trainers', 'Six item balls, seven battle objects; northwest ladder (5,5), side ladders (17,11)/(25,15)'),
        source('moon-b1f-objects', 'data/maps/objects/MtMoonB1F.asm', 'Mt. Moon B1F connections', 'Eight ladder/exit warps; no object events'),
        source('moon-b2f-objects', 'data/maps/objects/MtMoonB2F.asm', 'Mt. Moon B2F items and trainers', 'HP_UP (25,21), TM_MEGA_PUNCH (29,5), fossil objects and five battle objects'),
        source('moon-hidden', 'data/events/hidden_events.asm', 'Hidden items', 'MT_MOON_B2F: Moon Stone (18,12), Ether (33,9); ROUTE_4: Great Ball (40,3)'),
        source('moon-hidden-use', 'engine/overworld/hidden_events.asm', 'Hidden interaction', 'CheckIfCoordsInFrontOfPlayerMatch'),
        source('moon-route-3-wild', 'data/wild/maps/Route3.asm', 'Route 3 encounters', 'Route3WildMons: ten shared Red/Blue slots'),
        source('moon-route-4-wild', 'data/wild/maps/Route4.asm', 'Route 4 encounters', 'Route4WildMons: Red Ekans / Blue Sandshrew branches'),
        source('moon-1f-wild', 'data/wild/maps/MtMoon1F.asm', 'Mt. Moon 1F encounters', 'MtMoon1FWildMons'),
        source('moon-b1f-wild', 'data/wild/maps/MtMoonB1F.asm', 'Mt. Moon B1F encounters', 'MtMoonB1FWildMons'),
        source('moon-b2f-wild', 'data/wild/maps/MtMoonB2F.asm', 'Mt. Moon B2F encounters', 'MtMoonB2FWildMons'),
        source('moon-encounter-weights', 'data/wild/probabilities.asm', 'Exact slot weights', 'WildMonEncounterSlotChances: weights total 256'),
        source('moon-trainer-parties', 'data/trainers/parties.asm', 'Trainer parties', 'Youngster 1–3; Bug Catcher 4–8; Lass 1–6; Super Nerd 1–2; Hiker 1; Rocket 1–4'),
        source('moon-fossil-choice', 'scripts/MtMoonB2F.asm', 'Mutually exclusive fossil choice', 'Defeat Super Nerd; GiveItem/HideObject and EVENT_GOT_DOME_FOSSIL / EVENT_GOT_HELIX_FOSSIL'),
        source('moon-fossil-revival', 'engine/events/cinnabar_lab.asm', 'Fossil species mapping', 'GiveFossilToCinnabarLab .choseDomeFossil / .choseHelixFossil'),
        source('moon-magikarp', 'scripts/MtMoonPokecenter.asm', 'Optional Magikarp purchase', 'MtMoonPokecenterMagikarpSalesmanText: level 5, BCD 500 price, once-only event'),
        { id: 'route-4-topology', title: 'Route 4 ledges and later access', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Kanto_Route_4&oldid=4618036', locator: 'Generation I route description and trainer table: one-way ledges; highest-hill Lass requires Surf via Route 24. Secondary topology reference, not source for encounter quantities.', versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'reference' },
    ],
    areas: [
        { id: 'route-3', name: 'Route 3', description: 'East of Pewter City, before Mt. Moon. Look here in the grass for Jigglypuff, not inside the cave.', sourceIds: ['route-3-links', 'moon-route-3-wild'] },
        { id: 'route-4-west', name: 'Route 4 west · Pokémon Center', description: 'Heal outside the cave’s western entrance. The Magikarp salesman is inside this Center, not a wild encounter.', sourceIds: ['route-4-objects', 'moon-magikarp'] },
        { id: 'mt-moon-1f', name: 'Mt. Moon · 1F', description: 'The entrance floor: six visible items, seven trainers and three ladders down.', sourceIds: ['moon-1f-objects'] },
        { id: 'mt-moon-b1f', name: 'Mt. Moon · B1F', description: 'Connecting passages between floors. Pokémon can appear here, but there are no item balls or trainers on this floor.', sourceIds: ['moon-b1f-objects', 'moon-b1f-wild'] },
        { id: 'mt-moon-b2f', name: 'Mt. Moon · B2F', description: 'The lowest floor has separate pockets, Team Rocket, the fossil choice and two hidden items.', sourceIds: ['moon-b2f-objects', 'moon-hidden', 'moon-fossil-choice'] },
        { id: 'route-4-east', name: 'Route 4 east · toward Cerulean', description: 'After leaving the cave. Grass encounters belong to this eastern stretch, not the Pokémon Center entrance. The high-hill Lass and water are later visits via Surf.', sourceIds: ['route-4-objects', 'moon-route-4-wild', 'route-4-topology'] },
    ],
    directions: [
        { id: 'moon-route-3', text: 'Leave Pewter City to the east along Route 3. Battle or pass its trainers, then continue to Route 4 west and heal in the Pokémon Center before entering Mt. Moon.', sourceIds: ['route-3-links', 'route-3-objects', 'route-4-objects'] },
        { id: 'moon-side-branches', text: 'Explore 1F before taking the main descent. Its two side ladders lead through separate B1F passages to B2F pockets: the ladder at (17, 11) leads toward TM01 Mega Punch and the hidden Ether; the ladder at (25, 15) leads toward HP Up. Return up the same way after each detour.', sourceIds: ['moon-1f-objects', 'moon-b1f-objects', 'moon-b2f-objects', 'moon-hidden'] },
        { id: 'moon-main-descent', text: 'For the main route, use the northwest 1F ladder at (5, 5), near the Hiker. Follow its B1F passage down to the main B2F area, then work toward the Super Nerd and fossils. The floors have different Pokémon levels; choose your floor below.', sourceIds: ['moon-1f-objects', 'moon-b1f-objects', 'moon-b2f-objects', 'moon-b2f-wild'] },
        { id: 'moon-choose-fossil', text: 'Defeat the Super Nerd on B2F, then choose ONE fossil: Dome Fossil or Helix Fossil. Keep a free Bag slot. The other fossil goes to him, so this is a real choice, not two pickups to collect.', sourceIds: ['moon-fossil-choice', 'moon-b2f-objects'] },
        { id: 'moon-exit', text: 'Continue to the B2F exit ladder at (5, 7), follow the final B1F passage and emerge on Route 4 east. Check the items here before descending the one-way ledges toward Cerulean City; you cannot immediately walk back up.', sourceIds: ['moon-b2f-objects', 'moon-b1f-objects', 'route-4-objects', 'route-4-links', 'route-4-topology'] },
    ],
    items: [
        { id: 'moon-potion-west', areaId: 'mt-moon-1f', name: 'Potion', quantity: 1, kind: 'visible', position: { x: 2, y: 20 }, location: 'Western side of 1F, item ball at (2, 20).', requirements: bag, sourceIds: ['moon-1f-objects'] },
        { id: 'moon-stone-visible', areaId: 'mt-moon-1f', name: 'Moon Stone', quantity: 1, kind: 'visible', position: { x: 2, y: 2 }, location: 'Northwest corner of 1F, item ball at (2, 2). This is separate from the hidden B2F Moon Stone.', requirements: bag, sourceIds: ['moon-1f-objects', 'moon-hidden'] },
        { id: 'moon-rare-candy', areaId: 'mt-moon-1f', name: 'Rare Candy', quantity: 1, kind: 'visible', position: { x: 35, y: 31 }, location: 'Southeastern part of 1F, item ball at (35, 31).', requirements: bag, sourceIds: ['moon-1f-objects'] },
        { id: 'moon-escape-rope', areaId: 'mt-moon-1f', name: 'Escape Rope', quantity: 1, kind: 'visible', position: { x: 36, y: 23 }, location: 'Eastern side of 1F, item ball at (36, 23). Not on B1F.', requirements: bag, sourceIds: ['moon-1f-objects'] },
        { id: 'moon-potion-entrance', areaId: 'mt-moon-1f', name: 'Potion', quantity: 1, kind: 'visible', position: { x: 20, y: 33 }, location: 'Southern part of 1F near the entrance, item ball at (20, 33).', requirements: bag, sourceIds: ['moon-1f-objects'] },
        { id: 'moon-tm12', areaId: 'mt-moon-1f', name: 'TM12 Water Gun', quantity: 1, kind: 'visible', position: { x: 5, y: 32 }, location: 'Southwestern part of 1F, item ball at (5, 32). Not a Route 4 pickup.', requirements: bag, sourceIds: ['moon-1f-objects'] },
        { id: 'moon-hp-up', areaId: 'mt-moon-b2f', name: 'HP Up', quantity: 1, kind: 'visible', position: { x: 25, y: 21 }, location: 'Separate B2F pocket, item ball at (25, 21). Reach it using the 1F ladder at (25, 15).', requirements: bag, sourceIds: ['moon-1f-objects', 'moon-b1f-objects', 'moon-b2f-objects'] },
        { id: 'moon-tm01', areaId: 'mt-moon-b2f', name: 'TM01 Mega Punch', quantity: 1, kind: 'visible', position: { x: 29, y: 5 }, location: 'Separate B2F pocket, item ball at (29, 5). Reach it using the 1F ladder at (17, 11).', requirements: bag, sourceIds: ['moon-1f-objects', 'moon-b1f-objects', 'moon-b2f-objects'] },
        { id: 'moon-stone-hidden', areaId: 'mt-moon-b2f', name: 'Moon Stone', quantity: 1, kind: 'hidden', position: { x: 18, y: 12 }, location: 'Main B2F area near the fossil section: inspect the square at (18, 12).', requirements: hidden, sourceIds: ['moon-hidden', 'moon-hidden-use', 'moon-b2f-objects'] },
        { id: 'moon-ether', areaId: 'mt-moon-b2f', name: 'Ether', quantity: 1, kind: 'hidden', position: { x: 33, y: 9 }, location: 'B2F pocket containing TM01: inspect the square at (33, 9).', requirements: hidden, sourceIds: ['moon-hidden', 'moon-hidden-use', 'moon-b2f-objects'] },
        { id: 'moon-dome-fossil', areaId: 'mt-moon-b2f', name: 'Dome Fossil', quantity: 1, kind: 'choice', position: { x: 12, y: 6 }, location: 'Left fossil at (12, 6), beyond the Super Nerd. Later revived as Kabuto at Cinnabar Lab.', requirements: 'Defeat the Super Nerd and keep Bag space. Choose this OR the Helix Fossil; you cannot collect both here.', sourceIds: ['moon-b2f-objects', 'moon-fossil-choice', 'moon-fossil-revival'] },
        { id: 'moon-helix-fossil', areaId: 'mt-moon-b2f', name: 'Helix Fossil', quantity: 1, kind: 'choice', position: { x: 13, y: 6 }, location: 'Right fossil at (13, 6), beyond the Super Nerd. Later revived as Omanyte at Cinnabar Lab.', requirements: 'Defeat the Super Nerd and keep Bag space. Choose this OR the Dome Fossil; you cannot collect both here.', sourceIds: ['moon-b2f-objects', 'moon-fossil-choice', 'moon-fossil-revival'] },
        { id: 'route-4-tm04', areaId: 'route-4-east', name: 'TM04 Whirlwind', quantity: 1, kind: 'visible', position: { x: 57, y: 3 }, location: 'Route 4 east after the cave, item ball at (57, 3).', requirements: bag, sourceIds: ['route-4-objects'] },
        { id: 'route-4-great-ball', areaId: 'route-4-east', name: 'Great Ball', quantity: 1, kind: 'hidden', position: { x: 40, y: 3 }, location: 'Plateau east of the cave exit: inspect the square at (40, 3) before dropping down toward Cerulean.', requirements: hidden, sourceIds: ['moon-hidden', 'moon-hidden-use', 'route-4-topology'] },
    ],
    encounters: (['red', 'blue'] as const).flatMap((version) => [
        encounters(version, 'route-3', 'grass', route3, 'moon-route-3-wild'),
        encounters(version, 'mt-moon-1f', 'cave', floor1, 'moon-1f-wild'),
        encounters(version, 'mt-moon-b1f', 'cave', basement1, 'moon-b1f-wild'),
        encounters(version, 'mt-moon-b2f', 'cave', basement2, 'moon-b2f-wild'),
        encounters(version, 'route-4-east', 'grass', route4(version), 'moon-route-4-wild'),
    ]),
    encountersNote: 'Each table applies only to the named route or cave floor. Fractions are exact slot weights out of 256 after an encounter is generated, assuming a uniform random byte; rounded percentages are not chances per step or catch. Route 3 and all three Mt. Moon floors share their tables between Red and Blue. Only Route 4’s grass differs here: Ekans in Red, Sandshrew in Blue. The purchased Magikarp and later fishing catches are separate.',
    trainers: [
        trainer('route-3-bug-1', 'Bug Catcher 1', 'route-3', 10, 6, [['Caterpie', 10, 10], ['Weedle', 13, 10], ['Caterpie', 10, 10]], 'route-3-objects'),
        trainer('route-3-youngster-1', 'Youngster 1', 'route-3', 14, 4, [['Rattata', 19, 11], ['Ekans', 23, 11]], 'route-3-objects'),
        trainer('route-3-lass-1', 'Lass 1', 'route-3', 16, 9, [['Pidgey', 16, 9], ['Pidgey', 16, 9]], 'route-3-objects'),
        trainer('route-3-bug-2', 'Bug Catcher 2', 'route-3', 19, 5, [['Weedle', 13, 9], ['Kakuna', 14, 9], ['Caterpie', 10, 9], ['Metapod', 11, 9]], 'route-3-objects'),
        trainer('route-3-lass-2', 'Lass 2', 'route-3', 23, 4, [['Rattata', 19, 10], ['Nidoran♂', 32, 10]], 'route-3-objects'),
        trainer('route-3-youngster-2', 'Youngster 2', 'route-3', 22, 9, [['Spearow', 21, 14]], 'route-3-objects'),
        trainer('route-3-bug-3', 'Bug Catcher 3', 'route-3', 24, 6, [['Caterpie', 10, 11], ['Metapod', 11, 11]], 'route-3-objects'),
        trainer('route-3-lass-3', 'Lass 3', 'route-3', 33, 10, [['Jigglypuff', 39, 14]], 'route-3-objects'),
        trainer('moon-hiker', 'Hiker', 'mt-moon-1f', 5, 6, [['Geodude', 74, 10], ['Geodude', 74, 10], ['Onix', 95, 10]], 'moon-1f-objects'),
        trainer('moon-youngster', 'Youngster', 'mt-moon-1f', 12, 16, [['Rattata', 19, 10], ['Rattata', 19, 10], ['Zubat', 41, 10]], 'moon-1f-objects'),
        trainer('moon-lass-1', 'Lass 1', 'mt-moon-1f', 30, 4, [['Oddish', 43, 11], ['Bellsprout', 69, 11]], 'moon-1f-objects'),
        trainer('moon-nerd-1', 'Super Nerd', 'mt-moon-1f', 24, 31, [['Magnemite', 81, 11], ['Voltorb', 100, 11]], 'moon-1f-objects'),
        trainer('moon-lass-2', 'Lass 2', 'mt-moon-1f', 16, 23, [['Clefairy', 35, 14]], 'moon-1f-objects'),
        trainer('moon-bug-1', 'Bug Catcher 1', 'mt-moon-1f', 7, 22, [['Weedle', 13, 11], ['Kakuna', 14, 11]], 'moon-1f-objects'),
        trainer('moon-bug-2', 'Bug Catcher 2', 'mt-moon-1f', 30, 27, [['Caterpie', 10, 10], ['Metapod', 11, 10], ['Caterpie', 10, 10]], 'moon-1f-objects'),
        trainer('moon-fossil-nerd', 'Super Nerd · fossil battle', 'mt-moon-b2f', 12, 8, [['Grimer', 88, 12], ['Voltorb', 100, 12], ['Koffing', 109, 12]], 'moon-b2f-objects'),
        trainer('moon-rocket-1', 'Team Rocket 1', 'mt-moon-b2f', 11, 16, [['Rattata', 19, 13], ['Zubat', 41, 13]], 'moon-b2f-objects'),
        trainer('moon-rocket-2', 'Team Rocket 2', 'mt-moon-b2f', 15, 22, [['Sandshrew', 27, 11], ['Rattata', 19, 11], ['Zubat', 41, 11]], 'moon-b2f-objects'),
        trainer('moon-rocket-3', 'Team Rocket 3 · TM01 pocket', 'mt-moon-b2f', 29, 11, [['Zubat', 41, 12], ['Ekans', 23, 12]], 'moon-b2f-objects'),
        trainer('moon-rocket-4', 'Team Rocket 4 · HP Up pocket', 'mt-moon-b2f', 29, 17, [['Raticate', 20, 16]], 'moon-b2f-objects'),
        trainer('route-4-lass', 'Lass · later Surf visit', 'route-4-east', 63, 3, [['Paras', 46, 31], ['Paras', 46, 31], ['Parasect', 47, 31]], 'route-4-objects', 'Later visit: reach the highest hill via the waterway from Route 24 using Surf. Not an early-game battle on the path to Cerulean.'),
    ],
    pokemonOffers: [{ id: 'moon-magikarp-offer', name: 'Magikarp', dexId: 129, level: 5, price: 500, areaId: 'route-4-west', details: 'Optional, once-only purchase from the salesman inside the Pokémon Center before Mt. Moon. It is not a wild cave encounter and no fishing rod is needed. Have ₽500 and room to receive a Pokémon.', sourceIds: ['moon-magikarp', 'route-4-objects'] }],
    advice: [
        { id: 'moon-clefairy', text: 'Looking for Clefairy? All three cave floors have it, but B2F gives it more encounter-slot weight than 1F. Use the floor selector for its exact levels and chance; Jigglypuff is in Route 3’s grass instead.', sourceIds: ['moon-1f-wild', 'moon-b1f-wild', 'moon-b2f-wild', 'moon-route-3-wild', 'moon-encounter-weights'] },
        { id: 'moon-empty-b1f', text: 'B1F is not an item hunt: its separate passages connect other floors and the exit. Take each optional B2F pocket from the appropriate 1F ladder rather than expecting every B2F section to connect.', sourceIds: ['moon-1f-objects', 'moon-b1f-objects', 'moon-b2f-objects'] },
        { id: 'moon-local-coordinates', text: 'Coordinates below count movement squares east (x) and south (y) from each named map’s northwest corner. They help distinguish pickups and trainers, but are not a terrain map or walking directions.', sourceIds: ['moon-1f-objects', 'moon-b2f-objects', 'route-3-objects', 'route-4-objects', 'moon-hidden'] },
    ],
    warnings: [
        { id: 'moon-fossil-warning', text: 'You can take only one fossil here. Dome becomes Kabuto; Helix becomes Omanyte later at Cinnabar Lab. The other is not a second collectible on this visit.', sourceIds: ['moon-fossil-choice', 'moon-fossil-revival'] },
        { id: 'moon-ledge-warning', text: 'Before dropping down Route 4’s one-way ledges, finish any cave or western-area detours you want now. You cannot simply walk back from Cerulean; later travel options are needed. The level-31 hilltop Lass and fishing water are later Surf visits, not part of this first crossing.', sourceIds: ['route-4-topology', 'moon-trainer-parties'] },
    ],
}
