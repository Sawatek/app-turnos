// App del cliente REAL sin sesión: ve el negocio, arma la reserva como invitado y recién al confirmar entra
// con el celular y el código (en la misma hoja, sin perder lo elegido). Compartir y calificación del negocio.
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import { borrarCelular, botonDia, nuevoTelefono, turnoDirecto, ultimoCodigo } from './ayuda'

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

const turnosDelCelular = async (e164: string) => {
  const { data: users } = await servicio().auth.admin.listUsers({ perPage: 1000 })
  const u = users.users.find((x) => x.phone === e164.slice(1))
  if (!u) return { usuario: null, turnos: [] }
  const { data: cli } = await servicio().from('clientes').select('id, nombre, telefono').eq('negocio_id', m.negocioA.id).eq('user_id', u.id).maybeSingle()
  if (!cli) return { usuario: u, cliente: null, turnos: [] }
  const { data } = await servicio().from('turnos').select('id, estado, inicio, profesional_id, servicio_id').eq('cliente_id', cli.id)
  return { usuario: u, cliente: cli, turnos: data ?? [] }
}

test('sin sesión ve el negocio: servicios con precios, próximo libre, ubicación y WhatsApp', async ({ page }) => {
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(page.getByText('Barbería · Pruebas').first()).toBeVisible()
  const servicios = page.getByRole('region', { name: 'Servicios' })
  await expect(servicios.getByRole('button', { name: /^Corte.*\$\s?12\.000/ })).toBeVisible()
  await expect(servicios.getByRole('button', { name: /^Color.*\$\s?25\.000/ })).toBeVisible()
  await expect(page.getByText('Próximo libre')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reservar este' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', /google\.com\/maps/)
  await expect(page.getByRole('link', { name: /Escribinos/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/5491100000000/)
  // Sin sesión no hay tarjeta de sellos ni pide el celular de entrada.
  await expect(page.getByRole('region', { name: 'Tu tarjeta' })).toHaveCount(0)
  await expect(page.getByLabel('Tu celular')).toHaveCount(0)
})

test('invitado: arma la reserva, entra con el código al confirmar, pone su nombre y queda reservado', async ({ page }) => {
  const tel = nuevoTelefono()
  telefonos.push(tel.e164)
  await page.goto(`/${m.negocioA.slug}`)

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Reservar' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await hoja.getByRole('button', { name: /^Corte/ }).click()
  await hoja.getByRole('button', { name: 'P2', exact: true }).click()
  const manana = diaAR(1)
  await hoja.getByRole('button', { name: botonDia(manana) }).click()
  await hoja.getByRole('group', { name: 'Mañana' }).getByRole('button', { name: '10:00' }).click()

  // Recién al confirmar pide el celular, en la misma hoja, con el aviso de privacidad.
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByText('Para reservar, entrá con tu celular.')).toBeVisible()
  await expect(hoja.getByText('Usamos tu celular para tus turnos y recordatorios por WhatsApp.')).toBeVisible()
  await expect(hoja.getByRole('link', { name: 'Ver privacidad' })).toHaveAttribute('href', '/privacidad')
  await expect(hoja.getByRole('link', { name: 'Términos' })).toHaveAttribute('href', '/terminos')
  await hoja.getByLabel('Tu celular').fill(tel.nacional)
  const antes = new Date().toISOString()
  await hoja.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
  const codigo = await ultimoCodigo(tel.e164, antes)
  await hoja.getByLabel('Código de 6 números').fill(codigo)

  // Es la primera vez: le pide el nombre. Lo elegido sigue ahí.
  const nombre = hoja.getByLabel('Tu nombre')
  await expect(nombre).toBeVisible()
  await expect(hoja.getByText(/^Mañana 10:00/)).toBeVisible()
  await nombre.fill('Inés Invitada')
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await expect(hoja.getByRole('heading', { name: '¡Listo, Inés!' })).toBeVisible()

  const r = await turnosDelCelular(tel.e164)
  expect(r.cliente).toMatchObject({ nombre: 'Inés Invitada', telefono: tel.e164 })
  expect(r.turnos).toHaveLength(1)
  expect(r.turnos[0]).toMatchObject({ estado: 'pendiente', profesional_id: m.profesionales.p2, servicio_id: m.servicios.corteA })
  expect(new Date(r.turnos[0]!.inicio).toISOString()).toBe(aISO(manana, '10:00'))
  // El nombre quedó también en su cuenta.
  expect(r.usuario?.user_metadata?.display_name).toBe('Inés Invitada')

  // Ya adentro: Mis turnos muestra el turno.
  await hoja.getByRole('button', { name: 'Mis turnos' }).click()
  await expect(page.getByRole('article', { name: /^Turno de Corte/ })).toHaveCount(1)
})

test('invitado con cuenta (ya tiene nombre): entra al confirmar y reserva sin que le pidan nada más', async ({ page }) => {
  const tel = nuevoTelefono()
  telefonos.push(tel.e164)
  const { error } = await servicio().auth.admin.createUser({ phone: tel.e164, phone_confirm: true, user_metadata: { display_name: 'Rocío Cuenta' } })
  expect(error).toBeNull()
  await page.goto(`/${m.negocioA.slug}`)

  await page.getByRole('button', { name: 'Reservar este' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await hoja.getByRole('button', { name: 'Confirmar turno' }).click()
  await hoja.getByLabel('Tu celular').fill(tel.nacional)
  const antes = new Date().toISOString()
  await hoja.getByRole('button', { name: 'Recibir código por WhatsApp' }).click()
  await hoja.getByLabel('Código de 6 números').fill(await ultimoCodigo(tel.e164, antes))
  await expect(hoja.getByRole('heading', { name: '¡Listo, Rocío!' })).toBeVisible()
  await expect(hoja.getByLabel('Tu nombre')).toHaveCount(0)

  const r = await turnosDelCelular(tel.e164)
  expect(r.cliente).toMatchObject({ nombre: 'Rocío Cuenta' })
  expect(r.turnos).toHaveLength(1)
})

test('compartir: usa la hoja nativa del celular con el link del negocio', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { compartido?: ShareData }
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (d: ShareData) => {
        w.compartido = d
      },
    })
  })
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('button', { name: 'Compartir Negocio A' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { compartido?: ShareData }).compartido?.url)).toBe(`${baseURL}/${m.negocioA.slug}`)
})

