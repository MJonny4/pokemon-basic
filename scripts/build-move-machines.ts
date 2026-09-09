/**
 * Build the committed, version-aware TM/HM/TR mapping used by the move pages.
 *
 * PokéAPI's REST machine resources are one-record-at-a-time. Its official CSV
 * sources contain the same relationships in four small downloads, which makes
 * this batch enrichment much faster. Run manually:
 *
 *   bun scripts/build-move-machines.ts
 *
 * Never wire this into build/CI: the generated JSON is committed for offline use.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import movesData from '../src/lib/data/moves-data.json'
import { MACHINE_GAMES, type MachineKind } from '../src/lib/data/machine-games'
import type { MoveMachineAssignment } from '../src/lib/logic/machines'

const CSV_ROOT = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const OUT = join(import.meta.dir, '../src/lib/data/move-machines.json')

interface CsvRow { [column: string]: string }

async function fetchCsv(name: string): Promise<CsvRow[]> {
    const response = await fetch(`${CSV_ROOT}/${name}.csv`)
    if (!response.ok) throw new Error(`Failed to fetch ${name}.csv (${response.status})`)
    const lines = (await response.text()).trim().split(/\r?\n/)
    const headings = lines.shift()?.split(',') ?? []
    // These four PokéAPI tables contain only integer IDs and slug identifiers;
    // none of the columns read here can contain an escaped comma.
    return lines.map((line) => Object.fromEntries(
        line.split(',').map((value, index) => [headings[index], value]),
    ))
}

function idMap(rows: CsvRow[]): Map<string, string> {
    return new Map(rows.map((row) => [row.id, row.identifier]))
}

function splitCode(identifier: string): { kind: MachineKind; number: number } {
    const match = identifier.match(/^(tm|hm|tr)(\d+)$/)
    if (!match) throw new Error(`Unexpected machine item identifier: ${identifier}`)
    return { kind: match[1] as MachineKind, number: Number(match[2]) }
}

const [machineRows, itemRows, moveRows, versionGroupRows] = await Promise.all([
    fetchCsv('machines'),
    fetchCsv('items'),
    fetchCsv('moves'),
    fetchCsv('version_groups'),
])

const itemById = idMap(itemRows)
const moveById = idMap(moveRows)
const gameById = idMap(versionGroupRows)
const supportedGames = new Set(MACHINE_GAMES.map((game) => game.slug))

interface MachineRecord extends MoveMachineAssignment { move: string }

const records: MachineRecord[] = machineRows.flatMap((row) => {
    const game = gameById.get(row.version_group_id)
    const move = moveById.get(row.move_id)
    const item = itemById.get(row.item_id)
    if (!game || !move || !item || !supportedGames.has(game)) return []
    const { kind, number } = splitCode(item)
    return [{ move, kind, number, game }]
})

// PokéAPI includes Dive/HM08 as a compatibility marker in FRLG, although
// only seven HMs are obtainable there. It also includes the unreleased BW TM95.
const corrected = records.filter((record) =>
    !(record.game === 'firered-leafgreen' && record.kind === 'hm' && record.number === 8)
    && !(record.game === 'black-white' && record.kind === 'tm' && record.number === 95)
    && record.game !== 'brilliant-diamond-shining-pearl',
)

// PokéAPI stores BDSP as nine changed TMs plus eight legacy HM-shaped rows,
// not as its actual bag list. Rebuild TM01–100 from Diamond/Pearl, apply the
// nine BDSP replacements, then renumber the former HMs to TM93–TM100.
const dp = records.filter((record) => record.game === 'diamond-pearl')
const bdspDelta = records.filter((record) => record.game === 'brilliant-diamond-shining-pearl')
const bdspByNumber = new Map<number, string>()
for (const record of dp) {
    if (record.kind === 'tm') bdspByNumber.set(record.number, record.move)
}
for (const record of bdspDelta) {
    if (record.kind === 'tm') bdspByNumber.set(record.number, record.move)
    if (record.kind === 'hm') bdspByNumber.set(92 + record.number, record.move)
}
for (const [number, move] of bdspByNumber) {
    corrected.push({ move, kind: 'tm', number, game: 'brilliant-diamond-shining-pearl' })
}

const expectedCounts: Record<string, number> = {
    'red-blue': 55, yellow: 55,
    'gold-silver': 57, crystal: 57,
    'ruby-sapphire': 58, emerald: 58, 'firered-leafgreen': 57,
    'diamond-pearl': 100, platinum: 100, 'heartgold-soulsilver': 100,
    'black-white': 100, 'black-2-white-2': 101,
    'x-y': 105, 'omega-ruby-alpha-sapphire': 107,
    'sun-moon': 100, 'ultra-sun-ultra-moon': 100,
    'lets-go-pikachu-lets-go-eevee': 60,
    'sword-shield': 200, 'brilliant-diamond-shining-pearl': 100,
    'scarlet-violet': 229,
}

for (const game of MACHINE_GAMES) {
    const gameRecords = corrected.filter((record) => record.game === game.slug)
    const expected = expectedCounts[game.slug]
    if (gameRecords.length !== expected) {
        throw new Error(`${game.slug}: expected ${expected} machine rows, received ${gameRecords.length}`)
    }
    const codes = new Set(gameRecords.map((record) => `${record.kind}/${record.number}`))
    if (codes.size !== gameRecords.length) throw new Error(`${game.slug}: duplicate machine code`)
}

const localMoves = movesData as Record<string, { type: string }>
const gameOrder = new Map(MACHINE_GAMES.map((game) => [game.slug, game.order]))
const output: Record<string, MoveMachineAssignment[]> = {}
for (const record of corrected) {
    if (!localMoves[record.move] || localMoves[record.move].type === 'shadow') continue
    ;(output[record.move] ??= []).push({ kind: record.kind, number: record.number, game: record.game })
}

const sortedOutput = Object.fromEntries(Object.keys(output).sort().map((move) => [
    move,
    output[move].sort((a, b) =>
        (gameOrder.get(a.game) ?? 999) - (gameOrder.get(b.game) ?? 999)
        || a.kind.localeCompare(b.kind)
        || a.number - b.number),
]))

writeFileSync(OUT, JSON.stringify(sortedOutput))
console.log(`✓ move-machines.json: ${Object.keys(sortedOutput).length} moves, ${corrected.length} game mappings`)
console.log('  thunderbolt:', JSON.stringify(sortedOutput.thunderbolt))
