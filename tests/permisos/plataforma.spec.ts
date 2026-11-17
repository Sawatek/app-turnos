// Consola de plataforma (migración 20261120100000_plataforma.sql + Edge Function admin-usuarios):
// cada función admin_* es SOLO para super admins, las notas internas no las ve nadie más,
// el dueño no se cambia el plan, y la Edge Function rechaza a quien no es super admin.
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { anonimo, limpiarMundo, prepararMundo, servicio, type Mundo } from '../soporte/mundo'
import { esperarError, esperarNada, ok } from './ayuda'

test.describe.configure({ mode: 'default' })

let m: Mundo
const mensajes: string[] = []
const usuariosCreados: string[] = []
const CODIGO = '481516'

test.beforeAll(async () => {
  m = await prepararMundo()
  const filas = await ok(
    servicio()
      .from('mensajes')
      .insert([
        { tipo: 'codigo', canal: 'whatsapp', destino: '5491100001111', contenido: { codigo: CODIGO }, estado: 'enviado', error: `fallo previo con ${CODIGO}` },
        { tipo: 'confirmacion', canal: 'whatsapp', destino: '5491100002222', negocio_id: m.negocioA.id, contenido: { texto: `Hola ${m.sufijo}, tu turno quedó` }, estado: 'error', error: 'sin_saldo' },
      ])
      .select('id'),
  )
  mensajes.push(...(filas as { id: string }[]).map((f) => f.id))
})

test.afterAll(async () => {
  const adm = servicio()
  if (mensajes.length) await adm.from('mensajes').delete().in('id', mensajes)
  await Promise.all(usuariosCreados.map((id) => adm.auth.admin.deleteUser(id)))
  await limpiarMundo(m)
})

const sa = () => m.usuarios.superadmin.db

/** Cada función nueva con argumentos válidos (para probar quién la puede llamar). */
const llamadas = () =>
  [
    ['admin_resumen', {}],
    ['admin_negocios', {}],
    ['admin_negocio', { p_negocio: m.negocioA.id }],
    ['admin_actualizar_negocio', { p_negocio: m.negocioA.id, p_cambios: { plan: 'Robado', estado: 'suspendido' } }],
    ['admin_cuentas', {}],
    ['admin_sumar_miembro', { p_user: m.usuarios.cliente2.id, p_negocio: m.negocioA.id, p_rol: 'dueno' }],
    ['admin_mensajes', {}],
  ] as const

test.describe('solo super admin', () => {
  for (const quien of ['duenoA', 'profesionalA', 'cliente1'] as const) {
    test(`${quien} no puede usar ninguna función de la consola`, async () => {
      for (const [fn, args] of llamadas()) {
        const r = await m.usuarios[quien].db.rpc(fn, args)
        esperarError(r, 'solo_superadmin')
      }
      // Nada cambió.
      const neg = await ok(servicio().from('negocios').select('estado, plan').eq('id', m.negocioA.id).single())
      expect(neg).toEqual({ estado: 'activo', plan: null })
      esperarNada(await servicio().from('miembros').select('rol').eq('negocio_id', m.negocioA.id).eq('user_id', m.usuarios.cliente2.id))
    })
  }

  test('el visitante anónimo no puede ni ejecutarlas', async () => {
    for (const [fn, args] of llamadas()) {
      const r = await anonimo().rpc(fn, args)
      expect(r.error, fn).not.toBeNull()
    }
  })
})

