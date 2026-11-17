// Sitio público: landing (/), legales, 404 y lista de demos. Todos los tests fallan si hay errores en la consola
// (fixture `errores` de ayudantes.ts). Por defecto corren en celular (Pixel 7); el bloque "en la compu" usa 1280 px.
import type { Page } from '@playwright/test'
import { expect, test } from '../ayudantes'
import { MARCA, linkContacto } from '../../../src/pantallas/publico/marca'

const sinScrollHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test.describe('Inicio (/)', () => {
  test('carga con la propuesta, las secciones y el título de la pestaña', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: MARCA.slogan })).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(MARCA.nombre))
    for (const titulo of [
      'Cada falta es una silla vacía que igual pagaste',
      'Tres pasos y te olvidás de confirmar a mano',
      'Todo lo que necesitás para llenar la agenda',
      'Pensada para cada tipo de negocio',
      'Un abono mensual, sin sorpresas',
      'Lo que nos preguntan siempre',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: titulo })).toBeAttached()
    }
    expect(await sinScrollHorizontal(page)).toBe(true)
  })

  test('"Pedí tu demo" lleva al contacto (o a /demos si no hay) y "Ver una demo" abre la demo', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main')
    const contacto = linkContacto()
    await expect(main.getByRole('link', { name: 'Pedí tu demo' }).first()).toHaveAttribute('href', contacto.href)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Pedí tu demo' })).toHaveAttribute('href', contacto.href)

    await main.getByRole('link', { name: 'Ver una demo' }).click()
    await expect(page).toHaveURL(/\/quetul$/)
  })

  test('los rubros llevan a sus demos', async ({ page }) => {
    await page.goto('/')
    const rubros = page.getByRole('region', { name: 'Pensada para cada tipo de negocio' })
    await expect(rubros.getByRole('link', { name: 'Ver la demo de QueTul' })).toHaveAttribute('href', '/quetul')
    await expect(rubros.getByRole('link', { name: 'Ver la demo de Consultorio Lema' })).toHaveAttribute('href', '/lema')
    await rubros.getByRole('link', { name: 'Ver la demo de Nailed' }).click()
    await expect(page).toHaveURL(/\/nailed$/)
  })

  test('el celular de muestra cambia de marca', async ({ page }) => {
    await page.goto('/')
    const nailed = page.getByRole('button', { name: 'Nailed' })
    await expect(page.getByRole('button', { name: 'QueTul' })).toHaveAttribute('aria-pressed', 'true')
    await nailed.click()
    await expect(nailed).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('link', { name: 'Probá la app de Nailed en vivo' })).toHaveAttribute('href', '/nailed')
  })

  test('la calculadora usa los números del dueño', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Faltas por semana').fill('10')
    await page.getByLabel('Precio promedio del turno').fill('10000')
    // 10 faltas × 4,33 semanas × $10.000
    await expect(page.getByText('Perdés por mes').locator('xpath=..')).toContainText(/433\.000/)
    await page.getByLabel('Faltas que evitás con recordatorios').fill('50')
    await expect(page.getByText('Podés recuperar por mes').locator('xpath=..')).toContainText(/216\.500/)
  })

  test('las preguntas frecuentes se abren y cierran con el teclado', async ({ page }) => {
    await page.goto('/')
    const primera = page.getByRole('button', { name: '¿Mis clientes tienen que bajar una app?' })
    const respuesta = page.getByText(/Entran por un link/)
    await expect(primera).toHaveAttribute('aria-expanded', 'false')
    await expect(respuesta).toBeHidden()

    await primera.focus()
    await page.keyboard.press('Enter')
    await expect(primera).toHaveAttribute('aria-expanded', 'true')
    await expect(respuesta).toBeVisible()
    await expect(page.getByRole('region', { name: '¿Mis clientes tienen que bajar una app?' })).toBeVisible()

    await page.keyboard.press('Space')
    await expect(primera).toHaveAttribute('aria-expanded', 'false')
    await expect(respuesta).toBeHidden()

    // Tab pasa a la siguiente pregunta, que se abre con Espacio.
    await page.keyboard.press('Tab')
    const segunda = page.getByRole('button', { name: '¿Cómo funcionan los recordatorios por WhatsApp?' })
    await expect(segunda).toBeFocused()
    await page.keyboard.press('Space')
    await expect(segunda).toHaveAttribute('aria-expanded', 'true')
  })

  test('el pie lleva a legales, demos y accesos', async ({ page }) => {
    await page.goto('/')
    const pie = page.getByRole('contentinfo')
    await expect(pie.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad')
    await expect(pie.getByRole('link', { name: 'Ver todas las demos' })).toHaveAttribute('href', '/demos')
    await expect(pie.getByRole('link', { name: `Ingreso del equipo ${MARCA.corto}` })).toHaveAttribute('href', '/admin')
    await expect(pie.getByText('/tu-negocio/panel')).toBeVisible()

    await pie.getByRole('link', { name: 'Términos y condiciones' }).click()
    await expect(page).toHaveURL(/\/terminos$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()
  })
})

