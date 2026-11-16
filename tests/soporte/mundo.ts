// "Mundo" de prueba: arma en la Supabase LOCAL dos negocios reales con usuarios de cada rol.
// Cada archivo de test arma el suyo (con un sufijo único), así los tests corren en paralelo sin pisarse.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SB_URL!
const PUB = process.env.SB_PUBLISHABLE_KEY!
const SECRETA = process.env.SB_SECRET_KEY!
if (!URL || !PUB || !SECRETA) throw new Error('Faltan las claves de Supabase local (las carga playwright.config.ts).')

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }

/** Cliente con la clave secreta: SOLO para preparar y limpiar datos. Saltea las reglas RLS. */
export const servicio = () => createClient(URL, SECRETA, opciones)
/** Visitante sin sesión (la app pública). */
export const anonimo = () => createClient(URL, PUB, opciones)

export const CLAVE = 'Clave-de-prueba-123'

export interface Usuario {
  id: string
  email: string
  /** Cliente de Supabase ya logueado como este usuario. */
  db: SupabaseClient
}

/** Crea un usuario confirmado y devuelve una sesión iniciada con él. */
export async function crearUsuario(email: string): Promise<Usuario> {
  const adm = servicio()
  const { data, error } = await adm.auth.admin.createUser({ email, password: CLAVE, email_confirm: true })
  if (error) throw error
  const db = createClient(URL, PUB, opciones)
  const { error: e2 } = await db.auth.signInWithPassword({ email, password: CLAVE })
  if (e2) throw e2
  return { id: data.user.id, email, db }
}

// ---------- Fechas en hora argentina (UTC-3, sin horario de verano) ----------

/** 'AAAA-MM-DD' de hoy + n días, en hora argentina. */
export function diaAR(n = 1): string {
  const ahora = new Date(Date.now() + n * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora)
}
/** Instante ISO para un día y hora argentinos. */
export const aISO = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString()

// ---------- El mundo ----------

export interface Mundo {
  sufijo: string
  negocioA: { id: string; slug: string }
  negocioB: { id: string; slug: string }
  /** Servicios de A: corte (30 min, lo hacen los dos) y color (60 min, solo p1). */
  servicios: { corteA: string; colorA: string; corteB: string }
  /** p1 tiene usuario (rol profesional) y hace corte y color, con descanso 13–14. p2 sin usuario, solo corte, 9–20. */
  profesionales: { p1: string; p2: string; pB: string }
  usuarios: {
    superadmin: Usuario
    duenoA: Usuario
    profesionalA: Usuario
    duenoB: Usuario
    cliente1: Usuario
    cliente2: Usuario
  }
}

const configDe = (slug: string, nombre: string) => ({
  slug, nombre, rubro: 'barberia', bajada: 'Barbería · Pruebas', direccion: 'Calle Falsa 123', whatsapp: '11 0000-0000',
  color: '#e0b352', modo: 'oscuro', personalidad: 'clasica', claim: 'Negocio de prueba',
  servicios: [], staff: [], horario: { dias: [], desde: '09:00', hasta: '20:00', intervalo: 15 }, sena: 0,
  promosTitulo: '', promos: [], fidelidad: { meta: 5, texto: '', premio: '' },
  textos: { pregunta: '', conQuien: '', reservar: 'Reservar', cliente: 'cliente', clientes: 'clientes' },
  mensajes: { recordatorio24: '', recordatorio2: '', recuperar: '' }, recuperarDias: 30,
})

async function ok<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data
}

