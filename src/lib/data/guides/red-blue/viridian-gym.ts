import type { GuideLocation } from '../location-schema'

// Giovanni's final Gym uses the published Viridian stop. Evidence remains at
// build time; optional trainer parties and the next Route 22 battle await audit.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })

export const VIRIDIAN_GYM_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-viridian-gym-story', guideId: 'red-blue', stopId: 'gym-8-viridian',
    versionIds: [...versions], title: 'Viridian City Gym — Giovanni',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Return from Cinnabar, seven-badge Gym access, arrow-floor route, Giovanni’s exact party, Earth Badge/TM27, missable ordinary battles and Route 22 handoff.',
    limitations: ['Source-checked, not play-through verified. Ordinary trainer parties, Giovanni’s complete move sets and AI, optional items and Route 22 rival party are outside this pass.', 'The arrow-floor directions give landmarks and the scripted movement, not every walkable tile or movement input.'],
    sources: [
        source('route-21', 'data/maps/headers/Route21.asm', 'North connects to Pallet Town; south connects to Cinnabar Island.'),
        source('route-1', 'data/maps/headers/Route1.asm', 'North connects to Viridian City; south connects to Pallet Town.'),
        source('city-map', 'data/maps/objects/ViridianCity.asm', 'Pokémon Center (23,25) and Gym door (32,7).'),
        source('city-access', 'scripts/ViridianCity.asm', 'Gym opens when the other seven badges are held; otherwise the door is locked.'),
        source('gym-map', 'data/maps/objects/ViridianGym.asm', 'Giovanni at (2,1), eight ordinary trainers, entry at (16–17,17).'),
        source('gym-arrows', 'scripts/ViridianGym.asm', 'East arrow at (19,11) moves north; upper-right arrow at (19,1) moves west; leader victory events.'),
        source('trainer-sight', 'engine/overworld/trainer_sight.asm', 'A trainer facing down walks toward a player encountered below.'),
        source('gym-dialogue', 'text/ViridianGym.asm', 'Earth Badge, TM27 Fissure and Giovanni’s final Team Rocket dialogue.'),
        source('parties', 'data/trainers/parties.asm', 'GiovanniData third party: Rhyhorn 45, Dugtrio 42, Nidoqueen 44, Nidoking 45, Rhydon 50.'),
        source('rhyhorn-type', 'data/pokemon/base_stats/rhyhorn.asm', 'Ground/Rock type.'),
        source('dugtrio-type', 'data/pokemon/base_stats/dugtrio.asm', 'Ground type.'),
        source('nidoqueen-type', 'data/pokemon/base_stats/nidoqueen.asm', 'Poison/Ground type.'),
        source('nidoking-type', 'data/pokemon/base_stats/nidoking.asm', 'Poison/Ground type.'),
        source('rhydon-type', 'data/pokemon/base_stats/rhydon.asm', 'Ground/Rock type.'),
        source('matchups', 'data/types/type_matchups.asm', 'Water/Grass/Ice versus Ground; Rock/Poison secondary typing; Ground versus Flying and Electric.'),
        source('obedience', 'engine/battle/core.asm', 'Earth Badge permits all levels of traded Pokémon to obey.'),
        source('route-22', 'data/maps/headers/Route22.asm', 'Viridian City connects west to Route 22.'),
        source('route-22-rival', 'scripts/Route22.asm', 'Second rival encounter checks the event set after Giovanni’s victory.'),
    ],
    directions: [
        note('viridian-return', 'From Cinnabar, Surf north on Route 21 to Pallet Town, then take Route 1 north into Viridian City. Heal at the Pokémon Center before the final Gym. You can enter the Gym in the northeast only after collecting the other seven badges.', 'route-21', 'route-1', 'city-map', 'city-access'),
        note('viridian-gym-floor', 'Inside, the floor’s arrow tiles move you automatically; there is no Strength-boulder switch puzzle. If you want every Gym battle, find and defeat all eight ordinary trainers before Giovanni. Before taking the direct arrow route, approach the Hiker on the north wall from below so he walks down to battle and clears the upper passage.', 'gym-map', 'gym-arrows', 'trainer-sight'),
        note('viridian-gym-route', 'For the route to Giovanni, return to the south entrance and use the arrow lane on the right/east side. It carries you north; the arrow near the upper-right corner carries you west. Follow the now-clear upper passage toward Giovanni in the northwest.', 'gym-map', 'gym-arrows', 'trainer-sight'),
        note('viridian-giovanni', 'Giovanni uses Rhyhorn Lv. 45, Dugtrio Lv. 42, Nidoqueen Lv. 44, Nidoking Lv. 45 and Rhydon Lv. 50. All have Ground typing, but the Rhyhorn/Rhydon pair is also Rock and the Nido pair is also Poison. Heal before speaking to him.', 'parties', 'rhyhorn-type', 'dugtrio-type', 'nidoqueen-type', 'nidoking-type', 'rhydon-type'),
        note('viridian-rewards', 'Defeat Giovanni for the Earth Badge and TM27 Fissure. If your Bag is full, make space and speak to him again for the TM. The badge removes the level-based obedience limit for traded Pokémon and completes your eight-badge set.', 'gym-arrows', 'gym-dialogue', 'obedience'),
        note('viridian-onward', 'Heal before leaving Viridian west for Route 22: Giovanni’s defeat enables the second rival encounter on the way toward the Pokémon League. The rival battle and Route 23/Victory Road path belong to the next stop.', 'gym-arrows', 'route-22', 'route-22-rival'),
    ],
    items: [
        { id: 'earth-badge', name: 'Earth Badge', kind: 'reward', quantity: 1, location: 'Giovanni in Viridian Gym.', requirements: 'Win the leader battle; traded Pokémon of any level obey.', sourceIds: ['gym-arrows', 'gym-dialogue', 'obedience'] },
        { id: 'fissure', name: 'TM27 Fissure', kind: 'reward', quantity: 1, location: 'Giovanni after winning the leader battle.', requirements: 'Have Bag space, or speak to Giovanni again after making room.', sourceIds: ['gym-arrows', 'gym-dialogue'] },
    ],
    encounters: [], encountersNote: 'There are no wild Pokémon encounters inside Viridian Gym. This does not describe the nearby routes.',
    trainers: [{ id: 'giovanni-gym', name: 'Giovanni', role: 'leader', party: [
        { id: 'slot-1', name: 'Rhyhorn', dexId: 111, level: 45, moves: [] },
        { id: 'slot-2', name: 'Dugtrio', dexId: 51, level: 42, moves: [] },
        { id: 'slot-3', name: 'Nidoqueen', dexId: 31, level: 44, moves: [] },
        { id: 'slot-4', name: 'Nidoking', dexId: 34, level: 45, moves: [] },
        { id: 'slot-5', name: 'Rhydon', dexId: 112, level: 50, moves: [] },
    ], sourceIds: ['gym-map', 'parties'] }],
    advice: [
        note('viridian-matchups', 'Water and Ice attacks are super effective against all five of Giovanni’s Pokémon. Water is 4× effective against the Rock/Ground Rhyhorn and Rhydon. Grass is also 4× effective against that pair, 2× against Dugtrio, but neutral against Poison/Ground Nidoqueen and Nidoking.', 'matchups', 'rhyhorn-type', 'dugtrio-type', 'nidoqueen-type', 'nidoking-type', 'rhydon-type'),
        note('viridian-immunities', 'Electric attacks cannot damage any of Giovanni’s Ground-type Pokémon. Flying Pokémon avoid Ground attacks, but can still be hit by other move types; choose attacks and healing for the whole battle.', 'matchups', 'rhyhorn-type', 'dugtrio-type', 'nidoqueen-type', 'nidoking-type', 'rhydon-type'),
    ],
    warnings: [
        note('viridian-missable-trainers', 'Want all Gym battles? Defeat the eight ordinary trainers before Giovanni. His victory marks their battles complete even if you skipped them.', 'gym-map', 'gym-arrows'),
        note('viridian-tm-retry', 'Giovanni’s TM27 is still available if your Bag was full at victory: clear a slot and speak to him again before leaving.', 'gym-arrows'),
        note('viridian-route-22-prep', 'The next Route 22 rival encounter becomes available after Giovanni’s victory. Heal before heading west from Viridian City.', 'gym-arrows', 'route-22', 'route-22-rival'),
    ],
}
