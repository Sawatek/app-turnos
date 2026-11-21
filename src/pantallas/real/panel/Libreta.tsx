// La libreta del barbero: la agenda del día como una hoja de agenda de papel.
// La hora va en el margen (como la impresa en la hoja), cada turno es un talón chico con su sello,
// lo libre es un renglón punteado (tocarlo anota un turno ahí), lo bloqueado se ve tachado
// y la línea de "ahora" es un trazo de tinta de la marca. En compu, una columna por profesional.
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { TurnoPanel } from '@/datos/real/panel'
import { horaCorta, horaDe, precio } from '@/dominio/tiempo'
import { EstadoQuieto, InsigniaEstado } from '@/ui/Insignia'
import { cn } from '@/ui/cn'
import { FilaBloqueo } from './Bloqueos'
import { RAYADO } from './comunes'
import type { Celda, Columna, Entrada, Renglon } from './renglones'

/** Ancho del talón chico (la hora) hasta el troquel. Las muescas se calan justo ahí. */
const TALON = '5.25rem'
const MUESCAS: React.CSSProperties = {
  mask: `radial-gradient(circle at ${TALON} 0, #0000 6px, #000 6.5px) top / 100% 51% no-repeat, radial-gradient(circle at ${TALON} 100%, #0000 6px, #000 6.5px) bottom / 100% 51% no-repeat`,
}
/** Troquel vertical (el corte entre el talón y el cuerpo). */
const TROQUEL_VERTICAL: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to bottom, var(--t-linea) 55%, transparent 0)',
  backgroundSize: '1.5px 8px',
  backgroundRepeat: 'repeat-y',
}

const plantilla = (columnas: number): React.CSSProperties => ({ gridTemplateColumns: `var(--margen) repeat(${columnas}, minmax(0, 1fr))` })

interface Props {
  renglones: Renglon[]
  columnas: Columna[]
  /** Mostrar el profesional en cada turno (una sola columna con varios profesionales). */
  conProfesional: boolean
  /** Minuto del día que ya pasó del todo (para avisar "Marcá si vino"); -1 si el día es futuro. */
  minutoPasado: number
  vacia: boolean
  onAbrir: (id: string) => void
  onAnotar: (hora: string, profesionalId: string | null) => void
}

export function Libreta({ renglones, columnas, conProfesional, minutoPasado, vacia, onAbrir, onAnotar }: Props) {
  const multi = columnas.length > 1
  return (
    <section
      aria-label="Agenda"
      className="overflow-clip rounded-grande bg-fondo ring-1 ring-linea [--margen:3.25rem] sm:[--margen:4.5rem]"
    >
      {multi && (
        // Encabezado de la planilla: un profesional por columna. Queda pegado arriba al bajar.
        <div
          className="sticky top-[var(--alto-encabezado,0px)] z-10 grid border-b-2 border-texto bg-fondo/95 backdrop-blur"
          style={plantilla(columnas.length)}
        >
          <span className="border-r border-acento-borde" />
          {columnas.map((c, i) => (
            <p key={c.id ?? 'todos'} className={cn('titulo truncate px-3 py-2.5 text-lg', i > 0 && 'border-l border-linea')}>
              {c.nombre}
            </p>
          ))}
        </div>
      )}
      {vacia && (
        <p className="rotulo border-b border-linea px-4 py-2.5 text-suave">Día libre: tocá un renglón para anotar un turno.</p>
      )}
      <ol>
        {renglones.map((r) =>
          r.tipo === 'ahora' ? (
            <LineaAhora key={r.clave} minuto={r.minuto} columnas={columnas.length} />
          ) : (
            <RenglonHora
              key={r.clave}
              r={r}
              columnas={columnas}
              conProfesional={conProfesional}
              minutoPasado={minutoPasado}
              onAbrir={onAbrir}
              onAnotar={onAnotar}
            />
          ),
        )}
      </ol>
    </section>
  )
}

function LineaAhora({ minuto, columnas }: { minuto: number; columnas: number }) {
  return (
    <li className="relative grid h-6 items-center" style={plantilla(columnas)} aria-label={`Ahora, ${horaDe(minuto)}`}>
      <span className="mono pr-1.5 text-right text-xs font-bold text-acento-texto sm:pr-3" aria-hidden>
        {horaDe(minuto)}
      </span>
      {/* El trazo de tinta: arranca con un punto sobre el margen. */}
      <span aria-hidden className="relative h-[2.5px] rounded-full bg-acento" style={{ gridColumn: '2 / -1' }}>
        <span className="absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-full bg-acento" />
      </span>
    </li>
  )
}

