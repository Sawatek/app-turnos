// App del cliente REAL: lista de espera ("Avisame si se libera") y calificar un turno.
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../../soporte/mundo'
import { expect, test } from '../ayudantes'
import { botonDia, crearClienteCelular, entrarComo, fichaEn, turnoDirecto, type ClienteCelular } from './ayuda'

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

async function clienteConFicha(nombre: string) {
  const c = await crearClienteCelular()
  creados.push(c)
  return { ...c, clienteId: await fichaEn(m.negocioA.id, c.id, nombre, c.tel) }
}

test('lista de espera: se anota en un día lleno, otro cancela, se encola el aviso y lo puede borrar', async ({ page }) => {
  const c = await clienteConFicha('Esteban Espera')
  const D = diaAR(3)
  const adm = servicio()
  // Otro cliente tiene un turno ese día, y el resto del día está bloqueado: el día queda "lleno".
  const otro = await fichaEn(m.negocioA.id, m.usuarios.cliente2.id, 'Otra Persona')
  const turnoOtro = await turnoDirecto({ negocioId: m.negocioA.id, clienteId: otro, profesionalId: m.profesionales.p1, servicioId: m.servicios.corteA, inicio: aISO(D, '10:00') })
  const { error: eb } = await adm.from('bloqueos').insert({ negocio_id: m.negocioA.id, rango: `[${aISO(D, '00:00')},${aISO(D, '23:59')})`, motivo: 'Lleno' })
  expect(eb).toBeNull()

  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Esteban' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Reservar' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo turno' })
  await hoja.getByRole('button', { name: /^Corte/ }).click()
  await hoja.getByRole('button', { name: 'Cualquiera' }).click()
  const dia = hoja.getByRole('button', { name: botonDia(D) })
  await expect(dia).toHaveAccessibleName(/sin lugar/)
  await dia.click()
  await expect(hoja.getByText('No quedan horarios este día.')).toBeVisible()
  await hoja.getByRole('button', { name: 'Avisame si se libera' }).click()
  await expect(hoja.getByRole('heading', { name: '¡Te anotamos!' })).toBeVisible()

  const { data: filas } = await adm.from('lista_espera').select('id, dia, servicio_id, profesional_id').eq('cliente_id', c.clienteId)
  expect(filas).toEqual([{ id: expect.any(String), dia: D, servicio_id: m.servicios.corteA, profesional_id: null }])

  await hoja.getByRole('button', { name: 'Mis turnos' }).click()
  const seccion = page.getByRole('region', { name: 'Te avisamos si se libera' })
  await expect(seccion.getByText('Corte', { exact: true })).toBeVisible()

  // El otro cliente cancela: se encola UN aviso por WhatsApp para el anotado, con el link a la app.
  const { error } = await m.usuarios.cliente2.db.rpc('cancelar_turno', { p_turno: turnoOtro })
  expect(error).toBeNull()
  const { data: avisos } = await adm.from('mensajes').select('tipo, canal, destino, estado, contenido').eq('cliente_id', c.clienteId).eq('tipo', 'aviso')
  expect(avisos).toHaveLength(1)
  const aviso = avisos![0]!
  expect(aviso).toMatchObject({ canal: 'whatsapp', destino: c.tel.slice(1), estado: 'pendiente' })
  const contenido = aviso.contenido as { motivo: string; slug: string; texto: string }
  expect(contenido.motivo).toBe('lista_espera')
  expect(contenido.slug).toBe(m.negocioA.slug)
  expect(contenido.texto).toContain('Se liberó un horario de Corte')
  expect(contenido.texto).toContain('a las 10:00 en Negocio A')
  expect(contenido.texto).toContain('{link}')

  // En la app se ve que ya le avisamos, y la borra.
  await page.reload()
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()
  await expect(seccion.getByText('Ya te avisamos', { exact: false })).toBeVisible()
  await seccion.getByRole('button', { name: /^Borrar aviso de Corte/ }).click()
  await expect(page.getByText('ya no te avisamos por ese día', { exact: false })).toBeVisible()
  await expect(seccion).toHaveCount(0)
  expect((await adm.from('lista_espera').select('id').eq('cliente_id', c.clienteId)).data).toEqual([])
})

test('calificar: solo un turno al que vino (no uno pendiente), una vez, de 1 a 5 con comentario', async ({ page }) => {
  const c = await clienteConFicha('Carla Califica')
  const base = { negocioId: m.negocioA.id, clienteId: c.clienteId, profesionalId: m.profesionales.p1, servicioId: m.servicios.corteA }
  const asistido = await turnoDirecto({ ...base, inicio: aISO(diaAR(-4), '10:00'), estado: 'asistio' })
  await turnoDirecto({ ...base, inicio: aISO(diaAR(-2), '11:00'), estado: 'pendiente' })
  await entrarComo(page, c)
  await page.goto(`/${m.negocioA.slug}`)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Mis turnos' }).click()

  const historial = page.getByRole('region', { name: 'Historial' })
  await expect(historial.getByText('Pasado')).toBeVisible()
  await expect(historial.getByRole('button', { name: 'Calificar' })).toHaveCount(1)
  await historial.getByRole('button', { name: 'Calificar' }).click()

  const hoja = page.getByRole('dialog', { name: '¿Cómo te fue?' })
  await hoja.getByRole('button', { name: 'Enviar calificación' }).click()
  await expect(hoja.getByText('Elegí de 1 a 5 estrellas.')).toBeVisible()
  await hoja.getByRole('radio', { name: '4 estrellas' }).check({ force: true })
  await expect(hoja.getByText('Muy bien')).toBeVisible()
  await hoja.getByLabel('Comentario (opcional)').fill('  Muy bueno el corte  ')
  await hoja.getByRole('button', { name: 'Enviar calificación' }).click()
  await expect(hoja).toBeHidden()
  await expect(page.getByText('¡Gracias por calificar!', { exact: false })).toBeVisible()
  await expect(historial.getByText('4 de 5')).toBeVisible()
  await expect(historial.getByRole('button', { name: 'Calificar' })).toHaveCount(0)

  const { data } = await servicio().from('resenas').select('turno_id, cliente_id, negocio_id, puntaje, comentario').eq('cliente_id', c.clienteId)
  expect(data).toEqual([{ turno_id: asistido, cliente_id: c.clienteId, negocio_id: m.negocioA.id, puntaje: 4, comentario: 'Muy bueno el corte' }])
})
