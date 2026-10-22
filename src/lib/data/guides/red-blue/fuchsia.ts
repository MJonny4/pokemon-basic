import type { GuideLocation } from '../location-schema'

// Fuchsia's story items and gym share the published Koga stop. Source evidence
// stays at build time; optional Safari encounters and trainers await audit.
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

export const FUCHSIA_STORY_LOCATION: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-fuchsia-story', guideId: 'red-blue', stopId: 'gym-5-fuchsia',
    versionIds: [...versions], title: 'Fuchsia City, Safari Zone & Koga',
    releaseScope: 'English international Game Boy Red/Blue (UE), not Yellow, remakes, Japanese releases or ROM hacks.',
    coverage: 'Fuchsia approach, Safari Zone path to Gold Teeth and HM03 Surf, Warden HM04 Strength exchange, Koga party, Soul Badge/TM06 and missable gym battles.',
    limitations: ['Source-checked, not play-through verified. Safari catch tables, optional pickups, ordinary trainer parties, move sets and AI are outside this pass.', 'The Safari directions connect map areas and landmarks, not individual steps through every fence. The gym wall maze has no terrain map in this pass.'],
    sources: [
        source('route-12', 'data/maps/headers/Route12.asm', 'Lavender south to Route 12, then Route 13.'),
        source('route-13', 'data/maps/headers/Route13.asm', 'Route 13 west to Route 14.'),
        source('route-14', 'data/maps/headers/Route14.asm', 'Route 14 west to Route 15.'),
        source('route-15', 'data/maps/headers/Route15.asm', 'Route 15 west to Fuchsia City.'),
        source('snorlax', 'scripts/Route12.asm', 'Route 12 Snorlax blocks the path until awakened and cleared.'),
        source('poke-flute', 'engine/items/item_effects.asm', 'Poké Flute use wakes the Route 12 or 16 Snorlax.'),
        source('route-16', 'data/maps/headers/Route16.asm', 'Route 16 south to Cycling Road (Route 17).'),
        source('route-17', 'data/maps/headers/Route17.asm', 'Route 17 south to Route 18.'),
        source('route-18', 'data/maps/headers/Route18.asm', 'Route 18 east to Fuchsia City.'),
        source('cycling-bike', 'scripts/Route16Gate1F.asm', 'Cycling Road gate checks Bicycle in Bag.'),
        source('city', 'data/maps/objects/FuchsiaCity.asm', 'Safari gate (18,3), Pokémon Center (19,27), Warden house (27,27), Gym (5,27).'),
        source('safari-gate', 'scripts/SafariZoneGate.asm', 'Entry costs 500, grants 30 Safari Balls and starts a limited-step game.'),
        source('safari-timer', 'engine/events/hidden_events/safari_game.asm', 'Safari game ends when steps or Safari Balls run out.'),
        source('safari-center', 'data/maps/objects/SafariZoneCenter.asm', 'Center entrance from gate; east exit to Safari Zone East.'),
        source('safari-east', 'data/maps/objects/SafariZoneEast.asm', 'East north exit to Safari Zone North.'),
        source('safari-north', 'data/maps/objects/SafariZoneNorth.asm', 'North southwest exit to Safari Zone West.'),
        source('safari-west', 'data/maps/objects/SafariZoneWest.asm', 'Gold Teeth ball (19,7); Secret House entrance (3,3).'),
        source('secret-house', 'scripts/SafariZoneSecretHouse.asm', 'Speak to resident for HM03 Surf; Bag-full retry.'),
        source('warden', 'scripts/WardensHouse.asm', 'Gold Teeth exchange for HM04 Strength; Bag-full retry after teeth are given.'),
        source('gym-map', 'data/maps/objects/FuchsiaGym.asm', 'Koga and six ordinary trainers in Fuchsia Gym.'),
        source('gym-before-text', 'text/FuchsiaGym.asm', 'Koga warns of poison and sleep before battle.'),
        source('gym-text', 'text/FuchsiaGym_2.asm', 'Invisible walls, Soul Badge field Surf effect and TM06 Toxic.'),
        source('gym-events', 'scripts/FuchsiaGym.asm', 'Koga victory, Soul Badge, TM06 Bag-full retry, six ordinary trainer flags.'),
        source('parties', 'data/trainers/parties.asm', 'KogaData: Koffing 37, Muk 39, Koffing 37, Weezing 43.'),
        source('koffing-type', 'data/pokemon/base_stats/koffing.asm', 'Poison type.'),
        source('muk-type', 'data/pokemon/base_stats/muk.asm', 'Poison type.'),
        source('weezing-type', 'data/pokemon/base_stats/weezing.asm', 'Poison type.'),
        source('matchups', 'data/types/type_matchups.asm', 'Gen I Psychic/Ground super effective against Poison; Fire neutral.'),
        source('field-moves', 'engine/menus/start_sub_menus.asm', 'Surf requires Soul Badge; Strength requires Rainbow Badge.'),
    ],
    directions: [
        note('fuchsia-approach', 'From Lavender, clear the Route 12 Snorlax with the Poké Flute, then follow Routes 12 → 13 → 14 → 15 west into Fuchsia. Alternatively, from Celadon take Route 16 and the Bicycle-only Cycling Road through Routes 17 → 18. Heal at Fuchsia’s Pokémon Center before the Safari Zone or gym.', 'route-12', 'route-13', 'route-14', 'route-15', 'snorlax', 'poke-flute', 'route-16', 'route-17', 'route-18', 'cycling-bike', 'city'),
        note('fuchsia-safari-entry', 'Enter the Safari Zone through the gate in northern Fuchsia. Admission costs 500; the game gives you 30 Safari Balls and ends when its step limit or Safari Balls run out. Plan a direct item trip and re-enter if needed.', 'city', 'safari-gate', 'safari-timer'),
        note('fuchsia-safari-route', 'From the entrance in the Center Area, find its eastern opening to Area 1 (East). Take East’s northern opening to Area 2 (North), then North’s southwestern opening to Area 3 (West). Follow the paths around the fences; these are area transitions, not a turn-by-turn map.', 'safari-center', 'safari-east', 'safari-north', 'safari-west'),
        note('fuchsia-gold-teeth', 'In Area 3 (West), pick up the Gold Teeth item ball in the northern half, east of the Secret House. Then go toward the northwest corner and enter the Secret House.', 'safari-west'),
        note('fuchsia-surf', 'Speak to the person inside the Secret House for HM03 Surf. If your Bag is full, make room and speak to him again. You can teach Surf now, but using it on water outside battle requires Koga’s Soul Badge.', 'secret-house', 'field-moves'),
        note('fuchsia-warden', 'Back in Fuchsia, enter the Warden’s house east of the Pokémon Center and give him the Gold Teeth. He offers HM04 Strength; if your Bag is full after handing over the teeth, make room and speak to him again. Outdoor Strength use requires Erika’s Rainbow Badge, not Koga’s Soul Badge.', 'city', 'warden', 'field-moves'),
        note('fuchsia-gym-entry', 'Enter Fuchsia Gym in the southwest of town. Its invisible walls make the route to Koga hard to see; move along the open paths one step at a time. Battle the six ordinary trainers before Koga if you want every gym battle.', 'city', 'gym-map', 'gym-text', 'gym-events'),
        note('fuchsia-koga', 'Koga uses Koffing Lv. 37, Muk Lv. 39, another Koffing Lv. 37 and Weezing Lv. 43. All four are Poison type. Bring status cures and see the matchup advice below.', 'parties', 'koffing-type', 'muk-type', 'weezing-type', 'gym-before-text'),
        note('fuchsia-rewards', 'Defeat Koga for the Soul Badge and TM06 Toxic. If your Bag is full, make room and speak to him again for the TM. The Soul Badge permits HM03 Surf outside battle; HM04 Strength still needs the Rainbow Badge.', 'gym-events', 'gym-text', 'field-moves'),
        note('fuchsia-onward', 'With HM03 Surf, the Soul Badge and a Pokémon that knows Surf, you can reach the Cinnabar story stop. Sabrina in Saffron is a separate gym stop; you may challenge her before or after Koga.', 'secret-house', 'gym-events', 'field-moves'),
    ],
    items: [
        { id: 'gold-teeth', name: 'Gold Teeth', kind: 'visible', quantity: 1, location: 'Safari Zone Area 3 (West), item ball at (19,7), east of the Secret House.', requirements: 'Reach West during a Safari game; leave Bag space.', sourceIds: ['safari-west'] },
        { id: 'surf', name: 'HM03 Surf', kind: 'gift', quantity: 1, location: 'Resident inside the Safari Zone Secret House in Area 3 (West).', requirements: 'Speak to him with Bag space; retry after making room if needed.', sourceIds: ['safari-west', 'secret-house'] },
        { id: 'strength', name: 'HM04 Strength', kind: 'gift', quantity: 1, location: 'Safari Warden in his Fuchsia house.', requirements: 'Give him the Gold Teeth, then speak again if your Bag was full.', sourceIds: ['city', 'warden'] },
        { id: 'soul-badge', name: 'Soul Badge', kind: 'reward', quantity: 1, location: 'Koga in Fuchsia Gym.', requirements: 'Win the leader battle; permits field Surf.', sourceIds: ['gym-events', 'gym-text', 'field-moves'] },
        { id: 'toxic', name: 'TM06 Toxic', kind: 'reward', quantity: 1, location: 'Koga after his defeat.', requirements: 'Have Bag space, or speak to him again after making room.', sourceIds: ['gym-events', 'gym-text'] },
    ],
    encounters: [], encountersHeading: 'Wild Pokémon — Safari encounters not audited', encountersNote: 'Safari catching and wild encounter tables are outside this story-item pass. This empty list does not mean the Safari Zone has no wild Pokémon.',
    trainers: [{ id: 'koga', name: 'Koga', role: 'leader', party: party([[109,37,'Koffing'],[89,39,'Muk'],[109,37,'Koffing'],[110,43,'Weezing']]), sourceIds: ['gym-map', 'parties'] }],
    advice: [
        note('fuchsia-matchups', 'Psychic and Ground attacks are super effective against each of Koga’s Poison-type Pokémon in Red/Blue. Fire attacks are neutral against Poison, so choose actual moves that hit well rather than relying on a teammate’s type alone.', 'matchups', 'koffing-type', 'muk-type', 'weezing-type'),
        note('fuchsia-status', 'Koga warns about poison and sleep; carry status cures and healing for the gym. TM06 Toxic causes poison damage to build over successive turns.', 'gym-before-text', 'gym-text'),
    ],
    warnings: [
        note('fuchsia-missable-trainers', 'Want all gym battles? Defeat the six ordinary trainers before Koga. His victory disables their battles even if you skipped them.', 'gym-events'),
        note('fuchsia-badges', 'HM04 Strength can be collected before Erika, but it cannot move boulders outside battle until you have her Rainbow Badge. Koga’s Soul Badge unlocks field Surf.', 'field-moves', 'gym-text', 'warden'),
    ],
}
