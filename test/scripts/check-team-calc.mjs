import assert from 'node:assert/strict'
import { launchBrowser, readOptions, saveReport } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-team-calc.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}

const slot = {
    pokemonName: 'bulbasaur', pokemonId: 1, types: ['grass', 'poison'],
    stats: { hp: 45, attack: 49, defense: 49, 'special-attack': 65, 'special-defense': 65, speed: 45 },
    nature: null, item: null, ability: null, teraType: null, role: null, level: 50,
    moves: ['tackle', null, null, null],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
}
const saved = JSON.stringify([slot, null, null, null, null, null])
const origin = options.origin
const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
let browser
try {
    const response = await fetch(origin + '/pokemon-basic/team/')
    assert.equal(response.ok, true, 'production Team Lab is available')
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
        await context.addInitScript((value) => localStorage.setItem('team_lab', value), saved)
        const requests = []
        await context.route('**/*', (route) => {
            const url = route.request().url()
            if (new URL(url).origin === origin) { requests.push(url); return route.continue() }
            if (url === 'https://pokeapi.co/api/v2/pokemon/bulbasaur') {
                return route.fulfill({ json: { name: 'bulbasaur', id: 1, types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }], abilities: [], moves: [], stats: [] } })
            }
            return route.abort()
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        await page.goto(origin + '/pokemon-basic/team/')
        await page.waitForFunction(() => window.Alpine?.store('team')?.coverage?.speedRows?.length === 1)
        assert.equal(requests.some((url) => url.includes('gen9-damage.')), false, 'calculator remains lazy')
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'read leaves legacy save bytes intact')
        await page.evaluate(() => { Alpine.store('team').activeSlot = 0 })
        await page.getByRole('button', { name: /Damage Calculator/ }).click()
        await page.evaluate(() => {
            Alpine.$data(document.querySelector('[x-data="setEditor"]')).calcDefenderPokemon = {
                name: 'charmander', id: 4, types: [{ type: { name: 'fire' } }], stats: [],
            }
        })
        await page.waitForFunction(() => Alpine.$data(document.querySelector('[x-data="setEditor"]')).calcResults?.[0]?.result?.min === 17)
        assert.equal(requests.some((url) => url.includes('gen9-damage.')), true, 'first calculation loads provider')
        assert.deepEqual(await page.evaluate(() => {
            const result = Alpine.$data(document.querySelector('[x-data="setEditor"]')).calcResults[0].result
            return [result.min, result.max]
        }), [17, 21])
        await page.evaluate(() => {
            const team = Alpine.store('team')
            team.updateSlot(0, { evs: { ...team.slots[0].evs, attack: 252 } })
        })
        await page.waitForFunction(() => Alpine.$data(document.querySelector('[x-data="setEditor"]')).calcResults?.[0]?.result?.min === 25)
        assert.deepEqual(await page.evaluate(() => {
            const result = Alpine.$data(document.querySelector('[x-data="setEditor"]')).calcResults[0].result
            return [result.min, result.max]
        }), [25, 30], 'editing set recalculates live')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow')
        report.profiles.push({ width, status: 'passed', initialRange: [17, 21], editedRange: [25, 30] })
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
    await saveReport(report, options.output, 'team-calc')
    console.log(JSON.stringify(report, null, 2))
}
