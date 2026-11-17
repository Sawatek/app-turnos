// Vitrina del hero: la app del cliente DE VERDAD (los mismos componentes de /quetul, /lema y /nailed) adentro
// de un celular, con datos de ejemplo armados acá (no toca el estado guardado de las demos).
// Cuenta la historia del producto en un loop: le llega el recordatorio por WhatsApp, toca "Confirmo",
// el turno queda confirmado y del otro lado la agenda del negocio se entera sola. Después cambia de marca.
// Se puede pausar (WCAG 2.2.2), se frena sola fuera de pantalla y con "reducir movimiento" arranca quieta.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarCheck, Check, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { textoMensaje, type EstadoNegocio } from '@/datos/demo'
import { ocupa, seSolapan } from '@/dominio/horarios'
import { generarSemilla } from '@/dominio/semilla'
import { claveDia, enHora, sumarDias } from '@/dominio/tiempo'
import type { Aviso, Negocio, Turno } from '@/dominio/tipos'
import { ContextoCliente, type CtxCliente } from '@/pantallas/cliente/contexto'
import { Inicio } from '@/pantallas/cliente/Inicio'
import { AccionAviso, EncabezadoCliente, NavCliente } from '@/pantallas/cliente/Marco'
import { DEMOS_FIJAS } from '@/plantillas/demos'
import { estiloTema } from '@/tema/TemaNegocio'
import { cn } from '@/ui/cn'
import { Logo } from '@/ui/Logo'
import { Notificacion } from '@/ui/Notificacion'
import { Celular } from './Celular'

const CLIENTA = 'Martina Fernández'
const HORA_TURNO = '10:30'
/** La respuesta que manda la base cuando tocan "Confirmo" (ver la migración de mensajes). */
const GRACIAS = '¡Gracias {nombre}! Tu turno de {dia} a las {hora} en {negocio} quedó confirmado. Te esperamos.'

/**
 * Pasos de la historia y cuánto dura cada uno (ms).
 * 0 la app · 1 llega el recordatorio · 2 toca "Confirmo" · 3 "¡Gracias!" y turno confirmado · 4 baja por la app · 5 vuelve arriba
 */
const DURACION = [1600, 2600, 750, 2400, 2800, 1400] as const
type Paso = 0 | 1 | 2 | 3 | 4 | 5
const ULTIMO: Paso = 5

const nada = () => {}

/** Estado de ejemplo de un negocio: su agenda generada para hoy + el turno de Martina para mañana. */
function armarEjemplo(n: Negocio, ahora: Date) {
  const semilla = generarSemilla(n, ahora)
  const servicio = n.servicios.find((s) => s.etiqueta) ?? n.servicios[0]!
  const prof = n.staff[0]!
  const inicio = enHora(sumarDias(claveDia(ahora), 1), HORA_TURNO)
  const turno: Turno = {
    id: 'vitrina',
    clienteNombre: CLIENTA,
    clienteTel: '',
    servicioId: servicio.id,
    profesionalId: prof.id,
    inicio: inicio.toISOString(),
    minutos: servicio.minutos,
    estado: 'pendiente',
    senaPagada: 0,
    propio: true,
    recordatorios: {},
    creado: new Date(ahora.getTime() - 3 * 86_400_000).toISOString(),
  }
  // Se saca de la agenda de ejemplo lo que se pisaría con el turno de Martina.
  const turnos = semilla.turnos.filter(
    (t) => !(t.profesionalId === prof.id && ocupa(t) && seSolapan(Date.parse(t.inicio), t.minutos, inicio.getTime(), turno.minutos)),
  )
  const e: EstadoNegocio = {
    semillaDia: semilla.dia,
    turnos: [...turnos, turno],
    dormidos: [],
    usuario: { nombre: CLIENTA, tel: '' },
    avisos: [],
    sellos: Math.max(1, n.fidelidad.meta - 2),
    recuperados: [],
  }
  const aviso = (tipo: Aviso['tipo'], plantilla: string): Aviso => ({
    id: `vitrina-${tipo}`,
    tipo,
    canal: 'whatsapp',
    texto: textoMensaje(n, plantilla, turno, CLIENTA, ahora),
    turnoId: turno.id,
    creado: ahora.toISOString(),
    visto: false,
  })
  return { e, turno, recordatorio: aviso('r24', n.mensajes.recordatorio24), gracias: aviso('confirmacion', GRACIAS) }
}

