import { describe, expect, test } from 'bun:test'
import { createGuideStorage, type GuideRestoreIssue } from '../../../src/lib/guide-storage'
import { RED_BLUE_GUIDE } from '../../../src/lib/data/guides/red-blue/index'
import { GOLD_SILVER_GUIDE } from '../../../src/lib/data/guides/gold-silver'
import { GUIDE_REGISTRY } from '../../../src/lib/data/guides/registry'
import { buildGuideCollectionManifest } from '../../../src/lib/data/guides/collection-manifest'
import { emptyGuideCollection, type GuideCollectionState } from '../../../src/lib/guide-collection'

const progressKey = 'pokebasic-guide-red-blue-progress'
const starterKey = 'pokebasic-guide-red-blue-starter'
const recoveryKey = `${progressKey}-recovery`
const collectionKey = 'pokebasic-guide-red-blue-collection'
const collectionManifest = buildGuideCollectionManifest(GUIDE_REGISTRY[0])!

class MemoryStore {
    data = new Map<string, string>()
    writes: [string, string][] = []
    blockRead = false
    blockWrite: (key: string) => boolean = () => false
    afterWrite: (key: string) => void = () => {}
    constructor(initial: Record<string, string> = {}) { this.data = new Map(Object.entries(initial)) }
    getItem(key: string): string | null {
        if (this.blockRead) throw new Error('Storage blocked')
        return this.data.get(key) ?? null
    }
    setItem(key: string, value: string): void {
        if (this.blockWrite(key)) throw new Error('Quota exceeded')
        this.writes.push([key, value])
        this.data.set(key, value)
        this.afterWrite(key)
    }
    removeItem(key: string): void {
        if (this.blockWrite(key)) throw new Error('Quota exceeded')
        this.writes.push([key, '<removed>'])
        this.data.delete(key)
        this.afterWrite(key)
    }
}

function fixture(initial: Record<string, string> = {}) {
    const store = new MemoryStore(initial)
    const repository = createGuideStorage(RED_BLUE_GUIDE, () => store)
    return { store, repository }
}

function collectionFixture(initial: Record<string, string> = {}) {
    const store = new MemoryStore(initial)
    const repository = createGuideStorage(RED_BLUE_GUIDE, () => store, collectionManifest)
    return { store, repository }
}

