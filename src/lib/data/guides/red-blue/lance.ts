import type { GuideLocation } from '../location-schema'

// Fourth published Elite Four stop. The trainer loader gives Barrier only to
// Dragonite's third move slot; the two Dragonair keep Dragon Rage there.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
function member(id: string, name: string, dexId: number, level: number, moves: string[]): GuideLocation['trainers'][number]['party'][number] {
    return { id, name, dexId, level, moves }
}

export const LANCE_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-lance-story', guideId: 'red-blue', stopId: 'elite-four-lance',
    versionIds: [...versions], title: 'Indigo Plateau — Lance',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Fourth Elite Four room and locked approach, exact five-Pokémon party and moves, Gen I matchups and Champion handoff.',
    limitations: ['Source-checked, not play-through verified. This stop covers Lance only; the Champion awaits a separate battle audit.', 'Battle advice is type and move preparation, not a guaranteed winning team or full AI simulation.'],
    sources: [
        source('agatha-map', 'data/maps/objects/AgathasRoom.asm', 'North exit from Agatha leads into Lance’s room.'),
        source('lance-map', 'data/maps/objects/LancesRoom.asm', 'Entry staircase at (24,16), Lance at (6,1), north doors to Champion’s room.'),
        source('lance-script', 'scripts/LancesRoom.asm', 'Entry staircase starts a scripted walk; approach seals the entrance; Lance victory sets the beat event.'),
        source('lance-text', 'text/LancesRoom.asm', 'After defeat, Lance identifies the rival as the real Champion.'),
        source('parties', 'data/trainers/parties.asm', 'LanceData: Gyarados 58, two Dragonair 56, Aerodactyl 60, Dragonite 62.'),
        source('gyarados-base', 'data/pokemon/base_stats/gyarados.asm', 'Water/Flying; starting moves.'),
        source('dragonair-base', 'data/pokemon/base_stats/dragonair.asm', 'Dragon; starting moves.'),
        source('aerodactyl-base', 'data/pokemon/base_stats/aerodactyl.asm', 'Rock/Flying; starting moves.'),
        source('dragonite-base', 'data/pokemon/base_stats/dragonite.asm', 'Dragon/Flying; starting moves.'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Level-up moves through each party member’s trainer level.'),
        source('move-generation', 'engine/pokemon/evos_moves.asm', 'WriteMonMoves skips known moves and shifts the oldest when full.'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Special-level party generation and TeamMoves replacement in fifth Pokémon’s third move slot.'),
        source('team-moves', 'data/trainers/special_moves.asm', 'Lance’s fifth Pokémon receives Barrier in its third move slot.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Ice versus Dragon/Flying, Electric versus Water/Flying and Rock/Flying, Water versus Rock/Flying.'),
        source('lance-ai', 'engine/battle/trainer_ai.asm', 'Lance may use a Hyper Potion at low HP.'),
    ],
    directions: [
        note('lance-entry', 'After Agatha, heal with the items you carried into the League and take her north door. Lance’s room starts at an eastern staircase; stepping onto it walks you through the long hall. The entrance closes as you approach Lance, so prepare before moving in.', 'agatha-map', 'lance-map', 'lance-script'),
        note('lance-party', 'Lance uses Gyarados Lv. 58, two Dragonair Lv. 56, Aerodactyl Lv. 60 and Dragonite Lv. 62. The cards below show their exact Red/Blue moves. Only Dragonite gets Barrier as the special trainer move; both Dragonair keep Dragon Rage.', 'parties', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves'),
        note('lance-onward', 'After defeating Lance, heal with your own items. His north doorway leads to the Champion’s room. Lance reveals that your rival beat the Elite Four first and is the final opponent.', 'lance-map', 'lance-text'),
    ],
    items: [],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside Lance’s room.',
    trainers: [{ id: 'lance', name: 'Lance · Elite Four', role: 'boss', party: [
        member('slot-1', 'Gyarados', 130, 58, ['Dragon Rage', 'Leer', 'Hydro Pump', 'Hyper Beam']),
        member('slot-2', 'Dragonair', 148, 56, ['Agility', 'Slam', 'Dragon Rage', 'Hyper Beam']),
        member('slot-3', 'Dragonair', 148, 56, ['Agility', 'Slam', 'Dragon Rage', 'Hyper Beam']),
        member('slot-4', 'Aerodactyl', 142, 60, ['Supersonic', 'Bite', 'Take Down', 'Hyper Beam']),
        member('slot-5', 'Dragonite', 149, 62, ['Agility', 'Slam', 'Barrier', 'Hyper Beam']),
    ], sourceIds: ['lance-map', 'parties', 'gyarados-base', 'dragonair-base', 'aerodactyl-base', 'dragonite-base', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves'] }],
    advice: [
        note('lance-ice', 'Ice attacks are 2× effective against both Dragonair and 4× effective against Dragonite’s Dragon/Flying typing. They also hit Aerodactyl’s Flying type super effectively, but are neutral against Water/Flying Gyarados.', 'matchups', 'dragonair-base', 'dragonite-base', 'aerodactyl-base', 'gyarados-base'),
        note('lance-other-matchups', 'Electric attacks are 4× effective against Gyarados. Water and Electric attacks are 2× effective against Rock/Flying Aerodactyl. Ground attacks miss Gyarados, Aerodactyl and Dragonite because they are Flying type.', 'matchups', 'gyarados-base', 'aerodactyl-base', 'dragonite-base'),
        note('lance-moves', 'All five opponents know Hyper Beam. Dragonite may raise its Defense with Barrier, and Lance may use a Hyper Potion on a low-HP Pokémon. Plan for the whole five-member team, not only Dragonite.', 'parties', 'level-moves', 'move-generation', 'team-moves', 'lance-ai'),
    ],
    warnings: [
        note('lance-no-return', 'Lance’s entrance closes during the approach. Finish healing and choose your lead before entering from Agatha’s room.', 'lance-script', 'lance-map'),
        note('lance-final-battle', 'Lance is the fourth Elite Four member, but the League challenge continues with your rival as Champion. Keep enough healing items for one more battle.', 'lance-text', 'lance-map'),
    ],
}
