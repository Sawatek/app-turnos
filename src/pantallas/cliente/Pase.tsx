import { CalendarPlus, Clock, MapPin, User } from 'lucide-react'
import { diaRelativo, horaCorta, diaLargo, capitalizar } from '@/dominio/tiempo'
import type { Negocio, Turno } from '@/dominio/tipos'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { profesionalDe, servicioDe } from './contexto'

export function faltaPara(inicio: string, ahora: Date) {
  const min = Math.round((Date.parse(inicio) - ahora.getTime()) / 60_000)
  if (min <= 0) return 'Es ahora'
  if (min < 60) return `Faltan ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Faltan ${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim()
  const d = Math.round(h / 24)
  return `Faltan ${d} ${d === 1 ? 'día' : 'días'}`
}

function archivoCalendario(n: Negocio, t: Turno) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const inicio = new Date(t.inicio)
  const fin = new Date(inicio.getTime() + t.minutos * 60_000)
  const serv = servicioDe(n, t.servicioId)?.nombre ?? 'Turno'
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SawaTek//Turnos//ES', 'BEGIN:VEVENT',
    `UID:${t.id}@sawatek`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`,
    `SUMMARY:${serv} en ${n.nombre}`, `LOCATION:${n.direccion}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${serv} en ${n.nombre}`, 'END:VALARM',
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
  t: Turno
  ahora: Date
  acciones?: React.ReactNode
  compacto?: boolean
  className?: string
}

/** El turno como "pase" (estilo tarjeta de embarque): lo importante grande, el resto a mano. */
export function Pase({ n, t, ahora, acciones, compacto, className }: Props) {
  const serv = servicioDe(n, t.servicioId)
  const prof = profesionalDe(n, t.profesionalId)
  const futuro = Date.parse(t.inicio) > ahora.getTime()
  return (
    <article
      className={cn('relative overflow-hidden rounded-grande bg-superficie sombra-suave ring-1 ring-linea', className)}
      aria-label={`Turno de ${serv?.nombre} ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
    >
      <div className="flex items-center justify-between gap-3 bg-acento px-4 py-2.5 text-sobre-acento">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo negocio={n} className="size-7 rounded-chico text-[11px] ring-2 ring-sobre-acento/20" />
          <span className="truncate text-sm font-bold">{n.nombre}</span>
        </div>
        {futuro && t.estado !== 'cancelado' && <span className="shrink-0 text-xs font-bold opacity-85">{faltaPara(t.inicio, ahora)}</span>}
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

        <dl className={cn('grid gap-x-4 gap-y-2.5 text-sm', compacto ? 'grid-cols-2' : 'grid-cols-2')}>
          <div>
            <dt className="text-xs font-semibold text-suave">Servicio</dt>
            <dd className="font-semibold">{serv?.nombre}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><User className="size-3" aria-hidden />Con</dt>
            <dd className="font-semibold">{prof?.nombre}</dd>
          </div>
          {!compacto && (
            <>
              <div>
                <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><Clock className="size-3" aria-hidden />Duración</dt>
                <dd className="font-semibold">{t.minutos} min</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-suave">Fecha</dt>
                <dd className="font-semibold">{capitalizar(diaLargo(t.inicio).split(' de ')[0]!)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="flex items-center gap-1 text-xs font-semibold text-suave"><MapPin className="size-3" aria-hidden />Dónde</dt>
                <dd className="font-semibold">{n.direccion}</dd>
              </div>
            </>
          )}
        </dl>

        {t.senaPagada > 0 && (
          <p className="mt-3 rounded-chico bg-acento-suave px-3 py-2 text-xs font-semibold text-acento-texto">
            Seña de ${t.senaPagada.toLocaleString('es-AR')} pagada · se descuenta del total
          </p>
        )}

        {(acciones || (futuro && !compacto)) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {acciones}
            {futuro && !compacto && t.estado !== 'cancelado' && (
              <button
                type="button"
                onClick={() => archivoCalendario(n, t)}
                className="inline-flex h-10 items-center gap-1.5 rounded-medio px-3 text-sm font-semibold text-acento-texto hover:bg-acento-suave"
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
