// Agenda del día: resumen, selector de día, filtro por profesional, turnos y bloqueos.
// Se actualiza sola cuando cambia un turno (useTurnosEnVivo en PanelReal).
import { motion } from 'motion/react'
import { CalendarPlus, ChartColumn, Check, ChevronLeft, ChevronRight, Lock, UserX, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  cambiarEstadoTurno,
  rangoDia,
  useAgenda,
  useBloqueos,
  useProfesionales,
  useRefrescar,
  useResumen,
  type TurnoPanel,
} from '@/datos/real/panel'
import { capitalizar, claveDia, diaLargo, horaCorta, nombreDia, numeroDia, precio, precioCorto, sumarDias } from '@/dominio/tiempo'
import type { EstadoTurno } from '@/dominio/tipos'
import { Boton } from '@/ui/Boton'
import { Campo } from '@/ui/Campo'
import { Hoja } from '@/ui/Hoja'
import { InsigniaEstado } from '@/ui/Insignia'
import { iniciales } from '@/ui/Logo'
import { cn } from '@/ui/cn'
import { FilaBloqueo, HojaBloqueo } from './Bloqueos'
import { BotonConfirmar, Cargando, ErrorEnLinea, FalloCarga, Vacio, useAccion, usePanel } from './comunes'
import { HistorialMensajes } from './Mensajes'
import { HojaTurnoManual } from './TurnoManual'

export function Agenda() {
  const { esDueno, acceso } = usePanel()
  if (!esDueno && !acceso.profesionalId)
    return <Vacio>Todavía no tenés una agenda asignada en este negocio. Pedile al dueño que te vincule a tu ficha de profesional.</Vacio>
  return <AgendaDia />
}

