// Mensajes salientes (fase 4): lo que la base encola sola al reservar, cancelar o mover un turno,
// y quién puede ver la cola.
import { expect, test } from '@playwright/test'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { clienteDe, crearTurno, dentroDe, esperarNada, mismoInstante, ok, vaciarAgenda } from './ayuda'

test.describe.configure({ mode: 'default' })

interface FilaMensaje {
  id: string
  tipo: string
  canal: string
  destino: string
  estado: string
  programado: string
  negocio_id: string | null
  cliente_id: string | null
  contenido: Record<string, string>
}

const HORA = 3_600_000
const D = () => diaAR(3)
const TEL1 = '5491112345678' // cliente1: celular de su usuario (la ficha tiene otro escrito a mano, que no se usa)
const TEL2 = '5491187654321' // cliente2: celular de su usuario (entra con el celular)

let m: Mundo
let cli1: string
let demo: { negocio: string; servicio: string; profesional: string; cliente: string }

const mensajesDe = async (turno: string) =>
  (await ok(servicio().from('mensajes').select('*').eq('turno_id', turno).order('creado'))) as FilaMensaje[]
const delTipo = (filas: FilaMensaje[], tipo: string, canal = 'whatsapp') => filas.filter((f) => f.tipo === tipo && f.canal === canal)

