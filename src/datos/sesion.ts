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

/** Manda el link mágico al mail. Solo entran los mails cargados en la tabla `admins` (lo controlan las reglas al guardar). */
export async function pedirLinkDeIngreso(email: string) {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${location.origin}/admin`, shouldCreateUser: true },
  })
  if (error) throw new Error(error.message)
}

export const salir = () => supabase?.auth.signOut()
