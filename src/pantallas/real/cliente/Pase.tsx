import { CalendarPlus, Clock, MapPin, User } from 'lucide-react'
import type { TurnoReal } from '@/datos/real/cliente'
import { capitalizar, diaLargo, diaRelativo, horaCorta } from '@/dominio/tiempo'
import type { Negocio } from '@/dominio/tipos'
import { useState } from 'react'
import { InsigniaEstado } from '@/ui/Insignia'
import { Logo } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { Talon } from '@/ui/Talon'
import { agregarAlCalendario } from './calendario'

export function faltaPara(inicio: string, ahora: Date) {
  const min = Math.round((Date.parse(inicio) - ahora.getTime()) / 60_000)
  if (min <= 0) return 'Es ahora'
  if (min < 60) return `Faltan ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Faltan ${h} h ${min % 60 ? `${min % 60} min` : ''}`.trim()
  const d = Math.round(h / 24)
  return `Faltan ${d} ${d === 1 ? 'día' : 'días'}`
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

/** Número de talón: las primeras cifras del turno, como el numerito que se saca en el mostrador. */
export const numeroDeTalon = (id: string) => id.replace(/-/g, '').slice(0, 4).toUpperCase()

/**
 * El turno como talón troquelado: arriba lo que importa (día y hora enormes, el sello del estado),
 * abajo del corte, el detalle. El sello golpea cuando el estado cambia mientras se mira (ej.: al confirmar).
 */
export function Pase({ n, t, ahora, acciones, compacto, nota, className }: Props) {
  const futuro = Date.parse(t.inicio) > ahora.getTime()
  const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
  // Estado con el que se mostró por primera vez: si cambia, el sello nuevo cae con el golpe.
  const [estadoInicial] = useState(t.estado)
  const cambio = t.estado !== estadoInicial
  return (
    <Talon
      key={cambio ? 'cambio' : 'igual'}
      className={cn(cambio && 'golpe', className)}
      aria-label={`Turno de ${t.servicio} ${diaRelativo(t.inicio, ahora)} a las ${horaCorta(t.inicio)}`}
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
          <p className="cifra mt-1 pb-2 text-[4.75rem]">{horaCorta(t.inicio)}</p>
        </div>
      }
      sello={<InsigniaEstado key={t.estado} estado={t.estado} animar={cambio} className="bg-superficie/85 text-sm" />}
      talon={
        <div className="px-4 pt-8 pb-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Dato titulo="Servicio">{t.servicio}</Dato>
            <Dato titulo="Con" icono={<User className="size-3" aria-hidden />}>{t.profesional}</Dato>
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

          {nota && <div className="mt-3 rounded-chico border border-dashed border-acento-borde px-3 py-2 text-xs font-semibold text-acento-texto">{nota}</div>}

          {(acciones || (futuro && activo && !compacto)) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {acciones}
              {futuro && activo && !compacto && (
                <button
                  type="button"
                  onClick={() =>
                    agregarAlCalendario({ id: t.id, inicio: t.inicio, fin: t.fin, titulo: `${t.servicio} en ${n.nombre}`, lugar: n.direccion, archivo: `turno-${n.slug}` })
                  }
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
