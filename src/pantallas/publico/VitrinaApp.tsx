// Vitrina del hero: la app del cliente DE VERDAD (los mismos componentes de /quetul, /lema y /nailed) adentro
// de un celular, vía la fachada cliente/VistaDeMuestra, con datos de ejemplo (no toca el estado guardado de las demos).
// Cuenta la historia del producto en un loop: le llega el recordatorio por WhatsApp, toca "Confirmo",
// el turno queda confirmado y del otro lado la agenda del negocio se entera sola. Después cambia de marca.
// Se puede pausar (WCAG 2.2.2), se frena sola fuera de pantalla y con "reducir movimiento" arranca quieta.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarCheck, Check, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { PLANTILLA_GRACIAS, diaDeWhatsApp, textoMensaje } from '@/dominio/mensajes'
import type { Aviso, Negocio, Turno } from '@/dominio/tipos'
import { AccionAviso, CLIENTA_MUESTRA, HORA_MUESTRA, VistaDeMuestra, armarEjemploVitrina } from '@/pantallas/cliente/VistaDeMuestra'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { Celular } from './Celular'

/**
 * Pasos de la historia y cuánto dura cada uno (ms).
 * 0 la app · 1 llega el recordatorio · 2 toca "Confirmo" · 3 "¡Gracias!" y turno confirmado · 4 baja por la app · 5 vuelve arriba
 */
const DURACION = [1600, 2600, 750, 2400, 2800, 1400] as const
type Paso = 0 | 1 | 2 | 3 | 4 | 5
const ULTIMO: Paso = 5

const nada = () => {}

/** Los dos avisos de la historia: el recordatorio de 24 h (el texto del negocio) y el "¡Gracias!" que manda la base. */
function avisosDeEjemplo(n: Negocio, turno: Turno, ahora: Date) {
  const aviso = (tipo: Aviso['tipo'], texto: string): Aviso => ({
    id: `vitrina-${tipo}`,
    tipo,
    canal: 'whatsapp',
    texto,
    turnoId: turno.id,
    creado: ahora.toISOString(),
    visto: false,
  })
  return {
    recordatorio: aviso('r24', textoMensaje(n, n.mensajes.recordatorio24, turno, CLIENTA_MUESTRA, ahora)),
    gracias: aviso('confirmacion', textoMensaje(n, PLANTILLA_GRACIAS, turno, CLIENTA_MUESTRA, ahora, diaDeWhatsApp)),
  }
}

