import type { GuideChapter } from '../schema'

// Evidence is pinned so later upstream changes cannot silently change the review.
const revision = 'af519899719f0754965776faac0e836a3b906e6d'
function source(id: string, file: string, title: string, locator: string): GuideChapter['sources'][number] {
    return {
        id, title, locator,
        url: `https://github.com/pret/pokered/blob/${revision}/${file}`,
        versionIds: ['red', 'blue'], checkedOn: '2026-10-18', kind: 'game-disassembly',
    }
}

// New content has hand-assigned IDs, never IDs derived from prose or array order.
// Encounters, starter advice and tips still come from the unaudited legacy guide.
export const RED_BLUE_OPENING: GuideChapter = {
    schemaVersion: 1,
    id: 'red-blue-opening',
    guideId: 'red-blue',
    versionIds: ['red', 'blue'],
    language: 'en',
    releaseScope: 'English-language international Game Boy Red and Blue (UE); not Japanese releases, Yellow, remakes, or ROM hacks. Other localizations and re-releases are not audited here.',
    title: "Opening errand: deliver Oak's Parcel",
    review: 'source-checked',
    scope: 'directions-and-listed-items',
    sources: [
        source('pallet-script', 'scripts/PalletTown.asm', 'Pallet Town events', 'PalletTownDefaultScript and Oak escort scripts'),
        source('oak-lab', 'scripts/OaksLab.asm', "Oak's Lab events", 'Starter choice, first rival battle, OaksLabOak1Text parcel checks and OaksLabOakGivesPokedexScript'),
        source('route-1-links', 'data/maps/headers/Route1.asm', 'Route 1 connections', 'North connection to Viridian City; south connection to Pallet Town'),
        source('route-1-potion', 'scripts/Route1.asm', 'Route 1 sample Potion', 'Route1Youngster1Text / EVENT_GOT_POTION_SAMPLE'),
        source('viridian-mart', 'scripts/ViridianMart.asm', 'Viridian Mart parcel event', 'ViridianMartOaksParcelScript and post-delivery shop text pointers'),
        source('viridian-stock', 'data/items/marts.asm', 'Viridian Mart stock', 'ViridianMartClerkText'),
        source('viridian-city', 'scripts/ViridianCity.asm', 'Viridian City progression', 'ViridianCityCheckGotPokedexScript and ViridianCityCheckGymOpenScript'),
        source('viridian-links', 'data/maps/headers/ViridianCity.asm', 'Viridian City connections', 'North connection to Route 2'),
    ],
    stops: [
        {
            id: 'pallet-town',
            steps: [
                {
                    id: 'pallet-meet-oak', importance: 'required',
                    text: 'Try to leave Pallet Town to the north. Professor Oak stops you and brings you to his lab.',
                    sourceIds: ['pallet-script'],
                },
                {
                    id: 'pallet-choose-starter', importance: 'required', requires: ['pallet-meet-oak'],
                    text: 'In the lab, choose Bulbasaur, Charmander, or Squirtle from the Poké Balls on the table.',
                    sourceIds: ['oak-lab'],
                },
                {
                    id: 'pallet-first-rival', importance: 'required', requires: ['pallet-choose-starter'],
                    text: 'Your rival chooses his Pokémon and challenges you as you leave. Finish this first battle, then leave the lab. You receive the Pokédex later, after delivering Oak’s Parcel.',
                    sourceIds: ['oak-lab'],
                },
            ],
            items: [],
        },
        {
            id: 'route-1',
            steps: [
                {
                    id: 'route-1-reach-viridian', importance: 'required', requires: ['pallet-first-rival'],
                    text: 'Follow Route 1 north from Pallet Town to Viridian City.',
                    sourceIds: ['route-1-links'],
                },
                {
                    id: 'route-1-sample-potion', importance: 'optional',
                    text: 'Optional: speak to the Poké Mart employee on Route 1 for a free sample Potion.',
                    sourceIds: ['route-1-potion'],
                },
            ],
            items: [{
                id: 'route-1-sample-potion',
                name: 'Potion', location: 'Free sample from the Poké Mart employee on Route 1',
                icon: '💊', sourceIds: ['route-1-potion'],
            }],
        },
        {
            id: 'viridian-city',
            steps: [
                {
                    id: 'viridian-receive-parcel', importance: 'required', requires: ['route-1-reach-viridian'],
                    text: 'Enter Viridian City’s Poké Mart. The clerk gives you Oak’s Parcel to deliver to Professor Oak.',
                    sourceIds: ['viridian-mart'],
                },
                {
                    id: 'viridian-deliver-parcel', importance: 'required', requires: ['viridian-receive-parcel'],
                    text: 'Return south through Route 1 to Pallet Town. Speak to Professor Oak in his lab to hand over the Parcel; you do not need to use it from the Bag. Oak then gives you the Pokédex.',
                    sourceIds: ['route-1-links', 'oak-lab'],
                },
                {
                    id: 'viridian-buy-poke-balls', importance: 'optional', requires: ['viridian-deliver-parcel'],
                    text: 'Before catching Pokémon, return to Viridian’s Poké Mart to buy Poké Balls. Delivering the Parcel does not automatically give you five Poké Balls.',
                    sourceIds: ['viridian-mart', 'viridian-stock', 'oak-lab'],
                },
                {
                    id: 'viridian-continue-north', importance: 'required', requires: ['viridian-deliver-parcel'],
                    text: 'With the Pokédex received, the old man no longer blocks the northern path. Continue north to Route 2. Viridian Gym is still closed at this stage.',
                    sourceIds: ['viridian-city', 'viridian-links'],
                },
            ],
            items: [
                { id: 'oaks-parcel', name: 'Oak’s Parcel', location: 'Viridian Poké Mart clerk; deliver it to Professor Oak', icon: '📦', sourceIds: ['viridian-mart'] },
                { id: 'pokedex', name: 'Pokédex', location: 'Professor Oak’s lab after delivering the Parcel', icon: '📕', sourceIds: ['oak-lab'] },
            ],
        },
    ],
}
