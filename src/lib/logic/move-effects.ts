export type StatusCondition = 'burn' | 'paralysis' | 'sleep' | 'poison' | 'toxic' | 'freeze'

export interface MoveEffect {
    inflictStatus?: StatusCondition        // applied to the target
    selfStatus?: StatusCondition           // applied to the user
    statChanges?: { target: 'self' | 'foe'; stat: string; stages: number }[]
    heal?: number                          // fraction of max HP (e.g. 0.5 = 50%)
    priority?: number                      // default 0
    protect?: true                         // blocks damage this turn
    recoil?: number                        // fraction of damage dealt as recoil
    selfFaint?: true                       // user faints after using the move (Explosion, Self-Destruct)
}

export const MOVE_EFFECTS: Record<string, MoveEffect> = {
    // ── Status infliction ──────────────────────────────────────────────────────
    'thunder-wave':     { inflictStatus: 'paralysis' },
    'glare':            { inflictStatus: 'paralysis' },
    'stun-spore':       { inflictStatus: 'paralysis' },
    'toxic':            { inflictStatus: 'toxic' },
    'poison-powder':    { inflictStatus: 'poison' },
    'poison-gas':       { inflictStatus: 'poison' },
    'spore':            { inflictStatus: 'sleep' },
    'sleep-powder':     { inflictStatus: 'sleep' },
    'hypnosis':         { inflictStatus: 'sleep' },
    'lovely-kiss':      { inflictStatus: 'sleep' },
    'sing':             { inflictStatus: 'sleep' },
    'will-o-wisp':      { inflictStatus: 'burn' },
    'freeze-dry':       { inflictStatus: 'freeze' },
    'blizzard':         { inflictStatus: 'freeze' },  // 10% chance — simplified to always for AI

    // ── Stat-boosting (self) ──────────────────────────────────────────────────
    'swords-dance':     { statChanges: [{ target: 'self', stat: 'attack', stages: 2 }] },
    'nasty-plot':       { statChanges: [{ target: 'self', stat: 'special-attack', stages: 2 }] },
    'dragon-dance':     { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }, { target: 'self', stat: 'speed', stages: 1 }] },
    'calm-mind':        { statChanges: [{ target: 'self', stat: 'special-attack', stages: 1 }, { target: 'self', stat: 'special-defense', stages: 1 }] },
    'quiver-dance':     { statChanges: [{ target: 'self', stat: 'special-attack', stages: 1 }, { target: 'self', stat: 'special-defense', stages: 1 }, { target: 'self', stat: 'speed', stages: 1 }] },
    'bulk-up':          { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }, { target: 'self', stat: 'defense', stages: 1 }] },
    'iron-defense':     { statChanges: [{ target: 'self', stat: 'defense', stages: 2 }] },
    'cosmic-power':     { statChanges: [{ target: 'self', stat: 'defense', stages: 1 }, { target: 'self', stat: 'special-defense', stages: 1 }] },
    'growth':           { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }, { target: 'self', stat: 'special-attack', stages: 1 }] },
    'agility':          { statChanges: [{ target: 'self', stat: 'speed', stages: 2 }] },
    'rock-polish':      { statChanges: [{ target: 'self', stat: 'speed', stages: 2 }] },
    'hone-claws':       { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }] },
    'shell-smash':      { statChanges: [{ target: 'self', stat: 'attack', stages: 2 }, { target: 'self', stat: 'special-attack', stages: 2 }, { target: 'self', stat: 'speed', stages: 2 }, { target: 'self', stat: 'defense', stages: -1 }, { target: 'self', stat: 'special-defense', stages: -1 }] },
    'coil':             { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }, { target: 'self', stat: 'defense', stages: 1 }] },
    'work-up':          { statChanges: [{ target: 'self', stat: 'attack', stages: 1 }, { target: 'self', stat: 'special-attack', stages: 1 }] },
    'geomancy':         { statChanges: [{ target: 'self', stat: 'special-attack', stages: 2 }, { target: 'self', stat: 'special-defense', stages: 2 }, { target: 'self', stat: 'speed', stages: 2 }] },
    'stockpile':        { statChanges: [{ target: 'self', stat: 'defense', stages: 1 }, { target: 'self', stat: 'special-defense', stages: 1 }] },

    // ── Stat-lowering (foe) ───────────────────────────────────────────────────
    'growl':            { statChanges: [{ target: 'foe', stat: 'attack', stages: -1 }] },
    'tail-whip':        { statChanges: [{ target: 'foe', stat: 'defense', stages: -1 }] },
    'screech':          { statChanges: [{ target: 'foe', stat: 'defense', stages: -2 }] },
    'leer':             { statChanges: [{ target: 'foe', stat: 'defense', stages: -1 }] },
    'charm':            { statChanges: [{ target: 'foe', stat: 'attack', stages: -2 }] },
    'sweet-scent':      { statChanges: [{ target: 'foe', stat: 'speed', stages: -1 }] },
    'fake-tears':       { statChanges: [{ target: 'foe', stat: 'special-defense', stages: -2 }] },
    'metal-sound':      { statChanges: [{ target: 'foe', stat: 'special-defense', stages: -2 }] },

    // ── Healing ───────────────────────────────────────────────────────────────
    'recover':          { heal: 0.5 },
    'roost':            { heal: 0.5 },
    'synthesis':        { heal: 0.5 },
    'moonlight':        { heal: 0.5 },
    'slack-off':        { heal: 0.5 },
    'soft-boiled':      { heal: 0.5 },
    'milk-drink':       { heal: 0.5 },
    'healing-wish':     { heal: 1.0 },
    'wish':             { heal: 0.5 },
    'rest':             { heal: 1.0, selfStatus: 'sleep' },

    // ── Self-faint moves ──────────────────────────────────────────────────────
    'explosion':        { selfFaint: true },
    'self-destruct':    { selfFaint: true },
    'memento':          { selfFaint: true, statChanges: [{ target: 'foe', stat: 'attack', stages: -2 }, { target: 'foe', stat: 'special-attack', stages: -2 }] },

    // ── Priority moves ────────────────────────────────────────────────────────
    'protect':          { protect: true, priority: 4 },
    'detect':           { protect: true, priority: 4 },
    'baneful-bunker':   { protect: true, priority: 4 },
    'quick-attack':     { priority: 1 },
    'extreme-speed':    { priority: 2 },
    'sucker-punch':     { priority: 1 },
    'shadow-sneak':     { priority: 1 },
    'mach-punch':       { priority: 1 },
    'bullet-punch':     { priority: 1 },
    'ice-shard':        { priority: 1 },
    'aqua-jet':         { priority: 1 },
    'fake-out':         { priority: 3 },
    'vacuum-wave':      { priority: 1 },
    'water-shuriken':   { priority: 1 },
    'first-impression': { priority: 2 },
}

/** Get the priority of a move (0 if not listed). */
export function getMovePriority(moveName: string): number {
    return MOVE_EFFECTS[moveName]?.priority ?? 0
}
