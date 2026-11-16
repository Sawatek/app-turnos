import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Solo la lógica de src/. Los tests de tests/ son de Playwright (pnpm test:e2e).
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
