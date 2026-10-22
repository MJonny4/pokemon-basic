import type { GuideLocation } from '../location-schema'

// One League battle at the existing stop. Move lists follow the Red/Blue
// trainer-party generation routine, including Lapras's third-slot override.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
function member(id: string, name: string, dexId: number, level: number, moves: string[]): GuideLocation['trainers'][number]['party'][number] {
    return { id, name, dexId, level, moves }
}

export const LORELEI_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-lorelei-story', guideId: 'red-blue', stopId: 'elite-four-lorelei',
    versionIds: [...versions], title: 'Indigo Plateau — Lorelei',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'League lobby preparation, commitment to the Elite Four sequence, Lorelei’s exact party and moves, practical type advice and the onward door to Bruno.',
    limitations: ['Source-checked, not play-through verified. This stop covers Lorelei only; Bruno, Agatha, Lance and Champion battles await separate audits.', 'Battle advice is type and move preparation, not a guaranteed winning team or full AI simulation.'],
    sources: [
        source('plateau-map', 'data/maps/objects/IndigoPlateau.asm', 'Indigo Plateau entrance connects to the League lobby.'),
        source('lobby-map', 'data/maps/objects/IndigoPlateauLobby.asm', 'Lobby nurse, clerk and north door into Lorelei’s room.'),
        source('lobby-script', 'scripts/IndigoPlateauLobby.asm', 'Returning to the lobby after starting the League resets Elite Four events.'),
        source('lobby-mart', 'data/items/marts.asm', 'Lobby clerk sells Full Restore, Max Potion, Full Heal and Revive among other items.'),
        source('lobby-text', 'text/IndigoPlateauLobby.asm', 'League battles are consecutive; a loss restarts the challenge.'),
        source('lorelei-map', 'data/maps/objects/LoreleisRoom.asm', 'South lobby entrance, Lorelei at (5,2), north exit to Bruno’s room.'),
        source('lorelei-script', 'scripts/LoreleisRoom.asm', 'Entry auto-walk, blocked south exit and north barrier removed after victory.'),
        source('lorelei-text', 'text/LoreleisRoom.asm', 'Do not run away message; Lorelei directs the player onward after defeat.'),
        source('parties', 'data/trainers/parties.asm', 'LoreleiData: Dewgong 54, Cloyster 53, Slowbro 54, Jynx 56, Lapras 56.'),
        source('dewgong-base', 'data/pokemon/base_stats/dewgong.asm', 'Water/Ice; starting moves.'),
        source('cloyster-base', 'data/pokemon/base_stats/cloyster.asm', 'Water/Ice; starting moves.'),
        source('slowbro-base', 'data/pokemon/base_stats/slowbro.asm', 'Water/Psychic; starting moves.'),
        source('jynx-base', 'data/pokemon/base_stats/jynx.asm', 'Ice/Psychic; starting moves.'),
        source('lapras-base', 'data/pokemon/base_stats/lapras.asm', 'Water/Ice; starting moves.'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Level-up moves through each party member’s trainer level.'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Special-level party creation and TeamMoves replacement in fifth Pokémon’s third move slot.'),
        source('team-moves', 'data/trainers/special_moves.asm', 'Lorelei’s fifth Pokémon gets Blizzard in its third move slot.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Electric/Grass versus Water; Fire/Rock versus Ice; Ice versus Grass.'),
        source('lorelei-ai', 'engine/battle/trainer_ai.asm', 'Lorelei can use a Super Potion at low HP.'),
    ],
    directions: [
        note('lorelei-lobby', 'After Victory Road, enter the League building at Indigo Plateau. Heal with the lobby nurse and use its shop for Full Restores, Max Potions, Full Heals and Revives. Prepare your team and save before taking the north door.', 'plateau-map', 'lobby-map', 'lobby-mart'),
        note('lorelei-commit', 'The north doorway leads into Lorelei’s room, the first Elite Four battle. You are walked inside and cannot leave by the south exit. The remaining League battles follow in sequence; a loss returns you to the lobby and resets the challenge.', 'lobby-map', 'lobby-script', 'lobby-text', 'lorelei-map', 'lorelei-script'),
        note('lorelei-party', 'Lorelei uses Dewgong Lv. 54, Cloyster Lv. 53, Slowbro Lv. 54, Jynx Lv. 56 and Lapras Lv. 56. Her exact Red/Blue moves appear on the cards below; Lapras has Blizzard as its special trainer move.', 'parties', 'level-moves', 'trainer-moves', 'team-moves'),
        note('lorelei-next', 'After defeating Lorelei, heal your team with your own items. Her north door opens to Bruno’s room; the next battle is covered at the following stop.', 'lorelei-script', 'lorelei-map', 'lorelei-text'),
    ],
    items: [],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters in the League lobby or Lorelei’s room.',
    trainers: [{ id: 'lorelei', name: 'Lorelei · Elite Four', role: 'boss', party: [
        member('slot-1', 'Dewgong', 87, 54, ['Growl', 'Aurora Beam', 'Rest', 'Take Down']),
        member('slot-2', 'Cloyster', 91, 53, ['Supersonic', 'Clamp', 'Aurora Beam', 'Spike Cannon']),
        member('slot-3', 'Slowbro', 80, 54, ['Growl', 'Water Gun', 'Withdraw', 'Amnesia']),
        member('slot-4', 'Jynx', 124, 56, ['DoubleSlap', 'Ice Punch', 'Body Slam', 'Thrash']),
        member('slot-5', 'Lapras', 131, 56, ['Body Slam', 'Confuse Ray', 'Blizzard', 'Hydro Pump']),
    ], sourceIds: ['lorelei-map', 'parties', 'dewgong-base', 'cloyster-base', 'slowbro-base', 'jynx-base', 'lapras-base', 'level-moves', 'trainer-moves', 'team-moves'] }],
    advice: [
        note('lorelei-water-matchups', 'Electric and Grass attacks are super effective against Dewgong, Cloyster, Slowbro and Lapras because all four are Water type. Jynx is Ice/Psychic instead, so those attacks are neutral against it. Grass-type Pokémon also need care against the team’s Ice attacks.', 'matchups', 'dewgong-base', 'cloyster-base', 'slowbro-base', 'jynx-base', 'lapras-base'),
        note('lorelei-jynx', 'Fire or Rock attacks are super effective against Jynx’s Ice typing. Its four Red/Blue moves here are DoubleSlap, Ice Punch, Body Slam and Thrash; prepare for damage rather than a Lovely Kiss sleep move.', 'matchups', 'jynx-base', 'level-moves', 'trainer-moves'),
        note('lorelei-slowbro-lapras', 'Slowbro can raise its Special with Amnesia, so avoid giving it many free turns. Lapras brings Confuse Ray, Blizzard and Hydro Pump. Lorelei may also use a Super Potion on a low-HP Pokémon.', 'level-moves', 'trainer-moves', 'team-moves', 'lorelei-ai'),
    ],
    warnings: [
        note('lorelei-no-return', 'Finish healing, shopping and team preparation in the lobby. Lorelei’s south door will not let you retreat once you enter.', 'lobby-map', 'lorelei-script', 'lorelei-text'),
        note('lorelei-reset', 'A loss during the League sequence sends you back to the lobby and resets its battle progress. Plan supplies for all four Elite Four members and the Champion, not just Lorelei.', 'lobby-script', 'lobby-text'),
    ],
}
