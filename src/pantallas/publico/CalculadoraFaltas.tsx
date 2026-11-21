// "¿Cuánta plata se te va en faltas?": el dueño pone sus números y ve cuánto pierde por mes.
// Lo que se recupera es un supuesto que el dueño ajusta (no prometemos un porcentaje fijo).
// El precio es un campo numérico (un deslizador de 2.000 a 100.000 son cientos de pasos: imposible con el dedo).
import { CircleAlert, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { precio } from '@/dominio/tiempo'
import { CtaDemo } from './comunes'

const SEMANAS_POR_MES = 4.33
const redondear = (n: number) => Math.round(n / 100) * 100

function Deslizador(props: {
  etiqueta: string
  ayuda?: string
  valor: number
  min: number
  max: number
  paso: number
  mostrar: (v: number) => string
  cambiar: (v: number) => void
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">{props.etiqueta}</label>
        <span className="mono text-lg font-bold" aria-hidden>{props.mostrar(props.valor)}</span>
      </div>
      {props.ayuda && <p id={`${id}-ayuda`} className="text-xs text-suave">{props.ayuda}</p>}
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.paso}
        value={props.valor}
        aria-valuetext={props.mostrar(props.valor)}
        aria-describedby={props.ayuda ? `${id}-ayuda` : undefined}
        onChange={(e) => props.cambiar(Number(e.target.value))}
        className="mt-1 h-11 w-full cursor-pointer accent-[var(--t-acento)]"
      />
    </div>
  )
}

/** Precio del turno en pesos, con el $ adelante y el error abajo si queda vacío o en cero. */
function CampoPrecio({ texto, cambiar, error }: { texto: string; cambiar: (t: string) => void; error?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">Precio promedio del turno</label>
      <div className="relative mt-1.5">
        <span aria-hidden className="mono pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-lg font-bold text-suave">$</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={500}
          step={500}
          value={texto}
          onChange={(e) => cambiar(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mono h-12 w-full rounded-t-chico border-0 border-b-2 border-suave bg-superficie-2/70 pr-4 pl-9 text-lg font-bold text-texto transition-colors outline-none focus:border-acento focus:bg-superficie-2 aria-invalid:border-peligro"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-peligro">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

export function CalculadoraFaltas() {
  const [faltas, setFaltas] = useState(4)
  const [textoTicket, setTextoTicket] = useState('15000')
  const [evitas, setEvitas] = useState(30)

  const ticket = Math.max(0, Number(textoTicket) || 0)
  const errorTicket = ticket > 0 ? undefined : 'Poné cuánto cobrás un turno'
  const perdida = redondear(faltas * SEMANAS_POR_MES * ticket)
  const recuperas = redondear((perdida * evitas) / 100)

  // Un solo anuncio para el lector de pantalla, cuando el dueño deja de mover (no uno por cada paso del deslizador).
  const [anuncio, setAnuncio] = useState('')
  const primero = useRef(true)
  useEffect(() => {
    if (primero.current) {
      primero.current = false
      return
    }
    const t = setTimeout(
      () =>
        setAnuncio(
          errorTicket ??
            `Perdés ${precio(perdida)} por mes. Podés recuperar ${precio(recuperas)} por mes, ${precio(redondear(recuperas * 12))} al año.`,
        ),
      900,
    )
    return () => clearTimeout(t)
  }, [perdida, recuperas, errorTicket])

  return (
    // Ticket de caja: el borde de abajo arrancado en zigzag y el contorno que lo sigue (en el envoltorio, que no lleva máscara).
    <div className="contorno-talon">
    <div className="@container relative borde-roto rounded-t-grande bg-superficie p-5 pb-10 sm:p-8 sm:pb-12">
      <p className="folio flex justify-between gap-3 text-acento-texto">
        <span>Calculadora</span>
        <span aria-hidden className="text-suave">Ticket N.º 0001</span>
      </p>
      <h3 className="titular mt-2 text-3xl">Hacé la cuenta con tus números</h3>
      <div className="mt-6 flex flex-col gap-4">
        <Deslizador etiqueta="Faltas por semana" valor={faltas} min={0} max={30} paso={1} mostrar={(v) => String(v)} cambiar={setFaltas} />
        <CampoPrecio texto={textoTicket} cambiar={setTextoTicket} error={errorTicket} />
        <Deslizador
          etiqueta="Faltas que evitás con recordatorios"
          ayuda="Un supuesto: movelo según lo que te parezca razonable."
          valor={evitas}
          min={10}
          max={90}
          paso={5}
          mostrar={(v) => `${v}%`}
          cambiar={setEvitas}
        />
      </div>

      {/* Cada resultado es un grupo con nombre (lo usan los tests y el lector de pantalla); no son controles: div y no fieldset */}
      {/* Los renglones del ticket: concepto, puntitos guía y monto en letra de caja */}
      <div className="mt-7 flex flex-col gap-4 border-t-2 border-dashed border-linea pt-5">
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div role="group" aria-label="Perdés por mes" className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="rotulo flex items-center gap-1.5 text-peligro">
            <TrendingDown className="size-4" aria-hidden />
            Perdés por mes
          </p>
          <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-linea" />
          <p className="cifra text-4xl text-peligro">{precio(perdida)}</p>
        </div>
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <div role="group" aria-label="Podés recuperar por mes" className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="rotulo flex items-center gap-1.5 text-exito">
            <TrendingUp className="size-4" aria-hidden />
            Podés recuperar por mes
          </p>
          <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-linea" />
          <p className="cifra text-4xl text-exito">{precio(recuperas)}</p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{anuncio}</p>
      <p className="mt-5 border-t-4 border-double border-linea pt-4 text-sm text-suave [text-wrap:pretty]">
        En un año son <strong className="mono font-bold text-texto">{precio(redondear(recuperas * 12))}</strong> que hoy se van en sillas y camillas vacías.
        Es una estimación con tus números, no una promesa.
      </p>
      <CtaDemo className="mt-5 w-full" texto="Quiero dejar de perder esa plata" textoSinContacto="Probá la demo" />
    </div>
    </div>
  )
}
