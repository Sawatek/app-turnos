import { Star } from 'lucide-react'
import { useId, useState } from 'react'
import { calificarTurno, ErrorCliente, type TurnoReal } from '@/datos/real/cliente'
import { capitalizar, diaCorto } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { cn } from '@/ui/cn'

const LARGO = 500
const TEXTOS = ['', 'Mal', 'Regular', 'Bien', 'Muy bien', 'Excelente']

interface Props {
  negocioId: string
  clienteId: string
  turno: TurnoReal
  negocio: string
  onListo: () => void
}

/** Calificar un turno al que vino: de 1 a 5, con un comentario opcional. Una sola vez por turno. */
export function Calificar({ negocioId, clienteId, turno, negocio, onListo }: Props) {
  const id = useId()
  const [puntaje, setPuntaje] = useState(0)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!puntaje) return setError('Elegí de 1 a 5 estrellas.')
    setEnviando(true)
    setError(undefined)
    try {
      await calificarTurno(negocioId, clienteId, turno.id, puntaje, comentario)
      onListo()
    } catch (err) {
      const e = err instanceof ErrorCliente ? err : null
      if (e?.codigo === 'ya_calificado') return onListo()
      setError(e?.message ?? 'No se pudo enviar. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="flex flex-col gap-5 pb-2" onSubmit={(ev) => void enviar(ev)} noValidate>
      <p className="text-[15px] text-suave">
        {turno.servicio}
        {turno.profesional ? ` con ${turno.profesional}` : ''} · {capitalizar(diaCorto(turno.inicio))} en {negocio}
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-suave">Tu calificación</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <label
              key={v}
              className="grid size-12 cursor-pointer place-items-center rounded-full transition-colors hover:bg-superficie-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento"
            >
              <input
                type="radio"
                name={`${id}-puntaje`}
                value={v}
                checked={puntaje === v}
                onChange={() => {
                  setPuntaje(v)
                  setError(undefined)
                }}
                className="sr-only"
              />
              <span className="sr-only">{v === 1 ? '1 estrella' : `${v} estrellas`}</span>
              <Star
                className={cn('size-8 transition-colors', v <= puntaje ? 'fill-current text-acento-texto' : 'text-linea')}
                strokeWidth={1.75}
                aria-hidden
              />
            </label>
          ))}
          <span className="ml-2 text-sm font-semibold" aria-live="polite">{TEXTOS[puntaje]}</span>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-comentario`} className="text-sm font-semibold text-suave">
          Comentario (opcional)
        </label>
        <textarea
          id={`${id}-comentario`}
          value={comentario}
          maxLength={LARGO}
          rows={3}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="¿Qué te gustó? ¿Qué mejorarías?"
          aria-describedby={`${id}-cuenta`}
          className="rounded-medio border border-linea bg-superficie px-4 py-3 text-[17px] text-texto outline-none transition-colors placeholder:text-suave/70 focus:border-acento"
        />
        <p id={`${id}-cuenta`} className="num text-right text-xs text-suave">
          {comentario.length}/{LARGO}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-medio bg-peligro/12 px-4 py-3 text-sm font-semibold text-peligro">
          {error}
        </p>
      )}

      <Boton type="submit" tamano="grande" ancho cargando={enviando}>
        Enviar calificación
      </Boton>
      <p className="text-center text-xs text-suave">El negocio ve tu calificación y tu nombre. En la app solo se muestra el promedio.</p>
    </form>
  )
}