describe('read-only guide save loading', () => {
    test('constructs and loads absent values without creating keys', () => {
        const { store, repository } = fixture()
        expect(store.writes).toEqual([])
        expect(repository.loadProgress()).toEqual({ value: [], issue: null })
        expect(repository.loadStarter()).toEqual({ value: null, issue: null })
        expect(store.data.size).toBe(0)
        expect(store.writes).toEqual([])
    })

    test('preserves exact valid bytes, formatting and independent starter data', () => {
        const raw = ' [\n "pallet-town", "route-1" ] '
        const starter = JSON.stringify(RED_BLUE_GUIDE.starters![0], null, 2)
        const { store, repository } = fixture({ [progressKey]: raw, [starterKey]: starter })
        expect(repository.loadProgress()).toEqual({ value: ['pallet-town', 'route-1'], issue: null })
        expect(repository.loadStarter()).toEqual({ value: RED_BLUE_GUIDE.starters![0], issue: null })
        expect(store.getItem(progressKey)).toBe(raw)
        expect(store.getItem(starterKey)).toBe(starter)
        expect(store.writes).toEqual([])
    })

    test('filters duplicates, unknown IDs and nonstrings in memory only', () => {
        const raw = '["route-1","pallet-town","route-1","missing",null,8,{},[],"__proto__"]'
        const { store, repository } = fixture({ [progressKey]: raw })
        expect(repository.loadProgress()).toEqual({ value: ['route-1', 'pallet-town'], issue: 'adjusted' })
        expect(store.getItem(progressKey)).toBe(raw)
        expect(store.writes).toEqual([])
    })

    test('handles invalid JSON, wrong shapes and future versions without overwriting them', () => {
        for (const raw of ['', 'not json', 'null', 'false', '1', '"pallet-town"', '{}', '{"schemaVersion":99,"completedStops":["pallet-town"]}']) {
            const { store, repository } = fixture({ [progressKey]: raw })
            expect(repository.loadProgress()).toEqual({ value: [], issue: 'invalid' })
            expect(store.getItem(progressKey)).toBe(raw)
            expect(store.writes).toEqual([])
        }
    })

    test('resolves starter metadata by the current guide ID, not stale stored text', () => {
        const raw = JSON.stringify({ id: 1, name: 99, type: 'not-a-type', description: '<img onerror="bad">', extra: true })
        const { store, repository } = fixture({ [starterKey]: raw })
        const loaded = repository.loadStarter()
        expect(loaded).toEqual({ value: RED_BLUE_GUIDE.starters![0], issue: 'adjusted' })
        loaded.value!.name = 'changed locally'
        expect(RED_BLUE_GUIDE.starters![0].name).toBe('Bulbasaur')
        expect(store.getItem(starterKey)).toBe(raw)
        expect(store.writes).toEqual([])
    })

    test('rejects malformed, wrong-game and versioned starter records', () => {
        for (const raw of ['', 'bad json', '[]', '7', '{"id":"1"}', '{"id":152}', '{"id":1,"schemaVersion":99}']) {
            const { store, repository } = fixture({ [starterKey]: raw })
            expect(repository.loadStarter()).toEqual({ value: null, issue: 'invalid' })
            expect(store.getItem(starterKey)).toBe(raw)
            expect(store.writes).toEqual([])
        }
        expect(fixture({ [starterKey]: 'null' }).repository.loadStarter()).toEqual({ value: null, issue: null })
    })

    test('refreshes ordinary starter copy without a damage warning, but protects it on edit', () => {
        const raw = JSON.stringify({ ...RED_BLUE_GUIDE.starters![0], description: 'Earlier guide advice.' })
        const { store, repository } = fixture({ [starterKey]: raw })
        expect(repository.loadStarter()).toEqual({ value: RED_BLUE_GUIDE.starters![0], issue: null })
        expect(store.getItem(starterKey)).toBe(raw)
        expect(store.writes).toEqual([])
        expect(repository.saveStarter(null)).toEqual({ ok: true, recovered: true })
        expect(JSON.parse(store.getItem(`${starterKey}-recovery`)!).snapshots).toEqual([raw])
    })
})

