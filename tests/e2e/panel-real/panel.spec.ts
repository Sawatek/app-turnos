// Panel REAL (fase 2) contra la Supabase LOCAL: dueño, profesional, sin acceso e invitaciones.
// Un mundo aislado por archivo; los tests corren en orden en un mismo worker.
import type { Page } from '@playwright/test'
import { aISO, CLAVE, crearUsuario, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo, type Usuario } from '../../soporte/mundo'
import { crearCliente, crearTurno } from '../../permisos/ayuda'
import { expect, sinErrores, test, vigilar } from '../ayudantes'

test.describe.configure({ mode: 'default' })

let m: Mundo
let invitado: Usuario | undefined

test.beforeAll(async () => {
  m = await prepararMundo()
})
test.afterAll(async () => {
  await limpiarMundo(m)
  if (invitado) await servicio().auth.admin.deleteUser(invitado.id)
})

async function entrar(page: Page, email: string, seccion = '') {
  await page.goto(`/${m.negocioA.slug}/panel${seccion}`)
  await page.getByLabel('Tu mail').fill(email)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Secciones del panel' })

async function irAlDia(page: Page, dia: string) {
  await page.getByLabel('Ir a una fecha').fill(dia)
}

test('el dueño crea un servicio, edita un horario, carga un turno manual y lo marca "vino"', async ({ page }) => {
  const D = diaAR(2)
  const servicioNuevo = `Barba ${m.sufijo}`
  const clienteNuevo = `Rocío ${m.sufijo}`
  const adm = servicio()

  await entrar(page, m.usuarios.duenoA.email)
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(nav(page).getByRole('link')).toHaveText(['Agenda', 'Clientes', 'Servicios', 'Equipo', 'Horarios', 'Ajustes'])

  // --- Servicio nuevo ---
  await nav(page).getByRole('link', { name: 'Servicios' }).click()
  await expect(page).toHaveURL(new RegExp(`/${m.negocioA.slug}/panel/servicios$`))
  await page.getByRole('button', { name: 'Nuevo servicio' }).click()
  const hojaServicio = page.getByRole('dialog', { name: 'Nuevo servicio' })
  await hojaServicio.getByLabel('Nombre del servicio').fill(servicioNuevo)
  await hojaServicio.getByLabel('Duración (minutos)').fill('20')
  await hojaServicio.getByLabel('Precio ($)').fill('5000')
  await hojaServicio.getByRole('button', { name: 'Crear servicio' }).click()
  await expect(hojaServicio).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Lista de servicios' }).getByText(servicioNuevo)).toBeVisible()
  const { data: serv } = await adm.from('servicios').select('minutos, precio, activo').eq('negocio_id', m.negocioA.id).eq('nombre', servicioNuevo).single()
  expect(serv).toEqual({ minutos: 20, precio: 5000, activo: true })

  // --- Horario: P1 los lunes a la tarde termina a las 19 ---
  await nav(page).getByRole('link', { name: 'Horarios' }).click()
  await expect(page.getByRole('heading', { name: 'Semana de P1' })).toBeVisible()
  await page.getByLabel('Lunes, franja 2: hasta').fill('19:00')
  await page.getByRole('button', { name: 'Guardar horarios' }).click()
  await expect(page.getByText('Horarios guardados')).toBeVisible()
  const { data: lunes } = await adm.from('horarios').select('desde, hasta').eq('profesional_id', m.profesionales.p1).eq('dia', 1).order('desde')
  expect(lunes).toEqual([
    { desde: '09:00:00', hasta: '13:00:00' },
    { desde: '14:00:00', hasta: '19:00:00' },
  ])

  // --- Turno manual con cliente nuevo, en un horario libre ---
  await nav(page).getByRole('link', { name: 'Agenda' }).click()
  await irAlDia(page, D)
  await page.getByRole('button', { name: 'Cargar turno' }).click()
  const hoja = page.getByRole('dialog', { name: 'Cargar turno' })
  await hoja.getByRole('button', { name: 'Cliente nuevo' }).click()
  await hoja.getByLabel('Nombre del cliente').fill(clienteNuevo)
  await hoja.getByLabel('Servicio').selectOption(m.servicios.corteA)
  await hoja.getByLabel('Profesional').selectOption({ label: 'P1' })
  await hoja.getByRole('button', { name: '10:00', exact: true }).click()
  await expect(hoja.getByLabel('Hora del turno')).toHaveValue('10:00')
  await hoja.getByRole('button', { name: 'Guardar turno' }).click()
  await expect(hoja).toHaveCount(0)

  const fila = page.getByRole('button', { name: `Turno de ${clienteNuevo} a las 10:00` })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('Confirmado')
  const { data: turno } = await adm
    .from('turnos')
    .select('id, inicio, estado, origen, profesional_id, clientes(nombre)')
    .eq('negocio_id', m.negocioA.id)
    .eq('inicio', aISO(D, '10:00'))
    .single()
  expect(turno).toMatchObject({ estado: 'confirmado', origen: 'manual', profesional_id: m.profesionales.p1, clientes: { nombre: clienteNuevo } })

  // --- Vino ---
  await fila.click()
  const detalle = page.getByRole('dialog', { name: `Turno de ${clienteNuevo}` })
  await detalle.getByRole('button', { name: 'Vino', exact: true }).click()
  await expect(detalle).toHaveCount(0)
  await expect(fila).toContainText('Vino')
  await expect.poll(async () => (await adm.from('turnos').select('estado').eq('id', turno!.id).single()).data?.estado).toBe('asistio')
})

test('si el turno choca con otro del mismo profesional, se muestra un error entendible', async ({ page, errores }) => {
  // La base rechaza el alta (la restricción de superposición responde 400): el navegador lo loguea, la app lo explica.
  errores.permitir(/status of 400/)
  const D = diaAR(2)
  const nombre = `Choque ${m.sufijo}`
  const c = await crearCliente(m.negocioA.id, nombre)
  await crearTurno({ negocio: m.negocioA.id, cliente: c, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(D, '11:00') })

  await entrar(page, m.usuarios.duenoA.email)
  await irAlDia(page, D)
  await expect(page.getByRole('button', { name: `Turno de ${nombre} a las 11:00` })).toBeVisible()
  await page.getByRole('button', { name: 'Cargar turno' }).click()
  const hoja = page.getByRole('dialog', { name: 'Cargar turno' })
  await hoja.getByLabel('Buscar cliente').fill(nombre)
  await hoja.getByRole('list', { name: 'Clientes encontrados' }).getByRole('button', { name: new RegExp(nombre) }).click()
  await hoja.getByLabel('Profesional').selectOption({ label: 'P2' })
  // 11:00 no aparece entre los libres de P2, pero se puede escribir a mano.
  await expect(hoja.getByRole('button', { name: '11:00', exact: true })).toHaveCount(0)
  await hoja.getByLabel('Hora del turno').fill('11:15')
  await hoja.getByRole('button', { name: 'Guardar turno' }).click()
  await expect(hoja.getByText('Ese horario se superpone con otro turno del mismo profesional. Elegí otro horario.')).toBeVisible()
  const { count } = await servicio().from('turnos').select('id', { count: 'exact', head: true }).eq('cliente_id', c)
  expect(count).toBe(1)
})

test('el profesional ve SOLO sus turnos, no ve las secciones del dueño, bloquea su horario y recibe turnos en vivo', async ({ page }) => {
  const D = diaAR(3)
  const deP1 = `Cliente de P1 ${m.sufijo}`
  const deP2 = `Cliente de P2 ${m.sufijo}`
  const enVivo = `En vivo ${m.sufijo}`
  const [c1, c2, c3] = await Promise.all([crearCliente(m.negocioA.id, deP1), crearCliente(m.negocioA.id, deP2), crearCliente(m.negocioA.id, enVivo)])
  await crearTurno({ negocio: m.negocioA.id, cliente: c1, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: aISO(D, '10:00') })
  await crearTurno({ negocio: m.negocioA.id, cliente: c2, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(D, '10:00') })

  // Aunque entre por el link de una sección del dueño, ve su agenda.
  await entrar(page, m.usuarios.profesionalA.email, '/clientes')
  await expect(page.getByRole('heading', { level: 1, name: 'Tu agenda' })).toBeVisible()
  await expect(nav(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Clientes' })).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Filtrar por profesional' })).toHaveCount(0)

  await irAlDia(page, D)
  await expect(page.getByRole('button', { name: `Turno de ${deP1} a las 10:00` })).toBeVisible()
  await expect(page.getByText(deP2)).toHaveCount(0)

  // Bloquea un rato de su agenda.
  await page.getByRole('button', { name: 'Bloquear', exact: true }).click()
  const hoja = page.getByRole('dialog', { name: 'Bloquear horario' })
  await expect(hoja.getByText('Bloqueo de tu agenda (P1).')).toBeVisible()
  await hoja.getByLabel('Desde la hora').fill('16:00')
  await hoja.getByLabel('Hasta la hora').fill('17:00')
  await hoja.getByLabel('Motivo (opcional, privado)').fill('Dentista')
  await hoja.getByRole('button', { name: 'Bloquear', exact: true }).click()
  await expect(hoja).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Agenda' }).getByText('Bloqueado · 16:00 – 17:00')).toBeVisible()
  const { data: bloqueos } = await servicio().from('bloqueos').select('profesional_id, motivo').eq('negocio_id', m.negocioA.id).eq('motivo', 'Dentista')
  expect(bloqueos).toEqual([{ profesional_id: m.profesionales.p1, motivo: 'Dentista' }])

  // Un turno nuevo (por ejemplo, desde la app del cliente) aparece sin recargar.
  await crearTurno({ negocio: m.negocioA.id, cliente: c3, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: aISO(D, '12:00') })
  await expect(page.getByRole('button', { name: `Turno de ${enVivo} a las 12:00` })).toBeVisible({ timeout: 10_000 })
})

