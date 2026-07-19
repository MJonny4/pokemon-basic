// Personal records for the /types matchup quiz — localStorage only, per
// browser. Keyed by era (the gen values the chart uses: 1 = Gen I,
// 2 = Gen II–V, 0 = Gen VI+), top 10 runs kept per era, best first.
const KEY = 'pb_type_quiz'
const MAX_PER_ERA = 10

export interface QuizRecord {
    date: string // ISO
    era: number // 1 | 2 | 0
    score: number
    total: number
    streak: number
}

export function loadRecords(): Record<string, QuizRecord[]> {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '{}')
    } catch {
        return {}
    }
}

/** Insert a finished run, keep each era's best 10 (by %, then score), persist. */
export function saveRecord(rec: QuizRecord): QuizRecord[] {
    const all = loadRecords()
    const list = [...(all[rec.era] ?? []), rec]
    list.sort((a, b) => b.score / b.total - a.score / a.total || b.score - a.score || b.streak - a.streak)
    all[rec.era] = list.slice(0, MAX_PER_ERA)
    try {
        localStorage.setItem(KEY, JSON.stringify(all))
    } catch {
        // storage full/blocked — the run still shows this session
    }
    return all[rec.era]
}
