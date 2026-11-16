// Refuerzos de seguridad agregados después de la primera ronda de tests de permisos.
import { expect, test } from '@playwright/test'
import { anonimo, aISO, CLAVE, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { esperarBloqueado, esperarError, esperarNada, ok, reservar } from './ayuda'
import { createClient } from '@supabase/supabase-js'

test.describe.configure({ mode: 'default' })

let m: Mundo
let cliente1Id: string
test.beforeAll(async () => {
  m = await prepararMundo()
  // cliente1 reserva una vez para tener ficha en A.
  await ok(reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: diaAR(2), hora: '10:00', nombre: 'Cliente Uno' }))
  const c = await ok(servicio().from('clientes').select('id').eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.cliente1.id).single())
  cliente1Id = (c as { id: string }).id
})
test.afterAll(async () => {
  await limpiarMundo(m)
})

test('las notas del negocio sobre un cliente son privadas: el staff las ve, el cliente no', async () => {
  await ok(m.usuarios.duenoA.db.from('notas_clientes').insert({ cliente_id: cliente1Id, negocio_id: m.negocioA.id, texto: 'Llega siempre tarde' }))
  const staff = await ok(m.usuarios.profesionalA.db.from('notas_clientes').select('texto').eq('cliente_id', cliente1Id))
  expect(staff).toEqual([{ texto: 'Llega siempre tarde' }])

  esperarNada(await m.usuarios.cliente1.db.from('notas_clientes').select('texto').eq('cliente_id', cliente1Id))
  esperarBloqueado(await m.usuarios.cliente1.db.from('notas_clientes').update({ texto: 'Puntual' }).eq('cliente_id', cliente1Id).select())
  esperarNada(await m.usuarios.duenoB.db.from('notas_clientes').select('texto'))
  esperarNada(await anonimo().from('notas_clientes').select('texto'))
})

test('el staff no puede crear una ficha de cliente atada a un usuario (solo fichas manuales)', async () => {
  esperarError(
    await m.usuarios.duenoA.db.from('clientes').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente2.id, nombre: 'Impostor' }),
  )
  await ok(m.usuarios.duenoA.db.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Cliente de mostrador' }))
})

test('un profesional carga turnos manuales, pero no puede inventar seña, origen "app" ni estados finales', async () => {
  const dia = diaAR(3)
  const ficha = await ok(m.usuarios.profesionalA.db.from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Walk-in' }).select('id').single())
  const base = {
    negocio_id: m.negocioA.id, cliente_id: (ficha as { id: string }).id, profesional_id: m.profesionales.p1,
    servicio_id: m.servicios.corteA, origen: 'manual',
  }
  const turno = (hora: string, extra = {}) => ({ ...base, inicio: aISO(dia, hora), fin: aISO(dia, hora.replace(':00', ':30')), ...extra })

  esperarError(await m.usuarios.profesionalA.db.from('turnos').insert(turno('15:00', { sena: 5000 })), 'carga_invalida')
  esperarError(await m.usuarios.profesionalA.db.from('turnos').insert(turno('16:00', { origen: 'app' })), 'carga_invalida')
  esperarError(await m.usuarios.profesionalA.db.from('turnos').insert(turno('17:00', { estado: 'asistio' })), 'carga_invalida')
  await ok(m.usuarios.profesionalA.db.from('turnos').insert(turno('18:00')))
})

test('un mail cargado como superadmin NO da permisos si la cuenta no está confirmada', async () => {
  const email = `sin-confirmar-${m.sufijo}@ejemplo.com`
  const adm = servicio()
  await ok(adm.from('superadmins').insert({ email }))
  const { data: u, error } = await adm.auth.admin.createUser({ email, password: CLAVE, email_confirm: false })
  expect(error).toBeNull()
  try {
    // Sin confirmar, ni siquiera puede iniciar sesión con contraseña…
    const db = createClient(process.env.SB_URL!, process.env.SB_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    const login = await db.auth.signInWithPassword({ email, password: CLAVE })
    if (!login.error) {
      // …y si la configuración lo permitiera, igual no es superadmin.
      esperarError(await db.from('negocios').insert({ slug: `x-${m.sufijo}`, config: { slug: `x-${m.sufijo}` } }))
    }
  } finally {
    await adm.from('superadmins').delete().eq('email', email)
    await adm.auth.admin.deleteUser(u!.user!.id)
  }
})

test('el visitante anónimo no tiene ningún permiso directo sobre las tablas privadas', async () => {
  for (const tabla of ['clientes', 'turnos', 'bloqueos', 'miembros', 'notas_clientes', 'superadmins']) {
    const r = await anonimo().from(tabla).select('*').limit(1)
    expect(r.error, `anónimo leyendo ${tabla}`).not.toBeNull()
  }
})
