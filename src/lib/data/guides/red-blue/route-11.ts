import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}

type Member = readonly [name: string, dexId: number, level: number]
function party(id: string, members: Member[]): GuideLocation['trainers'][number]['party'] {
    return members.map(([name, dexId, level], index) => ({ id: `${id}-slot-${index + 1}`, name, dexId, level, moves: [] }))
}
function trainer(id: string, name: string, x: number, y: number, members: Member[]): GuideLocation['trainers'][number] {
    return { id, name, role: 'trainer', areaId: 'route-11', position: { x, y }, party: party(id, members), sourceIds: ['r11-objects', 'r11-parties', 'r11-trainer-events'] }
}

const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
function encounters(versionId: 'red' | 'blue'): GuideLocation['encounters'][number] {
    const exclusive: readonly [string, number] = versionId === 'red' ? ['Ekans', 23] : ['Sandshrew', 27]
    const slots: Member[] = [
        [...exclusive, 14], ['Spearow', 21, 15], [...exclusive, 12], ['Drowzee', 96, 9], ['Spearow', 21, 13],
        ['Drowzee', 96, 13], [...exclusive, 15], ['Spearow', 21, 17], ['Drowzee', 96, 11], ['Drowzee', 96, 15],
    ]
    return {
        versionId, method: 'grass', areaId: 'route-11', denominator: 256,
        slots: slots.map(([name, dexId, level], index) => ({ id: `r11-${versionId}-grass-slot-${index + 1}`, name, dexId, level, weight: weights[index] })),
        sourceIds: ['r11-grass', 'r11-slot-weights'],
    }
}

