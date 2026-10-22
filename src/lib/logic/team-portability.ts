import type { TeamSlot } from '../../alpine/stores/team'
import { NATURES } from '../data/natures'

export const TEAM_SLOTS = 6
export const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const
const LABELS: Record<string, string> = {
    hp: 'HP', attack: 'Atk', defense: 'Def',
    'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
}
const KEYS: Record<string, string> = Object.fromEntries(Object.entries(LABELS).map(([key, label]) => [label.toLowerCase(), key]))
const TYPES = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'])
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const validStats = (value: unknown): boolean => isRecord(value) && STAT_KEYS.every((key) => Number.isFinite(value[key]) && Number(value[key]) >= 1)
const validPoints = (value: unknown, max: number): value is Record<string, number> =>
    isRecord(value) && STAT_KEYS.every((key) => Number.isInteger(value[key]) && Number(value[key]) >= 0 && Number(value[key]) <= max)
const pointsTotal = (value: unknown): number => isRecord(value) ? STAT_KEYS.reduce((sum, key) => sum + Number(value[key]), 0) : Infinity
const readable = (value: string) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('-')

export interface ImportedSet {
    species: string
    item: string | null
    ability: string | null
    teraType: string | null
    nature: string | null
    level: number
    evs: Record<string, number>
    ivs: Record<string, number>
    moves: TeamSlot['moves']
}

/** Export the fields Team Lab can keep. This is a human-readable Showdown set, not legality validation. */
export function exportShowdownSet(slot: TeamSlot): string {
    const lines = [slot.item ? `${readable(slot.pokemonName)} @ ${slot.item}` : readable(slot.pokemonName)]
    if (slot.ability) lines.push(`Ability: ${slot.ability.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}`)
    if (slot.teraType) lines.push(`Tera Type: ${readable(slot.teraType)}`)
    lines.push(`Level: ${slot.level ?? 50}`)
    const evs = STAT_KEYS.filter((key) => (slot.evs?.[key] ?? 0) > 0).map((key) => `${slot.evs[key]} ${LABELS[key]}`)
    if (evs.length) lines.push(`EVs: ${evs.join(' / ')}`)
    if (slot.nature) lines.push(`${slot.nature} Nature`)
    const ivs = STAT_KEYS.filter((key) => (slot.ivs?.[key] ?? 31) !== 31).map((key) => `${slot.ivs[key]} ${LABELS[key]}`)
    if (ivs.length) lines.push(`IVs: ${ivs.join(' / ')}`)
    for (const move of slot.moves) if (move) lines.push(`- ${readable(move)}`)
    return lines.join('\n')
}

export function exportShowdownTeam(slots: (TeamSlot | null)[]): string {
    return slots.filter((slot): slot is TeamSlot => Boolean(slot)).map(exportShowdownSet).join('\n\n')
}

function textField(value: string, label: string): string {
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 80 || /[\r\n<>]/.test(trimmed)) throw new Error(`${label} must be 1–80 plain-text characters.`)
    return trimmed
}

