import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GUIDE_BASE, assertProduction, frames, launchBrowser, readOptions, ready, saveReport, selectStop } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-guide-restore.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}

const progressKey = 'pokebasic-guide-red-blue-progress'
const starterKey = 'pokebasic-guide-red-blue-starter'
const collectionKey = 'pokebasic-guide-red-blue-collection'
const otherKey = 'pokebasic-guide-gold-silver-progress'
const exportedAt = '2026-10-22T00:00:00.000Z'
const starter = (id) => JSON.stringify({ id, name: 'old metadata', type: 'old', description: 'old' })
function backup(progress, selectedStarter, sessionView, guideId = 'red-blue') {
    return JSON.stringify({
        format: 'pokebasic-guide-save-backup', schemaVersion: 1, guideId, exportedAt,
        entries: [
            { key: progressKey, rawValue: progress },
            { key: starterKey, rawValue: selectedStarter },
            { key: `${progressKey}-recovery`, rawValue: null },
            { key: `${starterKey}-recovery`, rawValue: null },
        ],
        sessionView,
    })
}

const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
let browser
try {
    await assertProduction(options.origin)
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' })
        await context.route('**/*', (route) => new URL(route.request().url()).origin === options.origin ? route.continue() : route.abort())
        await context.addInitScript(({ progressKey, starterKey, otherKey }) => {
            if (sessionStorage.getItem('restore-fixture')) return
            localStorage.setItem(progressKey, '["pallet-town"]')
            localStorage.setItem(starterKey, JSON.stringify({ id: 1, name: 'Bulbasaur', type: 'grass', description: 'original' }))
            localStorage.setItem(otherKey, '["new-bark-town"]')
            sessionStorage.setItem('restore-fixture', '1')
        }, { progressKey, starterKey, otherKey })
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        await page.goto(options.origin + GUIDE_BASE + '/games/red-blue/')
        await ready(page)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), collectionKey), null, 'collection load is read-only')
        await page.getByRole('checkbox', { name: /Mark step 1 complete:/ }).check()
        await page.getByRole('checkbox', { name: 'Mark Bulbasaur caught' }).check()
        assert.equal(await page.getByRole('checkbox', { name: 'Mark Bulbasaur seen' }).isChecked(), true, 'catching also marks seen')
        await selectStop(page, 'Route 1')
        await page.getByRole('checkbox', { name: 'Mark Potion collected' }).check()
        await selectStop(page, 'Pallet Town')
        const collectionBefore = await page.evaluate((key) => localStorage.getItem(key), collectionKey)
        assert.deepEqual(JSON.parse(collectionBefore), {
            schemaVersion: 1,
            completedSteps: [JSON.parse(collectionBefore).completedSteps[0]],
            collectedItems: [JSON.parse(collectionBefore).collectedItems[0]],
            seenSpecies: [1], caughtSpecies: [1],
        })
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), progressKey), '["pallet-town"]', 'collection toggles leave story bytes alone')
        await page.getByText('Restore a guide backup', { exact: true }).click()
        const file = page.locator('#guide-restore-file')
        const before = await page.evaluate(() => ({ ...localStorage }))

        await file.setInputFiles({ name: 'import.json', mimeType: 'application/json', buffer: Buffer.from(backup('["route-1","viridian-city"]', starter(4), { completedStops: ['route-1'], selectedStarter: { id: 7 } })) })
        await page.getByText('Saved values: 2 completed stops', { exact: false }).waitFor({ state: 'visible' })
        assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), before, 'preview is read-only')
        const apply = page.getByRole('button', { name: '2. Restore selected backup' })
        assert.equal(await apply.isDisabled(), true, 'restore waits for current backup')
        await page.getByRole('radio', { name: /Keep marked entries from both saves/ }).check()
        const firstDownload = page.waitForEvent('download')
        await page.getByRole('button', { name: '1. Download current save' }).click()
        const downloaded = await firstDownload
        assert.equal(downloaded.suggestedFilename(), 'pokebasic-red-blue-before-restore.json')
        const priorBytes = await readFile(await downloaded.path())
        const priorFile = JSON.parse(priorBytes.toString('utf8'))
        assert.equal(priorFile.schemaVersion, 2)
        assert.equal(priorFile.entries.length, 6)
        assert.equal(priorFile.entries.find((entry) => entry.key === progressKey).rawValue, before[progressKey])
        assert.equal(priorFile.entries.find((entry) => entry.key === starterKey).rawValue, before[starterKey])
        assert.equal(priorFile.entries.find((entry) => entry.key === collectionKey).rawValue, collectionBefore)
        assert.equal(await apply.isEnabled(), true)
        await apply.click()
        await frames(page)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), progressKey), '["pallet-town","route-1","viridian-city"]')
        assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), starterKey)).id, 1)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), otherKey), '["new-bark-town"]')
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), collectionKey), collectionBefore, 'version-1 merge retains collection')
        assert.match(await page.getByRole('status', { name: 'Guide save status' }).innerText(), /Backup restored.*3 story stops/)

        // A damaged persisted string cannot become the active save, but the
        // separately exported tab view can be selected and the raw bytes kept.
        await file.setInputFiles({ name: 'session.json', mimeType: 'application/json', buffer: Buffer.from(backup('broken saved progress', 'broken saved starter', { completedStops: ['gym-1-pewter'], selectedStarter: { id: 7 } })) })
        await page.getByText('Saved values cannot be safely restored', { exact: false }).waitFor({ state: 'visible' })
        assert.equal(await page.getByRole('radio', { name: /Tab view: 1 completed stop/ }).isChecked(), true)
        const secondDownload = page.waitForEvent('download')
        await page.getByRole('button', { name: '1. Download current save' }).click()
        await secondDownload
        await apply.click()
        await frames(page)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), progressKey), '["gym-1-pewter"]')
        assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), starterKey)).id, 7)
        assert.ok(JSON.parse(await page.evaluate((key) => localStorage.getItem(`${key}-recovery`), progressKey)).snapshots.includes('broken saved progress'))
        assert.ok(JSON.parse(await page.evaluate((key) => localStorage.getItem(`${key}-recovery`), starterKey)).snapshots.includes('broken saved starter'))
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), collectionKey), collectionBefore, 'version-1 replace retains collection')

        const after = await page.evaluate(() => ({ ...localStorage }))
        await file.setInputFiles({ name: 'wrong-guide.json', mimeType: 'application/json', buffer: Buffer.from(backup('["pallet-town"]', null, { completedStops: [], selectedStarter: null }, 'gold-silver')) })
        assert.match(await page.getByRole('status', { name: 'Guide save status' }).innerText(), /backup belongs to another guide/i)
        assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), after)

        await page.getByRole('checkbox', { name: 'Mark Bulbasaur caught' }).uncheck()
        assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), collectionKey)).caughtSpecies.length, 0)

        // Restore a real file produced by this UI, completing a browser-level
        // export/import round trip with exact legacy and collection bytes.
        await file.setInputFiles({ name: 'original-download.json', mimeType: 'application/json', buffer: priorBytes })
        await page.getByText('Saved values: 1 completed stop', { exact: false }).waitFor({ state: 'visible' })
        const thirdDownload = page.waitForEvent('download')
        await page.getByRole('button', { name: '1. Download current save' }).click()
        await thirdDownload
        await apply.click()
        await frames(page)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), progressKey), before[progressKey])
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), starterKey), before[starterKey])
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), collectionKey), collectionBefore)
        await page.reload()
        await ready(page)
        assert.equal(await page.evaluate((key) => localStorage.getItem(key), progressKey), before[progressKey])
        assert.equal(await page.getByRole('checkbox', { name: 'Mark Bulbasaur caught' }).isChecked(), true)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow')
        report.profiles.push({ width, status: 'passed' })
        await context.close()
    }
    assert.deepEqual(report.errors, [])
    report.status = 'passed'
} catch (error) {
    report.status = 'failed'
    report.failure = error.stack || String(error)
    process.exitCode = 1
} finally {
    await browser?.close()
    await saveReport(report, options.output, 'restore')
    console.log(JSON.stringify(report, null, 2))
}