test.describe('super admin', () => {
  test('resumen: negocios por estado, turnos, mensajes y clientes del mes', async () => {
    const r = (await ok(sa().rpc('admin_resumen'))) as Record<string, Record<string, unknown>>
    expect(r.negocios).toMatchObject({ activo: expect.any(Number), prueba: expect.any(Number), suspendido: expect.any(Number) })
    expect(r.negocios!.activo as number).toBeGreaterThanOrEqual(2)
    expect(r.turnos).toHaveProperty('cancelados_con_aviso')
    expect(r.mensajes!.error as number).toBeGreaterThanOrEqual(1)
    expect(typeof r.clientes_nuevos).toBe('number')
  })

  test('lista y ficha de negocios reales, con dueños y equipo (nombre y mail)', async () => {
    const lista = (await ok(sa().rpc('admin_negocios'))) as { id: string; duenos: { email: string }[] }[]
    const a = lista.find((n) => n.id === m.negocioA.id)
    expect(a?.duenos.map((d) => d.email)).toEqual([m.usuarios.duenoA.email])
    expect(lista.some((n) => n.id === m.negocioB.id)).toBe(true)

    const ficha = (await ok(sa().rpc('admin_negocio', { p_negocio: m.negocioA.id }))) as { equipo: { email: string; rol: string }[]; slug: string }
    expect(ficha.slug).toBe(m.negocioA.slug)
    expect(ficha.equipo.map((e) => [e.email, e.rol]).sort()).toEqual(
      [
        [m.usuarios.duenoA.email, 'dueno'],
        [m.usuarios.profesionalA.email, 'profesional'],
      ].sort(),
    )
  })

  test('cambia estado, plan, notas internas y marca; valida lo que recibe', async () => {
    const id = m.negocioB.id
    try {
      await ok(sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { estado: 'prueba', plan: 'Pro', notas_internas: 'paga el 10', nombre: 'Negocio B2', color: '#123ABC', claim: 'Nuevo claim' } }))
      const neg = (await ok(servicio().from('negocios').select('estado, plan, config').eq('id', id).single())) as { estado: string; plan: string; config: Record<string, unknown> }
      expect(neg).toMatchObject({ estado: 'prueba', plan: 'Pro' })
      expect(neg.config).toMatchObject({ nombre: 'Negocio B2', color: '#123abc', claim: 'Nuevo claim', slug: m.negocioB.slug })
      const ficha = (await ok(sa().rpc('admin_negocio', { p_negocio: id }))) as { notas_internas: string }
      expect(ficha.notas_internas).toBe('paga el 10')

      esperarError(await sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { estado: 'borrado' } }), 'estado_invalido')
      esperarError(await sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { es_demo: true } }), 'campo_invalido')
      esperarError(await sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { color: 'rojo' } }), 'color_invalido')
      esperarError(await sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { logo: 'javascript:alert(1)' } }), 'logo_invalido')
    } finally {
      await ok(sa().rpc('admin_actualizar_negocio', { p_negocio: id, p_cambios: { estado: 'activo', plan: null } }))
    }
  })

  test('las notas internas no las ve el dueño ni el visitante, y el dueño no se cambia el plan', async () => {
    await ok(sa().rpc('admin_actualizar_negocio', { p_negocio: m.negocioA.id, p_cambios: { notas_internas: 'secreto' } }))
    esperarNada(await m.usuarios.duenoA.db.from('negocios_internos').select('notas_internas'))
    esperarNada(await anonimo().from('negocios_internos').select('notas_internas'))
    esperarError(await m.usuarios.duenoA.db.from('negocios_internos').upsert({ negocio_id: m.negocioA.id, notas_internas: 'mío' }))
    esperarError(await m.usuarios.duenoA.db.from('negocios').update({ plan: 'Gratis para siempre' }).eq('id', m.negocioA.id), 'solo_superadmin')
    // El dueño sí puede seguir editando lo suyo.
    const r = await m.usuarios.duenoA.db.from('negocios').update({ cancelacion_horas: 3 }).eq('id', m.negocioA.id).select('cancelacion_horas')
    expect(r.data).toEqual([{ cancelacion_horas: 3 }])
    await ok(servicio().from('negocios').update({ cancelacion_horas: 2 }).eq('id', m.negocioA.id))
  })

  test('cuentas: lista con negocios y roles; suma una cuenta a un negocio vinculando su ficha', async () => {
    const cuentas = (await ok(sa().rpc('admin_cuentas'))) as { user_id: string; email: string; es_superadmin: boolean; negocios: { id: string; rol: string }[] }[]
    const dueno = cuentas.find((c) => c.user_id === m.usuarios.duenoA.id)
    expect(dueno?.negocios).toEqual([expect.objectContaining({ id: m.negocioA.id, rol: 'dueno' })])
    expect(cuentas.find((c) => c.user_id === m.usuarios.superadmin.id)?.es_superadmin).toBe(true)

    await ok(sa().rpc('admin_sumar_miembro', { p_user: m.usuarios.cliente2.id, p_negocio: m.negocioB.id, p_rol: 'profesional', p_profesional: m.profesionales.pB }))
    try {
      expect(await ok(servicio().from('miembros').select('rol').eq('negocio_id', m.negocioB.id).eq('user_id', m.usuarios.cliente2.id))).toEqual([{ rol: 'profesional' }])
      expect(await ok(servicio().from('profesionales').select('user_id').eq('id', m.profesionales.pB).single())).toEqual({ user_id: m.usuarios.cliente2.id })
      esperarError(await sa().rpc('admin_sumar_miembro', { p_user: m.usuarios.cliente1.id, p_negocio: m.negocioB.id, p_rol: 'profesional', p_profesional: m.profesionales.pB }), 'profesional_con_cuenta')
      esperarError(await sa().rpc('admin_sumar_miembro', { p_user: m.usuarios.cliente1.id, p_negocio: m.negocioB.id, p_rol: 'jefe' }), 'rol_invalido')
    } finally {
      await servicio().from('profesionales').update({ user_id: null }).eq('id', m.profesionales.pB)
      await servicio().from('miembros').delete().eq('negocio_id', m.negocioB.id).eq('user_id', m.usuarios.cliente2.id)
    }
  })

  test('registro de mensajes: filtra y NUNCA devuelve el código', async () => {
    const todos = await ok(sa().rpc('admin_mensajes', { p_limite: 200 }))
    expect(JSON.stringify(todos)).not.toContain(CODIGO)
    const codigos = (await ok(sa().rpc('admin_mensajes', { p_tipo: 'codigo', p_limite: 200 }))) as { id: string; texto: string | null; destino: string }[]
    const mio = codigos.find((c) => c.id === mensajes[0])
    expect(mio).toBeDefined()
    expect(mio!.texto).toBeNull()
    expect(mio!.destino).not.toBe('5491100001111') // tapado a medias
    expect(JSON.stringify(codigos)).not.toContain(CODIGO)

    const deA = (await ok(sa().rpc('admin_mensajes', { p_negocio: m.negocioA.id, p_estado: 'error' }))) as { id: string; texto: string; negocio: string }[]
    expect(deA.map((x) => x.id)).toEqual([mensajes[1]])
    expect(deA[0]!.texto).toContain(m.sufijo)
  })
})

