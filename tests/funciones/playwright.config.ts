// Tests de las Edge Functions (fase 4) contra `supabase functions serve` y la Supabase LOCAL.
//
//   pnpm exec playwright test -c tests/funciones
//
// Levanta las funciones con el proveedor "consola" y secretos de mentira (ver entorno.ts). Si ya hay un
// `supabase functions serve` corriendo, lo reutiliza: tiene que tener esas mismas variables.
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
import { ENTORNO_FUNCIONES } from './entorno'

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

const archivoEnv = join(tmpdir(), 'sawatek-funciones-test.env')
writeFileSync(archivoEnv, Object.entries(ENTORNO_FUNCIONES).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../test-results/funciones',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  projects: [{ name: 'funciones' }],
  webServer: {
    command: `pnpm exec supabase functions serve --no-verify-jwt --env-file ${archivoEnv}`,
    // Sin parámetros responde 403: alcanza para saber que el edge runtime ya atiende.
    url: `${sb.API_URL}/functions/v1/whatsapp-webhook`,
    cwd: join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
    reuseExistingServer: true,
    timeout: 240_000,
    stdout: 'ignore',
  },
})
