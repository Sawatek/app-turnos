// Mensajes salientes (fase 4): funciones del servidor (despachador y webhook de WhatsApp) y suscripciones push.
// tomar_mensajes / registrar_envio / confirmar_por_whatsapp / pedir_cambio_por_whatsapp: SOLO la clave secreta.
import { expect, test } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { crearTurno, dentroDe, esperarError, esperarNada, leer, ok, vaciarAgenda } from './ayuda'

test.describe.configure({ mode: 'default' })

interface FilaMensaje {
  id: string
  tipo: string
  canal: string
  destino: string
  estado: string
  intentos: number
  programado: string
  enviado: string | null
  proveedor_id: string | null
  error: string | null
  contenido: Record<string, string>
}

const D = () => diaAR(3)
const TEL1 = '5491112345679' // celular de la cuenta de cliente1 (distinto al de otros archivos: el celular es único)

let m: Mundo
let cli1: string

const mensajesDe = async (turno: string) =>
  (await ok(servicio().from('mensajes').select('*').eq('turno_id', turno).order('creado'))) as FilaMensaje[]

async function reservar(db: SupabaseClient, hora: string, dia = D()) {
  const r = await db.rpc('reservar_turno', {
    p_negocio: m.negocioA.id,
    p_servicio: m.servicios.corteA,
    p_inicio: aISO(dia, hora),
    p_profesional: m.profesionales.p1,
    p_nombre: 'Cliente',
  })
  expect(r.error).toBeNull()
  return r.data as string
}

/** Suscripción push de mentira (formato válido; nunca se manda de verdad en estos tests). */
const suscripcion = (n: number) => ({
  p_endpoint: `https://fcm.googleapis.com/fcm/send/prueba-${m.sufijo}-${n}`,
  p_p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  p_auth: 'tBHItJI5svbpez7KI4CCXg',
})

test.beforeAll(async () => {
  m = await prepararMundo()
  cli1 = (
    (await ok(
      servicio()
        .from('clientes')
        .insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente1.id, nombre: 'Ana Pérez', telefono: '11 1234-5679' })
        .select('id')
        .single(),
    )) as { id: string }
  ).id
  // Los WhatsApp de una ficha con cuenta salen al celular verificado de la cuenta.
  const { error } = await servicio().auth.admin.updateUserById(m.usuarios.cliente1.id, { phone: TEL1 })
  if (error) throw error
})
test.afterAll(async () => {
  await limpiarMundo(m)
})
test.beforeEach(async () => {
  await vaciarAgenda(m)
  await servicio().from('push_suscripciones').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
})

test.describe('funciones del servidor: solo la clave secreta', () => {
  const llamadas = () => [
    ['tomar_mensajes', { p_limite: 1, p_negocio: m.negocioA.id }],
    ['registrar_envio', { p_id: '00000000-0000-0000-0000-000000000000', p_resultado: 'enviado' }],
    ['confirmar_por_whatsapp', { p_turno: '00000000-0000-0000-0000-000000000000', p_telefono: TEL1 }],
    ['pedir_cambio_por_whatsapp', { p_turno: '00000000-0000-0000-0000-000000000000', p_telefono: TEL1 }],
    ['disparar_envio_mensajes', {}],
    ['encolar_mensaje_turno', { p_turno: '00000000-0000-0000-0000-000000000000', p_tipo: 'aviso' }],
    ['telefono_cliente', { p_cliente: '00000000-0000-0000-0000-000000000000' }],
  ] as const

  test('anónimo, clientes, staff y super admin: permiso denegado', async () => {
    const quienes: [string, SupabaseClient][] = [
      ['anonimo', anonimo()],
      ['cliente1', m.usuarios.cliente1.db],
      ['duenoA', m.usuarios.duenoA.db],
      ['profesionalA', m.usuarios.profesionalA.db],
      ['superadmin', m.usuarios.superadmin.db],
    ]
    for (const [quien, db] of quienes) {
      for (const [fn, args] of llamadas()) {
        const r = await db.rpc(fn, args)
        expect(r.error, `${quien} → ${fn}`).not.toBeNull()
        expect(r.error!.code, `${quien} → ${fn}`).toBe('42501')
      }
    }
  })

  test('confirmar por WhatsApp desde la app no confirma nada', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '10:00')
    await m.usuarios.cliente1.db.rpc('confirmar_por_whatsapp', { p_turno: turno, p_telefono: TEL1 })
    expect((await leer<{ estado: string }>('turnos', turno, 'estado')).estado).toBe('pendiente')
  })
})

