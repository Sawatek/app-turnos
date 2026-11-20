// Textos de los mensajes al cliente (WhatsApp y avisos de las demos) y cómo se completan sus variables.
// Un solo lugar en el front: la landing (chat de ejemplo y vitrina) y las demos sacan los textos de acá.
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { diaRelativo, enAR, horaCorta } from './tiempo'
import type { Negocio, Turno } from './tipos'

/**
 * Plantilla `turno_recordatorio_24` aprobada por Meta (docs/WHATSAPP.md § plantillas).
 * Allá las variables van numeradas en este orden: {{1}} nombre · {{2}} negocio · {{3}} servicio ·
 * {{4}} profesional · {{5}} día · {{6}} hora · {{7}} dirección. Si cambia allá, cambiala acá.
 */
export const PLANTILLA_RECORDATORIO_24 =
  'Hola {nombre}, te recordamos tu turno de mañana en {negocio}: {servicio} con {profesional}, el {dia} a las {hora}. Dirección: {direccion}. ¿Confirmás que venís?'

/** Botones de respuesta rápida de las plantillas de turno (en este orden). */
export const BOTONES_TURNO = ['Confirmo', 'Cambiar horario'] as const

/**
 * Respuesta cuando el cliente toca "Confirmo". La manda la base: `confirmar_por_whatsapp()` en
 * supabase/migrations/20261118300000_fase4_mensajes.sql (esa migración no se edita: si cambia el texto,
 * va en una migración nueva y se copia acá).
 */
export const PLANTILLA_GRACIAS = '¡Gracias {nombre}! Tu turno del {dia} a las {hora} en {negocio} quedó confirmado. Te esperamos.'

/** Reemplaza {clave} por su valor; las claves que no vienen quedan tal cual. */
export const sustituir = (plantilla: string, valores: Record<string, string>) =>
  plantilla.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? `{${k}}`)

/** El {dia} como lo escribe la base en los WhatsApp reales ("jueves 19/11"), en hora argentina. */
export const diaDeWhatsApp = (d: Date | string) => format(enAR(d), 'EEEE dd/MM', { locale: es })

/**
 * Texto de un mensaje para un turno: completa nombre (solo el primero), negocio, dirección, hora, día,
 * servicio y profesional. El día sale relativo ("mañana") salvo que se pase otro formato.
 */
export function textoMensaje(
  n: Negocio,
  plantilla: string,
  t: Turno | null,
  nombre: string,
  ahora: Date,
  formatoDia: (inicio: string, ahora: Date) => string = diaRelativo,
) {
  return sustituir(plantilla, {
    nombre: nombre.split(' ')[0] ?? nombre,
    negocio: n.nombre,
    direccion: n.direccion,
    hora: t ? horaCorta(t.inicio) : '',
    dia: t ? formatoDia(t.inicio, ahora) : '',
    servicio: t ? (n.servicios.find((s) => s.id === t.servicioId)?.nombre ?? '') : '',
    profesional: t ? (n.staff.find((p) => p.id === t.profesionalId)?.nombre ?? '') : '',
  })
}
