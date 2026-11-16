// Variables de entorno de las Edge Functions (ver docs/WHATSAPP.md).
// En la nube: `supabase secrets set NOMBRE=valor`. En local: archivo .env pasado a `supabase functions serve --env-file`.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0'

export const env = (nombre: string, porDefecto = '') => (Deno.env.get(nombre) ?? '').trim() || porDefecto

/** Cliente con la clave secreta (service_role): las funciones de la cola solo las puede llamar este rol. */
export function clienteServicio(): SupabaseClient {
  const url = env('SUPABASE_URL')
  const clave = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !clave) throw new Error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (las inyecta Supabase).')
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
}

export const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

/** Comparación en tiempo constante (para secretos y firmas). */
export function igualesSeguro(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  let dif = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return dif === 0
}
