// Permisos de las funciones de gestión del panel (20261120200000_panel_completo.sql), rol por rol:
//   panel_reporte · panel_para_recuperar · panel_recuperar_cliente · panel_atiendo_yo
//   + historial de mensajes (lectura directa) y el cuidado de negocios.config.
import { expect, test } from '@playwright/test'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { crearTurno, esperarError, esperarNada, ok } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const c: Record<'c1' | 'c2' | 'c3' | 'cB', string> = { c1: '', c2: '', c3: '', cB: '' }
const DESDE = () => diaAR(-20)
const HASTA = () => diaAR(-14)

type R = { data: unknown; error: { message?: string; code?: string } | null }

test.beforeAll(async () => {
  m = await prepararMundo()
  const adm = servicio()
  const filas = await ok(
    adm
      .from('clientes')
      .insert([
        { negocio_id: m.negocioA.id, nombre: 'Uno Prueba', telefono: '+54 9 11 4444 5555' },
        { negocio_id: m.negocioA.id, nombre: 'Dos Prueba', telefono: '11 2345-6789' },
        { negocio_id: m.negocioA.id, nombre: 'Tres Prueba' },
        { negocio_id: m.negocioB.id, nombre: 'Cliente de B', telefono: '11 5555-6666' },
      ])
      .select('id, nombre'),
  )
  const id = (nombre: string) => (filas as { id: string; nombre: string }[]).find((f) => f.nombre === nombre)!.id
  c.c1 = id('Uno Prueba')
  c.c2 = id('Dos Prueba')
  c.c3 = id('Tres Prueba')
  c.cB = id('Cliente de B')

  // Mundo conocido para el reporte [hoy-20, hoy-14]:
  //   c1: P1 corte vino (-20) y P1 color vino (-15)           → cliente nuevo
  //   c2: P2 corte vino (-40, fuera) y P2 corte no vino (-18) → recurrente
  //   c3: P1 corte cancelado (-16) y P2 corte confirmado (-14, sin marcar) → nuevo
  const t = (cliente: string, prof: string, dia: string, hora: string, estado: string, serv = m.servicios.corteA, minutos = 30) =>
    crearTurno({ negocio: m.negocioA.id, cliente, profesional: prof, servicio: serv, inicio: aISO(dia, hora), estado, minutos })
  await t(c.c1, m.profesionales.p1, diaAR(-20), '10:00', 'asistio')
  await t(c.c1, m.profesionales.p1, diaAR(-15), '10:00', 'asistio', m.servicios.colorA, 60)
  await t(c.c2, m.profesionales.p2, diaAR(-40), '11:00', 'asistio')
  await t(c.c2, m.profesionales.p2, diaAR(-18), '11:00', 'falto')
  await t(c.c3, m.profesionales.p1, diaAR(-16), '15:00', 'cancelado')
  await t(c.c3, m.profesionales.p2, diaAR(-14), '09:00', 'confirmado')
  // En B, un turno que nunca debe aparecer en los números de A.
  await crearTurno({ negocio: m.negocioB.id, cliente: c.cB, profesional: m.profesionales.pB, servicio: m.servicios.corteB, inicio: aISO(diaAR(-17), '10:00'), estado: 'asistio' })
})

test.afterAll(async () => {
  await limpiarMundo(m)
})

const reporte = (db: ReturnType<typeof anonimo>, negocio: string, profesional?: string, desde = DESDE(), hasta = HASTA()) =>
  db.rpc('panel_reporte', { p_negocio: negocio, p_desde: desde, p_hasta: hasta, ...(profesional ? { p_profesional: profesional } : {}) }) as unknown as Promise<R>

interface Rep {
  totales: Record<string, number>
  clientes: Record<string, number>
  por_profesional: { nombre: string; turnos: number; asistio: number; falto: number; cancelados: number; facturacion: number }[]
  por_servicio: { nombre: string; turnos: number; asistio: number; facturacion: number }[]
  por_hora: { hora: number; turnos: number }[]
  profesional_id: string | null
  resenas: unknown
}

