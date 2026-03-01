import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
    base: '/pokemon-basic/',
    plugins: [tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                battle: resolve(__dirname, 'battle.html'),
                speeds: resolve(__dirname, 'speeds.html'),
            },
        },
    },
})
