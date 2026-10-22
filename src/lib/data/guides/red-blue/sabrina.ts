import type { GuideLocation } from '../location-schema'

// Sabrina stays in her published gym stop. This is a bounded story route,
// with source evidence kept at build time rather than in the browser payload.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
const versions = ['red', 'blue'] as const
function source(id: string, file: string, locator: string): GuideLocation['sources'][number] {
    return { id, title: file, locator, url: `https://github.com/pret/pokered/blob/${revision}/${file}`, versionIds: [...versions], checkedOn: '2026-10-21', kind: 'game-disassembly' }
}
const note = (id: string, text: string, ...sourceIds: string[]) => ({ id, text, sourceIds })
type Slot = readonly [dexId: number, level: number, name: string]
function party(slots: Slot[]): GuideLocation['trainers'][number]['party'] {
    return slots.map(([dexId, level, name], index) => ({ id: `slot-${index + 1}`, dexId, level, name, moves: [] }))
}

export const SABRINA_GYM_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-sabrina-gym', guideId: 'red-blue', stopId: 'gym-6-saffron',
    versionIds: [...versions], title: 'Saffron Gym — Sabrina',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Gym access, a four-warp route to Sabrina and return path, exact leader party, Gen I matchup advice, Marsh Badge, TM46 and missable battles.',
    limitations: ['Source-checked, not play-through verified. Ordinary trainer parties, move sets, AI, optional detours and a terrain map are outside this pass.', 'The warp sequence gives room corners, not individual movement inputs. Badge order is a player choice.'],
    sources: [
        source('city', 'data/maps/objects/SaffronCity.asm', 'Gym entrance (34,3); blocking Rocket at (34,4).'),
        source('city-state', 'data/maps/toggleable_objects.asm', 'Saffron gym-blocking Rocket initially visible.'),
        source('silph-clear', 'scripts/SilphCo11F.asm', 'Giovanni victory hides Saffron Rockets, including the gym blocker.'),
        source('gym-map', 'data/maps/objects/SaffronGym.asm', 'Warp pairs: entry (11,15)→SE (19,17), SE NW (15,15)→NE (19,3), NE SW (15,5)→NW (1,3), NW SW (1,5)→center (11,11); reverse uses the paired pads.'),
        source('gym-events', 'scripts/SaffronGym.asm', 'Leader battle; Marsh Badge; seven ordinary trainer flags set on victory; TM46 Bag-full retry.'),
        source('gym-text', 'text/SaffronGym.asm', 'Marsh Badge obedience level 70 and TM46 Psywave name.'),
        source('parties', 'data/trainers/parties.asm', 'SabrinaData: Kadabra 38, Mr. Mime 37, Venomoth 38, Alakazam 43.'),
        source('obedience', 'engine/battle/core.asm', 'Only traded Pokémon check badge obedience; Marsh Badge threshold is level 70.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Bug→Psychic super effective; Ghost→Psychic no effect; Fire/Flying/Psychic→Venomoth typing.'),
        source('kadabra-type', 'data/pokemon/base_stats/kadabra.asm', 'Psychic type.'),
        source('mrmime-type', 'data/pokemon/base_stats/mrmime.asm', 'Psychic type.'),
        source('venomoth-type', 'data/pokemon/base_stats/venomoth.asm', 'Bug/Poison type.'),
        source('alakazam-type', 'data/pokemon/base_stats/alakazam.asm', 'Psychic type.'),
        source('gengar-type', 'data/pokemon/base_stats/gengar.asm', 'Ghost/Poison type; Psychic attacks hit its Poison typing super effectively.'),
        source('surf-hm', 'scripts/SafariZoneSecretHouse.asm', 'Secret House gift gives HM03 Surf.'),
        source('surf-field', 'engine/menus/start_sub_menus.asm', 'Surf field use requires Soul Badge.'),
    ],
    directions: [
        note('sabrina-access', 'After clearing Silph Co., the Rocket blocking Saffron Gym in the city’s north-east is gone. Heal before entering. You may challenge Sabrina before or after Koga in Fuchsia; their badge order is your choice.', 'city', 'city-state', 'silph-clear'),
        note('sabrina-trainers', 'If you want all seven ordinary gym battles, take them before Sabrina. Defeating her ends any of these trainer battles you skipped. The direct warp route below bypasses most of them.', 'gym-map', 'gym-events'),
        note('sabrina-first-warps', 'From the entrance, step on the warp pad just right of the Gym Guide. In the southeast room, take its northwest pad. You arrive in the northeast room.', 'gym-map'),
        note('sabrina-last-warps', 'In the northeast room, take its southwest pad to the northwest room. Take that room’s southwest pad to reach Sabrina in the center. Heal before speaking to her.', 'gym-map'),
        note('sabrina-battle', 'Sabrina uses Kadabra Lv. 38, Mr. Mime Lv. 37, Venomoth Lv. 38 and Alakazam Lv. 43. See the type advice below; her three Psychic Pokémon differ from Venomoth’s Bug/Poison typing.', 'parties', 'kadabra-type', 'mrmime-type', 'venomoth-type', 'alakazam-type'),
        note('sabrina-rewards', 'Defeat Sabrina for the Marsh Badge and TM46 Psywave. If your Bag is full, make room and speak to her again for the TM. The badge raises the obedience limit for traded Pokémon to level 70.', 'gym-events', 'gym-text', 'obedience'),
        note('sabrina-exit', 'To leave from the center, use its warp back to the northwest room; take the northwest pad there, the northeast pad in the next room, then the southeast pad in the following room. You return beside the Gym Guide and can walk south to the exit.', 'gym-map'),
        note('sabrina-onward', 'If Fuchsia and Koga are unfinished, return to that stop for the Safari Zone and Surf. Once you have HM03 Surf and the Soul Badge for field use, continue toward Cinnabar Island.', 'surf-hm', 'surf-field'),
    ],
    items: [
        { id: 'marsh-badge', name: 'Marsh Badge', kind: 'reward', quantity: 1, location: 'Sabrina in Saffron Gym.', requirements: 'Win the leader battle; traded Pokémon up to level 70 obey.', sourceIds: ['gym-events', 'gym-text', 'obedience'] },
        { id: 'psywave', name: 'TM46 Psywave', kind: 'reward', quantity: 1, location: 'Sabrina after winning the leader battle.', requirements: 'Have Bag space, or speak to Sabrina again after making room.', sourceIds: ['gym-events', 'gym-text'] },
    ],
    encounters: [], encountersNote: 'There are no wild encounters inside Saffron Gym.',
    trainers: [{ id: 'sabrina', name: 'Sabrina', role: 'leader', party: party([[64,38,'Kadabra'],[122,37,'Mr. Mime'],[49,38,'Venomoth'],[65,43,'Alakazam']]), sourceIds: ['gym-map', 'parties'] }],
    advice: [
        note('sabrina-matchups', 'Bug attacks are super effective against Sabrina’s three Psychic Pokémon. Strong physical attacks can also exploit their modest Defense. Venomoth is Bug/Poison, so Fire, Flying and Psychic attacks are super effective against it. Check your actual moves rather than choosing a teammate by type alone.', 'matchups', 'kadabra-type', 'mrmime-type', 'venomoth-type', 'alakazam-type'),
        note('sabrina-ghost-warning', 'In Red/Blue, Ghost attacks have no effect on Psychic Pokémon. Gengar’s Ghost typing does not protect it from Psychic: its Poison typing makes those attacks super effective against it.', 'matchups', 'gengar-type'),
    ],
    warnings: [note('sabrina-missable-trainers', 'Want all gym battles? Defeat the seven ordinary trainers before Sabrina. Her victory disables their battles even if you skipped them.', 'gym-events')],
}
