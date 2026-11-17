// Ayudas para los tests de la app del cliente REAL (no es un archivo de tests).
// Todo lo que use servicio() es SOLO para preparar datos o verificar: saltea las reglas RLS.
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { CLAVE, servicio } from '../../soporte/mundo'

const opciones = { auth: { persistSession: false, autoRefreshToken: false } }

export interface ClienteCelular {
  id: string
  /** +549… */
  tel: string
  /** "11 2345-6789" (como lo escribe la gente). */
  nacional: string
  db: SupabaseClient
  sesion: Session
}

/** Un celular argentino al azar (+54 9 11 …), distinto en cada test. */
export function nuevoTelefono() {
  const ocho = String(Math.floor(10_000_000 + Math.random() * 89_999_999))
  const nacional = `11${ocho}`
  return { e164: `+549${nacional}`, nacional: `${nacional.slice(0, 2)} ${nacional.slice(2, 6)}-${nacional.slice(6)}` }
}

/**
 * Crea un cliente que entra con el celular, ya confirmado, y le inicia sesión.
 * (Con contraseña para no gastar códigos: el ingreso real con código se prueba aparte.)
 */
export async function crearClienteCelular(): Promise<ClienteCelular> {
  const { e164, nacional } = nuevoTelefono()
  const { data, error } = await servicio().auth.admin.createUser({ phone: e164, password: CLAVE, phone_confirm: true })
  if (error) throw error
  const db = createClient(process.env.SB_URL!, process.env.SB_PUBLISHABLE_KEY!, opciones)
  const r = await db.auth.signInWithPassword({ phone: e164, password: CLAVE })
  if (r.error || !r.data.session) throw r.error ?? new Error('Sin sesión')
  return { id: data.user.id, tel: e164, nacional, db, sesion: r.data.session }
}

/** Abre la app ya logueado como ese cliente (deja la sesión donde la guarda supabase-js). */
export async function entrarComo(page: Page, c: ClienteCelular) {
  const host = new URL(process.env.SB_URL!).hostname.split('.')[0]
  await page.addInitScript(
    ([clave, valor]) => {
      if (!localStorage.getItem(clave!)) localStorage.setItem(clave!, valor!)
    },
    [`sb-${host}-auth-token`, JSON.stringify(c.sesion)],
  )
}

/** Último código de ingreso que "se mandó por WhatsApp" a ese celular (lo deja el hook en `mensajes`). */
export async function ultimoCodigo(e164: string, despuesDe?: string): Promise<string> {
  const destino = e164.replace(/\D/g, '')
  for (let i = 0; i < 40; i++) {
    let q = servicio().from('mensajes').select('contenido, creado').eq('tipo', 'codigo').eq('destino', destino)
    if (despuesDe) q = q.gt('creado', despuesDe)
    const { data } = await q.order('creado', { ascending: false }).limit(1)
    const codigo = (data?.[0]?.contenido as { codigo?: string } | undefined)?.codigo
    if (codigo) return codigo
    await new Promise((ok) => setTimeout(ok, 250))
  }
  throw new Error(`No llegó el código para ${e164}`)
}

/** Borra el usuario de un celular (si existe) y sus mensajes de código. */
export async function borrarCelular(e164: string) {
  const adm = servicio()
  const destino = e164.replace(/\D/g, '')
  await adm.from('mensajes').delete().eq('destino', destino)
  const { data } = await adm.auth.admin.listUsers({ perPage: 1000 })
  const u = data?.users.find((x) => x.phone === destino)
  if (u) await adm.auth.admin.deleteUser(u.id)
}

/** Etiqueta accesible del botón de un día en la tira ("Mañana 17: …", "Jueves 19: …"). */
export function botonDia(dia: string) {
  const numero = Number(dia.slice(8, 10))
  return new RegExp(`^\\S+ ${numero}: `)
}

/** Los 400 que devuelve la base cuando una función rechaza algo (la app los muestra bien). */
export const ERROR_HTTP = /Failed to load resource: the server responded with a status of 4\d\d/

/** Ficha de cliente en un negocio para un usuario (como si ya hubiera reservado antes). Devuelve su id. */
export async function fichaEn(negocioId: string, userId: string, nombre: string, telefono?: string) {
  const { data, error } = await servicio()
    .from('clientes')
    .insert({ negocio_id: negocioId, user_id: userId, nombre, telefono: telefono ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Turno cargado directo en la base (para preparar casos: en el pasado, ya asistido, etc.). */
export async function turnoDirecto(t: {
  negocioId: string
  clienteId: string
  profesionalId: string
  servicioId: string
  inicio: string
  minutos?: number
  estado?: string
}) {
  const fin = new Date(Date.parse(t.inicio) + (t.minutos ?? 30) * 60_000).toISOString()
  const { data, error } = await servicio()
    .from('turnos')
    .insert({
      negocio_id: t.negocioId, cliente_id: t.clienteId, profesional_id: t.profesionalId, servicio_id: t.servicioId,
      inicio: t.inicio, fin, estado: t.estado ?? 'pendiente',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}