function AgendaDia() {
  const { n, negocioId, esDueno, acceso } = usePanel()
  const [hoy] = useState(() => claveDia(new Date()))
  // El día va en el link (?dia=AAAA-MM-DD): así el aviso de turno nuevo puede abrir la agenda en ese día.
  const [params, setParams] = useSearchParams()
  const pedido = params.get('dia')
  const dia = pedido && /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : hoy
  const setDia = (d: string) => setParams(d === hoy ? {} : { dia: d }, { replace: true })
  const [filtro, setFiltro] = useState<string | null>(null)
  const [hoja, setHoja] = useState<'turno' | 'bloqueo' | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)

  const profFiltro = esDueno ? filtro : acceso.profesionalId
  const profs = useProfesionales(negocioId)
  const agenda = useAgenda(negocioId, dia, profFiltro)
  const resumen = useResumen(negocioId, dia, profFiltro)
  const { desde, hasta } = rangoDia(dia)
  const bloqueos = useBloqueos(negocioId, desde, hasta)

  const bloqueosVisibles = (bloqueos.data ?? []).filter((b) => b.profesionalId === null || !profFiltro || b.profesionalId === profFiltro)
  const items = [
    ...(agenda.data ?? []).map((t) => ({ tipo: 'turno' as const, inicio: t.inicio, t })),
    ...bloqueosVisibles.map((b) => ({ tipo: 'bloqueo' as const, inicio: b.desde < desde ? desde : b.desde, b })),
  ].toSorted((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  const turnoElegido = agenda.data?.find((t) => t.id === elegido)
  const r = resumen.data

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Resumen del día" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi titulo={dia === hoy ? 'Turnos hoy' : 'Turnos del día'} valor={r ? String(r.turnosDia) : '–'} />
        <Kpi titulo="Confirmados" valor={r ? `${r.confirmados}/${r.turnosDia}` : '–'} barra={r && r.turnosDia ? r.confirmados / r.turnosDia : 0} />
        <Kpi titulo="Faltas del mes" valor={r ? String(r.faltasMes) : '–'} />
        <Kpi titulo="Facturación estimada" valor={r ? precioCorto(r.facturacion) : '–'} />
      </section>

      <SelectorDia dia={dia} hoy={hoy} onDia={setDia} />

      {esDueno && (profs.data?.length ?? 0) > 1 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filtrar por profesional</legend>
          {[{ id: null, nombre: 'Todos' }, ...(profs.data ?? []).filter((p) => p.activo)].map((p) => (
            <button
              key={p.id ?? 'todos'}
              type="button"
              aria-pressed={filtro === p.id}
              onClick={() => setFiltro(p.id)}
              className={cn(
                'h-11 rounded-full px-4 text-sm font-semibold transition-colors',
                filtro === p.id ? 'bg-texto text-fondo' : 'bg-superficie text-suave ring-1 ring-linea hover:text-texto',
              )}
            >
              {p.nombre}
              {p.id && p.id === acceso.profesionalId && ' (vos)'}
            </button>
          ))}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Boton onClick={() => setHoja('turno')}>
          <CalendarPlus className="size-5" aria-hidden />
          Cargar turno
        </Boton>
        <Boton variante="secundario" onClick={() => setHoja('bloqueo')}>
          <Lock className="size-4" aria-hidden />
          Bloquear
        </Boton>
        {!esDueno && (
          <Link
            to={`/${n.slug}/panel/reportes`}
            className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-medio px-5 text-[15px] font-semibold text-acento-texto hover:bg-acento-suave sm:col-span-1"
          >
            <ChartColumn className="size-4" aria-hidden />
            Mis números
          </Link>
        )}
      </div>

      {agenda.isPending ? (
        <Cargando texto="Cargando la agenda" />
      ) : agenda.isError ? (
        <FalloCarga error={agenda.error} onReintentar={() => void agenda.refetch()} />
      ) : items.length === 0 ? (
        <Vacio>No hay turnos este día.</Vacio>
      ) : (
        <section aria-label="Agenda" className="overflow-hidden rounded-grande bg-superficie ring-1 ring-linea">
          <ol className="divide-y divide-linea">
            {items.map((i) =>
              i.tipo === 'turno' ? (
                <FilaTurno key={i.t.id} t={i.t} mostrarProfesional={esDueno} onAbrir={() => setElegido(i.t.id)} />
              ) : (
                <FilaBloqueo key={i.b.id} b={i.b} />
              ),
            )}
          </ol>
        </section>
      )}

      <HojaTurnoManual abierta={hoja === 'turno'} onCerrar={() => setHoja(null)} diaInicial={dia} profesionalInicial={profFiltro} />
      <HojaBloqueo abierta={hoja === 'bloqueo'} onCerrar={() => setHoja(null)} diaInicial={dia} />
      <Hoja abierta={!!turnoElegido} onCerrar={() => setElegido(null)} titulo={turnoElegido ? `Turno de ${turnoElegido.clienteNombre}` : 'Turno'}>
        {turnoElegido && <DetalleTurno key={turnoElegido.id} t={turnoElegido} onListo={() => setElegido(null)} />}
      </Hoja>
    </div>
  )
}

function Kpi({ titulo, valor, barra }: { titulo: string; valor: string; barra?: number }) {
  return (
    <div className="rounded-grande bg-superficie p-4 ring-1 ring-linea">
      <p className="text-xs font-semibold text-suave">{titulo}</p>
      <p className="titulo num mt-1 text-2xl">{valor}</p>
      {barra !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-2" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-exito"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(barra * 100)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  )
}

function SelectorDia({ dia, hoy, onDia }: { dia: string; hoy: string; onDia: (d: string) => void }) {
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i - 1))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onDia(sumarDias(dia, -1))} className="grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label="Día anterior">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <p className="titulo min-w-0 text-lg" aria-live="polite">
            {capitalizar(diaLargo(`${dia}T12:00:00-03:00`))}
          </p>
          <button type="button" onClick={() => onDia(sumarDias(dia, 1))} className="grid size-11 place-items-center rounded-full hover:bg-superficie" aria-label="Día siguiente">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex items-end gap-2">
          {dia !== hoy && (
            <Boton variante="secundario" tamano="chico" onClick={() => onDia(hoy)}>
              Hoy
            </Boton>
          )}
          <Campo etiqueta="Ir a una fecha" type="date" className="w-44 [&_input]:h-11 [&_input]:text-[15px]" value={dia} onChange={(e) => e.target.value && onDia(e.target.value)} />
        </div>
      </div>
      <nav aria-label="Elegir día" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {dias.map((d) => {
          const f = `${d}T12:00:00-03:00`
          const activo = d === dia
          return (
            <button
              key={d}
              type="button"
              aria-pressed={activo}
              aria-label={capitalizar(diaLargo(f))}
              onClick={() => onDia(d)}
              className={cn(
                'flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-medio text-sm font-bold transition-colors',
                activo ? 'bg-acento text-sobre-acento' : 'bg-superficie ring-1 ring-linea hover:bg-superficie-2',
              )}
            >
              <span className="text-[11px] uppercase opacity-80">{d === hoy ? 'Hoy' : nombreDia(f)}</span>
              <span className="num text-lg">{numeroDia(f)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const EtiquetaApp = () => <span className="rounded-full bg-acento px-2 py-0.5 text-[10px] font-extrabold text-sobre-acento uppercase">App</span>

const minutos = (t: TurnoPanel) => Math.round((Date.parse(t.fin) - Date.parse(t.inicio)) / 60_000)

function FilaTurno({ t, mostrarProfesional, onAbrir }: { t: TurnoPanel; mostrarProfesional: boolean; onAbrir: () => void }) {
  const cancelado = t.estado === 'cancelado'
  return (
    <li className={cn(cancelado && 'opacity-55')}>
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Turno de ${t.clienteNombre} a las ${horaCorta(t.inicio)}`}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-superficie-2/60"
      >
        <div className="w-14 shrink-0">
          <p className="num font-bold">{horaCorta(t.inicio)}</p>
          <p className="text-xs text-suave">{minutos(t)} min</p>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold" aria-hidden>
          {iniciales(t.clienteNombre)}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-semibold', cancelado && 'line-through')}>{t.clienteNombre}</p>
          <p className="truncate text-sm text-suave">
            {t.servicioNombre}
            {mostrarProfesional && ` · ${t.profesionalNombre}`}
            {t.sena > 0 && ` · seña ${precio(t.sena)}`}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
            <InsigniaEstado estado={t.estado} />
            {t.origen === 'app' && <EtiquetaApp />}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {t.origen === 'app' && <EtiquetaApp />}
          <InsigniaEstado estado={t.estado} />
        </div>
      </button>
    </li>
  )
}

function DetalleTurno({ t, onListo }: { t: TurnoPanel; onListo: () => void }) {
  const { negocioId } = usePanel()
  const refrescar = useRefrescar(negocioId)
  const accion = useAccion()
  const [hecho, setHecho] = useState<EstadoTurno | null>(null)

  const cambiar = (estado: EstadoTurno) => {
    setHecho(estado)
    void accion
      .correr(async () => {
        await cambiarEstadoTurno(t.id, estado)
        await refrescar('turnos')
      })
      .then((listo) => listo && onListo())
  }
  const activo = t.estado === 'pendiente' || t.estado === 'confirmado'
  const [ahora] = useState(() => Date.now())
  const yaEmpezo = Date.parse(t.inicio) <= ahora

  return (
    <div className="flex flex-col gap-4 pb-2">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-grande bg-superficie p-4 text-[15px] ring-1 ring-linea">
        <dt className="text-suave">Cuándo</dt>
        <dd className="font-semibold">
          {capitalizar(diaLargo(t.inicio))} · {horaCorta(t.inicio)} a {horaCorta(t.fin)}
        </dd>
        <dt className="text-suave">Servicio</dt>
        <dd className="font-semibold">
          {t.servicioNombre}
          {t.precio > 0 && ` · ${precio(t.precio)}`}
        </dd>
        <dt className="text-suave">Profesional</dt>
        <dd className="font-semibold">{t.profesionalNombre}</dd>
        {t.clienteTelefono && (
          <>
            <dt className="text-suave">Teléfono</dt>
            <dd className="font-semibold">
              <a className="text-acento-texto underline underline-offset-4" href={`tel:${t.clienteTelefono.replace(/[^\d+]/g, '')}`}>
                {t.clienteTelefono}
              </a>
            </dd>
          </>
        )}
        <dt className="text-suave">Seña</dt>
        <dd className="font-semibold">{t.sena > 0 ? precio(t.sena) : 'Sin seña'}</dd>
        <dt className="text-suave">Estado</dt>
        <dd>
          <InsigniaEstado estado={t.estado} />
        </dd>
        <dt className="text-suave">Origen</dt>
        <dd className="font-semibold">{t.origen === 'app' ? 'Lo sacó desde la app' : 'Cargado a mano'}</dd>
        {t.notas && (
          <>
            <dt className="text-suave">Notas</dt>
            <dd>{t.notas}</dd>
          </>
        )}
      </dl>

      {activo && (
        <div className="grid grid-cols-2 gap-2">
          <Boton variante="secundario" className="bg-exito/15 text-exito" cargando={accion.ocupado && hecho === 'asistio'} onClick={() => cambiar('asistio')}>
            <Check className="size-5" aria-hidden />
            Vino
          </Boton>
          <Boton variante="secundario" className="bg-peligro/12 text-peligro" cargando={accion.ocupado && hecho === 'falto'} onClick={() => cambiar('falto')}>
            <UserX className="size-5" aria-hidden />
            No vino
          </Boton>
          {t.estado === 'pendiente' && !yaEmpezo && (
            <Boton className="col-span-2" cargando={accion.ocupado && hecho === 'confirmado'} onClick={() => cambiar('confirmado')}>
              Confirmar turno
            </Boton>
          )}
        </div>
      )}
      {(t.estado === 'asistio' || t.estado === 'falto') && (
        <Boton variante="secundario" cargando={accion.ocupado} onClick={() => cambiar('confirmado')}>
          <X className="size-4" aria-hidden />
          Deshacer (volver a confirmado)
        </Boton>
      )}
      {t.estado === 'cancelado' && (
        <Boton variante="secundario" cargando={accion.ocupado} onClick={() => cambiar('confirmado')}>
          Reactivar turno
        </Boton>
      )}
      {activo && <BotonConfirmar ancho texto="Cancelar turno" confirmar="Sí, cancelar" cargando={accion.ocupado && hecho === 'cancelado'} onConfirmar={() => cambiar('cancelado')} />}
      <ErrorEnLinea texto={accion.error} />
      <HistorialMensajes turnoId={t.id} />
    </div>
  )
}
