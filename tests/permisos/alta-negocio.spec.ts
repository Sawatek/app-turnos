// Alta de un negocio REAL por SawaTek (crear_negocio_real) y aceptación de la invitación del dueño.
import { expect, test } from '@playwright/test'
import { negocioDesdePlantilla } from '../../src/plantillas/rubros'
import { crearUsuario, limpiarMundo, prepararMundo, servicio, type Mundo, type Usuario } from '../soporte/mundo'
import { esperarError } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
let dueno: Usuario
const creados: string[] = []

test.beforeAll(async () => {
  m = await prepararMundo()
  dueno = await crearUsuario(`dueno-real-${m.sufijo}@ejemplo.com`)
})
test.afterAll(async () => {
  const adm = servicio()
  if (creados.length) await adm.from('negocios').delete().in('id', creados)
  await adm.auth.admin.deleteUser(dueno.id)
  await limpiarMundo(m)
})

const configBarberia = (slug: string) => negocioDesdePlantilla('barberia', { nombre: 'Barbería Real', slug })

test('SawaTek crea un negocio real desde la plantilla, con servicios, equipo, horarios e invitación', async () => {
  const slug = `real-${m.sufijo}`
  const { data: id, error } = await m.usuarios.superadmin.db.rpc('crear_negocio_real', {
    p_slug: slug,
    p_config: configBarberia(slug),
    p_email_dueno: dueno.email.toUpperCase(),
  })
  expect(error).toBeNull()
  creados.push(id as string)

  const adm = servicio()
  const neg = (await adm.from('negocios').select('es_demo, estado, intervalo_min, config').eq('id', id).single()).data!
  expect(neg).toMatchObject({ es_demo: false, estado: 'activo', intervalo_min: 15 })
  expect((neg.config as { slug: string }).slug).toBe(slug)

  const servicios = (await adm.from('servicios').select('nombre').eq('negocio_id', id)).data!
  const profesionales = (await adm.from('profesionales').select('id, nombre').eq('negocio_id', id)).data!
  const horarios = (await adm.from('horarios').select('dia, desde, hasta').eq('negocio_id', id)).data!
  expect(servicios.map((s) => s.nombre)).toEqual(expect.arrayContaining(['Corte', 'Barba', 'Corte + barba', 'Color / mechas']))
  expect(profesionales).toHaveLength(2)
  // Barbería: lunes a sábado, con descanso 13–14 → 2 franjas por día y por profesional.
  expect(horarios).toHaveLength(2 * 6 * 2)
  expect(horarios).toEqual(expect.arrayContaining([{ dia: 1, desde: '09:00:00', hasta: '13:00:00' }, { dia: 1, desde: '14:00:00', hasta: '20:00:00' }]))

  const inv = (await adm.from('invitaciones').select('email, rol, aceptada').eq('negocio_id', id)).data!
  expect(inv).toEqual([{ email: dueno.email, rol: 'dueno', aceptada: null }])

  // Ya se pueden pedir horarios libres para mañana (si mañana abre).
  const { error: e2 } = await m.usuarios.cliente1.db.rpc('horarios_libres', {
    p_negocio: id as string,
    p_servicio: (await adm.from('servicios').select('id').eq('negocio_id', id).eq('nombre', 'Corte').single()).data!.id,
    p_dia: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  })
  expect(e2).toBeNull()
})

test('el dueño invitado entra, acepta la invitación y queda como dueño de ESE negocio', async () => {
  const id = creados[0]!
  const { data: n } = await dueno.db.rpc('aceptar_invitaciones')
  expect(n).toBe(1)
  expect((await dueno.db.rpc('rol_en', { p_negocio: id })).data).toBe('dueno')
  const mios = (await dueno.db.rpc('mis_negocios')).data as { id: string; rol: string }[]
  expect(mios).toEqual([expect.objectContaining({ id, rol: 'dueno' })])
  // Aceptar de nuevo no duplica nada.
  expect((await dueno.db.rpc('aceptar_invitaciones')).data).toBe(0)
  // Y puede editar su catálogo.
  const { error } = await dueno.db.from('servicios').update({ precio: 13000 }).eq('negocio_id', id).eq('nombre', 'Corte')
  expect(error).toBeNull()
})

test('solo SawaTek puede crear negocios reales', async () => {
  for (const u of [m.usuarios.duenoA, m.usuarios.cliente1]) {
    esperarError(
      await u.db.rpc('crear_negocio_real', { p_slug: `x-${m.sufijo}`, p_config: configBarberia(`x-${m.sufijo}`), p_email_dueno: 'a@b.com' }),
      'solo_superadmin',
    )
  }
  esperarError(
    await m.usuarios.superadmin.db.rpc('crear_negocio_real', { p_slug: `y-${m.sufijo}`, p_config: configBarberia(`y-${m.sufijo}`), p_email_dueno: 'no-es-un-mail' }),
    'mail_invalido',
  )
})
