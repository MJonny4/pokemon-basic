import type { GuideLocation } from '../location-schema'

// Bounded story route through Silph Co. Facts use the pinned English Red/Blue
// disassembly; optional floor inventories and ordinary trainer parties await audit.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
const area = (id: string, name: string, description: string, ...sourceIds: string[]) => ({ id, name, description, sourceIds })
type Slot = readonly [dexId: number, level: number, name: string]
function party(slots: Slot[]): GuideLocation['trainers'][number]['party'] {
    return slots.map(([dexId, level, name], index) => ({ id: `slot-${index + 1}`, dexId, level, name, moves: [] }))
}

export const SAFFRON_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-saffron-story', guideId: 'red-blue', stopId: 'saffron-city',
    versionIds: [...versions], title: 'Saffron City & Silph Co.',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Guard access and a navigable story route through Silph Co.; Card Key, full rival variants, Lapras, Giovanni and Master Ball.',
    limitations: ['Source-checked, not play-through verified. The story route omits optional floor items, ordinary trainer parties, fishing and a terrain map.', 'Rival and boss moves/AI are not audited. Sabrina, the Fighting Dojo and Fuchsia have separate or later stops.'],
    sources: [
        source('guard-items', 'data/items/guard_drink_items.asm', 'Fresh Water, Soda Pop and Lemonade are the accepted drinks.'),
        source('guard-event', 'scripts/Route7Gate.asm', 'A guard takes one drink and sets the shared Saffron access flag.'),
        source('city-objects', 'data/maps/objects/SaffronCity.asm', 'Silph Co. entrance (18,21), Center (9,29), Gym (34,3).'),
        source('floor-5-objects', 'data/maps/objects/SilphCo5F.asm', 'Card Key ball (21,16), south warp (9,15), stairs and elevator.'),
        source('floor-3-objects', 'data/maps/objects/SilphCo3F.asm', 'Central room warp (11,11) sends player to 7F warp 5.'),
        source('floor-3-doors', 'scripts/SilphCo3F.asm', 'Card Key doors lead from the main corridor into the central warp room.'),
        source('floor-7-objects', 'data/maps/objects/SilphCo7F.asm', '3F arrival (5,3), rival (3,7), Lapras worker (1,5), 11F warp (5,7).'),
        source('floor-7-rival', 'scripts/SilphCo7F.asm', 'Starter-dependent rival battle uses Rival2 parties 7–9.'),
        source('floor-7-lapras', 'scripts/SilphCo7F.asm', 'Worker offers level-15 Lapras; gift flag sets only when GivePokemon succeeds.'),
        source('gift-capacity', 'engine/events/give_pokemon.asm', 'Gift enters party or current PC Box; when both are full, gift fails without a success flag.'),
        source('floor-11-objects', 'data/maps/objects/SilphCo11F.asm', '7F arrival (3,2), Giovanni (6,9), president (7,5).'),
        source('floor-11-events', 'scripts/SilphCo11F.asm', 'Giovanni battle and Rocket removal; president gives Master Ball with Bag-full retry.'),
        source('parties', 'data/trainers/parties.asm', 'Rival2 Silph 7F parties and Giovanni Silph 11F party.'),
        source('nidorino-types', 'data/pokemon/base_stats/nidorino.asm', 'Poison type.'),
        source('nidoqueen-types', 'data/pokemon/base_stats/nidoqueen.asm', 'Poison/Ground type.'),
        source('rhyhorn-types', 'data/pokemon/base_stats/rhyhorn.asm', 'Ground/Rock type.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Water/Grass/Ground/Psychic effectiveness.'),
        source('floor-9-heal', 'scripts/SilphCo9F.asm', 'Nurse heals the party after a Card Key door is opened.'),
        source('city-rocket-state', 'data/maps/toggleable_objects.asm', 'Saffron Rocket blockers change after Silph Giovanni.'),
        { id: 'navigation', title: 'Red/Blue walkthrough, part 10 — navigation cross-check', locator: '5F warp-and-return Card Key approach and 3F → 7F → 11F room sequence only; events and parties use pinned game data.', url: 'https://bulbapedia.bulbagarden.net/w/index.php?title=Walkthrough:Pok%C3%A9mon_Red_and_Blue/Part_10&oldid=4399260', versionIds: [...versions], checkedOn: '2026-10-21', kind: 'reference' },
    ],
    areas: [
        area('saffron', 'Saffron City', 'Give a guard one rooftop drink to enter; heal before Silph Co.', 'guard-event', 'city-objects'),
        area('silph-5f', 'Silph Co. · 5F', 'The Card Key is in the southern corridor, past a Rocket and a warp tile.', 'floor-5-objects'),
        area('silph-3f', 'Silph Co. · 3F', 'Open the central Card Key door to reach the warp into the rival’s room.', 'floor-3-objects', 'floor-3-doors'),
        area('silph-7f', 'Silph Co. · 7F northwest', 'Defeat your rival, ask the nearby worker for Lapras, then take the other warp.', 'floor-7-objects', 'floor-7-rival', 'floor-7-lapras'),
        area('silph-11f', 'Silph Co. · 11F west', 'Defeat the remaining Rocket and Giovanni, then speak to the president.', 'floor-11-objects', 'floor-11-events'),
    ],
    directions: [
        note('enter-saffron', 'From Celadon, buy Fresh Water, Soda Pop or Lemonade from the Department Store rooftop vending machines. Go east through the Route 7 gate; a guard takes one drink and opens the Saffron gates. Heal at Saffron’s Pokémon Center, then enter Silph Co. near the middle of town.', 'guard-items', 'guard-event', 'city-objects'),
        note('reach-card-key', 'Inside Silph Co., take the stairs or elevator to 5F. Follow the southern hallway to the Rocket beside a warp tile. Beat him, step on that tile and immediately step back onto its paired tile to return to 5F. Walk east along the south corridor and pick up the Card Key item ball.', 'floor-5-objects', 'navigation'),
        note('return-3f', 'Return to 3F using the elevator or stairs. Use the Card Key to open the central room’s electronic door, then step on the warp inside. It sends you to the enclosed northwest room on 7F, where your rival waits.', 'floor-3-objects', 'floor-3-doors', 'floor-7-objects', 'navigation'),
        note('rival', 'Defeat your rival on 7F. His full five-Pokémon team depends on the starter you originally chose; preview the correct party below before stepping into his room.', 'floor-7-rival', 'parties'),
        note('lapras-and-warp', 'After the rival battle, speak to the Silph worker in the same 7F room for a level-15 Lapras. Make space in your party or a usable PC Box and speak to him again if the gift cannot be received. Then take the other warp in this room to the west side of 11F.', 'floor-7-objects', 'floor-7-lapras', 'gift-capacity', 'navigation'),
        note('giovanni-and-president', 'On 11F, beat the Rocket on the way to the boardroom, unlock the Card Key door and face Giovanni. After winning, speak to the Silph president for the Master Ball. If your Bag is full, make room and speak to him again.', 'floor-11-objects', 'floor-11-events', 'parties', 'navigation'),
        note('onward', 'Silph Co. is cleared and Saffron Gym becomes accessible. You can tackle Sabrina before or after Fuchsia’s Koga; the guide lists Fuchsia next and keeps Sabrina in her own gym stop. For Fuchsia, use the Poké Flute at the Route 16 or Route 12 Snorlax and continue along that route.', 'floor-11-events', 'city-rocket-state', 'city-objects'),
    ],
    items: [
        { id: 'card-key', name: 'Card Key', areaId: 'silph-5f', kind: 'visible', quantity: 1, location: '5F southern corridor, item ball east of the warp tile.', requirements: 'Beat the nearby Rocket and warp away/back to reach it; leave Bag room.', sourceIds: ['floor-5-objects', 'navigation'] },
        { id: 'lapras', name: 'Lapras', areaId: 'silph-7f', kind: 'gift', quantity: 1, location: 'Worker in the rival’s northwest 7F room; level 15.', requirements: 'Speak to him after defeating the rival. Gift remains available if your party and PC Box cannot accept it.', sourceIds: ['floor-7-lapras', 'floor-7-objects', 'gift-capacity'] },
        { id: 'master-ball', name: 'Master Ball', areaId: 'silph-11f', kind: 'gift', quantity: 1, location: 'Silph president in the 11F boardroom.', requirements: 'Defeat Giovanni, then speak to the president with Bag space; retry if full.', sourceIds: ['floor-11-events', 'floor-11-objects'] },
    ],
    encounters: [], encountersNote: 'There are no wild encounters inside Silph Co. The city’s surrounding routes are covered by their own stops where audited.',
    trainers: [{ id: 'silph-giovanni', name: 'Giovanni · Silph Co.', role: 'boss', areaId: 'silph-11f', party: party([[33,37,'Nidorino'],[115,35,'Kangaskhan'],[111,37,'Rhyhorn'],[31,41,'Nidoqueen']]), sourceIds: ['parties', 'floor-11-objects'] }],
    starterBattles: [{ id: 'silph-rival', name: 'Rival · Silph Co. 7F', areaId: 'silph-7f', description: 'The preview follows your original starter. His final Pokémon is the starter strong against yours; the other members also change.', sourceIds: ['floor-7-rival', 'parties'], variants: [
        { playerStarterDexId: 1, party: party([[18,37,'Pidgeot'],[58,38,'Growlithe'],[102,35,'Exeggcute'],[65,35,'Alakazam'],[9,40,'Blastoise']]) },
        { playerStarterDexId: 4, party: party([[18,37,'Pidgeot'],[130,38,'Gyarados'],[58,35,'Growlithe'],[65,35,'Alakazam'],[3,40,'Venusaur']]) },
        { playerStarterDexId: 7, party: party([[18,37,'Pidgeot'],[102,38,'Exeggcute'],[130,35,'Gyarados'],[65,35,'Alakazam'],[6,40,'Charizard']]) },
    ] }],
    advice: [
        note('prepare', 'Bring healing supplies before the rival and Giovanni fights. Before defeating Giovanni, the nurse in a 9F room can restore your party after you open her Card Key door.', 'floor-9-heal', 'floor-7-rival', 'floor-11-events'),
        note('boss-matchups', 'Water or Grass attacks work well against Giovanni’s Rhyhorn (Rock/Ground). His Nidorino and Nidoqueen are Poison types, so Ground or Psychic attacks are useful; Nidoqueen is also Ground type. Lapras is a useful new teammate, but arrives at level 15 and needs training before this level-41 boss.', 'parties', 'floor-7-lapras', 'nidorino-types', 'nidoqueen-types', 'rhyhorn-types', 'matchups'),
    ],
    warnings: [note('silph-missables', 'The Lapras gift and Master Ball require separate conversations; defeating Giovanni alone does not put either in your party or Bag. Collect Lapras before leaving 7F if you want it now.', 'floor-7-lapras', 'floor-11-events')],
}
