import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production security headers live in ../vercel.json. `vite preview` applies
// the same ones (minus HSTS, which needs HTTPS) so they can be tested locally.
function productionHeaders() {
  try {
    const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
    const all = vercel.headers.find((h) => h.source === '/(.*)')?.headers || []
    return Object.fromEntries(all.filter((h) => h.key !== 'Strict-Transport-Security').map((h) => [h.key, h.value]))
  } catch {
    return {}
  }
}

const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // The app calls /api on its own origin (as in production); forward to the local API.
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 4173,
    headers: productionHeaders(),
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
})
