import assert from 'node:assert/strict'
import { GUIDE_BASE, assertProduction, frames, guideDOM, launchBrowser, readOptions, ready, saveReport, selectStop } from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('node test/scripts/check-guide-midgame.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}
const report = { checkedAt: new Date().toISOString(), profiles: [], errors: [] }
const stops = [
    ['Rock Tunnel & Lavender Town', 'red-blue-rock-tunnel'],
    ['Celadon City', 'red-blue-celadon-story'],
    ['Celadon City Gym — Erika', 'red-blue-erika-story'],
    ['Pokémon Tower', 'red-blue-tower-story'],
    ['Saffron City', 'red-blue-saffron-story'],
    ['Fuchsia City Gym — Koga', 'red-blue-fuchsia-story'],
    ['Saffron City Gym — Sabrina', 'red-blue-sabrina-gym'],
    ['Cinnabar Island Gym — Blaine', 'red-blue-cinnabar-story'],
    ['Viridian City Gym — Giovanni', 'red-blue-viridian-gym-story'],
    ['Victory Road', 'red-blue-victory-road-story'],
    ['Elite Four — Lorelei', 'red-blue-lorelei-story'],
    ['Elite Four — Bruno', 'red-blue-bruno-story'],
    ['Elite Four — Agatha', 'red-blue-agatha-story'],
    ['Elite Four — Lance', 'red-blue-lance-story'],
    ['Champion — Rival', 'red-blue-champion-story'],
]
let browser
try {
    await assertProduction(options.origin)
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
        // Isolated public fixtures, never the user's profile. External imagery is
        // deliberately blocked: this checks usable cards/fallbacks, not CDN uptime.
        await context.route('**/*', (route) => new URL(route.request().url()).origin === options.origin ? route.continue() : route.abort())
        await context.addInitScript(() => {
            if (sessionStorage.getItem('midgame-fixture')) return
            localStorage.setItem('pb_dark', 'false')
            localStorage.setItem('pokebasic-guide-red-blue-progress', '[ "pallet-town", "gym-3-vermilion" ]')
            localStorage.setItem('pokebasic-guide-red-blue-starter', '{ "id": 4, "name": "Charmander", "type": "fire", "description": "Exact bytes" }')
            localStorage.setItem('pokebasic-guide-gold-silver-progress', '[ "new-bark-town" ]')
            sessionStorage.setItem('midgame-fixture', '1')
        })
        const page = await context.newPage()
        page.on('pageerror', (error) => report.errors.push(error.message))
        await page.goto(options.origin + GUIDE_BASE + '/games/red-blue/')
        await ready(page)
        const originalSave = await page.evaluate(() => ({ ...localStorage }))
        const profile = { width, stops: [] }
        report.profiles.push(profile)
        for (let cycle = 0; cycle < 2; cycle++) {
            for (const [name, id] of stops) {
                // Celadon city must not match the separate gym navigation button.
                await selectStop(page, name === 'Celadon City' ? /Celadon City(?! Gym)/ : name === 'Saffron City' ? /Saffron City(?! Gym)/ : name)
                const section = page.locator(`[data-location-id="${id}"]`)
                await section.waitFor({ state: 'visible' })
                assert.equal(await page.locator('[data-location-id]').count(), 1, 'previous stop unmounted')
                assert.equal(await section.locator('[data-guide-trainers]').count(), 0, 'no misleading empty trainer inventory')
                if (id === 'red-blue-rock-tunnel' || id === 'red-blue-celadon-story' || id === 'red-blue-tower-story') {
                    const selector = section.getByLabel('Where are you exploring?')
                    const areas = await selector.locator('option').evaluateAll((items) => items.map((item) => item.value))
                    assert.equal(areas.length, id === 'red-blue-rock-tunnel' ? 4 : id === 'red-blue-celadon-story' ? 2 : 5)
                    for (const area of areas) {
                        await selector.selectOption(area)
                        for (const version of ['red', 'blue']) {
                            await section.getByRole('button', { name: `Pokémon ${version}`, exact: true }).click()
                            await frames(page)
                            const visible = section.locator('[data-encounter-version]:visible')
                            assert.equal(await visible.count(), 1)
                            assert.equal(await visible.getAttribute('data-encounter-area'), area)
                            assert.equal(await visible.getAttribute('data-encounter-version'), version)
                        }
                    }
                }
                if (id === 'red-blue-celadon-story') {
                    const boss = section.getByRole('region', { name: 'Giovanni · Rocket Hideout', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.doesNotMatch(await boss.innerText(), /Gym Leader/)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [95, 111, 115])
                }
                if (id === 'red-blue-erika-story') {
                    const boss = section.getByRole('region', { name: 'Erika', exact: true })
                    assert.match(await boss.innerText(), /Gym Leader/)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [71, 114, 45])
                }
                if (id === 'red-blue-tower-story') {
                    const rival = section.locator('[data-starter-battle="tower-rival"]')
                    for (const [starter, ids] of [['Bulbasaur', [17,102,130,64,5]], ['Charmander', [17,58,102,64,8]], ['Squirtle', [17,130,58,64,2]]]) {
                        await rival.getByRole('button', { name: `You chose ${starter}` }).click()
                        await frames(page)
                        assert.deepEqual(await rival.locator('[data-player-starter]:visible [data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), ids)
                    }
                    assert.match(await section.locator('#red-blue-tower-story-poke-flute').innerText(), /Fuji.*house/)
                }
                if (id === 'red-blue-saffron-story') {
                    const rival = section.locator('[data-starter-battle="silph-rival"]')
                    for (const [starter, ids] of [['Bulbasaur', [18,58,102,65,9]], ['Charmander', [18,130,58,65,3]], ['Squirtle', [18,102,130,65,6]]]) {
                        await rival.getByRole('button', { name: `You chose ${starter}` }).click()
                        await frames(page)
                        assert.deepEqual(await rival.locator('[data-player-starter]:visible [data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), ids)
                    }
                    const boss = section.getByRole('region', { name: 'Giovanni · Silph Co.', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [33,115,111,31])
                    for (const item of ['card-key', 'lapras', 'master-ball']) {
                        assert.equal(await section.locator(`#red-blue-saffron-story-${item} img`).count(), 1)
                    }
                }
                if (id === 'red-blue-sabrina-gym') {
                    const leader = section.getByRole('region', { name: 'Sabrina', exact: true })
                    assert.match(await leader.innerText(), /Gym Leader/)
                    assert.deepEqual(await leader.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [64, 122, 49, 65])
                    assert.match(await section.innerText(), /seven ordinary trainers/)
                    assert.equal(await section.locator('#red-blue-sabrina-gym-psywave img').count(), 1)
                }
                if (id === 'red-blue-fuchsia-story') {
                    assert.equal(await page.getByText('From the entrance in the Center Area, find its eastern opening', { exact: false }).isVisible(), true, 'Safari route directions visible')
                    const leader = section.getByRole('region', { name: 'Koga', exact: true })
                    assert.match(await leader.innerText(), /Gym Leader/)
                    assert.deepEqual(await leader.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [109, 89, 109, 110])
                    const story = await section.innerText()
                    assert.match(story, /Rainbow Badge\. Koga’s Soul Badge unlocks field Surf/)
                    assert.match(story, /six ordinary trainers/)
                    await section.getByText('Wild Pokémon — Safari encounters not audited').click()
                    assert.match(await section.innerText(), /This empty list does not mean the Safari Zone has no wild Pokémon/)
                    for (const item of ['gold-teeth', 'surf', 'strength', 'toxic']) {
                        assert.equal(await section.locator(`#red-blue-fuchsia-story-${item} img`).count(), 1)
                    }
                }
                if (id === 'red-blue-cinnabar-story') {
                    assert.equal(await page.getByText('At the 3F southern openings, the small right-hand hole drops to 2F.', { exact: false }).isVisible(), true, 'Mansion drop route visible')
                    const leader = section.getByRole('region', { name: 'Blaine', exact: true })
                    assert.match(await leader.innerText(), /Gym Leader/)
                    assert.deepEqual(await leader.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [58, 77, 78, 59])
                    const story = await section.innerText()
                    assert.match(story, /seven ordinary trainers/)
                    await section.getByText('Wild Pokémon — Mansion encounters not audited').click()
                    assert.match(await section.innerText(), /does not mean there are no wild Pokémon/)
                    for (const item of ['secret-key', 'fire-blast']) {
                        assert.equal(await section.locator(`#red-blue-cinnabar-story-${item} img`).count(), 1)
                    }
                }
                if (id === 'red-blue-viridian-gym-story') {
                    assert.equal(await page.getByText('Before taking the direct arrow route, approach the Hiker on the north wall from below', { exact: false }).isVisible(), true, 'north-wall trainer route visible')
                    const leader = section.getByRole('region', { name: 'Giovanni', exact: true })
                    assert.match(await leader.innerText(), /Gym Leader/)
                    assert.deepEqual(await leader.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [111, 51, 31, 34, 112])
                    const story = await section.innerText()
                    assert.match(story, /eight ordinary trainers/)
                    assert.match(story, /neutral against Poison\/Ground Nidoqueen and Nidoking/)
                    assert.equal(await section.locator('#red-blue-viridian-gym-story-fissure img').count(), 1)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /There are no wild Pokémon encounters inside Viridian Gym/)
                }
                if (id === 'red-blue-victory-road-story') {
                    const rival = section.locator('[data-starter-battle="route-22-rival"]')
                    for (const [starter, ids] of [['Bulbasaur', [18,111,58,102,65,9]], ['Charmander', [18,111,130,58,65,3]], ['Squirtle', [18,111,102,130,65,6]]]) {
                        await rival.getByRole('button', { name: `You chose ${starter}` }).click()
                        await frames(page)
                        assert.deepEqual(await rival.locator('[data-player-starter]:visible [data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), ids)
                    }
                    const story = await section.innerText()
                    assert.equal(await page.getByText('This fight is on Route 22, before Victory Road.', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('Cascade, Thunder, Rainbow, Soul, Marsh, Volcano and Earth Badges.', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('push the fallen boulder west onto the second switch', { exact: false }).isVisible(), true)
                    assert.match(story, /resets the 2F and 3F boulder-switch progress/)
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — Victory Road encounters not audited').click()
                    assert.match(await section.innerText(), /does not mean the cave is encounter-free/)
                }
                if (id === 'red-blue-lorelei-story') {
                    assert.equal(await page.getByText('Heal with the lobby nurse', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('cannot leave by the south exit', { exact: false }).isVisible(), true)
                    const boss = section.getByRole('region', { name: 'Lorelei · Elite Four', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [87, 91, 80, 124, 131])
                    assert.match(await boss.locator('[data-guide-pokemon="124"]').innerText(), /Thrash/)
                    assert.doesNotMatch(await boss.locator('[data-guide-pokemon="124"]').innerText(), /Lovely Kiss/)
                    assert.match(await boss.locator('[data-guide-pokemon="131"]').innerText(), /Blizzard/)
                    assert.match(await section.innerText(), /resets its battle progress/)
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /no wild Pokémon encounters in the League lobby or Lorelei’s room/i)
                }
                if (id === 'red-blue-bruno-story') {
                    assert.equal(await page.getByText('After Lorelei, heal with the items you carried', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('north door opens into Agatha’s room', { exact: false }).isVisible(), true)
                    const boss = section.getByRole('region', { name: 'Bruno · Elite Four', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [95, 107, 106, 95, 68])
                    assert.match(await boss.locator('[data-guide-pokemon="68"]').innerText(), /Fissure/)
                    assert.match(await boss.locator('[data-guide-pokemon="107"]').innerText(), /Counter/)
                    assert.match(await section.innerText(), /cannot retreat south once inside Bruno’s room/i)
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /no wild Pokémon encounters inside Bruno’s room/i)
                }
                if (id === 'red-blue-agatha-story') {
                    assert.equal(await page.getByText('After Bruno, heal with the items you carried', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('Her north door opens into Lance’s room', { exact: false }).isVisible(), true)
                    const boss = section.getByRole('region', { name: 'Agatha · Elite Four', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [94, 42, 93, 24, 94])
                    assert.match(await boss.locator('[data-guide-pokemon="94"]').first().innerText(), /Hypnosis/)
                    assert.doesNotMatch(await boss.locator('[data-guide-pokemon="94"]').first().innerText(), /Toxic/)
                    assert.match(await boss.locator('[data-guide-pokemon="94"]').last().innerText(), /Toxic/)
                    assert.doesNotMatch(await boss.locator('[data-guide-pokemon="94"]').last().innerText(), /Hypnosis/)
                    assert.match(await boss.locator('[data-guide-pokemon="42"]').innerText(), /Haze/)
                    assert.match(await boss.locator('[data-guide-pokemon="24"]').innerText(), /Glare/)
                    assert.match(await section.innerText(), /Full Heal does not clear it in Red\/Blue/)
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /no wild Pokémon encounters inside Agatha’s room/i)
                }
                if (id === 'red-blue-lance-story') {
                    assert.equal(await page.getByText('eastern staircase; stepping onto it walks you through the long hall', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('rival beat the Elite Four first', { exact: false }).isVisible(), true)
                    const boss = section.getByRole('region', { name: 'Lance · Elite Four', exact: true })
                    assert.match(await boss.innerText(), /Story battle/i)
                    assert.deepEqual(await boss.locator('[data-guide-pokemon]').evaluateAll((cards) => cards.map((card) => Number(card.dataset.guidePokemon))), [130, 148, 148, 142, 149])
                    assert.match(await boss.locator('[data-guide-pokemon="149"]').innerText(), /Barrier/)
                    for (const card of await boss.locator('[data-guide-pokemon]').all()) assert.match(await card.innerText(), /Hyper Beam/)
                    assert.doesNotMatch(await section.innerText(), /Ice Beam or Blizzard is mandatory/)
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /no wild Pokémon encounters inside Lance’s room/i)
                }
                if (id === 'red-blue-champion-story') {
                    assert.equal(await page.getByText('entering the Champion’s room walks you to your rival and begins the final battle', { exact: false }).isVisible(), true)
                    assert.equal(await page.getByText('game records your team and saves', { exact: false }).isVisible(), true)
                    const rival = section.locator('[data-starter-battle="champion-rival-battle"]')
                    for (const [starter, ids, finalMove] of [
                        ['Bulbasaur', [18, 65, 112, 103, 130, 6], 'Fire Blast'],
                        ['Charmander', [18, 65, 112, 59, 103, 9], 'Blizzard'],
                        ['Squirtle', [18, 65, 112, 130, 59, 3], 'Mega Drain'],
                    ]) {
                        await rival.getByRole('button', { name: `You chose ${starter}` }).click()
                        await frames(page)
                        const cards = rival.locator('[data-player-starter]:visible [data-guide-pokemon]')
                        assert.deepEqual(await cards.evaluateAll((items) => items.map((card) => Number(card.dataset.guidePokemon))), ids)
                        assert.match(await cards.first().innerText(), /Sky Attack/)
                        assert.match(await cards.last().innerText(), new RegExp(finalMove))
                    }
                    assert.equal(await section.getByText('Items & rewards (0)').count(), 0)
                    await section.getByText('Wild Pokémon — none inside this location').click()
                    assert.match(await section.innerText(), /no wild Pokémon encounters inside the Champion’s room or Hall of Fame/i)
                }
                const dom = await guideDOM(page)
                assert.deepEqual(dom.duplicateIds, [])
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no viewport overflow')
                assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), originalSave)
                profile.stops.push({ cycle, ...dom })
            }
        }
        await page.reload()
        await ready(page)
        assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), originalSave)
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
    await saveReport(report, options.output, 'midgame')
    console.log(JSON.stringify(report, null, 2))
}
