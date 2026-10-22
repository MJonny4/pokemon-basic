import { registerSW } from 'virtual:pwa-register'

// Astro needs an explicit virtual-module import to register the worker.
const notice = document.querySelector<HTMLElement>('[data-pwa-update]')
const reloadButton = document.querySelector<HTMLButtonElement>('[data-pwa-reload]')
const laterButton = document.querySelector<HTMLButtonElement>('[data-pwa-later]')

const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        if (notice) notice.hidden = false
    },
    onRegisterError(error) {
        // Reading/saving locally must continue if installation is unavailable.
        console.warn('Offline installation is unavailable.', error)
    },
})

laterButton?.addEventListener('click', () => {
    if (notice) notice.hidden = true
})

reloadButton?.addEventListener('click', async () => {
    reloadButton.disabled = true
    try {
        await updateSW(true)
    } catch (error) {
        reloadButton.disabled = false
        console.warn('The update could not be applied. Try reloading later.', error)
    }
})
