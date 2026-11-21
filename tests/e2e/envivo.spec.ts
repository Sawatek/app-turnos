// Demo EN VIVO entre dos dispositivos: dos contextos de navegador distintos (no comparten localStorage),
// así que los cambios solo pueden viajar por Supabase Realtime.
//
// El canal es por SALA (`demo:<slug>:<sala>`): solo se conectan los dispositivos que entraron con el mismo
// código de presentación. Cada test usa una sala propia, así que pueden correr en paralelo sobre la misma demo.
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { estadoDemo, expect, ingresarCliente, reservarProximoLibre, sinErrores, test, vigilar } from './ayudantes'

const HORA = 3_600_000
const nuevaSala = () => Math.random().toString(36).slice(2, 8)

async function abrir(browser: Browser, contextos: BrowserContext[], nombre: string) {
  const ctx = await browser.newContext()
  contextos.push(ctx)
  const page = await ctx.newPage()
  return { page, v: vigilar(page, nombre) }
}

/** Abre la ruta y espera a que la página abra el socket de Realtime y se una al canal. */
async function irConCanal(page: Page, ruta: string) {
  const socket = page.waitForEvent('websocket', { predicate: (ws) => ws.url().includes('/realtime/'), timeout: 15_000 })
  await page.goto(ruta)
  await socket
  await page.waitForTimeout(1500) // el join al canal tarda un instante después de abrir el socket
}

test.describe('Tiempo real entre dispositivos', () => {
  const contextos: BrowserContext[] = []
  test.afterEach(async () => {
    await Promise.all(contextos.splice(0).map((c) => c.close()))
  })

  test('el panel del dueño ve "Nuevo turno desde la app" cuando el cliente de la MISMA sala reserva', async ({ browser }) => {
    const sala = nuevaSala()
    const panel = await abrir(browser, contextos, 'panel')
    const cliente = await abrir(browser, contextos, 'cliente')

    await irConCanal(panel.page, `/quetul/panel?sala=${sala}`)
    await expect(panel.page.getByText('Panel del dueño', { exact: false })).toBeVisible()

    const nombre = `Lucia${Math.random().toString(36).slice(2, 7)}`
    await ingresarCliente(cliente.page, 'quetul', nombre, sala)
    await reservarProximoLibre(cliente.page, nombre)
    const delCliente = (await estadoDemo(cliente.page))!.negocios.quetul!.turnos.filter((t) => t.propio)
    expect(delCliente).toHaveLength(1)

    // El aviso dura 9 s en pantalla: se revisa apenas aparece.
    const aviso = panel.page.locator('p', { hasText: 'Nuevo turno desde la app:' })
    await expect(aviso).toBeVisible({ timeout: 10_000 })
    await expect(aviso).toContainText(nombre)
    await expect(aviso).toContainText(/seña \$\s?[\d.]+ cobrada/)

    // El turno quedó en la copia del panel como llegado desde la app (no propio).
    const estado = await estadoDemo(panel.page)
    const llegado = (estado!.negocios.quetul!.turnos as { id: string; deLaApp?: boolean; propio?: boolean }[]).find((t) => t.id === delCliente[0]!.id)
    expect(llegado).toMatchObject({ deLaApp: true, propio: false, estado: 'pendiente' })

    sinErrores(panel.v, cliente.v)
  })

  test('dos presentaciones (salas distintas) de la misma demo NO se ven entre sí', async ({ browser }) => {
    const panel = await abrir(browser, contextos, 'panel sala 1')
    const otro = await abrir(browser, contextos, 'cliente sala 2')
    const sinSala = await abrir(browser, contextos, 'cliente sin sala')

    await irConCanal(panel.page, `/quetul/panel?sala=${nuevaSala()}`)

    await ingresarCliente(otro.page, 'quetul', 'Ajena', nuevaSala())
    await reservarProximoLibre(otro.page, 'Ajena')
    await ingresarCliente(sinSala.page, 'quetul', 'Suelta')
    await reservarProximoLibre(sinSala.page, 'Suelta')

    // Le damos tiempo de sobra para que llegue algo (si se filtrara, llega en milisegundos).
    await panel.page.waitForTimeout(4000)
    await expect(panel.page.getByText('Nuevo turno desde la app')).toHaveCount(0)
    const turnos = (await estadoDemo(panel.page))!.negocios.quetul!.turnos as { deLaApp?: boolean }[]
    expect(turnos.filter((t) => t.deLaApp)).toHaveLength(0)

    sinErrores(panel.v, otro.v, sinSala.v)
  })

  test('en el modo escenario, "+1 h" en un dispositivo adelanta el reloj del otro de la misma sala', async ({ browser }) => {
    const sala = nuevaSala()
    const a = await abrir(browser, contextos, 'escenario A')
    const b = await abrir(browser, contextos, 'escenario B')

    for (const { page } of [a, b]) {
      await irConCanal(page, `/lema/escenario?sala=${sala}`)
      await expect(page.getByText('Modo escenario')).toBeVisible()
      // Los iframes (celular y panel) son los que se conectan al canal en vivo.
      await expect(page.frameLocator('iframe[title="Panel del dueño"]').getByRole('heading', { name: 'Consultorio Lema' })).toBeVisible()
    }

    expect((await estadoDemo(a.page))?.desfase ?? 0).toBe(0)
    expect((await estadoDemo(b.page))?.desfase ?? 0).toBe(0)

    await a.page.getByRole('toolbar', { name: 'Controlar el tiempo de la demo' }).getByRole('button', { name: '+1 h' }).click()
    await expect.poll(async () => (await estadoDemo(a.page))?.desfase).toBe(HORA)

    // El otro dispositivo de la misma sala se entera por Realtime y adelanta su reloj.
    await expect.poll(async () => (await estadoDemo(b.page))?.desfase, { timeout: 10_000 }).toBe(HORA)
    await expect(b.page.getByText('Simulado', { exact: true })).toBeVisible()
    await expect(b.page.getByRole('button', { name: 'Volver a hoy' })).toBeVisible()

    sinErrores(a.v, b.v)
  })

  test('el escenario muestra el QR para conectar el celular del cliente a su sala', async ({ browser }) => {
    const sala = nuevaSala()
    const { page, v } = await abrir(browser, contextos, 'escenario')
    await page.goto(`/quetul/escenario?sala=${sala}`)
    await page.getByRole('button', { name: 'Conectar un celular' }).click()
    await expect(page.getByRole('img', { name: new RegExp(`/quetul\\?sala=${sala}`) })).toBeVisible()
    await expect(page.getByText(sala, { exact: true })).toBeVisible()
    // Los iframes de la pantalla usan la misma sala.
    await expect(page.locator('iframe[title="Panel del dueño"]')).toHaveAttribute('src', new RegExp(`sala=${sala}`))
    sinErrores(v)
  })
})
