import type { Session, User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Sesión del admin de SawaTek (solo para /admin). `undefined` = todavía no se sabe. */
export function useSesion() {
  const [sesion, setSesion] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return sesion
}

/** Manda el link mágico al mail. Solo a usuarios ya creados en Supabase (no crea cuentas nuevas). */
export async function pedirLinkDeIngreso(email: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${location.origin}/admin`, shouldCreateUser: false },
  })
  if (error) throw new Error(error.message)
}

/** Ingreso con mail y contraseña (usuarios creados por SawaTek en Supabase → Authentication → Users). */
export async function entrarConContrasena(email: string, contrasena: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: contrasena })
  if (error) throw new Error(error.message)
}

export const salir = () => supabase?.auth.signOut()

/** Nombre de la persona (lo guarda su cuenta; es el "Display name" de Supabase). */
export const nombreDeUsuario = (u: User | null | undefined): string | null => {
  const n = (u?.user_metadata as { display_name?: unknown } | undefined)?.display_name
  return typeof n === 'string' && n.trim() ? n.trim() : null
}

/** Guarda el nombre en la cuenta del usuario logueado. La sesión se actualiza sola (onAuthStateChange). */
export async function guardarMiNombre(nombre: string) {
  if (!supabase) return
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  if (limpio.length < 2 || limpio.length > 80) throw new Error('Escribí tu nombre (entre 2 y 80 letras).')
  const { error } = await supabase.auth.updateUser({ data: { display_name: limpio } })
  if (error) throw new Error(error.message)
}