function RenglonHora({
  r,
  columnas,
  conProfesional,
  minutoPasado,
  onAbrir,
  onAnotar,
}: {
  r: Extract<Renglon, { tipo: 'hora' }>
  columnas: Columna[]
  conProfesional: boolean
  minutoPasado: number
  onAbrir: (id: string) => void
  onAnotar: (hora: string, profesionalId: string | null) => void
}) {
  const filas = r.anchas.length ? 2 : 1
  return (
    <li className={cn('grid', r.hora !== null && 'border-t border-linea first:border-t-0')} style={plantilla(columnas.length)}>
      {/* El margen de la hoja: la hora impresa y la línea del margen teñida con la marca. */}
      <div className="border-r border-acento-borde pt-2 pr-1.5 text-right sm:pr-3" style={{ gridRow: `span ${filas}` }}>
        {r.hora !== null && (
          <p className={cn('leading-none', r.pasado ? 'text-suave' : 'text-texto')}>
            <span className={cn('cifra', r.plegadoHasta ? 'text-[1.25rem]' : 'text-[1.625rem] sm:text-[2rem]')}>{String(r.hora).padStart(2, '0')}</span>
            <span className="mono align-top text-xs">00</span>
            {r.plegadoHasta && <span className="mono mt-1 block text-xs">a {String(Math.floor(r.plegadoHasta / 60)).padStart(2, "0")}</span>}
          </p>
        )}
      </div>
      {r.anchas.length > 0 && (
        <ul className="flex flex-col gap-1.5 p-1.5 sm:p-2" style={{ gridColumn: '2 / -1' }}>
          {r.anchas.map((e) => (
            <ItemEntrada key={e.id} e={e} conProfesional={false} minutoPasado={minutoPasado} onAbrir={onAbrir} />
          ))}
        </ul>
      )}
      {r.celdas.map((c, i) => (
        <div key={columnas[i]!.id ?? 'todos'} className={cn('min-w-0', i > 0 && 'border-l border-linea')}>
          <ContenidoCelda
            c={c}
            r={r}
            columna={columnas[i]!}
            multi={columnas.length > 1}
            conProfesional={conProfesional}
            minutoPasado={minutoPasado}
            onAbrir={onAbrir}
            onAnotar={onAnotar}
          />
        </div>
      ))}
    </li>
  )
}

function ContenidoCelda({
  c,
  r,
  columna,
  multi,
  conProfesional,
  minutoPasado,
  onAbrir,
  onAnotar,
}: {
  c: Celda
  r: Extract<Renglon, { tipo: 'hora' }>
  columna: Columna
  multi: boolean
  conProfesional: boolean
  minutoPasado: number
  onAbrir: (id: string) => void
  onAnotar: (hora: string, profesionalId: string | null) => void
}) {
  if (c.tipo === 'entradas')
    return (
      <ul className="flex flex-col gap-1.5 p-1.5 sm:p-2">
        {c.entradas.map((e) => (
          <ItemEntrada key={e.id} e={e} conProfesional={conProfesional} minutoPasado={minutoPasado} onAbrir={onAbrir} />
        ))}
      </ul>
    )
  if (c.tipo === 'sigue')
    return c.por === 'bloqueo' ? (
      <div aria-hidden className={cn('h-full min-h-8', RAYADO)} />
    ) : (
      // Viene de un turno de antes: un trazo que baja desde el talón, con hasta cuándo sigue.
      <p className="flex h-full min-h-8 items-center gap-2 pl-[calc(var(--muesca)+0.75rem)] sm:pl-[calc(var(--muesca)+1rem)]">
        <span aria-hidden className="w-0.5 self-stretch bg-acento-borde" />
        <span className="rotulo text-suave">Sigue hasta {horaDe(c.hasta)}</span>
      </p>
    )
  // Libre: en lo que ya pasó, un renglón vacío y bajo (varias horas vacías se pliegan en uno);
  // en lo que viene, un renglón punteado que invita a anotar.
  if (r.plegadoHasta)
    return (
      <p className="flex h-full min-h-11 items-center px-3">
        <span className="rotulo text-suave/80">Sin turnos</span>
      </p>
    )
  if (r.pasado) return <div className="min-h-8" />
  const hora = horaDe(r.desde)
  return (
    <button
      type="button"
      onClick={() => onAnotar(hora, columna.id)}
      aria-label={`Anotar ${multi ? `con ${columna.nombre} ` : ''}a las ${hora}`}
      className="group flex h-full min-h-11 w-full items-end gap-2 px-3 pb-2 text-left text-suave transition-colors hover:text-acento-texto"
    >
      <span aria-hidden className="mb-1 flex-1 border-b-2 border-dotted border-linea transition-colors group-hover:border-acento-borde" />
      <span className="rotulo flex items-center gap-1 opacity-70 group-hover:opacity-100">
        <Plus className="size-3.5" aria-hidden />
        Libre
      </span>
    </button>
  )
}

