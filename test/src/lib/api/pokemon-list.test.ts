import { describe, expect, spyOn, test } from 'bun:test'
import manifest from '../../../../src/lib/data/pokedex-manifest.json'
import { LOCAL_POKEMON_COUNT, localPokemonList } from '../../../../src/lib/data/pokemon-index'
import { fetchPokemonList } from '../../../../src/lib/api/pokeapi'
import * as apiCache from '../../../../src/lib/api/idb-cache'

describe('local Pokémon selector catalog', () => {
    test('retains all 1,025 existing IDs and API slugs in national order', () => {
        const list = localPokemonList()
        expect(LOCAL_POKEMON_COUNT).toBe(1025)
        expect(list).toEqual(manifest.map(({ name, id }) => ({ name, id })))
        expect(list.map(({ id }) => id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1))
        expect(new Set(list.map(({ name }) => name)).size).toBe(list.length)
        expect(list.every(({ name }) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))).toBeTrue()
        expect(list[0]).toEqual({ id: 1, name: 'bulbasaur' })
        expect(list[1024]).toEqual({ id: 1025, name: 'pecharunt' })
    })

    test('does not remove default-form suffixes that API lookup needs', () => {
        const names = new Map(localPokemonList().map(({ id, name }) => [id, name]))
        expect(names.get(29)).toBe('nidoran-f')
        expect(names.get(386)).toBe('deoxys-normal')
        expect(names.get(487)).toBe('giratina-altered')
        expect(names.get(648)).toBe('meloetta-aria')
    })

    test('supports shorter lists and rejects unsupported local ranges', () => {
        expect(localPokemonList(151)).toHaveLength(151)
        expect(localPokemonList(151).at(-1)).toEqual({ id: 151, name: 'mew' })
        for (const limit of [0, -1, 1.5, NaN, Infinity, 1026]) {
            expect(() => localPokemonList(limit)).toThrow(RangeError)
        }
    })

    test('isolates array and entry mutations between consumers', async () => {
        const list = await fetchPokemonList()
        list[0].name = 'not-a-pokemon'
        list.pop()
        expect((await fetchPokemonList())[0]).toEqual({ id: 1, name: 'bulbasaur' })
        expect(await fetchPokemonList()).toHaveLength(1025)
        expect(manifest[0].name).toBe('bulbasaur')
    })

    test('resolves simultaneous default/short lists without network or browser storage', async () => {
        const fetchSpy = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'))
        const readSpy = spyOn(apiCache, 'idbGet')
        const writeSpy = spyOn(apiCache, 'idbSet')
        try {
            const [header, modal, kanto] = await Promise.all([
                fetchPokemonList(), fetchPokemonList(), fetchPokemonList(151),
            ])
            expect(header).toHaveLength(1025)
            expect(modal).toEqual(header)
            expect(kanto).toEqual(header.slice(0, 151))
            expect(fetchSpy).not.toHaveBeenCalled()
            expect(readSpy).not.toHaveBeenCalled()
            expect(writeSpy).not.toHaveBeenCalled()
        } finally {
            fetchSpy.mockRestore()
            readSpy.mockRestore()
            writeSpy.mockRestore()
        }
    })
})

describe('explicit API catalog requests', () => {
    test('keeps remote limits separate and never replaces the local default', async () => {
        const fetchSpy = spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(Response.json({ results: [{ name: 'remote-1026', url: 'https://pokeapi.co/api/v2/pokemon/1026/' }] }))
            .mockResolvedValueOnce(Response.json({ results: [{ name: 'remote-1027', url: 'https://pokeapi.co/api/v2/pokemon/1027/' }] }))
        try {
            const first = await fetchPokemonList(1026)
            const second = await fetchPokemonList(1027)
            expect(first).toEqual([{ name: 'remote-1026', id: 1026 }])
            expect(second).toEqual([{ name: 'remote-1027', id: 1027 }])
            expect(await fetchPokemonList(1026)).toEqual(first)
            expect(fetchSpy).toHaveBeenCalledTimes(2)
            expect(fetchSpy).toHaveBeenNthCalledWith(1, 'https://pokeapi.co/api/v2/pokemon?limit=1026')
            expect(fetchSpy).toHaveBeenNthCalledWith(2, 'https://pokeapi.co/api/v2/pokemon?limit=1027')
            expect(await fetchPokemonList()).toHaveLength(1025)
            expect(await fetchPokemonList(1)).toEqual([{ name: 'bulbasaur', id: 1 }])
            expect(fetchSpy).toHaveBeenCalledTimes(2)
        } finally {
            fetchSpy.mockRestore()
        }
    })

    test('still reports an API failure outside committed coverage', async () => {
        const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
        try {
            const failure = await fetchPokemonList(1028).catch((error: unknown) => error)
            expect(failure).toBeInstanceOf(Error)
            expect(failure).toMatchObject({ message: 'Failed to fetch Pokémon list (503)' })
        } finally {
            fetchSpy.mockRestore()
        }
    })
})
