import assert from 'node:assert/strict'
import { GUIDE_BASE, launchBrowser, readOptions, ready, saveReport, selectStop } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-guide-other-games.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}
const saved = {
    'gold-silver': JSON.stringify(['mt-silver-red']),
    'ruby-sapphire': JSON.stringify(['gym-1-rustboro']),
    'diamond-pearl': JSON.stringify(['gym-5-canalave']),
}
const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
let browser
try {
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
        await context.addInitScript((values) => {
            for (const [game, value] of Object.entries(values)) localStorage.setItem(`pokebasic-guide-${game}-progress`, value)
        }, saved)
        await context.route('**/*', (route) => new URL(route.request().url()).origin === options.origin ? route.continue() : route.abort())
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        const checks = [
            { game: 'gold-silver', stop: 'Mt. Silver — Red', id: 'mt-silver-red', include: ['Espeon', 'Lv. 73'], exclude: ['Lapras'] },
            { game: 'ruby-sapphire', stop: 'Mauville Gym — Wattson', id: 'gym-3-mauville', include: ['Magnemite', 'Magneton'], exclude: ['Manectric'] },
            { game: 'diamond-pearl', stop: 'Hearthome Gym — Fantina', id: 'gym-5-hearthome', include: ['Fantina', 'Mismagius', 'Relic Badge'], exclude: [] },
        ]
        for (const check of checks) {
            await page.goto(`${options.origin}${GUIDE_BASE}/games/${check.game}/`)
            await ready(page, check.game)
            await selectStop(page, check.stop)
            const state = await page.evaluate((game) => {
                const root = document.querySelector('[x-data="guide"]')
                return { id: Alpine.$data(root).activeStopId, text: root.querySelector('main')?.innerText || '', save: localStorage.getItem(`pokebasic-guide-${game}-progress`) }
            }, check.game)
            assert.equal(state.id, check.id)
            for (const text of check.include) assert.ok(state.text.includes(text), `${check.game} should show ${text}`)
            for (const text of check.exclude) assert.ok(!state.text.includes(text), `${check.game} should not show ${text}`)
            assert.equal(state.save, saved[check.game], `${check.game} progress bytes are unchanged`)
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${check.game} has no overflow`)
        }
        await selectStop(page, 'Canalave Gym — Byron')
        assert.equal(await page.evaluate(() => Alpine.$data(document.querySelector('[x-data="guide"]')).activeStopId), 'gym-5-canalave', 'published Byron ID retained')
        report.profiles.push({ width, status: 'passed', stops: checks.map((check) => check.id) })
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
    await saveReport(report, options.output, 'guide-other-games')
    console.log(JSON.stringify(report, null, 2))
}
