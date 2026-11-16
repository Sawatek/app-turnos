// App del cliente REAL: ingreso con el celular y el código que deja el hook de Auth en `mensajes`.
import { limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import { borrarCelular, ERROR_HTTP, nuevoTelefono, ultimoCodigo } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const telefonos: string[] = []

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
  for (const t of telefonos) await borrarCelular(t)
})

test('entra con el código real que llega "por WhatsApp" (un código mal puesto no entra)', async ({ page, errores }) => {
  errores.permitir(ERROR_HTTP)
  const tel = nuevoTelefono()
  telefonos.push(tel.e164)
  await page.goto(`/${m.negocioA.slug}`)

  // Bienvenida con la marca del negocio.
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(page.getByText('Negocio de prueba')).toBeVisible()

  // Lo escribe con el 0 y el 15: igual se entiende.
  const campo = page.getByLabel('Tu celular')
  await campo.fill(`0${tel.nacional.slice(0, 2)} 15 ${tel.nacional.slice(3)}`)
  const antes = new Date().toISOString()
  await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
  await expect(page.getByText('Te mandamos un código por WhatsApp al')).toBeVisible()
  await expect(page.getByText(tel.nacional)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Reenviar código en \d+ s$/ })).toBeDisabled()

  const codigo = await ultimoCodigo(tel.e164, antes)
  expect(codigo).toMatch(/^\d{6}$/)
  const input = page.getByLabel('Código de 6 números')
  await expect(input).toHaveAttribute('autocomplete', 'one-time-code')

  // Uno equivocado: error al lado del campo y sigue afuera.
  await input.fill(codigo === '000000' ? '111111' : '000000')
  await expect(page.getByText('El código no coincide o ya venció.', { exact: false })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)

  // El bueno: adentro.
  await input.fill(codigo)
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: '¡Hola!' })).toBeVisible()

  // Perfil: muestra su celular y puede salir.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Perfil' }).click()
  await expect(page.getByText(tel.nacional)).toBeVisible()
  await expect(page.getByText('Tu nombre te lo pedimos cuando saques tu primer turno.')).toBeVisible()
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('button', { name: 'Recibir código por WhatsApp' })).toBeVisible()

  // El usuario quedó creado con el celular en formato internacional.
  const { data } = await servicio().auth.admin.listUsers({ perPage: 1000 })
  expect(data.users.some((u) => u.phone === tel.e164.slice(1))).toBe(true)
})

test('un número mal escrito muestra el error al lado del campo y no manda nada', async ({ page }) => {
  await page.goto(`/${m.negocioA.slug}`)
  const campo = page.getByLabel('Tu celular')
  const boton = page.getByRole('button', { name: 'Recibir código por WhatsApp' })

  await boton.click()
  await expect(page.getByText('Escribí tu celular, con el código de área.')).toBeVisible()

  for (const malo of ['1234', '11 2345-678', '0800 123 4567']) {
    await campo.fill(malo)
    await boton.click()
    await expect(page.getByText('Revisá el número: son 10 números con el código de área', { exact: false })).toBeVisible()
    await expect(campo).toHaveAttribute('aria-invalid', 'true')
  }
  await expect(page.getByText('Te mandamos un código por WhatsApp al')).toHaveCount(0)

  // Al corregirlo, el error se va.
  await campo.fill('11 2345-6789')
  await expect(campo).not.toHaveAttribute('aria-invalid', 'true')
})
