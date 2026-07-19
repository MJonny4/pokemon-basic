import Alpine from 'alpinejs'

export function registerNavMenu(): void {
    Alpine.data('navMenu', () => ({
        mobileOpen: false,
        dataOpen: false,

        toggleMobile() {
            this.mobileOpen = !this.mobileOpen
            this.dataOpen = false
        },

        toggleData() {
            this.dataOpen = !this.dataOpen
            this.mobileOpen = false
        },

        closeAll() {
            this.mobileOpen = false
            this.dataOpen = false
        },
    }))
}