test.describe('panel_reporte', () => {
  test('el dueño ve los números de todo el negocio, correctos', async () => {
    const r = await reporte(m.usuarios.duenoA.db, m.negocioA.id)
    expect(r.error).toBeNull()
    const d = r.data as Rep
    expect(d.totales).toEqual({
      reservados: 5, turnos: 4, cancelados: 1, confirmados: 3, asistio: 2, falto: 1, sin_marcar: 1,
      facturacion: 49000, facturacion_asistidos: 37000,
    })
    expect(d.clientes).toEqual({ total: 3, nuevos: 2, recurrentes: 1 })
    expect(d.por_profesional.map(({ nombre, turnos, asistio, falto, cancelados, facturacion }) => ({ nombre, turnos, asistio, falto, cancelados, facturacion }))).toEqual([
      { nombre: 'P1', turnos: 2, asistio: 2, falto: 0, cancelados: 1, facturacion: 37000 },
      { nombre: 'P2', turnos: 2, asistio: 0, falto: 1, cancelados: 0, facturacion: 12000 },
    ])
    expect(d.por_servicio.map(({ nombre, turnos, asistio, facturacion }) => ({ nombre, turnos, asistio, facturacion }))).toEqual([
      { nombre: 'Corte', turnos: 3, asistio: 1, facturacion: 24000 },
      { nombre: 'Color', turnos: 1, asistio: 1, facturacion: 25000 },
    ])
    expect(d.por_hora).toEqual([
      { hora: 9, turnos: 1 },
      { hora: 10, turnos: 2 },
      { hora: 11, turnos: 1 },
    ])
  })

  test('el dueño puede filtrar por profesional', async () => {
    const d = (await reporte(m.usuarios.duenoA.db, m.negocioA.id, m.profesionales.p2)).data as Rep
    expect(d.profesional_id).toBe(m.profesionales.p2)
    expect(d.totales).toMatchObject({ reservados: 2, turnos: 2, asistio: 0, falto: 1, facturacion: 12000 })
  })

  test('el profesional ve SOLO lo suyo, aunque pida otro profesional', async () => {
    const r = await reporte(m.usuarios.profesionalA.db, m.negocioA.id, m.profesionales.p2)
    expect(r.error).toBeNull()
    const d = r.data as Rep
    expect(d.profesional_id).toBe(m.profesionales.p1)
    expect(d.totales).toMatchObject({ reservados: 3, turnos: 2, cancelados: 1, asistio: 2, falto: 0, facturacion: 37000 })
    expect(d.clientes).toEqual({ total: 1, nuevos: 1, recurrentes: 0 })
    expect(d.por_profesional.map((p) => p.nombre)).toEqual(['P1'])
  })

  test('el superadmin puede; un rango al revés o de más de un año, no', async () => {
    expect((await reporte(m.usuarios.superadmin.db, m.negocioA.id)).error).toBeNull()
    esperarError(await reporte(m.usuarios.duenoA.db, m.negocioA.id, undefined, HASTA(), DESDE()), 'rango_invalido')
    esperarError(await reporte(m.usuarios.duenoA.db, m.negocioA.id, undefined, diaAR(-400), diaAR(0)), 'rango_invalido')
  })

  test('otro dueño, un cliente y un anónimo no pueden', async () => {
    esperarError(await reporte(m.usuarios.duenoB.db, m.negocioA.id), 'sin_permiso')
    esperarError(await reporte(m.usuarios.cliente1.db, m.negocioA.id), 'sin_permiso')
    esperarError(await reporte(anonimo(), m.negocioA.id))
  })

  test('las calificaciones del período entran al reporte (si existe la tabla de reseñas)', async () => {
    const adm = servicio()
    const prueba = await adm.from('resenas').select('id').limit(1)
    test.skip(!!prueba.error, 'public.resenas todavía no existe en esta base')
    const turnoC1 = await ok(adm.from('turnos').select('id').eq('cliente_id', c.c1).eq('profesional_id', m.profesionales.p1).order('inicio').limit(1).single())
    await ok(
      adm.from('resenas').insert({ negocio_id: m.negocioA.id, turno_id: (turnoC1 as { id: string }).id, cliente_id: c.c1, puntaje: 4, comentario: 'Muy bien', creado: aISO(diaAR(-19), '12:00') }),
    )
    const d = (await reporte(m.usuarios.duenoA.db, m.negocioA.id)).data as Rep
    expect(d.resenas).toMatchObject({ cantidad: 1, promedio: 4, distribucion: { '4': 1, '5': 0 }, ultimas: [{ puntaje: 4, comentario: 'Muy bien', cliente: 'Uno Prueba', profesional: 'P1' }] })
    // El profesional P2 no ve la reseña de un turno de P1.
    const soloP2 = (await reporte(m.usuarios.duenoA.db, m.negocioA.id, m.profesionales.p2)).data as Rep
    expect(soloP2.resenas).toMatchObject({ cantidad: 0 })
  })
})

