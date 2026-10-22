import type { GuideLocation } from '../location-schema'
import { ROUTE_3_MT_MOON_LOCATION } from './mt-moon'
import { CERULEAN_LOCATION } from './cerulean'
import { VERMILION_LOCATION } from './vermilion'
import { VERMILION_GYM_LOCATION } from './vermilion-gym'
import { RED_BLUE_MIDGAME_LOCATIONS } from './midgame'
import { SAFFRON_STORY_LOCATION } from './saffron'
import { SABRINA_GYM_LOCATION } from './sabrina'
import { FUCHSIA_STORY_LOCATION } from './fuchsia'
import { CINNABAR_STORY_LOCATION } from './cinnabar'
import { VIRIDIAN_GYM_STORY_LOCATION } from './viridian-gym'
import { VICTORY_ROAD_STORY_LOCATION } from './victory-road'
import { LORELEI_STORY_LOCATION } from './lorelei'
import { BRUNO_STORY_LOCATION } from './bruno'
import { AGATHA_STORY_LOCATION } from './agatha'
import { LANCE_STORY_LOCATION } from './lance'
import { CHAMPION_STORY_LOCATION } from './champion'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const releaseScope = 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, or ROM hacks; other localizations/re-releases are not audited.'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return {
        id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'game-disassembly',
        url: `https://github.com/pret/pokered/blob/${revision}/${file}`,
    }
}
function member(id: string, name: string, dexId: number, level: number, moves: string[] = []): GuideLocation['trainers'][number]['party'][number] {
    return { id, name, dexId, level, moves }
}
const weights = [51, 51, 39, 25, 25, 25, 13, 13, 11, 3]
function encounters(versionId: 'red' | 'blue'): GuideLocation['encounters'][number] {
    const red = versionId === 'red'
    const common = red ? { name: 'Weedle', dexId: 13 } : { name: 'Caterpie', dexId: 10 }
    const cocoon = red ? { name: 'Kakuna', dexId: 14 } : { name: 'Metapod', dexId: 11 }
    const uncommon = red ? { name: 'Metapod', dexId: 11 } : { name: 'Kakuna', dexId: 14 }
    const rare = red ? { name: 'Caterpie', dexId: 10 } : { name: 'Weedle', dexId: 13 }
    const pikachu = { name: 'Pikachu', dexId: 25 }
    const species = [common, cocoon, common, common, cocoon, cocoon, uncommon, rare, pikachu, pikachu]
    const levels = [4, 5, 3, 5, 4, 6, 4, 3, 3, 5]
    return {
        versionId, method: 'grass', denominator: 256,
        sourceIds: ['forest-encounters', 'encounter-weights'],
        slots: species.map((pokemon, index) => ({
            id: `${versionId}-forest-slot-${index}`, ...pokemon, level: levels[index], weight: weights[index],
        })),
    }
}