describe('explicit edits and exact recovery snapshots', () => {
    test('writes normal legacy-shaped edits without extra keys', () => {
        const { store, repository } = fixture({ [progressKey]: '["pallet-town"]' })
        repository.loadProgress()
        expect(repository.saveProgress(['pallet-town', 'route-1'])).toEqual({ ok: true, recovered: false })
        expect(store.getItem(progressKey)).toBe('["pallet-town","route-1"]')
        expect(store.getItem(recoveryKey)).toBeNull()
        expect(repository.saveProgress(['pallet-town', 'route-1'])).toEqual({ ok: true, recovered: false })
        expect(store.writes).toHaveLength(1)
    })

    test('preserves malformed original bytes before a user replaces them', () => {
        const raw = ' {"schemaVersion":999,"doNotLose":"original"} '
        const { store, repository } = fixture({ [progressKey]: raw })
        repository.loadProgress()
        expect(store.writes).toEqual([])
        expect(repository.saveProgress(['pallet-town'])).toEqual({ ok: true, recovered: true })
        expect(store.writes.map(([key]) => key)).toEqual([recoveryKey, progressKey])
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: [raw] })
        expect(store.getItem(progressKey)).toBe('["pallet-town"]')
    })

    test('backs up adjusted arrays and starter records independently', () => {
        const raw = '["pallet-town","pallet-town","unknown"]'
        const oldStarter = '{"id":4,"description":"old"}'
        const { store, repository } = fixture({ [progressKey]: raw, [starterKey]: oldStarter })
        repository.loadProgress()
        repository.loadStarter()
        expect(repository.saveProgress(['pallet-town', 'route-1']).ok).toBeTrue()
        expect(store.getItem(starterKey)).toBe(oldStarter)
        expect(repository.saveStarter(RED_BLUE_GUIDE.starters![2])).toEqual({ ok: true, recovered: true })
        expect(JSON.parse(store.getItem(`${starterKey}-recovery`)!)).toEqual({ schemaVersion: 1, snapshots: [oldStarter] })
        expect(JSON.parse(store.getItem(starterKey)!)).toEqual(RED_BLUE_GUIDE.starters![2])
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual([raw])
    })

    test('reset keeps the previous progress recoverable and does not reset the starter', () => {
        const raw = ' ["pallet-town", "route-1"] '
        const selected = JSON.stringify(RED_BLUE_GUIDE.starters![1])
        const { store, repository } = fixture({ [progressKey]: raw, [starterKey]: selected })
        repository.loadProgress()
        repository.loadStarter()
        expect(repository.saveProgress([], true)).toEqual({ ok: true, recovered: true })
        expect(store.getItem(progressKey)).toBe('[]')
        expect(store.getItem(starterKey)).toBe(selected)
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual([raw])
        expect(repository.saveProgress([], true)).toEqual({ ok: true, recovered: false })
        expect(store.writes).toHaveLength(2)
    })

    test('appends recovery snapshots without deleting earlier ones or duplicating a retry', () => {
        const raw = 'bad current save'
        const prior = 'previous original bytes'
        const { store, repository } = fixture({ [progressKey]: raw, [recoveryKey]: JSON.stringify({ schemaVersion: 1, snapshots: [prior, raw] }) })
        repository.loadProgress()
        expect(repository.saveProgress([])).toEqual({ ok: true, recovered: true })
        expect(store.writes.map(([key]) => key)).toEqual([progressKey])
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual([prior, raw])
        store.data.set(progressKey, 'another invalid save')
        repository.loadProgress()
        expect(repository.saveProgress([]).ok).toBeTrue()
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual([prior, raw, 'another invalid save'])
    })

    test('does not replace incompatible recovery formats', () => {
        for (const recovery of ['bad json', '[]', '{"schemaVersion":2,"snapshots":[]}', '{"schemaVersion":1,"snapshots":[7]}', '{"schemaVersion":1,"snapshots":[],"extra":true}']) {
            const { store, repository } = fixture({ [progressKey]: 'bad progress', [recoveryKey]: recovery })
            repository.loadProgress()
            expect(repository.saveProgress([])).toEqual({ ok: false, issue: 'recovery-blocked' })
            expect(store.getItem(progressKey)).toBe('bad progress')
            expect(store.getItem(recoveryKey)).toBe(recovery)
            expect(store.writes).toEqual([])
        }
    })

    test('clearing a malformed starter protects its original and leaves progress alone', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]', [starterKey]: 'broken starter' })
        repository.loadStarter()
        expect(repository.saveStarter(null)).toEqual({ ok: true, recovered: true })
        expect(store.getItem(starterKey)).toBe('null')
        expect(JSON.parse(store.getItem(`${starterKey}-recovery`)!).snapshots).toEqual(['broken starter'])
        expect(store.getItem(progressKey)).toBe('["route-1"]')
    })

    test('rejects invalid user-action inputs without writing', () => {
        const { store, repository } = fixture()
        repository.loadProgress()
        repository.loadStarter()
        expect(repository.saveProgress(['unknown'])).toEqual({ ok: false, issue: 'invalid-input' })
        expect(repository.saveProgress(['route-1', 'route-1'])).toEqual({ ok: false, issue: 'invalid-input' })
        expect(repository.saveStarter({ ...RED_BLUE_GUIDE.starters![0], id: 152 })).toEqual({ ok: false, issue: 'invalid-input' })
        expect(store.writes).toEqual([])
    })
})

