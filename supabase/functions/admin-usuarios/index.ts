// Edge Function `admin-usuarios`: SawaTek crea y resetea cuentas con mail y contraseña SIN depender del mail
// (el servicio de mails gratis de Supabase casi no manda). La llama la consola /admin → Cuentas.
//
// Seguridad:
//   1. Quien llama tiene que mandar SU sesión (Authorization: Bearer <access token>) y ser super admin:
//      se pregunta a la base con ese mismo token (rpc es_superadmin), así manda la misma regla que en todo lo demás.
//   2. Recién ahí se usa la clave secreta (service role) para crear la cuenta confirmada o cambiarle la contraseña.
//   3. La contraseña se genera acá y se devuelve UNA vez (no se guarda en ningún lado).
//
// Cuerpo (JSON):
//   { "accion": "crear", "email": "...", "nombre": "...", "negocio_id"?: uuid, "rol"?: "dueno" | "profesional", "profesional_id"?: uuid }
//   { "accion": "resetear", "user_id": uuid }
// Respuesta: { ok: true, user_id, email, contrasena } o { error: "<codigo>", detalle? } con 4xx/5xx.
//
// Despliegue: `supabase functions deploy admin-usuarios` (con verificación de JWT: la sesión del usuario es un JWT).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } })

const env = (n: string) => (Deno.env.get(n) ?? '').trim()
const opciones = { auth: { persistSession: false, autoRefreshToken: false } }

/** Contraseña legible para dictar o copiar: 3 bloques de 4 (sin 0/O/1/l/I), ~60 bits. */
function generarContrasena(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  const c = Array.from(bytes, (b) => letras[b % letras.length]).join('')
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`
}

async function esSuperadmin(comoUsuario: SupabaseClient): Promise<boolean> {
  const { data, error } = await comoUsuario.rpc('es_superadmin')
  return !error && data === true
}

async function crear(adm: SupabaseClient, comoUsuario: SupabaseClient, cuerpo: Record<string, unknown>) {
  const email = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : ''
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim().replace(/\s+/g, ' ') : ''
  const negocio = typeof cuerpo.negocio_id === 'string' && UUID.test(cuerpo.negocio_id) ? cuerpo.negocio_id : null
  const rol = cuerpo.rol === 'dueno' || cuerpo.rol === 'profesional' ? cuerpo.rol : null
  const profesional = typeof cuerpo.profesional_id === 'string' && UUID.test(cuerpo.profesional_id) ? cuerpo.profesional_id : null
  if (!MAIL.test(email) || email.length > 254) return json({ error: 'mail_invalido' }, 400)
  if (nombre.length < 2 || nombre.length > 80) return json({ error: 'nombre_invalido' }, 400)
  if (negocio && !rol) return json({ error: 'rol_invalido' }, 400)

  const contrasena = generarContrasena()
  const { data, error } = await adm.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true,
    user_metadata: { display_name: nombre },
  })
  if (error || !data.user) {
    const msg = error?.message ?? ''
    if (/already|registered|exists/i.test(msg) || error?.status === 422) return json({ error: 'ya_existe' }, 409)
    console.error('admin-usuarios crear:', msg)
    return json({ error: 'no_se_pudo_crear', detalle: msg }, 500)
  }

  if (negocio && rol) {
    // Con la sesión de quien llama: la base vuelve a chequear que sea super admin.
    const r = await comoUsuario.rpc('admin_sumar_miembro', {
      p_user: data.user.id,
      p_negocio: negocio,
      p_rol: rol,
      ...(profesional ? { p_profesional: profesional } : {}),
    })
    if (r.error) {
      await adm.auth.admin.deleteUser(data.user.id) // todo o nada: sin negocio no queda la cuenta suelta
      return json({ error: 'no_se_pudo_sumar', detalle: r.error.message }, 400)
    }
  }
  return json({ ok: true, user_id: data.user.id, email, contrasena })
}

async function resetear(adm: SupabaseClient, cuerpo: Record<string, unknown>) {
  const id = typeof cuerpo.user_id === 'string' && UUID.test(cuerpo.user_id) ? cuerpo.user_id : null
  if (!id) return json({ error: 'cuenta_invalida' }, 400)
  const { data, error } = await adm.auth.admin.getUserById(id)
  if (error || !data.user) return json({ error: 'cuenta_no_encontrada' }, 404)
  const email = (data.user.email ?? '').toLowerCase()
  if (!email) return json({ error: 'cuenta_sin_mail' }, 400)
  // Las cuentas de SawaTek no se resetean desde acá (que no se pueda tomar la cuenta de otro super admin).
  const sa = await adm.from('superadmins').select('email').eq('email', email).maybeSingle()
  if (sa.error) return json({ error: 'fallo', detalle: sa.error.message }, 500)
  if (sa.data) return json({ error: 'cuenta_protegida' }, 403)

  const contrasena = generarContrasena()
  const r = await adm.auth.admin.updateUserById(id, { password: contrasena, email_confirm: true })
  if (r.error) return json({ error: 'no_se_pudo_resetear', detalle: r.error.message }, 500)
  return json({ ok: true, user_id: id, email, contrasena })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405)

  const url = env('SUPABASE_URL')
  const publica = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY')
  const secreta = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY')
  if (!url || !publica || !secreta) return json({ error: 'sin_configurar' }, 500)

  const auth = req.headers.get('authorization') ?? ''
  if (!/^Bearer\s+\S+/i.test(auth)) return json({ error: 'sin_sesion' }, 401)
  const comoUsuario = createClient(url, publica, { ...opciones, global: { headers: { Authorization: auth } } })
  if (!(await esSuperadmin(comoUsuario))) return json({ error: 'solo_superadmin' }, 403)

  const cuerpo = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!cuerpo || typeof cuerpo !== 'object') return json({ error: 'cuerpo_invalido' }, 400)

  const adm = createClient(url, secreta, opciones)
  try {
    if (cuerpo.accion === 'crear') return await crear(adm, comoUsuario, cuerpo)
    if (cuerpo.accion === 'resetear') return await resetear(adm, cuerpo)
    return json({ error: 'accion_invalida' }, 400)
  } catch (e) {
    console.error('admin-usuarios:', e)
    return json({ error: 'fallo', detalle: (e as Error).message }, 500)
  }
})
