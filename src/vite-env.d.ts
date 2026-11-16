/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  // Los que carga la integración Vercel ↔ Supabase
  readonly NEXT_PUBLIC_SUPABASE_URL?: string
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  // Clave pública VAPID para las notificaciones push (fase 4)
  readonly VITE_VAPID_PUBLIC_KEY?: string
}