test.describe('panel_para_recuperar', () => {
  const lista = (db: ReturnType<typeof anonimo>, negocio: string, dias?: number) =>
    db.rpc('panel_para_recuperar', { p_negocio: negocio, ...(dias ? { p_dias: dias } : {}) }) as unknown as Promise<R>
  type Fila = { cliente_id: string; ultimo_servicio: string; visitas: number; con_celular: boolean }

  test('el dueño ve a los que no vienen hace más de N días (por defecto, recuperarDias = 30)', async () => {
    const r = await lista(m.usuarios.duenoA.db, m.negocioA.id)
    expect(r.error).toBeNull()
    // Solo c2: su última visita fue hace 40 días (la falta no cuenta como visita).
    expect((r.data as Fila[]).map((f) => f.cliente_id)).toEqual([c.c2])
    expect((r.data as Fila[])[0]).toMatchObject({ ultimo_servicio: 'Corte', visitas: 1, con_celular: true })
    // Con 10 días entran los tres, el más reciente primero (c3 vino a un turno confirmado hace 14 días).
    const r10 = await lista(m.usuarios.duenoA.db, m.negocioA.id, 10)
    expect((r10.data as Fila[]).map((f) => f.cliente_id)).toEqual([c.c3, c.c1, c.c2])
  })

  test('quien tiene un turno por delante no aparece', async () => {
    const id = await crearTurno({ negocio: m.negocioA.id, cliente: c.c2, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: aISO(diaAR(5), '12:00') })
    try {
      const r = await lista(m.usuarios.duenoA.db, m.negocioA.id)
      expect(r.data).toEqual([])
    } finally {
      await servicio().from('turnos').delete().eq('id', id)
    }
  })

  test('el profesional (staff) también; otro dueño, un cliente y un anónimo no', async () => {
    expect((await lista(m.usuarios.profesionalA.db, m.negocioA.id)).error).toBeNull()
    esperarError(await lista(m.usuarios.duenoB.db, m.negocioA.id), 'sin_permiso')
    esperarError(await lista(m.usuarios.cliente1.db, m.negocioA.id), 'sin_permiso')
    esperarError(await lista(anonimo(), m.negocioA.id))
  })
})

