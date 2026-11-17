// Fila de public.mensajes (lo que devuelve tomar_mensajes).
export interface Mensaje {
  id: string
  tipo: 'codigo' | 'confirmacion' | 'recordatorio24' | 'recordatorio2' | 'cancelacion' | 'recuperar' | 'aviso'
  canal: 'whatsapp' | 'sms' | 'email' | 'push'
  destino: string
  negocio_id: string | null
  turno_id: string | null
  cliente_id: string | null
  contenido: Record<string, unknown> | null
  intentos: number
}

/** Lo que se le pasa a registrar_envio(). */
export interface Resultado {
  resultado: 'enviado' | 'reintentar' | 'error' | 'cancelado'
  proveedorId?: string
  error?: string
}
