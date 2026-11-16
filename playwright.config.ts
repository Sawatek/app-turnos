// Tests con Playwright contra una copia LOCAL de Supabase (Docker), nunca contra la base real.
//
//   pnpm db:local      → levanta Supabase local y aplica las migraciones
//   pnpm test:e2e      → corre todos los tests (permisos + navegador)
//
// Las claves de la copia local se leen de `supabase status` (son las de desarrollo, iguales en todas las compus).
import { execSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

function supabaseLocal() {
  try {
    const salida = execSync('pnpm exec supabase status -o json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString()
    return JSON.parse(salida.slice(salida.indexOf('{'))) as { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }
  } catch {
    throw new Error('Supabase local no está corriendo. Ejecutá: pnpm db:local')
  }
}

const sb = supabaseLocal()
process.env.SB_URL = sb.API_URL
process.env.SB_PUBLISHABLE_KEY = sb.PUBLISHABLE_KEY
process.env.SB_SECRET_KEY = sb.SECRET_KEY

const PUERTO = 5190

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: { trace: 'retain-on-failure' },
  projects: [
    // Reglas de la base, rol por rol (sin navegador).
    { name: 'permisos', testDir: 'tests/permisos' },
    // La app en el navegador, conectada a la Supabase local.
    {
      name: 'e2e',
      testDir: 'tests/e2e',
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PUERTO}` },
    },
  ],
  webServer: {
    command: `pnpm exec vite --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    // VITE_* tiene prioridad sobre NEXT_PUBLIC_* de .env.local: la app de los tests usa la base local.
    env: { VITE_SUPABASE_URL: sb.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: sb.PUBLISHABLE_KEY },
  },
})