test.describe('panel_recuperar_cliente', () => {
  const mandar = (db: ReturnType<typeof anonimo>, cliente: string) => db.rpc('panel_recuperar_cliente', { p_cliente: cliente }) as unknown as Promise<R>

  test('el dueño encola el "te extrañamos" al celular del cliente, y no lo deja repetir en 30 días', async () => {
    const r = await mandar(m.usuarios.duenoA.db, c.c2)
    expect(r.error).toBeNull()
    const msj = await ok(servicio().from('mensajes').select('tipo, canal, destino, negocio_id, cliente_id, estado, contenido').eq('id', r.data as string).single())
    expect(msj).toMatchObject({ tipo: 'recuperar', canal: 'whatsapp', destino: '5491123456789', negocio_id: m.negocioA.id, cliente_id: c.c2, estado: 'pendiente' })
    expect((msj as { contenido: Record<string, string> }).contenido).toMatchObject({ nombre: 'Dos', negocio: 'Negocio A', slug: m.negocioA.slug })
    expect((msj as { contenido: { texto: string } }).contenido.texto).toContain('Hola Dos, hace un tiempo que no te vemos por Negocio A')

    esperarError(await mandar(m.usuarios.duenoA.db, c.c2), 'recuperar_reciente')
    const { count } = await servicio().from('mensajes').select('id', { count: 'exact', head: true }).eq('cliente_id', c.c2).eq('tipo', 'recuperar')
    expect(count).toBe(1)

    // La lista muestra que ya se le mandó.
    const lista = await m.usuarios.duenoA.db.rpc('panel_para_recuperar', { p_negocio: m.negocioA.id })
    expect((lista.data as { recuperar_enviado: string | null; recuperar_estado: string }[])[0]).toMatchObject({ recuperar_estado: 'pendiente' })
  })

  test('usa el texto que configuró el negocio', async () => {
    const adm = servicio()
    const { data } = await adm.from('negocios').select('config').eq('id', m.negocioA.id).single()
    const config = data!.config as Record<string, unknown>
    await m.usuarios.duenoA.db
      .from('negocios')
      .update({ config: { ...config, mensajes: { recordatorio24: '', recordatorio2: '', recuperar: '¡{nombre}! Te extrañamos en {negocio}.' } } })
      .eq('id', m.negocioA.id)
    const r = await mandar(m.usuarios.profesionalA.db, c.c1) // el profesional también puede (es staff)
    expect(r.error).toBeNull()
    const msj = await ok(adm.from('mensajes').select('destino, contenido').eq('id', r.data as string).single())
    expect(msj).toMatchObject({ destino: '5491144445555', contenido: { texto: '¡Uno! Te extrañamos en Negocio A.' } })
  })

  test('sin celular no se puede; otro dueño, un cliente y un anónimo no pueden', async () => {
    esperarError(await mandar(m.usuarios.duenoA.db, c.c3), 'sin_telefono')
    esperarError(await mandar(m.usuarios.duenoB.db, c.c1), 'sin_permiso')
    esperarError(await mandar(m.usuarios.cliente1.db, c.c1), 'sin_permiso')
    esperarError(await mandar(anonimo(), c.c1))
    const { count } = await servicio().from('mensajes').select('id', { count: 'exact', head: true }).eq('cliente_id', c.c3)
    expect(count).toBe(0)
  })
})

test.describe('historial de mensajes', () => {
  test('el staff ve lo que se le mandó a sus clientes; el cliente, otro dueño y un anónimo no', async () => {
    const dueno = await m.usuarios.duenoA.db.from('mensajes').select('id, tipo').eq('cliente_id', c.c2)
    expect(dueno.error).toBeNull()
    expect((dueno.data ?? []).map((x) => x.tipo)).toContain('recuperar')
    const prof = await m.usuarios.profesionalA.db.from('mensajes').select('id').eq('cliente_id', c.c2)
    expect(prof.data?.length).toBeGreaterThan(0)
    esperarNada(await m.usuarios.duenoB.db.from('mensajes').select('id').eq('cliente_id', c.c2))
    esperarNada(await m.usuarios.cliente1.db.from('mensajes').select('id').eq('cliente_id', c.c2))
    esperarNada(await anonimo().from('mensajes').select('id').eq('cliente_id', c.c2))
  })
})

