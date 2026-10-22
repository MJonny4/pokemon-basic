import type { GuideLocation } from '../location-schema'
import { ROUTE_11_LOCATION } from './route-11'
import { DIGLETT_ROUTE_2_LOCATION } from './diglett-route-2'

// One optional reference on an existing host, not another progress stop or a
// replacement for the town/ship. Bounded source modules remain independently
// testable; prefixed record/source IDs prevent composition collisions.
const slices = [ROUTE_11_LOCATION, DIGLETT_ROUTE_2_LOCATION]
export const VERMILION_DETOURS: GuideLocation = {
    schemaVersion: 1, id: 'red-blue-vermilion-detours', guideId: 'red-blue', stopId: 'vermilion-city',
    versionIds: ['red', 'blue'], title: 'Route 11, Diglett’s Cave & Route 2',
    releaseScope: ROUTE_11_LOCATION.releaseScope,
    coverage: 'Optional Route 11/eastern gate, Diglett’s Cave and eastern Route 2 return: five item entries, ten Route 11 trainer parties, two NPC trades and separately labelled Route 11 grass/cave tables for Red and Blue. Fishing remains a separate named-water reference.',
    limitations: [...ROUTE_11_LOCATION.limitations, ...DIGLETT_ROUTE_2_LOCATION.limitations],
    sources: slices.flatMap((slice) => slice.sources),
    areas: slices.flatMap((slice) => slice.areas ?? []),
    directions: slices.flatMap((slice) => slice.directions),
    items: slices.flatMap((slice) => slice.items),
    trainers: slices.flatMap((slice) => slice.trainers),
    pokemonTrades: slices.flatMap((slice) => slice.pokemonTrades ?? []),
    encounters: slices.flatMap((slice) => slice.encounters),
    encountersNote: 'Choose the actual area and your game version. Route 11 grass has Ekans in Red or Sandshrew in Blue, with shared Spearow/Drowzee. Diglett’s Cave has the same Diglett/Dugtrio table in both. Exact slot fractions are conditional on an encounter being generated, not per-step or catch chances. Western Route 2 grass and Route 12 are not part of these tables; trades and fishing are separate.',
    warnings: slices.flatMap((slice) => slice.warnings),
    advice: slices.flatMap((slice) => slice.advice),
}
