// @ts-expect-error Bun provides this module when the test is run with `bun test`.
import { describe, expect, test } from 'bun:test'
import moveMachinesJson from '../data/move-machines.json'
import { moveMachineHistory } from '../../ui/move-machine-history'
import {
    formatMachineCode,
    machineSearchEntries,
    matchesMachineQuery,
    parseMachineQuery,
    type MoveMachineAssignment,
} from './machines'

const moves = moveMachinesJson as Record<string, MoveMachineAssignment[]>

describe('machine queries', () => {
    test('normalizes case, spacing, separators, and padding', () => {
        expect(parseMachineQuery('TM24')).toEqual({ kind: 'tm', number: 24 })
        expect(parseMachineQuery('tm 024')).toEqual({ kind: 'tm', number: 24 })
        expect(parseMachineQuery('HM-03')).toEqual({ kind: 'hm', number: 3 })
        expect(parseMachineQuery('tr#08')).toEqual({ kind: 'tr', number: 8 })
        expect(parseMachineQuery('thunderbolt')).toBeNull()
    })

    test('uses machine generation rather than move debut generation', () => {
        const query = parseMachineQuery('TM24')!
        const thunderbolt = machineSearchEntries(moves.thunderbolt)
        const dragonBreath = machineSearchEntries(moves['dragon-breath'])

        expect(matchesMachineQuery(thunderbolt, query, [1])).toBeTrue()
        expect(matchesMachineQuery(thunderbolt, query, [2])).toBeFalse()
        expect(matchesMachineQuery(dragonBreath, query, [2])).toBeTrue()
    })

    test('finds every historical match when no generation is selected', () => {
        const query = parseMachineQuery('TM24')!
        const matches = Object.entries(moves)
            .filter(([, assignments]) => matchesMachineQuery(machineSearchEntries(assignments), query))
            .map(([move]) => move)

        expect(matches).toEqual(['dragon-breath', 'fire-spin', 'snore', 'thunderbolt', 'x-scissor'])
    })
})

describe('machine display', () => {
    test('uses the correct digit width for each game', () => {
        expect(formatMachineCode({ kind: 'tm', number: 24, game: 'red-blue' })).toBe('TM24')
        expect(formatMachineCode({ kind: 'tm', number: 24, game: 'scarlet-violet' })).toBe('TM024')
        expect(formatMachineCode({ kind: 'tr', number: 8, game: 'sword-shield' })).toBe('TR08')
    })

    test('reconstructs the former BDSP HMs as TM93–TM100', () => {
        expect(moves.surf).toContainEqual({
            kind: 'tm', number: 95, game: 'brilliant-diamond-shining-pearl',
        })
        expect(moves.surf).not.toContainEqual({
            kind: 'hm', number: 3, game: 'brilliant-diamond-shining-pearl',
        })
    })
})

describe('machine history presentation', () => {
    test('groups by generation and splits game subcategories only when needed', () => {
        const html = moveMachineHistory(moves.thunderbolt)

        expect(html).toContain('Gen I')
        expect(html).toContain('TM24')
        expect(html).toContain('Sun / Moon, Ultra Sun / Ultra Moon')
        expect(html).toContain("Let's Go Pikachu / Eevee")
        expect(html).toContain('TM36')
        expect(html).toContain('TR08')
        expect(html).toContain('TM126')
    })

    test('explains when a move has never been distributed by machine', () => {
        expect(moveMachineHistory([])).toContain('has not been available as a TM, HM, or TR')
    })
})
