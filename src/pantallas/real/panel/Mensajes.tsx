// Historial de lo que se le mandó a un cliente (o por un turno): tipo, canal, estado y fecha.
// Los códigos de ingreso nunca aparecen: la regla de la base no los deja leer.
import { Bell, ChevronDown, Mail, MessageCircle, MessageSquare } from 'lucide-react'
import { useMensajes, type CanalMensaje, type EstadoMensaje, type MensajeEnviado, type TipoMensaje } from '@/datos/real/panel-gestion'
import { capitalizar, diaCorto, horaCorta } from '@/dominio/tiempo'
import { cn } from '@/ui/cn'
import { Cargando, FalloCarga, Tarjeta, usePanel } from './comunes'

export const TIPOS: Record<TipoMensaje, string> = {
  confirmacion: 'Confirmación del turno',
  recordatorio24: 'Recordatorio (24 h antes)',
  recordatorio2: 'Recordatorio (2 h antes)',
  cancelacion: 'Aviso de cancelación',
  recuperar: 'Te extrañamos',
  aviso: 'Respuesta por WhatsApp',
}

const CANALES: Record<CanalMensaje, { texto: string; Icono: typeof Bell }> = {
  whatsapp: { texto: 'WhatsApp', Icono: MessageCircle },
  sms: { texto: 'SMS', Icono: MessageSquare },
  email: { texto: 'Mail', Icono: Mail },
  push: { texto: 'Notificación', Icono: Bell },
}

export const ESTADOS_MENSAJE: Record<EstadoMensaje, { texto: string; clase: string }> = {
  pendiente: { texto: 'Programado', clase: 'bg-superficie-2 text-suave' },
  enviando: { texto: 'Enviando', clase: 'bg-superficie-2 text-suave' },
  enviado: { texto: 'Enviado', clase: 'bg-acento-suave text-acento-texto' },
  entregado: { texto: 'Entregado', clase: 'bg-exito/15 text-exito' },
  leido: { texto: 'Leído', clase: 'bg-exito/15 text-exito' },
  error: { texto: 'Error', clase: 'bg-peligro/12 text-peligro' },
  cancelado: { texto: 'No se mandó', clase: 'bg-superficie-2 text-suave' },
}

export function InsigniaMensaje({ estado, className }: { estado: EstadoMensaje; className?: string }) {
  const e = ESTADOS_MENSAJE[estado]
  return <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-bold', e.clase, className)}>{e.texto}</span>
}

const fecha = (iso: string) => `${capitalizar(diaCorto(iso))} · ${horaCorta(iso)}`

export function HistorialMensajes({ clienteId, turnoId }: { clienteId?: string; turnoId?: string }) {
  const { negocioId } = usePanel()
  const mensajes = useMensajes(negocioId, { clienteId, turnoId })
  return (
    <Tarjeta titulo="Mensajes">
      {mensajes.isPending ? (
        <Cargando texto="Cargando los mensajes" />
      ) : mensajes.isError ? (
        <FalloCarga error={mensajes.error} onReintentar={() => void mensajes.refetch()} />
      ) : mensajes.data.length === 0 ? (
        <p className="text-sm text-suave">{turnoId ? 'Todavía no se mandó nada por este turno.' : 'Todavía no se le mandó ningún mensaje.'}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-linea" aria-label="Historial de mensajes">
          {mensajes.data.map((m) => (
            <FilaMensaje key={m.id} m={m} />
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}

function FilaMensaje({ m }: { m: MensajeEnviado }) {
  const canal = CANALES[m.canal] ?? CANALES.whatsapp
  const enCola = m.estado === 'pendiente' || m.estado === 'enviando'
  const resumen = (
    <span className="flex items-start gap-3">
      <canal.Icono className="mt-0.5 size-4 shrink-0 text-suave" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{TIPOS[m.tipo] ?? m.tipo}</span>
        <span className="block text-sm text-suave">
          {canal.texto} · {enCola ? `sale el ${fecha(m.cuando).toLowerCase()}` : fecha(m.cuando)}
        </span>
        {m.estado === 'error' && m.error && <span className="block text-sm text-peligro">{m.error}</span>}
      </span>
      <InsigniaMensaje estado={m.estado} />
    </span>
  )
  if (!m.texto) return <li className="py-2.5">{resumen}</li>
  return (
    <li>
      <details className="group py-2.5">
        <summary className="flex min-h-11 list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">{resumen}</span>
          <ChevronDown className="size-4 shrink-0 text-suave transition-transform group-open:rotate-180" aria-hidden />
          <span className="sr-only">Ver el texto</span>
        </summary>
        <p className="mt-2 ml-7 rounded-medio bg-superficie-2 px-3 py-2 text-sm whitespace-pre-line">{m.texto.replaceAll('{link}', 'el link de la app')}</p>
      </details>
    </li>
  )
}
