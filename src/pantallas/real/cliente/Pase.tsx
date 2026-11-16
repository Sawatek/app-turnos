import { CalendarPlus, Clock, MapPin, User } from 'lucide-react'
import type { TurnoReal } from '@/datos/real/cliente'
import { capitalizar, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'

export function faltaPara(inicio: string, ahora: Date) {
  const min = Math.round((Date.parse(inicio) - ahora.getTime()) / 60_000)
  if (min <= 0) return 'Es ahora'
  if (min < 60) return `Faltan ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Faltan ${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim()
  const d = Math.round(h / 24)
  return `Faltan ${d} ${d === 1 ? 'día' : 'días'}`
}

const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Descarga el turno como evento de calendario (.ics), con alarma 2 horas antes. */
function alCalendario(n: Negocio, t: TurnoReal) {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SawaTek//Turnos//ES', 'BEGIN:VEVENT',
    `UID:${t.id}@sawatek`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(new Date(t.inicio))}`, `DTEND:${f(new Date(t.fin))}`,
    `SUMMARY:${t.servicio} en ${n.nombre}`, ...(n.direccion ? [`LOCATION:${n.direccion}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${t.servicio} en ${n.nombre}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `turno-${n.slug}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

interface Props {
  n: Negocio
  t: TurnoReal
  ahora: Date
  acciones?: React.ReactNode
  compacto?: boolean
  /** Aviso debajo de los datos (ej.: "La seña se paga en el local"). */
  nota?: React.ReactNode
  className?: string
}

/** El turno como "pase" (estilo tarjeta de embarque): lo importante grande, el resto a mano. */
export function Pase({ n, t, ahora, acciones, compacto, nota, className }: Props) {
  const futuro = Date.parse(t.inicio) > ahora.getTime()
  const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
  return (
    <article
      className={cn('relative overflow-hidden rounded-grande bg-superficie sombra-suave ring-1 ring-linea', className)}
      aria-label={`Turno de ${t.servicio} ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
    >
      <div className="flex items-center justify-between gap-3 bg-acento px-4 py-2.5 text-sobre-acento">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo negocio={n} className="size-7 rounded-chico text-[11px] ring-2 ring-sobre-acento/20" />
          <span className="truncate text-sm font-bold">{n.nombre}</span>
        </div>
        {futuro && activo && <span className="shrink-0 text-xs font-bold opacity-85">{faltaPara(t.inicio, ahora)}</span>}
      </div>

      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-suave">{capitalizar(diaRelativo(t.inicio, ahora))}</p>
            <p className="titulo num text-5xl leading-none">{horaCorta(t.inicio)}</p>
          </div>
          <InsigniaEstado estado={t.estado} />
        </div>

        {/* Troquel de la tarjeta */}
        <div className="relative my-3.5" aria-hidden>
          <div className="border-t-2 border-dashed border-linea" />
          <div className="absolute top-1/2 -left-6 size-5 -translate-y-1/2 rounded-full bg-fondo" />
          <div className="absolute top-1/2 -right-6 size-5 -translate-y-1/2 rounded-full bg-fondo" />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
          <div>
            <dt className="text-xs font-semibold text-suave">Servicio</dt>
            <dd className="font-semibold">{t.servicio}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><User className="size-3" aria-hidden />Con</dt>
            <dd className="font-semibold">{t.profesional}</dd>
          </div>
          {!compacto && (
            <>
              <div>
                <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><Clock className="size-3" aria-hidden />Duración</dt>
                <dd className="font-semibold">{t.minutos} min</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-suave">Fecha</dt>
                <dd className="font-semibold">{capitalizar(diaLargo(t.inicio))}</dd>
              </div>
              {n.direccion && (
                <div className="col-span-2">
                  <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><MapPin className="size-3" aria-hidden />Dónde</dt>
                  <dd className="font-semibold">{n.direccion}</dd>
                </div>
              )}
            </>
          )}
        </dl>

        {nota && <div className="mt-3 rounded-chico bg-acento-suave px-3 py-2 text-xs font-semibold text-acento-texto">{nota}</div>}

        {(acciones || (futuro && activo && !compacto)) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {acciones}
            {futuro && activo && !compacto && (
              <button
                type="button"
                onClick={() => alCalendario(n, t)}
                className="inline-flex h-11 items-center gap-1.5 rounded-medio px-3 text-sm font-semibold text-acento-texto hover:bg-acento-suave"
              >
                <CalendarPlus className="size-4" aria-hidden />
                Al calendario
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
