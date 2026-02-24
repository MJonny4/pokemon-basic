import Alpine from 'alpinejs'

export function registerModal(): void {
    Alpine.data('modal', () => ({
        open: false,
        activeTab: 'overview' as string,
        tabs: [
            { id: 'overview', label: '📊 Overview' },
            { id: 'defense', label: '🛡️ Defense' },
            { id: 'moves', label: '⚔️ Moves' },
            { id: 'trainer', label: '🎯 Trainer Tips' },
        ],
        moveFilter: 'all',
        moveSearch: '',
        moveFilters: [
            { id: 'all', label: 'All' },
            { id: 'damaging', label: 'Damaging' },
            { id: 'physical', label: 'Physical' },
            { id: 'special', label: 'Special' },
            { id: 'status', label: 'Status' },
        ],

        init() {
            window.addEventListener('pokemon-search', () => {
                this.open = true
                this.activeTab = 'overview'
                this.moveFilter = 'all'
                this.moveSearch = ''
            })
        },

        close() {
            this.open = false
        },
        setTab(id: string) {
            this.activeTab = id
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
