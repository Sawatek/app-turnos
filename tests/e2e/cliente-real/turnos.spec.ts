// App del cliente REAL: Mis turnos (reprogramar, plazo de cancelación, cambios en vivo), fidelidad y perfil.
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import { botonDia, crearClienteCelular, entrarComo, type ClienteCelular } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const creados: ClienteCelular[] = []

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
  await Promise.all(creados.map((c) => servicio().auth.admin.deleteUser(c.id)))
})

/** Cliente por celular que ya tiene su ficha en el negocio A. */
async function clienteConFicha(nombre: string) {
  const c = await crearClienteCelular()
  creados.push(c)
  const { data, error } = await servicio()
    .from('clientes')
    .insert({ negocio_id: m.negocioA.id, user_id: c.id, nombre, telefono: c.tel })
    .select('id')
    .single()
  if (error) throw error
  return { ...c, clienteId: data.id as string }
}

/** Turno cargado directo en la base (para preparar casos: en el pasado, muy cerca, etc.). */
async function turno(clienteId: string, inicio: string, extra: { estado?: string; profesional?: string; minutos?: number } = {}) {
  const fin = new Date(Date.parse(inicio) + (extra.minutos ?? 30) * 60_000).toISOString()
  const { data, error } = await servicio()
    .from('turnos')
    .insert({
      negocio_id: m.negocioA.id, cliente_id: clienteId, profesional_id: extra.profesional ?? m.profesionales.p1,
      servicio_id: m.servicios.corteA, inicio, fin, estado: extra.estado ?? 'pendiente',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

const estadoDe = async (id: string) => (await servicio().from('turnos').select('estado').eq('id', id).single()).data!.estado

test('cambiar de horario: reserva el nuevo y recién después cancela el viejo', async ({ page }) => {
  const c = await clienteConFicha('Ramiro Cambio')
  const viejo = await turno(c.clienteId, aISO(diaAR(3), '10:00'))
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()

  const pase = page.getByRole('article', { name: /^Turno de Corte/ })
  await pase.getByRole('button', { name: 'Cambiar horario' }).click()
  const hoja = page.getByRole('dialog', { name: 'Cambiar horario' })
  await expect(hoja.getByText('Tu turno actual:')).toBeVisible()
  // Viene con el mismo servicio y profesional elegidos.
  await expect(hoja.getByRole('button', { name: /^Corte/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(hoja.getByRole('button', { name: 'P1', exact: true })).toHaveAttribute('aria-pressed', 'true')

  const nuevoDia = diaAR(4)
  await hoja.getByRole('button', { name: botonDia(nuevoDia) }).click()
  await hoja.getByRole('group', { name: 'Mañana' }).getByRole('button', { name: '11:00' }).click()
  await hoja.getByRole('button', { name: 'Cambiar a este horario' }).click()
  await expect(hoja.getByRole('heading', { name: '¡Listo, Ramiro!' })).toBeVisible()
  await expect(hoja.getByText('Cambiamos tu turno.', { exact: false })).toBeVisible()

  expect(await estadoDe(viejo)).toBe('cancelado')
  const { data: activos } = await servicio().from('turnos').select('inicio, profesional_id').eq('cliente_id', c.clienteId).neq('estado', 'cancelado')
  expect(activos!.map((t) => [new Date(t.inicio).toISOString(), t.profesional_id])).toEqual([[aISO(nuevoDia, '11:00'), m.profesionales.p1]])

  await hoja.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByRole('article', { name: /^Turno de Corte/ })).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Historial' }).getByText('Cancelado')).toBeVisible()
})

test('dentro del plazo de cancelación no ofrece cancelar y explica el plazo', async ({ page }) => {
  const c = await clienteConFicha('Paula Apurada')
  // En 60 minutos (el negocio deja cancelar hasta 2 horas antes).
  const inicio = new Date(Date.now() + 60 * 60_000)
  inicio.setSeconds(0, 0)
  await turno(c.clienteId, inicio.toISOString())
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()

  const pase = page.getByRole('article', { name: /^Turno de Corte/ })
  await expect(pase.getByText('Faltan menos de 2 horas: para cancelarlo o cambiarlo, escribinos.')).toBeVisible()
  await expect(pase.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)
  await expect(pase.getByRole('button', { name: 'Cambiar horario' })).toHaveCount(0)
  await expect(pase.getByRole('link', { name: 'Escribinos' })).toHaveAttribute('href', /^https:\/\/wa\.me\/5491100000000/)
  // Confirmar asistencia sí se puede.
  await pase.getByRole('button', { name: 'Confirmar asistencia' }).click()
  await expect(pase.getByText('Confirmado')).toBeVisible()
})

test('en vivo: si el turno se confirma desde afuera (WhatsApp, el local), se ve al instante', async ({ page }) => {
  const c = await clienteConFicha('Vera Vivo')
  const id = await turno(c.clienteId, aISO(diaAR(5), '15:00'))
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()
  const pase = page.getByRole('article', { name: /^Turno de Corte/ })
  await expect(pase.getByText('Sin confirmar')).toBeVisible()
  // Le damos un momento a la suscripción en vivo para conectarse.
  await page.waitForTimeout(1500)

  const { error } = await servicio().from('turnos').update({ estado: 'confirmado' }).eq('id', id)
  expect(error).toBeNull()
  await expect(pase.getByText('Confirmado')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/quedó confirmado/)).toBeVisible()
})

test('fidelidad: un sello por cada turno al que vino', async ({ page }) => {
  const c = await clienteConFicha('Fede Fiel')
  await turno(c.clienteId, aISO(diaAR(-10), '10:00'), { estado: 'asistio' })
  await turno(c.clienteId, aISO(diaAR(-5), '10:00'), { estado: 'asistio' })
  await turno(c.clienteId, aISO(diaAR(-3), '10:00'), { estado: 'falto' })
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  const tarjeta = page.getByRole('region', { name: 'Tu tarjeta' })
  await expect(tarjeta.getByText('2/5')).toBeVisible()
  await expect(tarjeta.getByRole('list', { name: '2 de 5 sellos' })).toBeVisible()
  // "Lo de siempre" y el historial con nombres de servicio y profesional.
  await expect(page.getByRole('button', { name: 'Lo de siempre: Corte con P1' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()
  const historial = page.getByRole('region', { name: 'Historial' })
  await expect(historial.getByText('Corte · P1')).toHaveCount(3)
  await expect(historial.getByText('Vino', { exact: true })).toHaveCount(2)
  await expect(historial.getByText('No vino', { exact: true })).toHaveCount(1)
})

test('perfil: edita su nombre (en su ficha) y sale', async ({ page }) => {
  const c = await clienteConFicha('Nombre Viejo')
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Perfil' }).click()
  await expect(page.getByText(c.nacional)).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Agregar a inicio|Instalar|Cómo tenerla como app)$/ })).toBeVisible()

  await page.getByRole('button', { name: 'Editar nombre' }).click()
  const campo = page.getByLabel('Tu nombre')
  await campo.fill(' ')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Poné tu nombre (al menos 2 letras).')).toBeVisible()
  await campo.fill('Nombre Nuevo')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Listo: guardamos tu nombre.')).toBeVisible()
  await expect(page.getByText('Nombre Nuevo', { exact: true })).toBeVisible()
  const { data } = await servicio().from('clientes').select('nombre').eq('id', c.clienteId).single()
  expect(data!.nombre).toBe('Nombre Nuevo')

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('button', { name: 'Recibir código por WhatsApp' })).toBeVisible()
})
