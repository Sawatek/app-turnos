import { CalendarPlus, Clock, MapPin, User } from 'lucide-react'
import { useState } from 'react'
import { capitalizar, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Negocio, Turno } from '@/dominio/tipos'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { Talon } from '@/ui/Talon'
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

/** Número de talón: las primeras cifras del turno, como el numerito que se saca en el mostrador. */
export const numeroDeTalon = (id: string) => id.replace(/-/g, '').slice(0, 4).toUpperCase()

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

/**
 * El turno como talón troquelado (igual que en la app real): arriba el día y la hora enormes, el sello del estado
 * mordiendo el corte, y abajo el detalle. Si el estado cambia mientras se mira (el cliente tocó "Confirmo" en el
 * WhatsApp), el papel se hunde y el sello nuevo cae con el golpe: es EL momento de la demo.
 */
export function Pase({ n, t, ahora, acciones, compacto, className }: Props) {
  const serv = servicioDe(n, t.servicioId)
  const prof = profesionalDe(n, t.profesionalId)
  const futuro = Date.parse(t.inicio) > ahora.getTime()
  const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
  // Estado con el que se mostró por primera vez: si cambia, el sello nuevo cae con el golpe.
  const [estadoInicial] = useState(t.estado)
  const cambio = t.estado !== estadoInicial
  return (
    <Talon
      key={cambio ? 'cambio' : 'igual'}
      className={cn(cambio && 'golpe', className)}
      // El golpe espera a que se vaya la notificación de WhatsApp (que tapa la parte de arriba).
      style={cambio ? ({ '--retraso': '160ms' } as React.CSSProperties) : undefined}
      aria-label={`Turno de ${serv?.nombre} ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
      cuerpo={
        <div className="px-4 pt-3.5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Logo negocio={n} className="size-6 rounded-chico text-[10px]" />
              <span className="rotulo truncate text-suave">{n.nombre}</span>
            </div>
            <span className="rotulo shrink-0 text-suave">
              N.º <span className="text-texto">{numeroDeTalon(t.id)}</span>
            </span>
          </div>
          <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="titulo text-xl leading-tight">{capitalizar(diaRelativo(t.inicio, ahora))}</span>
            {futuro && activo && <span className="rotulo text-acento-texto">{faltaPara(t.inicio, ahora)}</span>}
          </p>
          <p className={cn('cifra mt-1 pb-2', compacto ? 'text-[4rem]' : 'text-[4.75rem]', t.estado === 'cancelado' && 'text-suave line-through decoration-4')}>
            {horaCorta(t.inicio)}
          </p>
        </div>
      }
      sello={<InsigniaEstado key={t.estado} estado={t.estado} animar={cambio} className={cn('bg-superficie/85', cambio ? 'text-base' : 'text-sm')} />}
      talon={
        <div className="px-4 pt-8 pb-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Dato titulo="Servicio">{serv?.nombre}</Dato>
            <Dato titulo="Con" icono={<User className="size-3" aria-hidden />}>
              {prof?.nombre}
            </Dato>
            {!compacto && (
              <>
                <Dato titulo="Duración" icono={<Clock className="size-3" aria-hidden />}>
                  <span className="mono">{t.minutos} min</span>
                </Dato>
                <Dato titulo="Fecha">{capitalizar(diaLargo(t.inicio))}</Dato>
                {n.direccion && (
                  <Dato titulo="Dónde" icono={<MapPin className="size-3" aria-hidden />} ancho>
                    {n.direccion}
                  </Dato>
                )}
              </>
            )}
          </dl>

          {t.senaPagada > 0 && (
            <p className="mt-3 rounded-chico border border-dashed border-acento-borde px-3 py-2 text-xs font-semibold text-acento-texto">
              Seña de <span className="mono">${t.senaPagada.toLocaleString('es-AR')}</span> pagada · se descuenta del total
            </p>
          )}

          {(acciones || (futuro && activo && !compacto)) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {acciones}
              {futuro && activo && !compacto && (
                <button
                  type="button"
                  onClick={() => archivoCalendario(n, t)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-medio px-3 text-sm font-semibold text-acento-texto hover:bg-acento-suave"
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  Agregar al calendario
                </button>
              )}
            </div>
          )}
        </div>
      }
    />
  )
}

function Dato({ titulo, icono, ancho, children }: { titulo: string; icono?: React.ReactNode; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0', ancho && 'col-span-2')}>
      <dt className="rotulo flex items-center gap-1 text-suave">
        {icono}
        {titulo}
      </dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  )
}
