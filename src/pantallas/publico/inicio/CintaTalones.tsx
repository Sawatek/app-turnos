// La cinta de talones: una fila de turnos sellados. Muestra de un vistazo lo que vende el producto: la agenda llena de
// turnos confirmados, y alguno que se liberó a tiempo.
// - Celular: un carrusel que se desliza a mano (solo de costado), con encastre en cada talón, botones y puntos.
// - Compu: la cinta se corre de costado mientras se baja (scroll-driven), decorativa (aria-hidden); sin soporte o con
//   "reducir movimiento", queda quieta.
// Se pre-genera con renderToString: nada del navegador en el render (solo en efectos y eventos).
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Talon } from '@/ui/Talon'
import { cn } from '@/ui/cn'

interface TalonCinta {
  n: string
  dia: string
  hora: string
  servicio: string
  sello: 'Confirmado' | 'Liberado' | 'Sin confirmar'
}

const FILA_1: TalonCinta[] = [
  { n: '0412', dia: 'Mar', hora: '10:30', servicio: 'Corte + barba', sello: 'Confirmado' },
  { n: '0413', dia: 'Mar', hora: '11:15', servicio: 'Kinesiología', sello: 'Confirmado' },
  { n: '0414', dia: 'Mar', hora: '12:00', servicio: 'Esmaltado', sello: 'Liberado' },
  { n: '0415', dia: 'Mar', hora: '12:00', servicio: 'Esmaltado', sello: 'Confirmado' },
  { n: '0416', dia: 'Mar', hora: '15:30', servicio: 'Color', sello: 'Confirmado' },
  { n: '0417', dia: 'Mar', hora: '16:45', servicio: 'Consulta', sello: 'Sin confirmar' },
  { n: '0418', dia: 'Mar', hora: '17:30', servicio: 'Tatuaje', sello: 'Confirmado' },
]

const TONO = { Confirmado: 'text-exito', Liberado: 'text-acento-texto', 'Sin confirmar': 'text-aviso sello-vacio' } as const
const GIROS = [-6, 4, -9, 3, -4, 7, -7]

function TalonDeCinta({ t, i, className }: { t: TalonCinta; i: number; className?: string }) {
  return (
    <Talon
      as="div"
      className={cn('w-[15.5rem] shrink-0', className)}
      cuerpo={
        <div className="px-4 pt-3 pb-3.5">
          <p className="rotulo flex justify-between text-suave">
            <span>N.º {t.n}</span>
            <span>{t.dia}</span>
          </p>
          <p className="cifra mt-2 text-4xl sm:text-5xl">{t.hora}</p>
        </div>
      }
      sello={
        <span style={{ '--giro': `${GIROS[i % GIROS.length]}deg` } as React.CSSProperties} className={cn('sello bg-superficie text-xs', TONO[t.sello])}>
          {t.sello}
        </span>
      }
      talon={<p className="truncate px-4 pt-5 pb-3 text-sm font-semibold">{t.servicio}</p>}
    />
  )
}

export function CintaTalones() {
  return (
    <div className="border-y border-linea bg-superficie-2/50">
      <CarruselTalones />
      <CintaAnimada />
    </div>
  )
}

/** Compu: la cinta atada al scroll. Los bordes se desvanecen: los talones entran y salen en vez de quedar cortados al ras. */
function CintaAnimada() {
  return (
    <div
      aria-hidden
      className="franja-cinta relative hidden overflow-x-clip py-14 [mask-image:linear-gradient(to_right,transparent,black_4rem,black_calc(100%-4rem),transparent)] sm:block"
    >
      <div className="cinta flex w-max gap-5 px-8">
        {FILA_1.map((t, i) => (
          <TalonDeCinta key={t.n} t={t} i={i} />
        ))}
      </div>
    </div>
  )
}

const TOTAL = FILA_1.length

const consultaReducir = '(prefers-reduced-motion: reduce)'
/** ¿Pidió "reducir movimiento"? En el pre-render, sí (quieto hasta saber). */
function useReducirMovimiento() {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(consultaReducir)
      m.addEventListener('change', avisar)
      return () => m.removeEventListener('change', avisar)
    },
    () => matchMedia(consultaReducir).matches,
    () => true,
  )
}

/** Cada cuánto pasa al talón siguiente solo. */
const CADA_MS = 3500