test.describe('despachador: tomar_mensajes y registrar_envio', () => {
  test('toma solo lo vencido, lo marca enviando y no lo vuelve a dar', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '10:00')
    const adm = servicio()
    const tomados = (await ok(adm.rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))) as FilaMensaje[]
    // Solo la confirmación: los recordatorios están programados para más adelante.
    expect(tomados.map((t) => t.tipo)).toEqual(['confirmacion'])
    expect(tomados[0]).toMatchObject({ estado: 'enviando', intentos: 1 })
    expect((await ok(adm.rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))) as FilaMensaje[]).toEqual([])

    await ok(adm.rpc('registrar_envio', { p_id: tomados[0]!.id, p_resultado: 'enviado', p_proveedor_id: 'wamid.prueba' }))
    const conf = (await mensajesDe(turno)).find((f) => f.tipo === 'confirmacion')!
    expect(conf).toMatchObject({ estado: 'enviado', proveedor_id: 'wamid.prueba', error: null })
    expect(conf.enviado).not.toBeNull()
  })

  test('reintentos con espera creciente; al 5.º intento queda en error', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '10:00')
    const adm = servicio()
    const id = (await mensajesDe(turno)).find((f) => f.tipo === 'confirmacion')!.id
    for (let intento = 1; intento <= 5; intento++) {
      const [t] = (await ok(adm.rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))) as FilaMensaje[]
      expect(t?.id).toBe(id)
      expect(t!.intentos).toBe(intento)
      const antes = Date.now()
      await ok(adm.rpc('registrar_envio', { p_id: id, p_resultado: 'reintentar', p_error: 'caído' }))
      const fila = await leer<FilaMensaje>('mensajes', id)
      if (intento < 5) {
        expect(fila.estado).toBe('pendiente')
        const espera = new Date(fila.programado).getTime() - antes
        expect(espera).toBeGreaterThan(2 ** intento * 60_000 - 10_000)
        expect(espera).toBeLessThan(2 ** intento * 60_000 + 10_000)
        // "adelantar el reloj" para la próxima vuelta
        await ok(adm.from('mensajes').update({ programado: new Date(Date.now() - 1000).toISOString() }).eq('id', id).select('id'))
      } else {
        expect(fila).toMatchObject({ estado: 'error', error: 'caído' })
      }
    }
  })

  test('los recordatorios de un turno que ya empezó se descartan', async () => {
    const t = await crearTurno({ negocio: m.negocioA.id, cliente: cli1, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: dentroDe(5 * 60) })
    // Simula un despachador caído: el turno ya empezó y la confirmación nunca salió.
    await ok(servicio().from('turnos').update({ inicio: dentroDe(-10), fin: dentroDe(20) }).eq('id', t).select('id'))
    await ok(servicio().from('mensajes').update({ programado: dentroDe(-60) }).eq('turno_id', t).select('id'))
    expect((await ok(servicio().rpc('tomar_mensajes', { p_limite: 50, p_negocio: m.negocioA.id }))) as FilaMensaje[]).toEqual([])
    const filas = await mensajesDe(t)
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.every((f) => f.estado === 'cancelado')).toBe(true)
  })
})

test.describe('confirmación y cambio desde WhatsApp', () => {
  test('confirmar_por_whatsapp: teléfono equivocado no confirma; el correcto sí (en cualquier formato)', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '10:00')
    const adm = servicio()
    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: turno, p_telefono: '5491199999999' }))).toBe('telefono_no_coincide')
    expect((await leer<{ estado: string }>('turnos', turno, 'estado')).estado).toBe('pendiente')

    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: turno, p_telefono: '+54 9 11 1234-5679' }))).toBe('confirmado')
    expect((await leer<{ estado: string }>('turnos', turno, 'estado')).estado).toBe('confirmado')
    const avisos = (await mensajesDe(turno)).filter((f) => f.tipo === 'aviso')
    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toMatchObject({ destino: TEL1, estado: 'pendiente' })
    expect(avisos[0]!.contenido.texto).toContain('confirmado')

    // Repetido (WhatsApp manda el mismo aviso dos veces): no responde de nuevo.
    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: turno, p_telefono: TEL1 }))).toBe('ya_confirmado')
    expect((await mensajesDe(turno)).filter((f) => f.tipo === 'aviso')).toHaveLength(1)
  })

  test('confirmar_por_whatsapp: turno cancelado o pasado no se confirma; turno inexistente', async () => {
    const adm = servicio()
    const turno = await reservar(m.usuarios.cliente1.db, '11:00')
    await ok(m.usuarios.cliente1.db.rpc('cancelar_turno', { p_turno: turno }))
    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: turno, p_telefono: TEL1 }))).toBe('no_confirmable')
    expect((await leer<{ estado: string }>('turnos', turno, 'estado')).estado).toBe('cancelado')

    const pasado = await crearTurno({ negocio: m.negocioA.id, cliente: cli1, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: dentroDe(-120) })
    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: pasado, p_telefono: TEL1 }))).toBe('no_confirmable')
    expect((await leer<{ estado: string }>('turnos', pasado, 'estado')).estado).toBe('pendiente')

    expect(await ok(adm.rpc('confirmar_por_whatsapp', { p_turno: '00000000-0000-0000-0000-000000000000', p_telefono: TEL1 }))).toBe('no_encontrado')
  })

  test('pedir_cambio_por_whatsapp: encola el link a la app (una sola vez) y solo para el teléfono del cliente', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '12:00')
    const adm = servicio()
    expect(await ok(adm.rpc('pedir_cambio_por_whatsapp', { p_turno: turno, p_telefono: '5491100000000' }))).toBe('telefono_no_coincide')
    expect(await ok(adm.rpc('pedir_cambio_por_whatsapp', { p_turno: turno, p_telefono: TEL1 }))).toBe('aviso_encolado')
    expect(await ok(adm.rpc('pedir_cambio_por_whatsapp', { p_turno: turno, p_telefono: TEL1 }))).toBe('repetido')
    const avisos = (await mensajesDe(turno)).filter((f) => f.tipo === 'aviso')
    expect(avisos).toHaveLength(1)
    expect(avisos[0]!.contenido).toMatchObject({ motivo: 'cambio', slug: m.negocioA.slug })
    expect(avisos[0]!.contenido.texto).toContain('{link}')
    expect((await leer<{ estado: string }>('turnos', turno, 'estado')).estado).toBe('pendiente')
  })
})

