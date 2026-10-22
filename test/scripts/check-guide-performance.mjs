import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { GUIDE_BASE, assertProduction, frames, guideDOM, launchBrowser, readOptions, ready, saveReport, selectStop } from './guide-browser-utils.mjs'

const PROFILES = [
    { id: 'desktop', viewport: { width: 1280, height: 900 }, cpuSlowdown: 1, network: null },
    { id: 'synthetic-mobile', viewport: { width: 390, height: 844 }, cpuSlowdown: 4, network: { latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 } },
]
const PRIMARY = '[data-location-id="red-blue-vermilion"]'
const OPTIONAL = '[data-optional-location="red-blue-vermilion-detours"]'
const DETAIL = '[data-location-id="red-blue-vermilion-detours"]'
const PRIMARY_TRAINERS = PRIMARY + ' [data-guide-trainers]'
const OPTIONAL_TRAINERS = DETAIL + ' [data-guide-trainers]'

function installProbe() {
    const probe = window.__guidePerformance = { readyAt: null, readyFrameAt: null, longTasks: [], longTaskSupported: PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false }
    if (probe.longTaskSupported) {
        probe.longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) probe.longTasks.push({ startTime: entry.startTime, duration: entry.duration, name: entry.name })
        })
        probe.longTaskObserver.observe({ type: 'longtask', buffered: true })
    }
    const check = () => {
        const root = document.querySelector('[x-data="guide"]')
        if (!root || !window.Alpine || root.hasAttribute('x-cloak')) return
        const data = window.Alpine.$data(root)
        if (data.game?.id !== 'red-blue' || data.activeStopId !== 'pallet-town' || root.querySelector('main h2')?.textContent?.trim() !== 'Pallet Town' || root.querySelectorAll('aside nav button').length !== data.game.stops.length) return
        probe.readyAt = performance.now()
        observer.disconnect()
        requestAnimationFrame(() => requestAnimationFrame(() => { probe.readyFrameAt = performance.now() }))
    }
    const observer = new MutationObserver(check)
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['x-cloak'] })
    document.addEventListener('DOMContentLoaded', check, { once: true })
    check()
}

function installSaveFixture() {
    if (sessionStorage.getItem('__guide-performance-fixture')) return
    localStorage.setItem('pb_dark', 'false')
    localStorage.setItem('pokebasic-guide-red-blue-progress', '[ "pallet-town", "vermilion-city", "gym-3-vermilion" ]')
    localStorage.setItem('pokebasic-guide-red-blue-starter', '{ "id": 4, "name": "Charmander", "type": "fire", "description": "Preserve exact saved bytes" }')
    localStorage.setItem('pokebasic-guide-gold-silver-progress', '[ "new-bark-town" ]')
    sessionStorage.setItem('__guide-performance-fixture', 'true')
}

async function staticBytes(dist) {
    const compression = { gzip: { implementation: 'node:zlib.gzipSync', level: 6 }, brotli: { implementation: 'node:zlib.brotliCompressSync', quality: 11, mode: 'text' } }
    const size = async (filename) => {
        const bytes = await readFile(filename)
        return { file: path.relative(dist, filename), raw: bytes.length, gzip: gzipSync(bytes, { level: compression.gzip.level }).length, brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT } }).length }
    }
    const scriptPaths = (await readdir(path.join(dist, '_astro'))).filter((file) => file.endsWith('.js'))
    const scripts = await Promise.all(scriptPaths.map(async (file) => ({ filename: path.join(dist, '_astro', file), bytes: (await readFile(path.join(dist, '_astro', file))).length })))
    scripts.sort((a, b) => b.bytes - a.bytes)
    return { compression, note: 'File compression estimates, not observed deployed encoding or transfer bytes. Node compression settings differ from earlier Bun-gzip estimates.', guide: await size(path.join(dist, 'games/red-blue/index.html')), largestJavaScript: scripts.length ? await size(scripts[0].filename) : null }
}

