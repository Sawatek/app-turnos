// Permisos de las funciones del panel real (fase 2): quién puede y quién no.
//   panel_resumen · panel_miembros · panel_quitar_miembro · panel_guardar_horarios · panel_guardar_servicios_profesional
import { expect, test } from '@playwright/test'
import { aISO, anonimo, crearUsuario, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo, type Usuario } from '../soporte/mundo'
import { crearCliente, crearTurno, esperarError, ok } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
let extra: Usuario // profesional de A que se quita en el test de panel_quitar_miembro
let pExtra: string
const D = () => diaAR(2)

test.beforeAll(async () => {
  m = await prepararMundo()
  const adm = servicio()
  const c = await crearCliente(m.negocioA.id, 'Cliente resumen')
  // Día D: P1 tiene 3 turnos (pendiente, confirmado, falto) y uno cancelado; P2 tiene 1 confirmado.
  const t = (prof: string, hora: string, estado: string, servicioId = m.servicios.corteA) =>
    crearTurno({ negocio: m.negocioA.id, cliente: c, profesional: prof, servicio: servicioId, inicio: aISO(D(), hora), estado })
  await t(m.profesionales.p1, '10:00', 'pendiente')
  await t(m.profesionales.p1, '11:00', 'confirmado')
  await t(m.profesionales.p1, '12:00', 'falto')
  await t(m.profesionales.p1, '15:00', 'cancelado')
  await t(m.profesionales.p2, '10:00', 'confirmado')

  // Un profesional más (con usuario e invitación aceptada) para probar quitarlo.
  extra = await crearUsuario(`extra-${m.sufijo}@ejemplo.com`)
  pExtra = (await ok(adm.from('profesionales').insert({ negocio_id: m.negocioA.id, nombre: 'Extra', user_id: extra.id, orden: 5 }).select('id').single())).id
  await ok(adm.from('miembros').insert({ negocio_id: m.negocioA.id, user_id: extra.id, rol: 'profesional' }))
  await ok(adm.from('invitaciones').insert({ negocio_id: m.negocioA.id, email: extra.email, rol: 'profesional', profesional_id: pExtra, aceptada: new Date().toISOString() }))
})

test.afterAll(async () => {
  await limpiarMundo(m)
  if (extra) await servicio().auth.admin.deleteUser(extra.id)
})

type R = { data: unknown; error: { message?: string; code?: string } | null }
const resumen = (db: ReturnType<typeof anonimo>, negocio: string, profesional?: string) =>
  db.rpc('panel_resumen', { p_negocio: negocio, p_dia: D(), ...(profesional ? { p_profesional: profesional } : {}) }) as unknown as Promise<R>
const fila = (r: R) => (r.data as { turnos_dia: number; confirmados: number; faltas_mes: number; facturacion: number }[])[0]!

test.describe('panel_resumen', () => {
  test('el dueño ve los números de todo el negocio (y puede filtrar por profesional)', async () => {
    const r = await resumen(m.usuarios.duenoA.db, m.negocioA.id)
    expect(r.error).toBeNull()
    // Activos del día: 3 de P1 (sin el cancelado) + 1 de P2. Confirmados: 2. Faltas: 1.
    // Facturación: corte 12000 × (pendiente + confirmado de P1 + confirmado de P2) = 36000 (sin la falta ni el cancelado).
    expect(fila(r)).toEqual({ turnos_dia: 4, confirmados: 2, faltas_mes: 1, facturacion: 36000 })
    const soloP2 = await resumen(m.usuarios.duenoA.db, m.negocioA.id, m.profesionales.p2)
    expect(fila(soloP2)).toEqual({ turnos_dia: 1, confirmados: 1, faltas_mes: 0, facturacion: 12000 })
  })

  test('el superadmin también puede', async () => {
    const r = await resumen(m.usuarios.superadmin.db, m.negocioA.id)
    expect(r.error).toBeNull()
    expect(fila(r).turnos_dia).toBe(4)
  })

  test('el profesional ve SOLO lo suyo, aunque pida el de otro', async () => {
    const r = await resumen(m.usuarios.profesionalA.db, m.negocioA.id, m.profesionales.p2)
    expect(r.error).toBeNull()
    expect(fila(r)).toEqual({ turnos_dia: 3, confirmados: 1, faltas_mes: 1, facturacion: 24000 })
  })

  test('el dueño de otro negocio, un cliente y un anónimo no pueden', async () => {
    esperarError(await resumen(m.usuarios.duenoB.db, m.negocioA.id), 'sin_permiso')
    esperarError(await resumen(m.usuarios.cliente1.db, m.negocioA.id), 'sin_permiso')
    esperarError(await resumen(anonimo(), m.negocioA.id))
  })
})

