import type { Session } from '@supabase/supabase-js'
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