async function networkProbe(context, page, profile) {
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.setCacheDisabled', { cacheDisabled: false })
    await session.send('Network.setBlockedURLs', { urls: ['*://raw.githubusercontent.com/*', '*://pokeapi.co/*', '*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'] })
    await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown })
    if (profile.network) await session.send('Network.emulateNetworkConditions', { offline: false, ...profile.network, connectionType: 'cellular4g' })
    let requests = new Map()
    session.on('Network.requestWillBeSent', ({ requestId, request, type }) => requests.set(requestId, { url: request.url, type, status: null, encodedDataLength: null, fromDiskCache: false, fromServiceWorker: false }))
    session.on('Network.requestServedFromCache', ({ requestId }) => { const entry = requests.get(requestId); if (entry) entry.servedFromCache = true })
    session.on('Network.responseReceived', ({ requestId, response }) => {
        const entry = requests.get(requestId)
        if (entry) Object.assign(entry, { status: response.status, fromDiskCache: !!response.fromDiskCache, fromServiceWorker: !!response.fromServiceWorker, contentEncoding: Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-encoding')?.[1] ?? null, cacheControl: Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'cache-control')?.[1] ?? null })
    })
    session.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => { const entry = requests.get(requestId); if (entry) entry.encodedDataLength = encodedDataLength })
    session.on('Network.loadingFailed', ({ requestId, errorText }) => { const entry = requests.get(requestId); if (entry) entry.failure = errorText })
    return {
        reset() { requests = new Map() },
        snapshot(origin) {
            const observed = [...requests.values()]
            const sameOrigin = observed.filter((entry) => entry.url.startsWith(origin + '/'))
            return { note: 'CDP observations collected shortly after guide-ready frame confirmation; in-flight resources may have null lengths. Encoded lengths include protocol response accounting, not an estimate of compressed deployment size.', sameOriginRequests: sameOrigin, externalRequests: observed.filter((entry) => !entry.url.startsWith(origin + '/')), completedSameOriginEncodedBytes: sameOrigin.reduce((sum, entry) => sum + (entry.encodedDataLength ?? 0), 0) }
        },
    }
}

async function loadSample(page, network, options, state) {
    network.reset()
    const observedStart = performance.now()
    const response = state === 'cold' ? await page.goto(options.origin + GUIDE_BASE + '/games/red-blue/', { waitUntil: 'domcontentloaded' }) : await page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(response?.ok(), true, 'Guide navigation succeeds')
    await ready(page)
    await page.waitForFunction(() => Number.isFinite(window.__guidePerformance?.readyFrameAt))
    const automationObservedMs = performance.now() - observedStart
    const timing = await page.evaluate(() => {
        const probe = window.__guidePerformance
        for (const entry of probe.longTaskObserver?.takeRecords() ?? []) probe.longTasks.push({ startTime: entry.startTime, duration: entry.duration, name: entry.name })
        const navigation = performance.getEntriesByType('navigation')[0]
        const relevantTasks = probe.longTasks.filter((entry) => entry.startTime < probe.readyFrameAt)
        return {
            navigationToGuideReadyMs: probe.readyAt,
            navigationToReadyFrameOpportunityMs: probe.readyFrameAt,
            longTasks: probe.longTaskSupported ? { count: relevantTasks.length, totalMs: relevantTasks.reduce((sum, entry) => sum + entry.duration, 0), maxMs: Math.max(0, ...relevantTasks.map((entry) => entry.duration)), entries: relevantTasks } : { supported: false },
            navigation: navigation ? { type: navigation.type, responseStart: navigation.responseStart, responseEnd: navigation.responseEnd, domContentLoadedEventEnd: navigation.domContentLoadedEventEnd, loadEventEnd: navigation.loadEventEnd, transferSize: navigation.transferSize, encodedBodySize: navigation.encodedBodySize, decodedBodySize: navigation.decodedBodySize } : null,
        }
    })
    const dom = await guideDOM(page)
    assert.equal(dom.stopId, 'pallet-town')
    assert.deepEqual(dom.duplicateIds, [])
    assert.deepEqual(dom.locationIds, [])
    return { state, ...timing, automationObservedMs, dom, network: network.snapshot(options.origin) }
}