describe('blocked/quota storage and conflicting tabs', () => {
    test('handles both unavailable storage getters and blocked reads', () => {
        const noStore = createGuideStorage(RED_BLUE_GUIDE, () => { throw new Error('SecurityError') })
        expect(noStore.loadProgress()).toEqual({ value: [], issue: 'unavailable' })
        expect(noStore.loadStarter()).toEqual({ value: null, issue: 'unavailable' })
        expect(noStore.saveProgress([])).toEqual({ ok: false, issue: 'unavailable' })
        expect(noStore.exportBackup()).toEqual({ ok: false, issue: 'unavailable' })
        const { store, repository } = fixture()
        store.blockRead = true
        expect(repository.loadProgress().issue).toBe('unavailable')
        expect(repository.loadStarter().issue).toBe('unavailable')
        expect(repository.saveStarter(null)).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.writes).toEqual([])
    })

    test('refuses to replace damaged data if the recovery write hits quota', () => {
        const { store, repository } = fixture({ [progressKey]: 'damaged' })
        repository.loadProgress()
        store.blockWrite = (key) => key === recoveryKey
        expect(repository.saveProgress([])).toEqual({ ok: false, issue: 'recovery-blocked' })
        expect(store.getItem(progressKey)).toBe('damaged')
        expect(store.writes).toEqual([])
    })

    test('keeps the original and backup if the final write fails, and retries safely', () => {
        const { store, repository } = fixture({ [progressKey]: 'damaged' })
        repository.loadProgress()
        store.blockWrite = (key) => key === progressKey
        expect(repository.saveProgress([])).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.getItem(progressKey)).toBe('damaged')
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual(['damaged'])
        store.blockWrite = () => false
        expect(repository.saveProgress([])).toEqual({ ok: true, recovered: true })
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual(['damaged'])
        expect(store.writes.map(([key]) => key)).toEqual([recoveryKey, progressKey])
    })

    test('reports a normal failed write without manufacturing a saved result', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        repository.loadProgress()
        store.blockWrite = () => true
        expect(repository.saveProgress(['route-1', 'pallet-town'])).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.getItem(progressKey)).toBe('["route-1"]')
        expect(store.getItem(recoveryKey)).toBeNull()
    })

    test('does not overwrite a save changed since loading', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        repository.loadProgress()
        store.data.set(progressKey, '["pallet-town"]')
        expect(repository.saveProgress([])).toEqual({ ok: false, issue: 'conflict' })
        expect(store.getItem(progressKey)).toBe('["pallet-town"]')
        expect(store.writes).toEqual([])
    })

    test('checks for another write after making a recovery snapshot too', () => {
        const { store, repository } = fixture({ [progressKey]: 'damaged' })
        repository.loadProgress()
        store.afterWrite = (key) => { if (key === recoveryKey) store.data.set(progressKey, '["route-1"]') }
        expect(repository.saveProgress([])).toEqual({ ok: false, issue: 'conflict' })
        expect(store.getItem(progressKey)).toBe('["route-1"]')
        expect(JSON.parse(store.getItem(recoveryKey)!).snapshots).toEqual(['damaged'])
    })
})

describe('raw save backup export and guide isolation', () => {
    test('exports exact persisted strings and the separate unsaved session view without writes', () => {
        const raw = 'not valid JSON\nkeep these bytes'
        const recovery = '{"schemaVersion":999,"unknown":"preserve"}'
        const { store, repository } = fixture({ [progressKey]: raw, [recoveryKey]: recovery })
        const exported = repository.exportBackup({ completedStops: ['route-1'], selectedStarter: RED_BLUE_GUIDE.starters![1] })
        expect(exported.ok).toBeTrue()
        if (!exported.ok) throw new Error('Expected backup')
        const data = JSON.parse(exported.json)
        expect(data.format).toBe('pokebasic-guide-save-backup')
        expect(data.schemaVersion).toBe(1)
        expect(data.guideId).toBe('red-blue')
        expect(Number.isNaN(Date.parse(data.exportedAt))).toBeFalse()
        expect(data.entries).toEqual([
            { key: progressKey, rawValue: raw }, { key: starterKey, rawValue: null },
            { key: recoveryKey, rawValue: recovery }, { key: `${starterKey}-recovery`, rawValue: null },
        ])
        expect(data.sessionView).toEqual({ completedStops: ['route-1'], selectedStarter: RED_BLUE_GUIDE.starters![1] })
        expect(store.writes).toEqual([])
    })

    test('refuses a partial backup if any persisted data cannot be read', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        store.blockRead = true
        expect(repository.exportBackup()).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.writes).toEqual([])
    })

    test('progress edits/reset/export never alter another guide or its starter', () => {
        const otherProgress = 'pokebasic-guide-gold-silver-progress'
        const otherStarter = 'pokebasic-guide-gold-silver-starter'
        const { store, repository } = fixture({ [otherProgress]: '["new-bark-town"]', [otherStarter]: JSON.stringify(GOLD_SILVER_GUIDE.starters![0]) })
        const otherBefore = store.getItem(otherStarter)
        const other = createGuideStorage(GOLD_SILVER_GUIDE, () => store)
        expect(other.loadProgress().value).toEqual(['new-bark-town'])
        expect(other.loadStarter().value).toEqual(GOLD_SILVER_GUIDE.starters![0])
        repository.loadProgress()
        repository.loadStarter()
        repository.saveProgress(['pallet-town'])
        repository.saveProgress([], true)
        repository.saveStarter(RED_BLUE_GUIDE.starters![0])
        const backup = repository.exportBackup()
        expect(backup.ok).toBeTrue()
        if (backup.ok) expect(JSON.parse(backup.json).entries.every((entry: { key: string }) => entry.key.startsWith('pokebasic-guide-red-blue-'))).toBeTrue()
        expect(store.getItem(otherProgress)).toBe('["new-bark-town"]')
        expect(store.getItem(otherStarter)).toBe(otherBefore)
    })
})

