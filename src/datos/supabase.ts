import { createClient } from '@supabase/supabase-js'

// Acepta los nombres de la integración Vercel ↔ Supabase (NEXT_PUBLIC_…) y los propios (VITE_…).
// Solo se leen claves públicas por diseño (URL y publishable/anon key): la protección la dan las reglas RLS.
const env = import.meta.env
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const clave = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Cliente de Supabase, o null si no está configurado (la demo sigue andando 100% en el navegador). */
export const supabase = url && clave ? createClient(url, clave, { auth: { persistSession: true, detectSessionInUrl: true } }) : null

export const hayNube = supabase !== null
