import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import {
    GUIDE_BASE, launchBrowser, assertProduction, ready, frames, saveReport,
} from './guide-browser-utils.mjs'

function optionsFrom(argv) {
    const options = { dist: path.resolve('dist'), output: undefined }
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--help') return { help: true }
        const key = { '--dist': 'dist', '--output': 'output' }[argv[i]]
        if (!key || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Unknown or missing argument: ' + argv[i])
        options[key] = argv[++i]
    }
    return { ...options, dist: path.resolve(options.dist) }
}

const options = optionsFrom(process.argv.slice(2))
if (options.help) {
    console.log('Usage: node test/scripts/check-guide-update.mjs [--dist dist] [--output report.json]')
    console.log('Uses its own temporary loopback HTTP port and fresh browser context. Does not build or change dist.')
    process.exit(0)
}

const timeout = 20_000
const guidePath = GUIDE_BASE + '/games/red-blue/'
const fixtures = {
    pb_dark: 'false',
    'pokebasic-guide-red-blue-progress': '[ "pallet-town", "vermilion-city", "gym-3-vermilion" ]',
    'pokebasic-guide-red-blue-starter': JSON.stringify({ id: 4, name: 'Charmander', type: 'fire', description: 'Public update-check fixture; preserve raw bytes.' }),
    'pokebasic-guide-gold-silver-progress': '[ "new-bark-town" ]',
}
const report = {
    schemaVersion: 1,
    kind: 'guide-update',
    startedAt: new Date().toISOString(),
    deploymentBase: GUIDE_BASE,
    dist: options.dist,
    isolation: 'Owned ephemeral loopback server, in-memory sw.js comment changes, fresh nonpersistent browser context, public save fixtures only. No dist edits, manual worker registration, direct skipWaiting call, or test-side update-panel manipulation.',
    limitations: [
        'Simulates a byte-changed service worker with the same precache manifest, not a real new content/asset build or hosting deployment.',
        'Local HTTP server uses no-cache headers; does not certify GitHub Pages/CDN update propagation or cross-version asset atomicity.',
        'Checks explicit update acceptance, deferral and exact persisted save bytes; does not promise recovery of unsaved state after the user accepts a reload.',
        'No browser storage eviction, quota failure, installation failure or unsupported-browser simulation.',
    ],
    phases: [],
}
const pageErrors = []
const workerRequests = []
let servedVersion = 1
let server
let browser
let context
let failed = false

function message(error) {
    return error instanceof Error ? error.message : String(error)
}

async function phase(name, action) {
    const start = performance.now()
    try {
        const evidence = await action()
        report.phases.push({ name, status: 'passed', durationMs: Math.round(performance.now() - start), ...(evidence === undefined ? {} : { evidence }) })
        console.log('PASS ' + name)
        return evidence
    } catch (error) {
        report.phases.push({ name, status: 'failed', durationMs: Math.round(performance.now() - start), error: message(error) })
        throw error
    }
}

async function startServer() {
    // Only sw.js's response body changes. Every other response reads the actual
    // production files, so the app must register and update its own real worker.
    const workerSource = await readFile(path.join(options.dist, 'sw.js'), 'utf8')
    const types = {
        '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
    }
    server = createServer(async (request, response) => {
        try {
            if (!['GET', 'HEAD'].includes(request.method)) {
                response.writeHead(405).end()
                return
            }
            const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
            if (pathname === GUIDE_BASE) {
                response.writeHead(302, { location: GUIDE_BASE + '/' }).end()
                return
            }
            if (!pathname.startsWith(GUIDE_BASE + '/')) {
                response.writeHead(404).end()
                return
            }
            const relative = pathname.slice(GUIDE_BASE.length + 1)
            let file = path.resolve(options.dist, relative || '.')
            if (file !== options.dist && !file.startsWith(options.dist + path.sep)) {
                response.writeHead(403).end()
                return
            }
            if (relative === 'sw.js') {
                workerRequests.push({ version: servedVersion, at: new Date().toISOString() })
                const body = workerSource + '\n// guide-update-check-version: ' + servedVersion + '\n'
                response.writeHead(200, { 'content-type': types['.js'], 'cache-control': 'no-cache', 'content-length': Buffer.byteLength(body) })
                response.end(request.method === 'HEAD' ? undefined : body)
                return
            }
            if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
            const body = await readFile(file)
            response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache', 'content-length': body.length })
            response.end(request.method === 'HEAD' ? undefined : body)
        } catch (error) {
            response.writeHead(error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 404 : error instanceof URIError ? 400 : 500).end()
        }
    })
    await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
    })
    return 'http://127.0.0.1:' + server.address().port
}

