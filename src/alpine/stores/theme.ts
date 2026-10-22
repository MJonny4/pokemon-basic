import Alpine from 'alpinejs'

interface ThemeStore {
    dark: boolean
    init(): void
    toggle(): void
    apply(): void
}

export function registerThemeStore(): void {
    const store: ThemeStore = {
        dark: false,
        init() {
            let saved: string | null = null
            try { saved = localStorage.getItem('pb_dark') } catch { /* Use the system theme when storage is blocked. */ }
            this.dark = saved !== null
                ? saved === 'true'
                : window.matchMedia('(prefers-color-scheme: dark)').matches
            this.apply()
        },
        toggle() {
            this.dark = !this.dark
            try { localStorage.setItem('pb_dark', String(this.dark)) } catch { /* Theme still works for this tab. */ }
            this.apply()
        },
        apply() {
            document.documentElement.classList.toggle('dark', this.dark)
        },
    }

    Alpine.store('theme', store)
}