describe('reviewed guide backup restore', () => {
    function backup(initial: Record<string, string>, completedStops = ['pallet-town']) {
        const source = fixture(initial).repository.exportBackup({ completedStops, selectedStarter: RED_BLUE_GUIDE.starters![1] })
        if (!source.ok) throw new Error('Expected exported fixture')
        return source.json
    }

    test('previews without writing, then restores exact saved strings and recovery data for this guide only', () => {
        const progressRaw = ' [\n "pallet-town", "route-1" ] '
        const starterRaw = JSON.stringify(RED_BLUE_GUIDE.starters![0], null, 2)
        const priorRecovery = JSON.stringify({ schemaVersion: 1, snapshots: ['older raw save'] })
        const json = backup({ [progressKey]: progressRaw, [starterKey]: starterRaw, [recoveryKey]: priorRecovery })
        const other = 'pokebasic-guide-gold-silver-progress'
        const { store, repository } = fixture({ [other]: '["new-bark-town"]' })
        const prepared = repository.prepareRestore(json)
        expect(prepared.ok).toBeTrue()
        if (!prepared.ok) throw new Error('Expected preview')
        expect(prepared.preview.saved?.completedStops).toEqual(['pallet-town', 'route-1'])
        expect(prepared.preview.session?.selectedStarter).toEqual(RED_BLUE_GUIDE.starters![1])
        expect(store.writes).toEqual([])
        expect(repository.restorePrepared('saved', 'replace')).toMatchObject({ ok: true })
        expect(store.getItem(progressKey)).toBe(progressRaw)
        expect(store.getItem(starterKey)).toBe(starterRaw)
        expect(store.getItem(recoveryKey)).toBe(priorRecovery)
        expect(store.getItem(other)).toBe('["new-bark-town"]')
        expect(repository.loadProgress().value).toEqual(['pallet-town', 'route-1'])
        expect(repository.loadStarter().value).toEqual(RED_BLUE_GUIDE.starters![0])
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'invalid-file' })
    })

    test('uses the separate tab view when saved bytes are damaged and retains the damaged bytes in recovery', () => {
        const json = backup({ [progressKey]: 'broken progress', [starterKey]: 'broken starter' }, ['pallet-town', 'route-1'])
        const { store, repository } = fixture()
        const prepared = repository.prepareRestore(json)
        expect(prepared.ok).toBeTrue()
        if (!prepared.ok) throw new Error('Expected preview')
        expect(prepared.preview.saved).toBeNull()
        expect(prepared.preview.session?.completedStops).toEqual(['pallet-town', 'route-1'])
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'no-source' })
        expect(repository.restorePrepared('session', 'replace')).toMatchObject({ ok: true })
        expect(store.getItem(progressKey)).toBe('["pallet-town","route-1"]')
        expect(JSON.parse(store.getItem(starterKey)!)).toEqual(RED_BLUE_GUIDE.starters![1])
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: ['broken progress'] })
        expect(JSON.parse(store.getItem(`${starterKey}-recovery`)!)).toEqual({ schemaVersion: 1, snapshots: ['broken starter'] })
    })

    test('merge unions known stops, keeps the selected current starter and retains both saves', () => {
        const imported = backup({ [progressKey]: ' ["pallet-town","route-1"] ', [starterKey]: JSON.stringify(RED_BLUE_GUIDE.starters![1]) })
        const currentProgress = '["route-1","viridian-city"]'
        const currentStarter = JSON.stringify(RED_BLUE_GUIDE.starters![0])
        const { store, repository } = fixture({ [progressKey]: currentProgress, [starterKey]: currentStarter })
        expect(repository.prepareRestore(imported).ok).toBeTrue()
        const result = repository.restorePrepared('saved', 'merge')
        expect(result).toMatchObject({ ok: true, view: { completedStops: ['route-1', 'viridian-city', 'pallet-town'], selectedStarter: RED_BLUE_GUIDE.starters![0] } })
        expect(store.getItem(progressKey)).toBe('["route-1","viridian-city","pallet-town"]')
        expect(store.getItem(starterKey)).toBe(currentStarter)
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: [currentProgress, ' ["pallet-town","route-1"] '] })
        expect(JSON.parse(store.getItem(`${starterKey}-recovery`)!)).toEqual({ schemaVersion: 1, snapshots: [JSON.stringify(RED_BLUE_GUIDE.starters![1])] })
    })

    test('rejects wrong guide, future version, unknown IDs, duplicate keys and unsafe recovery without writes', () => {
        const valid = JSON.parse(backup({ [progressKey]: '["pallet-town"]' }))
        const cases: [unknown, GuideRestoreIssue][] = [
            [{ ...valid, guideId: 'gold-silver' }, 'wrong-guide'],
            [{ ...valid, schemaVersion: 2 }, 'unsupported-version'],
            [{ ...valid, entries: valid.entries.map((entry: { key: string; rawValue: string | null }) => entry.key === progressKey ? { ...entry, rawValue: '["unknown"]' } : entry), sessionView: undefined }, 'no-source'],
            [{ ...valid, entries: [valid.entries[0], valid.entries[0], valid.entries[2], valid.entries[3]] }, 'invalid-file'],
            [{ ...valid, entries: valid.entries.map((entry: { key: string; rawValue: string | null }) => entry.key === recoveryKey ? { ...entry, rawValue: '{"schemaVersion":2}' } : entry) }, 'invalid-file'],
            [{ ...valid, sessionView: { completedStops: ['route-1', 'route-1'], selectedStarter: null } }, 'invalid-file'],
        ]
        for (const [data, issue] of cases) {
            const { store, repository } = fixture()
            expect(repository.prepareRestore(JSON.stringify(data))).toEqual({ ok: false, issue })
            expect(store.writes).toEqual([])
        }
        expect(fixture().repository.prepareRestore('x'.repeat(5_000_001))).toEqual({ ok: false, issue: 'invalid-file' })
    })

    test('detects a changed save after preview and does not overwrite another tab', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        expect(repository.prepareRestore(backup({ [progressKey]: '["pallet-town"]' })).ok).toBeTrue()
        store.data.set(progressKey, '["viridian-city"]')
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'conflict' })
        expect(store.getItem(progressKey)).toBe('["viridian-city"]')
        expect(store.writes).toEqual([])
    })

    test('detects a second tab changing progress during recovery writes', () => {
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        expect(repository.prepareRestore(backup({ [progressKey]: '["pallet-town"]' })).ok).toBeTrue()
        store.afterWrite = (key) => { if (key === recoveryKey) store.data.set(progressKey, '["viridian-city"]') }
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'conflict' })
        expect(store.getItem(progressKey)).toBe('["viridian-city"]')
        expect(store.writes.map(([key]) => key)).toEqual([recoveryKey])
    })

    test('refuses incompatible current recovery or quota failure before replacing active saves', () => {
        const json = backup({ [progressKey]: '["pallet-town"]' })
        const incompatible = fixture({ [progressKey]: '["route-1"]', [recoveryKey]: '{"schemaVersion":9}' })
        expect(incompatible.repository.prepareRestore(json)).toEqual({ ok: false, issue: 'recovery-blocked' })
        expect(incompatible.store.writes).toEqual([])
        const { store, repository } = fixture({ [progressKey]: '["route-1"]' })
        expect(repository.prepareRestore(json).ok).toBeTrue()
        store.blockWrite = (key) => key === recoveryKey
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'recovery-blocked' })
        expect(store.getItem(progressKey)).toBe('["route-1"]')
        expect(store.writes).toEqual([])
    })

    test('rolls back a first active write when the second fails, while retaining recovery', () => {
        const json = backup({ [progressKey]: '["pallet-town"]', [starterKey]: JSON.stringify(RED_BLUE_GUIDE.starters![1]) })
        const originalProgress = '["route-1"]'
        const originalStarter = JSON.stringify(RED_BLUE_GUIDE.starters![0])
        const { store, repository } = fixture({ [progressKey]: originalProgress, [starterKey]: originalStarter })
        expect(repository.prepareRestore(json).ok).toBeTrue()
        store.blockWrite = (key) => key === starterKey
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.getItem(progressKey)).toBe(originalProgress)
        expect(store.getItem(starterKey)).toBe(originalStarter)
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: [originalProgress] })
    })

    test('reports a partial restore if rollback is also blocked', () => {
        const json = backup({ [progressKey]: '["pallet-town"]', [starterKey]: JSON.stringify(RED_BLUE_GUIDE.starters![1]) })
        const { store, repository } = fixture({ [progressKey]: '["route-1"]', [starterKey]: JSON.stringify(RED_BLUE_GUIDE.starters![0]) })
        expect(repository.prepareRestore(json).ok).toBeTrue()
        let wroteProgress = false
        store.afterWrite = (key) => { if (key === progressKey) wroteProgress = true }
        store.blockWrite = (key) => key === starterKey || (key === progressKey && wroteProgress)
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'partial' })
        expect(store.getItem(progressKey)).toBe('["pallet-town"]')
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: ['["route-1"]'] })
    })
})