test.describe('panel_miembros', () => {
  const miembros = (db: ReturnType<typeof anonimo>, negocio: string) => db.rpc('panel_miembros', { p_negocio: negocio }) as unknown as Promise<R>

  test('el dueño ve a su equipo con los mails', async () => {
    const r = await miembros(m.usuarios.duenoA.db, m.negocioA.id)
    expect(r.error).toBeNull()
    const lista = r.data as { email: string; rol: string; profesional: string | null }[]
    expect(lista).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: m.usuarios.duenoA.email, rol: 'dueno' }),
        expect.objectContaining({ email: m.usuarios.profesionalA.email, rol: 'profesional', profesional: 'P1' }),
      ]),
    )
    // Nada de otro negocio.
    expect(lista.map((x) => x.email)).not.toContain(m.usuarios.duenoB.email)
  })

  test('el superadmin puede; el profesional, el dueño de otro negocio, un cliente y un anónimo no', async () => {
    expect((await miembros(m.usuarios.superadmin.db, m.negocioA.id)).error).toBeNull()
    esperarError(await miembros(m.usuarios.profesionalA.db, m.negocioA.id), 'sin_permiso')
    esperarError(await miembros(m.usuarios.duenoB.db, m.negocioA.id), 'sin_permiso')
    esperarError(await miembros(m.usuarios.cliente1.db, m.negocioA.id), 'sin_permiso')
    esperarError(await miembros(anonimo(), m.negocioA.id))
  })
})

test.describe('panel_guardar_horarios', () => {
  const guardar = (db: ReturnType<typeof anonimo>, prof: string, franjas: unknown) =>
    db.rpc('panel_guardar_horarios', { p_profesional: prof, p_franjas: franjas }) as unknown as Promise<R>
  const horariosDe = async (prof: string) =>
    (await ok(servicio().from('horarios').select('dia, desde, hasta').eq('profesional_id', prof).order('dia').order('desde'))) as {
      dia: number
      desde: string
      hasta: string
    }[]

  test('el dueño reemplaza la semana de un profesional (con turno cortado)', async () => {
    const r = await guardar(m.usuarios.duenoA.db, pExtra, [
      { dia: 1, desde: '09:00', hasta: '13:00' },
      { dia: 1, desde: '14:00', hasta: '20:00' },
      { dia: 6, desde: '10:00', hasta: '14:00' },
    ])
    expect(r.error).toBeNull()
    expect(await horariosDe(pExtra)).toEqual([
      { dia: 1, desde: '09:00:00', hasta: '13:00:00' },
      { dia: 1, desde: '14:00:00', hasta: '20:00:00' },
      { dia: 6, desde: '10:00:00', hasta: '14:00:00' },
    ])
  })

  test('rechaza franjas mal armadas o superpuestas, sin tocar lo guardado', async () => {
    const antes = await horariosDe(pExtra)
    esperarError(await guardar(m.usuarios.duenoA.db, pExtra, [{ dia: 1, desde: '13:00', hasta: '09:00' }]), 'franjas_invalidas')
    esperarError(await guardar(m.usuarios.duenoA.db, pExtra, [{ dia: 9, desde: '09:00', hasta: '10:00' }]), 'franjas_invalidas')
    esperarError(await guardar(m.usuarios.duenoA.db, pExtra, [{ dia: 1, desde: 'nueve', hasta: '10:00' }]), 'franjas_invalidas')
    esperarError(await guardar(m.usuarios.duenoA.db, pExtra, { dia: 1 }), 'franjas_invalidas')
    esperarError(
      await guardar(m.usuarios.duenoA.db, pExtra, [
        { dia: 2, desde: '09:00', hasta: '13:00' },
        { dia: 2, desde: '12:00', hasta: '15:00' },
      ]),
      'franjas_superpuestas',
    )
    expect(await horariosDe(pExtra)).toEqual(antes)
  })

  test('el profesional, el dueño de otro negocio, un cliente y un anónimo no pueden', async () => {
    const antes = await horariosDe(m.profesionales.p1)
    const franjas = [{ dia: 1, desde: '05:00', hasta: '06:00' }]
    esperarError(await guardar(m.usuarios.profesionalA.db, m.profesionales.p1, franjas), 'sin_permiso')
    esperarError(await guardar(m.usuarios.duenoB.db, m.profesionales.p1, franjas), 'sin_permiso')
    esperarError(await guardar(m.usuarios.cliente1.db, m.profesionales.p1, franjas), 'sin_permiso')
    esperarError(await guardar(anonimo(), m.profesionales.p1, franjas))
    // El dueño de A tampoco toca a un profesional de B.
    esperarError(await guardar(m.usuarios.duenoA.db, m.profesionales.pB, franjas), 'sin_permiso')
    expect(await horariosDe(m.profesionales.p1)).toEqual(antes)
  })
})

