import type { GuideLocation } from '../location-schema'

// One story route across Route 22, Route 23 and the three cave floors. The
// published stop and save key stay unchanged; optional cave loot is deferred.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
type Party = NonNullable<GuideLocation['starterBattles']>[number]['variants'][number]['party']
function party(members: [string, number, number][]): Party {
    return members.map(([name, dexId, level], index) => ({ id: `slot-${index + 1}`, name, dexId, level, moves: [] }))
}

export const VICTORY_ROAD_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-victory-road-story', guideId: 'red-blue', stopId: 'victory-road',
    versionIds: [...versions], title: 'Route 22, Route 23 & Victory Road',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Second Route 22 rival battle, eight badge checks, required Surf/Strength passage through Victory Road and exit to Indigo Plateau.',
    limitations: ['Source-checked, not play-through verified. Directions use floor landmarks and switch targets, not every walking input.', 'Optional cave items, wild encounter tables, ordinary trainer parties and Moltres are outside this story-path audit.'],
    sources: [
        source('giovanni-event', 'scripts/ViridianGym.asm', 'Giovanni victory enables the second Route 22 rival event.'),
        source('route-22', 'scripts/Route22.asm', 'Second rival trigger and starter-to-Rival2Data party indices 10–12.'),
        source('route-22-map', 'data/maps/objects/Route22.asm', 'Route 22 rival stands before the reception gate.'),
        source('rival-parties', 'data/trainers/parties.asm', 'Rival2Data Route 22 rows: three complete six-Pokémon parties.'),
        source('reception', 'scripts/Route22Gate.asm', 'Reception guard checks the Boulder Badge.'),
        source('route-23', 'scripts/Route23.asm', 'Seven further badge checks, south-to-north, and cave switch reset on return.'),
        source('route-23-map', 'data/maps/objects/Route23.asm', 'Reception exit, seven guards, 1F cave entrance and 2F cave exit.'),
        source('field-moves', 'engine/menus/start_sub_menus.asm', 'Field Surf requires Soul Badge; field Strength requires Rainbow Badge.'),
        source('road-1-map', 'data/maps/objects/VictoryRoad1F.asm', 'Entrance, first boulder and northwest stair to 2F.'),
        source('road-1-script', 'scripts/VictoryRoad1F.asm', 'First boulder switch at (17,13) opens the 1F barrier.'),
        source('road-2-map', 'data/maps/objects/VictoryRoad2F.asm', 'Initial boulder, 3F stairs, dropped boulder and eastern Route 23 exit.'),
        source('road-2-script', 'scripts/VictoryRoad2F.asm', '2F switches at (1,16) and (9,16); second opens final barrier.'),
        source('road-3-map', 'data/maps/objects/VictoryRoad3F.asm', 'North-east boulder, south-east hole boulder and 2F stairs.'),
        source('road-3-script', 'scripts/VictoryRoad3F.asm', '3F switch at (3,5); hole at (23,15) drops boulder to 2F.'),
        source('route-23-header', 'data/maps/headers/Route23.asm', 'North of Route 23 connects to Indigo Plateau.'),
    ],
    directions: [
        note('road-prepare', 'After Giovanni, heal in Viridian City. Bring Pokémon that know Surf and Strength, with the Soul and Rainbow Badges for field use. Head west along Route 22 toward the Pokémon League reception gate.', 'giovanni-event', 'route-22-map', 'field-moves'),
        note('road-rival', 'The second Route 22 rival challenges you before the gate. His six-Pokémon party depends on your original starter; use the party preview below. This fight is on Route 22, before Victory Road.', 'route-22', 'route-22-map', 'rival-parties'),
        note('road-badges', 'The reception gate checks your Boulder Badge. Continue north on Route 23 for the remaining checks, in order: Cascade, Thunder, Rainbow, Soul, Marsh, Volcano and Earth Badges. Surf across the water sections, then enter Victory Road through the western cave entrance.', 'reception', 'route-23', 'route-23-map', 'field-moves'),
        note('road-1f', 'On 1F, use Strength to push the boulder near the entrance east and around onto its floor switch. Once the barrier opens, take the northwest stair up to 2F.', 'road-1-map', 'road-1-script', 'field-moves'),
        note('road-2f-first', 'On 2F, push the first boulder near the arrival stair southwest onto its switch. Cross the opened ridge and take the northeast stair to 3F.', 'road-2-map', 'road-2-script'),
        note('road-3f', 'On 3F, push the boulder near the northeast stair west to the switch in the northwest. Cross the opened southern ridge. Push the southeastern boulder into the nearby hole, then drop through that hole to 2F.', 'road-3-map', 'road-3-script'),
        note('road-2f-exit', 'Back on 2F, push the fallen boulder west onto the second switch to open the final barrier. Take the nearby stair up to 3F, then the next stair down to the eastern part of 2F. Leave through its east exit to Route 23, and follow the path north to Indigo Plateau.', 'road-2-map', 'road-2-script', 'road-3-map', 'route-23-map', 'route-23-header'),
    ],
    items: [],
    encounters: [],
    encountersHeading: 'Wild Pokémon — Victory Road encounters not audited',
    encountersNote: 'Victory Road has wild encounters. This story-path guide does not list cave encounter tables; the empty list does not mean the cave is encounter-free.',
    trainers: [],
    starterBattles: [{
        id: 'route-22-rival', name: 'Rival · Route 22', description: 'The second Route 22 battle after Giovanni; choose your original starter for the exact Red/Blue party.',
        sourceIds: ['route-22', 'rival-parties'], variants: [
            { playerStarterDexId: 1, party: party([['Pidgeot',18,47],['Rhyhorn',111,45],['Growlithe',58,45],['Exeggcute',102,47],['Alakazam',65,50],['Blastoise',9,53]]) },
            { playerStarterDexId: 4, party: party([['Pidgeot',18,47],['Rhyhorn',111,45],['Gyarados',130,45],['Growlithe',58,47],['Alakazam',65,50],['Venusaur',3,53]]) },
            { playerStarterDexId: 7, party: party([['Pidgeot',18,47],['Rhyhorn',111,45],['Exeggcute',102,45],['Gyarados',130,47],['Alakazam',65,50],['Charizard',6,53]]) },
        ],
    }],
    advice: [
        note('road-rival-prep', 'Heal before Route 22. The rival’s final starter is Lv. 53, and each party also has a Lv. 50 Alakazam. Use the starter preview to plan for the two changing middle slots.', 'rival-parties'),
        note('road-supplies', 'Restock healing items before entering the cave. The route has trainer battles and wild encounters, and the required boulder work spans all three floors.', 'road-1-map', 'road-2-map', 'road-3-map'),
    ],
    warnings: [
        note('road-reset', 'Leaving Victory Road for Route 23 resets the 2F and 3F boulder-switch progress. Plan to finish the cave passage in one trip, or redo those switches when you return.', 'route-23', 'road-2-script', 'road-3-script'),
        note('road-cave-fights', 'This route shows the required puzzle path, not every cave trainer or wild Pokémon. Expect battles while following it.', 'road-1-map', 'road-2-map', 'road-3-map'),
    ],
}