export const VIRIDIAN_FOREST_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-viridian-forest', guideId: 'red-blue', stopId: 'viridian-forest',
    versionIds: ['red', 'blue'], title: 'Viridian Forest', releaseScope,
    coverage: 'All five source-listed ground pickups, both grass encounter tables, and all three trainer parties/levels. Navigation is an overview, not a turn-by-turn path.',
    limitations: [
        'Source-checked, not play-through verified. Trainer moves and non-battling NPC dialogue are not covered.',
        'This covers the forest interior only, not Route 2, the gate buildings, or every optional activity nearby.',
    ],
    sources: [
        source('forest-objects', 'data/maps/objects/ViridianForest.asm', 'Forest pickups, trainers and gates', 'ViridianForest_Object object/warp events'),
        source('route-2-links', 'data/maps/headers/Route2.asm', 'Route 2 connections', 'North to Pewter City; south to Viridian City'),
        source('route-2-gates', 'data/maps/objects/Route2.asm', 'Route 2 gate entrances', 'Warps to the north/south forest gate buildings'),
        source('forest-north-gate', 'data/maps/objects/ViridianForestNorthGate.asm', 'Northern gate connections', 'Warps between Route 2 and Viridian Forest'),
        source('forest-south-gate', 'data/maps/objects/ViridianForestSouthGate.asm', 'Southern gate connections', 'Warps between Route 2 and Viridian Forest'),
        source('forest-hidden', 'data/events/hidden_events.asm', 'Hidden forest pickups', 'hidden_events_for VIRIDIAN_FOREST'),
        source('hidden-interaction', 'engine/overworld/hidden_events.asm', 'Hidden-item interaction', 'CheckIfCoordsInFrontOfPlayerMatch'),
        source('forest-dimensions', 'constants/map_constants.asm', 'Forest coordinate bounds', 'VIRIDIAN_FOREST: 17 × 24 map blocks = 34 × 48 movement squares'),
        source('forest-encounters', 'data/wild/maps/ViridianForest.asm', 'Red/Blue forest encounters', 'ViridianForestWildMons; _RED and _BLUE branches'),
        source('encounter-weights', 'data/wild/probabilities.asm', 'Encounter slot weights', 'WildMonEncounterSlotChances; total 256'),
        source('encounter-engine', 'engine/battle/wild_encounters.asm', 'Encounter conditions', 'TryDoWildEncounter terrain/rate/slot checks'),
        source('trainer-parties', 'data/trainers/parties.asm', 'Forest trainer parties', 'BugCatcherData: first three parties'),
    ],
    directions: [
        { id: 'forest-enter', text: 'Enter the forest from Route 2 through the southern gate. The north exit is at the forest’s northwest edge; follow the winding paths rather than assuming a straight route.', sourceIds: ['forest-objects', 'route-2-gates', 'forest-south-gate'] },
        { id: 'forest-explore', text: 'Optional: explore for the five pickups and Bug Pokémon listed below. Trainer parties are shown separately so you can prepare before approaching them.', sourceIds: ['forest-objects', 'forest-hidden', 'forest-encounters', 'trainer-parties'] },
        { id: 'forest-exit', text: 'Leave through the northern gate to continue toward Pewter City via Route 2. The item locator below does not show walls, grass, or a walkable route.', sourceIds: ['forest-objects', 'forest-north-gate', 'route-2-gates', 'route-2-links'] },
    ],
    items: [
        { id: 'forest-visible-antidote', name: 'Antidote', quantity: 1, kind: 'visible', position: { x: 25, y: 11 }, location: 'Northeastern dead end; item ball at (25, 11).', requirements: 'No field move required; keep room in your Bag.', sourceIds: ['forest-objects'] },
        { id: 'forest-visible-potion', name: 'Potion', quantity: 1, kind: 'visible', position: { x: 12, y: 29 }, location: 'Interior dead-end branch; item ball at (12, 29).', requirements: 'No field move required; keep room in your Bag.', sourceIds: ['forest-objects'] },
        { id: 'forest-visible-poke-ball', name: 'Poké Ball', quantity: 1, kind: 'visible', position: { x: 1, y: 31 }, location: 'Western dead end; item ball at (1, 31).', requirements: 'No field move required; keep room in your Bag.', sourceIds: ['forest-objects'] },
        { id: 'forest-hidden-potion', name: 'Potion', quantity: 1, kind: 'hidden', position: { x: 1, y: 18 }, location: 'Examine the square immediately west of Bug Catcher 3, at (1, 18).', requirements: 'Face the marked square and press A; no Itemfinder required. Keep Bag space.', sourceIds: ['forest-hidden', 'hidden-interaction'] },
        { id: 'forest-hidden-antidote', name: 'Antidote', quantity: 1, kind: 'hidden', position: { x: 16, y: 42 }, location: 'Examine the southwestern square of the isolated tree north of the south gate, at (16, 42).', requirements: 'Face the marked square and press A; no Itemfinder required. Keep Bag space.', sourceIds: ['forest-hidden', 'hidden-interaction'] },
    ],
    encounters: [encounters('red'), encounters('blue')],
    encountersNote: 'These are encounter-slot chances after an encounter is generated, assuming a uniform random byte—not catch rates or chances per step. Fractions are the game’s exact slot weights; percentages are rounded. Some apparent grass tiles do not generate encounters. No water encounters are configured here.',
    trainers: [
        { id: 'forest-bug-catcher-1', name: 'Bug Catcher 1', role: 'trainer', position: { x: 30, y: 33 }, party: [member('slot-1', 'Weedle', 13, 6), member('slot-2', 'Caterpie', 10, 6)], sourceIds: ['forest-objects', 'trainer-parties'] },
        { id: 'forest-bug-catcher-2', name: 'Bug Catcher 2', role: 'trainer', position: { x: 30, y: 19 }, party: [member('slot-1', 'Weedle', 13, 7), member('slot-2', 'Kakuna', 14, 7), member('slot-3', 'Weedle', 13, 7)], sourceIds: ['forest-objects', 'trainer-parties'] },
        { id: 'forest-bug-catcher-3', name: 'Bug Catcher 3', role: 'trainer', position: { x: 2, y: 18 }, party: [member('slot-1', 'Weedle', 13, 9)], sourceIds: ['forest-objects', 'trainer-parties'] },
    ],
    advice: [
        { id: 'forest-version-difference', text: 'Red favors Weedle and Kakuna; Blue favors Caterpie and Metapod. Both versions also have the other line and Pikachu. Pidgey is not in these forest encounter tables.', sourceIds: ['forest-encounters'] },
        { id: 'forest-hidden-help', text: 'Hidden items have no visible Poké Ball. Inspect the marked square from an adjacent square; do not stand on the marked square and expect it to be collected automatically.', sourceIds: ['forest-hidden', 'hidden-interaction'] },
    ],
    warnings: [],
    locator: {
        kind: 'coordinate-plot', width: 34, height: 48,
        description: 'Original item-coordinate diagram, not an in-game map or pathfinding guide. Coordinates are zero-based 16-pixel movement squares from the northwest corner: x increases east, y increases south. Hidden markers show the square to examine, not where to stand. Walls and terrain are omitted.',
        gates: [
            { id: 'forest-north-gate', label: 'North gate (x 1–2, y 0)', position: { x: 1, y: 0 } },
            { id: 'forest-south-gate', label: 'South gate (x 15–18, y 47)', position: { x: 16, y: 47 } },
        ],
        sourceIds: ['forest-objects', 'forest-hidden', 'hidden-interaction', 'forest-dimensions'],
    },
}