test('compartir: si el navegador no sabe compartir, copia el link y lo avisa', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { copiado?: string }
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          w.copiado = t
        },
      },
    })
  })
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('button', { name: 'Compartir Negocio A' }).click()
  await expect(page.getByText('Copiamos el link.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { copiado?: string }).copiado)).toBe(`${baseURL}/${m.negocioA.slug}`)
})

test('la calificación del negocio aparece recién con 3 opiniones', async ({ page }) => {
  const adm = servicio()
  const { data: ficha } = await adm.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Opina Mucho' }).select('id').single()
  const calificar = async (dias: number, puntaje: number) => {
    const turno = await turnoDirecto({
      negocioId: m.negocioA.id, clienteId: ficha!.id, profesionalId: m.profesionales.p1, servicioId: m.servicios.corteA,
      inicio: aISO(diaAR(-dias), '10:00'), estado: 'asistio',
    })
    const { error } = await adm.from('resenas').insert({ negocio_id: m.negocioA.id, turno_id: turno, cliente_id: ficha!.id, puntaje })
    expect(error).toBeNull()
  }
  await calificar(3, 5)
  await calificar(4, 4)
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Negocio A' })).toBeVisible()
  await expect(page.getByText(/opiniones/)).toHaveCount(0)

  await calificar(5, 4)
  await page.reload()
  await expect(page.getByLabel('Calificación: 4,3 de 5, con 3 opiniones')).toBeVisible()
})