test.describe('panel_guardar_servicios_profesional', () => {
  const guardar = (db: ReturnType<typeof anonimo>, prof: string, servicios: string[]) =>
    db.rpc('panel_guardar_servicios_profesional', { p_profesional: prof, p_servicios: servicios }) as unknown as Promise<R>
  const serviciosDe = async (prof: string) =>
    ((await ok(servicio().from('profesional_servicios').select('servicio_id').eq('profesional_id', prof))) as { servicio_id: string }[])
      .map((x) => x.servicio_id)
      .sort()

  test('el dueño asigna servicios y con la lista vacía vuelve a "hace todos"', async () => {
    expect((await guardar(m.usuarios.duenoA.db, pExtra, [m.servicios.colorA, m.servicios.corteA, m.servicios.colorA])).error).toBeNull()
    expect(await serviciosDe(pExtra)).toEqual([m.servicios.colorA, m.servicios.corteA].sort())
    expect((await guardar(m.usuarios.duenoA.db, pExtra, [])).error).toBeNull()
    expect(await serviciosDe(pExtra)).toEqual([])
  })

  test('no acepta servicios de otro negocio', async () => {
    esperarError(await guardar(m.usuarios.duenoA.db, pExtra, [m.servicios.corteB]), 'servicio_invalido')
    expect(await serviciosDe(pExtra)).toEqual([])
  })

  test('el profesional, el dueño de otro negocio, un cliente y un anónimo no pueden', async () => {
    esperarError(await guardar(m.usuarios.profesionalA.db, m.profesionales.p1, [m.servicios.corteA]), 'sin_permiso')
    esperarError(await guardar(m.usuarios.duenoB.db, m.profesionales.p1, [m.servicios.corteA]), 'sin_permiso')
    esperarError(await guardar(m.usuarios.cliente1.db, m.profesionales.p1, [m.servicios.corteA]), 'sin_permiso')
    esperarError(await guardar(anonimo(), m.profesionales.p1, [m.servicios.corteA]))
    esperarError(await guardar(m.usuarios.duenoA.db, m.profesionales.pB, [m.servicios.corteB]), 'sin_permiso')
    expect(await serviciosDe(m.profesionales.p1)).toEqual([])
  })
})

test.describe('panel_quitar_miembro', () => {
  const quitar = (db: ReturnType<typeof anonimo>, negocio: string, user: string) =>
    db.rpc('panel_quitar_miembro', { p_negocio: negocio, p_user: user }) as unknown as Promise<R>

  test('nadie más que el dueño puede quitar, y nadie quita a un dueño desde el panel', async () => {
    esperarError(await quitar(m.usuarios.profesionalA.db, m.negocioA.id, extra.id), 'sin_permiso')
    esperarError(await quitar(m.usuarios.duenoB.db, m.negocioA.id, extra.id), 'sin_permiso')
    esperarError(await quitar(m.usuarios.cliente1.db, m.negocioA.id, extra.id), 'sin_permiso')
    esperarError(await quitar(anonimo(), m.negocioA.id, extra.id))
    esperarError(await quitar(m.usuarios.duenoA.db, m.negocioA.id, m.usuarios.duenoA.id), 'no_se_puede_quitar')
    esperarError(await quitar(m.usuarios.duenoA.db, m.negocioA.id, m.usuarios.cliente1.id), 'miembro_no_encontrado')
    const sigue = await ok(servicio().from('miembros').select('rol').eq('negocio_id', m.negocioA.id).eq('user_id', extra.id))
    expect(sigue).toEqual([{ rol: 'profesional' }])
  })

  test('el dueño quita a un profesional: pierde el acceso, su agenda queda sin usuario y se puede reinvitar', async () => {
    expect((await quitar(m.usuarios.duenoA.db, m.negocioA.id, extra.id)).error).toBeNull()
    const adm = servicio()
    expect(await ok(adm.from('miembros').select('rol').eq('negocio_id', m.negocioA.id).eq('user_id', extra.id))).toEqual([])
    expect(await ok(adm.from('profesionales').select('user_id').eq('id', pExtra).single())).toEqual({ user_id: null })
    expect(await ok(adm.from('invitaciones').select('id').eq('negocio_id', m.negocioA.id).eq('email', extra.email))).toEqual([])
    // Ya no ve nada del negocio.
    expect((await extra.db.rpc('rol_en', { p_negocio: m.negocioA.id })).data).toBeNull()
    esperarError(await resumen(extra.db, m.negocioA.id), 'sin_permiso')
  })
})
