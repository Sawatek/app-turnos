// Cómo le llega el recordatorio al cliente: la conversación de WhatsApp con los textos de las plantillas
// que se mandan de verdad (turno_recordatorio_24 y la respuesta de la base al tocar "Confirmo"; ver docs/WHATSAPP.md).
// Los datos salen de la demo de la barbería (QueTul). Se ve como WhatsApp a propósito: el dueño lo reconoce al instante.
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, CornerUpLeft, Lock } from 'lucide-react'
import { useState } from 'react'
import { claveDia, enAR, enHora, sumarDias } from '@/dominio/tiempo'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'

const CLIENTA = 'Martina'
const HORA = '10:30'

function Hora({ children, className }: { children: string; className?: string }) {
  return <span className={cn('num ml-2 inline-flex translate-y-1 items-center gap-0.5 float-right text-[11px] text-wa-hora', className)}>{children}</span>
}

export function ConversacionWhatsApp({ className }: { className?: string }) {
  const n = DEMOS_FIJAS[0]!
  const [dia] = useState(() => format(enAR(enHora(sumarDias(claveDia(new Date()), 1), '12:00')), "EEEE d/M", { locale: es }))
  const servicio = (n.servicios.find((s) => s.etiqueta) ?? n.servicios[0]!).nombre
  const prof = n.staff[0]!.nombre

  return (
    <figure className={cn('m-0', className)}>
      <div className="overflow-hidden rounded-grande bg-wa-chat text-wa-texto sombra-flotante ring-1 ring-black/10">
        {/* Cabecera del chat */}
        <div className="flex items-center gap-3 bg-wa-cabecera px-4 py-3 text-white">
          <div style={estiloTema(n)} data-personalidad={n.personalidad}>
            <Logo negocio={n} className="size-10 rounded-full text-sm" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">{n.nombre}</p>
            <p className="text-xs text-white/85">Cuenta de empresa</p>
          </div>
        </div>

        <ol className="flex flex-col gap-2 px-3 py-4 text-[15px] leading-snug sm:px-4">
          <li className="mx-auto mb-1 flex max-w-[92%] items-start gap-1.5 rounded-lg bg-wa-aviso px-3 py-1.5 text-center text-xs text-wa-texto">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            Los mensajes salen del WhatsApp oficial, con el nombre de tu negocio.
          </li>

          {/* Recordatorio 24 h, con los botones de respuesta rápida */}
          <li className="max-w-[88%] self-start">
            <p className="sr-only">{n.nombre} escribe:</p>
            <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]">
              Hola {CLIENTA}, te recordamos tu turno de mañana en {n.nombre}: {servicio} con {prof}, el {dia} a las {HORA}. Dirección: {n.direccion}.
              ¿Confirmás que venís?
              <Hora>9:00</Hora>
            </div>
            <div className="mt-0.5 grid grid-cols-2 gap-0.5" aria-label="Botones del mensaje">
              {['Confirmo', 'Cambiar horario'].map((b) => (
                <span
                  key={b}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-semibold text-wa-cabecera shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]"
                >
                  <CornerUpLeft className="size-4" aria-hidden />
                  {b}
                </span>
              ))}
            </div>
          </li>

          {/* La clienta toca "Confirmo" */}
          <li className="max-w-[80%] self-end">
            <p className="sr-only">{CLIENTA} responde:</p>
            <div className="rounded-xl rounded-tr-sm bg-wa-burbuja px-3 py-2 shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]">
              Confirmo
              <Hora>
                9:12
              </Hora>
              <CheckCheck className="float-right mt-1.5 -mr-0.5 ml-0.5 size-4 text-wa-tilde" aria-label="Leído" />
            </div>
          </li>

          {/* Respuesta automática */}
          <li className="max-w-[88%] self-start">
            <p className="sr-only">{n.nombre} escribe:</p>
            <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-[0_1px_0.5px_rgb(0_0_0/0.13)]">
              ¡Gracias {CLIENTA}! Tu turno del {dia} a las {HORA} en {n.nombre} quedó confirmado. Te esperamos.
              <Hora>9:12</Hora>
            </div>
          </li>
        </ol>
      </div>
      <figcaption className="mt-4 flex gap-3 border-t border-linea pt-3 text-sm text-suave">
        <span className="folio shrink-0 text-acento-texto">Fig. 1</span>
        <span>Así le llega a tu cliente. El turno se confirma solo en tu agenda.</span>
      </figcaption>
    </figure>
  )
}