/**
 * Celular: carrusel. Scroll horizontal nativo con encastre en el centro de cada talón (los vecinos asoman a los
 * costados: se ve que hay más). Botones anterior/siguiente y un punto por talón; el activo es más ancho (no solo de
 * otro color). Al asentarse, se anuncia "Turno N de 7" para lector de pantalla.
 *
 * Avanza solo cada 3,5 s (y al final vuelve al primero), con estas reglas:
 * - Botón de pausa siempre a la vista (WCAG 2.2.2: lo que se mueve solo más de 5 s tiene que poder frenarse).
 * - Si la persona lo toca (desliza, botones, puntos), se pausa: tomó el control. Con foco adentro (teclado), espera.
 * - Con "reducir movimiento" arranca pausado. Solo corre mientras está en pantalla y la pestaña está a la vista.
 * - Mientras avanza solo no anuncia cada cambio (sería ruido para el lector de pantalla); pausado, sí.
 */
function CarruselTalones() {
  const pista = useRef<HTMLDivElement>(null)
  const botonAnterior = useRef<HTMLButtonElement>(null)
  const botonSiguiente = useRef<HTMLButtonElement>(null)
  const seccion = useRef<HTMLElement>(null)
  const [actual, setActual] = useState(0)
  const [anuncio, setAnuncio] = useState('')
  // 'auto' = lo que diga "reducir movimiento" (con reducir, quieto); si no, lo que eligió la persona.
  const [eleccion, setEleccion] = useState<'auto' | 'pausado' | 'andando'>('auto')
  const reducido = useReducirMovimiento()
  const pausado = eleccion === 'pausado' || (eleccion === 'auto' && reducido)
  const setPausado = (p: boolean) => setEleccion(p ? 'pausado' : 'andando')
  const [conFoco, setConFoco] = useState(false)
  const [aLaVista, setALaVista] = useState(false)
  // El foco adentro frena el avance automático, salvo que la persona haya elegido explícitamente que siga.
  const reproduciendo = !pausado && aLaVista && (eleccion === 'andando' || !conFoco)

  useEffect(() => {
    const el = pista.current
    if (!el) return
    // El talón más cerca del centro de la pista (solo se mide el eje horizontal).
    const cercano = () => {
      const centro = el.scrollLeft + el.clientWidth / 2
      let mejor = 0
      let distancia = Infinity
      Array.from(el.children).forEach((hijo, i) => {
        const h = hijo as HTMLElement
        const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - centro)
        if (d < distancia) {
          distancia = d
          mejor = i
        }
      })
      return mejor
    }
    let cuadro = 0
    let asentado = 0
    const alMover = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => setActual(cercano()))
    }
    const alAsentar = () => {
      const i = cercano()
      setActual(i)
      if (i !== asentado) {
        asentado = i
        setAnuncio(`Turno ${i + 1} de ${TOTAL}`)
      }
    }
    let espera: ReturnType<typeof setTimeout> | undefined
    const asentarDespues = () => {
      clearTimeout(espera)
      espera = setTimeout(alAsentar, 150)
    }
    const conScrollend = 'onscrollend' in window
    // Si la persona toca o desliza la pista, tomó el control: se pausa el avance automático.
    const tomarControl = () => setEleccion('pausado')
    el.addEventListener('pointerdown', tomarControl)
    el.addEventListener('wheel', tomarControl, { passive: true })
    el.addEventListener('scroll', alMover, { passive: true })
    if (conScrollend) el.addEventListener('scrollend', alAsentar)
    else el.addEventListener('scroll', asentarDespues, { passive: true })
    return () => {
      cancelAnimationFrame(cuadro)
      clearTimeout(espera)
      el.removeEventListener('pointerdown', tomarControl)
      el.removeEventListener('wheel', tomarControl)
      el.removeEventListener('scroll', alMover)
      el.removeEventListener('scrollend', alAsentar)
      el.removeEventListener('scroll', asentarDespues)
    }
  }, [])

  // Solo avanza si el carrusel está en pantalla (en la compu está oculto: nunca) y la pestaña se está mirando.
  useEffect(() => {
    const el = seccion.current
    if (!el) return
    let visible = false
    const actualizar = () => setALaVista(visible && document.visibilityState === 'visible')
    const observador = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
      actualizar()
    }, { threshold: 0.5 })
    observador.observe(el)
    document.addEventListener('visibilitychange', actualizar)
    // Foco adentro (teclado): espera sin avanzar; cuando el foco sale del carrusel, sigue.
    const alEnfocar = () => setConFoco(true)
    const alDesenfocar = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) setConFoco(false)
    }
    el.addEventListener('focusin', alEnfocar)
    el.addEventListener('focusout', alDesenfocar)
    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', actualizar)
      el.removeEventListener('focusin', alEnfocar)
      el.removeEventListener('focusout', alDesenfocar)
    }
  }, [])

  // El paso automático: espera un rato desde el último cambio (también si fue a mano) y pasa al siguiente.
  useEffect(() => {
    if (!reproduciendo) return
    const t = setTimeout(() => irA(actual === TOTAL - 1 ? 0 : actual + 1), CADA_MS)
    return () => clearTimeout(t)
  })

  // Si el botón con foco se deshabilita al llegar a una punta, el foco pasa al otro (no se pierde).
  useEffect(() => {
    if (actual === 0 && document.activeElement === botonAnterior.current) botonSiguiente.current?.focus()
    if (actual === TOTAL - 1 && document.activeElement === botonSiguiente.current) botonAnterior.current?.focus()
  }, [actual])

  /** Una acción de la persona: se pausa el avance automático (tomó el control) y va a ese talón. */
  const ir = (i: number) => {
    setPausado(true)
    irA(i)
  }

  function irA(i: number) {
    const el = pista.current
    const hijo = el?.children[i] as HTMLElement | undefined
    if (!el || !hijo) return
    setActual(i)
    const suave = matchMedia('(prefers-reduced-motion: no-preference)').matches
    el.scrollBy({ left: hijo.offsetLeft + hijo.offsetWidth / 2 - (el.scrollLeft + el.clientWidth / 2), behavior: suave ? 'smooth' : 'auto' })
  }


  return (
    <section
      ref={seccion}
      aria-roledescription="carrusel"
      aria-label="Turnos de ejemplo"
      className="py-8 sm:hidden"
    >
      {/* La pista recibe foco para poder scrollearla con las flechas del teclado (zona scrolleable accesible), y los
          talones son grupos con nombre "N de 7", como pide el patrón de carrusel: un fieldset no corresponde. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role */}
      <div ref={pista} tabIndex={0} role="group"
        aria-label="Talones"
        className="sin-barra relative flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-[calc(50%-7.75rem)] py-1 [touch-action:pan-x_pan-y]"
      >
        {FILA_1.map((t, i) => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          <div key={t.n} role="group" aria-roledescription="talón" aria-label={`${i + 1} de ${TOTAL}`} className="shrink-0 snap-center">
            <TalonDeCinta t={t} i={i} />
          </div>
        ))}
      </div>

      <output className="sr-only" aria-live={reproduciendo ? 'off' : 'polite'}>
        {anuncio}
      </output>

      <div className="mt-5 flex items-center justify-center gap-2 px-5">
        {/* El nombre cambia entre pausar y seguir (sin aria-pressed: un "Seguir" presionado se leería al revés). */}
        <button
          type="button"
          onClick={() => setPausado(!pausado)}
          aria-label={pausado ? 'Seguir pasando los turnos' : 'Pausar los turnos'}
          className="mr-1 grid size-11 shrink-0 place-items-center rounded-full text-suave transition-colors [touch-action:manipulation] hover:text-texto"
        >
          {pausado ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>
        <button
          ref={botonAnterior}
          type="button"
          onClick={() => ir(actual - 1)}
          disabled={actual === 0}
          aria-label="Turno anterior"
          className="grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-suave/60 transition-opacity [touch-action:manipulation] disabled:opacity-35"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <nav aria-label="Elegir turno" className="flex items-center">
          {FILA_1.map((t, i) => (
            <button
              key={t.n}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Ir al turno ${i + 1}`}
              aria-current={i === actual ? 'true' : undefined}
              className="grid h-6 w-6 place-items-center [touch-action:manipulation]"
            >
              <span aria-hidden className={cn('h-2 rounded-full transition-[width] duration-200', i === actual ? 'w-5 bg-texto' : 'w-2 bg-suave/70')} />
            </button>
          ))}
        </nav>
        <button
          ref={botonSiguiente}
          type="button"
          onClick={() => ir(actual + 1)}
          disabled={actual === TOTAL - 1}
          aria-label="Turno siguiente"
          className="grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-suave/60 transition-opacity [touch-action:manipulation] disabled:opacity-35"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </section>
  )
}
