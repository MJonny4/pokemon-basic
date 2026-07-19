import Alpine from 'alpinejs'

export function registerThemeStore(): void {
    Alpine.store('theme', {
        dark: false,
        init() {
            const saved = localStorage.getItem('pb_dark')
            this.dark = saved !== null
                ? saved === 'true'
                : window.matchMedia('(prefers-color-scheme: dark)').matches
            this.apply()
        },
        toggle() {
            this.dark = !this.dark
            localStorage.setItem('pb_dark', String(this.dark))
            this.apply()
        },
        apply() {
            document.documentElement.classList.toggle('dark', this.dark)
        },
    })
}