test('un usuario que no es del equipo ve "No tenés acceso" y puede salir', async ({ page }) => {
  await entrar(page, m.usuarios.cliente1.email)
  await expect(page.getByRole('heading', { name: 'No tenés acceso a este negocio' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Agenda' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('el dueño invita a un mail y, al entrar, esa persona queda como profesional', async ({ page, browser }) => {
  invitado = await crearUsuario(`invitado-${m.sufijo}@ejemplo.com`)

  await entrar(page, m.usuarios.duenoA.email, '/equipo')
  await expect(page.getByRole('heading', { name: 'Equipo' })).toBeVisible()
  const tarjeta = page.getByRole('region', { name: 'Invitar a un profesional' })
  await tarjeta.getByLabel('Mail del profesional').fill(invitado.email.toUpperCase())
  await tarjeta.getByLabel('Es la agenda de').selectOption({ label: 'P2' })
  await tarjeta.getByRole('button', { name: 'Invitar' }).click()
  await expect(tarjeta.getByText(`Listo: cuando ${invitado.email} entre al panel, va a ver su agenda.`)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Invitaciones pendientes' }).getByText(invitado.email)).toBeVisible()

  // La persona invitada entra desde otro dispositivo.
  const ctx = await browser.newContext()
  try {
    const otra = await ctx.newPage()
    const v = vigilar(otra, 'invitado')
    await otra.goto(`/${m.negocioA.slug}/panel`)
    await otra.getByLabel('Tu mail').fill(invitado.email)
    await otra.getByLabel('Contraseña').fill(CLAVE)
    await otra.getByRole('button', { name: 'Entrar' }).click()
    await expect(otra.getByRole('heading', { level: 1, name: 'Tu agenda' })).toBeVisible()
    await expect(otra.getByText('Profesional ·', { exact: false })).toBeVisible()
    sinErrores(v)
  } finally {
    await ctx.close()
  }

  const adm = servicio()
  const { data: miembro } = await adm.from('miembros').select('rol').eq('negocio_id', m.negocioA.id).eq('user_id', invitado.id).single()
  expect(miembro).toEqual({ rol: 'profesional' })
  const { data: p2 } = await adm.from('profesionales').select('user_id').eq('id', m.profesionales.p2).single()
  expect(p2).toEqual({ user_id: invitado.id })

  // Para el dueño, la invitación ya no está pendiente y la persona figura con acceso.
  await page.reload()
  await expect(page.getByRole('list', { name: 'Miembros' }).getByText(invitado.email)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Invitaciones pendientes' })).toHaveCount(0)
})