/** Día de la semana + DD/MM, como lo arma la base para las plantillas. */
const diaTexto = (dia: string) => {
  const [a, mes, d] = dia.split('-').map(Number) as [number, number, number]
  const nombre = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(Date.UTC(a, mes - 1, d)).getUTCDay()]
  return `${nombre} ${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

async function reservar(db: Mundo['usuarios']['cliente1']['db'], hora: string, dia = D()) {
  const r = await db.rpc('reservar_turno', {
    p_negocio: m.negocioA.id,
    p_servicio: m.servicios.corteA,
    p_inicio: aISO(dia, hora),
    p_profesional: m.profesionales.p1,
    p_nombre: 'Cliente Dos',
  })
  expect(r.error).toBeNull()
  return r.data as string
}

test.beforeAll(async () => {
  m = await prepararMundo()
  const adm = servicio()
  // cliente1 ya es cliente del negocio A. En la ficha tiene escrito otro número: como la ficha es de una
  // cuenta, los WhatsApp salen SOLO al celular verificado de la cuenta (TEL1).
  cli1 = (
    (await ok(
      adm.from('clientes').insert({ negocio_id: m.negocioA.id, user_id: m.usuarios.cliente1.id, nombre: 'Ana Pérez', telefono: '011 15 9999-0000' }).select('id').single(),
    )) as { id: string }
  ).id
  {
    const { error } = await adm.auth.admin.updateUserById(m.usuarios.cliente1.id, { phone: TEL1 })
    if (error) throw error
  }
  // cliente2 entra con el celular: el teléfono está en su usuario, no en la ficha.
  const { error } = await adm.auth.admin.updateUserById(m.usuarios.cliente2.id, { phone: TEL2 })
  if (error) throw error

  // Un negocio DEMO con todo lo necesario para cargarle un turno.
  const slug = `demo-${m.sufijo}`
  const n = (await ok(adm.from('negocios').insert({ slug, config: { slug, nombre: 'Demo' }, es_demo: true }).select('id').single())) as { id: string }
  const s = (await ok(adm.from('servicios').insert({ negocio_id: n.id, nombre: 'Corte', minutos: 30 }).select('id').single())) as { id: string }
  const p = (await ok(adm.from('profesionales').insert({ negocio_id: n.id, nombre: 'PD' }).select('id').single())) as { id: string }
  const c = (await ok(adm.from('clientes').insert({ negocio_id: n.id, nombre: 'Cliente demo', telefono: '11 5555-5555' }).select('id').single())) as { id: string }
  demo = { negocio: n.id, servicio: s.id, profesional: p.id, cliente: c.id }
})
test.afterAll(async () => {
  await servicio().from('negocios').delete().eq('id', demo.negocio)
  await limpiarMundo(m)
})
test.beforeEach(async () => {
  await vaciarAgenda(m)
})

test.describe('encolado automático', () => {
  test('al reservar: confirmación inmediata y recordatorios 24 h y 2 h antes, con los datos del turno', async () => {
    const antes = Date.now()
    const turno = await reservar(m.usuarios.cliente1.db, '10:00')
    const inicio = new Date(aISO(D(), '10:00')).getTime()
    const filas = await mensajesDe(turno)
    expect(filas.map((f) => `${f.tipo}/${f.canal}`).sort()).toEqual(['confirmacion/whatsapp', 'recordatorio2/whatsapp', 'recordatorio24/whatsapp'])

    for (const f of filas) {
      expect(f.estado).toBe('pendiente')
      expect(f.destino).toBe(TEL1)
      expect(f.negocio_id).toBe(m.negocioA.id)
      expect(f.cliente_id).toBe(cli1)
      expect(f.contenido).toMatchObject({
        turno_id: turno,
        slug: m.negocioA.slug,
        nombre: 'Ana',
        negocio: 'Negocio A',
        servicio: 'Corte',
        profesional: 'P1',
        direccion: 'Calle Falsa 123',
        hora: '10:00', // en la zona del negocio, no en UTC
        dia: diaTexto(D()),
      })
      expect(f.contenido.texto).toContain('10:00')
    }
    const conf = delTipo(filas, 'confirmacion')[0]!
    expect(new Date(conf.programado).getTime()).toBeGreaterThanOrEqual(antes - 60_000)
    expect(new Date(conf.programado).getTime()).toBeLessThanOrEqual(Date.now() + 5_000)
    expect(mismoInstante(delTipo(filas, 'recordatorio24')[0]!.programado, new Date(inicio - 24 * HORA).toISOString())).toBe(true)
    expect(mismoInstante(delTipo(filas, 'recordatorio2')[0]!.programado, new Date(inicio - 2 * HORA).toISOString())).toBe(true)
  })

  test('el celular del usuario (ingreso con celular) también sirve', async () => {
    const turno = await reservar(m.usuarios.cliente2.db, '11:00')
    const filas = await mensajesDe(turno)
    expect(filas).toHaveLength(3)
    expect(new Set(filas.map((f) => f.destino))).toEqual(new Set([TEL2]))
    expect(filas[0]!.contenido.nombre).toBe('Cliente')
  })

  test('turno cercano: solo los recordatorios que todavía quedan en el futuro', async () => {
    const en5h = await crearTurno({ negocio: m.negocioA.id, cliente: cli1, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: dentroDe(5 * 60) })
    expect((await mensajesDe(en5h)).map((f) => f.tipo).sort()).toEqual(['confirmacion', 'recordatorio2'])
    const en1h = await crearTurno({ negocio: m.negocioA.id, cliente: cli1, profesional: m.profesionales.p2, servicio: m.servicios.corteA, inicio: dentroDe(60) })
    expect((await mensajesDe(en1h)).map((f) => f.tipo)).toEqual(['confirmacion'])
  })

  test('un turno cargado en el pasado (historial) no genera mensajes', async () => {
    const t = await crearTurno({ negocio: m.negocioA.id, cliente: cli1, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: dentroDe(-24 * 60), estado: 'confirmado' })
    expect(await mensajesDe(t)).toEqual([])
  })

  test('cliente sin celular: no se encola nada', async () => {
    const sinTel = (await ok(servicio().from('clientes').insert({ negocio_id: m.negocioA.id, nombre: 'Sin celular' }).select('id').single())) as { id: string }
    const t = await crearTurno({ negocio: m.negocioA.id, cliente: sinTel.id, profesional: m.profesionales.p1, servicio: m.servicios.corteA, inicio: aISO(D(), '12:00') })
    expect(await mensajesDe(t)).toEqual([])
    await servicio().from('turnos').delete().eq('id', t)
    await servicio().from('clientes').delete().eq('id', sinTel.id)
  })

  test('al cancelar: se cancelan los pendientes y se encola la cancelación', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '15:00')
    expect((await m.usuarios.cliente1.db.rpc('cancelar_turno', { p_turno: turno })).error).toBeNull()
    const filas = await mensajesDe(turno)
    for (const tipo of ['confirmacion', 'recordatorio24', 'recordatorio2']) expect(delTipo(filas, tipo)[0]!.estado, tipo).toBe('cancelado')
    const canc = delTipo(filas, 'cancelacion')
    expect(canc).toHaveLength(1)
    expect(canc[0]).toMatchObject({ estado: 'pendiente', destino: TEL1 })
    expect(canc[0]!.contenido.texto).toContain('cancelado')
    expect(canc[0]!.contenido.texto).toContain('{link}') // lo completa el despachador con APP_URL
  })

  test('si el dueño mueve el turno, se reprograman los recordatorios pendientes', async () => {
    const turno = await reservar(m.usuarios.cliente1.db, '16:00')
    const nuevoDia = diaAR(5)
    const nuevo = aISO(nuevoDia, '12:30')
    const filas1 = await ok(
      m.usuarios.duenoA.db.from('turnos').update({ inicio: nuevo, fin: new Date(new Date(nuevo).getTime() + 30 * 60_000).toISOString() }).eq('id', turno).select('id'),
    )
    expect(filas1).toHaveLength(1)
    const filas = await mensajesDe(turno)
    const r24 = delTipo(filas, 'recordatorio24').filter((f) => f.estado === 'pendiente')
    const r2 = delTipo(filas, 'recordatorio2').filter((f) => f.estado === 'pendiente')
    expect(r24).toHaveLength(1)
    expect(r2).toHaveLength(1)
    expect(mismoInstante(r24[0]!.programado, new Date(new Date(nuevo).getTime() - 24 * HORA).toISOString())).toBe(true)
    expect(mismoInstante(r2[0]!.programado, new Date(new Date(nuevo).getTime() - 2 * HORA).toISOString())).toBe(true)
    expect(r24[0]!.contenido).toMatchObject({ hora: '12:30', dia: diaTexto(nuevoDia) })

    // Lo pasa a dentro de 3 h: el de 24 h ya no tiene sentido; el de 2 h se reprograma.
    const pronto = dentroDe(3 * 60)
    await ok(
      servicio().from('turnos').update({ inicio: pronto, fin: new Date(new Date(pronto).getTime() + 30 * 60_000).toISOString() }).eq('id', turno).select('id'),
    )
    const despues = await mensajesDe(turno)
    expect(delTipo(despues, 'recordatorio24').every((f) => f.estado === 'cancelado')).toBe(true)
    const r2b = delTipo(despues, 'recordatorio2').filter((f) => f.estado === 'pendiente')
    expect(r2b).toHaveLength(1)
    expect(mismoInstante(r2b[0]!.programado, new Date(new Date(pronto).getTime() - 2 * HORA).toISOString())).toBe(true)
  })

  test('los turnos de negocios demo no generan mensajes', async () => {
    const t = await crearTurno({ negocio: demo.negocio, cliente: demo.cliente, profesional: demo.profesional, servicio: demo.servicio, inicio: aISO(D(), '10:00') })
    expect(await mensajesDe(t)).toEqual([])
    await ok(servicio().from('turnos').update({ estado: 'cancelado' }).eq('id', t).select('id'))
    expect(await mensajesDe(t)).toEqual([])
  })
})

test.describe('quién ve la cola', () => {
  let turno: string
  test.beforeEach(async () => {
    turno = await reservar(m.usuarios.cliente1.db, '10:00')
    // Un código de ingreso ligado al negocio (el peor caso: igual el staff NO lo tiene que ver).
    await ok(servicio().from('mensajes').insert({ tipo: 'codigo', destino: TEL1, negocio_id: m.negocioA.id, contenido: { codigo: '123456' } }))
  })
  test.afterEach(async () => {
    await servicio().from('mensajes').delete().eq('negocio_id', m.negocioA.id).eq('tipo', 'codigo')
  })

  test('el staff ve los mensajes de su negocio, pero nunca los códigos', async () => {
    for (const quien of ['duenoA', 'profesionalA', 'superadmin'] as const) {
      const filas = (await ok(m.usuarios[quien].db.from('mensajes').select('tipo, turno_id').eq('negocio_id', m.negocioA.id))) as { tipo: string }[]
      expect(filas.map((f) => f.tipo).sort(), quien).toEqual(['confirmacion', 'recordatorio2', 'recordatorio24'])
    }
  })

  test('el dueño de otro negocio no ve nada', async () => {
    esperarNada(await m.usuarios.duenoB.db.from('mensajes').select('id').eq('negocio_id', m.negocioA.id))
  })

  test('los clientes no ven ni sus propios mensajes', async () => {
    esperarNada(await m.usuarios.cliente1.db.from('mensajes').select('id'))
    esperarNada(await m.usuarios.cliente2.db.from('mensajes').select('id'))
  })

  test('el anónimo no ve nada', async () => {
    esperarNada(await anonimo().from('mensajes').select('id'))
  })

  test('nadie de la app escribe en la cola', async () => {
    for (const quien of ['duenoA', 'superadmin', 'cliente1'] as const) {
      const db = m.usuarios[quien].db
      const ins = await db.from('mensajes').insert({ tipo: 'aviso', destino: TEL1, negocio_id: m.negocioA.id }).select('id')
      expect(ins.error, quien).not.toBeNull()
      const upd = await db.from('mensajes').update({ estado: 'enviado' }).eq('turno_id', turno).select('id')
      if (!upd.error) expect(upd.data, quien).toEqual([])
    }
    const filas = await mensajesDe(turno)
    expect(filas.every((f) => f.estado === 'pendiente')).toBe(true)
    // Y el cliente del turno sigue estando bien.
    expect(await clienteDe(m.negocioA.id, m.usuarios.cliente1.id)).toBe(cli1)
  })
})