// This bounded source module is composed with the Diglett's Cave/Route 2 return
// into one optional reference on the existing Vermilion stop. Do not register it
// as an independent stop replacement or change saved progress identities.
export const ROUTE_11_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-route-11', guideId: 'red-blue', stopId: 'vermilion-city',
    versionIds: ['red', 'blue'], title: 'Route 11 & the eastern gate',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Route 11 grass, all ten fixed trainer parties, its hidden Escape Rope, the eastern gate and upstairs Itemfinder reward/Nidorina trade. Route 12 is a later onward boundary, not an encounter area in this section.',
    limitations: [
        'Source-checked, not play-through verified. Coordinates identify records on their own maps, not a terrain or pathfinding map.',
        'Trainer moves, AI, item use and prize money are outside this bounded audit. Fishing is a separate named-water section. Route 12 encounters, trainers, items and the later Snorlax battle are not included.',
    ],
    sources: [
        source('r11-connections', 'data/maps/headers/Route11.asm', 'Route 11 connections', 'West connection to Vermilion City; east connection to Route 12 with offset -27'),
        source('r11-objects', 'data/maps/objects/Route11.asm', 'Route 11 entrances and trainer identities', 'Ten trainers: Gambler 1–4, Youngster 9–12, Engineer 2–3 despite SUPER_NERD sprite names; gate entrances (49,8)/(49,9), east exits (58,8)/(58,9); Diglett’s Cave entrance (4,5); no visible item balls'),
        source('r11-trainer-events', 'scripts/Route11.asm', 'Route 11 trainer battles', 'Route11TrainerHeaders: ten fixed ordinary trainer flags/headers'),
        source('r11-parties', 'data/trainers/parties.asm', 'Exact Route 11 trainer teams', 'GamblerData 1–4; YoungsterData 9–12; EngineerData 2–3'),
        source('r11-grass', 'data/wild/maps/Route11.asm', 'Route 11 Red/Blue encounters', 'Route11WildMons: Red Ekans versus Blue Sandshrew; shared Spearow/Drowzee slots and exact levels; water encounter rate 0'),
        source('r11-slot-weights', 'data/wild/probabilities.asm', 'Grass slot weights', 'WildMonEncounterSlotChances: 51,51,39,25,25,25,13,13,11,3 out of 256'),
        source('r11-hidden-item', 'data/events/hidden_events.asm', 'Route 11 hidden pickup', 'hidden_events_for ROUTE_11: (48,5), HiddenItems, ESCAPE_ROPE'),
        source('r11-hidden-item-coordinates', 'data/events/hidden_item_coords.asm', 'Hidden Escape Rope identity', 'hidden_item ROUTE_11,48,5'),
        source('r11-hidden-item-retry', 'engine/events/hidden_items.asm', 'Hidden pickup and Bag-full retry', 'FoundHiddenItemText: GiveItem quantity 1; obtained flag only set after successful pickup'),
        source('r11-gate-1f-objects', 'data/maps/objects/Route11Gate1F.asm', 'Gate entrances and upstairs stairs', 'Four Route 11 door warps; stairs (6,8) to Route11Gate2F; one non-battling guard'),
        source('r11-gate-1f-events', 'scripts/Route11Gate1F.asm', 'Unrestricted gate conversation', 'Route11Gate1FGuardText prints dialogue only; no drink, Cut, badge or Poké Flute access check'),
        source('r11-gate-2f-objects', 'data/maps/objects/Route11Gate2F.asm', 'Upstairs NPC locations', 'Youngster at (4,2); Oak’s aide at (2,6); return stairs at (7,7); binoculars at (1,2)/(6,2)'),
        source('r11-gate-2f-events', 'scripts/Route11Gate2F.asm', 'Itemfinder reward and trade selection', 'Route11Gate2FOaksAideText: requirement 30, ITEMFINDER, flag set only on OAKS_AIDE_GOT_ITEM; YoungsterText selects TRADE_FOR_TERRY; left binoculars checks Route 12 Snorlax event'),
        source('r11-aide-engine', 'engine/events/oaks_aide.asm', 'Distinct owned species and retryable aide gift', 'OaksAideScript counts wPokedexOwned bits, not seen or current party size; refusal, insufficient count and Bag-full return without a successful gift'),
        source('r11-itemfinder-description', 'text/Route11Gate2F.asm', 'Original Itemfinder description', 'Itemfinder detects a nearby hidden item but cannot pinpoint it'),
        source('r11-trades', 'data/events/trades.asm', 'English Red/Blue gate trade', 'TradeMons first row: NIDORINO → NIDORINA, nickname TERRY, used in ROUTE_11_GATE_2F'),
        source('r11-trade-engine', 'engine/events/in_game_trades.asm', 'Trade level and one-time completion', 'InGameTrade_DoTrade requires selected party species; copies its level to wCurEnemyLevel; completed trade flag prevents repetition'),
        source('r11-snorlax-position', 'data/maps/objects/Route12.asm', 'Snorlax belongs to Route 12', 'ROUTE12_SNORLAX object at (10,62), separate from Route 11 and the gate'),
        source('r11-flute-events', 'engine/items/item_effects.asm', 'Later Snorlax wake-up requirement', 'ItemUsePokeFlute: uncleared Route 12 Snorlax and nearby player coordinates set EVENT_FIGHT_ROUTE12_SNORLAX'),
    ],
    areas: [
        { id: 'route-11', name: 'Route 11 · east of Vermilion', description: 'Grass and trainer-filled paths between Vermilion, Diglett’s Cave and the eastern gate. The grass Pokémon below are on this route, not inside Vermilion or the cave.', sourceIds: ['r11-connections', 'r11-objects', 'r11-grass'] },
        { id: 'route-11-gate', name: 'Eastern gate · upstairs', description: 'Go upstairs inside the gate for Oak’s aide and the Nidorina trade. You can visit these NPCs before the sleeping Snorlax is moved.', sourceIds: ['r11-gate-1f-objects', 'r11-gate-1f-events', 'r11-gate-2f-objects', 'r11-gate-2f-events'] },
    ],
    directions: [
        { id: 'r11-leave-vermilion', text: 'Leave Vermilion through the eastern exit to explore Route 11. Diglett’s Cave is near the route’s western end; continue east along the route for its grass, ten trainers and the gate. Neither Cut nor Surf is required just to visit the route and gate.', sourceIds: ['r11-connections', 'r11-objects', 'r11-gate-1f-objects', 'r11-gate-1f-events'] },
        { id: 'r11-explore-route', text: 'Check the route’s grass for Spearow and Drowzee, plus Ekans in Red or Sandshrew in Blue. The trainer cards below list all ten parties, including the two Engineers. Before entering the gate, check the hidden Escape Rope north of its Route 11 approach.', sourceIds: ['r11-grass', 'r11-objects', 'r11-parties', 'r11-hidden-item'] },
        { id: 'r11-visit-upstairs', text: 'Enter the gate at the eastern end and take the stairs upstairs. Speak to Oak’s aide for the Itemfinder once your Pokédex has 30 different owned species. If you have not caught enough yet, return later; a full Bag also leaves the gift available after you make space.', sourceIds: ['r11-gate-1f-objects', 'r11-gate-2f-objects', 'r11-gate-2f-events', 'r11-aide-engine'] },
        { id: 'r11-consider-trade', text: 'The other upstairs NPC offers Nidorina, nicknamed TERRY, for your Nidorino. This is the same trade in Red and Blue. Bring a Nidorino in your party if you want to accept; you can leave the offer for later.', sourceIds: ['r11-gate-2f-objects', 'r11-gate-2f-events', 'r11-trades', 'r11-trade-engine'] },
        { id: 'r11-return-or-cave', text: 'The sleeping Snorlax beyond the gate is on Route 12 and blocks onward travel for now. You need the Poké Flute later to wake it. For this visit, return west toward Vermilion or enter Diglett’s Cave instead; the gate’s upstairs rewards do not require moving Snorlax.', sourceIds: ['r11-connections', 'r11-objects', 'r11-gate-1f-events', 'r11-snorlax-position', 'r11-flute-events'] },
    ],
    items: [
        { id: 'r11-escape-rope', name: 'Escape Rope', quantity: 1, kind: 'hidden', areaId: 'route-11', position: { x: 48, y: 5 }, location: 'Hidden north of the eastern gate on the Route 11 approach, at map coordinate (48,5).', requirements: 'Inspect the hidden spot with Bag space. The Itemfinder is not required to collect it; if your Bag is full, make space and try again.', sourceIds: ['r11-hidden-item', 'r11-hidden-item-coordinates', 'r11-hidden-item-retry'] },
        { id: 'r11-itemfinder', name: 'Itemfinder', quantity: 1, kind: 'gift', areaId: 'route-11-gate', position: { x: 2, y: 6 }, location: 'Oak’s aide upstairs in the eastern gate, at (2,6) on the upstairs map.', requirements: 'Have at least 30 distinct owned/caught species recorded in the Pokédex and Bag space. Seen-only entries do not count. You can return after catching more species or clearing Bag space; refusing the gift does not lose it.', sourceIds: ['r11-gate-2f-objects', 'r11-gate-2f-events', 'r11-aide-engine'] },
    ],
    encounters: [encounters('red'), encounters('blue')],
    encountersNote: 'These are Route 11 grass encounters outside Vermilion, not Pokémon inside the gate or Diglett’s Cave. Red has Ekans where Blue has Sandshrew. Fishing uses its own named-water cards; there are no random Surf encounters on Route 11 in these Red/Blue releases.',
    trainers: [
        trainer('r11-gambler-1', 'Gambler 1', 10, 14, [['Poliwag', 60, 18], ['Horsea', 116, 18]]),
        trainer('r11-gambler-2', 'Gambler 2', 26, 9, [['Bellsprout', 69, 18], ['Oddish', 43, 18]]),
        trainer('r11-youngster-1', 'Youngster 1', 13, 5, [['Ekans', 23, 21]]),
        trainer('r11-engineer-1', 'Engineer 1', 36, 11, [['Magnemite', 81, 21]]),
        trainer('r11-youngster-2', 'Youngster 2', 22, 4, [['Sandshrew', 27, 19], ['Zubat', 41, 19]]),
        trainer('r11-gambler-3', 'Gambler 3', 45, 7, [['Voltorb', 100, 18], ['Magnemite', 81, 18]]),
        trainer('r11-gambler-4', 'Gambler 4', 33, 3, [['Growlithe', 58, 18], ['Vulpix', 37, 18]]),
        trainer('r11-youngster-3', 'Youngster 3', 43, 5, [['Rattata', 19, 17], ['Rattata', 19, 17], ['Raticate', 20, 17]]),
        trainer('r11-engineer-2', 'Engineer 2', 45, 16, [['Magnemite', 81, 18], ['Magnemite', 81, 18], ['Magneton', 82, 18]]),
        trainer('r11-youngster-4', 'Youngster 4', 22, 12, [['Nidoran♂', 32, 18], ['Nidorino', 33, 18]]),
    ],
    pokemonTrades: [{
        id: 'r11-terry-trade', areaId: 'route-11-gate', give: { name: 'Nidorino', dexId: 33 }, receive: { name: 'Nidorina', dexId: 30, nickname: 'TERRY' },
        details: 'Upstairs in the eastern gate, the walking NPC trades Nidorina TERRY for your Nidorino in both Red and Blue. Bring Nidorino in your party. TERRY has the same level as the Pokémon you trade away; this one-time trade can be left for a later visit.',
        sourceIds: ['r11-gate-2f-objects', 'r11-gate-2f-events', 'r11-trades', 'r11-trade-engine'],
    }],
    warnings: [
        { id: 'r11-snorlax-boundary', text: 'You can explore Route 11 and visit the gate now. Snorlax is beyond it on Route 12, not a Route 11 grass encounter; onward travel there needs the Poké Flute later.', sourceIds: ['r11-connections', 'r11-gate-1f-events', 'r11-snorlax-position', 'r11-flute-events'] },
    ],
    advice: [
        { id: 'r11-owned-not-seen', text: 'The Itemfinder reward counts different species you have owned, not just seen. Duplicates do not increase the count, and it is not a count of the Pokémon currently in your party. Come back to the aide when your caught count reaches 30.', sourceIds: ['r11-aide-engine', 'r11-gate-2f-events'] },
        { id: 'r11-itemfinder-use', text: 'The Itemfinder tells you when a hidden item is nearby, but it does not point to the exact tile. You can still search for and collect hidden items without owning it.', sourceIds: ['r11-itemfinder-description', 'r11-hidden-item-retry'] },
        { id: 'r11-trade-level', text: 'Choose the Nidorino you trade deliberately: you give that Pokémon away and receive Nidorina at the same level. The offer is not reversed between Red and Blue.', sourceIds: ['r11-trades', 'r11-trade-engine'] },
    ],
}