async function timedClick(page, locator, specification, label) {
    await locator.evaluate((node, spec) => {
        window.__guidePerformanceAction = {}
        const action = window.__guidePerformanceAction
        action.promise = new Promise((resolve, reject) => {
            node.addEventListener('click', (event) => {
                const started = performance.now()
                if (!event.isTrusted) return reject(new Error('Expected a trusted browser click'))
                const retained = (spec.detachSelectors ?? []).flatMap((selector) => [...document.querySelectorAll(selector)])
                let finishing = false
                const satisfies = () => {
                    if (spec.kind === 'stop') {
                        const root = document.querySelector('[x-data="guide"]')
                        if (window.Alpine.$data(root).activeStopId !== spec.stopId || !root.querySelector('main h2')?.textContent?.includes(spec.name)) return false
                        const locations = [...root.querySelectorAll('[data-location-id]')].map((entry) => entry.dataset.locationId).sort()
                        return JSON.stringify(locations) === JSON.stringify(spec.locationIds.slice().sort())
                    }
                    const details = document.querySelector(spec.selector)
                    if (!details || details.open !== spec.open) return false
                    if (spec.sections !== undefined && details.querySelectorAll(':scope > div > section').length !== spec.sections) return false
                    if (spec.optionalPresent !== undefined && !!details.querySelector('[data-location-id]') !== spec.optionalPresent) return false
                    return true
                }
                const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Action state timed out: ' + JSON.stringify(spec))) }, 30000)
                const check = () => {
                    if (finishing || !satisfies()) return
                    finishing = true
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        if (!satisfies()) { finishing = false; check(); return }
                        observer.disconnect()
                        clearTimeout(timeout)
                        resolve({ clickToStateAndFramesMs: performance.now() - started, removedNodes: retained.length, allRememberedNodesDisconnected: retained.every((entry) => !entry.isConnected) })
                    }))
                }
                const observer = new MutationObserver(check)
                observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['open'] })
                check()
            }, { capture: true, once: true })
        })
    }, specification)
    await locator.click()
    const timing = await page.evaluate(() => window.__guidePerformanceAction.promise)
    assert.equal(timing.allRememberedNodesDisconnected, true, label + ': previous nodes removed')
    const dom = await guideDOM(page)
    assert.deepEqual(dom.duplicateIds, [], label + ': unique light-DOM IDs')
    return { label, ...timing, dom }
}

async function interactionSamples(page) {
    // Establish the same opening state without including setup in action timings.
    await selectStop(page, 'Pallet Town')
    await frames(page)
    const originalSave = await page.evaluate(() => ({ ...localStorage }))
    const opening = await guideDOM(page)
    await page.evaluate(() => { window.__guidePerformance.interactionStartedAt = performance.now() })
    const results = []
    const assertShape = (actual, expected, label) => {
        assert.equal(actual.activeElements, expected.activeElements, label + ': mounted elements restored')
        assert.equal(actual.richCards, expected.richCards, label + ': mounted cards restored')
        assert.deepEqual(actual.locationIds, expected.locationIds, label + ': locations restored')
    }
    const stop = async (name, stopId, locationIds, label) => {
        const nav = page.viewportSize().width < 1024 ? page.locator('.lg\\:hidden').filter({ hasText: 'Select Stop' }) : page.locator('aside')
        const result = await timedClick(page, nav.getByRole('button', { name, exact: false }), { kind: 'stop', name, stopId, locationIds, detachSelectors: ['[data-location-id]'] }, label)
        results.push(result)
        return result.dom
    }
    const toggle = async (selector, open, label, extra = {}) => {
        const result = await timedClick(page, page.locator(selector).locator(':scope > summary'), { kind: 'details', selector, open, ...extra }, label)
        results.push(result)
        return result.dom
    }
    let closedBaseline
    for (let cycle = 1; cycle <= 2; cycle++) {
        const prefix = 'cycle-' + cycle + ':'
        await stop('Cerulean City Gym', 'gym-2-cerulean', ['red-blue-cerulean'], prefix + 'cerulean')
        const closed = await stop('Vermilion City & SS Anne', 'vermilion-city', ['red-blue-vermilion'], prefix + 'vermilion-optional-closed')
        if (closedBaseline) assertShape(closed, closedBaseline, prefix + 'navigation resets disclosure state')
        else closedBaseline = closed
        assert.equal(await page.locator(OPTIONAL).getAttribute('open'), null)
        assert.equal(await page.locator(DETAIL).count(), 0)
        await toggle(PRIMARY_TRAINERS, true, prefix + 'primary-trainers-open', { sections: 22 })
        assertShape(await toggle(PRIMARY_TRAINERS, false, prefix + 'primary-trainers-close', { sections: 0, detachSelectors: [PRIMARY_TRAINERS + ' > div'] }), closed, prefix + 'primary close')
        const optionalOpen = await toggle(OPTIONAL, true, prefix + 'optional-open', { optionalPresent: true })
        assert.deepEqual(optionalOpen.locationIds.slice().sort(), ['red-blue-vermilion', 'red-blue-vermilion-detours'])
        const optionalTrainers = await toggle(OPTIONAL_TRAINERS, true, prefix + 'optional-trainers-open', { sections: 10 })
        await toggle(PRIMARY_TRAINERS, true, prefix + 'both-trainer-lists-open', { sections: 22 })
        assertShape(await toggle(PRIMARY_TRAINERS, false, prefix + 'primary-close-optional-trainers-open', { sections: 0, detachSelectors: [PRIMARY_TRAINERS + ' > div'] }), optionalTrainers, prefix + 'both to optional trainers')
        assertShape(await toggle(OPTIONAL_TRAINERS, false, prefix + 'optional-trainers-close', { sections: 0, detachSelectors: [OPTIONAL_TRAINERS + ' > div'] }), optionalOpen, prefix + 'optional trainer close')
        assertShape(await toggle(OPTIONAL, false, prefix + 'optional-close', { optionalPresent: false, detachSelectors: [DETAIL] }), closed, prefix + 'optional close')
        assertShape(await stop('Pallet Town', 'pallet-town', [], prefix + 'return-opening'), opening, prefix + 'opening restored')
        assert.deepEqual(await page.evaluate(() => ({ ...localStorage })), originalSave, prefix + 'read/navigation/disclosure never writes saved bytes')
    }
    return results
}

