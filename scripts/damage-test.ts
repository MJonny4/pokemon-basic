// scripts/damage-test.ts
// Run: npm run test:damage
// Compares our calcDamageRange against @smogon/calc (the industry-standard reference)
// Output: logs/damage-test.log  (gitignored)

import { calcDamageRange } from '../src/logic/damageCalc.ts'
import type { AttackerState, DefenderState, MoveInfo, FieldState } from '../src/logic/damageCalc.ts'
import {
    calculate, Generations,
    Pokemon as SP, Move as SM, Field as SF, Side,
} from '@smogon/calc'
import { mkdirSync, writeFileSync } from 'node:fs'

const gen = Generations.get(9)
const NO_FIELD: FieldState = { weather: null, reflect: false, lightScreen: false, isCrit: false }

// ── Helpers ───────────────────────────────────────────────────────────────────

function a(
    baseStat: number,
    statKey: 'attack' | 'special-attack',
    types: string[],
    opts: Partial<AttackerState> = {}
): AttackerState {
    return {
        level: 100, baseStat, iv: 31, ev: 0,
        nature: null, statKey, types,
        item: null, isBurned: false,
        ...opts,
    }
}

function d(
    baseDef: number,
    defKey: 'defense' | 'special-defense',
    baseHp: number,
    types: string[],
    opts: Partial<DefenderState> = {}
): DefenderState {
    return {
        level: 100, baseDef, iv: 31, ev: 0,
        nature: null, defKey, types,
        baseHp, hpIv: 31, hpEv: 0,
        item: null,
        ...opts,
    }
}

function m(name: string, type: string, category: 'physical' | 'special', power: number): MoveInfo {
    return { name, type, category, power }
}

// Smogon helpers
function sp(name: string, opts: ConstructorParameters<typeof SP>[2] = {}): SP {
    return new SP(gen, name, opts)
}
function sm(name: string, opts: ConstructorParameters<typeof SM>[2] = {}): SM {
    return new SM(gen, name, opts)
}
function sf(defReflect = false, defLightScreen = false, weather?: 'Sun' | 'Rain' | 'Sand' | 'Snow'): SF {
    return new SF({
        weather,
        attackerSide: new Side({}),
        defenderSide: new Side({ isReflect: defReflect, isLightScreen: defLightScreen }),
    })
}

// ── Test cases ────────────────────────────────────────────────────────────────

interface Case {
    id: string
    desc: string
    our: { atk: AttackerState; def: DefenderState; move: MoveInfo; field: FieldState }
    ref: { atk: SP; def: SP; move: SM; field?: SF }
    expectFail?: string  // if set, we EXPECT a mismatch (documents known bugs)
}

