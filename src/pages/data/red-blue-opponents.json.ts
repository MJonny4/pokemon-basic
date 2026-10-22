import type { APIRoute } from 'astro'
import { GUIDE_REGISTRY } from '../../lib/data/guides/registry'
import { buildRedBlueOpponentManifest } from '../../lib/data/guides/red-blue/opponents'

export const prerender = true

export const GET: APIRoute = () => new Response(JSON.stringify(buildRedBlueOpponentManifest(GUIDE_REGISTRY[0])), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
})
