// Permisos del SUPER ADMIN (SawaTek) y lo que un usuario común NO puede hacer en su lugar.
import { expect, test } from '@playwright/test'
import { aISO, diaAR, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { esperarBloqueado, esperarError, esperarNada, leer, ok, rango, reservar } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const D = () => diaAR(2)
const turnos = { a: '', b: '' }

test.beforeAll(async () => {
  m = await prepararMundo()
  const ra = await reservar(m.usuarios.cliente1.db, { negocio: m.negocioA.id, servicio: m.servicios.corteA, dia: D(), hora: '10:00' })
  const rb = await reservar(m.usuarios.cliente2.db, { negocio: m.negocioB.id, servicio: m.servicios.corteB, dia: D(), hora: '10:00' })
  expect(ra.error).toBeNull()
  expect(rb.error).toBeNull()
  turnos.a = ra.data!
  turnos.b = rb.data!
  await ok(servicio().from('bloqueos').insert([
    { negocio_id: m.negocioA.id, rango: rango(aISO(D(), '18:00'), aISO(D(), '19:00')) },
    { negocio_id: m.negocioB.id, rango: rango(aISO(D(), '18:00'), aISO(D(), '19:00')) },
  ]))
})
test.afterAll(async () => {
  await servicio().from('negocios').delete().like('slug', `%-${m.sufijo}-sa%`)
  await limpiarMundo(m)
})

const sa = () => m.usuarios.superadmin.db
const configDe = (slug: string) => ({ slug, nombre: 'Nuevo', rubro: 'barberia' })

test.describe('superadmin', () => {
  test('crea un negocio, le cambia estado, es_demo y slug, y lo borra', async () => {
    const slug = `n-${m.sufijo}-sa1`
    const creado = await sa().from('negocios').insert({ slug, config: configDe(slug), es_demo: false, estado: 'prueba' }).select('id, es_demo, estado').single()
    expect(creado.error).toBeNull()
    expect(creado.data).toMatchObject({ es_demo: false, estado: 'prueba' })
    const id = creado.data!.id

    expect((await sa().from('negocios').update({ estado: 'activo' }).eq('id', id).select('estado')).data).toEqual([{ estado: 'activo' }])
    expect((await sa().from('negocios').update({ es_demo: true }).eq('id', id).select('es_demo')).data).toEqual([{ es_demo: true }])
    const otro = `n-${m.sufijo}-sa2`
    const r = await sa().from('negocios').update({ slug: otro, config: configDe(otro) }).eq('id', id).select('slug')
    expect(r.error).toBeNull()
    expect(r.data).toEqual([{ slug: otro }])
    // Suspendido: lo sigue viendo él, no un cliente.
    expect((await sa().from('negocios').update({ estado: 'suspendido' }).eq('id', id).select('estado')).data).toEqual([{ estado: 'suspendido' }])
    expect(await ok(sa().from('negocios').select('id').eq('id', id))).toHaveLength(1)
    esperarNada(await m.usuarios.cliente1.db.from('negocios').select('id').eq('id', id))

    expect((await sa().from('negocios').delete().eq('id', id).select('id')).data).toHaveLength(1)
    expect(await ok(servicio().from('negocios').select('id').eq('id', id))).toEqual([])
  })

  test('ve todo: turnos, clientes, miembros y bloqueos de A y de B', async () => {
    const ids = [m.negocioA.id, m.negocioB.id]
    const ts = await ok(sa().from('turnos').select('id').in('negocio_id', ids))
    expect(ts.map((x) => x.id).sort()).toEqual([turnos.a, turnos.b].sort())
    const cs = await ok(sa().from('clientes').select('negocio_id').in('negocio_id', ids))
    expect(new Set(cs.map((c) => c.negocio_id))).toEqual(new Set(ids))
    const ms = await ok(sa().from('miembros').select('user_id').in('negocio_id', ids))
    expect(ms).toHaveLength(3)
    const bs = await ok(sa().from('bloqueos').select('negocio_id').in('negocio_id', ids))
    expect(bs).toHaveLength(2)
  })

  test('ve un negocio suspendido', async () => {
    expect((await sa().from('negocios').update({ estado: 'suspendido' }).eq('id', m.negocioB.id).select('id')).error).toBeNull()
    try {
      expect(await ok(sa().from('negocios').select('id').eq('id', m.negocioB.id))).toHaveLength(1)
      esperarNada(await m.usuarios.duenoA.db.from('negocios').select('id').eq('id', m.negocioB.id))
      // El dueño de B sí ve su negocio suspendido (es staff).
      expect(await ok(m.usuarios.duenoB.db.from('negocios').select('id').eq('id', m.negocioB.id))).toHaveLength(1)
    } finally {
      await ok(sa().from('negocios').update({ estado: 'activo' }).eq('id', m.negocioB.id))
    }
  })

  test('maneja cualquier negocio: edita B, nombra dueños y borra turnos', async () => {
    expect((await sa().from('servicios').update({ precio: 11000 }).eq('id', m.servicios.corteB).select('precio')).data).toEqual([{ precio: 11000 }])
    const dueno = await sa().from('miembros').insert({ negocio_id: m.negocioB.id, user_id: m.usuarios.cliente1.id, rol: 'dueno' })
    expect(dueno.error).toBeNull()
    expect((await sa().from('miembros').update({ rol: 'profesional' }).eq('negocio_id', m.negocioB.id).eq('user_id', m.usuarios.cliente1.id).select('rol')).data).toEqual([{ rol: 'profesional' }])
    expect((await sa().from('miembros').delete().eq('negocio_id', m.negocioB.id).eq('user_id', m.usuarios.cliente1.id).select('rol')).data).toHaveLength(1)
    const borrado = await sa().from('turnos').delete().eq('id', turnos.b).select('id')
    expect(borrado.data).toHaveLength(1)
  })
})

test.describe('usuarios comunes vs. cosas de SawaTek', () => {
  for (const quien of ['duenoA', 'profesionalA', 'cliente1'] as const) {
    test(`${quien} no puede crear negocios`, async () => {
      const slug = `n-${m.sufijo}-sa-${quien.toLowerCase()}`
      esperarError(await m.usuarios[quien].db.from('negocios').insert({ slug, config: configDe(slug), es_demo: false }))
      expect(await ok(servicio().from('negocios').select('id').eq('slug', slug))).toEqual([])
    })

    test(`${quien} no puede leer ni escribir superadmins`, async () => {
      const db = m.usuarios[quien].db
      esperarNada(await db.from('superadmins').select('*'))
      // Ni anotarse a sí mismo como super admin.
      esperarError(await db.from('superadmins').insert({ email: m.usuarios[quien].email }))
      esperarBloqueado(await db.from('superadmins').update({ email: m.usuarios[quien].email }).eq('email', m.usuarios.superadmin.email).select('*'))
      esperarBloqueado(await db.from('superadmins').delete().eq('email', m.usuarios.superadmin.email).select('*'))
      expect(await ok(servicio().from('superadmins').select('email').in('email', [m.usuarios.superadmin.email, m.usuarios[quien].email]))).toEqual([
        { email: m.usuarios.superadmin.email },
      ])
    })
  }

  test('un usuario común no puede borrar negocios', async () => {
    for (const quien of ['duenoA', 'cliente1'] as const) {
      esperarBloqueado(await m.usuarios[quien].db.from('negocios').delete().eq('id', m.negocioA.id).select('id'))
    }
    expect(await leer('negocios', m.negocioA.id, 'id')).toEqual({ id: m.negocioA.id })
  })
})

test.describe('mantenimiento con la clave secreta', () => {
  test('la clave secreta (o el SQL Editor) puede suspender un negocio', async () => {
    // Corregido (lo encontró este test): el trigger proteger_negocio solo deja pasar a es_superadmin(), que lee el mail del JWT. La clave
    // secreta (service_role) y el SQL Editor (postgres, sin JWT) no tienen mail, así que reciben
    // 'solo_superadmin' al cambiar estado, slug o es_demo. SawaTek no puede suspender un negocio desde el
    // panel de Supabase ni desde un script/backend; solo logueado en la app con un mail de superadmins.
    const r = await servicio().from('negocios').update({ estado: 'suspendido' }).eq('id', m.negocioB.id).select('estado')
    try {
      expect(r.error).toBeNull()
      expect(r.data).toEqual([{ estado: 'suspendido' }])
    } finally {
      await sa().from('negocios').update({ estado: 'activo' }).eq('id', m.negocioB.id)
    }
  })
})
