import assert from 'node:assert/strict'
import {
    GUIDE_BASE, readOptions, launchBrowser, assertProduction, ready, frames,
    selectStop, guideDOM, saveReport,
} from './guide-browser-utils.mjs'

const options = readOptions()
if (options.help) {
    console.log('Usage: node test/scripts/check-guide-offline.mjs [--origin http://127.0.0.1:4322] [--output report.json]')
    process.exit(0)
}

const timeout = 15_000
const guidePath = GUIDE_BASE + '/games/red-blue/'
const fixtures = {
    pb_dark: 'false',
    'pokebasic-guide-red-blue-progress': '[ "pallet-town", "vermilion-city", "gym-3-vermilion" ]',
    'pokebasic-guide-red-blue-starter': JSON.stringify({ id: 4, name: 'Charmander', type: 'fire', description: 'Public offline-check fixture; preserve raw bytes.' }),
    'pokebasic-guide-gold-silver-progress': '[ "new-bark-town" ]',
}
const report = {
    schemaVersion: 1,
    kind: 'guide-offline',
    startedAt: new Date().toISOString(),
    origin: options.origin,
    deploymentBase: GUIDE_BASE,
    isolation: 'New nonpersistent browser contexts; no existing profile, request routing, manual service-worker registration, or personal saves.',
    limitations: [
        'Warm-cache offline check, not offline first use or guaranteed permanent browser storage.',
        'No ROM/playthrough verification, third-party API availability guarantee, or offline install/update prompt coverage.',
        'Browser emulation of a disconnected network; no device-level network or storage-eviction simulation.',
        'The slashless deployment root ' + GUIDE_BASE + ' is outside the ' + GUIDE_BASE + '/ worker scope. Its online hosting redirect cannot be guaranteed offline; use the scoped root with a trailing slash.',
    ],
    phases: [],
}
let browser
let context
let page
let failureCount = 0
const pageErrors = []

function message(error) {
    return error instanceof Error ? error.message : String(error)
}

async function phase(name, action) {
    const start = performance.now()
    try {
        const evidence = await action()
        report.phases.push({ name, status: 'passed', durationMs: Math.round(performance.now() - start), ...(evidence === undefined ? {} : { evidence }) })
        console.log('PASS ' + name)
        return true
    } catch (error) {
        failureCount++
        report.phases.push({ name, status: 'failed', durationMs: Math.round(performance.now() - start), error: message(error) })
        console.error('FAIL ' + name + ': ' + message(error))
        return false
    }
}

function skipped(name, reason) {
    report.phases.push({ name, status: 'skipped', reason })
}

async function workerSnapshot(currentPage) {
    return currentPage.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false, finalURL: location.href, registrations: [], controller: null }
        const registrations = await navigator.serviceWorker.getRegistrations()
        const worker = (item) => item ? { scriptURL: item.scriptURL, state: item.state } : null
        return {
            supported: true,
            finalURL: location.href,
            controller: worker(navigator.serviceWorker.controller),
            registrations: registrations.map((item) => ({ scope: item.scope, active: worker(item.active), waiting: worker(item.waiting), installing: worker(item.installing) })),
        }
    })
}

async function cacheSummary(currentPage) {
    return currentPage.evaluate(async ({ base }) => {
        const summaries = []
        for (const name of await caches.keys()) {
            const requests = await (await caches.open(name)).keys()
            const groups = { documents: 0, javascript: 0, styles: 0, fonts: 0, images: 0, other: 0 }
            const guidePaths = []
            let readableBodyBytes = 0
            for (const request of requests) {
                const response = await (await caches.open(name)).match(request)
                if (response && response.type !== 'opaque') readableBodyBytes += (await response.arrayBuffer()).byteLength
                const url = new URL(request.url)
                const key = /\.(?:m?js)$/.test(url.pathname) ? 'javascript'
                    : /\.css$/.test(url.pathname) ? 'styles'
                    : /\.(?:woff2?|ttf|otf)$/.test(url.pathname) ? 'fonts'
                    : /\.(?:png|jpe?g|gif|webp|svg|ico)$/.test(url.pathname) ? 'images'
                    : /(?:\/|\.html)$/.test(url.pathname) ? 'documents' : 'other'
                groups[key]++
                if (url.origin === location.origin && url.pathname.startsWith(base + '/games')) guidePaths.push(url.pathname)
            }
            summaries.push({ name, entryCount: requests.length, readableBodyBytes, byteNote: 'Decoded readable response bodies; excludes opaque bodies and storage overhead. Not compressed transfer or browser quota use.', groups, guidePaths: [...new Set(guidePaths)].sort() })
        }
        return summaries
    }, { base: GUIDE_BASE })
}