function summarize(samples) {
    const stats = (values) => {
        if (!values.length) return null
        const sorted = values.slice().sort((a, b) => a - b)
        const midpoint = Math.floor(sorted.length / 2)
        return { samples: sorted.length, median: sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2, min: sorted[0], max: sorted.at(-1) }
    }
    return PROFILES.map((profile) => {
        const matching = samples.filter((sample) => sample.profile === profile.id)
        const loads = ['cold', 'warm'].map((state) => {
            const values = matching.map((sample) => sample.loads.find((load) => load.state === state)).filter(Boolean)
            return { state, navigationToGuideReadyMs: stats(values.map((load) => load.navigationToGuideReadyMs)), automationObservedMs: stats(values.map((load) => load.automationObservedMs)) }
        })
        const actions = matching.flatMap((sample) => sample.actions ?? [])
        const stages = [...new Set(actions.map((action) => action.label.split(':')[1]))]
        return { profile: profile.id, loads, clickToStateAndFramesMs: stats(actions.map((action) => action.clickToStateAndFramesMs)), actionStages: stages.map((stage) => ({ stage, clickToStateAndFramesMs: stats(actions.filter((action) => action.label.endsWith(':' + stage)).map((action) => action.clickToStateAndFramesMs)) })) }
    })
}

const report = {
    kind: 'guide-performance', schemaVersion: 1, startedAt: new Date().toISOString(), status: 'running',
    runtime: { node: process.version, platform: process.platform, architecture: process.arch }, profiles: PROFILES, samples: [],
    methodology: {
        load: 'Fresh isolated context per cold run; reload same page immediately for warm run. SW blocked, HTTP cache enabled. Cold context does not flush OS/DNS/browser-process caches. Warm means repeat reload; actual HTTP reuse depends on server headers and is reported, not assumed.',
        ready: 'In-page timestamp when the Red/Blue guide is uncloaked, opening heading is rendered and all sidebar stop buttons are hydrated. A separate timestamp waits for two animation frames. Automation-observed elapsed time includes driver waits and is explicitly separate.',
        actions: 'Trusted click capture through expected DOM state and two browser animation frames; no Node polling in elapsed action timing. This is a render opportunity, not a guaranteed paint, INP, complete smooth scrolling or finished transitions.',
        external: 'Known external sprite/API/font hosts blocked through CDP, without Playwright route interception that would disable HTTP caching. Measures text/UI with missing-image fallbacks, not network image availability.',
        fixture: 'Isolated contexts seed Charmander and three completed Red/Blue stops using intentionally spaced legacy save bytes, plus a Gold/Silver progress sentinel. This stabilizes mounted-card counts and tests read-only save preservation; it is not a first-ever/no-starter user profile.',
        longTasks: 'Buffered Chromium long-task observer; >=50ms main-thread tasks intersecting startup or the interaction suite. Does not measure worker work, prove absence of shorter blocking work, or constitute a complete responsiveness audit.',
        dom: 'Mounted light-DOM nodes/cards exclude inert template contents but include x-show-hidden cards. Repeated node detachment/count restoration checks are not heap-leak proof.',
        interpretation: 'All timings are local diagnostics, not flaky hard SLAs or real-device results. Report compression estimates separately from observed navigation/CDP resource sizes. No deployment, browser profile, or real user saves are modified.',
    },
}
let options
let browser
try {
    options = readOptions()
    if (options.help) {
        console.log('Usage: node test/scripts/check-guide-performance.mjs [--origin http://127.0.0.1:4322] [--runs 3] [--dist dist] [--output report.json]\nUses optional PLAYWRIGHT_MODULE, CHROMIUM_EXECUTABLE and CHROMIUM_LD_LIBRARY_PATH. Build and start a production preview first; this script does not manage servers.')
    } else {
        report.options = options
        report.staticBytes = await staticBytes(options.dist)
        await assertProduction(options.origin)
        browser = await launchBrowser()
        report.browser = browser.version()
        for (const profile of PROFILES) for (let run = 1; run <= options.runs; run++) {
            const context = await browser.newContext({ viewport: profile.viewport, serviceWorkers: 'block', deviceScaleFactor: 1, isMobile: profile.id === 'synthetic-mobile', hasTouch: profile.id === 'synthetic-mobile', colorScheme: 'light' })
            const sample = { profile: profile.id, run, loads: [], actions: [] }
            report.samples.push(sample)
            try {
                await context.addInitScript(installSaveFixture)
                await context.addInitScript(installProbe)
                const page = await context.newPage()
                page.setDefaultTimeout(30000)
                page.setDefaultNavigationTimeout(60000)
                const errors = []
                page.on('pageerror', (error) => errors.push(error.message))
                const network = await networkProbe(context, page, profile)
                sample.loads.push(await loadSample(page, network, options, 'cold'))
                sample.loads.push(await loadSample(page, network, options, 'warm'))
                assert.equal(sample.loads[0].dom.activeElements, sample.loads[1].dom.activeElements, 'Cold/warm opening DOM matches')
                sample.actions = await interactionSamples(page)
                sample.interactionLongTasks = await page.evaluate(() => {
                    const probe = window.__guidePerformance
                    if (!probe.longTaskSupported) return { supported: false }
                    for (const entry of probe.longTaskObserver.takeRecords()) probe.longTasks.push({ startTime: entry.startTime, duration: entry.duration, name: entry.name })
                    const entries = probe.longTasks.filter((entry) => entry.startTime >= probe.interactionStartedAt)
                    return { count: entries.length, totalMs: entries.reduce((sum, entry) => sum + entry.duration, 0), maxMs: Math.max(0, ...entries.map((entry) => entry.duration)), entries }
                })
                assert.deepEqual(errors, [], 'No application page errors')
                sample.pageErrors = errors
                sample.status = 'passed'
                console.log('PASS ' + profile.id + ' run ' + run + ': cold/warm readiness, ' + sample.actions.length + ' lifecycle actions, exact save bytes and unique IDs')
            } finally { await context.close() }
        }
        report.summary = summarize(report.samples)
        report.status = 'passed'
        console.log(JSON.stringify(report.summary, null, 2))
    }
} catch (error) {
    report.status = 'failed'
    report.error = { message: error.message, stack: error.stack }
    console.error(error.stack ?? error)
    process.exitCode = 1
} finally {
    if (browser) {
        try { await browser.close() } catch (error) {
            report.status = 'failed'
            report.cleanupError = error.message
            process.exitCode = 1
        }
    }
    if (!options?.help) {
        report.summary = summarize(report.samples)
        report.completedAt = new Date().toISOString()
        await saveReport(report, options?.output, 'performance')
    }
}
