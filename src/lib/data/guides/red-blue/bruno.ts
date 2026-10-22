import type { GuideLocation } from '../location-schema'

// Bruno occupies the published second Elite Four stop. Move cards derive from
// the Red/Blue trainer loader; only Machamp receives the Fissure override.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
function member(id: string, name: string, dexId: number, level: number, moves: string[]): GuideLocation['trainers'][number]['party'][number] {
    return { id, name, dexId, level, moves }
}

export const BRUNO_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-bruno-story', guideId: 'red-blue', stopId: 'elite-four-bruno',
    versionIds: [...versions], title: 'Indigo Plateau — Bruno',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Second Elite Four room, exact five-Pokémon party and moves, Red/Blue matchups, Fissure/X Defend warning and Agatha handoff.',
    limitations: ['Source-checked, not play-through verified. This stop covers Bruno only; Agatha, Lance and Champion battles await separate audits.', 'Battle advice is type and move preparation, not a guaranteed winning team or full AI simulation.'],
    sources: [
        source('lorelei-map', 'data/maps/objects/LoreleisRoom.asm', 'North exit from Lorelei leads into Bruno’s room.'),
        source('bruno-map', 'data/maps/objects/BrunosRoom.asm', 'Bruno at (5,2); south to Lorelei, north to Agatha.'),
        source('bruno-script', 'scripts/BrunosRoom.asm', 'Entry auto-walk, blocked south exit and north barrier cleared after victory.'),
        source('bruno-text', 'text/BrunosRoom.asm', 'Do not run away message; Bruno directs the player onward after defeat.'),
        source('parties', 'data/trainers/parties.asm', 'BrunoData: Onix 53, Hitmonchan 55, Hitmonlee 55, Onix 56, Machamp 58.'),
        source('onix-base', 'data/pokemon/base_stats/onix.asm', 'Rock/Ground; starting moves.'),
        source('hitmonchan-base', 'data/pokemon/base_stats/hitmonchan.asm', 'Fighting; starting moves.'),
        source('hitmonlee-base', 'data/pokemon/base_stats/hitmonlee.asm', 'Fighting; starting moves.'),
        source('machamp-base', 'data/pokemon/base_stats/machamp.asm', 'Fighting; starting moves.'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Level-up moves through each party member’s trainer level.'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Special-level party generation and TeamMoves replacement in fifth Pokémon’s third move slot.'),
        source('team-moves', 'data/trainers/special_moves.asm', 'Bruno’s fifth Pokémon receives Fissure in its third move slot.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Water/Grass versus Rock and Ground; Psychic/Flying versus Fighting; Rock versus Flying.'),
        source('fissure-effect', 'engine/battle/move_effects/one_hit_ko.asm', 'Fissure can cause a one-hit knockout when it hits.'),
        source('bruno-ai', 'engine/battle/trainer_ai.asm', 'Bruno may use X Defend.'),
    ],
    directions: [
        note('bruno-entry', 'After Lorelei, heal with the items you carried into the League. Take her north door into Bruno’s room. You are walked inside and cannot return through its south exit.', 'lorelei-map', 'bruno-map', 'bruno-script', 'bruno-text'),
        note('bruno-party', 'Bruno uses Onix Lv. 53, Hitmonchan Lv. 55, Hitmonlee Lv. 55, a second Onix Lv. 56 and Machamp Lv. 58. The cards below show each Pokémon’s exact Red/Blue moves; Machamp has Fissure in its third move slot.', 'parties', 'level-moves', 'trainer-moves', 'team-moves'),
        note('bruno-onward', 'After defeating Bruno, use your own healing items before continuing. The north door opens into Agatha’s room, the next League battle.', 'bruno-script', 'bruno-map', 'bruno-text'),
    ],
    items: [],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside Bruno’s room.',
    trainers: [{ id: 'bruno', name: 'Bruno · Elite Four', role: 'boss', party: [
        member('slot-1', 'Onix', 95, 53, ['Rock Throw', 'Rage', 'Slam', 'Harden']),
        member('slot-2', 'Hitmonchan', 107, 55, ['Ice Punch', 'ThunderPunch', 'Mega Punch', 'Counter']),
        member('slot-3', 'Hitmonlee', 106, 55, ['Jump Kick', 'Focus Energy', 'Hi Jump Kick', 'Mega Kick']),
        member('slot-4', 'Onix', 95, 56, ['Rock Throw', 'Rage', 'Slam', 'Harden']),
        member('slot-5', 'Machamp', 68, 58, ['Leer', 'Focus Energy', 'Fissure', 'Submission']),
    ], sourceIds: ['bruno-map', 'parties', 'onix-base', 'hitmonchan-base', 'hitmonlee-base', 'machamp-base', 'level-moves', 'trainer-moves', 'team-moves'] }],
    advice: [
        note('bruno-onix-matchups', 'Water and Grass attacks are 4× effective against Bruno’s two Rock/Ground Onix. Psychic attacks hit Onix neutrally, while Flying attacks are resisted by their Rock typing.', 'matchups', 'onix-base'),
        note('bruno-fighting-matchups', 'Psychic and Flying attacks are super effective against Hitmonchan, Hitmonlee and Machamp, the three pure Fighting Pokémon. Switch plans when either Onix enters instead of treating one matchup as the whole team.', 'matchups', 'onix-base', 'hitmonchan-base', 'hitmonlee-base', 'machamp-base'),
        note('bruno-defend', 'Bruno may use X Defend during battle. Machamp’s moves include Submission and the one-hit KO move Fissure; do not give it unnecessary free turns.', 'bruno-ai', 'team-moves', 'fissure-effect', 'level-moves', 'trainer-moves'),
    ],
    warnings: [
        note('bruno-no-return', 'You cannot retreat south once inside Bruno’s room. Heal and choose your lead before crossing over from Lorelei.', 'bruno-script', 'bruno-text', 'lorelei-map'),
        note('bruno-fissure', 'Machamp carries Fissure in this Red/Blue battle. If it connects, it can knock out a Pokémon in one hit.', 'team-moves', 'trainer-moves', 'fissure-effect'),
    ],
}