async function precachedAssets(currentPage) {
    return currentPage.evaluate(async () => {
        const fontURLs = new Set()
        for (const sheet of document.styleSheets) {
            if (sheet.href && new URL(sheet.href).origin !== location.origin) continue
            const inspect = (rules) => {
                for (const rule of rules) {
                    if (rule.type === CSSRule.FONT_FACE_RULE) {
                        for (const match of rule.style.getPropertyValue('src').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
                            const url = new URL(match[1], sheet.href || location.href)
                            if (url.origin === location.origin) fontURLs.add(url.href)
                        }
                    } else if (rule.cssRules) inspect(rule.cssRules)
                }
            }
            inspect(sheet.cssRules)
        }
        const icon = document.querySelector('aside nav img[src*="/gym."]')
        const iconURL = icon ? new URL(icon.getAttribute('src'), location.href).href : null
        const assets = [...fontURLs].map((url) => ({ url, kind: 'font' }))
        if (iconURL) assets.push({ url: iconURL, kind: 'gym-icon' })
        const names = (await caches.keys()).filter((name) => name.includes('precache'))
        const cachesByName = await Promise.all(names.map(async (name) => ({ name, cache: await caches.open(name) })))
        const records = []
        for (const asset of assets) {
            const expected = new URL(asset.url)
            let found
            for (const { name, cache } of cachesByName) {
                // Workbox can add __WB_REVISION__ to CacheStorage keys. Compare
                // the immutable public asset path, then inspect the real cached
                // response rather than trusting HTTP cache/resource timing.
                const key = (await cache.keys()).find((request) => {
                    const url = new URL(request.url)
                    return url.origin === expected.origin && url.pathname === expected.pathname
                })
                if (!key) continue
                const response = await cache.match(key)
                found = { cache: name, status: response.status, bytes: (await response.arrayBuffer()).byteLength }
                break
            }
            records.push({ path: expected.pathname, kind: asset.kind, ...(found || { cache: null, status: null, bytes: 0 }) })
        }
        return { fontCount: fontURLs.size, iconFoundInMarkup: Boolean(iconURL), cacheNames: names, assets: records }
    })
}

async function storageSnapshot(currentPage) {
    return currentPage.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])))
}

async function localItemImage(currentPage) {
    // Exercise a real same-origin image request separately from CDN fallback
    // availability. This fixture does not alter the application's item markup.
    return currentPage.evaluate(async (url) => {
        const image = new Image()
        image.src = url
        await image.decode()
        return { url, width: image.naturalWidth, height: image.naturalHeight }
    }, GUIDE_BASE + '/items/super-rod.png')
}

async function assertGuide(currentPage, expectedGuide = 'red-blue') {
    // A cached homepage can return HTTP 200 for an incorrect guide URL. Inspect
    // the SSR identity before hydration instead of treating that as success.
    assert.equal(await currentPage.locator('[x-data="guide"]').count(), 1, 'Expected guide HTML, not a homepage/navigation fallback')
    const embeddedId = await currentPage.locator('[x-data="guide"]').evaluate((root) => JSON.parse(root.dataset.game).id)
    assert.equal(embeddedId, expectedGuide, 'The response contains a different guide')
    await ready(currentPage, expectedGuide)
    await frames(currentPage)
    return { finalURL: currentPage.url(), guideId: embeddedId, title: await currentPage.title(), dom: await guideDOM(currentPage) }
}

