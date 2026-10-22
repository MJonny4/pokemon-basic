import assert from 'node:assert/strict'
import { GUIDE_BASE, launchBrowser, readOptions, ready, saveReport, selectStop } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-team-opponent.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}

const slot = (pokemonId, pokemonName, moves) => ({
    pokemonId, pokemonName, moves, types: ['normal'],
    stats: { hp: 50, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
    nature: null, item: null, ability: null, teraType: null, role: null, level: 50,
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
})
const saved = JSON.stringify([
    slot(1, 'bulbasaur', ['vine-whip', null, null, null]),
    slot(25, 'pikachu', ['thunder-shock', 'volt-tackle', null, null]),
    slot(445, 'garchomp', ['earthquake', null, null, null]),
    null, null, null,
])
const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
let browser
try {
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
        await context.addInitScript((value) => localStorage.setItem('team_lab', value), saved)
        await context.route('**/*', (route) => new URL(route.request().url()).origin === options.origin ? route.continue() : route.abort())
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        await page.goto(options.origin + GUIDE_BASE + '/games/red-blue/')
        await ready(page)
        await selectStop(page, 'Pewter City Gym')
        await page.getByRole('link', { name: /Compare your Team Lab moves with Brock/ }).click()
        await page.waitForFunction(() => {
            const root = document.querySelector('[x-data="teamLab"]')
            return root && window.Alpine?.$data(root).currentOpponent?.name === 'Brock'
        })
        const first = await page.evaluate(() => {
            const root = document.querySelector('[x-data="teamLab"]')
            const data = Alpine.$data(root)
            return { id: data.currentOpponent.id, rows: data.opponentRows, save: localStorage.getItem('team_lab') }
        })
        assert.equal(first.id, 'gym-1-pewter:pewter-brock')
        assert.deepEqual(first.rows.map((row) => row.choices.map((choice) => choice.multiplier)), [[4, 0, null], [4, 0, null]])
        assert.equal(first.save, saved, 'comparison reads the legacy team without rewriting it')
        assert.match(await page.locator('section[aria-label="Red and Blue opponent matchup"]').innerText(), /Modern EVs, IVs, natures, abilities, items and Tera Type are not used/)

        await page.goto(options.origin + GUIDE_BASE + '/games/red-blue/')
        await ready(page)
        await selectStop(page, 'Champion')
        await page.getByRole('button', { name: 'You chose Charmander' }).click()
        await page.locator('[data-player-starter="4"]').getByRole('link', { name: /Compare your Team Lab moves with this Gen I party/ }).click()
        await page.waitForFunction(() => {
            const root = document.querySelector('[x-data="teamLab"]')
            return root && window.Alpine?.$data(root).currentOpponent?.name === 'Rival · Champion'
        })
        const beforeParty = await page.evaluate(() => {
            const data = Alpine.$data(document.querySelector('[x-data="teamLab"]'))
            return { starter: data.opponentStarterId, party: data.opponentParty.map((member) => member.dexId) }
        })
        assert.equal(beforeParty.starter, 4)
        assert.equal(beforeParty.party.length, 6)
        await page.getByRole('button', { name: 'You chose Squirtle' }).click()
        const afterParty = await page.evaluate(() => {
            const data = Alpine.$data(document.querySelector('[x-data="teamLab"]'))
            return { starter: data.opponentStarterId, party: data.opponentParty.map((member) => member.dexId), save: localStorage.getItem('team_lab') }
        })
        assert.equal(afterParty.starter, 7)
        assert.notDeepEqual(afterParty.party, beforeParty.party)
        assert.equal(afterParty.save, saved)
        assert.equal(new URL(page.url()).searchParams.get('starter'), '7')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow')
        report.profiles.push({ width, status: 'passed', brockMultipliers: [4, 0, null], championVariants: [4, 7] })
        await context.close()
    }
    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' })
    await offlineContext.addInitScript((value) => localStorage.setItem('team_lab', value), saved)
    const offlinePage = await offlineContext.newPage()
    offlinePage.on('pageerror', (error) => report.errors.push(error.message))
    const brockUrl = options.origin + GUIDE_BASE + '/team/?opponent=gym-1-pewter%3Apewter-brock'
    await offlinePage.goto(brockUrl)
    await offlinePage.evaluate(() => navigator.serviceWorker.ready)
    if (!await offlinePage.evaluate(() => Boolean(navigator.serviceWorker.controller))) await offlinePage.reload()
    await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    await offlinePage.waitForFunction(() => {
        const root = document.querySelector('[x-data="teamLab"]')
        return root && window.Alpine?.$data(root).currentOpponent?.name === 'Brock'
    })
    assert.equal(await offlinePage.evaluate(async () => {
        for (const name of await caches.keys()) {
            const keys = await (await caches.open(name)).keys()
            if (keys.some((request) => new URL(request.url).pathname === '/pokemon-basic/data/red-blue-opponents.json')) return true
        }
        return false
    }), true, 'opponent manifest is in the offline pack')
    await offlineContext.setOffline(true)
    await offlinePage.goto(brockUrl)
    await offlinePage.waitForFunction(() => {
        const root = document.querySelector('[x-data="teamLab"]')
        return root && window.Alpine?.$data(root).currentOpponent?.name === 'Brock'
    })
    assert.deepEqual(await offlinePage.evaluate(() => Alpine.$data(document.querySelector('[x-data="teamLab"]')).opponentRows[0].choices.map((choice) => choice.multiplier)), [4, 0, null])
    report.offline = 'passed'
    await offlineContext.close()
    assert.deepEqual(report.errors, [])
    report.status = 'passed'
} catch (error) {
    report.status = 'failed'
    report.failure = error.stack || String(error)
    process.exitCode = 1
} finally {
    await browser?.close()
    await saveReport(report, options.output, 'team-opponent')
    console.log(JSON.stringify(report, null, 2))
}