test.describe('en la compu (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })

  test('hero en dos columnas, navegación por secciones y sin scroll horizontal', async ({ page }) => {
    await page.goto('/')
    const h1 = page.getByRole('heading', { level: 1, name: MARCA.slogan })
    const marcas = page.getByRole('group', { name: 'Mirala con otra marca' })
    await expect(h1).toBeVisible()
    await expect(marcas).toBeVisible()
    const a = (await h1.boundingBox())!
    const b = (await marcas.boundingBox())!
    expect(b.x).toBeGreaterThan(a.x + a.width / 2) // el celular va a la derecha del título
    expect(await sinScrollHorizontal(page)).toBe(true)

    const nav = page.getByRole('navigation', { name: 'Secciones' })
    await nav.getByRole('link', { name: 'Precios' }).click()
    await expect(page).toHaveURL(/#precios$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Un abono mensual, sin sorpresas' })).toBeInViewport()
  })

  test('el link "saltar al contenido" aparece con Tab', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: MARCA.slogan })).toBeVisible()
    await page.keyboard.press('Tab')
    const saltar = page.getByRole('link', { name: 'Saltar al contenido' })
    await expect(saltar).toBeFocused()
    await expect(saltar).toBeInViewport()
  })

  test('las páginas legales y la 404 se ven bien en pantalla grande', async ({ page }) => {
    await page.goto('/privacidad')
    await expect(page.getByRole('navigation', { name: 'En esta página' })).toBeVisible()
    expect(await sinScrollHorizontal(page)).toBe(true)
    await page.goto('/una/ruta/que/no/existe')
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toBeVisible()
    expect(await sinScrollHorizontal(page)).toBe(true)
  })
})

test.describe('Legales', () => {
  test('términos: aviso de borrador, índice y secciones', async ({ page }) => {
    await page.goto('/terminos')
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible()
    await expect(page.getByRole('note')).toContainText('Borrador: revisar con un abogado antes de publicar')
    await expect(page).toHaveTitle(/Términos y condiciones/)
    await page.getByRole('navigation', { name: 'En esta página' }).getByRole('link', { name: 'Ley aplicable y jurisdicción' }).click()
    await expect(page).toHaveURL(/#ley$/)
    await expect(page.getByRole('heading', { level: 2, name: /Ley aplicable y jurisdicción/ })).toBeInViewport()
    await page.getByRole('main').getByRole('link', { name: 'Política de privacidad' }).last().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible()
  })

  test('privacidad: Ley 25.326, rol de encargado, WhatsApp, almacenamiento y derechos', async ({ page }) => {
    await page.goto('/privacidad')
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible()
    await expect(page.getByRole('note')).toContainText('Borrador: revisar con un abogado antes de publicar')
    for (const titulo of [/Nuestro rol: responsable y encargado/, /Qué datos guardamos/, /Mensajes por WhatsApp/, /Cookies y almacenamiento/, /Tus derechos/]) {
      await expect(page.getByRole('heading', { level: 2, name: titulo })).toBeAttached()
    }
    await expect(page.getByText(/AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA/)).toBeAttached()
  })
})

test.describe('404', () => {
  test('una ruta desconocida muestra la página no encontrada y vuelve al inicio', async ({ page }) => {
    await page.goto('/esto/no/existe')
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver las demos de SawaTek' })).toHaveAttribute('href', '/demos')
    await page.getByRole('link', { name: 'Ir al inicio' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: MARCA.slogan })).toBeVisible()
  })

  test('un negocio que no existe dice "No encontramos este negocio"', async ({ page }) => {
    await page.goto('/negocio-que-no-existe-xyz')
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos este negocio' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toBeVisible()
  })
})

test.describe('/demos', () => {
  test('lista las demos fijas y vuelve al inicio', async ({ page }) => {
    await page.goto('/demos')
    await expect(page.getByRole('heading', { level: 1, name: 'Demos de apps de turnos' })).toBeVisible()
    await expect(page).toHaveTitle(/Demos/)
    for (const nombre of ['QueTul', 'Consultorio Lema', 'Nailed']) await expect(page.getByText(nombre, { exact: true }).first()).toBeVisible()
    await expect(page.locator('a[href="/quetul"]')).toBeVisible()
    await expect(page.locator('a[href="/lema/panel"]')).toBeVisible()
    await expect(page.locator('a[href="/nailed/escenario"]')).toBeVisible()
    await page.getByRole('link', { name: 'Volver al inicio' }).click()
    await expect(page.getByRole('heading', { level: 1, name: MARCA.slogan })).toBeVisible()
  })
})
