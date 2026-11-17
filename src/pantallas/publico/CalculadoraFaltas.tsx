// "¿Cuánta plata se te va en faltas?": el dueño pone sus números y ve cuánto pierde por mes.
// Lo que se recupera es un supuesto que el dueño ajusta (no prometemos un porcentaje fijo).
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useId, useState } from 'react'
import { precio } from '@/dominio/tiempo'

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
        <span className="num text-lg font-bold" aria-hidden>{props.mostrar(props.valor)}</span>
      </div>
      {props.ayuda && <p className="text-xs text-suave">{props.ayuda}</p>}
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.paso}
        value={props.valor}
        aria-valuetext={props.mostrar(props.valor)}
        onChange={(e) => props.cambiar(Number(e.target.value))}
        className="mt-1 h-11 w-full cursor-pointer accent-[var(--t-acento)]"
      />
    </div>
  )
}

export function CalculadoraFaltas() {
  const [faltas, setFaltas] = useState(4)
  const [ticket, setTicket] = useState(15000)
  const [evitas, setEvitas] = useState(50)

  const perdida = redondear(faltas * SEMANAS_POR_MES * ticket)
  const recuperas = redondear((perdida * evitas) / 100)

  return (
    <div className="rounded-grande bg-superficie p-5 ring-1 ring-linea sm:p-7">
      <h3 className="titulo text-lg">Hacé la cuenta con tus números</h3>
      <div className="mt-4 flex flex-col gap-3">
        <Deslizador etiqueta="Faltas por semana" valor={faltas} min={0} max={30} paso={1} mostrar={(v) => String(v)} cambiar={setFaltas} />
        <Deslizador etiqueta="Precio promedio del turno" valor={ticket} min={2000} max={100000} paso={500} mostrar={precio} cambiar={setTicket} />
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-live="polite">
        <div className="rounded-medio bg-peligro/10 p-4 ring-1 ring-peligro/25">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-peligro">
            <TrendingDown className="size-4" aria-hidden />
            Perdés por mes
          </p>
          <p className="titulo num mt-1 text-3xl text-peligro">{precio(perdida)}</p>
        </div>
        <div className="rounded-medio bg-exito/10 p-4 ring-1 ring-exito/25">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-exito">
            <TrendingUp className="size-4" aria-hidden />
            Podés recuperar por mes
          </p>
          <p className="titulo num mt-1 text-3xl text-exito">{precio(recuperas)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-suave">
        En un año son <strong className="num font-semibold text-texto">{precio(redondear(recuperas * 12))}</strong> que hoy se van en sillas y camillas vacías.
        Es una estimación con tus números, no una promesa.
      </p>
    </div>
  )
}
