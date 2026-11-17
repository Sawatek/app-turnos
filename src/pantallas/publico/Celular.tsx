// Celular dibujado para el sitio público: marco de titanio, bisel, isla, barra de estado y barrita de inicio.
// Proporciones de un teléfono actual (pantalla de 393 × 852 puntos). La pantalla se dibuja a tamaño real
// (393 px de ancho, como la ve un cliente) y se achica con transform: así lo de adentro es la app de verdad,
// con sus mismos componentes, y además transform hace que lo "fixed" de la app quede dentro del celular.
// Los colores del marco son una excepción a propósito a la regla de "sin hex sueltos" (ver CLAUDE.md).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/ui/cn'

export const ANCHO_PANTALLA = 393
export const ALTO_PANTALLA = 852

/** Escala de la pantalla según el ancho real que le toca (lo mide en vivo). */
function useEscala() {
  const ref = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0.78)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setEscala(el.clientWidth / ANCHO_PANTALLA || 0.78)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, escala }
}

interface Props {
  /** Contenido de la pantalla, dibujado a 393 × 852 px. */
  children: React.ReactNode
  /** Estilo (tema del negocio, variables) del lienzo de la pantalla. */
  estilo?: React.CSSProperties
  personalidad?: string
  className?: string
}

/**
 * Marco del celular. Ocupa el ancho que le den (w-…) y el alto sale solo de las proporciones.
 * Es decorativo: la pantalla es inerte y está oculta para lectores de pantalla (el que lo usa describe qué se ve).
 */
export function Celular({ children, estilo, personalidad, className }: Props) {
  const { ref, escala } = useEscala()
  return (
    <div className={cn('@container relative', className)} aria-hidden>
      {/* Botones laterales: acción y volumen a la izquierda, encendido a la derecha */}
      <span className="absolute top-[35cqi] -left-[0.7cqi] h-[7cqi] w-[1.2cqi] rounded-l-[1cqi] bg-[linear-gradient(90deg,#2a2b2f,#6b6d73)]" />
      <span className="absolute top-[49cqi] -left-[0.7cqi] h-[13cqi] w-[1.2cqi] rounded-l-[1cqi] bg-[linear-gradient(90deg,#2a2b2f,#6b6d73)]" />
      <span className="absolute top-[65cqi] -left-[0.7cqi] h-[13cqi] w-[1.2cqi] rounded-l-[1cqi] bg-[linear-gradient(90deg,#2a2b2f,#6b6d73)]" />
      <span className="absolute top-[55cqi] -right-[0.7cqi] h-[21cqi] w-[1.2cqi] rounded-r-[1cqi] bg-[linear-gradient(270deg,#2a2b2f,#6b6d73)]" />

      {/* Banda de titanio */}
      <div
        className={cn(
          'relative rounded-[17cqi] p-[1.1cqi]',
          'bg-[linear-gradient(150deg,#77797f_0%,#3a3b40_18%,#1d1e21_45%,#2c2d31_70%,#808288_100%)]',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.6),0_60px_90px_-40px_rgb(0_0_0/0.85),0_30px_50px_-30px_rgb(0_0_0/0.7)]',
        )}
      >
        {/* Bisel negro */}
        <div className="rounded-[15.9cqi] bg-[#050506] p-[3cqi] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
          {/* Pantalla */}
          <div
            ref={ref}
            className="relative isolate overflow-hidden rounded-[12.9cqi] bg-black"
            style={{ aspectRatio: `${ANCHO_PANTALLA} / ${ALTO_PANTALLA}` }}
          >
            <div
              inert
              data-celular
              data-personalidad={personalidad}
              className="absolute top-0 left-0 origin-top-left overflow-hidden bg-fondo text-texto select-none [contain:layout_paint]"
              style={{
                width: ANCHO_PANTALLA,
                height: ALTO_PANTALLA,
                transform: `scale(${escala})`,
                ...({ '--segura-arriba': '54px', '--segura-abajo': '30px' } as React.CSSProperties),
                ...estilo,
              }}
            >
              {children}
              <BarraDeEstado />
              {/* Isla */}
              <div className="absolute top-[11px] left-1/2 z-[80] h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black">
                <span className="absolute top-1/2 right-[22px] size-[11px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#2b3a55,#0b0d12_60%)]" />
              </div>
              {/* Barrita de inicio */}
              <div className="absolute bottom-[8px] left-1/2 z-[80] h-[5px] w-[139px] -translate-x-1/2 rounded-full bg-texto/90" />
            </div>
            {/* Reflejo del vidrio */}
            <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-[linear-gradient(115deg,rgb(255_255_255/0.08)_0%,rgb(255_255_255/0.02)_28%,transparent_42%)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Hora actual en la Argentina, como la del celular. */
function horaAhora() {
  return new Intl.DateTimeFormat('es-AR', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
}

function BarraDeEstado() {
  const [hora, setHora] = useState(horaAhora)
  useEffect(() => {
    const t = setInterval(() => setHora(horaAhora()), 30_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[70] flex h-[54px] items-center justify-between pr-[30px] pl-[46px] text-texto">
      <span className="num text-[17px] font-semibold tracking-[-0.01em]">{hora}</span>
      <span className="flex items-center gap-[6px]">
        {/* Señal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        {/* Wi-Fi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8.5.6 10.2 10.2 0 0 0 1.3 3.5l1.2 1.2a8.5 8.5 0 0 1 6-2.4Z" />
          <path d="M8.5 5.6c1.4 0 2.7.5 3.7 1.4l1.2-1.2A7 7 0 0 0 8.5 3.9 7 7 0 0 0 3.6 5.8L4.8 7c1-.9 2.3-1.4 3.7-1.4Z" />
          <path d="M8.5 8.9c.6 0 1.1.2 1.5.6l-1.5 1.6L7 9.5c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        {/* Batería */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke="currentColor" strokeOpacity="0.4" />
          <rect x="2" y="2" width="17" height="9" rx="2.5" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  )
}