function ItemEntrada({ e, conProfesional, minutoPasado, onAbrir }: { e: Entrada; conProfesional: boolean; minutoPasado: number; onAbrir: (id: string) => void }) {
  if (e.tipo === 'bloqueo') return <FilaBloqueo b={e.b} />
  return <TalonTurno t={e.t} conProfesional={conProfesional} yaTermino={e.fin <= minutoPasado} onAbrir={() => onAbrir(e.t.id)} />
}

const minutos = (t: TurnoPanel) => Math.round((Date.parse(t.fin) - Date.parse(t.inicio)) / 60_000)

/**
 * El turno como un talón chico: a la izquierda, del otro lado del troquel, la hora y la duración;
 * a la derecha, quién viene, qué se hace y el sello del estado. Si el estado cambia mientras se mira
 * (el cliente tocó "Confirmo" en el WhatsApp, o se marcó que vino), el sello nuevo cae con el golpe.
 */
function TalonTurno({ t, conProfesional, yaTermino, onAbrir }: { t: TurnoPanel; conProfesional: boolean; yaTermino: boolean; onAbrir: () => void }) {
  const [estadoInicial] = useState(t.estado)
  const cambio = t.estado !== estadoInicial
  const cancelado = t.estado === 'cancelado'
  const sinMarcar = yaTermino && (t.estado === 'confirmado' || t.estado === 'pendiente')
  return (
    <li>
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Turno de ${t.clienteNombre} a las ${horaCorta(t.inicio)}`}
        className="contorno-talon block w-full text-left transition-transform active:scale-[0.99]"
      >
        <span
          key={cambio ? 'cambio' : 'igual'}
          style={MUESCAS}
          className={cn('flex min-h-15 rounded-medio bg-superficie transition-colors hover:bg-superficie-2', cambio && 'golpe', cancelado && 'opacity-60')}
        >
          <span className="flex shrink-0 flex-col justify-center px-2.5 py-2" style={{ width: TALON }}>
            <span className={cn('cifra text-[1.5rem]', cancelado && 'line-through decoration-2')}>{horaCorta(t.inicio)}</span>
            <span className="mono mt-1 text-xs text-suave">{minutos(t)} min</span>
          </span>
          <span aria-hidden className="my-2 w-[1.5px] shrink-0" style={TROQUEL_VERTICAL} />
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-2.5 pl-3">
            <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <span className={cn('min-w-0 flex-[1_1_7rem] truncate font-semibold', cancelado && 'line-through')}>{t.clienteNombre}</span>
              {/* En la agenda el estado va en voz baja; el sello cae solo si cambia mientras se mira (ej.: el cliente confirma). */}
              {cambio ? (
                <InsigniaEstado key={t.estado} estado={t.estado} animar className="shrink-0" />
              ) : (
                <EstadoQuieto estado={t.estado} className="shrink-0 pt-0.5" />
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-suave">
              <span className="truncate">
                {t.servicioNombre}
                {conProfesional && ` · ${t.profesionalNombre}`}
                {t.sena > 0 && ` · seña ${precio(t.sena)}`}
              </span>
              {t.origen === 'app' && (
                <span className="rotulo shrink-0 text-acento-texto" title="Lo sacó desde la app">
                  App<span className="sr-only">: lo sacó desde la app</span>
                </span>
              )}
              {sinMarcar && <span className="rotulo ml-auto shrink-0 text-aviso">¿Vino?</span>}
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}
