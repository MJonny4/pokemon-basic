import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { launchBrowser, readOptions, saveReport } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-team-portability.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}

const bulbasaur = {
    pokemonName: 'bulbasaur', pokemonId: 1, types: ['grass', 'poison'],
    stats: { hp: 45, attack: 49, defense: 49, 'special-attack': 65, 'special-defense': 65, speed: 45 },
    nature: null, item: null, ability: null, teraType: null, role: null, level: 50,
    moves: ['tackle', null, null, null],
    evs: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
    ivs: { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
}
const saved = JSON.stringify([bulbasaur, null, null, null, null, null])
const pikachu = {
    name: 'pikachu', id: 25,
    types: [{ type: { name: 'electric' } }],
    stats: Object.entries({ hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 })
        .map(([name, base_stat]) => ({ stat: { name }, base_stat })),
}
const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
let browser
try {
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', acceptDownloads: true })
        await context.addInitScript((value) => localStorage.setItem('team_lab', value), saved)
        await context.route('**/*', (route) => {
            const url = route.request().url()
            if (new URL(url).origin === options.origin) return route.continue()
            if (url === 'https://pokeapi.co/api/v2/pokemon/pikachu') return route.fulfill({ json: pikachu })
            return route.abort()
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        await page.goto(options.origin + '/pokemon-basic/team/')
        await page.waitForFunction(() => window.Alpine?.store('team')?.slots?.[0]?.pokemonName === 'bulbasaur')
        const panel = page.locator('section[aria-label="Team import and backups"]')
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'legacy bytes untouched on load')
        await panel.getByRole('textbox', { name: 'New team name' }).fill('First team')
        await panel.getByRole('button', { name: 'Save current team' }).click()
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('team_lab_library_v1') || '{}').teams?.length === 1)
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'named save does not rewrite active team')
        await page.reload()
        await page.waitForFunction(() => document.querySelector('[x-data="teamPortability"]') && window.Alpine?.$data(document.querySelector('[x-data="teamPortability"]')).library.teams.length === 1)
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'reload preserves legacy bytes')

        const backupDownload = page.waitForEvent('download')
        await panel.getByRole('button', { name: 'Download backup', exact: true }).click()
        const backup = JSON.parse(await readFile(await (await backupDownload).path(), 'utf8'))
        assert.equal(backup.active[0].pokemonName, 'bulbasaur')
        assert.equal(backup.namedTeams[0].name, 'First team')

        const editor = panel.getByRole('textbox', { name: 'Showdown team text' })
        await editor.fill('Pikachu\nShiny: Yes')
        await panel.getByRole('button', { name: 'Review text' }).click()
        await panel.getByRole('status').filter({ hasText: 'unsupported or invalid' }).waitFor()
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'invalid Showdown text is read-only')
        await editor.fill('Pikachu @ Light Ball\nAbility: Static\nLevel: 50\nEVs: 252 Atk / 252 Spe\nJolly Nature\n- Thunderbolt')
        await panel.getByRole('button', { name: 'Review text' }).click()
        await panel.getByRole('button', { name: 'Import current team' }).waitFor()
        assert.equal(await page.evaluate(() => localStorage.getItem('team_lab')), saved, 'Showdown preview is read-only')
        const recovery = page.waitForEvent('download')
        await panel.getByRole('button', { name: 'Import current team' }).click()
        assert.equal((await recovery).suggestedFilename().includes('raw-recovery'), true)
        await page.waitForFunction(() => window.Alpine?.store('team')?.slots?.[0]?.pokemonName === 'pikachu')
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('team_lab'))[0].moves[0]), 'thunderbolt')

        const file = panel.locator('input[type="file"]')
        await file.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') })
        await panel.getByRole('status').filter({ hasText: 'not valid JSON' }).waitFor()
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('team_lab'))[0].pokemonName), 'pikachu')
        await file.setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
        await panel.getByRole('button', { name: 'Merge snapshots' }).waitFor()
        const mergeRecovery = page.waitForEvent('download')
        await panel.getByRole('button', { name: 'Merge snapshots' }).click()
        await mergeRecovery
        assert.deepEqual(await page.evaluate(() => [JSON.parse(localStorage.getItem('team_lab'))[0].pokemonName, JSON.parse(localStorage.getItem('team_lab_library_v1')).teams.length]), ['pikachu', 3])
        await file.setInputFiles({ name: 'good.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
        await panel.getByRole('button', { name: 'Replace team & snapshots' }).waitFor()
        const replaceRecovery = page.waitForEvent('download')
        await panel.getByRole('button', { name: 'Replace team & snapshots' }).click()
        await replaceRecovery
        assert.deepEqual(await page.evaluate(() => [JSON.parse(localStorage.getItem('team_lab'))[0].pokemonName, JSON.parse(localStorage.getItem('team_lab_library_v1')).teams.length]), ['bulbasaur', 1])
        await page.reload()
        await page.waitForFunction(() => window.Alpine?.store('team')?.slots?.[0]?.pokemonName === 'bulbasaur')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow')
        report.profiles.push({ width, status: 'passed', named: 1, merged: 3, restored: 1 })
        await context.close()
    }
    const damaged = await browser.newContext({ serviceWorkers: 'block' })
    await damaged.addInitScript(() => localStorage.setItem('team_lab', '{damaged-team'))
    await damaged.route('**/*', (route) => new URL(route.request().url()).origin === options.origin ? route.continue() : route.abort())
    const damagedPage = await damaged.newPage()
    damagedPage.on('pageerror', (error) => report.errors.push(error.message))
    await damagedPage.goto(options.origin + '/pokemon-basic/team/')
    await damagedPage.getByRole('alert').filter({ hasText: 'Saved team data needs recovery' }).waitFor()
    await damagedPage.evaluate((pokemon) => Alpine.store('team').addToSlot(0, pokemon), {
        ...pikachu, abilities: [], moves: [],
    })
    assert.equal(await damagedPage.evaluate(() => localStorage.getItem('team_lab')), '{damaged-team', 'damaged legacy bytes remain untouched')
    const damagedPanel = damagedPage.locator('section[aria-label="Team import and backups"]')
    const damagedDownload = damagedPage.waitForEvent('download')
    await damagedPanel.getByRole('button', { name: 'Download raw recovery' }).click()
    const damagedRecovery = JSON.parse(await readFile(await (await damagedDownload).path(), 'utf8'))
    assert.equal(damagedRecovery.team_lab, '{damaged-team')
    report.damagedLegacy = 'preserved and downloadable'
    await damaged.close()
    assert.deepEqual(report.errors, [])
    report.status = 'passed'
} catch (error) {
    report.status = 'failed'
    report.failure = error.stack || String(error)
    process.exitCode = 1
} finally {
    await browser?.close()
    await saveReport(report, options.output, 'team-portability')
    console.log(JSON.stringify(report, null, 2))
}
