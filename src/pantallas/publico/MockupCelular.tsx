// Celular de muestra del hero: la app de un negocio de ejemplo con su marca, y el recordatorio de WhatsApp
// que llega y se confirma con un toque. Se puede cambiar de marca para mostrar que cada negocio tiene la suya.
// Es una ilustración (recreada, liviana): la demo real está en /quetul, /lema y /nailed.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarDays, Check, Clock, House, MessageCircle, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Negocio } from '@/dominio/tipos'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'

const CLIENTE = 'Martina'
const HORA_RECORDATORIO = '10:30'

/** Mensaje de recordatorio de 24 h del negocio, con sus datos. */
function recordatorio(n: Negocio) {
  const prof = n.staff[0]?.nombre ?? ''
  return n.mensajes.recordatorio24
    .replace('{nombre}', CLIENTE)
    .replace('{hora}', HORA_RECORDATORIO)
    .replace('{servicio}', (n.servicios[0]?.nombre ?? 'tu turno').toLowerCase())
    .replace('{profesional}', prof)
    .replace('{negocio}', n.nombre)
}

type Paso = 0 | 1 | 2 | 3 // 0 nada · 1 llega el WhatsApp · 2 toca "Confirmo" · 3 turno confirmado

function Pantalla({ n }: { n: Negocio }) {
  const quieto = useReducedMotion()
  const [paso, setPaso] = useState<Paso>(quieto ? 1 : 0)

  useEffect(() => {
    if (quieto) return
    const t = [setTimeout(() => setPaso(1), 900), setTimeout(() => setPaso(2), 2900), setTimeout(() => setPaso(3), 3700)]
    return () => t.forEach(clearTimeout)
  }, [quieto])

  const libre = n.staff[1] ?? n.staff[0]
  const servicio = n.servicios[0]
  const sellos = Math.min(3, n.fidelidad.meta - 1)

  return (
    <div style={estiloTema(n)} data-personalidad={n.personalidad} className="relative flex h-full flex-col overflow-hidden bg-fondo text-texto">
      {/* Barra de estado */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold">
        <span className="num">9:41</span>
        <span className="flex items-center gap-1" aria-hidden>
          <span className="h-2 w-3.5 rounded-[2px] bg-texto/80" />
          <span className="h-2 w-2 rounded-full bg-texto/80" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pt-2">
        <div className="flex items-center gap-2.5">
          <Logo negocio={n} className="size-10 text-sm" />
          <div className="min-w-0 leading-tight">
            <p className="titulo truncate text-[15px]">{n.nombre}</p>
            <p className="truncate text-[11px] text-acento-texto">{n.bajada}</p>
          </div>
        </div>

        <p className="titulo text-xl">Hola, {CLIENTE}</p>

        <div className="rounded-medio bg-superficie p-3 ring-1 ring-linea">
          <p className="text-[11px] font-semibold text-suave">Próximo libre</p>
          <p className="titulo num mt-0.5 text-lg">Hoy 17:30</p>
          <p className="text-[12px] text-suave">
            con {libre?.nombre} · {servicio?.nombre}
          </p>
          <div className="mt-2.5 grid h-9 place-items-center rounded-chico bg-acento text-[13px] font-bold text-sobre-acento">Reservar este</div>
        </div>

        <div className="rounded-medio bg-superficie p-3 ring-1 ring-linea">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-suave">Tu próximo turno</p>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors duration-300',
                paso === 3 ? 'bg-exito/15 text-exito' : 'bg-aviso/15 text-aviso',
              )}
            >
              {paso === 3 ? <Check className="size-3" aria-hidden /> : <Clock className="size-3" aria-hidden />}
              {paso === 3 ? 'Confirmado' : 'Por confirmar'}
            </span>
          </div>
          <p className="titulo num mt-0.5 text-base">Mañana {HORA_RECORDATORIO}</p>
          <p className="text-[12px] text-suave">
            {servicio?.nombre} con {n.staff[0]?.nombre}
          </p>
        </div>

        <div className="rounded-medio bg-acento-suave p-3 ring-1 ring-acento-borde">
          <p className="text-[11px] font-semibold text-acento-texto">Tu tarjeta</p>
          <div className="mt-1.5 flex gap-1.5" aria-hidden>
            {Array.from({ length: n.fidelidad.meta }, (_, i) => (
              <span key={i} className={cn('size-5 rounded-full', i < sellos ? 'bg-acento' : 'ring-1 ring-acento-borde')} />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-suave">Te faltan {n.fidelidad.meta - sellos} para: {n.fidelidad.premio}</p>
        </div>
      </div>

      {/* Navegación inferior */}
      <div className="mt-3 grid grid-cols-4 border-t border-linea px-2 pt-2 pb-4 text-suave" aria-hidden>
        {[House, CalendarDays, MessageCircle, User].map((Icono, i) => (
          <span key={i} className={cn('grid place-items-center', i === 0 && 'text-acento-texto')}>
            <Icono className="size-5" />
          </span>
        ))}
      </div>

      {/* Notificación de WhatsApp */}
      <AnimatePresence>
        {(paso === 1 || paso === 2) && (
          <motion.div
            key="wa"
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } }}
            exit={{ y: -90, opacity: 0, transition: { duration: 0.2 } }}
            className="absolute inset-x-2.5 top-8 rounded-[18px] bg-[#f6f6f4]/97 p-3 text-[#16181b] shadow-[0_12px_32px_-8px_rgb(0_0_0/0.55)]"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#4b5158]">
              <span className="grid size-4 place-items-center rounded-[5px] bg-wa text-white">
                <MessageCircle className="size-2.5" strokeWidth={3} />
              </span>
              WhatsApp · ahora
            </div>
            <p className="mt-1 text-[12px] font-bold">{n.nombre}</p>
            <p className="text-[12px] leading-snug">{recordatorio(n)}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] font-bold">
              <span
                className={cn(
                  'flex h-8 items-center justify-center gap-1 rounded-[10px] transition-colors duration-200',
                  paso === 2 ? 'bg-wa text-[#062b14]' : 'bg-white text-[#0b6b34] ring-1 ring-black/10',
                )}
              >
                {paso === 2 && <Check className="size-3.5" strokeWidth={3} />}
                Confirmo
              </span>
              <span className="flex h-8 items-center justify-center rounded-[10px] bg-white text-[#0b6b34] ring-1 ring-black/10">Cambiar horario</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Celular con la app de un negocio de ejemplo + selector de marca. */
export function MockupCelular() {
  const [slug, setSlug] = useState(DEMOS_FIJAS[0]!.slug)
  const n = DEMOS_FIJAS.find((d) => d.slug === slug) ?? DEMOS_FIJAS[0]!

  return (
    <figure className="flex flex-col items-center">
      <div aria-hidden className="relative">
        {/* Halo del color del negocio */}
        <div
          className="pointer-events-none absolute -inset-6 -z-10 rounded-full opacity-25 blur-3xl transition-[background-color] duration-500"
          style={{ backgroundColor: n.color }}
        />
        <div className="relative h-[600px] w-[292px] rounded-[48px] bg-[#0a0a0b] p-[10px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/12 sm:h-[620px] sm:w-[304px]">
          <div className="absolute top-[18px] left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-[#0a0a0b]" />
          <div className="h-full overflow-hidden rounded-[38px]">
            <Pantalla key={n.slug} n={n} />
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        Ejemplo de la app de {n.nombre}: muestra el próximo horario libre, el próximo turno y la tarjeta de fidelidad. Llega el recordatorio por WhatsApp,
        la persona toca Confirmo y el turno queda confirmado.
      </figcaption>

      <fieldset className="m-0 mt-6 flex min-w-0 flex-col items-center gap-2 border-0 p-0">
        <legend className="mb-2 text-center text-sm text-suave">Mirala con otra marca</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {DEMOS_FIJAS.map((d) => (
            <button
              key={d.slug}
              type="button"
              aria-pressed={d.slug === slug}
              onClick={() => setSlug(d.slug)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors',
                d.slug === slug ? 'bg-superficie-2 text-texto ring-acento' : 'text-suave ring-linea hover:text-texto',
              )}
            >
              <span className="size-3 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
              {d.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <Link to={`/${n.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
        Probá la app de {n.nombre} en vivo
      </Link>
    </figure>
  )
}