async function storageSnapshot(page) {
    return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])))
}

async function workerSnapshot(page) {
    return page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const worker = (value) => value ? { scriptURL: value.scriptURL, state: value.state } : null
        return {
            controller: worker(navigator.serviceWorker.controller),
            registrations: registrations.map((registration) => ({ scope: registration.scope, active: worker(registration.active), waiting: worker(registration.waiting), installing: worker(registration.installing) })),
        }
    })
}

async function marker(page, value) {
    await page.evaluate((text) => {
        const node = document.createElement('div')
        node.dataset.guideUpdateUnsaved = ''
        node.textContent = text
        document.body.appendChild(node)
    }, value)
}

async function assertMarker(page, value) {
    assert.equal(await page.locator('[data-guide-update-unsaved]').textContent(), value, 'An unsolicited reload discarded the unsaved DOM marker')
}

function observeErrors(page) {
    page.on('pageerror', (error) => pageErrors.push(message(error)))
}

try {
    report.origin = await phase('owned isolated production server', async () => {
        const origin = await startServer()
        await assertProduction(origin)
        return origin
    })
    browser = await launchBrowser()
    context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' })
    context.setDefaultTimeout(timeout)
    context.setDefaultNavigationTimeout(timeout)
    const first = await context.newPage()
    observeErrors(first)

    await phase('application installs and controls its own worker', async () => {
        const response = await first.goto(report.origin + guidePath, { waitUntil: 'domcontentloaded' })
        assert.ok(response?.ok(), 'Initial guide navigation failed')
        await ready(first)
        await first.waitForFunction(async () => 'serviceWorker' in navigator && (await navigator.serviceWorker.getRegistrations()).some((registration) => registration.active?.state === 'activated'), null, { timeout: 60_000 })
        await first.reload({ waitUntil: 'domcontentloaded' })
        await ready(first)
        await first.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated')
        const snapshot = await workerSnapshot(first)
        assert.equal(snapshot.registrations.length, 1, 'Expected one isolated app registration')
        assert.equal(snapshot.registrations[0].scope, report.origin + GUIDE_BASE + '/')
        assert.equal(snapshot.controller.scriptURL, report.origin + GUIDE_BASE + '/sw.js')
        assert.equal(snapshot.registrations[0].waiting, null, 'The initial install unexpectedly has a waiting update')
        assert.equal(await first.locator('[data-pwa-update]:visible').count(), 0, 'A first install must not ask to reload')
        return snapshot
    })

    const initialMarker = 'Unsaved first-tab state must survive notification and Later.'
    await phase('visited detail HTML is cached before the update', async () => {
        const detail = await context.newPage()
        try {
            const url = report.origin + GUIDE_BASE + '/items/potion/'
            await detail.goto(url, { waitUntil: 'domcontentloaded' })
            await detail.getByRole('heading', { name: 'Potion', exact: true }).waitFor()
            await detail.waitForFunction(async (target) => Boolean(await (await caches.open('pokebasic-pages-v1')).match(target)), url)
            return { path: new URL(url).pathname }
        } finally { await detail.close() }
    })
    await phase('public save bytes and unsaved marker seeded', async () => {
        await first.evaluate((values) => {
            localStorage.clear()
            for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value)
        }, fixtures)
        await first.reload({ waitUntil: 'domcontentloaded' })
        await ready(first)
        await frames(first)
        assert.deepEqual(await storageSnapshot(first), fixtures, 'Reading public save fixtures rewrote their bytes')
        await marker(first, initialMarker)
        return { fixtureKeys: Object.keys(fixtures).sort(), marker: initialMarker }
    })

    await phase('changed worker waits and offers a non-forced update', async () => {
        servedVersion = 2
        await first.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration()
            if (!registration) throw new Error('App registration disappeared')
            await registration.update()
        })
        await first.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === 'installed')
        await first.locator('[data-pwa-update]').waitFor({ state: 'visible' })
        await assertMarker(first, initialMarker)
        assert.deepEqual(await storageSnapshot(first), fixtures, 'Update notification changed saved values')
        assert.ok(workerRequests.some((request) => request.version === 2), 'The browser did not fetch the changed worker source')
        return workerSnapshot(first)
    })

    await phase('Later keeps this document and the old worker active', async () => {
        await first.locator('[data-pwa-later]').click()
        await first.locator('[data-pwa-update]').waitFor({ state: 'hidden' })
        await frames(first)
        await assertMarker(first, initialMarker)
        assert.deepEqual(await storageSnapshot(first), fixtures, 'Deferring an update changed saved values')
        const snapshot = await workerSnapshot(first)
        assert.equal(snapshot.registrations[0].waiting?.state, 'installed', 'Later must leave the update waiting while the controlled tab remains open')
        return snapshot
    })

    // Keep the first controlled tab open. Otherwise the waiting worker could
    // naturally activate between tabs and conceal the existing-waiting path.
    const second = await context.newPage()
    await second.setViewportSize({ width: 390, height: 844 })
    observeErrors(second)
    const reloadMarker = 'Unsaved second-tab marker disappears only after accepting Reload.'
    await phase('a new tab exposes the already-waiting update', async () => {
        const response = await second.goto(report.origin + guidePath, { waitUntil: 'domcontentloaded' })
        assert.ok(response?.ok(), 'Second guide navigation failed')
        await ready(second)
        await second.locator('[data-pwa-update]').waitFor({ state: 'visible' })
        await marker(second, reloadMarker)
        await assertMarker(first, initialMarker)
        assert.deepEqual(await storageSnapshot(second), fixtures, 'Opening a tab changed saved values')
        const snapshot = await workerSnapshot(second)
        assert.equal(snapshot.registrations[0].waiting?.state, 'installed')
        const panel = second.locator('[data-pwa-update]')
        const bounds = await panel.boundingBox()
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Update notice must fit the mobile viewport')
        const screenshot = path.resolve(options.output ? options.output + '.png' : 'artifacts/guide-browser/update-prompt.png')
        await mkdir(path.dirname(screenshot), { recursive: true })
        await second.screenshot({ path: screenshot })
        return { ...snapshot, mobilePanelBounds: bounds, screenshot }
    })

    await phase('explicit Reload activates the update and preserves exact saves', async () => {
        await assertMarker(second, reloadMarker)
        const navigated = second.waitForEvent('domcontentloaded', { timeout })
        await second.locator('[data-pwa-reload]').click()
        await navigated
        await ready(second)
        await second.waitForFunction(async () => {
            const registration = await navigator.serviceWorker.getRegistration()
            return registration?.active?.state === 'activated' && !registration.waiting && navigator.serviceWorker.controller?.state === 'activated'
        })
        await frames(second)
        assert.equal(await second.locator('[data-guide-update-unsaved]').count(), 0, 'Reload acceptance did not actually replace the document')
        assert.equal(await second.locator('[data-pwa-update]:visible').count(), 0, 'The accepted update still asks for another reload')
        assert.deepEqual(await storageSnapshot(second), fixtures, 'Accepting/reloading rewrote saved values')
        await second.waitForFunction(async () => !(await caches.keys()).includes('pokebasic-pages-v1'))
        return { ...(await workerSnapshot(second)), markerRemovedAfterAcceptance: true, fixtureKeysPreserved: Object.keys(fixtures).sort() }
    })

    await phase('no unexpected application errors', async () => {
        assert.deepEqual(pageErrors, [])
        return { pageErrors }
    })
} catch (error) {
    failed = true
    report.error = message(error)
    console.error('FAIL guide-update: ' + message(error))
} finally {
    for (const [name, close] of [
        ['browser context', () => context?.close()],
        ['browser', () => browser?.close()],
        ['owned loopback server', () => server && new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve())
            server.closeAllConnections()
        })],
    ]) {
        try { await close() }
        catch (error) {
            failed = true
            report.phases.push({ name: 'cleanup ' + name, status: 'failed', error: message(error) })
        }
    }
    report.finishedAt = new Date().toISOString()
    report.status = failed ? 'failed' : 'passed'
    report.workerRequests = workerRequests
    report.pageErrors = pageErrors
    try { await saveReport(report, options.output, 'update') }
    catch (error) {
        failed = true
        console.error('FAIL writing guide-update report: ' + message(error))
    }
    if (failed) process.exitCode = 1
}
