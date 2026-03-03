import Alpine from 'alpinejs'
import { gsap } from 'gsap'

export function registerModal(): void {
    Alpine.data('modal', () => ({
        open: false,
        activeTab: 'overview' as string,
        tabs: [
            { id: 'overview', label: '📊 Overview' },
            { id: 'defense', label: '🛡️ Defense' },
            { id: 'moves', label: '⚔️ Moves' },
            { id: 'trainer', label: '🎯 Trainer Tips' },
            { id: 'compare', label: '🔄 Compare' },
        ],
        moveFilter: 'all',
        moveSearch: '',
        moveFilters: [
            { id: 'all', label: 'All' },
            { id: 'damaging', label: 'Damaging' },
            { id: 'physical', label: 'Physical' },
            { id: 'special', label: 'Special' },
            { id: 'status', label: 'Status' },
            { id: 'egg', label: '🥚 Egg' },
            { id: 'tutor', label: '📚 Tutor' },
        ],

        init() {
            window.addEventListener('pokemon-search', () => {
                this.open = true
                this.activeTab = 'overview'
                this.moveFilter = 'all'
                this.moveSearch = ''
            })

            this.$watch('open', (val: boolean) => {
                if (val) {
                    // Set initial state before Alpine removes display:none
                    gsap.set('#modal-overlay', { opacity: 0 })
                    gsap.set('#modal-box', { y: 40, scale: 0.93, opacity: 0 })
                    this.$nextTick(() => {
                        gsap.killTweensOf(['#modal-overlay', '#modal-box'])
                        gsap.to('#modal-overlay', { opacity: 1, duration: 0.25, ease: 'power2.out' })
                        gsap.to('#modal-box', {
                            y: 0,
                            scale: 1,
                            opacity: 1,
                            duration: 0.38,
                            ease: 'back.out(1.6)',
                            clearProps: 'transform,opacity',
                        })
                    })
                }
            })
        },

        close() {
            gsap.killTweensOf(['#modal-overlay', '#modal-box'])
            const tl = gsap.timeline({ onComplete: () => { this.open = false } })
            tl.to('#modal-box', { y: 18, scale: 0.96, opacity: 0, duration: 0.18, ease: 'power2.in' }, 0)
            tl.to('#modal-overlay', { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
        },

        setTab(id: string) {
            this.activeTab = id
            this.$nextTick(() => {
                gsap.fromTo(
                    '#modal-panels',
                    { opacity: 0, y: 8 },
                    { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' },
                )
            })
        },

        setFilter(id: string) {
            this.moveFilter = id
            ;(window as any).rerenderMoves?.(id, this.moveSearch)
        },

        onMoveSearch() {
            ;(window as any).rerenderMoves?.(this.moveFilter, this.moveSearch)
        },
    }))
}
