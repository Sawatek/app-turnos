// Permisos de la app del cliente completa: mis_turnos_global, lista_espera (+ aviso al cancelar),
// resenas y calificacion_negocio. Cliente propio vs ajeno, staff de su negocio y de otro, y anónimo.
import { expect, test } from '@playwright/test'
import { aISO, anonimo, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { crearClienteCelular, type ClienteCelular } from '../e2e/cliente-real/ayuda'
import { crearCliente, crearTurno, esperarBloqueado, esperarError, esperarNada, ok, vaciarAgenda } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
let x: ClienteCelular
let y: ClienteCelular

test.beforeAll(async () => {
  m = await prepararMundo()
  ;[x, y] = await Promise.all([crearClienteCelular(), crearClienteCelular()])
})
test.afterAll(async () => {
  await limpiarMundo(m)
  await Promise.all([x, y].filter(Boolean).map((c) => servicio().auth.admin.deleteUser(c.id)))
})
test.beforeEach(async () => {
  await vaciarAgenda(m)
  const adm = servicio()
  await adm.from('mensajes').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
  await adm.from('clientes').delete().in('negocio_id', [m.negocioA.id, m.negocioB.id])
})

/** Ficha de un cliente por celular en un negocio. */
const ficha = (negocio: string, c: ClienteCelular, nombre = 'Cliente') => crearCliente(negocio, nombre, c.id)
const turnoA = (cliente: string, dia: string, hora: string, estado = 'pendiente', profesional = m.profesionales.p1) =>
  crearTurno({ negocio: m.negocioA.id, cliente, profesional, servicio: m.servicios.corteA, inicio: aISO(dia, hora), estado })
const anotar = (c: { db: ClienteCelular['db'] }, p: { negocio?: string; servicio?: string; dia?: string; profesional?: string; nombre?: string } = {}) =>
  c.db.rpc('anotarme_lista_espera', {
    p_negocio: p.negocio ?? m.negocioA.id,
    p_servicio: p.servicio ?? m.servicios.corteA,
    p_dia: p.dia ?? diaAR(3),
    ...(p.profesional ? { p_profesional: p.profesional } : {}),
    ...(p.nombre ? { p_nombre: p.nombre } : {}),
  })

// -------------------------------------------------------------------------------------
test.describe('mis_turnos_global', () => {
  test('el cliente ve sus turnos de todos los negocios (y solo los suyos)', async () => {
    const xa = await ficha(m.negocioA.id, x)
    const xb = await ficha(m.negocioB.id, x)
    const ya = await ficha(m.negocioA.id, y)
    const t1 = await turnoA(xa, diaAR(2), '10:00')
    const t2 = await crearTurno({ negocio: m.negocioB.id, cliente: xb, profesional: m.profesionales.pB, servicio: m.servicios.corteB, inicio: aISO(diaAR(3), '11:00') })
    await turnoA(ya, diaAR(2), '11:00')

    const lista = await ok(x.db.rpc('mis_turnos_global'))
    expect(lista.map((t: { id: string }) => t.id).sort()).toEqual([t1, t2].sort())
    const b = lista.find((t: { id: string }) => t.id === t2)!
    expect(b).toMatchObject({ negocio_id: m.negocioB.id, slug: m.negocioB.slug, negocio: 'Negocio B', servicio: 'Corte B', profesional: 'PB', estado: 'pendiente', cancelacion_horas: 2, puntaje: null })

    const deY = await ok(y.db.rpc('mis_turnos_global'))
    expect(deY.map((t: { id: string }) => t.id)).not.toContain(t1)
    expect(deY).toHaveLength(1)
  })

  test('el staff no ve los turnos de su negocio por acá (solo los propios como cliente)', async () => {
    const xa = await ficha(m.negocioA.id, x)
    await turnoA(xa, diaAR(2), '10:00')
    expect(await ok(m.usuarios.duenoA.db.rpc('mis_turnos_global'))).toEqual([])
    expect(await ok(m.usuarios.profesionalA.db.rpc('mis_turnos_global'))).toEqual([])
  })

  test('el anónimo no la puede usar', async () => {
    esperarError(await anonimo().rpc('mis_turnos_global'))
  })
})

// -------------------------------------------------------------------------------------
test.describe('lista_espera', () => {
  test('el cliente se anota (la primera vez crea su ficha con nombre y celular) y repetir no duplica', async () => {
    esperarError(await anotar(x), 'falta_nombre')
    const id = await ok(anotar(x, { nombre: 'Xime Espera' }))
    const { data: cli } = await servicio().from('clientes').select('id, nombre, telefono').eq('negocio_id', m.negocioA.id).eq('user_id', x.id).single()
    expect(cli).toMatchObject({ nombre: 'Xime Espera', telefono: x.tel })
    expect(await ok(anotar(x))).toBe(id)
    // Con un profesional es otra anotación.
    expect(await ok(anotar(x, { profesional: m.profesionales.p2 }))).not.toBe(id)
    expect(await ok(x.db.from('lista_espera').select('id').eq('negocio_id', m.negocioA.id))).toHaveLength(2)
  })

  test('valida negocio, servicio, profesional, día y el máximo de 5', async () => {
    await ficha(m.negocioA.id, x)
    esperarError(await anotar(x, { servicio: m.servicios.corteB }), 'servicio_no_disponible')
    esperarError(await anotar(x, { servicio: m.servicios.colorA, profesional: m.profesionales.p2 }), 'profesional_no_disponible')
    esperarError(await anotar(x, { profesional: m.profesionales.pB }), 'profesional_no_disponible')
    esperarError(await anotar(x, { dia: diaAR(-1) }), 'dia_invalido')
    esperarError(await anotar(x, { dia: diaAR(70) }), 'dia_invalido')
    for (let i = 1; i <= 5; i++) await ok(anotar(x, { dia: diaAR(i) }))
    esperarError(await anotar(x, { dia: diaAR(6) }), 'demasiadas_esperas')
  })

  test('nadie se anota escribiendo directo en la tabla', async () => {
    const xa = await ficha(m.negocioA.id, x)
    const fila = { negocio_id: m.negocioA.id, cliente_id: xa, servicio_id: m.servicios.corteA, dia: diaAR(3) }
    esperarError(await x.db.from('lista_espera').insert(fila).select())
    esperarError(await m.usuarios.duenoA.db.from('lista_espera').insert(fila).select())
    esperarError(await anonimo().from('lista_espera').insert(fila).select())
    esperarError(await anonimo().rpc('anotarme_lista_espera', { p_negocio: m.negocioA.id, p_servicio: m.servicios.corteA, p_dia: diaAR(3), p_nombre: 'Anon' }))
  })

  test('cada cliente ve y borra solo las suyas; el staff ve y borra las de su negocio; el anónimo nada', async () => {
    const idX = await ok(anotar(x, { nombre: 'Xime' }))
    const idY = await ok(anotar(y, { nombre: 'Yago' }))
    expect((await ok(x.db.from('lista_espera').select('id'))).map((f) => f.id)).toEqual([idX])
    // y no ve ni borra la de x.
    esperarNada(await y.db.from('lista_espera').select('id').eq('id', idX))
    esperarBloqueado(await y.db.from('lista_espera').delete().eq('id', idX).select())
    // El staff de A ve las dos; el de B, ninguna.
    expect((await ok(m.usuarios.duenoA.db.from('lista_espera').select('id'))).map((f) => f.id).sort()).toEqual([idX, idY].sort())
    expect((await ok(m.usuarios.profesionalA.db.from('lista_espera').select('id'))).length).toBe(2)
    esperarNada(await m.usuarios.duenoB.db.from('lista_espera').select('id').in('id', [idX, idY]))
    esperarBloqueado(await m.usuarios.duenoB.db.from('lista_espera').delete().eq('id', idX).select())
    // Anónimo: nada.
    esperarNada(await anonimo().from('lista_espera').select('id'))
    // Nadie la modifica (no hay update).
    esperarBloqueado(await x.db.from('lista_espera').update({ dia: diaAR(4) }).eq('id', idX).select())
    // x borra la suya; el dueño de A, la de y.
    expect(await ok(x.db.from('lista_espera').delete().eq('id', idX).select('id'))).toHaveLength(1)
    expect(await ok(m.usuarios.duenoA.db.from('lista_espera').delete().eq('id', idY).select('id'))).toHaveLength(1)
  })

  test('al cancelarse un turno se encola UN aviso por persona a los anotados de ese día y servicio', async () => {
    const D = diaAR(3)
    await ok(anotar(x, { dia: D, nombre: 'Xime Espera' }))
    await ok(anotar(x, { dia: D, profesional: m.profesionales.p1 })) // dos anotaciones que coinciden: un solo aviso
    await ok(anotar(y, { dia: D, profesional: m.profesionales.p2, nombre: 'Yago' })) // otro profesional: no
    // Otro cliente (z) con un turno con P1 ese día, que cancela él mismo.
    const z = m.usuarios.cliente1
    const zid = await crearCliente(m.negocioA.id, 'Zoe', z.id)
    const turno = await turnoA(zid, D, '10:00')
    // Antes de cancelar, nada.
    expect(await ok(servicio().from('mensajes').select('id').eq('tipo', 'aviso').eq('negocio_id', m.negocioA.id))).toEqual([])
    await ok(z.db.rpc('cancelar_turno', { p_turno: turno }))

    const avisos = await ok(servicio().from('mensajes').select('destino, canal, estado, cliente_id, contenido').eq('tipo', 'aviso').eq('negocio_id', m.negocioA.id))
    expect(avisos).toHaveLength(1)
    const xid = (await ok(servicio().from('clientes').select('id').eq('negocio_id', m.negocioA.id).eq('user_id', x.id).single())).id
    expect(avisos[0]).toMatchObject({ destino: x.tel.slice(1), canal: 'whatsapp', estado: 'pendiente', cliente_id: xid })
    const c = avisos[0]!.contenido as Record<string, string>
    expect(c).toMatchObject({ motivo: 'lista_espera', slug: m.negocioA.slug, turno_liberado: turno, servicio: 'Corte', hora: '10:00', nombre: 'Xime' })
    expect(c.texto).toContain('{link}')
    // Quedan marcadas como avisadas.
    const filas = await ok(x.db.from('lista_espera').select('avisado'))
    expect(filas.every((f) => f.avisado !== null)).toBe(true)
    // x no ve el mensaje (los mensajes son del staff), el dueño de A sí.
    esperarNada(await x.db.from('mensajes').select('id').eq('tipo', 'aviso'))
    expect(await ok(m.usuarios.duenoA.db.from('mensajes').select('id').eq('tipo', 'aviso'))).toHaveLength(1)
  })

  test('no avisa por otro servicio, otro día, un turno pasado, ni al que cancela', async () => {
    const D = diaAR(3)
    const xid = await ficha(m.negocioA.id, x, 'Xime')
    await ok(anotar(x, { dia: D, servicio: m.servicios.colorA }))
    await ok(anotar(x, { dia: diaAR(4) }))
    await ok(anotar(x, { dia: D }))
    // Cancela un Corte el día D... pero es su propio turno.
    const propio = await turnoA(xid, D, '15:00')
    await ok(x.db.rpc('cancelar_turno', { p_turno: propio }))
    // Otro cancela un Corte de un día en que x no está anotado para Corte con ese... (día 5).
    const z = m.usuarios.cliente1
    const zid = await crearCliente(m.negocioA.id, 'Zoe', z.id)
    await ok(z.db.rpc('cancelar_turno', { p_turno: await turnoA(zid, diaAR(5), '10:00') }))
    // El dueño cancela un turno que ya pasó.
    const pasado = await turnoA(zid, diaAR(-1), '10:00')
    await ok(m.usuarios.duenoA.db.from('turnos').update({ estado: 'cancelado' }).eq('id', pasado).select('id'))
    expect(await ok(servicio().from('mensajes').select('id').eq('tipo', 'aviso').eq('negocio_id', m.negocioA.id))).toEqual([])
  })
})

// -------------------------------------------------------------------------------------
test.describe('resenas', () => {
  const resena = (negocio: string, cliente: string, turno: string, puntaje = 5, comentario: string | null = null) => ({
    negocio_id: negocio, cliente_id: cliente, turno_id: turno, puntaje, comentario,
  })

  test('el cliente califica su turno asistido una sola vez, y ve la suya', async () => {
    const xa = await ficha(m.negocioA.id, x)
    const t = await turnoA(xa, diaAR(-2), '10:00', 'asistio')
    const fila = await ok(x.db.from('resenas').insert({ ...resena(m.negocioA.id, xa, t, 4, '  Bien  '), creado: '2020-01-01T00:00:00Z' }).select('puntaje, comentario, creado').single())
    expect(fila.puntaje).toBe(4)
    expect(fila.comentario).toBe('Bien')
    // La fecha la pone la base.
    expect(Date.now() - Date.parse(fila.creado)).toBeLessThan(60_000)
    esperarError(await x.db.from('resenas').insert(resena(m.negocioA.id, xa, t, 1)).select())
    expect(await ok(x.db.from('resenas').select('turno_id'))).toEqual([{ turno_id: t }])
    // No se modifica ni se borra.
    esperarBloqueado(await x.db.from('resenas').update({ puntaje: 1 }).eq('turno_id', t).select())
    esperarBloqueado(await x.db.from('resenas').delete().eq('turno_id', t).select())
    // Y aparece en mis_turnos_global.
    const g = await ok(x.db.rpc('mis_turnos_global'))
    expect(g.find((r: { id: string }) => r.id === t)?.puntaje).toBe(4)
  })

  test('no se califica un turno pendiente, confirmado, cancelado o al que faltó', async () => {
    const xa = await ficha(m.negocioA.id, x)
    for (const [i, estado] of ['pendiente', 'confirmado', 'cancelado', 'falto'].entries()) {
      const t = await turnoA(xa, diaAR(-2 - i), '10:00', estado)
      esperarError(await x.db.from('resenas').insert(resena(m.negocioA.id, xa, t)).select())
    }
  })

  test('nadie califica turnos ajenos ni se hace pasar por otro cliente o negocio', async () => {
    const xa = await ficha(m.negocioA.id, x)
    const ya = await ficha(m.negocioA.id, y)
    const deX = await turnoA(xa, diaAR(-2), '10:00', 'asistio')
    // y con el turno de x (con su ficha o con la de x).
    esperarError(await y.db.from('resenas').insert(resena(m.negocioA.id, ya, deX)).select())
    esperarError(await y.db.from('resenas').insert(resena(m.negocioA.id, xa, deX)).select())
    // x con otro negocio en la fila.
    esperarError(await x.db.from('resenas').insert(resena(m.negocioB.id, xa, deX)).select())
    // Puntaje fuera de rango y comentario largo.
    esperarError(await x.db.from('resenas').insert(resena(m.negocioA.id, xa, deX, 6)).select())
    esperarError(await x.db.from('resenas').insert(resena(m.negocioA.id, xa, deX, 0)).select())
    esperarError(await x.db.from('resenas').insert(resena(m.negocioA.id, xa, deX, 5, 'a'.repeat(501))).select())
    // El staff no califica por el cliente.
    esperarError(await m.usuarios.duenoA.db.from('resenas').insert(resena(m.negocioA.id, xa, deX)).select())
    // El anónimo tampoco.
    esperarError(await anonimo().from('resenas').insert(resena(m.negocioA.id, xa, deX)).select())
    expect(await ok(servicio().from('resenas').select('id').eq('turno_id', deX))).toEqual([])
  })

  test('cada cliente ve solo las suyas; el staff, las de su negocio; el anónimo nada', async () => {
    const xa = await ficha(m.negocioA.id, x)
    const ya = await ficha(m.negocioA.id, y)
    const tx = await turnoA(xa, diaAR(-2), '10:00', 'asistio')
    const ty = await turnoA(ya, diaAR(-2), '11:00', 'asistio')
    await ok(x.db.from('resenas').insert(resena(m.negocioA.id, xa, tx, 5)).select())
    await ok(y.db.from('resenas').insert(resena(m.negocioA.id, ya, ty, 3)).select())
    expect((await ok(x.db.from('resenas').select('turno_id'))).map((r) => r.turno_id)).toEqual([tx])
    expect((await ok(y.db.from('resenas').select('turno_id'))).map((r) => r.turno_id)).toEqual([ty])
    expect(await ok(m.usuarios.duenoA.db.from('resenas').select('id'))).toHaveLength(2)
    expect(await ok(m.usuarios.profesionalA.db.from('resenas').select('id'))).toHaveLength(2)
    esperarNada(await m.usuarios.duenoB.db.from('resenas').select('id').eq('negocio_id', m.negocioA.id))
    esperarNada(await anonimo().from('resenas').select('id'))
  })
})

// -------------------------------------------------------------------------------------
test.describe('calificacion_negocio', () => {
  test('cualquiera ve solo el promedio y la cantidad', async () => {
    const vacio = await ok(anonimo().rpc('calificacion_negocio', { p_negocio: m.negocioA.id }))
    expect(vacio).toEqual([{ promedio: null, cantidad: 0 }])

    const adm = servicio()
    const cli = await crearCliente(m.negocioA.id, 'Opina')
    for (const [i, p] of [5, 4, 4].entries()) {
      const t = await turnoA(cli, diaAR(-2 - i), '10:00', 'asistio')
      await ok(adm.from('resenas').insert({ negocio_id: m.negocioA.id, cliente_id: cli, turno_id: t, puntaje: p, comentario: 'privado' }).select('id'))
    }
    for (const db of [anonimo(), x.db, m.usuarios.duenoB.db]) {
      const r = await ok(db.rpc('calificacion_negocio', { p_negocio: m.negocioA.id }))
      expect(r).toEqual([{ promedio: 4.3, cantidad: 3 }])
      expect(Object.keys(r[0]!).sort()).toEqual(['cantidad', 'promedio'])
    }
    // Otro negocio no suma las de A.
    expect(await ok(anonimo().rpc('calificacion_negocio', { p_negocio: m.negocioB.id }))).toEqual([{ promedio: null, cantidad: 0 }])
  })
})