describe('independent guide collection and version-2 backups', () => {
    const firstStep = collectionManifest.stops[0].stepIds[0]
    const firstItem = collectionManifest.stops[1].items[0].id
    const species = collectionManifest.stops[1].species[0].id
    const state: GuideCollectionState = {
        schemaVersion: 1, completedSteps: [firstStep], collectedItems: [firstItem],
        seenSpecies: [species], caughtSpecies: [species],
    }

    test('reads without writing and saves only the new collection key', () => {
        const { store, repository } = collectionFixture({ [progressKey]: '["pallet-town"]' })
        expect(repository.loadCollection()).toEqual({ value: emptyGuideCollection(), issue: null })
        expect(store.writes).toEqual([])
        expect(repository.saveCollection(state)).toEqual({ ok: true, recovered: false })
        expect(JSON.parse(store.getItem(collectionKey)!)).toEqual(state)
        expect(store.getItem(progressKey)).toBe('["pallet-town"]')
        expect(store.getItem(starterKey)).toBeNull()
        expect(repository.loadCollection().value).toEqual(state)
    })

    test('rejects unknown IDs and caught-without-seen instead of storing them', () => {
        const { store, repository } = collectionFixture()
        repository.loadCollection()
        expect(repository.saveCollection({ ...state, collectedItems: ['missing:item'] })).toEqual({ ok: false, issue: 'invalid-input' })
        expect(repository.saveCollection({ ...state, seenSpecies: [] })).toEqual({ ok: false, issue: 'invalid-input' })
        expect(repository.saveCollection({ ...state, completedSteps: [firstStep, firstStep] })).toEqual({ ok: false, issue: 'invalid-input' })
        expect(store.writes).toEqual([])
    })

    test('preserves damaged collection bytes before an explicit edit', () => {
        const { store, repository } = collectionFixture({ [collectionKey]: '{"schemaVersion":99,"future":true}' })
        expect(repository.loadCollection()).toEqual({ value: emptyGuideCollection(), issue: 'invalid' })
        expect(store.writes).toEqual([])
        expect(repository.saveCollection(state)).toEqual({ ok: true, recovered: true })
        expect(JSON.parse(store.getItem(`${collectionKey}-recovery`)!)).toEqual({ schemaVersion: 1, snapshots: ['{"schemaVersion":99,"future":true}'] })
    })

    test('exports all six exact strings and a separate collection tab view', () => {
        const raw = JSON.stringify(state, null, 2)
        const { store, repository } = collectionFixture({ [collectionKey]: raw })
        const result = repository.exportBackup({ completedStops: ['pallet-town'], selectedStarter: RED_BLUE_GUIDE.starters![0], collection: state })
        expect(result.ok).toBeTrue()
        if (!result.ok) throw new Error('Expected backup')
        const data = JSON.parse(result.json)
        expect(data.schemaVersion).toBe(2)
        expect(data.entries).toHaveLength(6)
        expect(data.entries.find((entry: { key: string }) => entry.key === collectionKey).rawValue).toBe(raw)
        expect(data.sessionView.collection).toEqual(state)
        expect(store.writes).toEqual([])
    })

    test('restores a version-2 collection and still accepts a version-1 story backup', () => {
        const exported = collectionFixture({ [progressKey]: '["route-1"]', [collectionKey]: JSON.stringify(state) }).repository.exportBackup({
            completedStops: ['route-1'], selectedStarter: null, collection: state,
        })
        if (!exported.ok) throw new Error('Expected backup')
        const { store, repository } = collectionFixture({ [progressKey]: '["pallet-town"]', [collectionKey]: JSON.stringify(emptyGuideCollection()) })
        expect(repository.prepareRestore(exported.json).ok).toBeTrue()
        expect(repository.restorePrepared('saved', 'replace')).toMatchObject({ ok: true, view: { collection: state } })
        expect(JSON.parse(store.getItem(collectionKey)!)).toEqual(state)
        expect(store.getItem(progressKey)).toBe('["route-1"]')
        const legacy = fixture({ [progressKey]: '["viridian-city"]' }).repository.exportBackup()
        if (!legacy.ok) throw new Error('Expected legacy backup')
        expect(repository.prepareRestore(legacy.json).ok).toBeTrue()
        expect(repository.restorePrepared('saved', 'replace')).toMatchObject({ ok: true })
        expect(store.getItem(progressKey)).toBe('["viridian-city"]')
        expect(JSON.parse(store.getItem(collectionKey)!)).toEqual(state)
    })

    test('merge unions all four collection lists while keeping story and collection separate', () => {
        const other: GuideCollectionState = { schemaVersion: 1, completedSteps: [collectionManifest.stops[1].stepIds[0]], collectedItems: [], seenSpecies: [species], caughtSpecies: [] }
        const exported = collectionFixture({ [collectionKey]: JSON.stringify(state) }).repository.exportBackup({ completedStops: [], selectedStarter: null, collection: state })
        if (!exported.ok) throw new Error('Expected backup')
        const { store, repository } = collectionFixture({ [collectionKey]: JSON.stringify(other) })
        expect(repository.prepareRestore(exported.json).ok).toBeTrue()
        const result = repository.restorePrepared('session', 'merge')
        expect(result.ok).toBeTrue()
        expect(repository.loadCollection().value).toEqual({
            schemaVersion: 1, completedSteps: [other.completedSteps[0], firstStep], collectedItems: [firstItem],
            seenSpecies: [species], caughtSpecies: [species],
        })
        expect(store.getItem(progressKey)).toBe('[]')
    })

    test('rejects future collection shape and rolls back active keys if collection write fails', () => {
        const source = collectionFixture({ [progressKey]: '["route-1"]', [collectionKey]: JSON.stringify(state) }).repository.exportBackup({ completedStops: ['route-1'], selectedStarter: null, collection: state })
        if (!source.ok) throw new Error('Expected backup')
        const damaged = JSON.parse(source.json)
        damaged.entries.find((entry: { key: string }) => entry.key === collectionKey).rawValue = '{"schemaVersion":9}'
        damaged.sessionView = undefined
        const { store, repository } = collectionFixture({ [progressKey]: '["pallet-town"]' })
        expect(repository.prepareRestore(JSON.stringify(damaged))).toEqual({ ok: false, issue: 'no-source' })
        expect(store.writes).toEqual([])
        expect(repository.prepareRestore(source.json).ok).toBeTrue()
        store.blockWrite = (key) => key === collectionKey
        expect(repository.restorePrepared('saved', 'replace')).toEqual({ ok: false, issue: 'unavailable' })
        expect(store.getItem(progressKey)).toBe('["pallet-town"]')
        expect(store.getItem(collectionKey)).toBeNull()
        expect(JSON.parse(store.getItem(recoveryKey)!)).toEqual({ schemaVersion: 1, snapshots: ['["pallet-town"]'] })
    })
})