/** La pantalla de la app de un negocio en un paso de la historia. */
function PantallaApp({ n, paso, ahora, quieto }: { n: Negocio; paso: Paso; ahora: Date; quieto: boolean }) {
  const ejemplo = useMemo(() => armarEjemploVitrina(n, ahora), [n, ahora])
  const avisos = useMemo(() => avisosDeEjemplo(n, ejemplo.turno, ahora), [n, ejemplo, ahora])
  const aviso = paso === 1 || paso === 2 ? avisos.recordatorio : paso === 3 ? avisos.gracias : null
  const logo = <Logo negocio={n} className="size-10 rounded-chico text-sm" />

  return (
    <VistaDeMuestra
      n={n}
      ejemplo={ejemplo}
      ahora={ahora}
      confirmado={paso >= 3}
      noVistos={paso >= 1 && paso <= 3 ? 1 : 0}
      bajar={paso === 4}
      quieto={quieto}
    >
      <Notificacion
        aviso={aviso}
        remitente={n.nombre}
        logo={logo}
        onCerrar={nada}
        acciones={
          aviso?.tipo === 'r24' ? (
            <>
              <AccionAviso onClick={nada} className={cn(paso === 2 && 'scale-[0.96] brightness-95')}>
                Confirmo
                {paso === 2 && (
                  <motion.span
                    className="pointer-events-none absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60"
                    initial={{ scale: 0.3, opacity: 0.9 }}
                    animate={{ scale: 1.5, opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
                  />
                )}
              </AccionAviso>
              <AccionAviso secundaria onClick={nada}>
                Cambiar horario
              </AccionAviso>
            </>
          ) : undefined
        }
      />
    </VistaDeMuestra>
  )
}

/** Hero: celular con la app real + selector de marca + pausa. */
export function VitrinaApp() {
  const quieto = useReducedMotion() ?? false
  const [ahora] = useState(() => new Date())
  const [slug, setSlug] = useState(DEMOS_FIJAS[0]!.slug)
  // Arranca con el recordatorio en pantalla: es lo primero que tiene que ver el dueño.
  const [paso, setPaso] = useState<Paso>(1)
  const [pausado, setPausado] = useState(quieto)
  const [rotar, setRotar] = useState(true)
  const [enPantalla, setEnPantalla] = useState(true)
  const figura = useRef<HTMLElement>(null)
  const n = DEMOS_FIJAS.find((d) => d.slug === slug) ?? DEMOS_FIJAS[0]!

  // Fuera de pantalla o con la pestaña oculta, no corre.
  useEffect(() => {
    const el = figura.current
    if (!el) return
    let visible = true
    const actualizar = () => setEnPantalla(visible && document.visibilityState === 'visible')
    const obs = new IntersectionObserver(([entrada]) => {
      visible = entrada?.isIntersecting ?? true
      actualizar()
    })
    obs.observe(el)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      obs.disconnect()
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [])

  // El "reloj" de la historia.
  useEffect(() => {
    if (pausado || !enPantalla) return
    if (paso === ULTIMO && !rotar) return
    const t = setTimeout(() => {
      if (paso < ULTIMO) return setPaso((paso + 1) as Paso)
      const i = DEMOS_FIJAS.findIndex((d) => d.slug === slug)
      setSlug(DEMOS_FIJAS[(i + 1) % DEMOS_FIJAS.length]!.slug)
      setPaso(0)
    }, DURACION[paso])
    return () => clearTimeout(t)
  }, [paso, pausado, enPantalla, rotar, slug])

  const elegir = (s: string) => {
    setRotar(false)
    setSlug(s)
    setPaso(pausado ? 1 : 0)
  }
  const alternarPausa = () => {
    if (pausado && paso === ULTIMO) setPaso(0)
    setPausado(!pausado)
  }

  const confirmado = paso >= 3
  const prof = n.staff[0]?.nombre

  return (
    <figure ref={figura} className="m-0 flex flex-col items-center">
      <div className="relative w-[min(78vw,330px)] sm:w-[330px] lg:w-[300px] xl:w-[316px]">
        {/* Halo del color de la marca: degradé radial en vez de blur (filter es caro de pintar en el celular) */}
        <div
          aria-hidden
          style={estiloTema(n)}
          className="pointer-events-none absolute inset-x-[-18%] top-[12%] bottom-[8%] -z-10 rounded-full bg-[radial-gradient(closest-side,var(--t-acento),transparent)] opacity-30"
        />
        <Celular estilo={estiloTema(n)} personalidad={n.personalidad}>
          <PantallaApp key={n.slug} n={n} paso={paso} ahora={ahora} quieto={quieto} />
        </Celular>

        {/* Pausa (WCAG 2.2.2): primer control después del celular, pegada a él como en un reproductor */}
        <button
          type="button"
          onClick={alternarPausa}
          aria-label={pausado ? 'Reproducir la animación' : 'Pausar la animación'}
          className="absolute -right-2 bottom-[3%] z-10 grid size-11 place-items-center rounded-full bg-superficie text-texto ring-1 ring-linea sombra-flotante transition-colors hover:bg-superficie-2 sm:-right-4"
        >
          {pausado ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>

        {/* Del otro lado: la agenda del negocio se entera sola */}
        <AnimatePresence>
          {confirmado && (
            <motion.div
              key={n.slug}
              aria-hidden
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 30 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute bottom-[8%] -left-[2%] w-[190px] rounded-medio bg-superficie p-3 sombra-flotante ring-1 ring-linea sm:bottom-[16%] sm:-left-[6%] sm:w-[230px] sm:p-3.5 lg:-left-[26%]"
            >
              <p className="flex items-center gap-1.5 text-xs font-bold text-suave">
                <CalendarCheck className="size-3.5 text-acento-texto" />
                En tu agenda · {prof}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{CLIENTA_MUESTRA.replace(/ (\p{L})\p{L}+$/u, ' $1.')}</p>
                  <p className="num text-xs text-suave">Mañana {HORA_MUESTRA}</p>
                </div>
                <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-exito/15 px-2 text-xs font-bold text-exito">
                  <Check className="size-3" strokeWidth={3} />
                  Confirmó
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <figcaption className="sr-only">
        La app de {n.nombre} en un celular, con su logo y sus colores: muestra el próximo turno de {CLIENTA_MUESTRA} (mañana a las {HORA_MUESTRA}), el próximo horario libre y la tarjeta de fidelidad. Le llega el recordatorio por WhatsApp, toca Confirmo y el turno queda confirmado en la agenda
        del negocio.
      </figcaption>

      <div className="mt-7 flex flex-col items-center gap-3">
        <fieldset className="m-0 flex min-w-0 flex-col items-center border-0 p-0">
          <legend className="mb-2 text-center text-sm text-suave">Mirala con otra marca</legend>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMOS_FIJAS.map((d) => (
              <button
                key={d.slug}
                type="button"
                aria-pressed={d.slug === slug}
                onClick={() => elegir(d.slug)}
                className={cn(
                  'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors',
                  d.slug === slug ? 'bg-superficie-2 text-texto ring-acento' : 'text-suave ring-linea hover:text-texto',
                )}
              >
                <span style={estiloTema(d)} className="size-3 rounded-full bg-acento" aria-hidden />
                {d.nombre}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap justify-center gap-x-5">
          <Link to={`/${n.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
            Probá cómo reserva tu cliente
          </Link>
          <Link to={`/${n.slug}/panel`} className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
            Mirá el panel del dueño
          </Link>
        </div>
      </div>
    </figure>
  )
}