export async function prepararMundo(): Promise<Mundo> {
  const sufijo = Math.random().toString(36).slice(2, 8)
  const mail = (quien: string) => `${quien}-${sufijo}@ejemplo.com`
  const adm = servicio()

  const [superadmin, duenoA, profesionalA, duenoB, cliente1, cliente2] = (await Promise.all(
    ['superadmin', 'dueno-a', 'profesional-a', 'dueno-b', 'cliente-1', 'cliente-2'].map((q) => crearUsuario(mail(q))),
  )) as [Usuario, Usuario, Usuario, Usuario, Usuario, Usuario]
  await ok(adm.from('superadmins').insert({ email: superadmin.email }))

  const [nA, nB] = await ok(
    adm
      .from('negocios')
      .insert([
        { slug: `a-${sufijo}`, config: configDe(`a-${sufijo}`, 'Negocio A'), es_demo: false, estado: 'activo' },
        { slug: `b-${sufijo}`, config: configDe(`b-${sufijo}`, 'Negocio B'), es_demo: false, estado: 'activo' },
      ])
      .select('id, slug')
      .order('slug'),
  ) as { id: string; slug: string }[]

  const servs = await ok(
    adm
      .from('servicios')
      .insert([
        { negocio_id: nA!.id, nombre: 'Corte', minutos: 30, precio: 12000, orden: 0 },
        { negocio_id: nA!.id, nombre: 'Color', minutos: 60, precio: 25000, orden: 1 },
        { negocio_id: nB!.id, nombre: 'Corte B', minutos: 30, precio: 10000, orden: 0 },
      ])
      .select('id, nombre'),
  ) as { id: string; nombre: string }[]
  const sid = (nombre: string) => servs.find((s) => s.nombre === nombre)!.id

  const profs = await ok(
    adm
      .from('profesionales')
      .insert([
        { negocio_id: nA!.id, nombre: 'P1', user_id: profesionalA.id, orden: 0 },
        { negocio_id: nA!.id, nombre: 'P2', orden: 1 },
        { negocio_id: nB!.id, nombre: 'PB', orden: 0 },
      ])
      .select('id, nombre'),
  ) as { id: string; nombre: string }[]
  const pid = (nombre: string) => profs.find((p) => p.nombre === nombre)!.id

  // P2 solo hace corte. P1 no tiene filas = hace todo.
  await ok(adm.from('profesional_servicios').insert({ negocio_id: nA!.id, profesional_id: pid('P2'), servicio_id: sid('Corte') }))

  const horarios = []
  for (let dia = 0; dia <= 6; dia++) {
    horarios.push(
      { negocio_id: nA!.id, profesional_id: pid('P1'), dia, desde: '09:00', hasta: '13:00' },
      { negocio_id: nA!.id, profesional_id: pid('P1'), dia, desde: '14:00', hasta: '20:00' },
      { negocio_id: nA!.id, profesional_id: pid('P2'), dia, desde: '09:00', hasta: '20:00' },
      { negocio_id: nB!.id, profesional_id: pid('PB'), dia, desde: '09:00', hasta: '20:00' },
    )
  }
  await ok(adm.from('horarios').insert(horarios))

  await ok(
    adm.from('miembros').insert([
      { negocio_id: nA!.id, user_id: duenoA.id, rol: 'dueno' },
      { negocio_id: nA!.id, user_id: profesionalA.id, rol: 'profesional' },
      { negocio_id: nB!.id, user_id: duenoB.id, rol: 'dueno' },
    ]),
  )

  return {
    sufijo,
    negocioA: nA!,
    negocioB: nB!,
    servicios: { corteA: sid('Corte'), colorA: sid('Color'), corteB: sid('Corte B') },
    profesionales: { p1: pid('P1'), p2: pid('P2'), pB: pid('PB') },
    usuarios: { superadmin, duenoA, profesionalA, duenoB, cliente1, cliente2 },
  }
}

/** Borra todo lo que creó el mundo (negocios en cascada y usuarios). */
export async function limpiarMundo(m: Mundo) {
  const adm = servicio()
  await adm.from('negocios').delete().in('id', [m.negocioA.id, m.negocioB.id])
  await adm.from('superadmins').delete().eq('email', m.usuarios.superadmin.email)
  await Promise.all(Object.values(m.usuarios).map((u) => adm.auth.admin.deleteUser(u.id)))
}
