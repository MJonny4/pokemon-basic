import type { GuideLocation } from '../location-schema'

const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideLocation['sources'][number] {
    return { id, title, locator, versionIds: ['red', 'blue'], checkedOn: '2026-10-19', kind: 'game-disassembly', url: `https://github.com/pret/pokered/blob/${revision}/${file}` }
}
type Member = readonly [name: string, dexId: number, level: number, moves: string[]]
function party(members: Member[]): GuideLocation['trainers'][number]['party'] {
    return members.map(([name, dexId, level, moves], index) => ({ id: `slot-${index + 1}`, name, dexId, level, moves: [...moves] }))
}
const pikachuMoves = ['ThunderShock', 'Growl', 'Thunder Wave', 'Quick Attack']
const voltorbMoves = ['Tackle', 'Screech', 'SonicBoom']
const moveSources = ['surge-parties', 'surge-objects', 'surge-add-mon', 'surge-move-engine', 'surge-level-moves']

export const VERMILION_GYM_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-vermilion-gym', guideId: 'red-blue', stopId: 'gym-3-vermilion',
    versionIds: ['red', 'blue'], title: 'Vermilion Gym — Lt. Surge',
    releaseScope: 'English international Game Boy Red/Blue (UE). Not Yellow, Japanese editions, remakes, hacks or unaudited re-releases/localizations.',
    coverage: 'Gym access, two-lock trash-can puzzle including the Red/Blue exception, all four trainer parties and moves, Thunder Badge/TM24/prize and missable ordinary battles.',
    limitations: ['Source-checked, not play-through verified. The puzzle explanation is not a simulator, a fixed solution or a terrain map.', 'No full battle simulation, AI/item-use audit or numerical badge-stat audit. Route 11, Diglett’s Cave and the Route 2 return remain separate unaudited areas; their complete encounters/items are not included here.'],
    sources: [
        source('surge-objects', 'data/maps/objects/VermilionGym.asm', 'Gym battle identities and positions', 'Lt. Surge party 1; Gentleman party 3; OPP_ROCKER party 1 despite Super Nerd sprite/text label; Sailor party 8'),
        source('surge-events', 'scripts/VermilionGym.asm', 'Gym rewards and missable trainers', 'ReceiveTM24: retry after Bag-full; Thunder Badge set regardless; all three ordinary battle flags set after victory'),
        source('surge-parties', 'data/trainers/parties.asm', 'Exact Red/Blue gym parties', 'LtSurgeData: Voltorb 21, Pikachu 18, Raichu 24; Gentleman 3; Rocker 1; Sailor 8'),
        source('surge-voltorb', 'data/pokemon/base_stats/voltorb.asm', 'Voltorb starting moves/type', 'Electric; Tackle/Screech'),
        source('surge-pikachu', 'data/pokemon/base_stats/pikachu.asm', 'Pikachu starting moves/type', 'Electric; ThunderShock/Growl'),
        source('surge-raichu', 'data/pokemon/base_stats/raichu.asm', 'Raichu starting moves/type', 'Electric; ThunderShock/Growl/Thunder Wave, no fourth starting move'),
        source('surge-magnemite', 'data/pokemon/base_stats/magnemite.asm', 'Gen I Magnemite starting moves/type', 'Pure Electric, not Steel; only starting move Tackle'),
        source('surge-level-moves', 'data/pokemon/evos_moves.asm', 'Move levels', 'Voltorb SonicBoom 17/Selfdestruct 22; Pikachu Thunder Wave 9/Quick Attack 16; Raichu no level moves; Magnemite SonicBoom 21/ThunderShock 25; Diglett Dig 19'),
        source('surge-add-mon', 'engine/pokemon/add_mon.asm', 'Trainer Pokémon move construction', '.copyMonTypesAndMoves: copy starting moves, call WriteMonMoves'),
        source('surge-move-engine', 'engine/pokemon/evos_moves.asm', 'Level-dependent move construction', 'WriteMonMoves adds non-duplicate moves at or below the party member’s level'),
        source('surge-special-move', 'data/trainers/special_moves.asm', 'Surge special move assignment', 'LoneMoves entry 3: zero-based party member 2, Thunderbolt'),
        source('surge-trainer-engine', 'engine/battle/read_trainer_party.asm', 'Third-move replacement and prize calculation', '.AddLoneMove starts at wEnemyMon1Moves + 2; .FinishUp/.LastLoop uses final party member level'),
        source('surge-prize-base', 'data/trainers/pic_pointers_money.asm', 'Surge prize base', 'LtSurgePic 9900: base ₽99 × final member level 24 = ₽2376'),
        source('surge-puzzle', 'engine/events/hidden_events/vermilion_gym_trash.asm', 'Two-lock puzzle and exception', 'GymTrashScript: first success chooses second; wrong second resets first; documented underflow can select trash can 0 from any first can; GymTrashCans adjacency table'),
        source('surge-puzzle-positions', 'data/events/hidden_events.asm', 'Trash-can positions and interaction indices', 'VERMILION_GYM: 15 cans, x 1/3/5/7/9 and y 7/9/11; index 0 = upper-left (1,7); the separate bin at (6,1) only prints trash text'),
        source('surge-cut-fly', 'engine/menus/start_sub_menus.asm', 'Field-move badge checks', 'StartMenu_Pokemon .cut requires Cascade Badge; .fly requires Thunder Badge'),
        source('surge-cut', 'engine/overworld/cut.asm', 'Cut field interaction', 'UsedCut: face a cuttable tree, including overworld tile $3d'),
        source('surge-hm-origin', 'scripts/SSAnneCaptainsRoom.asm', 'Cut HM origin', 'Captain gives HM_CUT with Bag-full retry'),
        source('surge-town', 'data/maps/objects/VermilionCity.asm', 'Town gym entrance', 'Gym warp (12,19); nearby town building warps'),
        source('surge-matchups', 'data/types/type_matchups.asm', 'Gen I type effectiveness', 'Electric → Ground no effect; Electric → Grass resisted, Water super effective; Ground → Electric super effective'),
        source('surge-bulbasaur-type', 'data/pokemon/base_stats/bulbasaur.asm', 'Bulbasaur typing', 'Grass/Poison'),
        source('surge-charizard-type', 'data/pokemon/base_stats/charizard.asm', 'Charizard typing', 'Fire/Flying'),
        source('surge-squirtle-type', 'data/pokemon/base_stats/squirtle.asm', 'Squirtle typing', 'Water'),
    ],
    directions: [
        { id: 'surge-enter', text: 'Heal in Vermilion, then bring a Pokémon that knows Cut to the tree blocking the gym. HM01 comes from the S.S. Anne captain, and Misty’s Cascade Badge is needed to use Cut outside battle. Face the tree and choose Cut from that Pokémon’s menu.', sourceIds: ['surge-hm-origin', 'surge-cut-fly', 'surge-cut', 'surge-town'] },
        { id: 'surge-ordinary-battles', text: 'If you want every gym battle, defeat the Gentleman, Rocker and Sailor before Lt. Surge. You can prepare against their teams below; winning the leader battle disables any of these three you skipped.', sourceIds: ['surge-objects', 'surge-parties', 'surge-events'] },
        { id: 'surge-first-switch', text: 'Inspect the 15 trash cans in the lower part of the gym, facing a can and pressing A. Search systematically until you find the first hidden switch. There is no single fixed pair to copy for every visit.', sourceIds: ['surge-puzzle', 'surge-puzzle-positions'] },
        { id: 'surge-second-switch', text: 'After the first switch, your next can check is the second-switch attempt. Try a can directly beside the first—above, below, left or right, not diagonally. A wrong second check resets the first lock. Red/Blue also has the upper-left-can exception explained below; adjacency is not guaranteed.', sourceIds: ['surge-puzzle', 'surge-puzzle-positions'] },
        { id: 'surge-battle', text: 'Once both locks open, approach Lt. Surge. His Red/Blue team is Voltorb level 21, Pikachu level 18 and Raichu level 24. Check the move cards and heal before challenging him.', sourceIds: ['surge-puzzle', 'surge-events', 'surge-parties'] },
        { id: 'surge-rewards', text: 'After winning, receive the Thunder Badge, ₽2,376 and TM24 Thunderbolt. If the TM did not fit in your Bag, make space and speak to Surge again. The badge permits Fly outside battle once you separately obtain HM02 and teach it to a compatible Pokémon; Surge does not hand out Fly.', sourceIds: ['surge-events', 'surge-parties', 'surge-prize-base', 'surge-trainer-engine', 'surge-cut-fly'] },
    ],
    items: [
        { id: 'surge-thunder-badge', name: 'Thunder Badge', quantity: 1, kind: 'reward', location: 'Received for defeating Lt. Surge.', requirements: 'Win the gym leader battle. Permits field use of Fly, but does not give you its HM.', sourceIds: ['surge-events', 'surge-cut-fly'] },
        { id: 'surge-tm24', name: 'TM24 Thunderbolt', quantity: 1, kind: 'reward', location: 'Lt. Surge after victory; talk again if your Bag was full.', requirements: 'Defeat Surge and have Bag space. The badge is still awarded if the TM does not fit.', sourceIds: ['surge-events'] },
        { id: 'surge-prize-money', name: 'Prize money (₽)', quantity: 2376, kind: 'reward', location: 'Received for defeating Lt. Surge.', requirements: 'Win the gym leader battle.', sourceIds: ['surge-parties', 'surge-prize-base', 'surge-trainer-engine'] },
    ],
    encounters: [], encountersNote: 'There are no wild encounters or fishing spots inside this gym. For town/Route 6 fishing, return to the previous Vermilion & S.S. Anne stop. Diglett’s Cave is a separate place, not a gym encounter area.',
    trainers: [
        { id: 'surge-leader', name: 'Lt. Surge', role: 'leader', position: { x: 5, y: 1 }, party: party([
            ['Voltorb', 100, 21, voltorbMoves],
            ['Pikachu', 25, 18, pikachuMoves],
            ['Raichu', 26, 24, ['ThunderShock', 'Growl', 'Thunderbolt']],
        ]), sourceIds: [...moveSources, 'surge-voltorb', 'surge-pikachu', 'surge-raichu', 'surge-special-move', 'surge-trainer-engine', 'surge-events'] },
        { id: 'surge-gentleman', name: 'Gentleman', role: 'trainer', position: { x: 9, y: 6 }, party: party([
            ['Pikachu', 25, 23, pikachuMoves],
        ]), requirements: 'Battle before defeating Lt. Surge if you want this trainer’s experience and money.', sourceIds: [...moveSources, 'surge-pikachu', 'surge-events'] },
        { id: 'surge-rocker', name: 'Rocker', role: 'trainer', position: { x: 3, y: 8 }, party: party([
            ['Voltorb', 100, 20, voltorbMoves], ['Magnemite', 81, 20, ['Tackle']], ['Voltorb', 100, 20, voltorbMoves],
        ]), requirements: 'Battle before defeating Lt. Surge. This is the Rocker trainer class, even though the map uses a Super Nerd sprite.', sourceIds: [...moveSources, 'surge-voltorb', 'surge-magnemite', 'surge-events'] },
        { id: 'surge-sailor', name: 'Sailor', role: 'trainer', position: { x: 0, y: 10 }, party: party([
            ['Pikachu', 25, 21, pikachuMoves], ['Pikachu', 25, 21, pikachuMoves],
        ]), requirements: 'Battle before defeating Lt. Surge if you want this trainer’s experience and money.', sourceIds: [...moveSources, 'surge-pikachu', 'surge-events'] },
    ],
    warnings: [
        { id: 'surge-missable-trainers', text: 'Completionists: fight all three ordinary gym trainers before beating Surge. His victory disables their battles, even if you have not fought them.', sourceIds: ['surge-events'] },
        { id: 'surge-puzzle-exception', text: 'Red/Blue puzzle quirk: the second switch can be in the upper-left can of the 15-can grid, even when it is not beside the first. That is the northernmost can in the leftmost column, at (1, 7)—not the separate bin by Surge. Checking the wrong can still resets the first lock; this is not a guaranteed solution.', sourceIds: ['surge-puzzle', 'surge-puzzle-positions'] },
    ],
    advice: [
        { id: 'surge-ground-help', text: 'Ground-type Pokémon are immune to damaging Electric attacks, and Ground attacks are super effective against these Electric opponents. Having a Ground-type Pokémon is not the same as knowing a Ground attack: check its moves. Diglett learns Dig at level 19 in Red/Blue.', sourceIds: ['surge-matchups', 'surge-level-moves'] },
        { id: 'surge-no-invincibility', text: 'Ground typing does not prevent every attack: Voltorb’s Tackle and SonicBoom, and Pikachu’s Quick Attack, can still deal damage. Keep your team healthy rather than assuming a guaranteed one-turn win.', sourceIds: ['surge-matchups', 'surge-voltorb', 'surge-pikachu', 'surge-level-moves'] },
        { id: 'surge-moves-help', text: 'Pikachu has Thunder Wave and Quick Attack. Raichu’s special move here is Thunderbolt; its listed set does not retain Thunder Wave. Voltorb at level 21 has SonicBoom, but not the Selfdestruct it learns at level 22.', sourceIds: ['surge-pikachu', 'surge-raichu', 'surge-level-moves', 'surge-special-move', 'surge-trainer-engine', 'surge-parties'] },
        { id: 'surge-grid-help', text: 'Remember which can opened the first lock. Choose one next can deliberately: a failed second attempt closes the first lock and rerolls the first-switch location. No fixed coordinates or “always adjacent” rule guarantee success in these Red/Blue releases.', sourceIds: ['surge-puzzle', 'surge-puzzle-positions'] },
    ],
    starterHints: [
        { id: 'surge-bulbasaur', starterDexId: 1, text: 'Bulbasaur’s Grass typing resists Electric damage; it does not take neutral Electric damage. This is not Ground-style immunity, and Voltorb’s non-Electric attacks remain a threat. Check your current moves and health.', sourceIds: ['surge-matchups', 'surge-bulbasaur-type', 'surge-voltorb', 'surge-level-moves'] },
        { id: 'surge-charmander', starterDexId: 4, text: 'Charmander and Charmeleon do not resist Electric attacks. A Ground teammate with a Ground attack can help; if yours is Charizard already, its Flying typing makes Electric damage super effective.', sourceIds: ['surge-matchups', 'surge-charizard-type'] },
        { id: 'surge-squirtle', starterDexId: 7, text: 'Squirtle’s Water line is weak to Electric damage. Consider another teammate for the Electric attacks, and do not assume Ground typing protects that teammate from Voltorb’s SonicBoom or normal physical attacks.', sourceIds: ['surge-matchups', 'surge-squirtle-type', 'surge-voltorb', 'surge-level-moves'] },
    ],
}
