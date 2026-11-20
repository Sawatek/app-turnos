// Sitio público: landing (/), legales, 404 y lista de demos. Todos los tests fallan si hay errores en la consola
// (fixture `errores` de ayudantes.ts). Por defecto corren en celular (Pixel 7); el bloque "en la compu" usa 1280 px.
import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../ayudantes'
import { DEMOS, MARCA, PLANES, hayPrecios, linkContacto, precioPlan } from '../../../src/pantallas/publico/marca'
import { SECCIONES } from '../../../src/pantallas/publico/inicio/secciones'

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
      'Un abono mensual, simple',
      'Tu app no lleva otra marca: lleva la tuya',
      'Ya viene armada para tu rubro',
      'Preguntas frecuentes',
      'Mirá tu negocio con su propia app',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: titulo })).toBeAttached()
    }
    // Las secciones fusionadas: los recordatorios van adentro del paso 3 y las funciones adentro de "Tu marca".
    const comoFunciona = page.getByRole('region', { name: 'Tres pasos y te olvidás de confirmar a mano' })
    await expect(comoFunciona.getByRole('heading', { level: 3, name: 'Paso 3: Se confirman solos' })).toBeAttached()
    await expect(comoFunciona.getByRole('list', { name: 'Qué le llega a tu cliente' }).getByRole('heading', { level: 4 })).toHaveCount(4)
    const tuMarca = page.getByRole('region', { name: 'Tu app no lleva otra marca: lleva la tuya' })
    await expect(tuMarca.getByRole('heading', { level: 3, name: 'Todo para que tu agenda no tenga huecos' })).toBeAttached()
    await expect(tuMarca.getByRole('heading', { level: 4, name: 'Panel y agenda en vivo' })).toBeAttached()
    expect(await sinScrollHorizontal(page)).toBe(true)
  })

  test('las secciones siguen el orden de SECCIONES y cada folio lleva su número', async ({ page }) => {
    await page.goto('/')
    // La portada carga en diferido: esperar a que estén todas antes de leer el DOM de una.
    await expect(page.locator('main > section[id]')).toHaveCount(SECCIONES.length)
    const ids = await page.locator('main > section[id]').evaluateAll((s) => s.map((e) => e.id))
    expect(ids).toEqual(SECCIONES.map((s) => s.id))
    for (const [i, s] of SECCIONES.entries()) {
      const n = String(i + 1).padStart(2, '0')
      await expect(page.locator(`#${s.id} p.folio`).first()).toHaveText(new RegExp(`^${n}\\s*${s.folio}$`))
      await expect(page.locator(`#${s.id}`)).toHaveAttribute('aria-labelledby', `t-${s.id}`)
    }
  })

  test('en el celular no hay sangrías decorativas: pasos y rubros arrancan del mismo margen', async ({ page }) => {
    await page.goto('/')
    const izquierdas = (l: Locator) => l.evaluateAll((hs) => hs.map((h) => Math.round(h.getBoundingClientRect().left)))
    const pasos = page.getByRole('region', { name: 'Tres pasos y te olvidás de confirmar a mano' }).getByRole('heading', { level: 3, name: /^Paso \d/ })
    await expect(pasos).toHaveCount(3)
    expect(new Set(await izquierdas(pasos)).size).toBe(1)
    const rubros = page.getByRole('region', { name: 'Ya viene armada para tu rubro' }).getByRole('heading', { level: 3 })
    expect(new Set(await izquierdas(rubros)).size).toBe(1)
  })

  test('precios: los planes, el recomendado en el nombre del título y botones que dicen lo que hacen', async ({ page }) => {
    await page.goto('/')
    const precios = page.getByRole('region', { name: 'Un abono mensual, simple' })
    const tarjetas = precios.getByRole('list', { name: 'Planes' }).locator(':scope > li')
    await expect(tarjetas).toHaveCount(PLANES.length)
    for (const p of PLANES) {
      // `has` se busca adentro de cada tarjeta: el locator del título arranca de `page`, no de la sección.
      const titulo = page.getByRole('heading', { level: 3, name: p.destacado ? `${p.nombre} (recomendado)` : p.nombre, exact: true })
      const tarjeta = tarjetas.filter({ has: titulo })
      await expect(tarjeta).toHaveCount(1)
      // Sin precio cargado (marca.ts), la tarjeta dice "A definir"; con precio, el monto en pesos (ver marca.test.ts).
      await expect(tarjeta).toContainText(precioPlan(p) ?? 'A definir')
    }
    await expect(precios.getByRole('heading', { level: 3, name: /\(recomendado\)$/ })).toHaveCount(PLANES.filter((p) => p.destacado).length)

    const contacto = linkContacto()
    if (contacto.via === 'demos') {
      // Sin contacto no hay a quién consultarle: ningún botón promete una persona, y se ofrece la demo.
      await expect(precios.getByRole('link', { name: /el plan/ })).toHaveCount(0)
      await expect(precios.getByRole('link', { name: 'Ver la demo', exact: true })).toHaveAttribute('href', DEMOS.barberia)
    } else {
      for (const p of PLANES) {
        const texto = `${precioPlan(p) ? 'Quiero' : 'Consultar'} el plan ${p.nombre}`
        await expect(precios.getByRole('link', { name: texto })).toHaveAttribute('href', contacto.href)
      }
      await expect(precios.getByRole('link', { name: 'Ver la demo', exact: true })).toHaveCount(0)
    }
  })

  test('"Pedí tu demo" lleva al contacto; sin contacto cargado, el botón dice "Ver la demo" y abre la demo', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main')
    const banner = page.getByRole('banner')
    const contacto = linkContacto()
    if (contacto.via === 'demos') {
      // Sin WhatsApp ni mail cargados, ningún botón promete una persona: dicen lo que hacen.
      await expect(banner.getByRole('link', { name: 'Ver la demo', exact: true })).toHaveAttribute('href', DEMOS.barberia)
      await expect(page.getByRole('link', { name: 'Pedí tu demo' })).toHaveCount(0)
      await expect(main.getByRole('link', { name: /^Consultar el plan/ })).toHaveCount(0)
      await main.getByRole('link', { name: 'Ver la demo', exact: true }).first().click()
    } else {
      await expect(main.getByRole('link', { name: 'Pedí tu demo' }).first()).toHaveAttribute('href', contacto.href)
      await expect(banner.getByRole('link', { name: 'Pedí tu demo' })).toHaveAttribute('href', contacto.href)
      await main.getByRole('link', { name: 'Ver una demo' }).first().click()
    }
    await expect(page).toHaveURL(/\/quetul$/)
  })

  test('en el celular, el menú "Secciones" lleva a cada parte de la página', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Secciones' }).click()
    const hoja = page.getByRole('dialog', { name: 'Secciones' })
    await hoja.getByRole('link', { name: 'Precios' }).click()
    await expect(hoja).toBeHidden()
    await expect(page).toHaveURL(/#precios$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Un abono mensual, simple' })).toBeInViewport()
  })

  test('"Tu marca" lleva a las demos de ejemplo', async ({ page }) => {
    await page.goto('/')
    const demos = page.getByRole('list', { name: 'Demos de ejemplo' })
    await expect(demos.getByRole('link', { name: 'QueTul' })).toHaveAttribute('href', '/quetul')
    await expect(demos.getByRole('link', { name: 'Consultorio Lema' })).toHaveAttribute('href', '/lema')
    await expect(demos.getByRole('link', { name: 'Nailed' })).toHaveAttribute('href', '/nailed')
  })

  test('los rubros llevan a sus demos', async ({ page }) => {
    await page.goto('/')
    const rubros = page.getByRole('region', { name: 'Ya viene armada para tu rubro' })
    await expect(rubros.getByRole('link', { name: 'Ver la demo de QueTul' })).toHaveAttribute('href', '/quetul')
    await expect(rubros.getByRole('link', { name: 'Ver la demo de Consultorio Lema' })).toHaveAttribute('href', '/lema')
    await rubros.getByRole('link', { name: 'Ver la demo de Nailed' }).click()
    await expect(page).toHaveURL(/\/nailed$/)
  })

  test('el celular de muestra tiene la app de verdad y cambia de marca', async ({ page }) => {
    await page.goto('/')
    const pantalla = page.locator('[data-celular]').first()
    // Adentro está la app del cliente (los mismos componentes que /quetul), oculta para lectores de pantalla.
    await expect(pantalla).toContainText('QueTul')
    await expect(pantalla).toContainText('Reservar este')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    const nailed = page.getByRole('button', { name: 'Nailed' })
    await expect(page.getByRole('button', { name: 'QueTul' })).toHaveAttribute('aria-pressed', 'true')
    await nailed.click()
    await expect(nailed).toHaveAttribute('aria-pressed', 'true')
    await expect(pantalla).toContainText('Nailed')
    await expect(page.getByRole('link', { name: 'Probá cómo reserva tu cliente' })).toHaveAttribute('href', '/nailed')
    await expect(page.getByRole('link', { name: 'Mirá el panel del dueño' })).toHaveAttribute('href', '/nailed/panel')
  })

  test('la animación del celular se puede pausar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Pausar la animación' }).click()
    await expect(page.getByRole('button', { name: 'Reproducir la animación' })).toBeVisible()
    await page.getByRole('button', { name: 'Reproducir la animación' }).click()
    await expect(page.getByRole('button', { name: 'Pausar la animación' })).toBeVisible()
  })

  test('con "reducir movimiento" el celular arranca quieto y muestra el recordatorio', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Reproducir la animación' })).toBeVisible()
    const pantalla = page.locator('[data-celular]').first()
    await expect(pantalla).toContainText('Confirmo')
    await expect(pantalla).toContainText('Cambiar horario')
  })

  test('la calculadora usa los números del dueño', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Faltas por semana').fill('10')
    await page.getByLabel('Precio promedio del turno').fill('10000')
    // 10 faltas × 4,33 semanas × $10.000
    await expect(page.getByRole('group', { name: 'Perdés por mes' })).toContainText(/433\.000/)
    await page.getByLabel('Faltas que evitás con recordatorios').fill('50')
    await expect(page.getByRole('group', { name: 'Podés recuperar por mes' })).toContainText(/216\.500/)
  })

  test('la calculadora avisa al lado del campo si el precio queda vacío', async ({ page }) => {
    await page.goto('/')
    const precio = page.getByLabel('Precio promedio del turno')
    await precio.fill('')
    await expect(page.getByText('Poné cuánto cobrás un turno')).toBeVisible()
    await expect(precio).toHaveAttribute('aria-invalid', 'true')
    await expect(precio).toHaveAccessibleDescription('Poné cuánto cobrás un turno')
    await precio.fill('0')
    await expect(page.getByText('Poné cuánto cobrás un turno')).toBeVisible()
    await precio.fill('12000')
    await expect(page.getByText('Poné cuánto cobrás un turno')).toBeHidden()
    await expect(precio).not.toHaveAttribute('aria-invalid')
  })

  test('la pausa frena la historia del celular de verdad', async ({ page }) => {
    // Con el reloj del navegador quieto, el tiempo corre solo con runFor (sin carreras). Con "reducir movimiento"
    // arranca en pausa en el recordatorio. A 375 px la tarjeta de la agenda entra sin scroll horizontal.
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await page.goto('/')
    const reproducir = page.getByRole('button', { name: 'Reproducir la animación' })
    await expect(reproducir).toBeVisible()
    // La historia solo corre con el celular en pantalla (IntersectionObserver): a 375 px está abajo de la portada.
    await page.locator('[data-celular]').first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
    const confirmo = page.getByText('Confirmó', { exact: true })
    // Avanza el reloj de a poco: React aplica cada paso de forma asíncrona y recién ahí programa el temporizador
    // del paso siguiente; con un solo runFor largo ese temporizador quedaría para después.
    const avanzar = async (ms: number) => {
      for (let t = 0; t < ms; t += 250) await page.clock.runFor(250)
    }

    // En pausa no avanza aunque pase el tiempo.
    await avanzar(10_000)
    await expect(confirmo).toBeHidden()

    // Reproduciendo: recordatorio (2,6 s) → toca "Confirmo" (0,75 s) → la agenda dice "Confirmó".
    await reproducir.click()
    await avanzar(4_000)
    await expect(confirmo).toBeVisible()
    expect(await sinScrollHorizontal(page)).toBe(true)

    // Pausada otra vez: ni sigue la historia ni cambia de marca.
    await page.getByRole('button', { name: 'Pausar la animación' }).click()
    await avanzar(20_000)
    await expect(confirmo).toBeVisible()
    await expect(page.getByRole('button', { name: 'QueTul' })).toHaveAttribute('aria-pressed', 'true')

    // Y al reproducir termina la historia y pasa a la marca siguiente.
    await page.getByRole('button', { name: 'Reproducir la animación' }).click()
    await avanzar(10_000)
    await expect(page.getByRole('button', { name: 'Consultorio Lema' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('las preguntas frecuentes se abren y cierran con el teclado', async ({ page }) => {
    await page.goto('/')
    // "¿Cuánto sale?" va primera: es lo que más traba la compra.
    const primera = page.getByRole('button', { name: '¿Cuánto sale?' })
    const respuesta = page.getByText(hayPrecios() ? /Depende de cuántos profesionales/ : /Estamos terminando de definir los planes/)
    await expect(primera).toHaveAttribute('aria-expanded', 'false')
    await expect(respuesta).toBeHidden()

    await primera.focus()
    await page.keyboard.press('Enter')
    await expect(primera).toHaveAttribute('aria-expanded', 'true')
    await expect(respuesta).toBeVisible()
    // La respuesta no es un landmark: con todas las preguntas abiertas serían 9 "region".
    await expect(page.getByRole('region', { name: '¿Cuánto sale?' })).toHaveCount(0)

    await page.keyboard.press('Space')
    await expect(primera).toHaveAttribute('aria-expanded', 'false')
    await expect(respuesta).toBeHidden()

    // Tab pasa a la siguiente pregunta, que se abre con Espacio.
    await page.keyboard.press('Tab')
    const segunda = page.getByRole('button', { name: '¿Mis clientes tienen que bajar una app?' })
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

  for (const ancho of [1280, 1600]) {
    test(`a ${ancho} px los planes van en una sola fila, uno al lado del otro`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 })
      await page.goto('/')
      const planes = page.getByRole('list', { name: 'Planes' }).locator(':scope > li')
      await expect(planes).toHaveCount(PLANES.length)
      const cajas = await planes.evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect().toJSON() as DOMRect))
      for (let i = 1; i < cajas.length; i++) expect(cajas[i]!.left).toBeGreaterThanOrEqual(cajas[i - 1]!.right)
      expect(await sinScrollHorizontal(page)).toBe(true)
    })
  }

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
    await expect(page.getByRole('heading', { level: 2, name: 'Un abono mensual, simple' })).toBeInViewport()
  })

  test.describe('diseño editorial', () => {
    // Compara posiciones: sin "reducir movimiento", .aparecer corre los bloques hasta 40 px mientras entran en pantalla.
    test.use({ reducedMotion: 'reduce' })

    test('los pasos bajan corridos en escalera y el chat va a la derecha, más abajo que el título', async ({ page }) => {
      await page.goto('/')
      const seccion = page.getByRole('region', { name: 'Tres pasos y te olvidás de confirmar a mano' })
      const pasos = seccion.getByRole('heading', { level: 3, name: /^Paso \d/ })
      await expect(pasos).toHaveCount(3)
      const cajas = await pasos.evaluateAll((hs) => hs.map((h) => h.getBoundingClientRect().toJSON() as DOMRect))
      for (const i of [1, 2]) {
        expect(cajas[i]!.left).toBeGreaterThan(cajas[i - 1]!.left + 20) // cada paso, más corrido que el anterior
        expect(cajas[i]!.top).toBeGreaterThan(cajas[i - 1]!.top + 40) // y más abajo
      }

      const banda = (await seccion.boundingBox())!
      const titulo = (await seccion.getByRole('heading', { level: 2 }).boundingBox())!
      const chat = (await seccion.locator('figure').boundingBox())!
      expect(chat.y).toBeGreaterThan(banda.y) // no se sale de la sección
      expect(chat.y + chat.height).toBeLessThan(banda.y + banda.height)
      expect(chat.y).toBeGreaterThan(titulo.y + 40) // más abajo que el título
      expect(chat.x).toBeGreaterThan(banda.x + banda.width / 2) // a la derecha
      expect(chat.x).toBeGreaterThan(cajas[2]!.right) // y fuera de la columna de los pasos
    })

    test('los rubros alternan: uno contra el margen y el siguiente corrido', async ({ page }) => {
      await page.goto('/')
      const rubros = page.getByRole('region', { name: 'Ya viene armada para tu rubro' }).getByRole('heading', { level: 3 })
      await expect(rubros.nth(2)).toBeVisible()
      const x = await rubros.evaluateAll((hs) => hs.map((h) => h.getBoundingClientRect().left))
      expect(x[1]!).toBeGreaterThan(x[0]! + 40)
      expect(Math.abs(x[2]! - x[0]!)).toBeLessThan(2)
    })
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

// A2 / T4: el #ancla y "atrás" los resuelve <ScrollRestoration> (src/main.tsx), con la portada como ruta perezosa del router.
test.describe('anclas y "atrás" en la portada', () => {
  test('entrando directo a /#precios se ve la sección de precios', async ({ page }) => {
    await page.goto('/#precios')
    await expect(page.getByRole('heading', { level: 2, name: /Un abono mensual/ })).toBeInViewport()
  })

  test('un ancla que no se puede decodificar (/#%) carga la portada sin errores', async ({ page }) => {
    await page.goto('/#%')
    await expect(page.getByRole('heading', { level: 1, name: MARCA.slogan })).toBeVisible()
  })

  test('volver "atrás" desde una demo de Rubros deja la página donde estaba', async ({ page }) => {
    await page.goto('/')
    const rubros = page.getByRole('region').filter({ has: page.locator('#t-rubros') })
    const enlace = rubros.getByRole('link', { name: 'Ver la demo de Nailed' })
    await enlace.scrollIntoViewIfNeeded()
    const antes = await page.evaluate(() => window.scrollY)
    expect(antes).toBeGreaterThan(500)
    await enlace.click()
    await expect(page).toHaveURL(/\/nailed$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(enlace).toBeInViewport()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(antes - 5)
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(antes + 5)
  })

  test('la 404 les pide a los buscadores que no la indexen', async ({ page }) => {
    await page.goto('/una-ruta/que-no-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeVisible()
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  })
})
