// Variables de entorno de mentira para servir las Edge Functions en los tests (nunca las de producción).
// playwright.config.ts de esta carpeta las escribe en un archivo y se lo pasa a `supabase functions serve --env-file`.
export const ENTORNO_FUNCIONES = {
  MENSAJES_PROVEEDOR: 'consola',
  MENSAJES_SECRETO: 'secreto-de-prueba-local',
  APP_URL: 'http://localhost:5180',
  WHATSAPP_VERIFY_TOKEN: 'verificar-de-prueba',
  WHATSAPP_APP_SECRET: 'app-secret-de-prueba',
} as const
