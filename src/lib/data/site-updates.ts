// Manually maintained changelog shown on the home page news hub.
// Add a new entry at the top whenever something ships. Dates are ISO (yyyy-mm-dd).

export interface SiteUpdate {
    date: string
    title: string
    note?: string
}

export const SITE_UPDATES: SiteUpdate[] = [
    {
        date: '2026-10-22',
        title: 'More reliable franchise news',
        note: 'Bulbanews and PokémonDB share the first headlines, with clearly dated Bulbanews headlines during feed outages',
    },
    {
        date: '2026-10-22',
        title: 'Red/Blue main-story guide',
        note: 'All 24 stops now cover Pallet Town through the Hall of Fame, with source-checked directions and major battles',
    },
    {
        date: '2026-10-22',
        title: 'Guide progress and backups',
        note: 'Track Red/Blue steps, items and Pokémon; preview, download and restore guide saves',
    },
    {
        date: '2026-10-22',
        title: 'Team Lab tools',
        note: 'Compare Red/Blue opponents, exchange Showdown sets, and save or restore named teams',
    },
    {
        date: '2026-10-22',
        title: 'Offline use and safer updates',
        note: 'Installed app pages and previously visited content work offline; new versions wait for you to reload',
    },
    {
        date: '2026-07-17',
        title: 'Pokédex pages',
        note: 'Per-game dex listings, Shiny dex, and full detail pages for all 1025 Pokémon with gen-accurate learnsets',
    },
    {
        date: '2026-07-17',
        title: 'Move & Item Dex',
        note: '919 moves and 2,200+ items with filters, detail pages, and cross-gen move history',
    },
    {
        date: '2026-07-16',
        title: 'News hub homepage',
        note: 'Franchise news from Bulbanews and PokémonDB, checked daily during the build',
    },
    {
        date: '2026-07-16',
        title: 'New navigation & routes',
        note: 'Data dropdown, /types page, per-game guide routes, mobile menu',
    },
    {
        date: '2026-07-08',
        title: 'Dark mode',
        note: 'OLED true-black theme across every page, including the Pokédex modal',
    },
    {
        date: '2026-06-30',
        title: 'Design system overhaul',
        note: 'Geist fonts, Apple-inspired palette, design tokens on all pages',
    },
    {
        date: '2026-05-09',
        title: 'Diamond/Pearl guide',
        note: 'Game guides now cover Gen I–IV with completeness tracking',
    },
    {
        date: '2026-05-09',
        title: 'Ruby/Sapphire guide',
    },
]

export function formatUpdateDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
