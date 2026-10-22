import type { GuideLocation } from '../location-schema'

// This story slice replaces only the published Cinnabar stop. Source evidence
// stays at build time; Mansion encounters and optional pickups await audit.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })

export const CINNABAR_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-cinnabar-story', guideId: 'red-blue', stopId: 'gym-7-cinnabar',
    versionIds: [...versions], title: 'Cinnabar Island, Pokémon Mansion & Blaine',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Route 21 Surf arrival, the Mansion switch-and-drop route to the Secret Key, gym access and quiz choice, Blaine party, Volcano Badge/TM38 and missable gym battles.',
    limitations: ['Source-checked, not play-through verified. Mansion encounter tables, optional pickups and trainer parties, gym trainer parties, leader moves and AI are outside this pass.', 'Mansion directions connect floors and landmarks rather than every movement input; switches change door layouts and the 3F holes lead to different floors.'],
    sources: [
        source('route-21', 'data/maps/headers/Route21.asm', 'Route 21 connects Pallet Town south to Cinnabar Island.'),
        source('route-1', 'data/maps/headers/Route1.asm', 'Route 1 connects Pallet Town north to Viridian City.'),
        source('island-map', 'data/maps/objects/CinnabarIsland.asm', 'Mansion entrance (6,3), Gym (18,3), Pokémon Center (11,11).'),
        source('surf-field', 'engine/menus/start_sub_menus.asm', 'Field Surf requires the Soul Badge.'),
        source('gym-lock', 'scripts/CinnabarIsland.asm', 'Gym doorway checks the Secret Key in the Bag; returning to the island resets the Mansion switch.'),
        source('mansion-1f', 'data/maps/objects/PokemonMansion1F.asm', 'Entrance, northwest stair to 2F and isolated south stair to B1F.'),
        source('mansion-2f', 'data/maps/objects/PokemonMansion2F.asm', '2F stairs to 3F.'),
        source('mansion-3f', 'data/maps/objects/PokemonMansion3F.asm', '3F stair connections and floor landmarks.'),
        source('mansion-holes', 'scripts/PokemonMansion3F.asm', 'Left holes (16,14)/(17,14) lead to 1F; right hole (19,14) leads to 2F.'),
        source('mansion-switch-1f', 'scripts/PokemonMansion1F.asm', '1F statue switch changes doorway blocks.'),
        source('mansion-switch-2f', 'scripts/PokemonMansion2F.asm', '2F statue switch changes doorway blocks.'),
        source('mansion-switch-b1f', 'scripts/PokemonMansionB1F.asm', 'Basement statue switch changes doorways.'),
        source('mansion-key', 'data/maps/objects/PokemonMansionB1F.asm', 'Secret Key item ball at (5,13) in west-central room; basement arrival stair (23,22).'),
        source('gym-map', 'data/maps/objects/CinnabarGym.asm', 'Blaine and seven ordinary trainers.'),
        source('gym-quiz', 'engine/events/hidden_events/cinnabar_gym_quiz.asm', 'Six questions; correct answer opens gate, wrong answer summons trainer if unbeaten.'),
        source('gym-events', 'scripts/CinnabarGym.asm', 'Victory gives Volcano Badge, TM38 Fire Blast with Bag-full retry, and disables seven ordinary battles.'),
        source('gym-text', 'text/CinnabarGym.asm', 'Blaine rewards and burn warning.'),
        source('parties', 'data/trainers/parties.asm', 'BlaineData: Growlithe 42, Ponyta 40, Rapidash 42, Arcanine 47.'),
        source('growlithe-type', 'data/pokemon/base_stats/growlithe.asm', 'Fire type.'),
        source('ponyta-type', 'data/pokemon/base_stats/ponyta.asm', 'Fire type.'),
        source('rapidash-type', 'data/pokemon/base_stats/rapidash.asm', 'Fire type.'),
        source('arcanine-type', 'data/pokemon/base_stats/arcanine.asm', 'Fire type.'),
        source('matchups', 'data/types/type_matchups.asm', 'Water, Ground and Rock attacks are super effective against Fire.'),
    ],
    directions: [
        note('cinnabar-arrival', 'With HM03 Surf, Koga’s Soul Badge and a Pokémon that knows Surf, leave Pallet Town south on Route 21. Follow the water to Cinnabar Island and heal at its Pokémon Center. The Gym on the east side is locked until the Secret Key is in your Bag.', 'route-21', 'surf-field', 'island-map', 'gym-lock'),
        note('cinnabar-mansion-entry', 'Enter Pokémon Mansion in the northwest. On 1F, inspect the statue in the northwest room and use its hidden switch; backtrack to the stair near the entrance and climb to 2F. The basement stair on 1F is in a separate southern area, reached later by dropping from 3F.', 'island-map', 'mansion-1f', 'mansion-switch-1f', 'mansion-holes'),
        note('cinnabar-mansion-2f', 'On 2F, use the nearby statue switch, then take the northwest stairs to 3F. On 3F, use the statue toward the east to open the southern passage. The switches toggle doors, so check the passage after each use.', 'mansion-2f', 'mansion-3f', 'mansion-switch-2f', 'mansion-holes'),
        note('cinnabar-mansion-drop', 'At the 3F southern openings, the small right-hand hole drops to 2F. From there, use the 2F switch as needed and return up the northwest stairs. This time take one of the two adjacent left-hand holes on 3F; they drop into the isolated southern part of 1F. Take the stair there down to B1F.', 'mansion-holes', 'mansion-2f', 'mansion-1f', 'mansion-switch-2f'),
        note('cinnabar-mansion-key', 'In B1F, use the statue switch in the southwest to change the doors. Follow the corridor through the north side and then west into the west-central room; pick up the Secret Key item ball. Keep Bag space for it.', 'mansion-switch-b1f', 'mansion-key'),
        note('cinnabar-gym-entry', 'Return to Cinnabar with the Secret Key in your Bag and enter the Gym on the east side. Its six quiz machines open gates for correct answers; you can also battle the associated trainers. If you want every gym battle, defeat all seven ordinary trainers before Blaine.', 'gym-lock', 'island-map', 'gym-quiz', 'gym-map', 'gym-events'),
        note('cinnabar-blaine', 'Blaine uses Growlithe Lv. 42, Ponyta Lv. 40, Rapidash Lv. 42 and Arcanine Lv. 47. All four are Fire type; bring attacks that hit Fire effectively and carry Burn Heals or other status cures.', 'parties', 'growlithe-type', 'ponyta-type', 'rapidash-type', 'arcanine-type', 'matchups', 'gym-text'),
        note('cinnabar-rewards', 'Defeat Blaine for the Volcano Badge and TM38 Fire Blast. If your Bag is full, make room and speak to him again to receive the TM.', 'gym-events', 'gym-text'),
        note('cinnabar-onward', 'After the seventh badge, Surf north on Route 21 to Pallet Town, then follow Route 1 north to Viridian City for the final Gym story stop.', 'gym-events', 'route-21', 'route-1'),
    ],
    items: [
        { id: 'secret-key', name: 'Secret Key', kind: 'visible', quantity: 1, location: 'Pokémon Mansion B1F, west-central room; item ball at (5,13).', requirements: 'Reach B1F via the southern 1F stair, use the basement switch, and leave Bag space.', sourceIds: ['mansion-1f', 'mansion-switch-b1f', 'mansion-key'] },
        { id: 'volcano-badge', name: 'Volcano Badge', kind: 'reward', quantity: 1, location: 'Blaine in Cinnabar Gym.', requirements: 'Win the leader battle.', sourceIds: ['gym-events', 'gym-text'] },
        { id: 'fire-blast', name: 'TM38 Fire Blast', kind: 'reward', quantity: 1, location: 'Blaine after winning the leader battle.', requirements: 'Have Bag space, or speak to Blaine again after making room.', sourceIds: ['gym-events', 'gym-text'] },
    ],
    encounters: [], encountersHeading: 'Wild Pokémon — Mansion encounters not audited', encountersNote: 'Pokémon Mansion has wild encounters. This story-item pass does not audit its Red/Blue encounter tables; the empty list does not mean there are no wild Pokémon there.',
    trainers: [{ id: 'blaine', name: 'Blaine', role: 'leader', party: [
        { id: 'slot-1', name: 'Growlithe', dexId: 58, level: 42, moves: [] },
        { id: 'slot-2', name: 'Ponyta', dexId: 77, level: 40, moves: [] },
        { id: 'slot-3', name: 'Rapidash', dexId: 78, level: 42, moves: [] },
        { id: 'slot-4', name: 'Arcanine', dexId: 59, level: 47, moves: [] },
    ], sourceIds: ['gym-map', 'parties'] }],
    advice: [
        note('cinnabar-matchups', 'Water, Ground and Rock attacks are super effective against Blaine’s Fire-type team in Red/Blue. Check the moves your Pokémon actually know; a teammate’s type alone does not determine its attack damage.', 'matchups', 'growlithe-type', 'ponyta-type', 'rapidash-type', 'arcanine-type'),
        note('cinnabar-burns', 'Blaine warns that Fire Pokémon can burn opponents. Carry Burn Heals or other status cures, and heal before the leader battle.', 'gym-text'),
    ],
    warnings: [
        note('cinnabar-missable-trainers', 'Want all gym battles? Defeat the seven ordinary trainers before Blaine. Correct quiz answers can bypass battles, and Blaine’s victory disables any ordinary gym battles you skipped.', 'gym-map', 'gym-quiz', 'gym-events'),
        note('cinnabar-switch-reset', 'Leaving Pokémon Mansion for Cinnabar resets its shared statue-switch state. If you go back inside, recheck the doors and switches rather than following your earlier open-door layout.', 'gym-lock', 'mansion-switch-1f', 'mansion-switch-2f', 'mansion-switch-b1f'),
        note('cinnabar-bag-space', 'Leave Bag space for the Secret Key before reaching its basement item ball. If Blaine cannot give TM38 because your Bag is full, clear space and speak to him again.', 'mansion-key', 'gym-events'),
    ],
}