try {
    const production = await phase('production build available', () => assertProduction(options.origin))
    if (production) {
        browser = await launchBrowser()
        context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' })
        context.setDefaultTimeout(timeout)
        context.setDefaultNavigationTimeout(timeout)
        await context.addInitScript(({ origin, values }) => {
            if (location.origin !== origin || sessionStorage.getItem('pb-offline-check-fixture')) return
            for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
            sessionStorage.setItem('pb-offline-check-fixture', 'seeded')
        }, { origin: options.origin, values: fixtures })
        page = await context.newPage()
        // Disable the separate Chromium HTTP cache. CacheStorage/service-worker
        // dispatch remain enabled, so offline success cannot come from assets
        // incidentally retained by an online navigation's HTTP cache.
        const network = await context.newCDPSession(page)
        await network.send('Network.enable')
        await network.send('Network.setCacheDisabled', { cacheDisabled: true })
        report.httpCacheDisabled = true
        page.on('pageerror', (error) => pageErrors.push(message(error)))

        const online = await phase('clean online guide boot', async () => {
            const response = await page.goto(options.origin + guidePath, { waitUntil: 'domcontentloaded' })
            assert.ok(response?.ok(), 'Guide navigation did not return a successful response')
            const identity = await assertGuide(page)
            assert.deepEqual(await storageSnapshot(page), fixtures, 'Boot must preserve the exact public save-fixture bytes')
            return { ...identity, workers: await workerSnapshot(page) }
        })

        let registered = false
        let controlled = false
        if (online) {
            registered = await phase('application registers its own service worker', async () => {
                try {
                    // Registration is asynchronous and can intentionally wait
                    // until page load. An immediate zero is not a failure.
                    await page.waitForFunction(async () => 'serviceWorker' in navigator && (await navigator.serviceWorker.getRegistrations()).length > 0, null, { timeout })
                } catch (cause) {
                    report.registration = await workerSnapshot(page)
                    throw new Error('The application did not register a service worker within 15 seconds. This check never manually registers one; inspect the built registration script and page integration.', { cause })
                }
                report.registration = await workerSnapshot(page)
                assert.equal(report.registration.registrations.length, 1, 'Expected exactly one app registration in a fresh isolated context')
                assert.equal(report.registration.registrations[0].scope, options.origin + GUIDE_BASE + '/', 'The worker scope must match the deployed base path')
                return report.registration
            })
        } else skipped('application registers its own service worker', 'Online guide boot failed')

        if (registered) {
            controlled = await phase('worker activates and controls the guide', async () => {
                await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).some((item) => item.active?.state === 'activated'), null, { timeout })
                // First-install control can require a fresh navigation even when
                // activation has completed; reload normally rather than injecting
                // clients.claim(), registration code or a test worker.
                await page.reload({ waitUntil: 'domcontentloaded' })
                await assertGuide(page)
                await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated', null, { timeout })
                report.controlled = await workerSnapshot(page)
                assert.ok(report.controlled.controller, 'Reloaded page is not service-worker controlled')
                assert.equal(report.controlled.controller.scriptURL, report.controlled.registrations[0].active.scriptURL)
                assert.deepEqual(await storageSnapshot(page), fixtures, 'Registration/reload must not rewrite saves')
                report.onlineCaches = await cacheSummary(page)
                return report.controlled
            })
        } else skipped('worker activates and controls the guide', 'No valid app registration')

        if (controlled) {
            await phase('bounded precache and a visited detail page cached on demand', async () => {
                const precache = report.onlineCaches.find((cache) => cache.name.includes('precache'))
                assert.ok(precache, 'Expected a precache')
                assert.ok(precache.entryCount < 100, 'Precache unexpectedly includes the full detail catalog')
                assert.equal(precache.groups.documents, 12, 'Expected home, six tools, games redirect and four guides')
                const visited = await context.newPage()
                try {
                    const url = options.origin + GUIDE_BASE + '/items/potion/'
                    assert.equal(await page.evaluate(async (target) => Boolean(await caches.match(target)), url), false, 'Detail must not already be precached')
                    await visited.goto(url, { waitUntil: 'domcontentloaded' })
                    await visited.getByRole('heading', { name: 'Potion', exact: true }).waitFor()
                    await visited.waitForFunction(async (target) => Boolean(await (await caches.open('pokebasic-pages-v1')).match(target)), url)
                    await localItemImage(visited)
                    await visited.waitForFunction(async (target) => Boolean(await (await caches.open('pokebasic-item-images-v1')).match(target)), options.origin + GUIDE_BASE + '/items/super-rod.png')
                    return { precacheEntries: precache.entryCount, documents: precache.groups.documents, decodedPrecacheBodyBytes: precache.readableBodyBytes, visitedPath: new URL(url).pathname }
                } finally { await visited.close() }
            })
            await phase('local fonts and gym icon have actual precache responses', async () => {
                report.precachedAssets = await precachedAssets(page)
                assert.ok(report.precachedAssets.fontCount > 0, 'No local font-face URLs were discovered in built stylesheets')
                assert.ok(report.precachedAssets.iconFoundInMarkup, 'Local gym icon is missing from the guide markup')
                assert.ok(report.precachedAssets.cacheNames.length > 0, 'No Workbox precache exists')
                for (const asset of report.precachedAssets.assets) {
                    assert.ok(asset.cache, 'Asset is not actually precached: ' + asset.path)
                    assert.equal(asset.status, 200, 'Precached asset is not a successful response: ' + asset.path)
                    assert.ok(asset.bytes > 0, 'Precached asset has an empty response: ' + asset.path)
                }
                return report.precachedAssets
            })
            await context.setOffline(true)
            const reloaded = await phase('warm offline guide reload', async () => {
                const response = await page.reload({ waitUntil: 'domcontentloaded' })
                assert.ok(response?.ok(), 'Offline reload did not return a successful response')
                const identity = await assertGuide(page)
                assert.ok((await workerSnapshot(page)).controller, 'Offline guide lost its controller')
                return identity
            })

            if (reloaded) {
                await phase('offline local fonts load without HTTP cache', async () => {
                    const fonts = await page.evaluate(async () => {
                        const result = []
                        for (const family of ['Geist Variable', 'Geist Mono Variable']) {
                            const faces = await document.fonts.load('16px "' + family + '"', 'PokeBasic guide 123')
                            result.push({ family, faces: faces.map((face) => ({ family: face.family, status: face.status })) })
                        }
                        return result
                    })
                    for (const font of fonts) {
                        assert.ok(font.faces.length > 0, 'Expected a real local font face for ' + font.family)
                        assert.ok(font.faces.every((face) => face.status === 'loaded'), 'Offline font did not load: ' + font.family)
                    }
                    return { httpCacheDisabled: true, fonts }
                })
                await phase('offline stop switching and local gym icon', async () => {
                    await selectStop(page, 'Vermilion City Gym')
                    await page.locator('[data-location-id="red-blue-vermilion-gym"]').waitFor({ state: 'visible' })
                    const icon = page.locator('main h2').locator('..').locator('img:visible')
                    await icon.waitFor({ state: 'visible' })
                    await icon.evaluate((image) => image.decode())
                    const image = await icon.evaluate((node) => ({ src: node.getAttribute('src'), width: node.naturalWidth, height: node.naturalHeight }))
                    assert.match(image.src, new RegExp('^' + GUIDE_BASE + '/_astro/gym\\.'))
                    assert.ok(image.width > 0 && image.height > 0, 'The local gym icon is not available offline')
                    return { image, dom: await guideDOM(page) }
                })

                await phase('offline optional detour and uncached sprite fallback', async () => {
                    await selectStop(page, 'Vermilion City & SS Anne')
                    const optional = page.locator('[data-optional-location="red-blue-vermilion-detours"]')
                    const detail = optional.locator('[data-location-id="red-blue-vermilion-detours"]')
                    await optional.waitFor({ state: 'visible' })
                    assert.equal(await detail.count(), 0, 'Closed detour should not mount its detail subtree')
                    await optional.locator(':scope > summary').click()
                    await detail.waitFor({ state: 'visible' })
                    await detail.getByLabel('Where are you exploring?').selectOption('digletts-cave')
                    const encounter = detail.locator('[data-encounter-area="digletts-cave"][data-encounter-version="red"]')
                    await encounter.waitFor({ state: 'visible' })
                    const card = encounter.locator('[data-guide-pokemon="51"]')
                    await card.scrollIntoViewIfNeeded()
                    assert.match(await card.innerText(), /Dugtrio/)
                    const sprite = card.locator('img')
                    const spriteURL = await sprite.getAttribute('src')
                    const wasCached = await page.evaluate(async (url) => Boolean(await caches.match(url)), spriteURL)
                    if (wasCached) throw new Error('Uncached-sprite fixture was already cached; cannot honestly claim a missing-image fallback check')
                    await page.waitForFunction((url) => [...document.querySelectorAll('[data-guide-pokemon="51"] img')].some((img) => img.getAttribute('src') === url && img.style.display === 'none' && img.nextElementSibling && getComputedStyle(img.nextElementSibling).display !== 'none'), spriteURL, { timeout })
                    assert.match(await card.innerText(), /Lv\. 29, 31/, 'Encounter text must remain readable without its sprite')
                    const openedDOM = await guideDOM(page)
                    await optional.locator(':scope > summary').click()
                    await detail.waitFor({ state: 'detached' })
                    return { missingSpritePath: new URL(spriteURL, options.origin).pathname, fallbackVisible: true, openedDOM, closedDOM: await guideDOM(page) }
                })
            } else {
                skipped('offline local fonts load without HTTP cache', 'Offline guide reload failed')
                skipped('offline stop switching and local gym icon', 'Offline guide reload failed')
                skipped('offline optional detour and uncached sprite fallback', 'Offline guide reload failed')
            }

            for (const suffix of ['', '/', '/index.html', '?offline-check=1', '/?offline-check=1', '/index.html?offline-check=1']) {
                const requestedPath = GUIDE_BASE + '/games/red-blue' + suffix
                await phase('offline direct guide URL ' + requestedPath, async () => {
                    const response = await page.goto(options.origin + requestedPath, { waitUntil: 'domcontentloaded' })
                    assert.ok(response?.ok(), 'Offline guide URL did not return a successful response')
                    return { requestedPath, ...(await assertGuide(page)) }
                })
            }

            for (const guide of ['gold-silver', 'ruby-sapphire', 'diamond-pearl']) {
                await phase('previously unvisited guide is precached: ' + guide, async () => {
                    const response = await page.goto(options.origin + GUIDE_BASE + '/games/' + guide + '/', { waitUntil: 'domcontentloaded' })
                    assert.ok(response?.ok())
                    return assertGuide(page, guide)
                })
            }

            await phase('visited detail document and local item image work offline', async () => {
                const response = await page.goto(options.origin + GUIDE_BASE + '/items/potion/', { waitUntil: 'domcontentloaded' })
                assert.ok(response?.ok())
                await page.getByRole('heading', { name: 'Potion', exact: true }).waitFor()
                assert.equal(await page.locator('[data-item="potion"]').count(), 1)
                return { title: await page.title(), imageRequestFixture: await localItemImage(page), scope: 'Static Potion description and a separately loaded local Super Rod image; live holder/API data and CDN fallback are outside this assertion.' }
            })

            for (const suffix of ['', '/']) {
                const requestedPath = GUIDE_BASE + '/games' + suffix
                await phase('offline games index redirect ' + requestedPath, async () => {
                    await page.goto(options.origin + requestedPath, { waitUntil: 'domcontentloaded' })
                    await page.waitForURL((url) => [GUIDE_BASE + '/games/red-blue', guidePath, guidePath + 'index.html'].includes(url.pathname), { timeout })
                    return { requestedPath, ...(await assertGuide(page)) }
                })
            }

            // /pokemon-basic (no slash) is outside this registration's scope.
            // Do not confuse a hosting redirect/HTTP-cache hit with SW support.
            skipped('offline slashless deployment root ' + GUIDE_BASE, 'Outside the ' + GUIDE_BASE + '/ worker scope; offline support is not promised')
            for (const suffix of ['/', '/index.html']) {
                const requestedPath = GUIDE_BASE + suffix
                await phase('offline homepage URL ' + requestedPath, async () => {
                    const response = await page.goto(options.origin + requestedPath, { waitUntil: 'domcontentloaded' })
                    assert.ok(response?.ok(), 'Offline homepage did not return a successful response')
                    assert.equal(await page.locator('[x-data="guide"]').count(), 0, 'Homepage must not return guide HTML')
                    assert.equal(await page.title(), 'PokeBasic — Pokédex & Type Chart')
                    await page.getByRole('heading', { name: 'Shortcuts', exact: true }).waitFor()
                    await page.getByRole('heading', { name: 'Site Updates', exact: true }).waitFor()
                    return { requestedPath, finalURL: page.url(), title: await page.title() }
                })
            }

            await phase('offline reads preserve saves and have no application errors', async () => {
                assert.deepEqual(await storageSnapshot(page), fixtures, 'Browsing/toggling must not alter the exact save-fixture bytes')
                assert.deepEqual(pageErrors, [], 'Unexpected application page errors')
                report.offlineCaches = await cacheSummary(page)
                return { fixtureKeysPreserved: Object.keys(fixtures).sort(), pageErrors }
            })

            await phase('unknown offline route is not replaced by homepage', async () => {
                const unknown = await context.newPage()
                try {
                    const requestedPath = GUIDE_BASE + '/__offline_check_missing_route__/'
                    let response
                    let navigationError
                    try { response = await unknown.goto(options.origin + requestedPath, { waitUntil: 'domcontentloaded', timeout }) }
                    catch (error) { navigationError = message(error).split('\n')[0] }
                    const evidence = {
                        requestedPath, finalURL: unknown.url(), status: response?.status() ?? null,
                        title: await unknown.title(), navigationError: navigationError ?? null,
                        guideRoots: await unknown.locator('[x-data="guide"]').count(),
                        homepageHeadings: await unknown.getByRole('heading', { name: 'Shortcuts', exact: true }).count(),
                    }
                    report.unknownRoute = evidence
                    assert.notEqual(evidence.title, 'PokeBasic — Pokédex & Type Chart', 'Unknown route incorrectly received the homepage fallback')
                    assert.equal(evidence.guideRoots, 0, 'Unknown route incorrectly received a cached guide')
                    assert.equal(evidence.homepageHeadings, 0, 'Unknown route incorrectly received homepage content')
                    assert.ok(navigationError || response?.status() >= 400, 'Unknown offline route must be unavailable or an explicit error response, not HTTP 200')
                    return evidence
                } finally { await unknown.close() }
            })
        } else skipped('warm offline checks', 'No activated app worker controls the guide; manual registration would mask the defect')

        await phase('cold uninstalled offline first use is not available', async () => {
            const cold = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' })
            try {
                await cold.setOffline(true)
                const coldPage = await cold.newPage()
                let navigationError
                try { await coldPage.goto(options.origin + guidePath, { waitUntil: 'domcontentloaded', timeout }) }
                catch (error) { navigationError = message(error) }
                assert.ok(navigationError, 'A truly new offline context unexpectedly loaded a never-installed guide')
                assert.equal(await coldPage.locator('[x-data="guide"]').count(), 0)
                return { expectedUnavailable: true, navigationError: navigationError.split('\n')[0], finalURL: coldPage.url() }
            } finally { await cold.close() }
        })
    }
} catch (error) {
    failureCount++
    report.phases.push({ name: 'harness setup or unexpected failure', status: 'failed', error: message(error) })
    console.error(message(error))
} finally {
    if (page && !page.isClosed()) {
        try { report.finalWorkers = await workerSnapshot(page) }
        catch (error) { report.finalWorkerSnapshotError = message(error) }
    }
    try { if (context) await context.close() }
    finally { if (browser) await browser.close() }
    report.finishedAt = new Date().toISOString()
    report.status = failureCount ? 'failed' : 'passed'
    report.failureCount = failureCount
    await saveReport(report, options.output, 'guide-offline')
}

if (failureCount) throw new Error('Guide offline check failed in ' + failureCount + ' phase(s); see the JSON report above.')
