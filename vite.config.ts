import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
    plugins: [tailwindcss()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                stats: resolve(__dirname, 'stats.html'),
                team: resolve(__dirname, 'team.html'),
            },
        },
    },
})
