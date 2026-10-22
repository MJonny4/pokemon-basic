import type { GuideLocation } from '../location-schema'

// The third published Elite Four stop. The Red/Blue trainer loader replaces
// only the final Gengar's third move with Toxic.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
function member(id: string, name: string, dexId: number, level: number, moves: string[]): GuideLocation['trainers'][number]['party'][number] {
    return { id, name, dexId, level, moves }
}

export const AGATHA_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-agatha-story', guideId: 'red-blue', stopId: 'elite-four-agatha',
    versionIds: [...versions], title: 'Indigo Plateau — Agatha',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Third Elite Four room, exact five-Pokémon party and moves, Red/Blue matchups, status warnings and Lance handoff.',
    limitations: ['Source-checked, not play-through verified. This stop covers Agatha only; Lance and Champion battles await separate audits.', 'Battle advice is type and move preparation, not a guaranteed winning team or full AI simulation.'],
    sources: [
        source('bruno-map', 'data/maps/objects/BrunosRoom.asm', 'North exit from Bruno leads into Agatha’s room.'),
        source('agatha-map', 'data/maps/objects/AgathasRoom.asm', 'Agatha at (5,2); south to Bruno, north to Lance.'),
        source('agatha-script', 'scripts/AgathasRoom.asm', 'Entry auto-walk, blocked south exit and north barrier cleared after victory.'),
        source('agatha-text', 'text/AgathasRoom.asm', 'Do not run away message and post-battle dialogue.'),
        source('parties', 'data/trainers/parties.asm', 'AgathaData: Gengar 56, Golbat 56, Haunter 55, Arbok 58, Gengar 60.'),
        source('gengar-base', 'data/pokemon/base_stats/gengar.asm', 'Ghost/Poison; starting moves.'),
        source('golbat-base', 'data/pokemon/base_stats/golbat.asm', 'Poison/Flying; starting moves.'),
        source('haunter-base', 'data/pokemon/base_stats/haunter.asm', 'Ghost/Poison; starting moves.'),
        source('arbok-base', 'data/pokemon/base_stats/arbok.asm', 'Poison; starting moves.'),
        source('level-moves', 'data/pokemon/evos_moves.asm', 'Level-up moves through each party member’s trainer level.'),
        source('move-generation', 'engine/pokemon/evos_moves.asm', 'WriteMonMoves skips known moves and shifts out the oldest when full.'),
        source('trainer-moves', 'engine/battle/read_trainer_party.asm', 'Special-level party generation and TeamMoves replacement in fifth Pokémon’s third move slot.'),
        source('team-moves', 'data/trainers/special_moves.asm', 'Agatha’s fifth Pokémon receives Toxic in its third move slot.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Psychic versus Poison, Ground versus Poison/Flying, Normal/Fighting versus Ghost.'),
        source('agatha-ai', 'engine/battle/trainer_ai.asm', 'Agatha has a random switch check when enough party members remain and may use a Super Potion at low HP.'),
        source('full-heal', 'engine/items/item_effects.asm', 'Full Heal clears persistent status such as sleep and poison, not volatile confusion.'),
    ],
    directions: [
        note('agatha-entry', 'After Bruno, heal with the items you carried into the League. Take his north door into Agatha’s room. You are walked inside and cannot return through its south exit.', 'bruno-map', 'agatha-map', 'agatha-script', 'agatha-text'),
        note('agatha-party', 'Agatha uses Gengar Lv. 56, Golbat Lv. 56, Haunter Lv. 55, Arbok Lv. 58 and a second Gengar Lv. 60. The cards below show their exact Red/Blue moves; only her final Gengar has Toxic as a special trainer move.', 'parties', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves'),
        note('agatha-onward', 'After defeating Agatha, use your own healing items before continuing. Her north door opens into Lance’s room, the fourth Elite Four battle.', 'agatha-script', 'agatha-map'),
    ],
    items: [],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside Agatha’s room.',
    trainers: [{ id: 'agatha', name: 'Agatha · Elite Four', role: 'boss', party: [
        member('slot-1', 'Gengar', 94, 56, ['Confuse Ray', 'Night Shade', 'Hypnosis', 'Dream Eater']),
        member('slot-2', 'Golbat', 42, 56, ['Supersonic', 'Confuse Ray', 'Wing Attack', 'Haze']),
        member('slot-3', 'Haunter', 93, 55, ['Confuse Ray', 'Night Shade', 'Hypnosis', 'Dream Eater']),
        member('slot-4', 'Arbok', 24, 58, ['Bite', 'Glare', 'Screech', 'Acid']),
        member('slot-5', 'Gengar', 94, 60, ['Confuse Ray', 'Night Shade', 'Toxic', 'Dream Eater']),
    ], sourceIds: ['agatha-map', 'parties', 'gengar-base', 'golbat-base', 'haunter-base', 'arbok-base', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves'] }],
    advice: [
        note('agatha-psychic', 'Psychic attacks are 2× effective against all five of Agatha’s Pokémon because each has Poison typing. The Ghost typing of Gengar and Haunter does not block Psychic attacks in Red/Blue.', 'matchups', 'gengar-base', 'golbat-base', 'haunter-base', 'arbok-base'),
        note('agatha-ground', 'Ground attacks are super effective against Gengar, Haunter and Arbok, but they have no effect on Flying-type Golbat. Normal and Fighting attacks have no effect on Gengar or Haunter.', 'matchups', 'gengar-base', 'golbat-base', 'haunter-base', 'arbok-base'),
        note('agatha-status', 'The first Gengar and Haunter can combine Hypnosis with Dream Eater; both also know Confuse Ray. The final Gengar trades Hypnosis for Toxic. Golbat can confuse with Supersonic or Confuse Ray, while Arbok has Glare. Agatha may switch or use a Super Potion.', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves', 'agatha-ai'),
    ],
    warnings: [
        note('agatha-no-return', 'You cannot retreat south once inside Agatha’s room. Heal and choose your lead before crossing over from Bruno.', 'agatha-script', 'agatha-text', 'bruno-map'),
        note('agatha-status-care', 'Carry Full Heals for sleep or poison. Confusion from Confuse Ray or Supersonic is a separate in-battle effect; Full Heal does not clear it in Red/Blue.', 'level-moves', 'move-generation', 'trainer-moves', 'team-moves', 'full-heal'),
    ],
}
