// App del cliente en la demo fija /quetul: ingreso, reserva con seña, oferta de instalar y cancelación.
// Los turnos de la demo viven en el localStorage de cada contexto: cada test arranca limpio.
import { estadoDemo, expect, ingresarCliente, reservarProximoLibre, test } from './ayudantes'

test.describe('Demo del cliente (/quetul)', () => {
  test('ingresa con el código que llega en la notificación de WhatsApp', async ({ page }) => {
    await page.goto('/quetul')
    await expect(page.getByRole('heading', { level: 1, name: 'QueTul' })).toBeVisible()

    // Validaciones del formulario antes de pedir el código.
    await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
    await expect(page.getByText('Poné tu nombre así te reconocen en el local.')).toBeVisible()
    await expect(page.getByText('Tiene que tener 10 números', { exact: false })).toBeVisible()

    await page.getByLabel('Tu nombre').fill('Martina')
    await page.getByLabel('Tu celular').fill('1123456789')
    await expect(page.getByLabel('Tu celular')).toHaveValue('11 2345-6789')
    await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()

    // Llega la "notificación de WhatsApp" con el código.
    await expect(page.getByText(/tu código para entrar es \d{4}/)).toBeVisible()
    await expect(page.getByText('Te mandamos un código por WhatsApp al')).toBeVisible()
    await page.getByRole('button', { name: 'Completar código' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Martina' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  })

  test('un código equivocado muestra el error y no entra', async ({ page }) => {
    await page.goto('/quetul')
    await page.getByLabel('Tu nombre').fill('Martina')
    await page.getByLabel('Tu celular').fill('1123456789')
    await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
    const texto = await page.getByText(/tu código para entrar es \d{4}/).textContent()
    const bueno = texto!.match(/\b(\d{4})\b/)![1]!
    const malo = bueno === '1111' ? '2222' : '1111'
    await page.getByLabel('Código de 4 números').fill(malo)
    await expect(page.getByText('El código no coincide.', { exact: false })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  })

  test('reserva el próximo libre con seña, ve el listo y la oferta de instalar, y cancela desde Mis turnos', async ({ page }) => {
    await ingresarCliente(page, 'quetul')
    const hoja = await reservarProximoLibre(page)

    // Pantalla de listo: el pase con la seña pagada y la oferta de tener la app en el inicio.
    await expect(hoja.getByText(/Seña de \$[\d.]+ pagada/)).toBeVisible()
    await expect(hoja.getByText('Tené QueTul en tu inicio')).toBeVisible()
    // En Android (Pixel 7) sin el evento nativo, el botón abre la guía paso a paso.
    await hoja.getByRole('button', { name: /^(Agregar|Instalar)$/ }).click()
    const guia = page.getByRole('dialog', { name: 'Agregá QueTul a tu inicio' })
    await expect(guia).toBeVisible()
    await expect(guia.getByText('Instalar app')).toBeVisible()
    await guia.getByRole('button', { name: 'Cerrar' }).click()
    await expect(guia).toBeHidden()

    // Llega la confirmación "por WhatsApp".
    await expect(page.getByText(/Tu turno quedó para/)).toBeVisible()

    // Ir a Mis turnos desde la pantalla de listo.
    await hoja.getByRole('button', { name: 'Mis turnos' }).click()
    await expect(hoja).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'Mis turnos' })).toBeVisible()
    const pase = page.getByRole('article', { name: /^Turno de / })
    await expect(pase).toHaveCount(1)
    await expect(pase.getByText('Sin confirmar')).toBeVisible()

    let estado = await estadoDemo(page)
    const propios = estado!.negocios.quetul!.turnos.filter((t) => t.propio)
    expect(propios).toHaveLength(1)
    expect(propios[0]!.estado).toBe('pendiente')
    expect(propios[0]!.senaPagada).toBeGreaterThan(0)

    // Cancelar.
    await pase.getByRole('button', { name: 'Cancelar' }).click()
    const confirmar = page.getByRole('dialog', { name: '¿Cancelar el turno?' })
    await expect(confirmar).toBeVisible()
    await expect(confirmar.getByText('La seña queda a favor para tu próximo turno.', { exact: false })).toBeVisible()
    await confirmar.getByRole('button', { name: 'Sí, cancelar' }).click()
    await expect(confirmar).toBeHidden()

    // Queda en el historial como cancelado y ya no hay turnos próximos.
    await expect(page.getByText('No tenés turnos próximos')).toBeVisible()
    const historial = page.getByRole('region', { name: 'Historial' })
    await expect(historial.getByText('Cancelado')).toBeVisible()
    await expect(page.getByText(/Cancelaste tu turno de las \d{2}:\d{2}/)).toBeVisible()

    estado = await estadoDemo(page)
    expect(estado!.negocios.quetul!.turnos.find((t) => t.id === propios[0]!.id)!.estado).toBe('cancelado')
  })
})

test('una ruta inexistente muestra "No encontramos este negocio"', async ({ page }) => {
  await page.goto('/no-existe-xyz')
  await expect(page.getByRole('heading', { name: 'No encontramos este negocio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir al inicio' })).toBeVisible()
})
