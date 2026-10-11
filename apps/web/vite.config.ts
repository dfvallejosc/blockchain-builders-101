import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Under Vitest react-router loads as both CJS and ESM, giving two router contexts; point tests at the ESM build.
    alias: [
      {
        find: /^react-router$/,
        replacement: path.resolve(import.meta.dirname, 'node_modules/react-router/dist/development/index.mjs'),
      },
      {
        find: /^react-router\/dom$/,
        replacement: path.resolve(import.meta.dirname, 'node_modules/react-router/dist/development/dom-export.mjs'),
      },
    ],
  },
})