function slug(value: string): string {
    return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseStats(value: string, label: 'EVs' | 'IVs', target: Record<string, number>): void {
    const seen = new Set<string>()
    for (const part of value.split(' / ')) {
        const match = /^(\d{1,3})\s+(HP|Atk|Def|SpA|SpD|Spe)$/i.exec(part.trim())
        if (!match) throw new Error(`Invalid ${label} entry: ${part.trim()}`)
        const key = KEYS[match[2].toLowerCase()]
        const amount = Number(match[1])
        if (seen.has(key) || amount > (label === 'EVs' ? 252 : 31)) throw new Error(`Invalid ${label} value for ${match[2]}.`)
        target[key] = amount
        seen.add(key)
    }
    if (label === 'EVs' && Object.values(target).reduce((sum, amount) => sum + amount, 0) > 508) throw new Error('EV total exceeds Team Lab’s 508 limit.')
}

/** Strictly parse the Showdown text fields Team Lab stores; reject unsupported fields rather than lose them. */
export function parseShowdownTeam(text: string): ImportedSet[] {
    if (!text.trim() || text.length > 30_000) throw new Error('Paste 1–6 Showdown sets (up to 30 KB).')
    const blocks = text.trim().replace(/\r\n?/g, '\n').split(/\n\s*\n/)
    if (blocks.length > TEAM_SLOTS) throw new Error('A team can contain at most six sets.')
    return blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        let header = lines.shift() ?? ''
        const itemSplit = header.split(' @ ')
        if (itemSplit.length > 2) throw new Error(`Set ${index + 1}: invalid species and item line.`)
        header = itemSplit[0]
        // A nickname can only be retained when it equals the species; otherwise importing it would lose data.
        const named = /^(.+) \(([^()]+)\)$/.exec(header)
        if (named) {
            if (slug(named[1]) !== slug(named[2])) throw new Error(`Set ${index + 1}: nicknames cannot be stored in Team Lab.`)
            header = named[2]
        }
        const species = slug(textField(header, 'Species'))
        if (!species) throw new Error(`Set ${index + 1}: invalid species.`)
        const set: ImportedSet = {
            species, item: itemSplit[1] ? textField(itemSplit[1], 'Item') : null,
            ability: null, teraType: null, nature: null, level: 50,
            evs: Object.fromEntries(STAT_KEYS.map((key) => [key, 0])),
            ivs: Object.fromEntries(STAT_KEYS.map((key) => [key, 31])),
            moves: [null, null, null, null],
        }
        const seen = new Set<string>()
        let moves = 0
        for (const line of lines) {
            if (line.startsWith('- ')) {
                if (moves === 4) throw new Error(`Set ${index + 1}: more than four moves.`)
                set.moves[moves++] = slug(textField(line.slice(2), 'Move'))
                continue
            }
            const nature = /^([A-Za-z]+) Nature$/.exec(line)
            const field = nature ? 'Nature' : line.split(':', 1)[0]
            if (seen.has(field)) throw new Error(`Set ${index + 1}: repeated ${field}.`)
            seen.add(field)
            if (nature && Object.hasOwn(NATURES, nature[1])) set.nature = nature[1]
            else if (field === 'Ability') set.ability = slug(textField(line.slice(8), 'Ability'))
            else if (field === 'Tera Type') {
                const type = slug(textField(line.slice(10), 'Tera Type'))
                if (!TYPES.has(type)) throw new Error(`Set ${index + 1}: unknown Tera Type.`)
                set.teraType = type
            } else if (field === 'Level') {
                const value = line.slice(6).trim()
                if (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 100) throw new Error(`Set ${index + 1}: Level must be 1–100.`)
                set.level = Number(value)
            } else if (field === 'EVs' || field === 'IVs') parseStats(line.slice(4).trim(), field, field === 'EVs' ? set.evs : set.ivs)
            else throw new Error(`Set ${index + 1}: unsupported or invalid line: ${line.slice(0, 80)}`)
        }
        return set
    })
}

/** Validate stored and imported snapshots without rewriting historical `team_lab` bytes on read. */
export function validateTeamSlots(value: unknown): asserts value is (TeamSlot | null)[] {
    if (!Array.isArray(value) || value.length !== TEAM_SLOTS) throw new Error('Team must have exactly six slots.')
    for (const [index, slot] of value.entries()) {
        if (slot === null) continue
        if (!isRecord(slot) || !Number.isSafeInteger(slot.pokemonId) || Number(slot.pokemonId) < 1 ||
            typeof slot.pokemonName !== 'string' || !/^[a-z0-9-]{1,80}$/.test(slot.pokemonName) ||
            !Array.isArray(slot.types) || !slot.types.every((type) => typeof type === 'string' && TYPES.has(type)) ||
            !validStats(slot.stats) ||
            !Array.isArray(slot.moves) || slot.moves.length !== 4 ||
            !slot.moves.every((move) => move === null || (typeof move === 'string' && /^[a-z0-9-]{1,80}$/.test(move))) ||
            !validPoints(slot.evs, 252) || !validPoints(slot.ivs, 31) ||
            pointsTotal(slot.evs) > 508 ||
            (slot.nature != null && (typeof slot.nature !== 'string' || !Object.hasOwn(NATURES, slot.nature))) ||
            (slot.item != null && (typeof slot.item !== 'string' || slot.item.length > 80)) ||
            (slot.ability != null && (typeof slot.ability !== 'string' || slot.ability.length > 80)) ||
            (slot.teraType != null && (typeof slot.teraType !== 'string' || !TYPES.has(slot.teraType))) ||
            !Number.isInteger(slot.level) || Number(slot.level) < 1 || Number(slot.level) > 100) {
            throw new Error(`Slot ${index + 1} contains invalid or unsupported team data.`)
        }
    }
}
