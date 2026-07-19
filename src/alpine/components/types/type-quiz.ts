import Alpine from 'alpinejs'
import { typeListForGen, effectivenessAt } from '../../../lib/data/type-history'
import { typeBadge } from '../../../ui/badges'
import { loadRecords, saveRecord, type QuizRecord } from '../../../lib/quiz-records'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const ERA_LABELS: Record<number, string> = { 1: 'Gen I', 2: 'Gen II–V', 0: 'Gen VI+' }
const MULT_LABELS: Record<number, string> = { 0: '0×', 0.25: '¼×', 0.5: '½×', 1: '1×', 2: '2×', 4: '4×' }
const TIME_PER_Q = 15

interface Question {
    atk: string
    def: string[] // 1 = single defender, 2 = dual
    answer: number
}

export function registerTypeQuiz(): void {
    Alpine.data('typeQuiz', () => ({
        phase: 'setup' as 'setup' | 'playing' | 'done',
        era: 0, // 1 = Gen I, 2 = Gen II–V, 0 = Gen VI+ (same keys as the chart)
        length: 10,
        questions: [] as Question[],
        qIndex: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        answered: null as number | null,
        timedOut: false,
        timeLeft: TIME_PER_Q,
        timerId: 0,
        allRecords: {} as Record<string, QuizRecord[]>,
        lastRank: -1,

        eras: [1, 2, 0],
        lengths: [10, 20, 30],
        mults: [0, 0.25, 0.5, 1, 2, 4],
        maxTime: TIME_PER_Q,

        init() {
            this.allRecords = loadRecords()
        },
        destroy() {
            this.clearTimer()
        },

        // ── Run lifecycle ────────────────────────────────────────────────

        startRun() {
            const types = typeListForGen(this.era)
            const qs: Question[] = []
            let prevKey = ''
            while (qs.length < this.length) {
                const atk = types[Math.floor(Math.random() * types.length)]
                const def = [types[Math.floor(Math.random() * types.length)]]
                if (Math.random() < 0.5) {
                    const second = types[Math.floor(Math.random() * types.length)]
                    if (second !== def[0]) def.push(second)
                }
                const key = atk + '>' + [...def].sort().join(',')
                if (key === prevKey) continue
                prevKey = key
                const answer = def.reduce((m, d) => m * effectivenessAt(cap(atk), cap(d), this.era), 1)
                qs.push({ atk, def, answer })
            }
            this.questions = qs
            this.qIndex = 0
            this.score = 0
            this.streak = 0
            this.bestStreak = 0
            this.phase = 'playing'
            this.beginQuestion()
        },

        beginQuestion() {
            this.answered = null
            this.timedOut = false
            this.timeLeft = TIME_PER_Q
            this.clearTimer()
            this.timerId = window.setInterval(() => {
                this.timeLeft--
                if (this.timeLeft <= 0) this.timeUp()
            }, 1000)
        },

        pick(m: number) {
            if (this.answered !== null || this.timedOut) return
            this.clearTimer()
            this.answered = m
            if (m === this.current.answer) {
                this.score++
                this.streak++
                this.bestStreak = Math.max(this.bestStreak, this.streak)
            } else {
                this.streak = 0
            }
        },

        // 15s gone — counts as failed, exactly like a wrong pick
        timeUp() {
            this.clearTimer()
            this.timedOut = true
            this.streak = 0
        },

        next() {
            if (this.qIndex + 1 >= this.questions.length) return this.finish()
            this.qIndex++
            this.beginQuestion()
        },

        finish() {
            this.clearTimer()
            this.phase = 'done'
            const rec: QuizRecord = {
                date: new Date().toISOString(),
                era: this.era,
                score: this.score,
                total: this.questions.length,
                streak: this.bestStreak,
            }
            this.allRecords[this.era] = saveRecord(rec)
            this.lastRank = (this.allRecords[this.era] as QuizRecord[]).indexOf(rec)
        },

        quit() {
            // Abandon mid-run: nothing is saved
            this.clearTimer()
            this.phase = 'setup'
        },

        clearTimer() {
            if (this.timerId) {
                clearInterval(this.timerId)
                this.timerId = 0
            }
        },

        // ── Derived state / helpers ──────────────────────────────────────

        get current(): Question {
            return this.questions[this.qIndex] ?? { atk: 'normal', def: ['normal'], answer: 1 }
        },

        get revealed(): boolean {
            return this.answered !== null || this.timedOut
        },

        get correct(): boolean {
            return this.answered === this.current.answer
        },

        get records(): QuizRecord[] {
            return (this.allRecords[this.era] as QuizRecord[] | undefined) ?? []
        },

        get matchupHtml(): string {
            const q = this.current as Question
            return `${typeBadge(q.atk, 'md')}
                <span class="text-text-tertiary font-black text-lg mx-1">→</span>
                ${q.def.map((d) => typeBadge(d, 'md')).join('')}`
        },

        answerClass(m: number): string {
            if (!this.revealed) return 'border-border hover:border-action hover:text-action text-text-primary bg-bg-elevated'
            if (m === this.current.answer) return 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
            if (m === this.answered) return 'border-red-500 bg-red-500/15 text-red-500'
            return 'border-border-subtle text-text-tertiary opacity-40'
        },

        eraLabel(e: number): string { return ERA_LABELS[e] ?? '' },
        multLabel(m: number): string { return MULT_LABELS[m] ?? String(m) + '×' },
        pct(r: QuizRecord): string { return Math.round((r.score / r.total) * 100) + '%' },
        fmtDate(iso: string): string {
            return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        },
    }))
}
