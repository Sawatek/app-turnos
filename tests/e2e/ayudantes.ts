// Ayudantes para los tests de punta a punta (navegador).
// - `test` extendido: vigila los errores de la página por defecto y falla el test si aparece alguno.
// - `vigilar(page)`: lo mismo para páginas de contextos creados a mano (browser.newContext()).
// - Pasos comunes de la demo del cliente (ingresar, reservar el próximo libre).
import { expect, test as base, type Page } from '@playwright/test'

export interface Vigilancia {
  /** Errores juntados hasta ahora (excepciones sin atrapar y console.error). */
  errores: string[]
  /** Errores de consola que se esperan en este test (por ejemplo, un 400/403 que la app muestra bien). */
  permitir: (patron: RegExp) => void
}

const vigiladas = new WeakMap<Page, Vigilancia>()

/** Empieza a juntar los errores de una página. */
export function vigilar(page: Page, nombre = 'página'): Vigilancia {
  const ya = vigiladas.get(page)
  if (ya) return ya
  const permitidos: RegExp[] = []
  const v: Vigilancia = { errores: [], permitir: (p) => void permitidos.push(p) }
  page.on('pageerror', (err) => v.errores.push(`[${nombre}] pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const texto = msg.text()
    if (permitidos.some((p) => p.test(texto))) return
    v.errores.push(`[${nombre}] console.error: ${texto}`)
  })
  vigiladas.set(page, v)
  return v
}

/** Falla si alguna de las páginas vigiladas tuvo errores. */
export function sinErrores(...vs: Vigilancia[]) {
  const todos = vs.flatMap((v) => v.errores)
  expect(todos, `Errores en el navegador:\n${todos.join('\n')}`).toEqual([])
}

export const test = base.extend<{ errores: Vigilancia }>({
  errores: [
    async ({ page }, usar) => {
      const v = vigilar(page, 'page')
      await usar(v)
      sinErrores(v)
    },
    { auto: true },
  ],
})

export { expect }

export const CLAVE_DEMO = 'sawatek-demo-v1'

/** Lee el estado de la demo guardado en localStorage. */
export async function estadoDemo(page: Page) {
  return page.evaluate((clave) => {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as { state: { desfase: number; negocios: Record<string, { turnos: { id: string; estado: string; propio?: boolean; senaPagada: number }[] }> } }).state : null
  }, CLAVE_DEMO)
}

/** Ingresa a la app del cliente demo con nombre + celular y el código de la notificación de WhatsApp. */
export async function ingresarCliente(page: Page, slug: string, nombre = 'Martina', sala?: string) {
  await page.goto(sala ? `/${slug}?sala=${sala}` : `/${slug}`)
  await page.getByLabel('Tu nombre').fill(nombre)
  await page.getByLabel('Tu celular').fill('1123456789')
  await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
  await page.getByRole('button', { name: 'Completar código' }).click()
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible()
}

/** Desde el inicio: reserva el "Próximo libre" pagando la seña y espera la pantalla de listo. */
export async function reservarProximoLibre(page: Page, nombre = 'Martina') {
  await expect(page.getByText('Próximo libre')).toBeVisible()
  await page.getByRole('button', { name: 'Reservar este' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await expect(hoja).toBeVisible()
  await hoja.getByRole('button', { name: /^Seguir/ }).click()
  await hoja.getByRole('button', { name: /^Pagar/ }).click()
  await expect(hoja.getByRole('heading', { name: `¡Listo, ${nombre}!` })).toBeVisible({ timeout: 10_000 })
  return hoja
}
