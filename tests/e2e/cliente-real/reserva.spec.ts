// App del cliente REAL: reservar contra la base (Supabase local), con todos sus errores.
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import { botonDia, crearClienteCelular, entrarComo, ERROR_HTTP, type ClienteCelular } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const creados: ClienteCelular[] = []
const nuevoCliente = async () => {
  const c = await crearClienteCelular()
  creados.push(c)
  return c
}

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
  await Promise.all(creados.map((c) => servicio().auth.admin.deleteUser(c.id)))
})

const turnosDe = async (userId: string) => {
  const { data: cli } = await servicio().from('clientes').select('id').eq('negocio_id', m.negocioA.id).eq('user_id', userId).maybeSingle()
  if (!cli) return []
  const { data } = await servicio().from('turnos').select('id, estado, inicio, profesional_id, servicio_id').eq('cliente_id', cli.id).order('inicio')
  return data ?? []
}

test('reserva completa (servicio → profesional → día → hora), aparece en Mis turnos, confirma y cancela', async ({ page }) => {
  const c = await nuevoCliente()
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: '¡Hola!' })).toBeVisible()
  await expect(page.getByText('Próximo libre')).toBeVisible()

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Reservar' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await expect(hoja).toBeVisible()

  await hoja.getByRole('button', { name: /^Corte/ }).click()
  // Corte lo hacen P1 y P2.
  await expect(hoja.getByRole('button', { name: 'P1', exact: true })).toBeVisible()
  await hoja.getByRole('button', { name: 'P2', exact: true }).click()
  const manana = diaAR(1)
  await hoja.getByRole('button', { name: botonDia(manana) }).click()
  await hoja.getByRole('group', { name: 'Mañana' }).getByRole('button', { name: '10:00' }).click()

  // La primera vez pide el nombre (y no deja seguir sin él).
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByText('Poné tu nombre así te reconocen en el local.')).toBeVisible()
  await hoja.getByLabel('Tu nombre').fill('Martina Real')
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByRole('heading', { name: '¡Listo, Martina!' })).toBeVisible()
  await expect(hoja.getByRole('article', { name: /^Turno de Corte/ })).toContainText('P2')

  // En la base: pendiente, con P2, mañana a las 10.
  let turnos = await turnosDe(c.id)
  expect(turnos).toHaveLength(1)
  expect(turnos[0]).toMatchObject({ estado: 'pendiente', profesional_id: m.profesionales.p2, servicio_id: m.servicios.corteA })
  expect(new Date(turnos[0]!.inicio).toISOString()).toBe(aISO(manana, '10:00'))
  const { data: ficha } = await servicio().from('clientes').select('nombre, telefono').eq('negocio_id', m.negocioA.id).eq('user_id', c.id).single()
  expect(ficha).toEqual({ nombre: 'Martina Real', telefono: c.tel })

  // Mis turnos.
  await hoja.getByRole('button', { name: 'Mis turnos' }).click()
  await expect(hoja).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: 'Mis turnos' })).toBeVisible()
  const pase = page.getByRole('article', { name: /^Turno de Corte/ })
  await expect(pase).toHaveCount(1)
  await expect(pase.getByText('Sin confirmar')).toBeVisible()
  await expect(pase.getByText('Podés cancelarlo o cambiarlo hasta 2 horas antes.')).toBeVisible()

  // Confirmar asistencia.
  await pase.getByRole('button', { name: 'Confirmar asistencia' }).click()
  await expect(pase.getByText('Confirmado')).toBeVisible()
  await expect(page.getByText(/confirmaste tu turno/)).toBeVisible()
  turnos = await turnosDe(c.id)
  expect(turnos[0]!.estado).toBe('confirmado')

  // Cancelar.
  await pase.getByRole('button', { name: 'Cancelar' }).click()
  const confirmar = page.getByRole('dialog', { name: '¿Cancelar el turno?' })
  await expect(confirmar.getByText('Se puede cancelar hasta 2 horas antes del turno.')).toBeVisible()
  await confirmar.getByRole('button', { name: 'Sí, cancelar' }).click()
  await expect(confirmar).toBeHidden()
  await expect(page.getByText('No tenés turnos próximos')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Historial' }).getByText('Cancelado')).toBeVisible()
  turnos = await turnosDe(c.id)
  expect(turnos[0]!.estado).toBe('cancelado')
})