/** La pantalla de la app de un negocio en un paso de la historia. */
function PantallaApp({ n, paso, ahora, quieto }: { n: Negocio; paso: Paso; ahora: Date; quieto: boolean }) {
  const ejemplo = useMemo(() => armarEjemplo(n, ahora), [n, ahora])
  const confirmado = paso >= 3
  const e = useMemo<EstadoNegocio>(
    () => ({ ...ejemplo.e, turnos: ejemplo.e.turnos.map((t) => (t.id === ejemplo.turno.id && confirmado ? { ...t, estado: 'confirmado' } : t)) }),
    [ejemplo, confirmado],
  )
  const ctx: CtxCliente = { n, e, ahora, abrirReserva: nada, irA: nada }

  // Baja por la app para mostrar la tarjeta de sellos y los servicios, y vuelve.
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ top: paso === 4 ? 330 : 0, behavior: quieto ? 'auto' : 'smooth' })
  }, [paso, quieto])

  const aviso = paso === 1 || paso === 2 ? ejemplo.recordatorio : paso === 3 ? ejemplo.gracias : null
  const logo = <Logo negocio={n} className="size-10 rounded-chico text-sm" />

  return (
    <ContextoCliente value={ctx}>
      <div ref={scroll} className="sin-barra absolute inset-0 overflow-hidden">
        <EncabezadoCliente n={n} noVistos={paso >= 1 && paso <= 3 ? 1 : 0} onAvisos={nada} />
        <main className="px-5 pt-2 pb-32">
          <Inicio />
        </main>
      </div>
      <NavCliente n={n} tab="inicio" onTab={nada} onReservar={nada} />
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
    </ContextoCliente>
  )
}

/** Hero: celular con la app real + selector de marca + pausa. */
export function VitrinaApp() {
  const quieto = useReducedMotion() ?? false
  const [ahora] = useState(() => new Date())
  const [slug, setSlug] = useState(DEMOS_FIJAS[0]!.slug)
  const [paso, setPaso] = useState<Paso>(quieto ? 1 : 0)
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
        {/* Halo del color de la marca */}
        <div
          aria-hidden
          style={estiloTema(n)}
          className="pointer-events-none absolute inset-x-[-18%] top-[12%] bottom-[8%] -z-10 rounded-full bg-acento opacity-30 blur-[70px] transition-[background-color] duration-700"
        />
        <Celular estilo={estiloTema(n)} personalidad={n.personalidad}>
          <PantallaApp key={n.slug} n={n} paso={paso} ahora={ahora} quieto={quieto} />
        </Celular>

        {/* Del otro lado: la agenda del negocio se entera sola */}
        <AnimatePresence>
          {confirmado && (
            <motion.div
              key={n.slug}
              aria-hidden
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 30 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute bottom-[16%] -left-[6%] hidden w-[230px] rounded-medio bg-superficie p-3.5 sombra-flotante ring-1 ring-linea sm:block lg:-left-[26%]"
            >
              <p className="flex items-center gap-1.5 text-xs font-bold text-suave">
                <CalendarCheck className="size-3.5 text-acento-texto" />
                En tu agenda · {prof}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{CLIENTA.replace(/ (\p{L})\p{L}+$/u, ' $1.')}</p>
                  <p className="num text-xs text-suave">Mañana {HORA_TURNO}</p>
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
        La app de {n.nombre} en un celular, con su logo y sus colores: muestra el próximo turno de {CLIENTA} (mañana a las {HORA_TURNO}), el próximo horario libre y la tarjeta de fidelidad. Le llega el recordatorio por WhatsApp, toca Confirmo y el turno queda confirmado en la agenda
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
        <div className="flex items-center gap-2">
          <Link to={`/${n.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-acento-texto underline-offset-4 hover:underline">
            Probá la app de {n.nombre} en vivo
          </Link>
          <button
            type="button"
            onClick={alternarPausa}
            aria-label={pausado ? 'Reproducir la animación' : 'Pausar la animación'}
            className="grid size-11 place-items-center rounded-full text-suave ring-1 ring-linea transition-colors hover:text-texto"
          >
            {pausado ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </figure>
  )
}