test.describe('panel_atiendo_yo', () => {
  const vincular = (db: ReturnType<typeof anonimo>, negocio: string, prof?: string) =>
    db.rpc('panel_atiendo_yo', { p_negocio: negocio, ...(prof ? { p_profesional: prof } : {}) }) as unknown as Promise<R>
  const usuarioDe = async (prof: string) => (await ok(servicio().from('profesionales').select('user_id').eq('id', prof).single()) as { user_id: string | null }).user_id

  test('el dueño vincula su cuenta a una ficha libre y pasa a tener agenda propia; después se desvincula', async () => {
    const db = m.usuarios.duenoA.db
    expect((await vincular(db, m.negocioA.id, m.profesionales.p2)).error).toBeNull()
    expect(await usuarioDe(m.profesionales.p2)).toBe(m.usuarios.duenoA.id)
    expect((await db.rpc('mi_profesional', { p_negocio: m.negocioA.id })).data).toBe(m.profesionales.p2)
    // Sigue siendo dueño: ve todos los turnos.
    expect((await db.rpc('rol_en', { p_negocio: m.negocioA.id })).data).toBe('dueno')

    // Una ficha que ya es de otra persona, no.
    esperarError(await vincular(db, m.negocioA.id, m.profesionales.p1), 'profesional_con_usuario')
    expect(await usuarioDe(m.profesionales.p1)).toBe(m.usuarios.profesionalA.id)
    // Una ficha de otro negocio, no.
    esperarError(await vincular(db, m.negocioA.id, m.profesionales.pB), 'profesional_no_encontrado')

    expect((await vincular(db, m.negocioA.id)).error).toBeNull()
    expect(await usuarioDe(m.profesionales.p2)).toBeNull()
  })

  test('una ficha con invitación pendiente no se puede tomar', async () => {
    const adm = servicio()
    const inv = await ok(adm.from('invitaciones').insert({ negocio_id: m.negocioA.id, email: `pend-${m.sufijo}@ejemplo.com`, rol: 'profesional', profesional_id: m.profesionales.p2 }).select('id').single())
    try {
      esperarError(await vincular(m.usuarios.duenoA.db, m.negocioA.id, m.profesionales.p2), 'profesional_invitado')
    } finally {
      await adm.from('invitaciones').delete().eq('id', (inv as { id: string }).id)
    }
  })

  test('el profesional, otro dueño, SawaTek (no es miembro), un cliente y un anónimo no pueden', async () => {
    esperarError(await vincular(m.usuarios.profesionalA.db, m.negocioA.id, m.profesionales.p2), 'sin_permiso')
    esperarError(await vincular(m.usuarios.duenoB.db, m.negocioA.id, m.profesionales.p2), 'sin_permiso')
    esperarError(await vincular(m.usuarios.superadmin.db, m.negocioA.id, m.profesionales.p2), 'sin_permiso')
    esperarError(await vincular(m.usuarios.cliente1.db, m.negocioA.id, m.profesionales.p2), 'sin_permiso')
    esperarError(await vincular(anonimo(), m.negocioA.id, m.profesionales.p2))
    expect(await usuarioDe(m.profesionales.p2)).toBeNull()
  })
})

test.describe('marca (negocios.config)', () => {
  test('el dueño edita su config, pero config.slug siempre queda igual al link', async () => {
    const db = m.usuarios.duenoA.db
    const { data } = await db.from('negocios').select('config').eq('id', m.negocioA.id).single()
    const config = data!.config as Record<string, unknown>
    const r = await db.from('negocios').update({ config: { ...config, slug: 'otro-link', claim: 'Nueva frase' } }).eq('id', m.negocioA.id).select('slug, config')
    expect(r.error).toBeNull()
    const fila = (r.data as { slug: string; config: { slug: string; claim: string } }[])[0]!
    expect(fila.slug).toBe(m.negocioA.slug)
    expect(fila.config).toMatchObject({ slug: m.negocioA.slug, claim: 'Nueva frase' })
  })

  test('una configuración gigante se rechaza; otro dueño no puede tocar la marca', async () => {
    const db = m.usuarios.duenoA.db
    const { data } = await db.from('negocios').select('config').eq('id', m.negocioA.id).single()
    const config = data!.config as Record<string, unknown>
    esperarError(await db.from('negocios').update({ config: { ...config, logo: `data:image/webp;base64,${'A'.repeat(700_000)}` } }).eq('id', m.negocioA.id), 'config_muy_grande')
    const ajeno = await m.usuarios.duenoB.db.from('negocios').update({ config: { ...config, claim: 'hackeado' } }).eq('id', m.negocioA.id).select('id')
    expect(ajeno.data ?? []).toEqual([])
    const { data: ahora } = await servicio().from('negocios').select('config').eq('id', m.negocioA.id).single()
    expect((ahora!.config as { claim: string }).claim).not.toBe('hackeado')
  })
})