export const PEWTER_GYM_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-pewter-gym', guideId: 'red-blue', stopId: 'gym-1-pewter',
    versionIds: ['red', 'blue'], title: 'Pewter Gym — Brock', releaseScope,
    coverage: 'Both gym trainer parties/levels, Brock’s moves, battle rewards, and completionist warnings. Not a complete Pewter City location guide.',
    limitations: [
        'Battle preparation is advice inferred from Gen I mechanics, not a guaranteed outcome or a simulator result.',
        'Source-checked, not play-through verified. The ordinary trainer’s moves, town shops, museum and other city content are not audited here.',
    ],
    sources: [
        source('gym-events', 'scripts/PewterGym.asm', 'Brock rewards and missable battles', 'PewterGymScriptReceiveTM34; .gymVictory; PewterGymBrockText'),
        source('gym-objects', 'data/maps/objects/PewterGym.asm', 'Gym trainer identities', 'OPP_JR_TRAINER_M and Brock object events'),
        source('gym-parties', 'data/trainers/parties.asm', 'Gym parties and levels', 'JrTrainerMData first party; BrockData'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Red/Blue move levels', 'Bulbasaur, Squirtle, Caterpie, Metapod, Butterfree, Geodude and Onix learnsets'),
        source('geodude-base', 'data/pokemon/base_stats/geodude.asm', 'Geodude starting moves and typing', 'Tackle; Rock/Ground (Defense Curl comes from the level-11 learnset)'),
        source('onix-base', 'data/pokemon/base_stats/onix.asm', 'Onix starting moves and typing', 'Tackle, Screech; Rock/Ground'),
        source('brock-special-move', 'data/trainers/special_moves.asm', 'Brock’s special move', 'LoneMoves: Brock, Bide'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Trainer moves and prize calculation', '.AddLoneMove; .FinishUp / .LastLoop prize calculation'),
        source('type-matchups', 'data/types/type_matchups.asm', 'Gen I type effectiveness', 'Grass/Water versus Rock/Ground; Electric versus Ground; Normal versus Rock'),
        source('bide-effect', 'engine/battle/effects.asm', 'Bide setup', 'BideEffect'),
        source('battle-core', 'engine/battle/core.asm', 'Bide damage execution', 'ExecuteEnemyMove: .checkIfUsingBide / .unleashEnergy'),
        source('trainer-rewards', 'data/trainers/pic_pointers_money.asm', 'Trainer prize base', 'Brock base prize money'),
    ],
    directions: [
        { id: 'pewter-prepare', text: 'Before challenging Brock, check the missable-battle warnings below. Prepare a move that works against Rock/Ground rather than relying on your Pokémon’s type alone.', sourceIds: ['gym-events', 'type-matchups'] },
        { id: 'pewter-battle-brock', text: 'Challenge Brock in Pewter Gym. His team is Geodude level 12 and Onix level 14; both are Rock/Ground.', sourceIds: ['gym-parties', 'geodude-base', 'onix-base'] },
        { id: 'pewter-collect-rewards', text: 'After winning, collect the Boulder Badge and TM34 Bide. If your Bag was full, make space and speak to Brock again for the TM.', sourceIds: ['gym-events'] },
    ],
    items: [
        { id: 'brock-boulder-badge', name: 'Boulder Badge', quantity: 1, kind: 'reward', location: 'Defeat Brock.', requirements: 'Win the gym leader battle.', sourceIds: ['gym-events'] },
        { id: 'brock-tm34-bide', name: 'TM34 Bide', quantity: 1, kind: 'reward', location: 'Brock after victory; speak again if your Bag was full.', requirements: 'Defeat Brock and have room in your Bag.', sourceIds: ['gym-events'] },
        { id: 'brock-prize-money', name: 'Prize money (₽)', quantity: 1386, kind: 'reward', location: 'Received for defeating Brock.', requirements: 'Win the gym leader battle.', sourceIds: ['gym-parties', 'trainer-rewards', 'trainer-moves'] },
    ],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside Pewter Gym. This does not describe encounters elsewhere in Pewter City or Route 2.',
    trainers: [
        { id: 'pewter-jr-trainer', name: 'Jr. Trainer♂', role: 'trainer', position: { x: 3, y: 6 }, party: [member('slot-1', 'Diglett', 50, 11), member('slot-2', 'Sandshrew', 27, 11)], sourceIds: ['gym-objects', 'gym-parties'] },
        { id: 'pewter-brock', name: 'Brock', role: 'leader', position: { x: 4, y: 1 }, party: [member('slot-1', 'Geodude', 74, 12, ['Tackle', 'Defense Curl']), member('slot-2', 'Onix', 95, 14, ['Tackle', 'Screech', 'Bide'])], sourceIds: ['gym-parties', 'level-moves', 'geodude-base', 'onix-base', 'brock-special-move', 'trainer-moves'] },
    ],
    warnings: [
        { id: 'pewter-missable-gym-trainer', text: 'Completionist warning: battle the Jr. Trainer before Brock if you want his battle experience and money. Defeating Brock disables that trainer’s battle even if you skipped him.', sourceIds: ['gym-events'] },
        { id: 'pewter-missable-rival', text: 'The early optional Route 22 rival battle also disappears when you defeat Brock. Complete it first if you want every available trainer battle.', sourceIds: ['gym-events'] },
    ],
    advice: [
        { id: 'brock-grass-water', text: 'Bulbasaur learns Vine Whip at level 13; Squirtle learns Bubble at level 8. Grass and Water attacks are 4× effective against Brock’s Rock/Ground Pokémon.', sourceIds: ['level-moves', 'type-matchups', 'geodude-base', 'onix-base'] },
        { id: 'brock-butterfree', text: 'For a Charmander team, Butterfree is an option: Caterpie evolves at 7, Metapod at 10, but Butterfree learns Confusion at 12 in Red/Blue—not immediately on evolving at 10. Confusion deals neutral special damage.', sourceIds: ['level-moves', 'type-matchups'] },
        { id: 'brock-resistances', text: 'Pikachu’s Electric attacks cannot damage these Ground types. Normal attacks such as Scratch and Tackle are resisted by Rock; Fire is also resisted.', sourceIds: ['type-matchups', 'geodude-base', 'onix-base'] },
        { id: 'brock-bide', text: 'Watch for Onix’s Bide: it stores damage and returns twice the stored amount. Avoid dealing more direct damage while it stores energy unless you can finish the battle safely. This is preparation advice, not a guaranteed strategy.', sourceIds: ['bide-effect', 'battle-core'] },
    ],
    starterHints: [
        { id: 'brock-starter-bulbasaur', starterDexId: 1, text: 'Bulbasaur learns Vine Whip at level 13. This Grass attack is 4× effective against both of Brock’s Pokémon.', sourceIds: ['level-moves', 'type-matchups', 'geodude-base', 'onix-base'] },
        { id: 'brock-starter-charmander', starterDexId: 4, text: 'Charmander’s Fire and Normal attacks are resisted. Consider raising Caterpie into Butterfree, then reach level 12 for Confusion; evolving at level 10 does not teach it in Red/Blue.', sourceIds: ['level-moves', 'type-matchups'] },
        { id: 'brock-starter-squirtle', starterDexId: 7, text: 'Squirtle learns Bubble at level 8. This Water attack is 4× effective against both of Brock’s Pokémon.', sourceIds: ['level-moves', 'type-matchups', 'geodude-base', 'onix-base'] },
    ],
}

export const RED_BLUE_LOCATIONS = [VIRIDIAN_FOREST_LOCATION, PEWTER_GYM_LOCATION, ROUTE_3_MT_MOON_LOCATION, CERULEAN_LOCATION, VERMILION_LOCATION, VERMILION_GYM_LOCATION, ...RED_BLUE_MIDGAME_LOCATIONS, SAFFRON_STORY_LOCATION, FUCHSIA_STORY_LOCATION, SABRINA_GYM_LOCATION, CINNABAR_STORY_LOCATION, VIRIDIAN_GYM_STORY_LOCATION, VICTORY_ROAD_STORY_LOCATION, LORELEI_STORY_LOCATION, BRUNO_STORY_LOCATION, AGATHA_STORY_LOCATION, LANCE_STORY_LOCATION, CHAMPION_STORY_LOCATION]