const CASES: Case[] = [

    // ══ PHYSICAL STAB ═════════════════════════════════════════════════════════

    {
        id: '01', desc: 'Physical STAB — Garchomp (Adamant 252) EQ vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '02', desc: 'Physical STAB — Tyranitar (Adamant 252) Crunch vs Alakazam (Timid 4HP/0Def)',
        our: {
            atk: a(134, 'attack', ['rock', 'dark'], { ev: 252, nature: 'Adamant' }),
            def: d(45, 'defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Crunch', 'dark', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Tyranitar', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Sand Stream' }),
            def: sp('Alakazam', { evs: { hp: 4 }, nature: 'Timid', ability: 'Synchronize' }),
            move: sm('Crunch'),
        },
    },

    {
        id: '03', desc: 'Physical STAB — Machamp (Adamant 252) Dynamic Punch vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['fighting'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Dynamic Punch', 'fighting', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Machamp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Guts' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Dynamic Punch'),
        },
    },

    {
        id: '04', desc: 'Physical STAB — Scizor (Adamant 252) Iron Head vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['bug', 'steel'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Iron Head', 'steel', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Scizor', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Light Metal' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Iron Head'),
        },
    },

    {
        id: '05', desc: 'Physical STAB — Dragonite (Adamant 252) Dragon Claw vs Salamence (4HP/0Def)',
        our: {
            atk: a(134, 'attack', ['dragon', 'flying'], { ev: 252, nature: 'Adamant' }),
            def: d(80, 'defense', 95, ['dragon', 'flying'], { hpEv: 4 }),
            move: m('Dragon Claw', 'dragon', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Dragonite', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Inner Focus' }),
            def: sp('Salamence', { evs: { hp: 4 }, ability: 'Intimidate' }),
            move: sm('Dragon Claw'),
        },
    },

    // ══ SPECIAL STAB ══════════════════════════════════════════════════════════

    {
        id: '06', desc: 'Special STAB — Gengar (Modest 252) Shadow Ball vs Alakazam (Timid 4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(95, 'special-defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { hp: 4 }, nature: 'Timid', ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '07', desc: 'Special STAB — Charizard (Modest 252) Flamethrower vs Blissey (Calm 252HP/252SpD)',
        our: {
            atk: a(109, 'special-attack', ['fire', 'flying'], { ev: 252, nature: 'Modest' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Flamethrower', 'fire', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Charizard', { evs: { spa: 252 }, nature: 'Modest', ability: 'Blaze' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Flamethrower'),
        },
    },

    {
        id: '08', desc: 'Special STAB — Alakazam (Modest 252) Psychic vs Gengar (Timid 4HP/0SpD)',
        our: {
            atk: a(135, 'special-attack', ['psychic'], { ev: 252, nature: 'Modest' }),
            def: d(75, 'special-defense', 60, ['ghost', 'poison'], { hpEv: 4 }),
            move: m('Psychic', 'psychic', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Alakazam', { evs: { spa: 252 }, nature: 'Modest', ability: 'Synchronize' }),
            def: sp('Gengar', { evs: { hp: 4 }, nature: 'Timid', ability: 'Cursed Body' }),
            move: sm('Psychic'),
        },
    },

    {
        id: '09', desc: 'Special STAB — Jolteon (Modest 252) Thunderbolt vs Starmie (4HP/0SpD)',
        our: {
            atk: a(110, 'special-attack', ['electric'], { ev: 252, nature: 'Modest' }),
            def: d(85, 'special-defense', 60, ['water', 'psychic'], { hpEv: 4 }),
            move: m('Thunderbolt', 'electric', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Jolteon', { evs: { spa: 252 }, nature: 'Modest', ability: 'Volt Absorb' }),
            def: sp('Starmie', { evs: { hp: 4 }, ability: 'Natural Cure' }),
            move: sm('Thunderbolt'),
        },
    },

    {
        id: '10', desc: 'Special STAB — Blastoise (Modest 252) Surf vs Tyranitar (4HP/0SpD)',
        our: {
            atk: a(85, 'special-attack', ['water'], { ev: 252, nature: 'Modest' }),
            def: d(100, 'special-defense', 100, ['rock', 'dark'], { hpEv: 4 }),
            move: m('Surf', 'water', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Blastoise', { evs: { spa: 252 }, nature: 'Modest', ability: 'Torrent' }),
            def: sp('Tyranitar', { evs: { hp: 4 }, ability: 'Sand Stream' }),
            move: sm('Surf'),
        },
    },

    // ══ TYPE EFFECTIVENESS ════════════════════════════════════════════════════

    {
        id: '11', desc: '×2 — Gyarados (Adamant 252) Waterfall vs Charizard (4HP/0Def) [Water vs Fire/Flying]',
        our: {
            atk: a(125, 'attack', ['water', 'flying'], { ev: 252, nature: 'Adamant' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Waterfall', 'water', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gyarados', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Intimidate' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Waterfall'),
        },
    },

    {
        id: '12', desc: '×2 — Jolteon (Modest 252) Thunderbolt vs Charizard (4HP/0SpD) [Electric vs Fire/Flying]',
        our: {
            atk: a(110, 'special-attack', ['electric'], { ev: 252, nature: 'Modest' }),
            def: d(85, 'special-defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Thunderbolt', 'electric', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Jolteon', { evs: { spa: 252 }, nature: 'Modest', ability: 'Volt Absorb' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Thunderbolt'),
        },
    },

    {
        id: '13', desc: '×4 — Tyranitar (Adamant 252) Stone Edge vs Charizard (4HP/0Def) [Rock vs Fire/Flying]',
        our: {
            atk: a(134, 'attack', ['rock', 'dark'], { ev: 252, nature: 'Adamant' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Stone Edge', 'rock', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Tyranitar', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Sand Stream' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Stone Edge'),
        },
    },

    {
        id: '14', desc: '×4 — Jolteon (Modest 252) Thunderbolt vs Gyarados (4HP/0SpD) [Electric vs Water/Flying]',
        our: {
            atk: a(110, 'special-attack', ['electric'], { ev: 252, nature: 'Modest' }),
            def: d(100, 'special-defense', 95, ['water', 'flying'], { hpEv: 4 }),
            move: m('Thunderbolt', 'electric', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Jolteon', { evs: { spa: 252 }, nature: 'Modest', ability: 'Volt Absorb' }),
            def: sp('Gyarados', { evs: { hp: 4 }, ability: 'Intimidate' }),
            move: sm('Thunderbolt'),
        },
    },

    {
        id: '15', desc: '×4 — Charizard (Modest 252) Flamethrower vs Scizor (4HP/0SpD) [Fire vs Bug/Steel]',
        our: {
            atk: a(109, 'special-attack', ['fire', 'flying'], { ev: 252, nature: 'Modest' }),
            def: d(80, 'special-defense', 70, ['bug', 'steel'], { hpEv: 4 }),
            move: m('Flamethrower', 'fire', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Charizard', { evs: { spa: 252 }, nature: 'Modest', ability: 'Blaze' }),
            def: sp('Scizor', { evs: { hp: 4 }, ability: 'Light Metal' }),
            move: sm('Flamethrower'),
        },
    },

    {
        id: '16', desc: '×4 — Lapras (Modest 252) Blizzard vs Dragonite (4HP/0SpD) [Ice vs Dragon/Flying]',
        our: {
            atk: a(85, 'special-attack', ['water', 'ice'], { ev: 252, nature: 'Modest' }),
            def: d(100, 'special-defense', 91, ['dragon', 'flying'], { hpEv: 4 }),
            move: m('Blizzard', 'ice', 'special', 110),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Lapras', { evs: { spa: 252 }, nature: 'Modest', ability: 'Water Absorb' }),
            def: sp('Dragonite', { evs: { hp: 4 }, ability: 'Inner Focus' }),
            move: sm('Blizzard'),
        },
    },

    {
        id: '17', desc: '×0.5 — Blastoise (Modest 252) Surf vs Gyarados (4HP/0SpD) [Water vs Water/Flying]',
        our: {
            atk: a(85, 'special-attack', ['water'], { ev: 252, nature: 'Modest' }),
            def: d(100, 'special-defense', 95, ['water', 'flying'], { hpEv: 4 }),
            move: m('Surf', 'water', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Blastoise', { evs: { spa: 252 }, nature: 'Modest', ability: 'Torrent' }),
            def: sp('Gyarados', { evs: { hp: 4 }, ability: 'Intimidate' }),
            move: sm('Surf'),
        },
    },

    {
        id: '18', desc: '×0.5 — Gengar (Modest 252) Shadow Ball vs Umbreon (4HP/0SpD) [Ghost vs Dark]',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(130, 'special-defense', 95, ['dark'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Umbreon', { evs: { hp: 4 }, ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '19', desc: '×0.25 — Tyranitar (Adamant 252) Stone Edge vs Steelix (4HP/0Def) [Rock vs Steel/Ground]',
        our: {
            atk: a(134, 'attack', ['rock', 'dark'], { ev: 252, nature: 'Adamant' }),
            def: d(200, 'defense', 75, ['steel', 'ground'], { hpEv: 4 }),
            move: m('Stone Edge', 'rock', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Tyranitar', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Sand Stream' }),
            def: sp('Steelix', { evs: { hp: 4 }, ability: 'Rock Head' }),
            move: sm('Stone Edge'),
        },
    },

    {
        id: '20', desc: '×0 immune — Garchomp (Adamant 252) Earthquake vs Dragonite [Ground vs Dragon/Flying]',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant' }),
            def: d(95, 'defense', 91, ['dragon', 'flying'], { hpEv: 4 }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin' }),
            def: sp('Dragonite', { evs: { hp: 4 }, ability: 'Inner Focus' }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '21', desc: '×0 immune — Gengar Shadow Ball vs Blissey [Ghost vs Normal]',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Shadow Ball'),
        },
    },

    // ══ ITEMS ═════════════════════════════════════════════════════════════════

    {
        id: '22', desc: 'Choice Band — Tyranitar (CB Adamant 252) Stone Edge vs Dragonite (4HP/0Def)',
        our: {
            atk: a(134, 'attack', ['rock', 'dark'], { ev: 252, nature: 'Adamant', item: 'Choice Band' }),
            def: d(95, 'defense', 91, ['dragon', 'flying'], { hpEv: 4 }),
            move: m('Stone Edge', 'rock', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Tyranitar', { evs: { atk: 252 }, nature: 'Adamant', item: 'Choice Band', ability: 'Sand Stream' }),
            def: sp('Dragonite', { evs: { hp: 4 }, ability: 'Inner Focus' }),
            move: sm('Stone Edge'),
        },
    },

    {
        id: '23', desc: 'Choice Specs — Alakazam (CS Modest 252) Psychic vs Blissey (Calm 252HP/252SpD)',
        our: {
            atk: a(135, 'special-attack', ['psychic'], { ev: 252, nature: 'Modest', item: 'Choice Specs' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Psychic', 'psychic', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Alakazam', { evs: { spa: 252 }, nature: 'Modest', item: 'Choice Specs', ability: 'Synchronize' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Psychic'),
        },
    },

    {
        id: '24', desc: 'Life Orb — Gengar (LO Modest 252) Shadow Ball vs Alakazam (4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest', item: 'Life Orb' }),
            def: d(95, 'special-defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', item: 'Life Orb', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { hp: 4 }, ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '25', desc: 'Expert Belt (SE) — Tyranitar (EB Adamant 252) Stone Edge vs Charizard [4x SE → +20%]',
        our: {
            atk: a(134, 'attack', ['rock', 'dark'], { ev: 252, nature: 'Adamant', item: 'Expert Belt' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Stone Edge', 'rock', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Tyranitar', { evs: { atk: 252 }, nature: 'Adamant', item: 'Expert Belt', ability: 'Sand Stream' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Stone Edge'),
        },
    },

    {
        id: '26', desc: 'Expert Belt (neutral) — Scizor (EB Adamant 252) Iron Head vs Blissey [no boost expected]',
        our: {
            atk: a(130, 'attack', ['bug', 'steel'], { ev: 252, nature: 'Adamant', item: 'Expert Belt' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Iron Head', 'steel', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Scizor', { evs: { atk: 252 }, nature: 'Adamant', item: 'Expert Belt', ability: 'Light Metal' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Iron Head'),
        },
    },

    {
        id: '27', desc: 'Muscle Band — Garchomp (MB Adamant 252) Earthquake vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant', item: 'Muscle Band' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', item: 'Muscle Band', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '28', desc: 'Wise Glasses — Gengar (WG Modest 252) Shadow Ball vs Alakazam (4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest', item: 'Wise Glasses' }),
            def: d(95, 'special-defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', item: 'Wise Glasses', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { hp: 4 }, ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '29', desc: 'Charcoal — Charizard (Charcoal Modest 252) Flamethrower vs Blissey (Calm 252HP/252SpD)',
        our: {
            atk: a(109, 'special-attack', ['fire', 'flying'], { ev: 252, nature: 'Modest', item: 'Charcoal' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Flamethrower', 'fire', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Charizard', { evs: { spa: 252 }, nature: 'Modest', item: 'Charcoal', ability: 'Blaze' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Flamethrower'),
        },
    },

    {
        id: '30', desc: 'Mystic Water — Gyarados (MW Adamant 252) Waterfall vs Charizard (4HP/0Def)',
        our: {
            atk: a(125, 'attack', ['water', 'flying'], { ev: 252, nature: 'Adamant', item: 'Mystic Water' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Waterfall', 'water', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gyarados', { evs: { atk: 252 }, nature: 'Adamant', item: 'Mystic Water', ability: 'Intimidate' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Waterfall'),
        },
    },

    {
        id: '31', desc: 'Eviolite defender — Gengar (Modest 252) Shadow Ball vs Haunter (Eviolite 4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(55, 'special-defense', 45, ['ghost', 'poison'], { hpEv: 4, item: 'Eviolite' }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Haunter', { evs: { hp: 4 }, item: 'Eviolite', ability: 'Levitate' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '32', desc: 'Assault Vest — Gengar (Modest 252) Shadow Ball vs Togekiss (AV 4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(115, 'special-defense', 85, ['fairy', 'flying'], { hpEv: 4, item: 'Assault Vest' }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Togekiss', { evs: { hp: 4 }, item: 'Assault Vest', ability: 'Serene Grace' }),
            move: sm('Shadow Ball'),
        },
    },

    // ══ ABILITIES ═════════════════════════════════════════════════════════════

    {
        id: '33', desc: 'Adaptability — Porygon-Z (Adaptability Modest 252) Hyper Voice vs Blissey (Calm 252HP/252SpD)',
        our: {
            atk: a(135, 'special-attack', ['normal'], { ev: 252, nature: 'Modest', adaptability: true }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Hyper Voice', 'normal', 'special', 90),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Porygon-Z', { evs: { spa: 252 }, nature: 'Modest', ability: 'Adaptability' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Hyper Voice'),
        },
    },

    {
        id: '34', desc: 'Huge Power — Azumarill (Huge Power Adamant 252) Waterfall vs Garchomp (4HP/0Def)',
        our: {
            atk: a(50, 'attack', ['water', 'fairy'], { ev: 252, nature: 'Adamant', hugepower: true }),
            def: d(95, 'defense', 108, ['dragon', 'ground'], { hpEv: 4 }),
            move: m('Waterfall', 'water', 'physical', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Azumarill', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Huge Power' }),
            def: sp('Garchomp', { evs: { hp: 4 }, ability: 'Rough Skin' }),
            move: sm('Waterfall'),
        },
    },

    {
        id: '35', desc: 'Hustle — Nidoking (Hustle Adamant 252) Earthquake vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(102, 'attack', ['poison', 'ground'], { ev: 252, nature: 'Adamant', hustle: true }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Nidoking', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Hustle' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '36', desc: 'Guts (burned) — Conkeldurr (Guts Adamant 252 burned) Drain Punch vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(140, 'attack', ['fighting'], { ev: 252, nature: 'Adamant', isBurned: true, guts: true }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Drain Punch', 'fighting', 'physical', 75),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Conkeldurr', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Guts', status: 'brn' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Drain Punch'),
        },
    },

    {
        id: '37', desc: 'Burn penalty (no Guts) — Scizor (Adamant 252 burned) Bullet Punch vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['bug', 'steel'], { ev: 252, nature: 'Adamant', isBurned: true }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Bullet Punch', 'steel', 'physical', 40),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Scizor', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Light Metal', status: 'brn' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Bullet Punch'),
        },
    },

    // ══ WEATHER ═══════════════════════════════════════════════════════════════

    {
        id: '38', desc: 'Sun boost — Charizard (Modest 252) Flamethrower vs Blissey (Calm 252HP/252SpD) in Sun',
        our: {
            atk: a(109, 'special-attack', ['fire', 'flying'], { ev: 252, nature: 'Modest' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Flamethrower', 'fire', 'special', 90),
            field: { weather: 'sun', reflect: false, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Charizard', { evs: { spa: 252 }, nature: 'Modest', ability: 'Blaze' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Flamethrower'),
            field: sf(false, false, 'Sun'),
        },
    },

    {
        id: '39', desc: 'Sun nerf — Blastoise (Modest 252) Surf vs Blissey (Calm 252HP/252SpD) in Sun',
        our: {
            atk: a(85, 'special-attack', ['water'], { ev: 252, nature: 'Modest' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Surf', 'water', 'special', 90),
            field: { weather: 'sun', reflect: false, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Blastoise', { evs: { spa: 252 }, nature: 'Modest', ability: 'Torrent' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Surf'),
            field: sf(false, false, 'Sun'),
        },
    },

    {
        id: '40', desc: 'Rain boost — Gyarados (Adamant 252) Waterfall vs Charizard (4HP/0Def) in Rain',
        our: {
            atk: a(125, 'attack', ['water', 'flying'], { ev: 252, nature: 'Adamant' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Waterfall', 'water', 'physical', 80),
            field: { weather: 'rain', reflect: false, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Gyarados', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Intimidate' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Waterfall'),
            field: sf(false, false, 'Rain'),
        },
    },

    {
        id: '41', desc: 'Rain nerf — Charizard (Modest 252) Flamethrower vs Blissey (Calm 252HP/252SpD) in Rain',
        our: {
            atk: a(109, 'special-attack', ['fire', 'flying'], { ev: 252, nature: 'Modest' }),
            def: d(135, 'special-defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Calm' }),
            move: m('Flamethrower', 'fire', 'special', 90),
            field: { weather: 'rain', reflect: false, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Charizard', { evs: { spa: 252 }, nature: 'Modest', ability: 'Blaze' }),
            def: sp('Blissey', { evs: { hp: 252, spd: 252 }, nature: 'Calm', ability: 'Natural Cure' }),
            move: sm('Flamethrower'),
            field: sf(false, false, 'Rain'),
        },
    },

    // ══ SCREENS ═══════════════════════════════════════════════════════════════

    {
        id: '42', desc: 'Reflect — Garchomp (Adamant 252) Earthquake vs Blissey (Bold 252HP/252Def) under Reflect',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: { weather: null, reflect: true, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake'),
            field: sf(true, false),
        },
    },

    {
        id: '43', desc: 'Light Screen — Gengar (Modest 252) Shadow Ball vs Alakazam (4HP/0SpD) under Light Screen',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(95, 'special-defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: { weather: null, reflect: false, lightScreen: true, isCrit: false },
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { hp: 4 }, ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
            field: sf(false, true),
        },
    },

    // ══ CRITICAL HITS ═════════════════════════════════════════════════════════

    {
        id: '44', desc: 'Crit — Garchomp (Adamant 252) Earthquake vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: { weather: null, reflect: false, lightScreen: false, isCrit: true },
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake', { isCrit: true }),
        },
    },

    {
        id: '45', desc: 'Crit special — Gengar (Modest 252) Shadow Ball vs Alakazam (4HP/0SpD)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(95, 'special-defense', 55, ['psychic'], { hpEv: 4 }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: { weather: null, reflect: false, lightScreen: false, isCrit: true },
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { hp: 4 }, ability: 'Synchronize' }),
            move: sm('Shadow Ball', { isCrit: true }),
        },
    },

    {
        id: '46', desc: 'Crit ignores Reflect (Gen9 rule) — Garchomp (Adamant 252) EQ (crit) vs Blissey under Reflect',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: { weather: null, reflect: true, lightScreen: false, isCrit: true },
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake', { isCrit: true }),
            field: sf(true, false),  // Reflect active, but crit should ignore it
        },
        expectFail: 'Our code applies Reflect even on crits. Gen 9 rule: crits bypass screens.',
    },

    // ══ LEVELS AND EVs ════════════════════════════════════════════════════════

    {
        id: '47', desc: 'Level 50 — Garchomp (Adamant 252 Lv50) Earthquake vs Blissey (Bold 252HP/252Def Lv50)',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 252, nature: 'Adamant', level: 50 }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold', level: 50 }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Rough Skin', level: 50 }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure', level: 50 }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '48', desc: '0 EVs/IVs attacker — Garchomp (Serious 0Atk/0IV) Earthquake vs Blissey (Bold 252HP/252Def)',
        our: {
            atk: a(130, 'attack', ['dragon', 'ground'], { ev: 0, iv: 0, nature: 'Serious' }),
            def: d(10, 'defense', 255, ['normal'], { ev: 252, hpEv: 252, nature: 'Bold' }),
            move: m('Earthquake', 'ground', 'physical', 100),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Garchomp', { evs: { atk: 0 }, ivs: { atk: 0 }, nature: 'Serious', ability: 'Rough Skin' }),
            def: sp('Blissey', { evs: { hp: 252, def: 252 }, nature: 'Bold', ability: 'Natural Cure' }),
            move: sm('Earthquake'),
        },
    },

    {
        id: '49', desc: '0 EVs/IVs defender — Gengar (Modest 252) Shadow Ball vs Alakazam (Serious 0SpD/0IV)',
        our: {
            atk: a(130, 'special-attack', ['ghost', 'poison'], { ev: 252, nature: 'Modest' }),
            def: d(95, 'special-defense', 55, ['psychic'], { ev: 0, iv: 0, nature: 'Serious' }),
            move: m('Shadow Ball', 'ghost', 'special', 80),
            field: NO_FIELD,
        },
        ref: {
            atk: sp('Gengar', { evs: { spa: 252 }, nature: 'Modest', ability: 'Cursed Body' }),
            def: sp('Alakazam', { evs: { spd: 0 }, ivs: { spd: 0 }, nature: 'Serious', ability: 'Synchronize' }),
            move: sm('Shadow Ball'),
        },
    },

    {
        id: '50', desc: 'Rain + STAB + 2x SE — Gyarados (Adamant 252) Waterfall vs Charizard (4HP/0Def) in Rain',
        our: {
            atk: a(125, 'attack', ['water', 'flying'], { ev: 252, nature: 'Adamant' }),
            def: d(78, 'defense', 78, ['fire', 'flying'], { hpEv: 4 }),
            move: m('Waterfall', 'water', 'physical', 80),
            field: { weather: 'rain', reflect: false, lightScreen: false, isCrit: false },
        },
        ref: {
            atk: sp('Gyarados', { evs: { atk: 252 }, nature: 'Adamant', ability: 'Intimidate' }),
            def: sp('Charizard', { evs: { hp: 4 }, ability: 'Blaze' }),
            move: sm('Waterfall'),
            field: sf(false, false, 'Rain'),
        },
    },
]

// ── Comparison logic ──────────────────────────────────────────────────────────

function getRolls(damage: number | number[] | number[][]): number[] {
    if (typeof damage === 'number') return Array(16).fill(damage)
    if (Array.isArray(damage[0])) return (damage as number[][])[0]
    return damage as number[]
}

const out: string[] = []
function log(s = '') { out.push(s); console.log(s) }

log('╔══════════════════════════════════════════════════════════════════════╗')
log('║     PokeBasic — Damage Calc vs @smogon/calc (Gen 9 reference)       ║')
log('╚══════════════════════════════════════════════════════════════════════╝')
log(`Generated: ${new Date().toISOString()}`)
log()

let passed = 0
let failed = 0
let expected = 0

for (const tc of CASES) {
    const ours = calcDamageRange(tc.our.move, tc.our.atk, tc.our.def, tc.our.field)
    const ref = calculate(gen, tc.ref.atk, tc.ref.def, tc.ref.move, tc.ref.field)

    const refRolls = getRolls(ref.damage)
    const isImmune = refRolls.every(r => r === 0)

    log(`─── Case ${tc.id}: ${tc.desc}`)

    if (tc.expectFail) {
        log(`    ⚠  EXPECTED FAILURE: ${tc.expectFail}`)
    }

    if (!ours) {
        if (isImmune) {
            log('    ✓  Both: immune (0 damage)')
            passed++
        } else {
            log('    ✗  Ours returned null but Smogon returned damage!')
            log(`       Smogon rolls: [${refRolls.join(', ')}]`)
            failed++
        }
        log()
        continue
    }

    if (ours.effectiveness === 0 && isImmune) {
        log(`    ✓  Both: immune  (koChance: "${ours.koChance}")`)
        if (tc.expectFail) expected++
        else passed++
        log()
        continue
    }

    // Compare rolls
    const rollsMatch = ours.rolls.length === refRolls.length &&
        ours.rolls.every((r, i) => r === refRolls[i])

    if (rollsMatch && !tc.expectFail) {
        log(`    ✓  Rolls match: [${ours.rolls[0]}–${ours.rolls[ours.rolls.length - 1]}]  (${ours.minPct}%–${ours.maxPct}%)`)
        log(`       ${ref.desc()}`)
        passed++
    } else if (!rollsMatch && tc.expectFail) {
        log(`    ✓  EXPECTED mismatch confirmed (bug documented)`)
        log(`       Ours:   [${ours.rolls.join(', ')}]`)
        log(`       Smogon: [${refRolls.join(', ')}]`)
        expected++
    } else if (!rollsMatch) {
        log(`    ✗  MISMATCH`)
        log(`       Ours:   [${ours.rolls.join(', ')}]  (${ours.minPct}%–${ours.maxPct}%)`)
        log(`       Smogon: [${refRolls.join(', ')}]`)
        log(`       Smogon desc: ${ref.desc()}`)
        const diffs = ours.rolls.map((r, i) => r - refRolls[i]).filter(d => d !== 0)
        log(`       Diffs: ${diffs.join(', ')}  (${diffs.length}/16 rolls off)`)
        failed++
    } else {
        // rollsMatch && expectFail — bug seems to be fixed
        log(`    ⚠  Expected failure but rolls MATCHED — bug may be fixed!`)
        log(`       Rolls: [${ours.rolls.join(', ')}]`)
        expected++
    }
    log()
}

log('══════════════════════════════════════════════════════════════════════')
log(`Results: ${passed} passed  |  ${failed} failed  |  ${expected} expected-fail`)
if (failed > 0) {
    log()
    log('For each MISMATCH, check:')
    log('  • Nature mult key casing (NATURES uses "attack" not "Attack")')
    log('  • Order of integer floor() steps vs Gen 9 spec')
    log('  • Item modifier applied to wrong stat or at wrong step')
    log('  • Weather applied before random rolls (step 1, not after)')
}
log('══════════════════════════════════════════════════════════════════════')

mkdirSync('logs', { recursive: true })
writeFileSync('logs/damage-test.log', out.join('\n') + '\n', 'utf8')
console.log('\n✓ Full results written to logs/damage-test.log')
