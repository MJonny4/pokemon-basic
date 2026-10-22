import type { GuideLocation } from '../location-schema'

// Final published Red/Blue story stop. Every starter preview contains its
// entire six-member party; the trainer loader changes Pidgeot and the starter.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
type Party = NonNullable<GuideLocation['starterBattles']>[number]['variants'][number]['party']
type Member = [name: string, dexId: number, level: number, moves: string[]]
function party(members: Member[]): Party {
    return members.map(([name, dexId, level, moves], index) => ({ id: `slot-${index + 1}`, name, dexId, level, moves }))
}

export const CHAMPION_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-champion-story', guideId: 'red-blue', stopId: 'champion-rival',
    versionIds: [...versions], title: 'Indigo Plateau — Champion',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Final rival battle, three complete starter-dependent six-Pokémon parties and moves, Red/Blue matchups and Hall of Fame conclusion.',
    limitations: ['Source-checked, not play-through verified. This stop closes the main-story League route; postgame areas and collection goals are outside this audit.', 'Battle advice is type and move preparation, not a guaranteed winning team or full AI simulation.'],
    sources: [
        source('lance-map', 'data/maps/objects/LancesRoom.asm', 'North doorway from Lance leads into the Champion’s room.'),
        source('lance-text', 'text/LancesRoom.asm', 'Lance identifies the rival as the final Champion opponent.'),
        source('champion-map', 'data/maps/objects/ChampionsRoom.asm', 'Rival and Oak positions; north exit to Hall of Fame.'),
        source('champion-script', 'scripts/ChampionsRoom.asm', 'Forced entry walk and battle, starter-dependent Rival3Data row, Oak arrival and Hall of Fame walk.'),
        source('champion-text', 'text/ChampionsRoom.asm', 'Champion dialogue, victory and Oak’s Hall of Fame invitation.'),
        source('starter-choice', 'scripts/OaksLab.asm', 'Rival chooses Squirtle versus Charmander, Bulbasaur versus Squirtle, Charmander versus Bulbasaur.'),
        source('starter-constants', 'constants/pokemon_constants.asm', 'STARTER1 Charmander, STARTER2 Squirtle, STARTER3 Bulbasaur.'),
        source('parties', 'data/trainers/parties.asm', 'Rival3Data: all three complete six-member Champion parties and levels.'),
        source('pidgeot-base', 'data/pokemon/base_stats/pidgeot.asm', 'Normal/Flying; starting moves.'),
        source('alakazam-base', 'data/pokemon/base_stats/alakazam.asm', 'Psychic; starting moves.'),
        source('rhydon-base', 'data/pokemon/base_stats/rhydon.asm', 'Ground/Rock; starting moves.'),
        source('arcanine-base', 'data/pokemon/base_stats/arcanine.asm', 'Fire; starting moves.'),
        source('exeggutor-base', 'data/pokemon/base_stats/exeggutor.asm', 'Grass/Psychic; starting moves.'),
        source('gyarados-base', 'data/pokemon/base_stats/gyarados.asm', 'Water/Flying; starting moves.'),
        source('blastoise-base', 'data/pokemon/base_stats/blastoise.asm', 'Water; starting moves.'),
        source('venusaur-base', 'data/pokemon/base_stats/venusaur.asm', 'Grass/Poison; starting moves.'),
        source('charizard-base', 'data/pokemon/base_stats/charizard.asm', 'Fire/Flying; starting moves.'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Level-up moves through each party member’s trainer level.'),
        source('move-generation', 'engine/pokemon/evos_moves.asm', 'WriteMonMoves skips known moves and shifts the oldest when full.'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Rival3 gives Pidgeot Sky Attack and the final starter Blizzard, Mega Drain or Fire Blast in move slot three.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I type effectiveness for common and changing Champion team members.'),
        source('one-hit-ko', 'engine/battle/move_effects/one_hit_ko.asm', 'Horn Drill can knock out a target in one hit when it connects.'),
        source('champion-ai', 'engine/battle/trainer_ai.asm', 'Rival3 may use a Full Restore at low HP.'),
        source('hall-script', 'scripts/HallOfFame.asm', 'Oak escorts the player; Hall of Fame record and game save after victory.'),
        source('lobby-script', 'scripts/IndigoPlateauLobby.asm', 'Returning to the lobby after the League begins resets Elite Four events.'),
        source('lobby-text', 'text/IndigoPlateauLobby.asm', 'A League loss restarts the challenge.'),
    ],
    directions: [
        note('champion-entry', 'After Lance, heal and revive your team with the items you still carry. Take his north doorway only when ready: entering the Champion’s room walks you to your rival and begins the final battle.', 'lance-map', 'lance-text', 'champion-map', 'champion-script'),
        note('champion-choose-starter', 'Choose your original starter in the party preview below. Your rival’s whole team changes: the first three Pokémon stay Pidgeot, Alakazam and Rhydon, while the next two and his final evolved starter depend on your choice. All three complete Red/Blue parties and moves are shown.', 'starter-choice', 'starter-constants', 'champion-script', 'parties', 'trainer-moves'),
        note('champion-finish', 'After you win, Oak arrives and leads you to the Hall of Fame. The game records your team and saves before returning to its opening sequence. This completes the Red/Blue main story.', 'champion-script', 'champion-map', 'champion-text', 'hall-script'),
    ],
    items: [],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside the Champion’s room or Hall of Fame.',
    trainers: [],
    starterBattles: [{ id: 'champion-rival-battle', name: 'Rival · Champion', description: 'Choose the starter you originally picked. The preview follows your saved starter by default, and switching the preview does not change your save.',
        sourceIds: ['starter-choice', 'starter-constants', 'champion-script', 'parties', 'pidgeot-base', 'alakazam-base', 'rhydon-base', 'arcanine-base', 'exeggutor-base', 'gyarados-base', 'blastoise-base', 'venusaur-base', 'charizard-base', 'level-moves', 'move-generation', 'trainer-moves'],
        variants: [
            { playerStarterDexId: 1, party: party([
                ['Pidgeot', 18, 61, ['Whirlwind', 'Wing Attack', 'Sky Attack', 'Mirror Move']],
                ['Alakazam', 65, 59, ['Psybeam', 'Recover', 'Psychic', 'Reflect']],
                ['Rhydon', 112, 61, ['Tail Whip', 'Fury Attack', 'Horn Drill', 'Leer']],
                ['Exeggutor', 103, 61, ['Barrage', 'Hypnosis', 'Stomp']],
                ['Gyarados', 130, 63, ['Dragon Rage', 'Leer', 'Hydro Pump', 'Hyper Beam']],
                ['Charizard', 6, 65, ['Rage', 'Slash', 'Fire Blast', 'Fire Spin']],
            ]) },
            { playerStarterDexId: 4, party: party([
                ['Pidgeot', 18, 61, ['Whirlwind', 'Wing Attack', 'Sky Attack', 'Mirror Move']],
                ['Alakazam', 65, 59, ['Psybeam', 'Recover', 'Psychic', 'Reflect']],
                ['Rhydon', 112, 61, ['Tail Whip', 'Fury Attack', 'Horn Drill', 'Leer']],
                ['Arcanine', 59, 61, ['Roar', 'Ember', 'Leer', 'Take Down']],
                ['Exeggutor', 103, 63, ['Barrage', 'Hypnosis', 'Stomp']],
                ['Blastoise', 9, 65, ['Bite', 'Withdraw', 'Blizzard', 'Hydro Pump']],
            ]) },
            { playerStarterDexId: 7, party: party([
                ['Pidgeot', 18, 61, ['Whirlwind', 'Wing Attack', 'Sky Attack', 'Mirror Move']],
                ['Alakazam', 65, 59, ['Psybeam', 'Recover', 'Psychic', 'Reflect']],
                ['Rhydon', 112, 61, ['Tail Whip', 'Fury Attack', 'Horn Drill', 'Leer']],
                ['Gyarados', 130, 61, ['Dragon Rage', 'Leer', 'Hydro Pump', 'Hyper Beam']],
                ['Arcanine', 59, 63, ['Roar', 'Ember', 'Leer', 'Take Down']],
                ['Venusaur', 3, 65, ['Razor Leaf', 'Growth', 'Mega Drain', 'SolarBeam']],
            ]) },
        ],
    }],
    advice: [
        note('champion-common', 'Across all three teams, Electric, Ice or Rock attacks are super effective against Pidgeot; Water and Grass are 4× effective against Rhydon. Bug attacks are super effective against Alakazam, which also knows Psychic and Recover.', 'matchups', 'pidgeot-base', 'rhydon-base', 'alakazam-base', 'level-moves', 'trainer-moves'),
        note('champion-changing', 'Check the two changing middle slots. Electric attacks are 4× effective against Gyarados; Fire or Ice hits Exeggutor super effectively; Water hits Arcanine super effectively. No single type covers every version of this team.', 'matchups', 'gyarados-base', 'exeggutor-base', 'arcanine-base'),
        note('champion-starter-matchups', 'For the final Pokémon: Rock attacks are 4× effective against Charizard, Electric or Grass attacks are 2× effective against Blastoise, and Fire, Ice or Psychic attacks are 2× effective against Venusaur. Check the preview for your actual final opponent.', 'matchups', 'charizard-base', 'blastoise-base', 'venusaur-base'),
        note('champion-special-moves', 'Pidgeot has Sky Attack; Rhydon has Horn Drill, a one-hit-KO move if it connects. The final starter gets Fire Blast on Charizard, Blizzard on Blastoise or Mega Drain on Venusaur. Your rival may use a Full Restore at low HP.', 'trainer-moves', 'parties', 'level-moves', 'one-hit-ko', 'champion-ai'),
    ],
    warnings: [
        note('champion-commit', 'The Champion battle starts as you enter. Heal and choose your lead in Lance’s room first; a League loss sends you back to the lobby to restart its battle sequence.', 'champion-script', 'lance-map', 'lobby-script', 'lobby-text'),
        note('champion-party-variant', 'The default preview follows your saved starter, if one is selected. Choose the starter you actually used before relying on the party cards; viewing another choice does not change your save.', 'starter-choice', 'champion-script', 'parties'),
    ],
}
