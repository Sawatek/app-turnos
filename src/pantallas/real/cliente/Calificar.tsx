import { Star } from 'lucide-react'
import { useId, useState } from 'react'
import { calificarTurno, ErrorCliente, type TurnoReal } from '@/datos/real/cliente'
import { capitalizar, diaCorto } from '@/dominio/tiempo'
import { Boton } from '@/ui/Boton'
import { AreaTexto } from '@/ui/Campo'
import { Sello } from '@/ui/Sello'
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
    <form className="flex flex-col gap-6 pb-2" onSubmit={(ev) => void enviar(ev)} noValidate>
      <p className="border-l-2 border-acento-borde pl-3 text-[15px]">
        <span className="font-semibold">{turno.servicio}</span>
        {turno.profesional ? <span className="text-suave"> con {turno.profesional}</span> : null}
        <span className="mt-0.5 block text-sm text-suave">
          <span className="mono text-[0.8125rem]">{capitalizar(diaCorto(turno.inicio))}</span> · {negocio}
        </span>
      </p>

      {/* Planilla de 1 a 5: cada casillero con su estrella; al elegir, la palabra cae como un sello. */}
      <fieldset>
        <legend className="rotulo mb-2 text-suave">Tu calificación</legend>
        <div className="grid grid-cols-5 gap-px overflow-hidden rounded-medio bg-linea ring-1 ring-linea">
          {[1, 2, 3, 4, 5].map((v) => {
            const marcada = v <= puntaje
            return (
              <label
                key={v}
                className={cn(
                  'flex h-18 cursor-pointer flex-col items-center justify-center gap-1 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-acento',
                  v === puntaje ? 'bg-acento text-sobre-acento' : marcada ? 'bg-acento-suave text-acento-texto' : 'bg-fondo text-suave hover:bg-superficie',
                )}
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
                <Star className={cn('size-6', marcada && 'fill-current')} strokeWidth={1.75} aria-hidden />
                <span aria-hidden className="mono text-xs font-bold">{v}</span>
              </label>
            )
          })}
        </div>
        <div className="mt-3 flex min-h-9 items-center" aria-live="polite">
          {puntaje > 0 && (
            <Sello key={puntaje} tono={puntaje <= 2 ? 'peligro' : puntaje === 3 ? 'aviso' : 'exito'} tamano="medio" animar giro={-5}>
              {TEXTOS[puntaje]}
            </Sello>
          )}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <AreaTexto
          etiqueta="Comentario (opcional)"
          value={comentario}
          maxLength={LARGO}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="¿Qué te gustó? ¿Qué mejorarías?"
          aria-describedby={`${id}-cuenta`}
        />
        <p id={`${id}-cuenta`} className="mono text-right text-xs text-suave">
          {comentario.length}/{LARGO}
        </p>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-peligro py-1 pl-3 text-sm font-semibold text-peligro">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Boton type="submit" tamano="grande" ancho cargando={enviando}>
          Enviar calificación
        </Boton>
        <p className="text-center text-xs text-suave">El negocio ve tu calificación y tu nombre. En la app solo se muestra el promedio.</p>
      </div>
    </form>
  )
}
