import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const GUIDE_BASE = '/pokemon-basic'

export function readOptions(argv = process.argv.slice(2)) {
    const options = { origin: 'http://127.0.0.1:4322', output: undefined, runs: 3, dist: path.resolve('dist') }
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--help') return { help: true }
        const key = { '--origin': 'origin', '--output': 'output', '--runs': 'runs', '--dist': 'dist' }[argv[i]]
        if (!key || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Unknown or missing argument: ' + argv[i])
        options[key] = key === 'runs' ? Number(argv[++i]) : argv[++i]
    }
    const url = new URL(options.origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) throw new Error('--origin must be an HTTP(S) origin, without a path, query or fragment')
    if (!Number.isSafeInteger(options.runs) || options.runs < 1 || options.runs > 20) throw new Error('--runs must be an integer between 1 and 20')
    return { ...options, origin: url.origin, dist: path.resolve(options.dist) }
}

export async function launchBrowser() {
    const moduleName = process.env.PLAYWRIGHT_MODULE
    let chromium
    try {
        ;({ chromium } = await import(moduleName && path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName || 'playwright-core'))
    } catch (cause) {
        throw new Error('Optional browser tooling not found. Install playwright-core outside runtime dependencies, or set PLAYWRIGHT_MODULE to its entry file.', { cause })
    }
    return chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
        env: { ...process.env, ...(process.env.CHROMIUM_LD_LIBRARY_PATH ? { LD_LIBRARY_PATH: process.env.CHROMIUM_LD_LIBRARY_PATH + ':' + (process.env.LD_LIBRARY_PATH || '') } : {}) },
    })
}

export async function assertProduction(origin) {
    const response = await fetch(origin + GUIDE_BASE + '/games/red-blue/')
    if (!response.ok) throw new Error('Production guide is unavailable: HTTP ' + response.status)
    const html = await response.text()
    if (html.includes('/@vite/client') || html.includes('astro-dev-toolbar')) throw new Error('Use a production build/preview, not bun run dev')
    if (!html.includes('data-game=') || !html.includes('Red')) throw new Error('Expected the built Red/Blue guide at the configured deployment base')
}

export async function ready(page, expectedGuide = 'red-blue') {
    await page.waitForFunction((guideId) => {
        const root = document.querySelector('[x-data="guide"]')
        if (!root || !window.Alpine || root.hasAttribute('x-cloak')) return false
        const data = Alpine.$data(root)
        return data.game?.id === guideId && data.activeStopId && root.querySelector('main h2')?.textContent?.trim() && root.querySelectorAll('aside nav button').length === data.game.stops.length
    }, expectedGuide)
}

export async function frames(page) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

export async function selectStop(page, name) {
    const nav = page.viewportSize().width < 1024 ? page.locator('.lg\\:hidden').filter({ hasText: 'Select Stop' }) : page.locator('aside')
    await nav.getByRole('button', { name, exact: false }).click()
    await frames(page)
}

export async function guideDOM(page) {
    return page.evaluate(() => {
        const root = document.querySelector('[x-data="guide"]')
        const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
        return {
            stopId: Alpine.$data(root).activeStopId,
            activeElements: root.querySelectorAll('*').length,
            richCards: root.querySelectorAll('[data-guide-pokemon]').length,
            locationIds: [...root.querySelectorAll('[data-location-id]')].map((node) => node.dataset.locationId),
            optionalIds: [...root.querySelectorAll('[data-optional-location]')].map((node) => node.dataset.optionalLocation),
            duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        }
    })
}

export async function saveReport(report, output, prefix) {
    const destination = path.resolve(output || path.join('artifacts/guide-browser', prefix + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json'))
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, JSON.stringify(report, null, 2) + '\n')
    console.log('Report: ' + destination)
    return destination
}