// ---------- Edge Function admin-usuarios ----------

const FN = `${process.env.SB_URL}/functions/v1/admin-usuarios`

async function hayFuncion() {
  try {
    const r = await fetch(FN, { method: 'OPTIONS' })
    return r.ok
  } catch {
    return false
  }
}

async function llamar(token: string | null, cuerpo: unknown) {
  const r = await fetch(FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cuerpo),
  })
  return { status: r.status, cuerpo: (await r.json().catch(() => ({}))) as { error?: string; user_id?: string; contrasena?: string; email?: string } }
}

const tokenDe = async (db: Mundo['usuarios']['duenoA']['db']) => (await db.auth.getSession()).data.session!.access_token

test.describe('Edge Function admin-usuarios', () => {
  test.beforeAll(async () => {
    // Necesita `supabase functions serve` (lo levanta: pnpm exec playwright test -c tests/funciones, o a mano).
    test.skip(!(await hayFuncion()), 'El edge runtime no está sirviendo admin-usuarios (correr: pnpm exec supabase functions serve)')
  })

  test('sin sesión → 401; dueño, profesional o cliente → 403 y no crea nada', async () => {
    const mail = `no-deberia-${m.sufijo}@ejemplo.com`
    expect((await llamar(null, { accion: 'crear', email: mail, nombre: 'Nadie' })).status).toBe(401)
    for (const quien of ['duenoA', 'profesionalA', 'cliente1'] as const) {
      const r = await llamar(await tokenDe(m.usuarios[quien].db), { accion: 'crear', email: mail, nombre: 'Nadie' })
      expect(r.status, quien).toBe(403)
      expect(r.cuerpo.error).toBe('solo_superadmin')
      const reset = await llamar(await tokenDe(m.usuarios[quien].db), { accion: 'resetear', user_id: m.usuarios.duenoB.id })
      expect(reset.status, quien).toBe(403)
    }
    const { data } = await servicio().auth.admin.listUsers({ perPage: 1000 })
    expect(data.users.some((u) => u.email === mail)).toBe(false)
    // Con una clave pública como "token" tampoco pasa.
    expect((await llamar(process.env.SB_PUBLISHABLE_KEY!, { accion: 'crear', email: mail, nombre: 'Nadie' })).status).toBe(403)
  })

  test('el super admin crea una cuenta confirmada, vinculada al negocio, y la resetea', async () => {
    const token = await tokenDe(sa())
    const email = `nuevo-prof-${m.sufijo}@ejemplo.com`
    const r = await llamar(token, { accion: 'crear', email, nombre: 'Prof Nuevo', negocio_id: m.negocioA.id, rol: 'profesional', profesional_id: m.profesionales.p2 })
    expect(r.status).toBe(200)
    usuariosCreados.push(r.cuerpo.user_id!)
    expect(r.cuerpo.contrasena).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/)

    const db = createClient(process.env.SB_URL!, process.env.SB_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    const login = await db.auth.signInWithPassword({ email, password: r.cuerpo.contrasena! })
    expect(login.error).toBeNull()
    expect(login.data.user?.user_metadata.display_name).toBe('Prof Nuevo')
    expect(await ok(db.rpc('mi_profesional', { p_negocio: m.negocioA.id }))).toBe(m.profesionales.p2)

    expect((await llamar(token, { accion: 'crear', email, nombre: 'Otra vez' })).status).toBe(409)

    const reset = await llamar(token, { accion: 'resetear', user_id: r.cuerpo.user_id })
    expect(reset.status).toBe(200)
    expect(reset.cuerpo.contrasena).not.toBe(r.cuerpo.contrasena)
    const viejo = createClient(process.env.SB_URL!, process.env.SB_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    expect((await viejo.auth.signInWithPassword({ email, password: r.cuerpo.contrasena! })).error).not.toBeNull()
    expect((await viejo.auth.signInWithPassword({ email, password: reset.cuerpo.contrasena! })).error).toBeNull()

    // Las cuentas de SawaTek no se resetean desde acá.
    expect((await llamar(token, { accion: 'resetear', user_id: m.usuarios.superadmin.id })).status).toBe(403)
  })
})