test.describe('suscripciones push', () => {
  test('cada usuario guarda y ve solo las suyas; el anónimo nada', async () => {
    const c1 = m.usuarios.cliente1.db
    expect((await c1.rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(1) })).error).toBeNull()
    expect(((await ok(c1.from('push_suscripciones').select('endpoint'))) as unknown[]).length).toBe(1)
    esperarNada(await m.usuarios.cliente2.db.from('push_suscripciones').select('id'))
    esperarNada(await m.usuarios.duenoA.db.from('push_suscripciones').select('id'))
    esperarNada(await anonimo().from('push_suscripciones').select('id'))
    esperarError(await anonimo().rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(2) }))
    // No puede guardar una a nombre de otro usuario.
    const ajena = await c1
      .from('push_suscripciones')
      .insert({ user_id: m.usuarios.cliente2.id, negocio_id: m.negocioA.id, endpoint: suscripcion(3).p_endpoint, p256dh: suscripcion(3).p_p256dh, auth: suscripcion(3).p_auth })
      .select('id')
    expect(ajena.error).not.toBeNull()
  })

  test('el mismo celular con otra sesión pasa a ser del usuario nuevo', async () => {
    await ok(m.usuarios.cliente1.db.rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(1) }))
    await ok(m.usuarios.cliente2.db.rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(1) }))
    esperarNada(await m.usuarios.cliente1.db.from('push_suscripciones').select('id'))
    expect(((await ok(m.usuarios.cliente2.db.from('push_suscripciones').select('id'))) as unknown[]).length).toBe(1)
  })

  test('negocio inexistente (o demo): no se guarda', async () => {
    esperarError(await m.usuarios.cliente1.db.rpc('guardar_push', { p_negocio: '00000000-0000-0000-0000-000000000000', ...suscripcion(1) }), 'negocio_no_disponible')
  })

  test('el recordatorio de 2 h también va por push si el cliente está suscripto a ESE negocio', async () => {
    // Suscripto al negocio B: no cuenta para A.
    await ok(m.usuarios.cliente1.db.rpc('guardar_push', { p_negocio: m.negocioB.id, ...suscripcion(1) }))
    const sinPush = await reservar(m.usuarios.cliente1.db, '10:00')
    expect((await mensajesDe(sinPush)).filter((f) => f.canal === 'push')).toEqual([])

    // Al suscribirse a A, el turno que ya tenía recibe el push.
    await ok(m.usuarios.cliente1.db.rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(2) }))
    const push1 = (await mensajesDe(sinPush)).filter((f) => f.canal === 'push')
    expect(push1).toHaveLength(1)
    expect(push1[0]).toMatchObject({ tipo: 'recordatorio2', destino: m.usuarios.cliente1.id, estado: 'pendiente' })

    // Y un turno nuevo lo trae desde el principio (sin duplicar si se vuelve a suscribir).
    const conPush = await reservar(m.usuarios.cliente1.db, '12:00')
    await ok(m.usuarios.cliente1.db.rpc('guardar_push', { p_negocio: m.negocioA.id, ...suscripcion(3) }))
    const filas = await mensajesDe(conPush)
    expect(filas.map((f) => `${f.tipo}/${f.canal}`).sort()).toEqual([
      'confirmacion/whatsapp',
      'recordatorio2/push',
      'recordatorio2/whatsapp',
      'recordatorio24/whatsapp',
    ])
    const r2 = filas.filter((f) => f.tipo === 'recordatorio2')
    expect(r2[0]!.programado).toBe(r2[1]!.programado)

    // Al cancelar, el push también se cancela.
    await ok(m.usuarios.cliente1.db.rpc('cancelar_turno', { p_turno: conPush }))
    expect((await mensajesDe(conPush)).find((f) => f.canal === 'push')!.estado).toBe('cancelado')
  })
})
