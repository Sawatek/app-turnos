// /mis-turnos: la cuenta del cliente en TODOS los negocios donde reservó.
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import {
  borrarCelular,
  crearClienteCelular,
  entrarComo,
  fichaEn,
  nuevoTelefono,
  turnoDirecto,
  ultimoCodigo,
  type ClienteCelular,
} from '../cliente-real/ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const creados: ClienteCelular[] = []
const telefonos: string[] = []

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
  await Promise.all(creados.map((c) => servicio().auth.admin.deleteUser(c.id)))
  for (const t of telefonos) await borrarCelular(t)
})

const estadoDe = async (id: string) => (await servicio().from('turnos').select('estado').eq('id', id).single()).data!.estado

test('muestra los turnos de dos negocios distintos, con link a cada uno, y confirma y cancela', async ({ page }) => {
  const c = await crearClienteCelular()
  creados.push(c)
  const fichaA = await fichaEn(m.negocioA.id, c.id, 'Gala Global', c.tel)
  const fichaB = await fichaEn(m.negocioB.id, c.id, 'Gala Global', c.tel)
  const enA = await turnoDirecto({ negocioId: m.negocioA.id, clienteId: fichaA, profesionalId: m.profesionales.p1, servicioId: m.servicios.corteA, inicio: aISO(diaAR(2), '10:00') })
  const enB = await turnoDirecto({ negocioId: m.negocioB.id, clienteId: fichaB, profesionalId: m.profesionales.pB, servicioId: m.servicios.corteB, inicio: aISO(diaAR(3), '11:00') })
  await turnoDirecto({ negocioId: m.negocioA.id, clienteId: fichaA, profesionalId: m.profesionales.p2, servicioId: m.servicios.corteA, inicio: aISO(diaAR(-6), '09:00'), estado: 'asistio' })
  // Un turno de OTRA persona no aparece.
  const otra = await fichaEn(m.negocioA.id, m.usuarios.cliente2.id, 'Otra Persona')
  await turnoDirecto({ negocioId: m.negocioA.id, clienteId: otra, profesionalId: m.profesionales.p2, servicioId: m.servicios.corteA, inicio: aISO(diaAR(2), '12:00') })

  await entrarComo(page, c)
  await page.goto('/mis-turnos')
  await expect(page.getByRole('heading', { level: 1, name: 'Mis turnos' })).toBeVisible()

  const proximos = page.getByRole('region', { name: 'Próximos' })
  const turnoA = proximos.getByRole('article', { name: /^Turno en Negocio A: Corte/ })
  const turnoB = proximos.getByRole('article', { name: /^Turno en Negocio B: Corte B/ })
  await expect(proximos.getByRole('article')).toHaveCount(2)
  await expect(turnoA).toContainText('Corte con P1')
  await expect(turnoB).toContainText('Corte B con PB')
  await expect(turnoA.getByRole('link', { name: 'Negocio A' })).toHaveAttribute('href', `/${m.negocioA.slug}`)
  await expect(turnoB.getByRole('button', { name: 'Agregar al calendario' })).toBeVisible()
  const historial = page.getByRole('region', { name: 'Historial' })
  await expect(historial.getByText('Negocio A')).toBeVisible()
  await expect(historial.getByText('Vino', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tus negocios' }).getByRole('link')).toHaveCount(2)

  // Confirmar el de B.
  await turnoB.getByRole('button', { name: 'Confirmar asistencia' }).click()
  await expect(turnoB.getByText('Confirmado')).toBeVisible()
  expect(await estadoDe(enB)).toBe('confirmado')

  // Cancelar el de A.
  await turnoA.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('dialog', { name: '¿Cancelar el turno?' }).getByRole('button', { name: 'Sí, cancelar' }).click()
  await expect(page.getByText('Cancelaste tu turno en Negocio A.', { exact: false })).toBeVisible()
  await expect(proximos.getByRole('article')).toHaveCount(1)
  expect(await estadoDe(enA)).toBe('cancelado')

  // El link lleva a la app de ese negocio, ya con sesión.
  await turnoB.getByRole('link', { name: 'Negocio B' }).click()
  await expect(page).toHaveURL(new RegExp(`/${m.negocioB.slug}$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Gala' })).toBeVisible()
})

test('sin sesión pide el celular (con el aviso de privacidad) y al entrar muestra su cuenta', async ({ page }) => {
  const tel = nuevoTelefono()
  telefonos.push(tel.e164)
  await page.goto('/mis-turnos')
  await expect(page.getByRole('heading', { name: 'Entrá con tu celular' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver privacidad' })).toHaveAttribute('href', '/privacidad')
  await page.getByRole('textbox', { name: 'Tu celular' }).fill(tel.nacional)
  const antes = new Date().toISOString()
  await page.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
  await page.getByLabel('Código de 6 números').fill(await ultimoCodigo(tel.e164, antes))
  await expect(page.getByText('Todavía no tenés turnos')).toBeVisible()
  await expect(page.getByText(tel.nacional)).toBeVisible()
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { name: 'Entrá con tu celular' })).toBeVisible()
})