test('si otro cliente toma el horario antes de confirmar: lo avisa, refresca y pide otro', async ({ page, errores }) => {
  errores.permitir(ERROR_HTTP)
  const c = await nuevoCliente()
  // Ya es cliente del negocio: no le pide el nombre.
  await servicio().from('clientes').insert({ negocio_id: m.negocioA.id, user_id: c.id, nombre: 'Lucía Apuro', telefono: c.tel })
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Lucía' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Reservar' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  // Color lo hace solo P1: con "Cualquiera" no hay otro profesional que lo salve.
  await hoja.getByRole('button', { name: /^Color/ }).click()
  await expect(hoja.getByRole('button', { name: 'P2', exact: true })).toHaveCount(0)
  await hoja.getByRole('button', { name: 'Cualquiera' }).click()
  const dia = diaAR(2)
  await hoja.getByRole('button', { name: botonDia(dia) }).click()
  const manana = hoja.getByRole('group', { name: 'Mañana' })
  await manana.getByRole('button', { name: '11:00' }).click()
  await expect(hoja.getByLabel('Tu nombre')).toHaveCount(0)

  // Mientras tanto, otra persona lo reserva.
  const otro = await m.usuarios.cliente2.db.rpc('reservar_turno', {
    p_negocio: m.negocioA.id, p_servicio: m.servicios.colorA, p_inicio: aISO(dia, '11:00'), p_nombre: 'Otra persona',
  })
  expect(otro.error).toBeNull()

  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByRole('alert')).toContainText('Ese horario se acaba de ocupar')
  // Se refrescaron los horarios: el de las 11 ya no está y no hay nada elegido.
  await expect(manana.getByRole('button', { name: '11:00' })).toHaveCount(0)
  await expect(hoja.getByRole('button', { name: 'Confirmar turno' })).toHaveCount(0)
  expect(await turnosDe(c.id)).toHaveLength(0)

  // Elige otro y sale.
  await manana.getByRole('button', { name: '09:00' }).click()
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByRole('heading', { name: '¡Listo, Lucía!' })).toBeVisible()
  const turnos = await turnosDe(c.id)
  expect(turnos.map((t) => new Date(t.inicio).toISOString())).toEqual([aISO(dia, '09:00')])
})

test('con 3 turnos por delante no deja sacar otro y explica por qué', async ({ page, errores }) => {
  errores.permitir(ERROR_HTTP)
  const c = await nuevoCliente()
  for (const [i, hora] of ['10:00', '10:30', '11:00'].entries()) {
    const r = await c.db.rpc('reservar_turno', {
      p_negocio: m.negocioA.id, p_servicio: m.servicios.corteA, p_inicio: aISO(diaAR(3), hora), p_profesional: m.profesionales.p1, p_nombre: 'Tomás Tres',
    })
    expect(r.error, `turno ${i}`).toBeNull()
  }
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Tomás' })).toBeVisible()

  // Desde el "Próximo libre": un toque y confirmar.
  await page.getByRole('button', { name: 'Reservar este' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByRole('alert')).toContainText('Ya tenés 3 turnos por delante')
  expect(await turnosDe(c.id)).toHaveLength(3)

  await hoja.getByRole('button', { name: 'Cerrar' }).click()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()
  await expect(page.getByRole('article', { name: /^Turno de Corte/ })).toHaveCount(3)
})

test('si el negocio tiene seña, avisa que se paga en el local', async ({ page }) => {
  const c = await nuevoCliente()
  const { data: neg } = await servicio().from('negocios').select('config').eq('id', m.negocioA.id).single()
  await servicio().from('negocios').update({ config: { ...(neg!.config as object), sena: 5000 } }).eq('id', m.negocioA.id)
  try {
    await entrarComo(page, c)
    await page.goto(`/${m.negocioA.slug}`)
    await page.getByRole('button', { name: 'Reservar este' }).click()
    const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
    await expect(hoja.getByText('La seña se paga en el local.', { exact: false })).toBeVisible()
  } finally {
    await servicio().from('negocios').update({ config: neg!.config }).eq('id', m.negocioA.id)
  }
})
